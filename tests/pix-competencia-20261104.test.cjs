const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,launch,personal}=require('./fixtures/gestor-mocks.cjs');
const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
function ambiente(anual){const a=anual?ambienteProtecao(fixture()):boot(fixture());a.ctx.getHojeSeguro=()=>new Date(2026,10,4);if(anual){a.ativar();a.ctx.ativarOrganizacaoAnualWeb();}return a;}
function linhas(a,anual){return anual?a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos').slice(1):a.db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[11]);}
test('Pix agendado fora dos cinquenta últimos lançamentos continua disponível para os avisos',()=>{
 const a=boot(fixture([personal('Pix antigo',30,'1/1','10/2026','Agendado','Pix','01/10/2026'),...Array.from({length:60},(_,i)=>personal('Pago '+i,10,'1/1','10/2026','Pago'))]));a.ctx.getHojeSeguro=()=>new Date(2026,10,4);
 const d=api(a,'getDadosCompletos');assert.equal(d.lancamentos.length,50);assert(!d.lancamentos.some(r=>r[1]==='Pix antigo'));assert.equal(d.pixAgendados.length,1);assert.equal(d.pixAgendados[0].descricao,'Pix antigo');
});
for(const anual of [false,true]){
 test('corrigir agendamento exige confirmação, registra uma vez e permite desfazer, anual='+anual,()=>{
  const a=ambiente(anual),p={...launch,formaPagto:'Pix',dataCompra:'10/11/2026',mesPrimeiraFatura:'11/2026',numParcelas:1,requestId:'pix-agendado-inicial'};api(a,'salvarLancamentoWeb',p);const r=linhas(a,anual)[0];assert.equal(r[9],'Agendado');assert.equal(api(a,'getDadosCompletos').pixAgendados.length,1);
  const ed={registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[1],mesOriginal:'11/2026',parcelaOriginal:'1/1',dataCompra:'25/10/2026',descricao:r[1],formaPagto:'Pix',categoria:'Teste',valorParcela:r[7],mesFatura:'11/2026',status:'Pago',tags:'',requestId:'pix-confirmar-pagamento'};
  assert.throws(()=>api(a,'editarLancamentoLinhaWeb',ed),/Conferir fatura/);
  const pago={...ed,confirmarPagamentoImediato:true};api(a,'editarLancamentoLinhaWeb',pago);assert.equal(linhas(a,anual)[0][9],'Pago');assert.equal(linhas(a,anual)[0][17],100);assert.equal(api(a,'getDadosCompletos').pixAgendados.length,0);
  api(a,'editarLancamentoLinhaWeb',pago);assert.equal(linhas(a,anual).length,1);
  api(a,'desfazerAtividadeWeb',{eventoId:'editarLancamentoLinhaWeb:'+pago.requestId,requestId:'pix-desfazer-confirmacao'});assert.equal(linhas(a,anual)[0][9],'Agendado');assert.equal(linhas(a,anual)[0][17],0);
 });
 test('confirmar não permite pagamento futuro, cartão ou parcelamento, anual='+anual,()=>{
  const a=ambiente(anual);api(a,'salvarLancamentoWeb',{...launch,formaPagto:'Pix',dataCompra:'10/11/2026',mesPrimeiraFatura:'11/2026',numParcelas:1,requestId:'pix-limites-inicial'});const r=linhas(a,anual)[0],ed={registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[1],mesOriginal:'11/2026',parcelaOriginal:'1/1',dataCompra:'10/11/2026',descricao:r[1],formaPagto:'Pix',categoria:'Teste',valorParcela:r[7],mesFatura:'11/2026',status:'Pago',tags:'',confirmarPagamentoImediato:true,requestId:'pix-recusar-futuro'};
  assert.throws(()=>api(a,'editarLancamentoLinhaWeb',ed),/data de hoje ou passada/);
  assert.throws(()=>api(a,'editarLancamentoLinhaWeb',{...ed,requestId:'pix-recusar-cartao',dataCompra:'25/10/2026',formaPagto:'Cartao'}),/data de hoje ou passada/);assert.equal(linhas(a,anual)[0][9],'Agendado');
  api(a,'salvarLancamentoWeb',{...launch,formaPagto:'Pix',dataCompra:'10/11/2026',mesPrimeiraFatura:'11/2026',numParcelas:3,pixParcelado:true,requestId:'pix-parcelado-inicial'});const parcela=linhas(a,anual).find(x=>x[11]!==r[11]);
  assert.throws(()=>api(a,'editarLancamentoLinhaWeb',{...ed,registroId:parcela[11],compraId:parcela[12],versao:parcela[13],parcelaOriginal:parcela[6],dataCompra:'25/10/2026',valorParcela:parcela[7],requestId:'pix-recusar-parcelado'}),/data de hoje ou passada/);
 });
 test('Pix novo com data passada e competência seguinte nasce pago, anual='+anual,()=>{
  const a=ambiente(anual);
  for(const [i,data]of ['25/10/2026','26/10/2026'].entries())api(a,'salvarLancamentoWeb',{...launch,numParcelas:1,formaPagto:'Pix',dataCompra:data,mesPrimeiraFatura:'11/2026',requestId:'pix-passado-'+i});
  assert(linhas(a,anual).every(r=>r[9]==='Pago'));
  const h=api(a,'filtrarLancamentosWeb',{filtros:{},offset:0,limite:50});assert.equal(h.itens.length,2);assert(h.itens.every(r=>r[9]==='Pago'));
 });
 test('mudar competência de dezembro para novembro persiste no Histórico e Mensal, anual='+anual,()=>{
  const a=ambiente(anual);api(a,'salvarLancamentoWeb',{...launch,dataCompra:'04/11/2026',mesPrimeiraFatura:'12/2026',numParcelas:1,requestId:'competencia-novo-001'});
  const r=linhas(a,anual)[0];const ed=api(a,'editarLancamentoLinhaWeb',{registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[1],mesOriginal:'12/2026',parcelaOriginal:'1/1',dataCompra:'04/11/2026',descricao:r[1],formaPagto:'Cartao',categoria:'Teste',valorParcela:r[7],mesFatura:'11/2026',status:r[9],tags:'',incluirAtualizacaoDados:true,requestId:'competencia-editar-001'});
  assert.equal(String(linhas(a,anual)[0][8]).replace(/^'/,''),'11/2026');
  assert.equal(api(a,'filtrarLancamentosWeb',{filtros:{mes:'12/2026'},offset:0,limite:50}).qtdTotal,0);
  assert.equal(api(a,'filtrarLancamentosWeb',{filtros:{mes:'11/2026'},offset:0,limite:50}).qtdTotal,1);
  assert.equal(api(a,'obterRelatorioMes','12/2026').kpis.total,'R$ 0,00');assert.equal(api(a,'obterRelatorioMes','11/2026').kpis.total,'R$ 100,00');
  if(ed.atualizacaoDados)assert(ed.atualizacaoDados.dados.lancamentos.every(x=>x[8]==='11/2026'));
 });
}
