const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = (extra = {}) => { const c = vm.createContext({console: {log(){},time(){},timeEnd(){}}, ...extra}); c.self=c; return c; };
const load = (c, path) => vm.runInContext(fs.readFileSync(path, 'utf8'), c, {filename: path});
const worker = () => {
 const c = context(); c.self = c;
 const html = fs.readFileSync('isovis.html', 'utf8');
 for (const id of ['default_field_source', 'worker', 'marching_cubes']) {
  if (id === 'default_field_source' && !html.includes("id='default_field_source'")) continue;
  vm.runInContext(html.match(new RegExp(`<script[^>]* id='${id}'>([\\s\\S]*?)</script>`))[1], c);
 }
 return c;
};

function target(){return {listeners:new Map(),addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f);},removeEventListener(t,f){this.listeners.get(t)?.delete(f);}};}
class Element {
 get parentElement(){return this.parentNode;}
 constructor(tag){Object.assign(this,target());this.tagName=tag;this.style={};this.childNodes=[];this.className='';}
 appendChild(e){this.childNodes.push(e);e.parentNode=this;return e;}
 removeChild(e){this.childNodes.splice(this.childNodes.indexOf(e),1);e.parentNode=null;}
 insertBefore(e,b){this.childNodes.splice(Math.max(0,this.childNodes.indexOf(b)),0,e);e.parentNode=this;}
 setAttribute(k,v){this[k]=v;} removeAttribute(k){delete this[k];}
}
const window=target(),body=new Element('body'),head=new Element('head');window.innerHeight=1000;window.document=null;
const document={body,head,location:{href:'test'},createElement:t=>new Element(t),createTextNode:t=>new Element('text'),getElementsByTagName:()=>[head],activeElement:{},getElementById:()=>null,querySelectorAll:()=>[]};
const c=context({window,document,setTimeout(){},getComputedStyle:()=>({height:'0px',width:'100px'}),requestAnimationFrame(){}});
window.document=document;load(c,'lib/dat.gui.min.js');const baseline=window.listeners.get('resize')?.size||0;
for(let i=0;i<5;i++) {
 const gui=new c.dat.GUI({autoPlace:false,hideable:false,resizable:false,scrollable:false});
 gui.addFolder('one').addFolder('two');assert.equal(window.listeners.get('resize').size,baseline+3);
 const dom=gui.domElement;gui.destroy();assert.equal(window.listeners.get('resize').size,baseline);
 assert.equal(Object.keys(gui.__folders).length,0);
}

const crypto=require('node:crypto');assert.equal(crypto.createHash('sha256').update(fs.readFileSync('lib/dat.gui.min.js')).digest('hex'),'6e21301e269b7fff15f217c1454b0f614c937d53081e998e8559c26ab0be3944');
load(c,'js/ui.js');window.dispatchEvent=()=>{};c.MouseEvent=class{};
const gui=new c.dat.GUI({autoPlace:false,hideable:false,resizable:false,scrollable:false});
const sub=gui.addFolder('child');gui.__listening.push({});sub.__listening.push({});c.destroy_gui(gui);
assert.equal(gui.__listening.length,0);assert.equal(sub.__listening.length,0);assert.equal(window.listeners.get('resize').size,baseline);
