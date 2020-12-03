const xapi = require('xapi');
const Sunday = 0, Saturday = 6;
const TxtId = 'timer_text';
let startTime = -1; // minutes
let timeLeft = 0; // seconds
let timer = 0;
var Incall = 0;
var MsgPrompt = 0;
const EndMessages = 'Shutting down...';
/* ----------------------Shutdown Timer------------------------*/
const ShutDownTime = '17:55';
/* ----------------------Shutdown Timer------------------------*/
/* ----------------------Popup Timeout------------------------*/
var MsgTimeout = 5; 
/* ----------------------Popup Timeout------------------------*/
/* ----------------------Timer Shutdown specific------------------------*/

function showMsg(text, duration = 5) 
  {
  xapi.command('UserInterface Message TextLine Display', {
    Text: text,
    Duration: duration,
    X: 8900,
    Y: 9500
  });
}

function setWidgetValue(widgetId, value) 
  {
  xapi.command('UserInterface Extensions Widget SetValue', {
    WidgetId: widgetId,
    Value: value,
  }).catch(() => {}); // will fail for most timer_quick_option values
}

function showTime() 
  {
  const textshutdown = `Shutting down in: ${formatTime(timeLeft)} s`;
  const textmsg = `Showing menu in: ${formatTime(timeLeft)} s`;
  if (MsgPrompt === 1)
  {
    showMsg(textshutdown, 2);
    setWidgetValue(TxtId, textshutdown);
  }
  else 
  {
    showMsg(textmsg, 2);
    setWidgetValue(TxtId, textmsg);
  }
}

function formatTime(time) 
  {
    let min = Math.floor(time / 60);
    if (min < 10) min = `0${min}`;
    let sec = time % 60;
    if (sec < 10) sec = `0${sec}`;
    return `${min}:${sec}`;
  }

function stopTimer() 
  {
    clearTimeout(timer);
    timer = 0;
  }

function startTimer() 
  {
    tick();
  }

function startT(minutes) 
  {
    cancel();
    startTime = Math.max(1, parseInt(minutes));
    timeLeft = startTime * 60;
    startTimer();
  }

function cancel() 
  {
    console.log('cancel');
    stopTimer();
    startTime = -1;
  }

/* ----------------------Timer Shutdown specific------------------------*/
/* ----------------------Automatic Shutdown------------------------*/
schedule(ShutDownTime, Standby);

xapi.status.on('Conference ActiveSpeaker CallId', callstatus => 
  {
    Incall = Number.parseInt(callstatus);
  	//console.log('info', 'setting callstatus to ', callstatus);
  	console.log ('info', 'incall status is: ', Incall);
  });

function Standby() 
  {
    const weekDay = new Date().getDay();
    if (weekDay) 
    {   
        if (Incall > 0) // If in Call then Incall will be greater than 0 
        {
            startT(MsgTimeout);
            console.log('info', 'Automatic shutdown triggered but while in call, starting timer and continuning in a loop');
        }
        else 
        {
            ShowExtendMenu();
        }
    }
schedule(ShutDownTime, Standby); // schedule it for the next day}schedule(StandupTime, StandupUri);
}

function timerFinished() 
  {
  console.log('info', 'timerFinished - running xapi.status', Incall);
    if (Incall > 0) // If in Call then Incall will be greater than 0 
    {
          //ShowExtendMenu();
          console.log('info', "In call, not showing meny, continuing countdown", Incall);
          startT(MsgTimeout);
    }
    else
    {
        if (MsgPrompt === 1)
        {
            ClearExtendedMenu();
            xapi.command("Call Disconnect");
            xapi.command("Standby Activate");
            const msg = EndMessages[ Math.floor(Math.random() * EndMessages.length) ];
            console.log('info', "Not in call, shutting down system...", Incall);
            console.log('info', 'MsgPrompt===1 still up, shutting down system');
            cancel();
        }
        else 
        {
            ShowExtendMenu();
            console.log('info', 'MsgPrompt===0 is down, showing message prompt to remind user');
        }
    }
  console.log(Incall);
}

function tick() 
  {
    if (timeLeft < 0) timerFinished();
    else
    {
      timer = setTimeout(tick, 1000);
      if (Incall === 0) // If in Call then Incall will be greater than 0, therefore check if Incall is less than zero
      {
        showTime();
        console.log('info', 'not in call, showing time');
      }
      console.log (timeLeft);
    }
    timeLeft--;
  }

function schedule(time, action) 
  {
        let [alarmH, alarmM] = time.split(':');
        let now = new Date();
        now = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        let difference = parseInt(alarmH) * 3600 + parseInt(alarmM) * 60 - now;
        if (difference <= 0) difference += 24 * 3600;
        console.log('schedule', setTimeout);
        return setTimeout(action, difference * 1000);
    }
    

function ShowExtendMenu()
  {
    xapi.command('UserInterface Message Prompt Display',
    {
          Title: 'Automatic Shutdown'
        , Text: 'Shutting down system in 5 minutes'
        , Duration: 0
        , FeedbackId: 'extendoption'
        , 'Option.1': 'Extend Meeting 30 min'
        , 'Option.2': 'Extend Meeting 2 hours'
        , 'Option.3': 'Shutdown and Power Off'
    }).catch((error) => {console.error(error);});
    console.log('ShowExtendMenu', 'Show Extended menu, MsgPrompt ===1');
    MsgPrompt = 1;
    startT(MsgTimeout);
    console.log('Starting 5 min timer to shut down');
  }

function ClearExtendedMenu()
  {
      xapi.command('UserInterface Message Prompt Clear');
      console.log('info', 'Clearing extended menu, MsgPrompt === 0');
      MsgPrompt = 0 ;
  }


xapi.event.on('UserInterface Message Prompt Response', (event) => 
  {
    if (event.FeedbackId !== 'extendoption')
        return;
    console.log('OptionSelected', event.OptionId);
    switch(event.OptionId)
    {
        case '1':
            startT(30);
            console.log('Message prompt', 'User pressed 30 min');
            ClearExtendedMenu();
            break;
        case '2':
            startT(120);
            console.log('Message prompt', 'User pressed 120 min');
            ClearExtendedMenu();
            break;
        case '3':
            xapi.command("Call Disconnect");
            xapi.command("Standby Activate");
            console.log('Message prompt', 'User pressed shut down');
            ClearExtendedMenu();
            break;
    }
});

