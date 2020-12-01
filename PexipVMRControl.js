const xapi = require('xapi');

const PEXIP_INSTANCE_URL = 'vctest.equinor.com';
const PEXIP_VMR = 'https://' + PEXIP_INSTANCE_URL + '/api/client/v2/conferences/';
const REQUESTTOKEN = '/request_token';
const REFRESHTOKEN = '/refresh_token';
const RELEASE = '/release_token';
const CONTENT_TYPE = "Content-Type: application/json";
const ACCEPT_TYPE = "Accept:application/json";
const ESCALATEPREFIX = /666\d+/g; // Regex... 
var token = '';
var timeout = '';
var DeviceType = "";
var VMRNUMBER = "";
var Interval = "";
var NumCall = 0; 
/* TIMER */

function startTimer(seconds, conference, option) {
    var timer = seconds;
    Interval = setInterval(function () {
        seconds = parseInt(timer % 60, 10);
        seconds = seconds < 10 ? "0" + seconds : seconds;

        //display.text(minutes + ":" + seconds);
        if (--timer < 1) 
        {
            //timer = seconds;
            timer = 0;
            console.log("Connecting to Pexip Api towards: " + PEXIP_VMR + " with tokeN: " + REFRESHTOKEN);
            CallPexipVMR(conference, REFRESHTOKEN);
            StopTimer();
        }

        console.log(timer);
    }, 1000);
}

function StopTimer(){
    clearInterval(Interval);
  }

function CallPexipVMR(conference, option)
{
  var postarguments = 
    {
       'display_name': 'Touch10Api',
       'call_tag': 'Test'
    };
  if(option == '/request_token')
    {
        console.log("Matched request Token: " + PEXIP_VMR + conference + option);
        xapi.command('HttpClient Post',
            {
            'Header': 
            [
            'Content-Type: application/json',

            ],
            'Url': PEXIP_VMR + conference + option,
            'AllowInsecureHTTPS': 'True',
            'ResultBody': 'PlainText'
            }, JSON.stringify(postarguments))
        .then(
        (result) => 
            {
            //var body = result;
            for (var member in result) console.log(member);
            //console.log(body);
            console.log(result.Body);
            var bodystring = JSON.parse(result.Body);
            token = bodystring.result.token;
            timeout = bodystring.result.expires -110;
            console.log(token);
            console.log(timeout);
            StopTimer();
            startTimer(timeout, conference, option);
            }
        )
        .catch(
        (result) =>
            {
            console.error(result);
            }
        );
  }
  else if(option == '/refresh_token' || option == '/release_token' )
  {
    console.log("Matched refresh or Release Token: " + PEXIP_VMR + conference + option);
        xapi.command('HttpClient Post',
            {
            'Header': 
            [
            'Content-Type: application/json',
            'token: ' + token,
            ],
            'Url': PEXIP_VMR + conference + option,
            'AllowInsecureHTTPS': 'True',
            'ResultBody': 'PlainText'
            }, JSON.stringify(postarguments))
        .then(
        (result) => 
            {
            //var body = result;
            for (var member in result) console.log(member);
            //console.log(body);
            console.log(result.Body);
            var bodystring = JSON.parse(result.Body);
            token = bodystring.result.token;
            timeout = bodystring.result.expires -110; // -110 for faster debugging
            console.log(token);
            console.log(timeout);
            var prefixcheck = VMRNUMBER.match(ESCALATEPREFIX);
            if (NumCall === 1 && prefixcheck)
            {
                StopTimer();
                startTimer(timeout, conference, option);
            }
            else
            {
                OutOfVMR();
                console.log("Exited out of VMR, closing down connection");
            }
            }
        )
        .catch(
        (result) =>
            {
            console.error(result);
            }
        );
    }
}

function LayoutVMR(conference, layout)
{
    var postarguments = 
    {
        'display_name': 'Touch10Api',
        'call_tag': 'Touch10Api',
        'transforms': 
            {
                'layout': layout
            }
    };
    if (option === "")
    {
        xapi.command('HttpClient Post',
        {
        'Header': 
        [
        'Content-Type: application/json',
        'token: ' + token,
        ],
        'Url': PEXIP_VMR + conference + '/transform_layout',
        'AllowInsecureHTTPS': 'True',
        'ResultBody': 'PlainText'
        }, JSON.stringify(postarguments))
    .then(
    (result) => 
        {
        //var body = result;
        for (var member in result) console.log(member);
        //console.log(body);
        console.log(result.Body);
        var bodystring = JSON.parse(result.Body);
        token = bodystring.result.token;
        timeout = bodystring.result.expires -110; // -110 for faster debugging
        console.log(token);
        console.log(timeout);
        var prefixcheck = VMRNUMBER.match(ESCALATEPREFIX);
        if (NumCall === 1 && prefixcheck)
        {
            StopTimer();
            startTimer(timeout, conference, option);
        }
        else
        {
            OutOfVMR();
            console.log("Exited out of VMR, closing down connection");
        }
        }
    )
    .catch(
    (result) =>
        {
        console.error(result);
        }
    );
    }
    
}


function InVMR()
    {
        console.log("Showing Layout Menu");
        xapi.command("UserInterface Extensions Panel Update",
            { 
                PanelId: 'layout',
                Visibility: 'Auto'
            });
        xapi.status.on("Call", InCall =>
        {
          if (InCall.RemoteNumber !== undefined)
          {
            VMRNUMBER = InCall.RemoteNumber.split("@")[0];
            var prefixcheck = VMRNUMBER.match(ESCALATEPREFIX);
            console.log(prefixcheck);
            console.log("VMRNUMBER is: " + VMRNUMBER);
            if (prefixcheck)
            {
                CallPexipVMR(VMRNUMBER, REQUESTTOKEN);
            }
          }
        });
    }

function ShowLayoutMenu()
    {
      xapi.command('UserInterface Message Prompt Display',
      {
          Title: 'Conference Layout',
          Text: 'Select layout from listing below',
          Duration: 0,
          FeedbackId: 'layoutoption',
          'Option.1': '1:0 - Main Speaker',
          'Option.2': '1:7 - Main + 7 Speakers',
          'Option.3': '1:21 - Main + 21 Speakers',
          'Option.4': '2:21 - 2 Main + 21 Speakers',
          'Option.5': '4:0 - Equal',
      }).catch((error) => {console.error(error);});
    }
  

function OutOfVMR()
    {
        console.log("Not Showing Layout Menu");
        StopTimer();
        xapi.status.on("Call", InCall =>
        {
            if (InCall.RemoteNumber !== undefined)
            {
                
                VMRNUMBER = InCall.RemoteNumber.split("@")[0];
                console.log("InCall with number is: " + VMRNUMBER);
                var prefixcheck = VMRNUMBER.match(ESCALATEPREFIX);
                console.log("Prefixcheck is: " + prefixcheck);
                if (prefixcheck)
                {
                    console.log("Matched prefixcheck");
                }
                else
                {
                    if (token === "")
                    {
                        console.log("token is:" + token);
                        console.log("Didnt match prefixcheck and token is empty");
                        
                    }
                    else
                    {
                        console.log("Didnt match prefixcheck and token is not empty");
                        //CallPexipVMR(VMRNUMBER, RELEASE);
                    }
                }
            }
        });
        xapi.command("UserInterface Extensions Panel Update",
            { 
                PanelId: 'layout',
                Visibility: 'Hidden'
            });
    }

xapi.status.on('Call', InCallStatus =>
  {
    //console.log(InCallStatus);
    if (InCallStatus.DeviceType === "MCU" || InCallStatus.DeviceType === "Endpoint")
    {
        DeviceType = InCallStatus.DeviceType;
        if (DeviceType === "MCU")
            {
                InVMR();
            }
        else if (DeviceType === "Endpoint")
            {
                OutOfVMR();
            }
        console.log("DeviceType is: " + DeviceType);
    }
  }
);


xapi.status.on('SystemUnit State NumberOfActiveCalls', NumCalls =>
    {
        NumCall = Number.parseInt(NumCalls);
    }
);

xapi.event.on('UserInterface Extensions Panel Clicked', (event) => 
    {
        if (event.PanelId === "layout")
        {
            console.log("Showing Layout Menu");
            ShowLayoutMenu();
        }
    }
);

xapi.event.on('UserInterface Message Prompt Response', (event) => 
  {
    if (event.FeedbackId !== 'layoutoption')
        return;
    else
    {
        console.log('OptionSelected', event.OptionId);
        switch(event.OptionId)
        {
            case '1':
                LayoutVMR(VMRNUMBER, "1:0");
                break;
            case '2':
                LayoutVMR(VMRNUMBER, "1:7");
                break;
            case '3':
                LayoutVMR(VMRNUMBER, "1:21");
                break;
            case '4':
                LayoutVMR(VMRNUMBER, "2:21");
                break;
            case '5':
                LayoutVMR(VMRNUMBER, "4:0");
                break;
        }
    }
});

/*
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'panel_1')
    {
      CallPexipVMR(PEXIP_VMR, REQUESTTOKEN);
    }
});

xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'refresh')
    {
      CallPexipVMR(PEXIP_VMR, REFRESHTOKEN);
    }
});

xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'release')
    {
      CallPexipVMR(PEXIP_VMR, RELEASE);
      token = '';
    }
});
*/
/*
{"display_name": "Alice", "call_tag": "def456"}
*/