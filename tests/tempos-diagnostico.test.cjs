const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const backend=fs.readFileSync('Backend/Code.gs','utf8'),html=fs.readFileSync('index.html','utf8');
const helper=backend.slice(backend.indexOf('function registrarTemposRespostaGestor_'),backend.indexOf('// Executar manualmente'));
const front=html.slice(html.indexOf('function normalizarTemposServidorGestor'),html.indexOf('function registrarDiagnosticoAtividadeGestor'));
test('tempos incluem apenas ação e durações e sobrevivem a falha do log',()=>{
  const c=vm.createContext({Date:{now:()=>1000},console:{log(){throw Error('log indisponível');}}});
  vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
  vm.runInContext("registrarTemposRespostaGestor_('salvarLancamentoWeb',0,100,200,300,100,800)",c);
  const r=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));
  assert.equal(r.totalMs,1000);assert.equal(r.gravacaoMs,200);assert.equal(r.outrosMs,100);
});
test('subetapas preservam retorno e erro e expõem somente durações permitidas',()=>{
 let agora=0;const c=vm.createContext({Date:{now:()=>agora},console:{log(){}}});vm.runInContext('let TEMPOS_RESPOSTA_GESTOR_=null;'+helper,c);
 const d={};assert.equal(c.medirEtapaGravacaoGestor_(d,'resumoMs',()=>{agora=50;return 7;}),7);
 assert.throws(()=>c.medirEtapaGravacaoGestor_(d,'aplicacaoMs',()=>{agora=100;throw Error('interrompido');}),/interrompido/);
 assert.equal(d.resumoMs,50);assert.equal(d.aplicacaoMs,50);
 c.registrarTemposRespostaGestor_('salvarLancamentoWeb',0,0,0,0,0,1,{...d,senha:'privada'});
 const m=JSON.parse(vm.runInContext('JSON.stringify(TEMPOS_RESPOSTA_GESTOR_)',c));
 vm.runInContext(front,c);const v=c.normalizarTemposServidorGestor(m.acao,m);
 assert.equal(v.detalhesGravacao.resumoMs,50);assert(!JSON.stringify(v).includes('privada'));
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
