const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan}=require('./fixtures/gestor-mocks.cjs');
function preparar(){
  const {ctx,db}=boot(fixture([personal('Pessoal',100)],[loan('Pessoa fictícia','Recebido',208,'Cartao')]));
  ctx.executarAcaoApi_('getDadosCompletos',null);
  return {ctx,db};
}
test('fatura só com terceiros recebidos não aparece zerada quando o mês é uma data',()=>{
  const {ctx,db}=boot(fixture([],[loan('Pessoa fictícia','Recebido',208,'Cartao')]));ctx.executarAcaoApi_('getDadosCompletos',null);
  db.sheets['Empréstimos'].rows[1][8]=new Date(2026,9,1);
  const f=ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});
  assert.equal(f.total,208);assert.equal(f.pago,0);assert.equal(f.restante,208);assert.equal(f.itens.length,1);
});
test('conferência inclui empréstimo com mês armazenado como data do Sheets',()=>{
  const {ctx,db}=preparar();db.sheets['Empréstimos'].rows[1][8]=new Date(2026,9,1);
  const f=ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});
  assert.equal(f.total,308);assert.equal(f.restante,308);assert.equal(f.itens.length,2);
});
test('meses como data respeitam mês e ano, sem misturar faturas',()=>{
  const {ctx,db}=preparar();db.sheets['Lançamentos'].rows[1][8]=new Date(2026,9,1);db.sheets['Empréstimos'].rows[1][8]=new Date(2027,9,1);
  assert.equal(ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'}).total,100);
  assert.equal(ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2027'}).total,208);
});
test('resumo formata data, mês e parcela sem modificar o registro original',()=>{
  const {ctx,db}=preparar(),r=db.sheets['Empréstimos'].rows[1];
  r[0]=new Date(2026,9,17);r[6]=new Date(2026,11,7);r[8]=new Date(2026,9,1);
  const antes=ctx.hashRegistroGestor_(r),s=ctx.resumirRegistroAtividade_(r,'Empréstimos');
  assert.equal(s.data,'17/10/2026');assert.equal(s.mes,'10/2026');assert.equal(s.parcela,'7/12');
  assert.equal(ctx.hashRegistroGestor_(r),antes);assert(r[6] instanceof Date);assert(r[8] instanceof Date);
});
test('resumo preserva texto literal, parcela fixa e parcelas acima de doze',()=>{
  const {ctx,db}=preparar(),r=db.sheets['Empréstimos'].rows[1];
  r[8]="'10/2026";for(const parcela of ['∞/∞','7/12','24/48']){r[6]="'"+parcela;const s=ctx.resumirRegistroAtividade_(r,'Empréstimos');assert.equal(s.mes,'10/2026');assert.equal(s.parcela,parcela);}
});
test('data inválida não é apresentada como fatura sem saldo',()=>{
  const {ctx,db}=preparar();db.sheets['Empréstimos'].rows[1][8]=new Date(NaN);
  assert.throws(()=>ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'}),/data inválida/);
});
test('pagamento de empréstimo com células de data preserva recebimento e protege reenvios',()=>{
  const {ctx,db}=preparar(),r=db.sheets['Empréstimos'].rows[1];
  r[8]=new Date(2026,9,1);r[6]=new Date(2026,11,7);
  ctx.executarAcaoApi_('getDadosCompletos',null);
  const consultar=()=>ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});
  const previa=ctx.previaPagamentoFaturaWeb({forma:'Cartao',mesFatura:'10/2026',valor:150});
  const pedido={...previa,requestId:'pagamento-data-ficticio-001'};
  ctx.registrarPagamentoFaturaWeb(pedido);ctx.registrarPagamentoFaturaWeb(pedido);
  assert.equal(consultar().pago,150);assert.equal(consultar().restante,158);
  assert.equal(db.sheets['Empréstimos'].rows[1][9],'Recebido');assert.equal(db.sheets['Empréstimos'].rows[1][17],50);
  const ultima=ctx.previaPagamentoFaturaWeb({forma:'Cartao',mesFatura:'10/2026',valor:158});
  ctx.registrarPagamentoFaturaWeb({...ultima,requestId:'pagamento-data-ficticio-002'});
  assert.equal(consultar().restante,0);assert.equal(db.sheets['Empréstimos'].rows[1][14],'Pago');assert.equal(db.sheets['Empréstimos'].rows[1][9],'Recebido');
});
test('parcela guardada como data participa da ordem correta da prévia de pagamento',()=>{
  const a=personal('Mesma compra',50,'2/12'),b=personal('Mesma compra',50,'1/12');
  const {ctx,db}=boot(fixture([a,b],[]));ctx.executarAcaoApi_('getDadosCompletos',null);
  db.sheets['Lançamentos'].rows[1][6]=new Date(2026,11,2);db.sheets['Lançamentos'].rows[2][6]=new Date(2026,11,1);
  const previa=ctx.previaPagamentoFaturaWeb({forma:'Cartao',mesFatura:'10/2026',valor:50});
  assert.equal(previa.aplicacoes.length,1);assert.equal(previa.aplicacoes[0].resumo.parcela,'1/12');
});

test('mensal, anual e histórico reconhecem data nativa sem depender da máscara da planilha',()=>{
  const {ctx,db}=boot(fixture([personal('Pessoal',100)],[loan('Pessoa fictícia','A Receber',70,'Cartao')]));
  ctx.executarAcaoApi_('getDadosCompletos',null);
  for(const nome of ['Lançamentos','Empréstimos']){
    const r=db.sheets[nome].rows[1];r[0]=new Date(2026,9,17);r[6]=new Date(2026,11,7);r[8]=new Date(2026,9,1);
  }
  const antes=JSON.stringify(['Lançamentos','Empréstimos'].map(nome=>db.sheets[nome].rows[1].slice(0,11)));
  const mes=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');
  assert.equal(mes.totalRaw,100);assert.equal(mes.terceiros.totalRaw,70);assert.equal(mes.lancamentos[0][0],'17/10/2026');assert.equal(mes.lancamentos[0][6],'7/12');assert.equal(mes.lancamentos[0][8],'10/2026');
  assert.equal(mes.terceiros.itens[0].mes,'10/2026');assert.equal(mes.terceiros.itens[0].parcela,'7/12');
  const ano=ctx.executarAcaoApi_('obterRelatorioAnual',2026);
  assert.equal(ano.totalRaw,100);assert.equal(ano.terceiros.totalRaw,70);assert.equal(ano.graficoMeses[9],100);
  const historico=ctx.executarAcaoApi_('filtrarLancamentosWeb',{filtros:{ano:'2026',mes:'10/2026'},offset:0,limite:50});
  assert.equal(historico.itens.length,1);assert.equal(historico.itens[0][6],'7/12');
  assert.equal(ctx.executarAcaoApi_('obterRelatorioMes','10/2027').totalRaw,0);
  assert.equal(JSON.stringify(['Lançamentos','Empréstimos'].map(nome=>db.sheets[nome].rows[1].slice(0,11))),antes);
});

test('data nativa inválida não vira relatório mensal silenciosamente zerado',()=>{
  for(const nome of ['Lançamentos','Empréstimos']){
    const {ctx,db}=boot(fixture([personal('Pessoal',100)],[loan('Pessoa fictícia','A Receber',70,'Cartao')]));ctx.executarAcaoApi_('getDadosCompletos',null);
    db.sheets[nome].rows[1][8]=new Date(NaN);
    assert.throws(()=>ctx.executarAcaoApi_('obterRelatorioMes','10/2026'),/data inválida|Invalid time value/);
  }
});
