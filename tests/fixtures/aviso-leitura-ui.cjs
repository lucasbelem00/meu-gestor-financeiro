const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function instalarAvisoLeitura(c){
 const elementos=new Map();
 const criar=tag=>({tagName:tag.toUpperCase(),hidden:false,children:[],attrs:{},append(...filhos){this.children.push(...filhos);},replaceChildren(...filhos){this.children=[...filhos];},setAttribute(k,v){this.attrs[k]=v;}});
 const principal={before(e){elementos.set(e.id,e);}},doc=c.document||{};
 if(!doc.getElementById)doc.getElementById=id=>elementos.get(id)||null;
 if(!doc.createElement)doc.createElement=criar;
 if(!doc.querySelector)doc.querySelector=s=>s==='main'?principal:null;
 c.document=doc;
 const fonte=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8'),i=fonte.indexOf('    function informarFalhaLeituraDadosGestor('),f=fonte.indexOf('    function carregarDados() {',i);if(i<0||f<i)throw Error('Aviso de leitura não localizado');vm.runInContext(fonte.slice(i,f),c);
 return {elementos};
};
