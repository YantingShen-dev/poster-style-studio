(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.PosterSelection=factory(root.PosterCore);})(typeof window!=='undefined'?window:this,function(C){
'use strict';
// All sampling tolerances are in document coordinates, after the world transform.
// Marquee geometry follows the editable outline, not shadows, glow or stroke overhang.
const TOLERANCE=.05, EPS=1e-7;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p,a,b){const d=sub(b,a),n=d.x*d.x+d.y*d.y,t=n?Math.max(0,Math.min(1,((p.x-a.x)*d.x+(p.y-a.y)*d.y)/n)):0;return dist(p,lerp(a,b,t));}
function flatten(a,b,c,d,out,depth=0){
  if(depth>=20||Math.max(segmentDistance(b,a,d),segmentDistance(c,a,d))<=TOLERANCE){out.push(d);return;}
  const ab=lerp(a,b,.5),bc=lerp(b,c,.5),cd=lerp(c,d,.5),abc=lerp(ab,bc,.5),bcd=lerp(bc,cd,.5),mid=lerp(abc,bcd,.5);
  flatten(a,ab,abc,mid,out,depth+1);flatten(mid,bcd,cd,d,out,depth+1);
}
function geometry(p,o){
  const m=C.worldMatrix(p,o),world=v=>C.worldPoint(p,o,v);let pts=[],closed=true;
  switch(o.type){
    case'line':pts=[world({x:0,y:0}),world({x:o.w,y:0})];closed=false;break;
    case'path':{
      const ns=o.nodes;if(!ns.length)return{points:[],closed:false};pts=[world(ns[0])];
      for(let i=1;i<ns.length+(o.closed?1:0);i++){const a=ns[i-1],b=ns[i%ns.length];flatten(world(a),world({x:a.outX??a.x,y:a.outY??a.y}),world({x:b.inX??b.x,y:b.inY??b.y}),world(b),pts);}
      closed=o.closed||ns.length>=3;break;
    }
    case'ellipse':{
      // The transformed axes' sum bounds radius under arbitrary affine transforms.
      const radius=(Math.hypot(m[0],m[1])*o.w+Math.hypot(m[2],m[3])*o.h)/2;
      const count=Math.max(o.warp?64:24,Math.ceil(Math.PI/Math.acos(Math.max(-1,1-TOLERANCE/Math.max(radius,TOLERANCE)))));
      for(let i=0;i<count;i++){const a=i*2*Math.PI/count;pts.push(world({x:o.w/2+Math.cos(a)*o.w/2,y:o.h/2+Math.sin(a)*o.h/2}));}break;
    }
    case'polygon':case'star':{
      const count=o.type==='star'?o.sides*2:o.sides;
      for(let i=0;i<count;i++){const a=-Math.PI/2+i*2*Math.PI/count,r=o.type==='star'&&i%2?.45:1;pts.push(world({x:o.w/2+Math.cos(a)*o.w/2*r,y:o.h/2+Math.sin(a)*o.h/2*r}));}break;
    }
    default:pts=[{x:0,y:0},{x:o.w,y:0},{x:o.w,y:o.h},{x:0,y:o.h}].map(world);
  }
  return{points:pts,closed};
}
function edges(g){const result=[];for(let i=1;i<g.points.length;i++)result.push([g.points[i-1],g.points[i]]);if(g.closed&&g.points.length>1)result.push([g.points.at(-1),g.points[0]]);return result;}
function contains(g,p){
  let winding=0;
  for(const[a,b]of edges(g)){
    if(segmentDistance(p,a,b)<=EPS)return true;
    if(a.y<=p.y){if(b.y>p.y&&cross(sub(b,a),sub(p,a))>0)winding++;}
    else if(b.y<=p.y&&cross(sub(b,a),sub(p,a))<0)winding--;
  }
  return g.closed&&winding!==0;
}
function intersections(a,b,c,d){
  if(Math.max(a.x,b.x)+EPS<Math.min(c.x,d.x)||Math.max(c.x,d.x)+EPS<Math.min(a.x,b.x)||Math.max(a.y,b.y)+EPS<Math.min(c.y,d.y)||Math.max(c.y,d.y)+EPS<Math.min(a.y,b.y))return[];
  const r=sub(b,a),s=sub(d,c),q=sub(c,a),den=cross(r,s);
  if(Math.abs(den)<=EPS){if(Math.abs(cross(q,r))>EPS)return[];return[a,b,c,d].filter(v=>segmentDistance(v,a,b)<=EPS&&segmentDistance(v,c,d)<=EPS);}
  const t=cross(q,s)/den,u=cross(q,r)/den;
  return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?[lerp(a,b,Math.max(0,Math.min(1,t)))]:[];
}
function extent(g){let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;for(const p of g.points){x=Math.min(x,p.x);y=Math.min(y,p.y);r=Math.max(r,p.x);b=Math.max(b,p.y);}return{x,y,r,b};}
function disjoint(a,b){return a.r+EPS<b.x||b.r+EPS<a.x||a.b+EPS<b.y||b.b+EPS<a.y;}
// Vertices of an intersection lie at input vertices or intersections of edges.
// Works for concave masks as well as nested masks, without flattening to a bbox.
function intersectionVertices(shapes){
  if(shapes.some(g=>!g.points.length))return[];
  const boxes=shapes.map(extent);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(disjoint(boxes[i],boxes[j]))return[];
  const inside=p=>shapes.every(g=>contains(g,p)),out=[];
  for(const g of shapes)for(const p of g.points)if(inside(p))out.push(p);
  const outlines=shapes.map(edges);
  for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++)for(const[a,b]of outlines[i])for(const[c,d]of outlines[j])for(const p of intersections(a,b,c,d))if(inside(p))out.push(p);
  return out;
}
function rectangle(b){return{closed:true,points:[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}]};}
function ancestors(p,o){const list=[];let n=o;while(n?.parentId){n=p.objects.find(v=>v.id===n.parentId);if(n)list.push(n);}return list;}
function matches(p,o,box,crossing){
  if(!o||!C.isVisible(p,o)||C.isLocked(p,o))return false;
  const query=rectangle(box),initial=ancestors(p,o).filter(g=>g.maskId).map(g=>geometry(p,p.objects.find(n=>n.id===g.maskId)));
  function leaves(n,masks){
    if(!C.isVisible(p,n)||C.isLocked(p,n))return[];
    if(n.type==='group'){
      const ownMask=n.maskId&&p.objects.find(v=>v.id===n.maskId),clips=ownMask?masks.concat(geometry(p,ownMask)):masks;
      return p.objects.filter(v=>v.parentId===n.id&&v.id!==n.maskId).flatMap(v=>leaves(v,clips));
    }
    const g=geometry(p,n);if(!g.points.length)return[];
    const shapeList=[g,...masks],visible=masks.length?intersectionVertices(shapeList):g.points;
    if(!visible.length)return[];
    return[crossing?intersectionVertices(shapeList.concat(query)).length>0:visible.every(v=>contains(query,v))];
  }
  const result=leaves(o,initial);return result.length>0&&(crossing?result.some(Boolean):result.every(Boolean));
}
return{matches,TOLERANCE};
});
