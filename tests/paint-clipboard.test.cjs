'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../assets/editor/core.js');
const context={PosterCore:C};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/editor/render.js'),'utf8'),context);
const R=context.PosterRender;
const image={id:'texture',mime:'image/png',data:'data:image/png;base64,aGVsbG8=',name:'tile.png'};

test('paint and blend properties stay independent per object and round trip with SVG export',()=>{
 const p=C.createProject(),a=C.createObject('rect',{id:'a'}),b=C.createObject('ellipse',{id:'b'});p.objects.push(a,b);p.assets.texture=image;
 a.fillPaint.type='gradient';a.fillPaint.gradient={kind:'radial',angle:45,reverse:true,from:'#ff0000',to:'#0000ff'};a.blendMode='multiply';
 b.fillPaint.type='pattern';b.fillPaint.pattern={assetId:'texture',scale:.75,rotation:30,size:64};b.blendMode='screen';
 const q=C.validateProject(JSON.parse(JSON.stringify(p))),svg=R.svg(q);
 assert.equal(q.objects[0].fillPaint.gradient.kind,'radial');assert.equal(q.objects[1].fillPaint.pattern.scale,.75);
 assert.match(svg,/<radialGradient/);assert.match(svg,/<pattern/);assert.match(svg,/patternTransform="rotate\(30\)"/);
 assert.match(svg,/mix-blend-mode:multiply/);assert.match(svg,/mix-blend-mode:screen/);
 assert.equal(q.objects[1].fillPaint.type,'pattern');
 q.objects[0].fillPaint.gradient.from='#00ff00';assert.equal(q.objects[1].fillPaint.pattern.assetId,'texture');
});

test('linear and angular gradients render as editable object paints',()=>{
 const p=C.createProject(),o=C.createObject('rect',{id:'shape'});p.objects.push(o);o.fillPaint.type='gradient';
 for(const kind of ['linear','conic']){o.fillPaint.gradient.kind=kind;const svg=R.svg(C.validateProject(p));assert.match(svg,kind==='linear'?/<linearGradient/:/<pattern/);assert.match(svg,/fill="url\(#paint-shape\)"/);}
});

test('multi-stop gradient retains every editable stop and interpolates its color',()=>{
 const p=C.createProject(),o=C.createObject('rect',{id:'shape'});p.objects.push(o);o.fillPaint.type='gradient';
 o.fillPaint.gradient.stops=[{id:'a',position:0,color:'#ff0000'},{id:'b',position:.4,color:'#00ff00'},{id:'c',position:1,color:'#0000ff'}];
 const q=C.validateProject(JSON.parse(JSON.stringify(p))),svg=R.svg(q);
 assert.equal(q.objects[0].fillPaint.gradient.stops.length,3);
 assert.match(svg,/<stop offset="40%" stop-color="#00ff00"\/>/);
 assert.equal(R.colorAt(C.gradientStops(q.objects[0].fillPaint.gradient),.4),'#00ff00');
 o.fillPaint.gradient.kind='conic';assert.match(R.svg(C.validateProject(p)),/fill="#00fd02"/);
});

test('image alpha stroke and perspective remain objects in project and SVG',()=>{
 const p=C.createProject();p.assets.texture=image;
 const o=C.createObject('image',{id:'photo',assetId:'texture',stroke:'#ff0000',strokeWidth:7});
 p.objects.push(o);o.warp=C.makePerspective(p,o);o.warp.points[1].x+=50;
 const q=C.validateProject(JSON.parse(JSON.stringify(p))),svg=R.svg(q);
 assert.equal(q.objects[0].warp.points[1].x,o.w+50);
 assert.match(svg,/feMorphology in="SourceAlpha"/);
 assert.match(svg,/flood-color="#ff0000"/);
 assert.match(svg,/warp-clip-photo-/);
 assert.match(svg,/<use href="#warp-source-photo"/);
 assert.equal(C.perspectivePoint(o.warp,{x:o.w,y:0}).x,o.w+50);
});

test('perspective mesh overlaps internal triangle clips but clips its outside edge',()=>{
 const p=C.createProject(),o=C.createObject('rect',{id:'tile',m:C.identity(),w:160,h:160});
 p.objects.push(o);o.warp=C.makePerspective(p,o);o.warp.points[1].x+=32;
 const svg=R.svg(C.validateProject(p));
 assert.match(svg,/<clipPath id="warp-outer-tile"[^>]*><polygon points="0,0 192,0 160,160 0,160"/);
 const first=svg.match(/<clipPath id="warp-clip-tile-0"[^>]*><polygon points="([^"]+)"/);
 assert.ok(first);
 assert.ok(first[1].split(' ').some(pair=>pair.split(',').some(value=>Number(value)<0)), 'internal triangle extends beyond the source edge before the final outer clip');
});

test('copy, offset paste and in-place paste preserve masks, assets and independent appearance',()=>{
 const p=C.createProject();p.assets.texture=image;const mask=C.createObject('rect',{id:'mask',parentId:'group'}),content=C.createObject('rect',{id:'content',parentId:'group'}),group=C.createObject('group',{id:'group',maskId:'mask'});
 content.fillPaint.type='pattern';content.fillPaint.pattern.assetId='texture';p.objects=[group,mask,content];
 const clip=C.copyObjects(p,['group']);const shifted=C.pasteObjects(p,clip,20),fixed=C.pasteObjects(p,clip,0);
 assert.equal(shifted.length,1);assert.equal(fixed.length,1);
 assert.equal(C.bounds(p,p.objects.find(o=>o.id===shifted[0])).x,C.bounds(p,group).x+20);
 assert.equal(C.bounds(p,p.objects.find(o=>o.id===fixed[0])).x,C.bounds(p,group).x);
 const clone=p.objects.find(o=>o.id===fixed[0]);assert.notEqual(clone.maskId,mask.id);assert.equal(p.objects.find(o=>o.id===clone.maskId).parentId,clone.id);
 const copiedContent=p.objects.find(o=>o.parentId===clone.id&&o.id!==clone.maskId);assert.equal(copiedContent.fillPaint.pattern.assetId,'texture');copiedContent.fillPaint.pattern.rotation=90;assert.equal(content.fillPaint.pattern.rotation,0);
 assert.doesNotThrow(()=>C.validateProject(p));
});

test('paint validation rejects missing pattern images and unsupported blend modes',()=>{
 const p=C.createProject(),o=C.createObject('rect');p.objects.push(o);o.fillPaint.type='pattern';assert.throws(()=>C.validateProject(p));
 o.fillPaint.type='solid';o.blendMode='not-a-mode';assert.throws(()=>C.validateProject(p));
});

test('pasting into another project does not attach to an unrelated group with the same id',()=>{
 const source=C.createProject();source.objects=[C.createObject('group',{id:'folder'}),C.createObject('rect',{id:'piece',parentId:'folder'})];
 const clip=C.copyObjects(source,['piece']),target=C.createProject();target.objects=[C.createObject('group',{id:'folder'})];
 const [id]=C.pasteObjects(target,clip,0);assert.equal(target.objects.find(o=>o.id===id).parentId,null);
 assert.doesNotThrow(()=>C.validateProject(target));
});
