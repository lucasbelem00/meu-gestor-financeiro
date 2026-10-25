const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const fonte=fs.readFileSync(require('node:path').join(__dirname,'../interface/restauracao.js'),'utf8').split("document.addEventListener('DOMContentLoaded'")[0];
const backup=nome=>({formato:'gestor-financeiro-backup-v1',planilha:nome,abas:[{nome:'Lançamentos',valores:[['Data'],[nome]]}]});
const arquivo=b=>({name:b.planilha+'.json',size:JSON.stringify(b).length,text:async()=>JSON.stringify(b)});
const tick=()=>new Promise(r=>setImmediate(r));
function ambiente(api,extras={}){const guardados=new Map(),chamadas=[];let id=0;const c=vm.createContext({console,TextEncoder,Uint8Array,Date,Set,Map,JSON,window:{crypto:crypto.webcrypto}});vm.runInContext(fonte,c);const ctrl=c.criarControleRestauracaoGestor({api:async(a,p)=>{chamadas.push({a,p});return api(a,p);},hash:async s=>crypto.createHash('sha256').update(s).digest('hex'),idNovo:()=> 'restauracao-ui-'+(++id),ler:k=>guardados.get(k),salvar:(k,v)=>{guardados.set(k,v);return true;},guardarBloqueio:id=>{guardados.set('bloqueio',id);return true;},remover:k=>guardados.delete(k),validarDisponibilidade(){},aposConfirmar:async()=>true,...extras});return {ctrl,guardados,chamadas};}
test('resposta antiga e confirmação antiga não selecionam nem restauram outro arquivo',async()=>{
 const pedidos=[],a=ambiente((acao,p)=>new Promise(resolve=>pedidos.push({acao,p,resolve})));const primeira=a.ctrl.selecionarArquivo(arquivo(backup('A')));await tick();const segunda=a.ctrl.selecionarArquivo(arquivo(backup('B')));await tick();pedidos[1].resolve({planilha:'B',hashBackup:'hash-B',versaoAtual:'v-B'});await segunda;pedidos[0].resolve({planilha:'A'});await primeira;assert.equal(a.ctrl.estado.resumo.planilha,'B');
 const snapshot=a.ctrl.capturarConfirmacao();const terceira=a.ctrl.selecionarArquivo(arquivo(backup('C')));await tick();pedidos[2].resolve({planilha:'C'});await terceira;await assert.rejects(()=>a.ctrl.confirmar(snapshot),/seleção mudou/);assert(!a.chamadas.some(c=>c.a==='restaurarBackupDadosWeb'));
});
test('perda da confirmação conserva requestId e bloqueio em vez de iniciar outra restauração',async()=>{
 const a=ambiente((acao)=>{if(acao==='restaurarBackupDadosWeb')throw Object.assign(Error('resposta perdida'),{resultadoIncerto:true});return {planilha:'Destino',hashBackup:'hash',versaoAtual:'v'};});await a.ctrl.selecionarArquivo(arquivo(backup('A')));const s=a.ctrl.capturarConfirmacao();assert.equal(await a.ctrl.confirmar(s),false);assert.equal(a.guardados.get('bloqueio'),s.requestId);assert.equal(a.ctrl.capturarConfirmacao(),null);assert.match(a.ctrl.estado.mensagem,/mesmo envio/);
});
test('falha ao atualizar depois de confirmação não transforma restauração salva em erro',async()=>{
 const a=ambiente(()=>({planilha:'Destino',hashBackup:'hash',versaoAtual:'v'}),{aposConfirmar:async()=>false});await a.ctrl.selecionarArquivo(arquivo(backup('A')));assert.equal(await a.ctrl.confirmar(a.ctrl.capturarConfirmacao()),true);assert.equal(a.ctrl.estado.erro,false);assert.match(a.ctrl.estado.mensagem,/restaurados.*tela ainda precisa atualizar/);
});
test('armazenamento indisponível bloqueia envio financeiro e arquivo inválido não ganha prévia',async()=>{
 const a=ambiente(()=>({planilha:'Destino',hashBackup:'hash',versaoAtual:'v'}),{guardarBloqueio:()=>false});await a.ctrl.selecionarArquivo(arquivo(backup('A')));assert.equal(await a.ctrl.confirmar(a.ctrl.capturarConfirmacao()),false);assert(!a.chamadas.some(c=>c.a==='restaurarBackupDadosWeb'));await a.ctrl.selecionarArquivo({name:'errado.json',size:10,text:async()=>'{errado'});assert.equal(a.ctrl.estado.resumo,null);assert.match(a.ctrl.estado.mensagem,/JSON válido/);
});
test('upload grande interrompido retoma partes e mantém referência pequena no envio financeiro',async()=>{
 let falhar=true,recebidas=new Set();const a=ambiente((acao,p)=>{
  if(acao==='iniciarImportacaoBackupWeb')return {recebidas:[...recebidas],expiraEm:Date.now()+86400000};
  if(acao==='enviarPartesBackupWeb'){for(const x of p.partes)recebidas.add(x.parte);if(falhar){falhar=false;throw Error('rede');}return {};}
  if(acao==='previaRestauracaoBackupWeb')return {planilha:'Destino',hashBackup:'hash',versaoAtual:'v'};
  return {};
 });const b=backup('Grande');b.abas[0].valores.push(['á'.repeat(400000)]);await a.ctrl.selecionarArquivo(arquivo(b));assert.equal(a.ctrl.estado.resumo,null);const id=a.chamadas.find(c=>c.a==='iniciarImportacaoBackupWeb').p.importacaoId;await a.ctrl.selecionarArquivo(arquivo(b));assert.equal(a.chamadas.filter(c=>c.a==='iniciarImportacaoBackupWeb')[1].p.importacaoId,id);const segundoEnvio=a.chamadas.filter(c=>c.a==='enviarPartesBackupWeb')[1];assert(segundoEnvio.p.partes[0].parte>20);
 assert.equal(await a.ctrl.confirmar(a.ctrl.capturarConfirmacao()),true);const pedido=a.chamadas.find(c=>c.a==='restaurarBackupDadosWeb').p;assert.equal(pedido.importacaoId,id);assert.equal(pedido.backup,undefined);assert(JSON.stringify(pedido).length<500);
});
