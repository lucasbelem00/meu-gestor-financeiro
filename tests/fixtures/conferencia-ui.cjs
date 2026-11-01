// DOM mínimo para testar as ações reais do módulo, incluindo leituras concorrentes.
const fs=require('node:fs'),vm=require('node:vm');
function ambienteConferencia(responder=async()=>({lancamentos:[],terceiros:{itens:[]}})){
 const elementos=new Map(),confirmacoes=[],avisos=[],chamadas=[];
 class Elemento{
  constructor(tag='div'){this.tag=tag;this.dataset={};this.children=[];this._value='';this.textContent='';this.disabled=false;this.eventos={};}
  set id(id){this._id=id;elementos.set(id,this);}get id(){return this._id;}
  set value(v){this._value=String(v);}get value(){return this.tag==='select'?this.children.find(o=>o.value===this._value)?.value||this.children[0]?.value||'':this._value;}
  get options(){return this.children;}
  append(...filhos){for(const f of filhos){f.pai=this;this.children.push(f);}}
  replaceChildren(...filhos){this.children=[];this.append(...filhos);}
  addEventListener(nome,fn){this.eventos[nome]=fn;}
  focus(){this.focado=true;}remove(){this.pai.children=this.pai.children.filter(e=>e!==this);}
  querySelectorAll(seletor){const campo=seletor.includes('remover-preco')?'removerPreco':'preco',valor=/data-preco="([^"]+)"/.exec(seletor)?.[1],lista=[];function visitar(p){for(const e of p.children){if(campo in e.dataset&&(!valor||e.dataset[campo]===valor))lista.push(e);visitar(e);}}visitar(this);return lista;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
 }
 const document={createElement:t=>new Elemento(t),getElementById:id=>{if(!elementos.has(id)){const e=new Elemento();e.id=id;}return elementos.get(id);}};
 const c={document,Date,TextDecoder,TextEncoder,formasGlobais:[{nome:'Cartao',tipo:'cartao'}],setAba(){},renderizarDados(){},metadadosAcaoGestor:a=>({diarioFinanceiro:a==='salvarLancamentoWeb'}),apiCall:async(...a)=>{chamadas.push(a);return responder(...a);},formatBRL:n=>'R$ '+n.toFixed(2),mostrarConfirmacao:(...a)=>confirmacoes.push(a),mostrarAviso:(...a)=>avisos.push(a)};c.window=c;const ctx=vm.createContext(c);vm.runInContext(fs.readFileSync('interface/conferencia.js','utf8'),ctx);
 for(const [id,v]of Object.entries({'extrato-col-data':'0','extrato-col-descricao':'1','extrato-col-valor':'2','extrato-mes':'2026-10','extrato-forma':'Cartao','extrato-sinal':'positivo','extrato-separador':';'}))document.getElementById(id).value=v;
 function arquivo(texto){return {size:Buffer.byteLength(texto),arrayBuffer:async()=>new TextEncoder().encode(texto).buffer};}
 function csv(){vm.runInContext("arquivoConferenciaGestor=[['Data','Descrição','Valor'],['18/10/2026','Compra CSV','80,00']];",ctx);}
 return {ctx,document,elementos,confirmacoes,avisos,chamadas,arquivo,csv};
}
module.exports={ambienteConferencia};
