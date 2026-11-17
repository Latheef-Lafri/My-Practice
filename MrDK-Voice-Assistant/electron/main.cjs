'use strict';
const {app,BrowserWindow,ipcMain,dialog,Notification,Tray,Menu,globalShortcut,session,nativeImage}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const {createStore}=require('../backend/store.cjs');
const ai=require('../backend/ai.cjs');

if(!app.requestSingleInstanceLock()){app.quit();process.exit(0);}
let store,win,tray,quitting=false,ttsChild=null;
const iconPath=()=>path.join(app.getAppPath(),'assets','mrdk.png');
const emit=(name,payload)=>{if(win&&!win.isDestroyed())win.webContents.send(name,payload);};
function showWindow(){if(!win||win.isDestroyed())return;win.show();win.focus();}
function createWindow(){
  win=new BrowserWindow({width:1390,height:860,minWidth:920,minHeight:650,
    title:'Mr.DK — Personal AI Assistant',backgroundColor:'#090f23',icon:iconPath(),autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:false,webSecurity:true,backgroundThrottling:false}
  });
  if(process.env.VITE_DEV_SERVER_URL)win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname,'..','dist','index.html'));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{
    const allowed=process.env.VITE_DEV_SERVER_URL?url.startsWith('http://127.0.0.1:5173/'):url.startsWith('file://');
    if(!allowed)event.preventDefault();
  });
  win.on('close',e=>{if(!quitting){e.preventDefault();win.hide();}});
}
function createTray(){
  tray=new Tray(nativeImage.createFromPath(iconPath()));
  tray.setToolTip('Mr.DK — Your AI assistant');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open Mr.DK',click:showWindow},
    {label:'Speak (Ctrl+Shift+Space)',click:()=>{showWindow();emit('assistant:activate');}},
    {type:'separator'},
    {label:'Quit Mr.DK',click:()=>{quitting=true;app.quit();}}
  ]));
  tray.on('double-click',showWindow);
}
function tryNotify(title,body){
  if(Notification.isSupported()){
    const n=new Notification({title,body,silent:false,icon:iconPath()});
    n.on('click',showWindow);n.show();
  }
  emit('reminder:fired',{title,body});
}
function checkReminders(){
  if(!store)return;
  for(const r of store.dueReminders()){
    // A reminder older than 24 hours is marked read, but not shown as a stale interruption.
    if(Date.now()-new Date(r.remind_at).getTime()<86_400_000)tryNotify('Mr.DK Reminder',r.title);
    store.markNotified(r.id);
  }
}
function runChild(command,args,timeoutMs){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{windowsHide:true,shell:false});
    let out='',err='',ended=false;
    const t=setTimeout(()=>{if(!ended){child.kill();reject(Error('Speech processing timed out'));}},timeoutMs);
    child.stdout.on('data',d=>{out+=d.toString();if(out.length>60000)out=out.slice(-60000);});
    child.stderr.on('data',d=>{err+=d.toString();if(err.length>12000)err=err.slice(-12000);});
    child.on('error',e=>{ended=true;clearTimeout(t);reject(e);});
    child.on('close',code=>{if(ended)return;ended=true;clearTimeout(t);if(code===0)resolve(out);else reject(Error((err||out||`Process failed with code ${code}`).slice(-700)));});
  });
}
function resolveSpeechPaths(){
  const s=store.settings();
  const binary=s.speechEnginePath,model=s.speechModelPath;
  if(!binary||!model||!fs.existsSync(binary)||!fs.existsSync(model))throw Error('Whisper is not configured. Open Settings and select whisper-cli.exe and a ggml model file.');
  if(path.basename(binary).toLowerCase()!=='whisper-cli.exe')throw Error('Choose the official whisper-cli.exe executable');
  if(!/\.bin$/i.test(model))throw Error('Select a ggml Whisper model (.bin)');
  return {binary,model};
}
async function transcribeWav(data){
  if(!data||typeof data.length!=='number'||data.length<44||data.length>20_000_000)throw Error('Invalid audio; recording must be under 20 MB');
  const {binary,model}=resolveSpeechPaths();
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mrdk-wav-'));
  const wavFile=path.join(dir,'speech.wav');
  try{
    fs.writeFileSync(wavFile,Buffer.from(data));
    const outBase=path.join(dir,'transcription');
    const output=await runChild(binary,['-m',model,'-f',wavFile,'-l','auto','-otxt','-of',outBase,'-nt'],180000);
    const transcriptFile=outBase+'.txt';
    if(fs.existsSync(transcriptFile))return fs.readFileSync(transcriptFile,'utf8').trim().slice(0,3000);
    // Fallback for older variants of whisper-cli that only print to stdout.
    return output.replace(/\x1b\[[0-9;]*m/g,'').split(/\r?\n/).map(x=>x.trim())
      .filter(x=>x&&!/^(whisper_|system_info|main:|loading|processing|progress)/i.test(x)).join(' ').slice(0,3000);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
async function speak(text){
  const s=store.settings();if(!s.voiceEnabled)return {spoken:false,reason:'Voice disabled'};
  if(process.platform!=='win32')return {spoken:false,reason:'Windows system voice required'};
  text=String(text||'').trim().slice(0,850);
  if(!text)return {spoken:false};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mrdk-tts-'));
  const textFile=path.join(dir,'speech.txt');fs.writeFileSync(textFile,text,'utf8');
  try{
    if(ttsChild){ttsChild.kill();ttsChild=null;}
    await new Promise((resolve,reject)=>{
      const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'speak.ps1'),textFile],{windowsHide:true,shell:false});
      ttsChild=child;
      let err='';const timer=setTimeout(()=>child.kill(),90000);
      child.stderr.on('data',d=>{err+=d.toString();});
      child.once('error',e=>{clearTimeout(timer);if(ttsChild===child)ttsChild=null;reject(e);});
      child.once('close',code=>{clearTimeout(timer);if(ttsChild===child)ttsChild=null;code===0?resolve():reject(Error(err.slice(-400)||'Windows speech voice unavailable'));});
    });
    return {spoken:true};
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function registerIpc(){
  ipcMain.handle('state:get',()=>store.snapshot());
  ipcMain.handle('app:status',async()=>({ai:await ai.healthCheck(store.settings().model),whisperReady:(()=>{try{resolveSpeechPaths();return true;}catch{return false;}})(),platform:process.platform}));
  ipcMain.handle('ai:chat',(_e,text)=>ai.ask(store,text));
  ipcMain.handle('voice:transcribe',(_e,wav)=>transcribeWav(wav));
  ipcMain.handle('voice:speak',(_e,text)=>speak(text));
  ipcMain.handle('voice:stop',()=>{if(ttsChild){ttsChild.kill();ttsChild=null;}return true;});
  ipcMain.handle('tasks:save',(_e,p)=>store.saveTask(p));
  ipcMain.handle('tasks:toggle',(_e,p)=>store.toggleTask(p.id,p.done));
  ipcMain.handle('tasks:delete',(_e,id)=>store.deleteTask(id));
  ipcMain.handle('events:save',(_e,p)=>store.saveEvent(p));
  ipcMain.handle('events:delete',(_e,id)=>store.deleteEvent(id));
  ipcMain.handle('reminders:save',(_e,p)=>store.saveReminder(p));
  ipcMain.handle('reminders:delete',(_e,id)=>store.deleteReminder(id));
  ipcMain.handle('wellness:add',(_e,p)=>store.addWellness(p));
  ipcMain.handle('wellness:delete',(_e,id)=>store.deleteWellness(id));
  ipcMain.handle('memories:add',(_e,content)=>store.addMemory(content));
  ipcMain.handle('memories:delete',(_e,id)=>store.deleteMemory(id));
  ipcMain.handle('messages:clear',()=>store.clearMessages());
  ipcMain.handle('data:clear',()=>store.clearAll());
  ipcMain.handle('settings:set',(_e,p)=>{
    const value=store.setSetting(p.key,p.value);
    if(p.key==='autoStart'&&process.platform==='win32')app.setLoginItemSettings({openAtLogin:value});
    return value;
  });
  ipcMain.handle('data:export',async()=>{
    store.persist();
    const result=await dialog.showSaveDialog(win,{title:'Export your private data',defaultPath:`MrDK-backup-${new Date().toISOString().slice(0,10)}.sqlite`,filters:[{name:'SQLite Database',extensions:['sqlite']}]});
    if(result.canceled||!result.filePath)return false;
    fs.copyFileSync(store.filename,result.filePath);return true;
  });
  ipcMain.handle('app:choose-file',async(_e,kind)=>{
    if(!['binary','model'].includes(kind))throw Error('Invalid file type');
    const filters=kind==='binary'?[{name:'Windows Executable',extensions:['exe']}]:[{name:'Whisper model',extensions:['bin']}];
    const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters});
    return result.canceled?'':(result.filePaths[0]||'');
  });
  ipcMain.handle('window:minimize',()=>win.minimize());
}
app.on('second-instance',showWindow);
app.whenReady().then(async()=>{
  app.setAppUserModelId('lk.mrdk.personalassistant');
  store=await createStore(path.join(app.getPath('userData'),'mrdk.sqlite'));
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>{
    const url=contents.getURL();
    const trusted=url.startsWith('file://')||(process.env.VITE_DEV_SERVER_URL&&url.startsWith('http://127.0.0.1:5173/'));
    callback(Boolean(trusted&&permission==='media'));
  });
  registerIpc();createWindow();createTray();
  globalShortcut.register('CommandOrControl+Shift+Space',()=>{showWindow();emit('assistant:activate');});
  setInterval(checkReminders,15000);setTimeout(checkReminders,1500);
}).catch(e=>{dialog.showErrorBox('Mr.DK startup error',e.stack||e.message);app.quit();});
app.on('before-quit',()=>{quitting=true;if(ttsChild)ttsChild.kill();});
app.on('will-quit',()=>{globalShortcut.unregisterAll();if(store)store.close();});
app.on('window-all-closed',()=>{/* tray keeps the assistant running on Windows */});
