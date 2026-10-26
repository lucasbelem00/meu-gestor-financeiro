const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const raiz=require('node:path').resolve(__dirname,'../..');
const {boot,fixture,launch,loan}=require(raiz+'/tests/fixtures/gestor-mocks.cjs');
const html=fs.readFileSync(raiz+'/index.html','utf8');
function trecho(a,b){const i=html.indexOf(a),f=html.indexOf(b,i+a.length);assert.ok(i>=0&&f>i,a);return html.slice(i,f);}
function declaracao(nome){return html.includes('    async function '+nome+'(')?'    async function '+nome+'(':'    function '+nome+'(';}
function funcao(a,b){return trecho(declaracao(a),declaracao(b));}
function adiado(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const esperar=()=>new Promise(r=>setImmediate(r));
function ambiente(){
 const campos=new Map(),avisos=[],chamadas=[],confirmacoes=[],envios=[],calculos=[];
 function el(id){if(!campos.has(id)){const classes=new Set();campos.set(id,{id,value:'',type:'text',checked:false,disabled:false,textContent:'',innerHTML:'',dataset:{},options:[],classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n),toggle(n,b){if(b)classes.add(n);else classes.delete(n);}},focus(){},select(){},add(o){this.options.push(o);},elements:[]});}return campos.get(id);}
 const vazio=()=>{};
 const c=vm.createContext({console,Date,document:{getElementById:el,querySelector:s=>s==='#painelDividirEmpCampos button'?el('botaoParcial'):s==='#painelMoverPessoalCampos button'?el('botaoMover'):null},window:{},pxEl:el,
 mostrarAviso:(...v)=>avisos.push(v),mostrarConfirmacao:(...v)=>confirmacoes.push(v),
 formatarTituloInteligente:v=>String(v),formatarTagsAutomaticamente:v=>v,
 formatBRL:n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),
 lerValorMoeda:v=>{const x=typeof v==='number'?v:typeof v==='string'?(campos.has(v)?el(v).value:v):v.value;return Number(String(x||'').replace('R$','').replace(',','.').trim())||0;},
 definirValorMoeda:(id,n)=>el(id).value=String(n),categoriasGlobaisEdit:[],isCategoriaOutros:()=>false,
 atualizarLayoutParcelas:vazio,atualizarLayoutParcelasEmprestimo:vazio,
 buscarFormaPagamentoGestor:n=>({nome:n}),calcularMesFaturaCartao:(f,data)=>{calculos.push(data);return {mesFat:'11/2026'};},formaEhCartaoGestor:n=>n==='Cartao',formaEhPixGestor:n=>n==='Pix',permiteParcelamentoFormaGestor:()=>true,
 emprestimoPendenteGestor:()=>null,exibirPendenciaEmprestimoGestor:vazio,salvandoEmprestimoTrava:false,
 gravarEmprestimoSeguroGestor:p=>envios.push(p),carregarDados:async()=>true,
 apiCall:(a,p)=>{const d=adiado();chamadas.push({a,p,...d});return d.promise;},
 Option:function(text,value){this.text=text;this.value=value;},seguro:(n,f)=>f()
 });
 c.window=c;c.novoRequestIdGestor=()=>require('node:crypto').randomUUID();c.emprestimosGlobal={itens:[]};
 const fontes=[
 funcao('detalhesReferenciaGestor','registrarIdentidadesGestor'),
 trecho('    function formatarZeroData(', '    // ============================================================================\n    // ESTADO GLOBAL'),
 trecho('  function pxDataTriplaValida(', '  function pxChaveCat('),
 funcao('atualizarFaturaEmprestimo','selecionarPessoaChipEmp'),
 trecho('    window.enviarEmprestimo = function', '    setTimeout(exibirPendenciaEmprestimoGestor'),
 trecho('      function abrirModalEdicaoEmp(', declaracao('salvarEdicaoEmp')),
 funcao('salvarEdicaoEmp','togglePainelDividirEmp'),
 funcao('executarDividirParcelaEmp','togglePainelMoverPessoal'),
 funcao('executarMoverParaPessoal','copiarCobrancaPessoaWhats'),
 funcao('confirmarEdicaoFinanceiraGestor','salvarEdicaoLanc'),
 funcao('atualizarPreviewParcelas','atualizarLayoutParcelas'),
 funcao('atualizarPreviewParcEmp','atualizarLayoutParcelasEmprestimo'),
 trecho('  function pxGarantirOpcao(', '  /* ----------------------------------------------------------------- 14 */')
 ];
 fontes.forEach(s=>vm.runInContext(s,c));
 const rotina=fs.readFileSync(raiz+'/interface/rotina.js','utf8');
 vm.runInContext(rotina.slice(rotina.indexOf('const paginaRascunhoGestor='),rotina.indexOf('const guardarRascunhoAnteriorRotinaGestor=')),c);
 vm.runInContext(rotina.slice(rotina.indexOf('function restaurarBotoesEditorEmpGestor('),rotina.indexOf('function protegerEditorRotinaGestor(')),c);
 vm.runInContext(rotina.slice(rotina.indexOf('function assinaturaFormularioRotinaGestor('),rotina.indexOf('function bloqueioFormularioRotinaGestor(')),c);
 el('modalEdicaoEmp').querySelector=()=>({elements:[]});
 el('chkPixRecebimento').value='on';el('chkPixRecebimento').type='checkbox';
 return {c,el,avisos,chamadas,confirmacoes,envios,calculos};
}

module.exports={ambiente,esperar};
