# Pexip VMR Control

**This script is to be used for controlling a Pexip VMR escalated call**
- **Functionality**: This macro allows a user to control the layout on a by using a Pexip VMR
- **Requirements**: Endpoint has to be registered on CUCM.

**HowTo**: 
1. Change PEXIP_INSTANCE_URL to point to your conferencing node
    - This conferencing node should be reachable via HTTPS from the endpoint
2. Change ESCALATEPREFIX to match your numberpattern on your VMRs
    - This matchpattern is based on regex so therefore you have to create a regex rule which will match the VMRs that the endpoint can end up in. 
    - The match will only happen on the first part of the URI, the @domain.example is split below (dont want to have to parse the domain aswell) 

