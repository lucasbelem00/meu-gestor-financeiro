const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=require('node:path').resolve(__dirname,'../..');
const {boot,fixture,personal,loan}=require(raiz+'/tests/fixtures/gestor-mocks.cjs');
const html=fs.readFileSync(raiz+'/index.html','utf8');
function trecho(a,b){const i=html.indexOf(a),f=html.indexOf(b,i+a.length);assert.ok(i>=0&&f>i,a);return html.slice(i,f);}
function funcao(a,b){return trecho('    function '+a+'(','    function '+b+'(');}
const nomes=['Alimentação','Lazer','Transporte','Outros'];
function servidor(){const f=fixture([personal('Cinema',30),personal('Ônibus',40)]);f['Lançamentos'][1][3]='Lazer';f['Lançamentos'][2][3]='Transporte';for(let i=0;i<25;i++)f['Dashboard & Resumo'][16+i]=['',nomes[i]||'','',0];return boot(f);}
function ambiente(b=servidor()){
 const campos=new Map(),avisos=[],confirmacoes=[],envios=[],copias=[];const local=new Map();
 function el(id){if(!campos.has(id)){const classes=new Set();campos.set(id,{id,value:'',checked:false,disabled:false,innerHTML:'',textContent:'',dataset:{},options:[],after(){},before(){},append(){},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),replace(a,z){classes.delete(a);classes.add(z);},toggle(x,forcar){if(forcar===undefined?classes.has(x):!forcar)classes.delete(x);else classes.add(x);}},add(o){this.options.push(o);},focus(){},dispatchEvent(){}});}return campos.get(id);}
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let n=0;
 const c=vm.createContext({console,document:{getElementById:el,createElement:()=>el('criado-'+Math.random())},pxEl:el,localStorage:{getItem:k=>local.get(k)??null,removeItem:k=>local.delete(k)},CHAVE_PIX_COBRANCA_LOCAL:'gestorPixCobrancaV1',
 categoriasGlobaisEdit:nomes.map(nome=>({nome,meta:0})),modoEdicaoCategorias:true,
 modoEdicaoFormas:false,formasGlobais:[],versoesConfigGestor:{formas:b.ctx.versaoConfiguracaoGestor_(b.db,'formas')},
 seguro:(nome,fn)=>fn(),normalizarTexto:norm,pxChaveCat:s=>norm(s).replace(/[^a-z0-9]/g,''),isCategoriaOutros:s=>norm(s).replace(/[^a-z]/g,'')==='outros',
 formatarTituloInteligente:s=>String(s),formatBRL:n=>'R$ '+Number(n).toFixed(2),escaparHTML:s=>String(s),acaoHTML:(nome,args)=>'data-acao="'+nome+'" data-args="'+JSON.stringify(args).replace(/"/g,'&quot;')+'"',
 lerValorMoeda:v=>Number(typeof v==='number'?v:(campos.has(v)?el(v).value:v))||0,definirValorMoeda:(id,n)=>el(id).value=String(n),
 Option:function(text,value){this.text=text;this.value=value;},
 mostrarAviso:(...v)=>avisos.push(v),mostrarConfirmacao:(t,m,fn)=>confirmacoes.push({t,m,fn}),
 fecharMenuMobile(){},carregarDados:async()=>true,
 toggleEdicaoCategorias(){c.modoEdicaoCategorias=!c.modoEdicaoCategorias;},
 tipoFormaPagamentoGestor:f=>typeof f==='object'?f.tipo:(f==='Pix'?'pix':'cartao'),
 gravarArmazenamentoGestor:(k,v)=>{local.set(k,String(v));return true;},
 copiarTextoAreaTransferencia:(...v)=>copias.push(v),
 apiCall:(a,p)=>{envios.push({a,p});try{return Promise.resolve(b.ctx[a]({...p,versaoConfiguracao:p.versaoConfiguracao||b.ctx.versaoConfiguracaoGestor_(b.db,a==='salvarCategoriasWeb'?'categorias':'formas'),requestId:'auditoria-config-'+(++n)}));}catch(e){return Promise.reject(e);}}
 });c.window=c;
 require('./integracao-interface-ui.cjs')(c,'adicionarCategoriaUi','salvarCategorias');
 const fontes=[funcao('renderizarListaCategorias','salvarCategorias'),
 trecho('  var pxRenomeacoesCat = Object.create(null);','  /* ----------------------------------------------------------------- 13 */'),
 funcao('excluirFormaLocal','renderizarListaCategorias'),
 funcao('renderListaFormas','abrirModalForma'),
 funcao('lerChavePixCobranca','fecharModalPixCobranca'),funcao('fecharModalPixCobranca','abrirModalPixCobranca'),
 trecho('    function abrirPreviaCobrancaWhats(', '   function mostrarAviso(')];
 fontes.forEach(s=>vm.runInContext(s,c));return {c,el,local,avisos,confirmacoes,envios,copias,...b};
}
const esperar=()=>new Promise(r=>setImmediate(r));
const resultados=[];async function caso(nome,fn){await fn();resultados.push({caso:nome,resultado:'reproduzido'});}
function exibirMesesNativos(sh){const original=sh.getRange.bind(sh);sh.getRange=function(...args){const r=original(...args),disp=r.getDisplayValues.bind(r);r.getDisplayValues=()=>{const vals=r.getValues(),d=disp();return d.map((linha,i)=>linha.map((v,j)=>{const coluna=typeof args[1]==='number'?args[1]+j:0;const x=vals[i][j];return coluna===9&&x instanceof Date?String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear():v;}));};return r;};}

module.exports={ambiente,servidor,exibirMesesNativos,esperar};
