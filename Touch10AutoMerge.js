const xapi = require('xapi');

var NumCall = 0; 
var LastDirection = "";

function AutoMerge()
  {
    console.log("Automerge comencing, checking if call is outgoing");
    console.log("Number of calls is: " + NumCall);
    if (LastDirection === "Outgoing" && NumCall === 2)
    {
      xapi.command('Call Join');
    }
    
  }

xapi.status.on('Call', InCallStatus =>
  {
    console.log(InCallStatus);
    if (InCallStatus.Direction === "Outgoing" || InCallStatus.Direction === "Incoming")
    {
      LastDirection = InCallStatus.Direction;
    }
  }
);

xapi.status.on('SystemUnit State NumberOfActiveCalls', NumCalls =>
  {
    NumCall = Number.parseInt(NumCalls);
    if (NumCall === 2)
      {
        AutoMerge();
      }
    else
      {
        console.log("Didnt match Number of Calls -> 2");
      }
    console.log("NuMCalls is: " + NumCalls);
  }
);
