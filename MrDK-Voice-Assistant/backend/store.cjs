'use strict';
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

const DEFAULT_SETTINGS = Object.freeze({
  ownerName:'Lafri', assistantName:'Mr.DK', model:'qwen3:4b',
  voiceEnabled:true, wakeEnabled:false, speechEnginePath:'', speechModelPath:'',
  autoStart:false, wakeThreshold:0.018
});
const ALLOWED_SETTINGS = new Set(Object.keys(DEFAULT_SETTINGS));
const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const localMinute = (date = new Date()) => `${localDay(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
const clean = (v, max=300) => String(v ?? '').trim().slice(0,max);
const isDay = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v||'')) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime());
const isMinute = v => /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(String(v||'')) && isDay(String(v).slice(0,10));
const isTime = v => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

async function createStore(filename) {
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const exists = fs.existsSync(filename);
  const db = exists ? new SQL.Database(new Uint8Array(fs.readFileSync(filename))) : new SQL.Database();
  db.run(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', due_date TEXT, due_time TEXT, priority TEXT NOT NULL DEFAULT 'medium', duration INTEGER NOT NULL DEFAULT 30, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, remind_at TEXT NOT NULL, notified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wellness (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, amount REAL NOT NULL, unit TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  function all(sql,params=[]) {
    const s=db.prepare(sql); try {s.bind(params);const rows=[];while(s.step()) rows.push(s.getAsObject());return rows;}finally{s.free();}
  }
  const one=(sql,params=[])=>all(sql,params)[0]||null;
  function persist() {
    const output=Buffer.from(db.export());
    fs.mkdirSync(path.dirname(filename),{recursive:true});
    const temp=filename+'.tmp';
    fs.writeFileSync(temp,output);fs.renameSync(temp,filename);
  }
  function run(sql,params=[]) {db.run(sql,params);persist();}
  function insert(sql,params=[]) {run(sql,params);return one('SELECT last_insert_rowid() AS id').id;}
  if(!exists)persist();
  const settings=()=>{
    const o={...DEFAULT_SETTINGS};
    for(const r of all('SELECT key, value FROM settings')) {
      try{o[r.key]=JSON.parse(r.value);} catch {o[r.key]=r.value;}
    }
    return o;
  };
  function setSetting(key,value) {
    if(!ALLOWED_SETTINGS.has(key))throw Error('Unknown setting');
    if(key==='voiceEnabled'||key==='wakeEnabled'||key==='autoStart')value=Boolean(value);
    else if(key==='wakeThreshold')value=Math.min(.1,Math.max(.005,Number(value)||.018));
    else if(key==='model')value=clean(value,100)||DEFAULT_SETTINGS.model;
    else if(key==='ownerName')value=clean(value,50)||'Lafri';
    else if(key==='assistantName')value='Mr.DK';
    else value=clean(value,600);
    run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key,JSON.stringify(value)]);
    return value;
  }
  function saveTask(payload={}) {
    const title=clean(payload.title,200);if(!title)throw Error('Task title is required');
    const notes=clean(payload.notes,1000);
    const due_date=payload.due_date?String(payload.due_date):null;
    const due_time=payload.due_time?String(payload.due_time):null;
    if(due_date&&!isDay(due_date))throw Error('Invalid task date');
    if(!isTime(due_time))throw Error('Invalid task time');
    const priority=['low','medium','high'].includes(payload.priority)?payload.priority:'medium';
    const duration=Math.min(480,Math.max(5,Number(payload.duration)||30));
    const id=Number(payload.id);
    if(Number.isInteger(id)&&id>0&&one('SELECT id FROM tasks WHERE id=?',[id])){
      run('UPDATE tasks SET title=?, notes=?, due_date=?, due_time=?, priority=?, duration=? WHERE id=?',[title,notes,due_date,due_time,priority,duration,id]);
      return one('SELECT * FROM tasks WHERE id=?',[id]);
    }
    const newId=insert('INSERT INTO tasks(title,notes,due_date,due_time,priority,duration,created_at) VALUES(?,?,?,?,?,?,?)',[title,notes,due_date,due_time,priority,duration,new Date().toISOString()]);
    return one('SELECT * FROM tasks WHERE id=?',[newId]);
  }
  function toggleTask(id,done) {run('UPDATE tasks SET done=? WHERE id=?',[done?1:0,Number(id)]);return true;}
  function deleteTask(id){run('DELETE FROM tasks WHERE id=?',[Number(id)]);return true;}
  function saveEvent(p={}) {
    const title=clean(p.title,200),start=clean(p.start_at,16),end=clean(p.end_at,16);
    if(!title||!isMinute(start)||!isMinute(end)||end<=start)throw Error('Event needs a title, valid start and later end');
    const notes=clean(p.notes,1000),id=Number(p.id);
    if(Number.isInteger(id)&&id>0&&one('SELECT id FROM events WHERE id=?',[id])){
      run('UPDATE events SET title=?,start_at=?,end_at=?,notes=? WHERE id=?',[title,start,end,notes,id]);
      return one('SELECT * FROM events WHERE id=?',[id]);
    }
    const newId=insert('INSERT INTO events(title,start_at,end_at,notes,created_at) VALUES(?,?,?,?,?)',[title,start,end,notes,new Date().toISOString()]);
    return one('SELECT * FROM events WHERE id=?',[newId]);
  }
  function deleteEvent(id){run('DELETE FROM events WHERE id=?',[Number(id)]);return true;}
  function saveReminder(p={}){
    const title=clean(p.title,200),at=clean(p.remind_at,16);
    if(!title||!isMinute(at))throw Error('Reminder needs a title and valid date/time');
    if(new Date(at).getTime()<=Date.now()-60_000)throw Error('Reminder must be in the future');
    const id=insert('INSERT INTO reminders(title,remind_at,created_at) VALUES(?,?,?)',[title,at,new Date().toISOString()]);
    return one('SELECT * FROM reminders WHERE id=?',[id]);
  }
  function deleteReminder(id){run('DELETE FROM reminders WHERE id=?',[Number(id)]);return true;}
  function dueReminders(){return all('SELECT * FROM reminders WHERE notified=0 AND remind_at<=? ORDER BY remind_at ASC LIMIT 20',[localMinute()]);}
  function markNotified(id){run('UPDATE reminders SET notified=1 WHERE id=?',[Number(id)]);}
  function addWellness(p={}) {
    const kind=['water','sleep','exercise','symptom'].includes(p.kind)?p.kind:null;
    const amount=Number(p.amount),date=p.date||localDay(),unit=kind==='water'?'ml':kind==='sleep'?'hours':kind==='symptom'?'severity (1-10)':'minutes';
    if(!kind||!Number.isFinite(amount)||amount<=0||amount>(kind==='symptom'?10:10000)||!isDay(date))throw Error('Invalid wellness entry');
    const id=insert('INSERT INTO wellness(kind,amount,unit,note,date,created_at) VALUES(?,?,?,?,?,?)',[kind,amount,unit,clean(p.note,300),date,new Date().toISOString()]);
    return one('SELECT * FROM wellness WHERE id=?',[id]);
  }
  function deleteWellness(id){run('DELETE FROM wellness WHERE id=?',[Number(id)]);return true;}
  function addMemory(content) {
    content=clean(content,400);if(!content)throw Error('Memory cannot be empty');
    const id=insert('INSERT INTO memories(content,created_at) VALUES(?,?)',[content,new Date().toISOString()]);
    return one('SELECT * FROM memories WHERE id=?',[id]);
  }
  function deleteMemory(id){run('DELETE FROM memories WHERE id=?',[Number(id)]);return true;}
  function addMessage(role,content) {
    if(!['user','assistant'].includes(role))throw Error('Invalid message role');
    const id=insert('INSERT INTO messages(role,content,created_at) VALUES(?,?,?)',[role,clean(content,8000),new Date().toISOString()]);
    return one('SELECT * FROM messages WHERE id=?',[id]);
  }
  function clearMessages(){run('DELETE FROM messages');}
  function clearAll(){db.run('DELETE FROM tasks;DELETE FROM events;DELETE FROM reminders;DELETE FROM wellness;DELETE FROM memories;DELETE FROM messages;');persist();}
  function snapshot(){
    return {
      settings:settings(),
      tasks:all('SELECT * FROM tasks ORDER BY done ASC, CASE priority WHEN \'high\' THEN 0 WHEN \'medium\' THEN 1 ELSE 2 END, due_date ASC, due_time ASC, id DESC LIMIT 250'),
      events:all('SELECT * FROM events ORDER BY start_at ASC LIMIT 250'),
      reminders:all('SELECT * FROM reminders ORDER BY notified ASC, remind_at ASC LIMIT 200'),
      wellness:all('SELECT * FROM wellness ORDER BY date DESC, id DESC LIMIT 250'),
      memories:all('SELECT * FROM memories ORDER BY id DESC LIMIT 100'),
      messages:all('SELECT * FROM (SELECT * FROM messages ORDER BY id DESC LIMIT 60) ORDER BY id ASC'),
      today:localDay(),now:localMinute()
    };
  }
  return {snapshot,settings,setSetting,saveTask,toggleTask,deleteTask,saveEvent,deleteEvent,saveReminder,deleteReminder,dueReminders,markNotified,addWellness,deleteWellness,addMemory,deleteMemory,addMessage,clearMessages,clearAll,all,one,persist,close:()=>db.close(),filename};
}
module.exports={createStore,DEFAULT_SETTINGS,localDay,localMinute,isDay,isMinute};
