'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const invoke=(channel,payload)=>ipcRenderer.invoke(channel,payload);
contextBridge.exposeInMainWorld('mrdk',Object.freeze({
  getState:()=>invoke('state:get'),
  status:()=>invoke('app:status'),
  chat:(text)=>invoke('ai:chat',text),
  transcribe:(wav)=>invoke('voice:transcribe',wav),
  speak:(text)=>invoke('voice:speak',text),
  stopSpeak:()=>invoke('voice:stop'),
  saveTask:(payload)=>invoke('tasks:save',payload),
  toggleTask:(id,done)=>invoke('tasks:toggle',{id,done}),
  deleteTask:(id)=>invoke('tasks:delete',id),
  saveEvent:(payload)=>invoke('events:save',payload),
  deleteEvent:(id)=>invoke('events:delete',id),
  saveReminder:(payload)=>invoke('reminders:save',payload),
  deleteReminder:(id)=>invoke('reminders:delete',id),
  logWellness:(payload)=>invoke('wellness:add',payload),
  deleteWellness:(id)=>invoke('wellness:delete',id),
  saveMemory:(text)=>invoke('memories:add',text),
  deleteMemory:(id)=>invoke('memories:delete',id),
  setSetting:(key,value)=>invoke('settings:set',{key,value}),
  clearMessages:()=>invoke('messages:clear'),
  clearAll:()=>invoke('data:clear'),
  exportData:()=>invoke('data:export'),
  chooseFile:(kind)=>invoke('app:choose-file',kind),
  minimize:()=>invoke('window:minimize'),
  onReminder:(callback)=>{const h=(_e,p)=>callback(p);ipcRenderer.on('reminder:fired',h);return()=>ipcRenderer.removeListener('reminder:fired',h);},
  onActivate:(callback)=>{const h=()=>callback();ipcRenderer.on('assistant:activate',h);return()=>ipcRenderer.removeListener('assistant:activate',h);}
}));
