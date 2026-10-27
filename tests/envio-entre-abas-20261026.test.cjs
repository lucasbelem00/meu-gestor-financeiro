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
