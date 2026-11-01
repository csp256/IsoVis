const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('IsoVis.html', 'utf8');
 for (const id of ['defaultFieldSource', 'worker', 'marchingCubes']) {
  if (id === 'defaultFieldSource' && !html.includes("id='defaultFieldSource'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

function target(){return {listeners:new Map(),addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f);},removeEventListener(t,f){this.listeners.get(t)?.delete(f);}};}
class Element {
 constructor(tag){Object.assign(this,target());this.tagName=tag;this.style={};this.childNodes=[];this.className='';}
 appendChild(e){this.childNodes.push(e);e.parentNode=this;return e;}
 removeChild(e){this.childNodes.splice(this.childNodes.indexOf(e),1);e.parentNode=null;}
 insertBefore(e,b){this.childNodes.splice(Math.max(0,this.childNodes.indexOf(b)),0,e);e.parentNode=this;}
 setAttribute(k,v){this[k]=v;} removeAttribute(k){delete this[k];}
}
const window=target(),body=new Element('body'),head=new Element('head');window.innerHeight=1000;
const document={body,location:{href:'test'},createElement:t=>new Element(t),createTextNode:t=>new Element('text'),getElementsByTagName:()=>[head],activeElement:{}};
const c=context({window,document,setTimeout(){},getComputedStyle:()=>({height:'0px',width:'100px'}),requestAnimationFrame(){}});
load(c,'lib/dat.gui.min.js');const baseline=window.listeners.get('resize')?.size||0;
for(let i=0;i<5;i++) {
 const gui=new c.dat.GUI({autoPlace:false,hideable:true,resizable:false,scrollable:false});
 gui.addFolder('one').addFolder('two');assert.equal(window.listeners.get('resize').size,baseline+3);
 const dom=gui.domElement;gui.destroy();gui.destroy();assert.equal(window.listeners.get('resize').size,baseline);
 c.dat.GUI.toggleHide();assert.equal(dom.style.opacity,undefined);
}
