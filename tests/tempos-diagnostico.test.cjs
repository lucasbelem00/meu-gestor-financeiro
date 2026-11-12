const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const backend=fs.readFileSync('Backend/Code.gs','utf8'),html=fs.readFileSync('index.html','utf8');
const helper=backend.slice(backend.indexOf('function registrarTemposRespostaGestor_'),backend.indexOf('// Executar manualmente'));
const front=html.slice(html.indexOf('function normalizarTemposServidorGestor'),html.indexOf('function registrarDiagnosticoAtividadeGestor'));
test('trava ocupada informa código próprio antes de ler ou gravar e não libera trava alheia',()=>{
  const limites=[];let liberacoes=0,acessos=0;
  const lock={tryLock(ms){limites.push(ms);return false;},releaseLock(){liberacoes++;}};
  const c=vm.createContext({Date,marcarUsoRecenteAppGestor_(){},console:{log(){}},LockService:{getScriptLock:()=>lock},obterPlanilhaGestor_(){acessos++;throw Error('não deveria ler');}});
  const executor=backend.slice(backend.indexOf('function executarOperacaoGestor_('),backend.indexOf('function assinaturaManutencaoLeituraGestor_'));
  vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null,CONTEXTO_GESTOR_=null;'+helper+executor,c);
  for(const leitura of [true,false])assert.throws(()=>c.executarOperacaoGestor_(leitura?'obterRelatorioAnual':'salvarLancamentoWeb',{},()=>{acessos++;},leitura),e=>e.codigo==='SERVICO_OCUPADO'&&!!e.resultadoIncerto===!leitura);
  assert.deepEqual(limites,[10000,30000]);assert.equal(acessos,0);assert.equal(liberacoes,0);
  const m=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));
  vm.runInContext(front,c);assert.equal(c.normalizarTemposServidorGestor(m.acao,m).estado,'ocupado');
});
test('trava disponível mantém execução normal sem espera extra ou repetição',()=>{
  let chamadas=0;const c=vm.createContext({Date,console:{log(){}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
  assert.equal(c.adquirirLockOperacaoGestor_({tryLock(ms){assert.equal(ms,10000);chamadas++;return true;}},'obterRelatorioMes',true),undefined);
  assert.equal(chamadas,1);assert.equal(vm.runInContext('TEMPOS_RESPOSTA_GESTOR_',c),null);
});
test('tempos incluem apenas ação e durações e sobrevivem a falha do log',()=>{
  const c=vm.createContext({Date:{now:()=>1000},console:{log(){throw Error('log indisponível');}}});
  vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
  vm.runInContext("registrarTemposRespostaGestor_('salvarLancamentoWeb',0,100,200,300,100,800)",c);
  const r=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));
  assert.equal(r.totalMs,1000);assert.equal(r.gravacaoMs,200);assert.equal(r.outrosMs,100);
});

test('intervalo de servidor é opcional e validado sem aceitar intervalos inválidos',()=>{
 const c=vm.createContext({});vm.runInContext(front,c);
 const m={versao:1,acao:'obterRelatorioMes',totalMs:100,esperaLockMs:0,preparacaoMs:0,execucaoMs:100,planoMs:0,gravacaoMs:0,outrosMs:0,inicioServidorMs:1700000000000,fimServidorMs:1700000000100};
 assert.equal(c.normalizarTemposServidorGestor(m.acao,m).inicioServidorMs,m.inicioServidorMs);
 assert.equal(c.normalizarTemposServidorGestor(m.acao,{...m,fimServidorMs:m.inicioServidorMs-1}).inicioServidorMs,undefined);
 assert.equal(c.normalizarTemposServidorGestor(m.acao,{...m,inicioServidorMs:'privado'}).inicioServidorMs,undefined);
});
test('subetapas preservam retorno e erro e expõem somente durações permitidas',()=>{
 let agora=0;const c=vm.createContext({Date:{now:()=>agora},console:{log(){}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
 const d={};assert.equal(c.medirEtapaGravacaoGestor_(d,'resumoMs',()=>{agora=50;return 7;}),7);
 assert.throws(()=>c.medirEtapaGravacaoGestor_(d,'aplicacaoMs',()=>{agora=100;throw Error('interrompido');}),/interrompido/);
 assert.equal(d.resumoMs,50);assert.equal(d.aplicacaoMs,50);
 c.registrarTemposRespostaGestor_('salvarLancamentoWeb',0,0,0,0,0,1,{...d,resumoLeituraMs:12,atualizacaoMs:8,prepararBaseMs:3,aplicarConferenciaMs:9,aplicarEscritaMs:7,planoAnualMs:4,atualizacaoDadosMs:6,celulasEscritas:36,configProtecaoLeituras:1,configProtecaoReusos:8,abasConsultadas:4,abasReutilizadas:12,diarioPartes:3,anexosAgrupados:1,aplicarFlushes:1,anoValoresMs:22,anoFormulasMs:12,anoValoresEvitadas:1,diarioCaracteresPlano:45000,resumoCalculoMs:NaN,senha:'privada'});
 const m=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));
 vm.runInContext(front,c);const v=c.normalizarTemposServidorGestor(m.acao,m);
 assert.equal(v.detalhesGravacao.resumoMs,50);assert.equal(v.detalhesGravacao.resumoLeituraMs,12);assert.equal(v.detalhesGravacao.atualizacaoMs,8);assert(!Object.hasOwn(v.detalhesGravacao,'resumoCalculoMs'));assert(!JSON.stringify(v).includes('privada'));
 assert.equal(v.detalhesGravacao.prepararBaseMs,3);assert.equal(v.detalhesGravacao.aplicarConferenciaMs,9);assert.equal(v.detalhesGravacao.aplicarEscritaMs,7);
 assert.equal(v.detalhesGravacao.planoAnualMs,4);assert.equal(v.detalhesGravacao.atualizacaoDadosMs,6);assert.equal(v.detalhesGravacao.celulasEscritas,36);assert.equal(v.detalhesGravacao.configProtecaoLeituras,1);assert.equal(v.detalhesGravacao.configProtecaoReusos,8);assert.equal(v.detalhesGravacao.abasConsultadas,4);assert.equal(v.detalhesGravacao.abasReutilizadas,12);assert.equal(v.detalhesGravacao.diarioPartes,3);assert.equal(v.detalhesGravacao.anexosAgrupados,1);assert.equal(v.detalhesGravacao.aplicarFlushes,1);assert.equal(v.detalhesGravacao.anoValoresMs,22);assert.equal(v.detalhesGravacao.anoFormulasMs,12);assert.equal(v.detalhesGravacao.anoValoresEvitadas,1);assert.equal(v.detalhesGravacao.diarioCaracteresPlano,45000);
 assert.equal(c.normalizarTemposServidorGestor(m.acao,{...m,detalhesGravacao:{resumoMs:NaN}}).detalhesGravacao,undefined);
});
test('cada chamada reseta tempos e envelope não modifica dados',()=>{
  const post=backend.slice(backend.indexOf('function doPost(e)'),backend.indexOf('// Função chamada pela interface hospedada'));
  let medir=true;
  const c=vm.createContext({ContentService:{MimeType:{JSON:'json'},createTextOutput:()=>({setMimeType(){},setContent(s){return JSON.parse(s);}})},propriedade_:()=> 'ficticio',referenciaRelogioServidorGestor_:()=>null,executarAcaoApi_:()=>{if(medir)vm.runInContext("TEMPOS_RESPOSTA_GESTOR_={versao:1,acao:'getDadosCompletos'}",c);return {valor:42};}});
  vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+post,c);
  const e={postData:{contents:JSON.stringify({apiToken:'ficticio',action:'getDadosCompletos'})}};
  assert.equal(c.doPost(e).temposGestor.versao,1);medir=false;
  const r=c.doPost(e);assert.equal(r.temposGestor,null);assert.equal(r.dados.valor,42);
});
test('diagnóstico limita histórico e remove conteúdo estranho, inválido ou de outra ação',()=>{
  let salvo=[];const c=vm.createContext({lerJSONLocalGestor:()=>salvo,gravarArmazenamentoGestor:(k,v)=>salvo=JSON.parse(v)});vm.runInContext(front,c);
  const m={versao:1,acao:'obterRelatorioMes',totalMs:100,esperaLockMs:5,preparacaoMs:10,execucaoMs:50,planoMs:5,gravacaoMs:20,outrosMs:10,token:'nao-copiar',dados:{privado:true}};
  for(let i=0;i<40;i++)c.registrarTemposServidorGestor(m.acao,m);
  assert.equal(salvo.length,30);assert(!JSON.stringify(salvo).includes('nao-copiar'));
  c.registrarTemposServidorGestor('salvarLancamentoWeb',m);assert.equal(salvo.length,30);
  assert.equal(c.normalizarTemposServidorGestor(m.acao,{...m,totalMs:NaN}),null);
  assert.equal(c.normalizarTemposServidorGestor(m.acao,null),null);
});
test('armazenamento indisponível não interrompe a resposta do app',()=>{
  const c=vm.createContext({lerJSONLocalGestor(){throw Error('sem espaço');},gravarArmazenamentoGestor(){throw Error('sem espaço');}});vm.runInContext(front,c);
  assert.doesNotThrow(()=>c.registrarTemposServidorGestor('getDadosCompletos',null));assert.equal(c.lerTemposServidorGestor().length,0);
  assert.equal((html.match(/registrarTemposServidorGestor\(action, (?:resultado|data)\.temposGestor\)/g)||[]).length,2);
});

test('diagnóstico aceita contadores de hash, sem serializar o cache de conteúdo',()=>{const c=vm.createContext({Date:{now:()=>1000},console:{log(){}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);const d={hashesCalculados:12,hashesReutilizados:20,hashesGrandesReutilizados:4,bytesHashesGrandes:20000,hashesGrandesGestor:{segredo:'não exportar'}};c.registrarTemposRespostaGestor_('salvarLancamentoWeb',0,0,0,0,0,0,d);const r=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));assert.equal(r.detalhesGravacao.hashesGrandesReutilizados,4);assert(!JSON.stringify(r).includes('segredo'));vm.runInContext(front,c);const n=c.normalizarTemposServidorGestor(r.acao,r);assert.equal(n.detalhesGravacao.bytesHashesGrandes,20000);assert.equal(n.detalhesGravacao.hashesCalculados,12);});

test('observação opcional correlaciona intervalo concorrente, não altera trava e ignora cache indisponível',()=>{
 let agora=1000;const mapa=new Map(),c=vm.createContext({Date:{now:()=>agora},console:{log(){}},CacheService:{getScriptCache:()=>({get:k=>mapa.get(k)||null,put:(k,v)=>mapa.set(k,v)})}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
 const rotina=c.observarOcupacaoGestor_('rotinaResumoPlanilhaGestor');agora=5000;c.concluirOcupacaoGestor_(rotina);agora=5500;const consulta=c.observarOcupacaoGestor_('getDadosCompletos',2000);
 assert.equal(consulta.concorrencia.acao,'rotinaResumoPlanilhaGestor');assert.equal(consulta.concorrencia.fimServidorMs,5000);assert.equal(consulta.concorrencia.indicativo,true);
 agora=6000;c.concluirOcupacaoGestor_(consulta);agora=8000;assert.equal(c.observarOcupacaoGestor_('getDadosCompletos',7000).concorrencia,null);
 c.CacheService.getScriptCache=()=>{throw Error('cache indisponível')};assert.equal(c.observarOcupacaoGestor_('salvarLancamentoWeb',1000),null);assert.doesNotThrow(()=>c.concluirOcupacaoGestor_(rotina));
});
test('concorrência e novas etapas são filtradas sem dados privados',()=>{const c=vm.createContext({Date:{now:()=>1000},console:{log(){}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);c.registrarTemposRespostaGestor_('getDadosCompletos',0,500,0,0,0,0,{abasValoresMs:10,abasFormulasMs:20,anoCelulasValores:100,observacaoMs:2,concorrencia:{acao:'protecaoBackup',inicioServidorMs:100,fimServidorMs:600,indicativo:true,senha:'privado'}});const r=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));vm.runInContext(front,c);const n=c.normalizarTemposServidorGestor(r.acao,r);assert.equal(n.concorrencia.acao,'protecaoBackup');assert.equal(n.detalhesGravacao.abasValoresMs,10);assert.equal(n.detalhesGravacao.observacaoMs,2);assert(!JSON.stringify(r).includes('privado'));});
test('transporte distingue proxy/Google e exporta somente cabeçalhos numéricos permitidos',()=>{let dados=[];const c=vm.createContext({Date,lerJSONLocalGestor:()=>dados,gravarArmazenamentoGestor:(k,v)=>dados=JSON.parse(v)});vm.runInContext(front,c);const h={'X-Gestor-Tempos':JSON.stringify({cabecalhosMs:100,corpoMs:20,token:'privado'}),'X-Gestor-Upstream-Status':'503','X-Gestor-Proxy-Codigo':'HTTP_GOOGLE','X-Gestor-Response-Bytes':'1024'};c.registrarTransporteConsultaGestor('getDadosCompletos',{status:502,headers:{get:k=>h[k]??null}},Date.now()-150,5);const r=c.lerTransportesDiagnosticoGestor()[0];assert.equal(r.http,502);assert.equal(r.googleHttp,503);assert.equal(r.codigoProxy,'HTTP_GOOGLE');assert.equal(r.proxyInstrumentado,true);assert.equal(r.proxyCabecalhosMs,100);assert(!JSON.stringify(r).includes('privado'));dados.push({...r,token:'segredo'});assert(!JSON.stringify(c.lerTransportesDiagnosticoGestor()).includes('segredo'));c.gravarArmazenamentoGestor=()=>{throw Error('cheio')};assert.doesNotThrow(()=>c.registrarTransporteConsultaGestor('getDadosCompletos',{status:502,headers:{get:()=>null}},Date.now()));});

test('entrada doPost mede preparação/ação/serialização e preserva dados e identificadores financeiros',()=>{let agora=1000;const post=backend.slice(backend.indexOf('function doPost(e)'),backend.indexOf('// Função chamada pela interface hospedada'));const c=vm.createContext({Date:{now:()=>agora},ContentService:{MimeType:{JSON:'json'},createTextOutput:()=>({setMimeType(){},setContent:s=>JSON.parse(s)})},propriedade_:()=>{agora+=20;return 'ficticio'},referenciaRelogioServidorGestor_:()=>{agora+=5;return null},executarAcaoApi_:(acao,param)=>{assert.equal(param.requestId,'financeiro-original');agora+=100;return {valor:42}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+post,c);const d={versao:1,chamada:'a'.repeat(32),pagina:'b'.repeat(32),senha:'não copiar'},r=c.doPost({postData:{contents:JSON.stringify({apiToken:'ficticio',action:'salvarLancamentoWeb',param:{requestId:'financeiro-original'},diagnostico:d})}});assert.equal(r.dados.valor,42);assert.equal(r.entradaGestor.preparacaoMs,20);assert.equal(r.entradaGestor.acaoMs,100);assert.equal(r.entradaGestor.relogioMs,5);assert.equal(r.entradaGestor.chamada,d.chamada);assert(!JSON.stringify(r.entradaGestor).includes('senha'));assert.equal(c.RASTRO_CHAMADA_GESTOR_,null);const negado=c.doPost({postData:{contents:JSON.stringify({apiToken:'errado',action:'getDadosCompletos',diagnostico:d})}});assert.equal(negado.sucesso,false);assert.equal(negado.entradaGestor,undefined);});
test('entrada normaliza campos e página é temporária enquanto chamada muda a cada envio',()=>{let salvo=[];const c=vm.createContext({Date,lerJSONLocalGestor:()=>salvo,gravarArmazenamentoGestor:(k,v)=>salvo=JSON.parse(v)});vm.runInContext(front,c);const a=c.criarRastroDiagnosticoGestor(),b=c.criarRastroDiagnosticoGestor();assert.equal(a.pagina,b.pagina);assert.notEqual(a.chamada,b.chamada);assert.match(a.chamada,/^[a-f0-9]{32}$/);const e={versao:1,acao:'getDadosCompletos',inicioServidorMs:1000,fimMedidoServidorMs:1200,preparacaoMs:10,acaoMs:180,relogioMs:5,serializacaoMs:5,totalMedidoMs:200,...a,senha:'privado'};c.registrarEntradaServidorDiagnosticoGestor(e.acao,e);const r=c.lerEntradasServidorDiagnosticoGestor()[0];assert.equal(r.chamada,a.chamada);assert(!JSON.stringify(r).includes('privado'));assert.equal(c.normalizarEntradaServidorGestor(e.acao,{...e,acaoMs:NaN}),null);});
