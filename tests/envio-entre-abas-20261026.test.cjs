const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteEnvio}=require('./fixtures/envio-rascunho-ui.cjs');
for(const online of [true,false])test('cópia herdada enviada '+(online?'online':'offline')+' impede segundo lançamento da página original',async()=>{
 const a=ambienteEnvio(),p=a.pagina(online),q=a.herdar(p,'novo',online);await q.enviar();await p.enviar();if(!online){assert.equal(a.fila().length,1);for(const item of a.fila())a.backend.ctx.salvarLancamentoWeb(item);}assert.equal(a.linhas().length,1);assert.equal(a.linhas()[0][7],25.5);assert(p.avisos.some(v=>/já enviado|já guardado/.test(v[0])));assert.equal(p.el('inpDesc').value,'Almoço fictício');
});
test('envios concorrentes da mesma origem conservam um único registro',async()=>{
 const a=ambienteEnvio(),p=a.pagina(),q=a.herdar(p);await Promise.all([p.enviar(),q.enviar()]);assert.equal(a.linhas().length,1);assert(a.envios.every(e=>e.requestId===a.envios[0].requestId));
});
test('identificador continua o mesmo se o recibo visual local foi removido',async()=>{
 const a=ambienteEnvio(),p=a.pagina(),q=a.herdar(p);await q.enviar();for(const k of [...a.local.m.keys()])if(k.startsWith('gestorRascunhoEnvioV1:'))a.local.removeItem(k);await p.enviar();assert.equal(a.linhas().length,1);assert.equal(a.envios[0].requestId,a.envios[1].requestId);
});
test('preenchimentos independentes iguais e uma repetição consciente continuam permitidos',async()=>{
 const a=ambienteEnvio(),p=a.pagina(),q=a.pagina();await p.enviar();await q.enviar();assert.equal(a.linhas().length,2);assert.notEqual(a.envios[0].requestId,a.envios[1].requestId);
 for(const [id,v]of Object.entries({inpDataDia:'26',inpDataMes:'10',inpDataAno:'2026',inpData:'26/10/2026',inpMesFat:'10/2026',inpDesc:'Almoço fictício',inpValor:'25.50',selForma:'Cartao',selCat:'Teste',inpParc:'1',inpParcIni:'1'}))p.el(id).value=v;await p.enviar();assert.equal(a.linhas().length,3);
});
test('conteúdo alterado na página original não é confundido com a cópia enviada',async()=>{
 const a=ambienteEnvio(),p=a.pagina(),q=a.herdar(p);await q.enviar();p.el('inpDesc').value='Outra compra';p.guardar();await p.enviar();assert.equal(a.linhas().length,2);assert.notEqual(a.envios[0].requestId,a.envios[1].requestId);
});
test('empréstimo herdado confirma uma única gravação e limpa só a cópia enviada',async()=>{
 const a=ambienteEnvio(),p=a.pagina(),q=a.herdar(p,'emp');await q.enviar(true);await p.enviar(true);assert.equal(a.linhas(true).length,1);assert.equal(q.el('inpEmpPessoa').value,'');assert.equal(p.el('inpEmpPessoa').value,'Ana');
});
test('falha de armazenamento antes da reserva impede envio e conserva o formulário',async()=>{
 const a=ambienteEnvio(),p=a.pagina();p.c.gravarArmazenamentoGestor=()=>{throw Error('Sem espaço');};await p.enviar();assert.equal(a.envios.length,0);assert.equal(p.el('inpDesc').value,'Almoço fictício');assert.equal(p.c.salvandoGastoTrava,false);
});

test('aviso do empréstimo distingue formulário concluído de alteração durante o envio',async()=>{const a=ambienteEnvio(),p=a.pagina();await p.enviar(true);assert(p.avisos.some(v=>v[0]==='Sincronizado'&&v[1]==='O empréstimo foi confirmado na lista de Empréstimos.'));const q=a.pagina(),api=q.c.apiCall;q.c.apiCall=async(...args)=>{const r=await api(...args);q.el('inpEmpDesc').value='Outro rascunho';return r;};await q.enviar(true);assert.equal(q.el('inpEmpDesc').value,'Outro rascunho');assert(q.avisos.some(v=>v[0]==='Sincronizado'&&/campos atuais foram preservados/.test(v[1])));});

function instalarMedicaoNaPagina(p){
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('index.html','utf8');
 const de=html.indexOf('const chaveTemposLancamentoGestor'),ate=html.indexOf('function montarDiagnosticoGestor(',de);
 vm.runInContext(html.slice(de,ate),p.c);
}
test('Novo mede preparação, chamada e confirmação em quadros separados',async()=>{
 const a=ambienteEnvio(),p=a.pagina();instalarMedicaoNaPagina(p);p.el('inpParc').value='3';
 let agora=100;const quadros=[];
 p.c.performance={now:()=>agora};p.c.document.visibilityState='visible';p.c.requestAnimationFrame=fn=>quadros.push(fn);
 const preparar=p.c.prepararEnvioRascunhoFinanceiroGestor,api=p.c.apiCall;
 p.c.prepararEnvioRascunhoFinanceiroGestor=async(...v)=>{const r=await preparar(...v);agora+=8;return r;};
 p.c.apiCall=async(...v)=>{const r=await api(...v);agora+=100;return r;};
 p.c.mostrarAviso=()=>{agora+=3;return {_timerAviso:1,classList:{contains:c=>c==='opacity-100'}};};
 await p.enviar();assert.equal(p.c.lerTemposLancamentoGestor().length,0);
 agora+=12;quadros.shift()();agora+=16;quadros.shift()();
 const [m]=p.c.lerTemposLancamentoGestor();
 assert.deepEqual(JSON.parse(JSON.stringify(m)),{tipo:'parcelado',resultado:'confirmado',data:m.data,preparacaoMs:8,apiMs:100,ateRetornoMs:111,ateConfirmacaoVisivelMs:139});
 const salvo=a.local.getItem('gestorTemposLancamentoV1');
 a.local.setItem('gestorTemposLancamentoV1',JSON.stringify([{...JSON.parse(salvo)[0],descricao:'privada',valor:25,requestId:'id'}]));
 assert.deepEqual(Object.keys(p.c.lerTemposLancamentoGestor()[0]),Object.keys(m));
});
test('confirmação incerta e fila offline não ganham tempo de confirmação visível',async()=>{
 for(const online of [true,false]){
  const a=ambienteEnvio({falhar:true}),p=a.pagina(online);instalarMedicaoNaPagina(p);
  await p.enviar();
  const [m]=p.c.lerTemposLancamentoGestor();
  assert.equal(m.tipo,'avista');assert.equal(m.resultado,online?'em_conferencia':'fila_offline');
  assert.equal(m.ateConfirmacaoVisivelMs,undefined);
  assert.equal(typeof m.apiMs,online?'number':'undefined');
 }
});
