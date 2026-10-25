const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,clone}=require('./fixtures/gestor-mocks.cjs');
const ler=ctx=>ctx.executarAcaoApi_('getDadosCompletos',null);

test('pagamento de uma fatura grande prepara os controles em blocos e conserva outras faturas',()=>{
  const quantidade=100,proximas=personal('Outro mês',77,'1/1','11/2026');proximas[7]='=77';
  const compras=Array.from({length:quantidade},(_,i)=>personal('Compra '+i,10));compras.splice(50,0,proximas);
  const {ctx,db}=boot(fixture(compras,[loan('Ana','A Receber',35,'Cartao')]));ler(ctx);
  const fora=clone(db.sheets['Lançamentos'].rows.find(r=>r[1]==='Outro mês'));
  const previa=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:1035});
  let migracoes=0;const original=ctx.migrarIdentidadesGestor_;ctx.migrarIdentidadesGestor_=function(...args){migracoes++;return original(...args);};
  const pedido={...previa,requestId:'desempenho-fatura-grande-001'};ctx.registrarPagamentoFaturaWeb(pedido);
  assert(migracoes<=10,'Os controles não podem ser recalculados para cada um dos 101 itens: '+migracoes);
  const f=ctx.executarAcaoApi_('obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'});assert.equal(f.total,1035);assert.equal(f.pago,1035);assert.equal(f.restante,0);
  assert.deepEqual(db.sheets['Lançamentos'].rows.find(r=>r[11]===fora[11]),fora);assert.equal(db.sheets['Empréstimos'].rows[1][9],'A Receber');
  const estado=JSON.stringify(db.sheets['Lançamentos'].rows);ctx.registrarPagamentoFaturaWeb(pedido);assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),estado);
  const evento=ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0];assert.equal(evento.quantidade,101);assert.equal(evento.podeDesfazer,true);
  migracoes=0;ctx.desfazerAtividadeWeb({eventoId:evento.id,requestId:'desempenho-fatura-desfazer-001'});
  assert(migracoes<=10,'Desfazer deve preparar os controles por aba: '+migracoes);
  assert.deepEqual(db.sheets['Lançamentos'].rows.find(r=>r[11]===fora[11]),fora);
  assert.equal(ctx.executarAcaoApi_('obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).pago,0);assert.equal(db.sheets['Empréstimos'].rows[1][9],'A Receber');
});

test('mudar somente a data combinada aumenta a versão, protege outra tela e permite desfazer',()=>{
  const {ctx,db}=boot(fixture([],[loan('Ana','A Receber',120,'Cartao')]));ler(ctx);
  const r=clone(db.sheets['Empréstimos'].rows[1]);
  const pedido={registroId:r[11],compraId:r[12],versao:r[13],linha:2,dataCompra:r[0],pessoa:r[1],descricao:r[2],formaPagto:r[3],valorParcela:r[7],mesFatura:r[8],status:r[9],observacao:r[10],descOriginal:r[2],mesOriginal:r[8],parcelaOriginal:r[6],dataCombinada:'25/10/2026',requestId:'data-combinada-versao-001'};
  ctx.editarEmprestimoLinhaWeb(pedido);
  const atual=db.sheets['Empréstimos'].rows[1];assert.equal(atual[13],Number(r[13])+1);assert.notEqual(ctx.hashRegistroGestor_(atual),ctx.hashRegistroGestor_(r));assert.equal(ctx.dataCombinadaEmprestimoGestor_(atual),'25/10/2026');
  assert.throws(()=>ctx.editarEmprestimoLinhaWeb({...pedido,dataCombinada:'26/10/2026',requestId:'data-combinada-versao-002'}),/mudou em outra/);
  const evento=ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0];assert.equal(evento.quantidade,1);assert.equal(evento.podeDesfazer,true);
  ctx.desfazerAtividadeWeb({eventoId:evento.id,requestId:'data-combinada-desfazer-001'});assert.equal(ctx.dataCombinadaEmprestimoGestor_(db.sheets['Empréstimos'].rows[1]),'');
});

test('leituras iguais não repetem manutenção e detectam alteração direta, novo dia e cache inválido',()=>{
  const {ctx,db,props}=boot(fixture([personal('Compra',100)]));let manutencoes=0;const original=ctx.processarAssinaturasAutomaticas;
  ctx.processarAssinaturasAutomaticas=function(...args){manutencoes++;return original(...args);};
  const primeira=ler(ctx),linhasDiario=db.sheets['_Gestor_Operacoes'].getLastRow();assert.equal(manutencoes,1);
  const segunda=ler(ctx);assert.equal(manutencoes,1);assert.equal(db.sheets['_Gestor_Operacoes'].getLastRow(),linhasDiario);assert.equal(segunda.kpis.comprometimentoMes,primeira.kpis.comprometimentoMes);
  db.sheets['Lançamentos'].rows[1][7]=125;
  const alterada=ler(ctx);assert.equal(manutencoes,2);assert.equal(alterada.kpis.comprometimentoMes,'R$ 125,00');
  ctx.getHojeSeguro=()=>new Date(2026,9,17);ler(ctx);assert.equal(manutencoes,3);
  props.set('GESTOR_MANUTENCAO_V1','cache inválido');ler(ctx);assert.equal(manutencoes,4);
  db.sheets['Dashboard & Resumo'].rows[16][3]=300;ler(ctx);assert.equal(manutencoes,5);
});
