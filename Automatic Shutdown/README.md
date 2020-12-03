# Automatic Shutdown

**This script is to be used to scheduele automatic shutdown at a specific time**

*Please note that this macro has not been fully tested and could prove to not function correctly... Use at own risk...*

*This macro was not created by a developer, therefore the code looks like a spaghetti mess thrown together*


- **Functionality**: The intention with this script is to 'forcefully' turn off the system due to it being projector based. The user at the time specificed will be asked if she/he wants to turn off the system or extend the usage of the system. If the system is in call the check will continue in a loop until the system is out of call. 
- **Requirements**: 
    1. CE based endpoint
    2. Projector based system (not a requirement but with screens its not a need)

**How To**
1. Adjust 'ShutDownTime' constant to suit your enviroment. 
    - The time used will be based on which time zone the endpoint has been set to. 