const xapi = require('xapi');

var NumCall = 0; 
var LastDirection = "";
var MultiPointMode = "";



function AutoMerge()
  {
    //console.log("Automerge comencing, checking if call is outgoing");
    //console.log("Number of calls is: " + NumCall);
    console.log("MultipointMode is: " + MultiPointMode);
    if (MultiPointMode === "CUCMMediaResourceGroupList")
    {
      if (LastDirection === "Outgoing" && NumCall === 2)
      {
        xapi.command('Call Join');
      }
    }
    else
    {
      console.log("Endpoint not registered on CUCM or no resourcelist has been defined, not merging...");
    }
  }

function ConfigState(State)
  {
    if (State === "Auto" || State === "CUCMMediaResourceGroupList" || State == "Multisite" || State == "Off")
      {
        MultiPointMode = State;
      }
  }

xapi.status.on('Call', InCallStatus =>
  {
    if (InCallStatus.Direction === "Outgoing" || InCallStatus.Direction === "Incoming")
    {
      LastDirection = InCallStatus.Direction;
    }
  }
);

xapi.status.on('SystemUnit State NumberOfActiveCalls', NumCalls =>
  {
    NumCall = Number.parseInt(NumCalls);
    xapi.status.get('Conference Multipoint Mode').then(ConfigState);
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