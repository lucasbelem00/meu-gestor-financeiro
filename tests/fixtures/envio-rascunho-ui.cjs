const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {boot,fixture}=require('./gestor-mocks.cjs'),{armazenamento}=require('./usabilidade-ui.cjs');
const raiz=path.resolve(__dirname,'../..'),html=fs.readFileSync(raiz+'/index.html','utf8'),rotina=fs.readFileSync(raiz+'/interface/rotina.js','utf8');
function trecho(s,a,b){const i=s.indexOf(a),f=s.indexOf(b,i+a.length);if(i<0||f<i)throw Error('Trecho não localizado: '+a);return s.slice(i,f);}
function funcao(nome){const i=html.indexOf('    async function '+nome+'('),resto=html.slice(i+1),f=resto.search(/\n    (?:async )?function \w+\(/);return html.slice(i,f<0?html.length:i+1+f);}
function ambienteEnvio(opcoes={}){
 const local=armazenamento(),backend=boot(fixture()),envios=[],locks=new Set();backend.ctx.console={log(){}};backend.ctx.executarAcaoApi_('getDadosCompletos',null);
 function pagina(online=true){
  const sessao=armazenamento(),campos=new Map(),avisos=[];
  const el=id=>{if(!campos.has(id))campos.set(id,{id,value:'',type:/^check|^chk/.test(id)?'checkbox':'text',checked:false,disabled:false,dataset:{},elements:[],classList:{add(){},remove(){},toggle(){}},reset(){for(const e of this.elements){e.value='';e.checked=false;}}});return campos.get(id);};
  const c=vm.createContext({Date,Map,Set,JSON,TextEncoder,Uint8Array,setTimeout,clearTimeout,setInterval,clearInterval,crypto:crypto.webcrypto,localStorage:local,sessionStorage:sessao,navigator:{onLine:online,locks:{request:async(nome,_o,fn)=>{if(locks.has(nome))return fn(null);locks.add(nome);try{return await fn({});}finally{locks.delete(nome);}}}},document:{getElementById:el},salvandoGastoTrava:false,salvandoEmprestimoTrava:false,emprestimoPendenteGestor:()=>null,PX_CHAVE_RESULTADO_INCERTO:'lancamentoResultadoIncerto',GESTOR_FILA_PREFIXO:'gestorFilaItemV2:',
   pxEl:el,formatarZeroData(){},pxDataTriplaValida:()=>true,validarLimitesDataTripla(){},sincronizarDataTripla(){},sincronizarDataEmp(){},formatarTituloInteligente:v=>String(v),lerValorMoeda:id=>Number(el(id).value),formatarTagsAutomaticamente:v=>v,formaEhPixGestor:()=>false,formaEhImediataGestor:()=>false,permiteParcelamentoFormaGestor:()=>true,mostrarAviso:(...v)=>avisos.push(v),atualizarIndicadorOffline(){},carregarDados(){},exibirPendenciaEmprestimoGestor(){},renderizarRecuperacaoRascunhosGestor(){},
   novoRequestIdGestor:()=>crypto.randomUUID(),gravarArmazenamentoGestor:(k,v,o={})=>{(o.sessao?sessao:local).setItem(k,v);return true;},lerJSONLocalGestor:(k,p)=>{try{return JSON.parse(local.getItem(k)||'null')||p;}catch(_){return p;}},lerEntradasLocaisGestor:prefix=>[...local.m].filter(([k])=>k.startsWith(prefix)).flatMap(([chave,v])=>{try{return [{chave,valor:JSON.parse(v)}];}catch(_){return [];}}),
   apiCall:async(a,p)=>{envios.push({action:a,...p});if(opcoes.falhar){const e=Error('Resposta fictícia interrompida');e.resultadoIncerto=true;throw e;}return backend.ctx.executarAcaoApi_(a,p);},pxRestaurarEstadoIncerto(){},pxDefinirEstadoIncerto(ativo){if(ativo)sessao.setItem('lancamentoResultadoIncerto','true');},alternarModoEmprestimosGestor(){}});
  c.window=c;c.lerFilaOfflineGestor=()=>c.lerEntradasLocaisGestor('gestorFilaItemV2:').map(e=>e.valor);
  c.limparFormularioNovoGasto=()=>el('formLancamento').reset();c.limparFormularioEmprestimo=()=>el('formEmprestimo').reset();
  vm.runInContext(trecho(html,'function capturarFormularioMutacaoGestor(','function atualizarIntegridadeServidorGestor('),c);
  vm.runInContext(trecho(html,'    async function comTravaAbasGestor(','    function '),c);
  vm.runInContext(trecho(html,'    function enfileirarGastoOfflineGestor(','    function '),c);
  vm.runInContext(trecho(html,'async function hashTextoRestauracaoGestor(','function compactarBackupRestauracaoGestor('),c);
  vm.runInContext(trecho(rotina,'const paginaRascunhoGestor=','const guardarRascunhoAnteriorRotinaGestor='),c);
  vm.runInContext(trecho(rotina,'function limparCopiaRascunhoRotinaGestor(','function pedirLimpezaFormularioGestor('),c);
  vm.runInContext(funcao('gravarEmprestimoSeguroGestor'),c);
  vm.runInContext(trecho(html,'    window.enviarGasto = async function','    window.enviarEmprestimo = async function'),c);
  vm.runInContext(trecho(html,'    window.enviarEmprestimo = async function','    setTimeout(exibirPendenciaEmprestimoGestor'),c);
  for(const [id,v]of Object.entries({inpDataDia:'26',inpDataMes:'10',inpDataAno:'2026',inpDesc:'Almoço fictício',inpValor:'25.50',inpParc:'1',inpParcIni:'1',inpData:'26/10/2026',inpMesFat:'10/2026',selForma:'Cartao',selCat:'Teste',inpEmpDataDia:'26',inpEmpDataMes:'10',inpEmpDataAno:'2026',inpEmpData:'26/10/2026',inpEmpMesFat:'10/2026',inpEmpPessoa:'Ana',inpEmpDesc:'Ajuda fictícia',selEmpForma:'Cartao',inpEmpValor:'25.50',inpEmpParc:'1',inpEmpParcIni:'1'}))el(id).value=v;
  el('formLancamento').elements=[...campos.values()].filter(e=>e.id.startsWith('inp')&&!e.id.startsWith('inpEmp')||['selForma','selCat','checkAssinatura','chkPixParcelado'].includes(e.id));el('formEmprestimo').elements=[...campos.values()].filter(e=>e.id.startsWith('inpEmp')||e.id==='selEmpForma'||e.id==='chkPixRecebimento');
  return {c,el,avisos,sessao,guardar(tipo='novo'){return c.guardarRascunhoRotinaGestor(tipo,c.dadosFormularioRascunhoGestor(tipo==='emp'),true);},enviar:emp=>c[emp?'enviarEmprestimo':'enviarGasto']({preventDefault(){}})};
 }
 function herdar(a,tipo='novo',online=true){a.guardar(tipo);const b=pagina(online),chave=a.c.chaveRascunhoRotinaGestor(tipo);b.sessao.setItem('gestorRascunhoAnterior:'+tipo,chave);const d=JSON.parse(b.c.lerRascunhoRotinaGestor(tipo));Object.entries(d.campos).forEach(([id,v])=>{if(b.el(id).type==='checkbox')b.el(id).checked=v;else b.el(id).value=v;});b.guardar(tipo);return b;}
 return {local,backend,envios,pagina,herdar,fila:()=>[...local.m].filter(([k])=>k.startsWith('gestorFilaItemV2:')).map(([,v])=>JSON.parse(v)),linhas:emp=>backend.db.sheets[emp?'Empréstimos':'Lançamentos'].rows.slice(1).filter(r=>r[11])};
}
module.exports={ambienteEnvio};
