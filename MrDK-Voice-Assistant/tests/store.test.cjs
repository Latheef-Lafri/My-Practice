'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createStore,localDay,isMinute}=require('../backend/store.cjs');
const {executeTool,TOOLS}=require('../backend/ai.cjs');
async function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mrdk-test-'));
  const filename=path.join(dir,'test.sqlite');
  const store=await createStore(filename);
  return {store,filename,cleanup:()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
function futureTime(minutes){const d=new Date(Date.now()+minutes*60000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
test('tasks persist, can complete and delete',async()=>{
  const f=await fixture();try{
    const t=f.store.saveTask({title:'Finish project',due_date:localDay(),priority:'high'});
    assert.equal(t.title,'Finish project');assert.equal(t.done,0);
    f.store.toggleTask(t.id,true);assert.equal(f.store.snapshot().tasks[0].done,1);
    assert.ok(fs.statSync(f.filename).size>1000);
    f.store.deleteTask(t.id);assert.equal(f.store.snapshot().tasks.length,0);
  }finally{f.cleanup();}
});
test('event times validate, reminders and wellness persist',async()=>{
  const f=await fixture();try{
    assert.throws(()=>f.store.saveEvent({title:'Bad',start_at:'2026-05-01T12:00',end_at:'2026-05-01T11:00'}));
    const e=f.store.saveEvent({title:'My class',start_at:'2027-01-01T12:00',end_at:'2027-01-01T13:00'});
    assert.equal(e.title,'My class');
    const reminder=f.store.saveReminder({title:'Test alert',remind_at:futureTime(10)});
    assert.ok(reminder.id>0);assert.equal(f.store.snapshot().reminders.length,1);
    const entry=f.store.addWellness({kind:'water',amount:250});assert.equal(entry.unit,'ml');
    assert.throws(()=>f.store.addWellness({kind:'water',amount:-3}));
    assert.ok(isMinute(futureTime(20)));
  }finally{f.cleanup();}
});
test('AI action allowlist can create tasks; memory and data erase work',async()=>{
  const f=await fixture();try{
    assert.ok(TOOLS.some(t=>t.function.name==='add_task'));
    const created=executeTool(f.store,'add_task',{title:'Read notes'});
    assert.equal(created.title,'Read notes');
    executeTool(f.store,'remember_preference',{content:'I study at 8pm'});
    assert.equal(f.store.snapshot().memories.length,1);
    assert.throws(()=>executeTool(f.store,'run_shell_command',{}));
    f.store.clearAll();const snap=f.store.snapshot();
    assert.equal(snap.tasks.length,0);assert.equal(snap.memories.length,0);
  }finally{f.cleanup();}
});
