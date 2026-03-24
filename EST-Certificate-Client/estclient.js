import xapi from 'xapi';

let csr = ""
// replace url with your own est url
let ESTInterface = "https://est.interface.com/.well-known/est/"
// base64 encoded basic auth credentials
let Credentials = "xxxx"
let CAIssuerName = "xxxx"
let CertificateSubjectName = ""

let headers = [
  "Authorization: Basic " + Credentials,
  "Content-Type: application/pkcs10",
  "Content-Transfer-Encoding: base64"
]

/* -- Helper Functions --- */

function stripPemHeaders(pemString) {
  return pemString
    .split('\n')
    .filter(line => !line.startsWith('-----'))
    .map(line => line.trim())
    .join('');
}

async function checkValidityTime(Certificate) {
  const isoExpiryTime = parseCiscoDate(Certificate.notAfter)
  const expiryDate = new Date(isoExpiryTime);
  console.log(expiryDate)
  const timeNow = new Date();
  console.log(timeNow)
  const diffInMs = expiryDate - timeNow;
  const fifteenDaysInMs = 8 * 24 * 60 * 60 * 1000;
  return diffInMs > 0 && diffInMs < fifteenDaysInMs;
}

function parseCiscoDate(dateStr) {
  // Input: "Mar 31 21:48:07 2026 GMT"
  const parts = dateStr.split(' ');
  const monthMap = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  const month = monthMap[parts[0]];
  const day = parts[1].padStart(2, '0');
  const time = parts[2];
  const year = parts[3];

  // Reconstruct to ISO format: "2026-03-31T21:48:07Z"
  const isoStr = `${year}-${month}-${day}T${time}Z`;
  return new Date(isoStr);
}

/* vibe coded - assumes pkcs7 container contains 1 certificate */
function extractCertFromPkcs7(b64) {
    // 1. Clean input
    const cleanB64 = b64.replace(/-----BEGIN.*?-----|-----END.*?-----|\s/g, '');
    const binStr = atob(cleanB64);
    const data = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) data[i] = binStr.charCodeAt(i);

    /**
     * PKCS#7 (SignedData) Structure:
     * The certificates are usually stored in a tagged SET [0] (0xA0).
     * We need to find the start of the actual X.509 Sequence (0x30) 
     * that is INSIDE that set.
     */
    for (let i = 0; i < data.length - 32; i++) {
        // Look for the standard X.509 "MII" start sequence in binary: 
        // 0x30 0x82 (Sequence + 2-byte length)
        if (data[i] === 0x30 && data[i+1] === 0x82) {
            
            // Calculate the length from the ASN.1 header (Big Endian)
            const certLen = (data[i+2] << 8) | data[i+3];
            const totalSize = certLen + 4; // 4 bytes for 0x30 0x82 LL LL

            // Validate: The cert must be reasonably large and fit in the blob
            if (totalSize > 400 && (i + totalSize) <= data.length) {
                // Check for a common 'Fingerprint' of a real certificate:
                // Another Sequence (TBSCertificate) should start shortly after
                if (data[i+4] === 0x30) {
                    const certBytes = data.slice(i, i + totalSize);
                    
                    // Convert back to PEM
                    let binary = '';
                    for (let b = 0; b < certBytes.length; b++) {
                        binary += String.fromCharCode(certBytes[b]);
                    }
                    const base64 = btoa(binary);
                    const wrapped = base64.match(/.{1,64}/g).join('\n');
                    
                    return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----`;
                }
            }
        }
    }
    throw new Error("Could not find a valid X.509 structure within this PKCS#7 blob.");
}

/* Vibe coded - assumes pkcs7 bundle contains 2 certificates */
function extractCAsFromPKCS7(b64) {
    const cleanB64 = b64
        .replace(/-----BEGIN.*?-----|-----END.*?-----|\s/g, '');
    
    const binStr = atob(cleanB64);
    const data = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) data[i] = binStr.charCodeAt(i);

    const certs = [];
    let i = 0;

    while (i < data.length - 4) {
        if (data[i] === 0x30) {
            let len = 0;
            let headerSize = 0;
            if (data[i + 1] === 0x82) {
                len = (data[i + 2] << 8) | data[i + 3];
                headerSize = 4;
            } else if (data[i + 1] === 0x81) {
                len = data[i + 2];
                headerSize = 3;
            } else if (data[i + 1] < 0x80) {
                len = data[i + 1];
                headerSize = 2;
            }

            const totalSize = len + headerSize;
            if (totalSize > 400 && totalSize <= (data.length - i) && totalSize < data.length * 0.95) {
                const certBytes = data.slice(i, i + totalSize);
                let binary = '';
                for (let b = 0; b < certBytes.length; b++) binary += String.fromCharCode(certBytes[b]);
                const base64Cert = btoa(binary);
                
                certs.push(`-----BEGIN CERTIFICATE-----\n${base64Cert.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`);
                
                i += totalSize;
                continue;
            }
        }
        i++;
    }
    return certs;
}

async function getSubjectNameForCertLookup() {
  let fqdn = await fetchcurrentFQDN();
  let domainname = fqdn.split('.').slice(-2).join('.');
  return domainname
}

/* -- Helper Functions --- */

/* -- Cisco Device Functions --- */

async function fetchInstalledDeviceCertificates() {
    let devicecerts = await xapi.Command.Security.Certificates.Services.Show()
    let matchedcert
    let possibleSubjectName = await getSubjectNameForCertLookup()
    for (let cert of devicecerts.Details) {
      if (cert.IssuerName.match("AE Light CA") && cert.SubjectName.match(possibleSubjectName)) {
        matchedcert = cert
      }
    }
    return matchedcert
}

async function activateCertificatefor1X(thumbprint) {
  try {
    let activate = await xapi.Command.Security.Certificates.Services.Activate({Fingerprint: thumbprint, Purpose: "802.1X" });
    console.log(activate)
  } catch (error) {
    console.error(error)
  }
}

async function activateCertificateforHTTPS(thumbprint) {
  try {
    let activate = await xapi.Command.Security.Certificates.Services.Activate({Fingerprint: thumbprint, Purpose: "HTTPS" });
    console.log(activate)
  } catch (error) {
    console.error(error)
  }
}

async function fetchcurrentFQDN() {
  let hostname = await xapi.Status.Network.FQDN.get()
  return hostname
}

async function fetchCurrentIpAddress() {
  let ip = await xapi.Status.Network.IPv4.Address.get()
  return ip
}

async function installCACertificates(CACertificates) {
  for (let CACertificate of CACertificates) {
    await xapi.Command.Security.Certificates.CA.Add(CACertificate).then((result) => {console.log(result)}).catch((error) => {console.error(error)})
  }
}

async function CheckDeviceCertificate() {
  let cert = await fetchInstalledDeviceCertificates();
  let validity = await checkValidityTime(cert);
  if (validity) {
   await createCSRandPosttoEST();
   await xapi.Command.Security.Certificates.Services.Delete({Fingerprint:cert.Fingerprint})
  }
}

/* -- Cisco Device Functions --- */


/* -- EST Functions --- */

async function ESTSimpleEnroll(csr) {
  let cert = ""
  try {
     cert = await xapi.Command.HttpClient.Post({
      'Header': headers,
      'Url': ESTInterface + "simpleenroll",
      'ResultBody': 'PlainText'
    }, csr)
  }
  catch (error) {
    console.log(error)
  }
  console.log(cert)
  let cleancert = extractCertFromPkcs7(cert.Body)
  try {
    let importcert = await xapi.Command.Security.Certificates.CSR.Link(cleancert)
    console.log(importcert)
  } catch (error) {
    console.error(error)
  }
  let matchedCert = await fetchInstalledDeviceCertificates()
  await activateCertificatefor1X(matchedCert.Fingerprint)
  await activateCertificateforHTTPS(matchedCert.Fingerprint)
}

async function ESTCACerts() {
  let cacerts = await xapi.Command.HttpClient.Get({
    'Url': ESTInterface + "cacerts",
    // We allow Insecure HTTPS in this instance to allow the codec to be able to boot strap the underlying needed CA Certs. 
    // The response contains a pkce7 container containing both Root CA cert and Issuing CA Cert
    'AllowInsecureHTTPS': 'True'
  });
  let CACertificates = extractCAsFromPKCS7(cacerts.Body);
  console.log(CACertificates)
  await installCACertificates(CACertificates);
}

async function CreateCSRandPostToEST() {
  let hostname = await fetchcurrentFQDN()
  let csr = await xapi.Command.Security.Certificates.CSR.Create({CommonName: cleaned, SanDns: [cleaned]})
  let csrnoheaders = stripPemHeaders(csr.PEM)
  await ESTSimpleEnroll(csrnoheaders);
}
