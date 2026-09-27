'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../assets/editor/core.js');

// This small DOM adapter exercises the production event handlers without changing
// editor source or exposing its private state. It does not test browser layout,
// SVG hit testing, pointer capture, font rendering or native drag-and-drop.
class Target {
  constructor(id = '') {
    this.id = id;
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.style = {setProperty(name, value) { this[name] = value; }};
    this.children = [];
    Object.defineProperty(this, 'innerHTML', {
      get: () => this._innerHTML || '',
      set: value => { this._innerHTML = value; this.children = []; }
    });
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, force) => {
        const enable = force === undefined ? !classes.has(name) : force;
        if (enable) classes.add(name); else classes.delete(name);
        return enable;
      }
    };
    this.offsetWidth = 280;
    this.offsetHeight = 380;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, event) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  getBoundingClientRect() {
    return {left: 300, top: 102, width: 800, height: 650, right: 1100, bottom: 752};
  }
  closest() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  append(...children) { this.children.push(...children); }
  focus() {}
  select() {}
  setPointerCapture() {}
  getContext() { return null; }
  click() { if (!this.disabled) this.onclick?.(); }
}

async function editorHarness(initial = C.createProject(), modules = []) {
  const nodes = new Map();
  const downloads = [];
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, new Target(id));
    return nodes.get(id);
  };
  const windowTarget = new Target('window');
  const documentTarget = new Target('document');
  const html = fs.readFileSync(path.join(__dirname, '../assets/editor/index.html'), 'utf8');
  for (const match of html.matchAll(/<button[^>]*data-tool="([^"]+)"/g)) {
    const button = element(`${match[1]}Tool`);
    button.tagName = 'BUTTON';
    button.dataset.tool = match[1];
  }
  documentTarget.querySelectorAll = selector => {
    if (selector === '[data-tool]' || selector === 'button[data-tool]') {
      return [...nodes.values()].filter(node => node.dataset.tool !== undefined &&
        (selector === '[data-tool]' || node.tagName === 'BUTTON'));
    }
    return [];
  };
  const document = Object.assign(documentTarget, {
    getElementById: element,
    body: element('body'),
    documentElement: element('html'),
    createElement: tag => Object.assign(new Target(), {tagName: tag.toUpperCase()}),
    fonts: {ready: Promise.resolve(), add() {}, delete() {}}
  });
  const frames = [];
  const context = {
    console, document, PosterCore: C, PosterStyleModules: modules, POSTER_INITIAL: C.clone(initial),
    Blob, URL: {createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {}},
    innerWidth: 1400, innerHeight: 900,
    localStorage: {getItem: () => null, setItem() {}},
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame(callback) { frames.push(callback); },
    performance: {now: () => 0},
    Image: class { set src(value) { this._src=value; queueMicrotask(()=>this.onload?.()); } },
    ResizeObserver: class { observe() {} },
    addEventListener: (...args) => windowTarget.addEventListener(...args)
  };
  context.window = context;
  element('canvasTextEditor').hidden = true;
  vm.createContext(context);
  for (const name of ['render.js', 'selection.js', 'workspace.js', 'editor.js']) {
    const filename = path.join(__dirname, '../assets/editor', name);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, {filename});
  }
  // load() is asynchronous even when the initial project contains no assets.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element('saveStatus').textContent, '工程已打开');

  function dispatch(target, type, properties = {}) {
    const event = {
      target, button: 0, pointerId: 1, clientX: 0, clientY: 0,
      deltaX: 0, deltaY: 0, defaultPrevented: false, propagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
      ...properties
    };
    target.dispatch(type, event);
    if (!event.propagationStopped && target !== windowTarget) windowTarget.dispatch(type, event);
    return event;
  }
  function view() {
    const match = /^translate\(([-+\d.e]+)px,([-+\d.e]+)px\) scale\(([-+\d.e]+)\)$/.exec(element('stage').style.transform);
    assert.ok(match, 'viewport transform is observable through the rendered stage');
    return {x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3])};
  }
  function screen(point) {
    const v = view(), box = element('workspace').getBoundingClientRect();
    return {clientX: box.left + v.x + point.x * v.zoom,
      clientY: box.top + v.y + point.y * v.zoom};
  }
  return {
    element, dispatch, view, screen, downloads,
    flushFrame() { for (const callback of frames.splice(0)) callback(0); },
    styleControl(key) {
      const visit = node => node.dataset.param === key ? node : node.children.map(visit).find(Boolean);
      return element('styleControls').children.map(visit).find(Boolean);
    },
    project: () => context.PosterEditor.getProject(),
    execute: command => context.PosterEditor.execute(command),
    key: (key, properties = {}, target = element('workspace')) => dispatch(target, 'keydown', {key, ...properties}),
    pointer: (type, point, properties = {}) => dispatch(element('workspace'), type, {...screen(point), ...properties})
  };
}

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} != ${expected}`);
}
test('live agent edits share project validation, revision and undo with manual edits', async () => {
  const h=await editorHarness(rectangleProject());
  const initial=await h.execute({action:'inspect'});
  const changed=await h.execute({action:'batch',expectedRevision:initial.revision,operations:[
    {action:'update',changes:[{id:'shape',props:{fill:'#ff6600',shadow:{enabled:true}}}]},
    {action:'create',objects:[{type:'text',name:'Agent 标题',text:'现场设计'}]}
  ]});
  assert.equal(h.project().objects.find(o=>o.id==='shape').fill,'#ff6600');
  assert.equal(h.project().objects.find(o=>o.id==='shape').shadow.enabled,true);
  assert.equal(h.project().objects.length,2);
  assert.ok(changed.revision>initial.revision);
  await assert.rejects(h.execute({action:'batch',expectedRevision:initial.revision,operations:[
    {action:'delete',ids:['shape']}
  ]}),/revision/);
  await assert.rejects(h.execute({action:'batch',expectedRevision:changed.revision,operations:[
    {action:'update',changes:[{id:'shape',props:{fill:'invalid'}}]}
  ]}),/填充|颜色/);
  assert.equal(h.project().objects.length,2,'invalid transaction is rolled back');
  assert.equal(h.project().objects.find(o=>o.id==='shape').fill,'#ff6600');
  await h.execute({action:'undo',expectedRevision:changed.revision});
  assert.equal(h.project().objects.length,1);
  assert.equal(h.project().objects[0].fill,'#282c38');
});
test('live agent can create a layer, move an object into it and reuse it as a sticker', async () => {
  const h=await editorHarness(rectangleProject());
  let state=await h.execute({action:'inspect'});
  state=await h.execute({action:'batch',expectedRevision:state.revision,operations:[
    {action:'layer_create',name:'内容组'}
  ]});
  const group=state.created[0];
  state=await h.execute({action:'batch',expectedRevision:state.revision,operations:[
    {action:'layer_move',id:'shape',parentId:group},
    {action:'sticker_save',ids:[group],name:'可复用内容'},
    {action:'sticker_insert',index:0,dx:30,dy:40}
  ]});
  assert.equal(h.project().objects.find(o=>o.id==='shape').parentId,group);
  assert.equal(h.project().style.stickers[0].name,'可复用内容');
  assert.equal(h.project().objects.filter(o=>o.type==='rect').length,2);
  assert.equal(state.created.length,1,'inserting a grouped sticker returns its root id');
});
test('live agent imports an embedded image before creating an editable image object', async () => {
  const h=await editorHarness();
  let state=await h.execute({action:'inspect'});
  const asset={id:'agent_image',name:'small.png',mime:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lE8AAAAASUVORK5CYII='};
  state=await h.execute({action:'import_asset',expectedRevision:state.revision,asset});
  assert.equal(h.project().assets.agent_image.name,'small.png');
  state=await h.execute({action:'batch',expectedRevision:state.revision,operations:[
    {action:'create',objects:[{type:'image',name:'可编辑图片',assetId:'agent_image'}]}
  ]});
  assert.equal(h.project().objects[0].type,'image');
  assert.equal(h.project().objects[0].assetId,'agent_image');
  assert.equal(state.created.length,1);
});
function rectangleProject() {
  const p = C.createProject();
  p.objects = [C.createObject('rect', {id: 'shape', m: C.translate(100, 100), w: 100, h: 100})];
  return p;
}

function textProject() {
  const p=C.createProject();
  p.objects=[C.createObject('text',{id:'copy',text:'原文 Original',m:C.translate(100,100)})];
  return p;
}
function doubleClickText(h,id='copy') {
  const target=new Target();
  target.closest=selector=>selector==='[data-object]'?{dataset:{object:id}}:null;
  h.dispatch(h.element('workspace'),'dblclick',{target});
}

function dragTextHandle(h,edge,start,end){
  const target=new Target();target.closest=selector=>selector==='[data-handle]'?{dataset:{handle:'resize-'+edge}}:null;
  h.pointer('pointerdown',start,{target});h.pointer('pointermove',end);h.pointer('pointerup',end);
}
test('all eight text handles resize the frame independently without scaling glyphs',async()=>{
  for(const [edge,x,y] of [['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]]){
    const p=textProject(),o=p.objects[0];o.w=300;o.h=150;o.fontSize=40;
    const h=await editorHarness(p);h.key('a',{ctrlKey:true});
    const start={x:100+300*x,y:100+150*y},end={x:start.x+(x===.5?0:x===0?-80:80),y:start.y+(y===.5?0:y===0?-25:25)};
    dragTextHandle(h,edge,start,end);
    const next=h.project().objects[0];
    near(next.w,x===.5?300:380,edge+' width');near(next.h,y===.5?150:175,edge+' height');
    assert.equal(next.fontSize,40);assert.deepEqual(next.m.slice(0,4),o.m.slice(0,4));
    const anchor={x:(1-x)*o.w,y:(1-y)*o.h},old=C.point(o.m,anchor),after=C.point(next.m,{x:(1-x)*next.w,y:(1-y)*next.h});
    near(after.x,old.x,'opposite anchor x');near(after.y,old.y,'opposite anchor y');
    h.key('z',{ctrlKey:true});assert.deepEqual(h.project().objects[0],o);
  }
});
test('rotated nested text resizes along local axes and width property reflows without scaling',async()=>{
  const p=textProject(),o=p.objects[0],group=C.createObject('group',{id:'parent',m:C.multiply(C.translate(20,30),C.around(0,0,1.3,1.3,35))});
  o.parentId=group.id;o.w=300;o.h=150;p.objects.push(group);
  const h=await editorHarness(p);doubleClickText(h);doubleClickText(h);h.dispatch(h.element('canvasTextEditor'),'blur');
  const m=C.worldMatrix(p,o);dragTextHandle(h,'e',C.point(m,{x:300,y:75}),C.point(m,{x:420,y:75}));
  let next=h.project().objects[0];near(next.w,420,'local width');near(next.h,150,'local height');
  C.worldMatrix(h.project(),next).forEach((v,i)=>near(v,m[i],'world matrix '+i));
  const input=new Target();input.dataset.prop='@w';input.type='number';input.value='180';
  h.dispatch(h.element('inspector'),'change',{target:input});
  next=h.project().objects[0];assert.equal(next.w,180);near(next.h,150,'independent height');assert.equal(next.fontSize,o.fontSize);
  C.worldMatrix(h.project(),next).forEach((v,i)=>near(v,m[i],'unchanged glyph matrix '+i));
});
test('canvas text editing commits each session as one undoable change and Escape cancels',async()=>{
  const h=await editorHarness(textProject()),el=h.element('canvasTextEditor');
  doubleClickText(h);
  assert.equal(el.hidden,false);
  el.value='你好\nHello';
  h.dispatch(el,'blur');
  assert.equal(h.project().objects[0].text,'你好\nHello');
  doubleClickText(h);
  el.value='不保留';
  h.dispatch(el,'keydown',{key:'Escape'});
  assert.equal(el.hidden,true);
  assert.equal(h.project().objects[0].text,'你好\nHello');
  doubleClickText(h);
  el.value='第二次';
  h.dispatch(el,'keydown',{key:'Enter',ctrlKey:true});
  assert.equal(h.project().objects[0].text,'第二次');
  h.key('z',{ctrlKey:true});
  assert.equal(h.project().objects[0].text,'你好\nHello');
  h.key('z',{ctrlKey:true});
  assert.equal(h.project().objects[0].text,'原文 Original');
  h.key('y',{ctrlKey:true});
  assert.equal(h.project().objects[0].text,'你好\nHello');
});
test('IME confirmation and Escape do not end editing during composition',async()=>{
  const h=await editorHarness(textProject()),el=h.element('canvasTextEditor');
  doubleClickText(h);el.value='中文输入';
  for(const key of ['Enter','Escape']){
    h.dispatch(el,'keydown',{key,isComposing:true,keyCode:229});
    assert.equal(el.hidden,false);
    assert.equal(h.project().objects[0].text,'原文 Original');
  }
  h.dispatch(el,'keydown',{key:'Enter',ctrlKey:true});
  assert.equal(h.project().objects[0].text,'中文输入');
});
test('saving while canvas text is being edited includes the latest multiline content',async()=>{
  const h=await editorHarness(textProject()),el=h.element('canvasTextEditor');
  doubleClickText(h);el.value='尚未失焦的新内容\nNew copy';
  h.key('s',{ctrlKey:true},el);
  assert.equal(el.hidden,true);
  assert.equal(h.downloads.length,1);
  const saved=JSON.parse(await h.downloads[0].text());
  assert.equal(saved.objects[0].text,'尚未失焦的新内容\nNew copy');
  assert.doesNotThrow(()=>C.validateProject(saved));
  const reopened=await editorHarness(saved);doubleClickText(reopened);
  assert.equal(reopened.element('canvasTextEditor').value,'尚未失焦的新内容\nNew copy');
});
test('nested text opens with its world transform while inherited locks prevent editing',async()=>{
  const p=textProject(),g=C.createObject('group',{id:'folder',m:C.multiply(C.translate(20,30),C.around(0,0,1.5,1.5,30))});
  p.objects[0].parentId=g.id;p.objects.push(g);
  const h=await editorHarness(p);doubleClickText(h);doubleClickText(h);
  assert.equal(h.element('canvasTextEditor').style.transform,'matrix('+C.worldMatrix(p,p.objects[0]).join(',')+')');
  const locked=C.clone(p);locked.objects.find(o=>o.id==='folder').locked=true;
  const blocked=await editorHarness(locked);doubleClickText(blocked);
  assert.equal(blocked.element('canvasTextEditor').hidden,true);
  assert.deepEqual(blocked.project().objects,locked.objects);
});

test('one mask button creates, releases, repeats and restores through undo', async () => {
  const p = rectangleProject();
  p.objects.push(C.createObject('rect', {id:'content', m:C.translate(80,80), w:180, h:180}));
  const h = await editorHarness(p), button = h.element('createMask');
  h.key('a', {ctrlKey:true});
  button.click();
  assert.equal(h.project().objects.filter(o=>o.maskId).length, 1);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  button.click();
  assert.equal(h.project().objects.length, 2);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  for (const original of p.objects) {
    const restored = h.project().objects.find(o=>o.id===original.id);
    assert.deepEqual(restored.m, original.m);
    assert.equal(restored.parentId, original.parentId);
  }
  button.click();
  assert.equal(h.project().objects.filter(o=>o.maskId).length, 1);
  h.key('z', {ctrlKey:true});
  assert.equal(h.project().objects.length, 2);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  h.key('y', {ctrlKey:true});
  assert.equal(h.project().objects.filter(o=>o.maskId).length, 1);
  // History restores artwork and clears selection; selecting the group restores its toggle state.
  h.key('a', {ctrlKey:true});
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});

test('selecting a clipping path in layers exposes its editable outline and nodes', async () => {
  const p = C.createProject();
  const shape = C.createObject('path', {id:'mask-shape', closed:true, nodes:[{x:0,y:0},{x:200,y:0},{x:80,y:160}]});
  const content = C.createObject('rect', {id:'masked-content'});
  p.objects = [shape, content];
  C.createClippingMask(p, [content.id]);
  const h = await editorHarness(p);
  const row = new Target('mask-row'); row.dataset.layer = shape.id;
  row.closest = selector => selector === '[data-layer]' ? row : null;
  h.dispatch(h.element('layers'), 'click', {target:row});
  h.key('n');
  assert.match(h.element('overlay').innerHTML, /data-node="0:anchor"/);
  assert.match(h.element('overlay').innerHTML, /stroke-dasharray="5 3"/);
  assert.doesNotMatch(h.element('message').textContent || '', /not a function/);
});

test('switching tools highlights only the chosen button, never the page body', async () => {
  const h = await editorHarness();
  for (const [key, tool] of [['r', 'rect'], ['p', 'pen'], ['h', 'hand'], ['v', 'select']]) {
    h.key(key);
    assert.equal(h.element('body').dataset.tool, tool);
    assert.equal(h.element('body').classList.contains('active'), false);
    assert.equal(h.element('body').getAttribute('aria-pressed'), null);
    for (const name of ['select', 'hand', 'pen', 'node', 'text', 'rect', 'ellipse', 'line', 'polygon', 'star']) {
      assert.equal(h.element(`${name}Tool`).classList.contains('active'), name === tool);
    }
  }
});

test('dragging the line tool commits a valid line with the requested endpoints', async () => {
  const h = await editorHarness();
  h.key('l');
  h.pointer('pointerdown', {x: 40, y: 60});
  h.pointer('pointermove', {x: 160, y: 150});
  h.pointer('pointerup', {x: 160, y: 150});
  const p = h.project();
  assert.equal(p.objects.length, 1);
  const line = p.objects[0];
  assert.equal(line.type, 'line');
  assert.doesNotThrow(() => C.validateProject(p));
  const start = C.point(line.m, {x: 0, y: 0}), end = C.point(line.m, {x: line.w, y: 0});
  near(start.x, 40, 'start x'); near(start.y, 60, 'start y');
  near(end.x, 160, 'end x'); near(end.y, 150, 'end y');
  h.key('z', {ctrlKey: true});
  assert.equal(h.project().objects.length, 0, 'one undo removes the complete drawing gesture');
});

test('clicking the line tool also commits a valid default-sized line', async () => {
  const h = await editorHarness();
  h.key('l');
  h.pointer('pointerdown', {x: 40, y: 60});
  h.pointer('pointerup', {x: 40, y: 60});
  const p = h.project();
  assert.equal(p.objects.length, 1);
  assert.equal(p.objects[0].type, 'line');
  assert.ok(p.objects[0].w > 0);
  assert.doesNotThrow(() => C.validateProject(p));
});

test('Shift marquee overlapping the existing selection nudges each object only once', async () => {
  const h = await editorHarness(rectangleProject());
  h.key('a', {ctrlKey: true});
  h.pointer('pointerdown', {x: 50, y: 50}, {shiftKey: true});
  h.pointer('pointermove', {x: 250, y: 250}, {shiftKey: true});
  h.pointer('pointerup', {x: 250, y: 250}, {shiftKey: true});
  h.key('ArrowRight');
  assert.equal(h.project().objects[0].m[4], 101);
  assert.equal(h.project().objects[0].m[5], 100);
  h.key('z', {ctrlKey: true});
  assert.equal(h.project().objects[0].m[4], 100);
});

test('left-to-right marquee requires enclosure, reverse marquee accepts partial overlap', async () => {
  const h = await editorHarness(rectangleProject());
  h.pointer('pointerdown', {x:150, y:50});
  h.pointer('pointermove', {x:250, y:250});
  h.pointer('pointerup', {x:250, y:250});
  h.key('ArrowRight');
  assert.equal(h.project().objects[0].m[4], 100);
  h.pointer('pointerdown', {x:250, y:250});
  h.pointer('pointermove', {x:150, y:50});
  h.pointer('pointerup', {x:150, y:50});
  h.key('ArrowRight');
  assert.equal(h.project().objects[0].m[4], 101);
});

test('keyboard sidebar resize changes width without moving selected artwork', async () => {
  const h = await editorHarness(rectangleProject());
  h.key('a', {ctrlKey: true});
  const before = h.project();
  for (const [side, delta] of [['left', 10], ['right', -10]]) {
    const separator = h.element(`${side}Resize`);
    const width = Number(separator.getAttribute('aria-valuenow'));
    const event = h.key('ArrowRight', {}, separator);
    assert.equal(Number(separator.getAttribute('aria-valuenow')), width + delta);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.propagationStopped, true);
    assert.deepEqual(h.project(), before);
  }
});

test('Ctrl+wheel zoom keeps the document point beneath the pointer fixed', async () => {
  const h = await editorHarness(rectangleProject());
  const before = h.project(), workspace = h.element('workspace');
  const anchor = {x: 210, y: 360}, pointer = h.screen(anchor), oldView = h.view();
  const event = h.dispatch(workspace, 'wheel', {...pointer, deltaY: -180, ctrlKey: true});
  const afterView = h.view(), box = workspace.getBoundingClientRect();
  assert.ok(afterView.zoom > oldView.zoom);
  near((pointer.clientX - box.left - afterView.x) / afterView.zoom, anchor.x, 'pointer anchor x');
  near((pointer.clientY - box.top - afterView.y) / afterView.zoom, anchor.y, 'pointer anchor y');
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(h.project(), before, 'viewport zoom does not scale project geometry');
});

test('plain wheel pans the viewport and Shift+wheel pans horizontally without scaling', async () => {
  const h = await editorHarness(rectangleProject());
  const before = h.project(), workspace = h.element('workspace'), initialView = h.view();
  h.dispatch(workspace, 'wheel', {deltaX: 25, deltaY: 70});
  let after = h.view();
  assert.equal(after.zoom, initialView.zoom);
  near(after.x, initialView.x - 25, 'horizontal pan');
  near(after.y, initialView.y - 70, 'vertical pan');
  h.dispatch(workspace, 'wheel', {deltaY: 40, shiftKey: true});
  after = h.view();
  assert.equal(after.zoom, initialView.zoom);
  near(after.x, initialView.x - 65, 'Shift horizontal pan');
  near(after.y, initialView.y - 70, 'Shift leaves vertical pan unchanged');
  assert.deepEqual(h.project(), before);
});


test('inspector remembers effect expansion and independent sizing across edits and reselection',async()=>{
 const h=await editorHarness(rectangleProject());h.key('a',{ctrlKey:true});
 const section=new Target();section.dataset.inspectorSection='shadow';section.dataset.inspectorOwner='shape';section.open=true;
 h.dispatch(h.element('inspector'),'toggle',{target:section});
 const ratio=h.element('keepRatio');ratio.checked=false;
 h.dispatch(h.element('inspector'),'change',{target:ratio});
 const enabled=new Target();enabled.dataset.prop='shadow.enabled';enabled.type='checkbox';enabled.checked=true;
 h.dispatch(h.element('inspector'),'change',{target:enabled});
 assert.match(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
 assert.doesNotMatch(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);
 for(const width of [160,220]){
  const input=new Target();input.dataset.prop='@w';input.type='number';input.value=String(width);
  h.dispatch(h.element('inspector'),'change',{target:input});
  const b=C.bounds(h.project(),h.project().objects[0]);near(b.w,width,'changed width');near(b.h,100,'unchanged height');
 }
 h.key('Escape');h.key('a',{ctrlKey:true});
 assert.match(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
 assert.doesNotMatch(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);
 section.open=false;h.dispatch(h.element('inspector'),'toggle',{target:section});h.key('ArrowRight');
 assert.doesNotMatch(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
});

test('group isolation restricts canvas selection, supports nested entry, and leaves artwork opacity unchanged',async()=>{
 const p=rectangleProject(),g=C.createObject('group',{id:'g',name:'Outer',m:C.identity()}),nested=C.createObject('group',{id:'nested',parentId:'g',name:'Inner',m:C.identity()});
 p.objects[0].parentId='nested';p.objects.push(g,nested,C.createObject('rect',{id:'outside',m:C.translate(350,100)}));
 const h=await editorHarness(p);doubleClickText(h,'shape');
 assert.equal(h.element('groupScopeName').textContent,'正在编辑：Outer');
 doubleClickText(h,'shape');assert.equal(h.element('groupScopeName').textContent,'正在编辑：Inner');
 h.key('a',{ctrlKey:true});h.key('ArrowRight');
 assert.equal(h.project().objects[0].m[4],101);assert.equal(h.project().objects.find(o=>o.id==='outside').m[4],350);
 assert.ok(h.project().objects.every(o=>o.opacity===1),'isolation is presentation only');
 h.key('Escape');assert.equal(h.element('groupScopeName').textContent,'正在编辑：Outer');
 h.element('exitGroup').click();assert.equal(h.element('groupScope').hidden,true);
});

test('docked layer height adjusts with pointer and keyboard without touching artwork',async()=>{
 const h=await editorHarness(rectangleProject()),grip=h.element('layersResize'),before=h.project();
 const initial=parseFloat(h.element('layersPanel').style.height);
 h.key('ArrowDown',{},grip);assert.equal(parseFloat(h.element('layersPanel').style.height),initial+20);
 h.dispatch(grip,'pointerdown',{clientY:500});h.dispatch(grip,'pointermove',{clientY:450});h.dispatch(grip,'pointerup');
 near(parseFloat(h.element('layersPanel').style.height),600,'height tracks drag');
 assert.deepEqual(h.project(),before);
});

test('restore view recenters the canvas without changing its contents',async()=>{
 const h=await editorHarness(rectangleProject()),initial=h.view(),before=h.project();
 h.dispatch(h.element('workspace'),'wheel',{deltaX:1200,deltaY:900});
 h.element('restoreView').click();assert.deepEqual(h.view(),initial);assert.deepEqual(h.project(),before);
});

test('arrow keys nudge in document units independently of zoom, allow undo, and respect text input',async()=>{
 const h=await editorHarness(rectangleProject());h.key('a',{ctrlKey:true});
 h.dispatch(h.element('workspace'),'wheel',{deltaY:-200,ctrlKey:true});
 h.key('ArrowRight');h.key('ArrowDown',{shiftKey:true});
 assert.deepEqual(h.project().objects[0].m.slice(4),[101,110]);
 h.key('z',{ctrlKey:true});assert.deepEqual(h.project().objects[0].m.slice(4),[101,100]);
 const input=new Target();input.closest=()=>input;h.key('ArrowLeft',{},input);
 assert.deepEqual(h.project().objects[0].m.slice(4),[101,100]);
});

test('new projects have transparent canvas backgrounds',()=>{assert.equal(C.createProject().canvas.background,'transparent');});

test('inspector switches fill and blend per object without changing another object',async()=>{
 const p=rectangleProject();p.objects.push(C.createObject('rect',{id:'second',m:C.translate(400,100)}));
 const h=await editorHarness(p);selectLayer(h,'shape');
 inspectorChange(h,'fillPaint.type','gradient','select');inspectorChange(h,'fillPaint.gradient.kind','conic','select');inspectorChange(h,'fillPaint.gradient.angle',75);inspectorChange(h,'blendMode','multiply','select');
 assert.equal(h.project().objects[0].fillPaint.gradient.angle,75);assert.equal(h.project().objects[0].blendMode,'multiply');
 selectLayer(h,'second');assert.equal(h.project().objects[1].fillPaint.type,'solid');assert.equal(h.project().objects[1].blendMode,'normal');
 assert.match(h.element('inspector').innerHTML,/填充类型/);assert.match(h.element('inspector').innerHTML,/图层混合模式/);
 selectLayer(h,'shape');assert.match(h.element('inspector').innerHTML,/衍射形／角度/);
});

test('gradient band adds a third stop to only the selected object',async()=>{
 const p=rectangleProject();p.objects.push(C.createObject('rect',{id:'second',m:C.translate(400,100)}));
 const h=await editorHarness(p);selectLayer(h,'shape');inspectorChange(h,'fillPaint.type','gradient','select');
 const bar=new Target();bar.closest=selector=>selector==='[data-gradient-bar]'?bar:null;
 h.dispatch(h.element('inspector'),'click',{target:bar,clientX:700});
 const stops=h.project().objects[0].fillPaint.gradient.stops;
 assert.equal(stops.length,3);near(stops[2].position,.5,'new stop at click location');
 assert.equal(h.project().objects[1].fillPaint.gradient.stops.length,2);
});

test('selected image exposes editable stroke beside its effects',async()=>{
 const p=C.createProject();p.assets.photo={id:'photo',mime:'image/png',data:'data:image/png;base64,aGVsbG8=',name:'photo.png'};
 p.objects=[C.createObject('image',{id:'image',assetId:'photo'})];
 const h=await editorHarness(p);selectLayer(h,'image');
 assert.match(h.element('inspector').innerHTML,/<summary>描边<\/summary>/);
 assert.match(h.element('inspector').innerHTML,/data-prop="strokeWidth"/);
 inspectorChange(h,'strokeWidth',6);
 assert.equal(h.project().objects[0].strokeWidth,6);
 assert.match(h.element('inspector').innerHTML,/<summary>投影<\/summary>/);
});

test('canvas context menu flips and starts editable perspective on the selected object',async()=>{
 const h=await editorHarness(rectangleProject()),hit=new Target();
 hit.closest=selector=>selector==='[data-object]'?{dataset:{object:'shape'}}:null;
 h.dispatch(h.element('workspace'),'contextmenu',{target:hit,...h.screen({x:120,y:120})});
 assert.equal(h.element('canvasContextMenu').hidden,false);
 const action=name=>{const button=new Target();button.dataset.contextAction=name;button.closest=selector=>selector==='[data-context-action]'?button:null;h.dispatch(h.element('canvasContextMenu'),'click',{target:button});};
 action('flipX');assert.ok(h.project().objects[0].m[0]<0);
 h.dispatch(h.element('workspace'),'contextmenu',{target:hit,...h.screen({x:120,y:120})});
 action('perspective');assert.equal(h.project().objects[0].warp,null);
 assert.match(h.element('overlay').innerHTML,/data-handle="perspective-0"/);
 const handle=new Target();handle.dataset.handle='perspective-0';
 handle.closest=selector=>selector==='[data-handle]'?handle:null;
 h.pointer('pointerdown',{x:200,y:100},{target:handle});
 h.pointer('pointermove',{x:180,y:110});
 h.pointer('pointerup',{x:180,y:110});
 assert.ok(h.project().objects[0].warp);
 h.key('Escape');assert.doesNotMatch(h.element('overlay').innerHTML,/data-handle="perspective-0"/);
});

test('skew mode drags an edge without flattening the selected shape',async()=>{
 const h=await editorHarness(rectangleProject()),hit=new Target();
 hit.closest=selector=>selector==='[data-object]'?{dataset:{object:'shape'}}:null;
 h.dispatch(h.element('workspace'),'contextmenu',{target:hit,...h.screen({x:150,y:150})});
 const button=new Target();button.dataset.contextAction='skew';button.closest=selector=>selector==='[data-context-action]'?button:null;
 h.dispatch(h.element('canvasContextMenu'),'click',{target:button});
 assert.match(h.element('overlay').innerHTML,/data-handle="skew-top"/);
 const handle=new Target();handle.dataset.handle='skew-top';handle.closest=selector=>selector==='[data-handle]'?handle:null;
 h.pointer('pointerdown',{x:150,y:100},{target:handle});
 h.pointer('pointermove',{x:175,y:100});
 h.pointer('pointerup',{x:175,y:100});
 assert.notEqual(h.project().objects[0].m[2],0);
 assert.equal(h.project().objects[0].type,'rect');
});

test('inspector offers skew and perspective beneath flip controls',async()=>{
 const h=await editorHarness(rectangleProject());selectLayer(h,'shape');
 const html=h.element('inspector').innerHTML;
 assert.match(html,/data-action="flipY"[\s\S]*data-action="skew"[\s\S]*data-action="perspective"/);
 const button=new Target();button.dataset.action='perspective';
 h.dispatch(h.element('inspector'),'click',{target:button});
 assert.match(h.element('overlay').innerHTML,/data-handle="perspective-0"/);
 assert.match(h.element('inspector').innerHTML,/data-action="perspective" aria-pressed="true"/);
});

test('right-click groups selected objects and ungroups the result',async()=>{
 const p=rectangleProject();p.objects.push(C.createObject('rect',{id:'second',m:C.translate(300,100)}));
 const h=await editorHarness(p);h.key('a',{ctrlKey:true});
 const hit=new Target();hit.closest=selector=>selector==='[data-object]'?{dataset:{object:'shape'}}:null;
 const action=name=>{const button=new Target();button.dataset.contextAction=name;button.closest=selector=>selector==='[data-context-action]'?button:null;h.dispatch(h.element('canvasContextMenu'),'click',{target:button});};
 h.dispatch(h.element('workspace'),'contextmenu',{target:hit,...h.screen({x:120,y:120})});
 action('group');
 const group=h.project().objects.find(o=>o.type==='group');assert.ok(group);
 assert.equal(h.project().objects.filter(o=>o.parentId===group.id).length,2);
 const groupHit=new Target();groupHit.closest=selector=>selector==='[data-object]'?{dataset:{object:group.id}}:null;
 h.dispatch(h.element('workspace'),'contextmenu',{target:groupHit,...h.screen({x:120,y:120})});
 action('ungroup');
 assert.equal(h.project().objects.filter(o=>o.type==='group').length,0);
 assert.equal(h.project().objects.length,2);
});

test('copy, offset paste and in-place paste shortcuts keep normal text shortcuts',async()=>{
 const h=await editorHarness(rectangleProject());selectLayer(h,'shape');
 h.key('c',{ctrlKey:true});h.key('v',{ctrlKey:true});let p=h.project();assert.equal(p.objects.length,2);assert.deepEqual(p.objects[1].m.slice(4),[120,120]);
 h.key('v',{ctrlKey:true,shiftKey:true});p=h.project();assert.equal(p.objects.length,3);assert.deepEqual(p.objects[2].m.slice(4),[100,100]);
 const input=new Target();input.closest=()=>input;h.key('v',{ctrlKey:true},input);assert.equal(h.project().objects.length,3);
});


function selectLayer(h,id){const row=new Target();row.dataset.layer=id;row.closest=q=>q==='[data-layer]'?row:null;h.dispatch(h.element('layers'),'click',{target:row});}
function inspectorChange(h,key,value,type='number'){const el=new Target();el.dataset.prop=key;el.type=type;el.value=String(value);el.checked=Boolean(value);h.dispatch(h.element('inspector'),'change',{target:el});}
function ratioChange(h,value){const el=h.element('keepRatio');el.checked=value;h.dispatch(h.element('inspector'),'change',{target:el});}
function sectionChange(h,id,key,value){const el=new Target();el.dataset.inspectorSection=key;el.dataset.inspectorOwner=id;el.open=value;h.dispatch(h.element('inspector'),'toggle',{target:el});}
test('each object remembers its own ratio, sections, effects and appearance through switching and project handoff',async()=>{
 const p=rectangleProject();p.objects.push(C.createObject('rect',{id:'second',m:C.translate(400,100),w:100,h:100}));
 const h=await editorHarness(p);selectLayer(h,'shape');ratioChange(h,false);sectionChange(h,'shape','shadow',true);
 inspectorChange(h,'shadow.enabled',true,'checkbox');inspectorChange(h,'shadow.blur',24);inspectorChange(h,'opacity',.6);inspectorChange(h,'fill','#ff0000','color');
 selectLayer(h,'second');assert.match(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.doesNotMatch(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
 inspectorChange(h,'@w',200);let q=h.project(),a=q.objects[0],b=q.objects[1];near(C.bounds(q,b).h,200,'second scales proportionally');assert.equal(b.shadow.enabled,false);assert.equal(b.opacity,1);assert.equal(b.fill,'#282c38');
 selectLayer(h,'shape');assert.doesNotMatch(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.match(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
 inspectorChange(h,'@w',180);q=h.project();near(C.bounds(q,q.objects[0]).h,100,'first keeps height');
 h.key('s',{ctrlKey:true});await new Promise(r=>setImmediate(r));const saved=JSON.parse(await h.downloads.at(-1).text()),reopened=await editorHarness(saved);
 selectLayer(reopened,'shape');assert.doesNotMatch(reopened.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.match(reopened.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);assert.equal(reopened.project().objects[0].shadow.blur,24);
 selectLayer(reopened,'second');assert.match(reopened.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.doesNotMatch(reopened.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
});
test('multi-selection, duplicate and undo do not link independent inspector states',async()=>{
 const p=rectangleProject();p.objects.push(C.createObject('rect',{id:'second'}));const h=await editorHarness(p);
 selectLayer(h,'shape');ratioChange(h,false);h.key('ArrowRight');sectionChange(h,'shape','glow',true);h.key('z',{ctrlKey:true});selectLayer(h,'shape');assert.match(h.element('inspector').innerHTML,/<details data-inspector-section="glow"[^>]* open>/);
 h.key('a',{ctrlKey:true});ratioChange(h,false);sectionChange(h,'second|shape','shadow',true);
 selectLayer(h,'second');assert.match(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.doesNotMatch(h.element('inspector').innerHTML,/<details data-inspector-section="shadow"[^>]* open>/);
 selectLayer(h,'shape');h.key('d',{ctrlKey:true});const copy=h.project().objects.find(o=>!['shape','second'].includes(o.id));ratioChange(h,true);sectionChange(h,copy.id,'glow',false);
 selectLayer(h,'shape');assert.doesNotMatch(h.element('inspector').innerHTML,/<input id="keepRatio"[^>]*checked/);assert.match(h.element('inspector').innerHTML,/<details data-inspector-section="glow"[^>]* open>/);
});
test('object inspector state validation rejects malformed imported preferences',()=>{
 const p=rectangleProject();p.objects[0].editorState={keepRatio:false,sections:{fill:true,shadow:true}};assert.doesNotThrow(()=>C.validateProject(p));
 p.objects[0].editorState.keepRatio='false';assert.throws(()=>C.validateProject(p),/属性面板状态/);
});


test('locked and decorative full-canvas images let pointer select artwork underneath', async()=>{
 for(const disabled of [false,true]){
  const p=rectangleProject();p.assets.grain={id:'grain',mime:'image/png',data:'data:image/png;base64,aGVsbG8=',name:'grain.png'};
  const grain=C.createObject('image',{id:'grainLayer',assetId:'grain',m:C.identity(),w:p.canvas.width,h:p.canvas.height,locked:!disabled,hitTest:!disabled});
  p.objects.push(grain);
  const h=await editorHarness(p),target=new Target();
  target.closest=selector=>selector==='[data-object]'?{dataset:{object:'grainLayer'}}:null;
  h.pointer('pointerdown',{x:150,y:150},{target});
  h.pointer('pointermove',{x:175,y:165});
  h.pointer('pointerup',{x:175,y:165});
  const next=h.project();
  near(next.objects[0].m[4],125,'underlying shape x');
  near(next.objects[0].m[5],115,'underlying shape y');
  assert.deepEqual(next.objects[1].m,C.identity());
  assert.match(h.element('art').innerHTML,/data-object="grainLayer" data-hit-test="false"/);
 }
});

test('sticker panel renders compact SVG thumbnails and card click inserts editable objects',async()=>{
 const p=C.createProject(),o=C.createObject('rect',{id:'stickerShape',m:C.translate(20,30),w:60,h:40,fill:'#e33125'});
 p.style.stickers=[{name:'红色卡片',objects:[o]}];
 const h=await editorHarness(p),html=h.element('stickers').innerHTML;
 assert.match(html,/class="sticker-card"/);
 assert.match(html,/class="sticker-preview"/);
 const uri=html.match(/src="(data:image\/svg\+xml;charset=utf-8,[^"]+)"/)?.[1];
 assert.ok(uri,'thumbnail embeds a portable SVG');
 assert.match(decodeURIComponent(uri),/fill="#e33125"/);
 const card=new Target();card.dataset.stickerIndex='0';card.closest=selector=>selector==='[data-sticker-index]'?card:null;
 h.dispatch(h.element('stickers'),'click',{target:card});
 assert.equal(h.project().objects.length,1);
 assert.notEqual(h.project().objects[0].id,'stickerShape');
});

test('live style slider previews each value and a complete drag undoes in one step',async()=>{
 const module={id:'live-pattern',version:1,label:'实时纹样',updateMode:'live',controls:[
  {key:'size',label:'尺寸',type:'range',min:10,max:100,step:1,default:10}
 ],generate({params}){return[C.createObject('rect',{id:'generated',generatorKey:'root',m:C.identity(),w:params.size,h:20})];}};
 const h=await editorHarness(C.createProject(),[module]),slider=h.styleControl('size');
 assert.ok(slider,'style control is exposed in the sidebar');
 slider.value='25';h.dispatch(slider,'input');h.flushFrame();
 assert.equal(h.project().objects[0].w,25,'first drag position appears before release');
 slider.value='40';h.dispatch(slider,'input');h.flushFrame();
 assert.equal(h.project().objects[0].w,40,'later drag position appears before release');
 h.dispatch(slider,'change');
 h.element('undo').click();
 assert.equal(h.project().objects.length,0,'one undo restores the state before the drag');
 h.element('redo').click();
 assert.equal(h.project().objects[0].w,40,'redo restores the final parameter');
 h.key('s',{ctrlKey:true});await new Promise(r=>setImmediate(r));
 const saved=JSON.parse(await h.downloads.at(-1).text());
 assert.equal(saved.style.params['live-pattern'].size,40,'current parameter is saved with the project');
 const reopened=await editorHarness(saved,[module]);
 assert.equal(reopened.styleControl('size').value,40,'the slider reopens at its saved value');
});

test('manual style modules still wait for Generate and Update',async()=>{
 const module={id:'manual-pattern',version:1,label:'手动生成',controls:[
  {key:'size',label:'尺寸',type:'number',min:10,max:100,default:10}
 ],generate({params}){return[C.createObject('rect',{id:'generated',generatorKey:'root',m:C.identity(),w:params.size,h:20})];}};
 const h=await editorHarness(C.createProject(),[module]),input=h.styleControl('size');
 input.value='35';h.dispatch(input,'change');
 assert.equal(h.project().objects.length,0,'editing a manual control does not regenerate');
 const button=h.element('styleControls').children[0].children.find(child=>child.tagName==='BUTTON');
 assert.ok(button);button.click();
 assert.equal(h.project().objects[0].w,35);
});
