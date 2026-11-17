'use strict';
const {localDay,localMinute} = require('./store.cjs');
const OLLAMA_URL='http://127.0.0.1:11434';
const parameter = (properties,required=[])=>({type:'object',properties,required});
const field=(description,type='string')=>({type,description});
const tool=(name,description,parameters)=>({type:'function',function:{name,description,parameters}});
const TOOLS=[
  tool('list_tasks','Read existing tasks and their status',parameter({date:field('Optional date YYYY-MM-DD; omit for all tasks')})),
  tool('add_task','Create a task only when the user requests it',parameter({title:field('Task title'),due_date:field('Optional YYYY-MM-DD'),due_time:field('Optional HH:mm local time'),priority:{type:'string',enum:['low','medium','high']},duration:{type:'integer',description:'Estimated minutes'},notes:field('Optional notes')},['title'])),
  tool('complete_task','Mark an existing task done or not done using its ID',parameter({id:field('Task ID','integer'),done:field('true or false','boolean')},['id'])),
  tool('delete_task','Delete an existing task by ID, only on explicit request',parameter({id:field('Task ID','integer')},['id'])),
  tool('list_events','Read calendar entries',parameter({date:field('Optional YYYY-MM-DD')})),
  tool('add_event','Create calendar event on explicit request; both times required',parameter({title:field('Event title'),start_at:field('Local YYYY-MM-DDTHH:mm'),end_at:field('Local YYYY-MM-DDTHH:mm'),notes:field('Optional note')},['title','start_at','end_at'])),
  tool('delete_event','Delete event by ID on explicit request',parameter({id:field('Event ID','integer')},['id'])),
  tool('list_reminders','Read pending reminders',parameter({})),
  tool('add_reminder','Schedule a desktop notification; requires exact future date and time',parameter({title:field('Reminder title'),remind_at:field('Local YYYY-MM-DDTHH:mm')},['title','remind_at'])),
  tool('delete_reminder','Cancel reminder by ID on explicit request',parameter({id:field('Reminder ID','integer')},['id'])),
  tool('log_wellness','Record user-reported water in ml, sleep in hours, exercise in minutes, or user-described symptom severity 1-10 (with a note)',parameter({kind:{type:'string',enum:['water','sleep','exercise','symptom']},amount:field('Positive amount','number'),date:field('Optional YYYY-MM-DD'),note:field('Optional note')},['kind','amount'])),
  tool('get_wellness','Read wellness tracking entries',parameter({date:field('Optional YYYY-MM-DD')})),
  tool('remember_preference','Store a personal preference or fact only when user explicitly says to remember it',parameter({content:field('User preference to remember')},['content'])),
  tool('list_memories','Read user-saved preferences',parameter({}))
];

function executeTool(store,name,a={}) {
  switch(name){
    case 'list_tasks':return store.snapshot().tasks.filter(t=>!a.date||t.due_date===a.date);
    case 'add_task':return store.saveTask(a);
    case 'complete_task':return store.toggleTask(a.id,a.done!==false);
    case 'delete_task':return store.deleteTask(a.id);
    case 'list_events':return store.snapshot().events.filter(e=>!a.date||e.start_at.startsWith(a.date));
    case 'add_event':return store.saveEvent(a);
    case 'delete_event':return store.deleteEvent(a.id);
    case 'list_reminders':return store.snapshot().reminders.filter(r=>!r.notified);
    case 'add_reminder':return store.saveReminder(a);
    case 'delete_reminder':return store.deleteReminder(a.id);
    case 'log_wellness':return store.addWellness(a);
    case 'get_wellness':return store.snapshot().wellness.filter(w=>!a.date||w.date===a.date).slice(0,60);
    case 'remember_preference':return store.addMemory(a.content);
    case 'list_memories':return store.snapshot().memories;
    default:throw Error('Unsupported tool: '+name);
  }
}
function systemPrompt(store){
  const s=store.snapshot();
  const day=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const notes=s.memories.slice(0,20).map(x=>'- '+x.content).join('\n');
  return `You are Mr.DK, the personal Windows AI voice assistant belonging to Lafri. Be helpful, accurate, warm and concise. The user may speak Tamil, English or Tanglish. Respond in the user's language, use simple romanized Tamil for Tanglish. Address the user as Lafri or Boss naturally, not every sentence.
Current PC local date and time: ${day}, ${localMinute().slice(11)}. Date format is YYYY-MM-DD; times are PC LOCAL TIME. Today: ${localDay()}.
You can call tools to manage tasks, events, reminders, wellness and memory. BEFORE claiming to have added/changed anything, call the correct tool and check its result. Do not invent results, IDs, dates, scheduled notifications or task details. If a requested time/date is ambiguous, ask one clarification instead of guessing. If scheduling a reminder, use add_reminder, not only add_task.
Never run arbitrary OS commands; you have no shell access. Ask confirmation before destructive bulk actions. General wellness tips are educational only, not diagnosis or treatment; for urgent symptoms recommend professional help.
Model is LOCAL and has no live internet access. Say when current external facts cannot be verified. Do not claim you searched the web.
User-saved memories:\n${notes||'(none)'}.
Today task summary: ${JSON.stringify(s.tasks.filter(t=>t.due_date===localDay()).slice(0,15).map(t=>({id:t.id,title:t.title,time:t.due_time,done:!!t.done})))}.
Today events summary: ${JSON.stringify(s.events.filter(e=>e.start_at.startsWith(localDay())).slice(0,10).map(e=>({id:e.id,title:e.title,start:e.start_at,end:e.end_at})))}.
Speak as Mr.DK, not as ChatGPT. Reply with concise plain text, not markdown tables.`;
}
async function healthCheck(model) {
  try{
    const r=await fetch(`${OLLAMA_URL}/api/tags`,{signal:AbortSignal.timeout(3500)});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    const data=await r.json();
    const names=(data.models||[]).map(m=>m.name||m.model);
    return {running:true,installed:names.some(n=>n===model||n.startsWith(model+':')),models:names};
  }catch(e){return {running:false,installed:false,models:[],error:e.message};}
}
async function ask(store,userInput){
  const input=String(userInput||'').trim().slice(0,6000);
  if(!input)throw Error('Message cannot be empty');
  const history=store.snapshot().messages.slice(-16).map(m=>({role:m.role,content:m.content}));
  store.addMessage('user',input);
  const settings=store.settings();
  let messages=[{role:'system',content:systemPrompt(store)},...history,{role:'user',content:input}];
  let actionCount=0, answer='';
  try{
    for(let round=0;round<5;round++){
      const response=await fetch(`${OLLAMA_URL}/api/chat`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:settings.model,stream:false,think:false,messages,tools:TOOLS,options:{temperature:0.35,num_ctx:4096}}),
        signal:AbortSignal.timeout(150000)
      });
      if(!response.ok){const detail=(await response.text()).slice(0,300);throw Error(`Ollama HTTP ${response.status}: ${detail}`);}
      const body=await response.json();
      const msg=body.message||{};
      const calls=Array.isArray(msg.tool_calls)?msg.tool_calls:[];
      if(!calls.length){answer=String(msg.content||'').trim();break;}
      messages.push({role:'assistant',content:msg.content||'',tool_calls:calls});
      for(const call of calls.slice(0,6)){
        const fn=call.function||{};
        const name=fn.name;
        let args=fn.arguments||{};
        if(typeof args==='string'){try{args=JSON.parse(args);}catch{args={};}}
        let result;
        try{result={ok:true,data:executeTool(store,name,args)};actionCount++;}
        catch(e){result={ok:false,error:e.message};}
        messages.push({role:'tool',tool_name:name,content:JSON.stringify(result).slice(0,16000)});
      }
    }
    if(!answer)answer=actionCount?`Done, Lafri! I processed ${actionCount} action${actionCount===1?'':'s'}. Check the dashboard for details.`:'Sorry Lafri, I could not finish that request. Please try again.';
  }catch(e){
    const detail=e?.message||'Unknown error';
    answer=`Lafri, local AI connect aagala. Ollama running-aa irukka, and "ollama pull ${settings.model}" mudinjudha-nu check pannunga. (${detail.slice(0,130)})`;
  }
  store.addMessage('assistant',answer);
  return {answer,actionCount};
}
module.exports={TOOLS,executeTool,systemPrompt,healthCheck,ask};
