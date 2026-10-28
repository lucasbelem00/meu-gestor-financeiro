const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const raiz=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(raiz,'index.html'),'utf8');
const fonteCatalogo=fs.readFileSync(path.join(raiz,'shared/acoes.js'),'utf8');
const {CATALOGO_ACOES_GESTOR:catalogo,metadadosAcaoGestor}=require('../shared/acoes.js');
function trecho(a,b){const i=html.indexOf(a),f=html.indexOf(b,i);assert(i>=0&&f>i,a);return html.slice(i,f);}
function armazenamento(){const m=new Map();return{m,get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function rede(){
  const local=armazenamento(),avisos=[],chamadas=[],els=new Map();
  function el(id){if(!els.has(id))els.set(id,{id,value:'',type:'text',dataset:{},elements:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},replaceChildren(){},append(){},appendChild(){}});return els.get(id);}
  const c=vm.createContext({console,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,localStorage:local,sessionStorage:armazenamento(),navigator:{onLine:true,locks:{request:async(_n,_o,fn)=>fn({})}},document:{getElementById:el,createElement:()=>el('novo')},renderizarNotasUI(){},mostrarAviso:(...v)=>avisos.push(v),mostrarConfirmacao(){},formatBRL:String,carregarDados:async()=>true,estaNoAppsScript:()=>false,API_URL:'/falso',seguro:(_n,fn)=>fn(),pxEl:el});
  c.window=c;vm.runInContext(fonteCatalogo,c);
  vm.runInContext('let notasGlobais=[];'+trecho('const GESTOR_FILA_PREFIXO','    let emprestimosGlobal'),c);
  vm.runInContext(trecho('function capturarFormularioMutacaoGestor(','function atualizarIntegridadeServidorGestor('),c);
  vm.runInContext(trecho("  seguro('apiCall'",'  /* ------------------------------------------------------------------ 2 */'),c);vm.runInContext('protocoloServidorGestor=15',c);
  c.fetch=async(_url,opts)=>{chamadas.push(JSON.parse(opts.body));throw Error('Falha fictícia de rede');};
  return{c,local,avisos,chamadas};
}

test('ações de backup distinguem consulta, preparação, manutenção e gravação financeira',()=>{
  assert.equal(metadadosAcaoGestor('obterPartesImportacaoBackupWeb').tipo,'leitura');
  assert.equal(metadadosAcaoGestor('iniciarImportacaoBackupWeb').tipo,'temporaria');
  assert.equal(metadadosAcaoGestor('executarManutencaoProtegidaWeb').tipo,'manutencao');
  assert.equal(metadadosAcaoGestor('restaurarBackupDadosWeb').diarioFinanceiro,true);
  assert.equal(metadadosAcaoGestor('concluirRecuperacaoOperacaoWeb').conferirIntegridade,false);
  assert.throws(()=>metadadosAcaoGestor('acaoInexistente'),/não reconhecida/);
  assert.deepEqual(Object.keys(catalogo).filter(a=>catalogo[a].cacheavel).sort(),['obterRelatorioAnual','obterRelatorioMes']);
});

for(const acao of ['obterPartesImportacaoBackupWeb','listarCopiasRestauracaoWeb','obterParteCopiaRestauracaoWeb'])test('falha de consulta '+acao+' não cria pendência financeira nem impede escolher backup',async()=>{
  const a=rede();await assert.rejects(a.c.apiCall(acao,{importacaoId:'consulta-backup-ficticia',parte:1},1),e=>e.resultadoIncerto!==true);
  assert.equal([...a.local.m.keys()].filter(k=>k.startsWith('gestorMutacaoV3:')).length,0);assert.equal(a.avisos.length,0);
  a.c.integridadeServidorGestor={pendencias:[],series:[],bloqueada:false};
  vm.runInContext(trecho('function listarPendenciasAtividadeGestor(','function atualizarBadgeAtividadeGestor('),a.c);
  assert.equal(a.c.listarPendenciasAtividadeGestor().length,0);
});

for(const acao of ['prepararExportacaoBackupWeb','iniciarImportacaoBackupWeb','enviarPartesBackupWeb','concluirImportacaoBackupWeb','descartarImportacaoBackupWeb'])test('preparação '+acao+' não se transforma em lançamento incerto e não repete sozinha',async()=>{
  const a=rede();await assert.rejects(a.c.apiCall(acao,{importacaoId:'backup-temporario-ficticio',parte:1},3),e=>e.operacaoTemporaria===true&&e.resultadoIncerto===false);
  assert.equal(a.chamadas.length,1);assert.equal(a.local.m.size,0);assert.equal(a.avisos.length,0);
});

test('alteração financeira continua protegida se a resposta se perder',async()=>{
  const a=rede();await assert.rejects(a.c.apiCall('salvarLancamentoWeb',{descricao:'Almoço fictício',valorTotal:25,requestId:'financeiro-ficticio-001'},3),e=>e.resultadoIncerto===true);
  assert.equal(a.chamadas.length,1);assert.equal([...a.local.m.keys()].filter(k=>k.startsWith('gestorMutacaoV3:')).length,1);assert.equal(a.avisos.length,1);
});

test('consulta preserva diagnóstico explícito de gravação pendente no servidor, sem inventar um envio local',async()=>{
  const a=rede();a.c.fetch=async()=>({ok:true,json:async()=>({sucesso:false,resultadoIncerto:true,erro:'Uma gravação anterior aguarda conferência no servidor.'})});
  await assert.rejects(a.c.apiCall('getDadosCompletos',null,1),e=>e.resultadoIncerto===true&&/gravação anterior/.test(e.message));
  assert.equal([...a.local.m.keys()].filter(k=>k.startsWith('gestorMutacaoV3:')).length,0);assert.equal(a.avisos.length,0);
});

test('abertura lenta ignora rascunho antigo que já foi concluído em outra aba',async()=>{
  const {ambienteEnvio}=require('./fixtures/envio-rascunho-ui.cjs'),a=ambienteEnvio(),original=a.pagina();original.guardar();
  const dados=original.c.dadosFormularioRascunhoGestor(false);
  original.sessao.setItem('rascunhoLancamento',JSON.stringify({desc:original.el('inpDesc').value,valor:original.el('inpValor').value,campos:dados.campos}));
  await a.herdar(original).enviar(false);assert.equal(a.linhas().length,1);
  const nova=a.pagina();for(const [k,v]of original.sessao.m)nova.sessao.setItem(k,v);
  for(const id of ['inpDesc','inpValor','selForma','selCat'])nova.el(id).value='';
  nova.c.rascunhosRestauradosGestor=false;nova.c.restaurarOpcaoParcelamentoRascunhoGestor=()=>{};
  for(const n of ['atualizarLayoutParcelas','atualizarLayoutParcelasEmprestimo','atualizarPreviewParcEmp','sincronizarChipsTags','atualizarVisorMetaCategoria'])nova.c[n]=()=>{};
  vm.runInContext(trecho('    function restaurarRascunhosCompletosGestor(','    // A restauração completa é coordenada'),nova.c);
  const rotina=fs.readFileSync(path.join(raiz,'interface/rotina.js'),'utf8'),i=rotina.indexOf('const restaurarRascunhoAnteriorRotinaGestor='),f=rotina.indexOf('function limparCopiaRascunhoRotinaGestor(',i);
  vm.runInContext(rotina.slice(i,f),nova.c);nova.c.restaurarRascunhosCompletosGestor();
  assert.equal(nova.el('inpDesc').value,'');assert.equal(nova.el('inpValor').value,'');assert.equal(nova.sessao.getItem('rascunhoLancamento'),null);
  assert.equal(html.includes('const salvoL = sessionStorage.getItem'),false);
});

test('central prende foco, fecha com Escape e restaura a rolagem de fundo',()=>{
  const classes=new Set(['hidden']),foco={isConnected:true,focus(){this.restaurado=true;}},fechar={focus(){this.recebeu=true;},getClientRects:()=>[{}]},primeiro={focus(){this.recebeu=true;},getClientRects:()=>[{}]},conteudo={scrollTop:99};
  const modal={classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},querySelectorAll:()=>[primeiro,fechar]},document={activeElement:foco,body:{style:{overflow:'auto'}},getElementById:id=>({modalMenuMobile:modal,conteudoCentralNavegacao:conteudo,btnFecharCentralNavegacao:fechar})[id]};
  const c=vm.createContext({document});vm.runInContext(trecho('    let focoAntesCentralGestor=', '    function renderizarMenusNavegacao()'),c);
  c.abrirMenuMobile();assert.equal(document.body.style.overflow,'hidden');assert.equal(conteudo.scrollTop,0);assert.equal(fechar.recebeu,true);
  document.activeElement=fechar;let impedido=0;modal.onkeydown({key:'Tab',preventDefault(){impedido++;}});assert.equal(primeiro.recebeu,true);assert.equal(impedido,1);
  modal.onkeydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(classes.has('hidden'),true);assert.equal(document.body.style.overflow,'auto');assert.equal(foco.restaurado,true);
});

test('copiar texto continua oferecendo alternativa quando a permissão da área de transferência falha',async()=>{
  const alternativos=[],avisos=[];
  const c=vm.createContext({navigator:{clipboard:{writeText:async()=>{throw Error('Permissão negada');}}},document:{createElement:()=>({style:{},focus(){},select(){}}),body:{appendChild(){},removeChild(){}},execCommand:()=>false},mostrarAviso:(...v)=>avisos.push(v),pxMostrarTextoParaCopiar:t=>alternativos.push(t)});
  require('./fixtures/integracao-interface-ui.cjs')(c,'copiarTextoAreaTransferencia');
  c.copiarTextoAreaTransferencia('Resumo fictício');await new Promise(r=>setImmediate(r));assert.deepEqual(alternativos,['Resumo fictício']);assert.equal(avisos.length,0);
});

test('implementações promovidas têm uma declaração e não conservam os treze corpos substituídos',()=>{
  for(const nome of ['copiarTextoAreaTransferencia','alternarMetadeValor','aplicarUltimoValorSugerido','limparFormularioNovoGasto','limparFiltros','aplicarFiltros','chamarFiltroBackend','copiarResumoFiltroWhats','adicionarCategoriaUi','salvarCategorias','extrairValorPixAoColar','limparCampoEVoltarFoco','limparFormularioEmprestimo']){
    assert.equal([...html.matchAll(new RegExp('    (?:async )?function '+nome+'\\(','g'))].length,1,nome);
    // Adaptadores posteriores podem chamar a função principal; o corpo antigo
    // instalado pela integração de quatro espaços foi removido.
    assert.equal(html.includes('    window.'+nome+' = '),false,nome);
  }
  assert.equal(html.includes('window.onload = carregarDados;'),false);
  assert.equal(html.includes('function referenciaRegistroGestor('),false);
  assert.equal(html.includes('function alternarModoAssinatura('),false);
});
