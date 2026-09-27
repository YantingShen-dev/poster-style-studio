const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/editor/core.js');
const S=require('../assets/editor/selection.js');
function scene(type,extra={}){const p=C.createProject(),o=C.createObject(type,{m:C.identity(),w:100,h:100,strokeWidth:0,...extra});p.objects.push(o);return{p,o};}
const box=(x,y,w,h)=>({x,y,w,h});
test('window requires full enclosure; crossing accepts partial overlap and touching',()=>{
 const{p,o}=scene('rect');assert.equal(S.matches(p,o,box(-1,-1,102,102),false),true);
 assert.equal(S.matches(p,o,box(50,50,100,100),false),false);assert.equal(S.matches(p,o,box(50,50,100,100),true),true);
 assert.equal(S.matches(p,o,box(100,40,20,20),true),true);assert.equal(S.matches(p,o,box(101,40,20,20),true),false);
});
test('unfilled shapes retain their interior for crossing',()=>{
 for(const type of ['rect','ellipse','polygon','star']){const{p,o}=scene(type,{fill:'none'});assert.equal(S.matches(p,o,box(48,48,4,4),true),true,type);}
});
test('ellipse and triangle empty bounding-box corners do not select',()=>{
 for(const type of ['ellipse','polygon']){const{p,o}=scene(type,{sides:3});assert.equal(S.matches(p,o,box(0,0,5,5),true),false,type);}
});
test('concave star notch is excluded',()=>{
 const{p,o}=scene('star',{sides:5});assert.equal(S.matches(p,o,box(94,3,3,3),true),false);
});
test('rotated objects use world geometry, including parent transforms',()=>{
 const{p,o}=scene('rect',{w:20,h:20,m:C.around(0,0,1,1,45)}),g=C.createObject('group',{m:C.translate(100,100)});p.objects.push(g);o.parentId=g.id;
 assert.equal(S.matches(p,o,box(84,99,32,31),false),true);assert.equal(S.matches(p,o,box(86,100,2,2),true),false);
 assert.equal(S.matches(p,o,box(98,108,4,4),true),true);
});
test('lines intersect without pretending their bounding box is filled',()=>{
 const{p,o}=scene('line',{m:C.around(0,0,1,1,45)});
 assert.equal(S.matches(p,o,box(30,30,10,10),true),true);assert.equal(S.matches(p,o,box(1,50,10,10),true),false);
 assert.equal(S.matches(p,o,box(-1,-1,74,74),false),true);
});
test('open paths with three nodes have an implicitly closed selectable interior',()=>{
 const{p,o}=scene('path',{fill:'none',closed:false,nodes:[{x:0,y:0},{x:100,y:0},{x:50,y:100}]});
 assert.equal(S.matches(p,o,box(45,20,10,10),true),true);assert.equal(S.matches(p,o,box(0,90,5,5),true),false);
});
test('Bezier bulge is considered even where the node polygon would miss it',()=>{
 const{p,o}=scene('path',{closed:false,nodes:[{x:0,y:0,outX:0,outY:100},{x:100,y:0,inX:100,inY:100}]});
 assert.equal(S.matches(p,o,box(45,70,10,10),true),true);assert.equal(S.matches(p,o,box(0,65,5,5),true),false);
 assert.equal(S.matches(p,o,box(-1,-1,102,50),false),false);assert.equal(S.matches(p,o,box(-1,-1,102,77),false),true);
});
test('hidden, locked and inherited states are excluded; empty groups never match',()=>{
 const{p,o}=scene('rect'),g=C.createObject('group',{m:C.identity()});p.objects.push(g);
 assert.equal(S.matches(p,g,box(-10,-10,200,200),true),false);o.parentId=g.id;
 for(const key of ['visible','locked']){g[key]=key==='locked';assert.equal(S.matches(p,o,box(-10,-10,200,200),true),false);g[key]=key==='visible';}
 o.locked=true;assert.equal(S.matches(p,g,box(-10,-10,200,200),true),false);
});
test('group window covers every eligible child, crossing touches any eligible child',()=>{
 const{p,o}=scene('rect'),g=C.createObject('group',{m:C.identity()}),b=C.createObject('rect',{m:C.translate(300,0),w:100,h:100});p.objects.push(g,b);o.parentId=b.parentId=g.id;
 assert.equal(S.matches(p,g,box(-1,-1,102,102),false),false);assert.equal(S.matches(p,g,box(-1,-1,102,102),true),true);
 b.visible=false;assert.equal(S.matches(p,g,box(-1,-1,102,102),false),true);
});
test('clipped image selection uses mask intersection, not hidden image extents',()=>{
 const{p,o}=scene('rect'),mask=C.createObject('ellipse',{m:C.translate(30,30),w:40,h:40}),g=C.createObject('group',{m:C.identity(),maskId:mask.id});p.objects.push(mask,g);mask.parentId=o.parentId=g.id;
 assert.equal(S.matches(p,g,box(29,29,42,42),false),true);assert.equal(S.matches(p,g,box(1,1,5,5),true),false);
 assert.equal(S.matches(p,g,box(31,31,2,2),true),false);assert.equal(S.matches(p,g,box(48,48,4,4),true),true);
 assert.equal(S.matches(p,o,box(29,29,42,42),false),true);
});
test('disjoint image and mask have no selectable visible result',()=>{
 const{p,o}=scene('rect'),mask=C.createObject('rect',{m:C.translate(300,300),w:40,h:40}),g=C.createObject('group',{m:C.identity(),maskId:mask.id});p.objects.push(mask,g);mask.parentId=o.parentId=g.id;
 assert.equal(S.matches(p,g,box(-1,-1,1000,1000),false),false);assert.equal(S.matches(p,g,box(-1,-1,1000,1000),true),false);
});
test('nested clipping respects both masks and edge-created intersection vertices',()=>{
 const{p,o}=scene('rect',{m:C.translate(-50,40),w:200,h:20});
 const innerMask=C.createObject('rect',{m:C.translate(40,-50),w:20,h:200}),inner=C.createObject('group',{m:C.identity(),maskId:innerMask.id});
 const outerMask=C.createObject('rect',{m:C.translate(45,45),w:10,h:10}),outer=C.createObject('group',{m:C.identity(),maskId:outerMask.id});
 p.objects.push(innerMask,inner,outerMask,outer);o.parentId=innerMask.parentId=inner.id;inner.parentId=outerMask.parentId=outer.id;
 assert.equal(S.matches(p,outer,box(44,44,12,12),false),true);assert.equal(S.matches(p,outer,box(39,39,5,5),true),false);
 assert.equal(S.matches(p,outer,box(49,49,2,2),true),true);
});
