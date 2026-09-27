'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const C=require('../assets/editor/core.js');

test('build writes a local editor and a self-contained static site to the selected directory',()=>{
 const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'poster-style-build-'));
 try{
  const project=C.createProject();project.name='部署验收';
  project.objects.push(C.createObject('text',{text:'可编辑标题'}));
  const initial=path.join(sandbox,'starter.posterproj'),output=path.join(sandbox,'chosen-output');
  fs.writeFileSync(initial,JSON.stringify(project));
  const build=cp.spawnSync('python',[path.join(__dirname,'../scripts/build_editor.py'),'--project',initial,'--output',output],{encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const local=fs.readFileSync(path.join(output,'index.html'),'utf8');
  const hosted=fs.readFileSync(path.join(output,'site','index.html'),'utf8');
  assert.equal(hosted,local);
  assert.match(hosted,/window\.POSTER_INITIAL=/);
  assert.match(hosted,/可编辑标题/);
  assert.doesNotMatch(hosted,/<script[^>]+src=|<link[^>]+stylesheet|file:\/\/|[A-Z]:\\/i);
  assert.equal(JSON.parse(fs.readFileSync(path.join(output,'initial.posterproj'),'utf8')).name,'部署验收');
  assert.match(fs.readFileSync(path.join(output,'使用说明.txt'),'utf8'),/site\/index\.html/);
  const second=cp.spawnSync('python',[path.join(__dirname,'../scripts/build_editor.py'),'--project',initial,'--output',output],{encoding:'utf8'});
  assert.notEqual(second.status,0,'existing deliverable is never overwritten');
 }finally{
  const resolved=path.resolve(sandbox),temporary=path.resolve(os.tmpdir());
  if(resolved.startsWith(temporary+path.sep)&&path.basename(resolved).startsWith('poster-style-build-'))fs.rmSync(resolved,{recursive:true,force:true});
 }
});
