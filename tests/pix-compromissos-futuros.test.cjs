const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,launch,clone}=require('./fixtures/gestor-mocks.cjs');
const ler=ctx=>ctx.executarAcaoApi_('getDadosCompletos',null);
const pix=d=>d.formasPagamento.find(f=>f.tipo==='pix');

test('Pix dividido mostra parcelas futuras em aberto sem ocupar limite nem contar o que terceiros devem',()=>{
  const {ctx,db}=boot(fixture());
  ctx.salvarLancamentoWeb({...launch,formaPagto:'Pix',pixParcelado:true,requestId:'pix-futuro-pessoal-001'});
  ctx.salvarEmprestimoWeb({dataCompra:'16/10/2026',pessoa:'Ana',descricao:'Ajuda',formaPagto:'Pix',valorTotal:120,numParcelas:3,parcelaInicial:1,mesPrimeiraFatura:'10/2026',pixParcelado:true,requestId:'pix-futuro-terceiro-001'});
  const dados=ler(ctx),forma=pix(dados);
  assert.equal(forma.totalFuturo,'R$ 66,66');assert.equal(forma.futuroPessoalRaw,66.66);
  assert.equal(forma.utilizado,'R$ 33,34');assert.equal(forma.disponivel,'-');assert.equal(forma.pctUso,'0%');
  assert.equal(dados.emprestimos.kpis.totalAReceberGeral,'R$ 120,00');assert.equal(dados.emprestimos.kpis.limiteOcupado,'R$ 0,00');
  assert.deepEqual(db.sheets['Lançamentos'].rows.slice(1).map(r=>r[9]),['Pago','Em Aberto','Em Aberto']);
});

test('total futuro Pix usa saldo restante, exclui pagos/cancelados e não soma projeções',()=>{
  const aberto=personal('Pix em duas vezes',40,'2/2','11/2026','Em Aberto','Pix');
  const fixo=personal('Mensalidade Pix',10,'∞/∞','11/2026','Assinatura Ativa','Pix');
  const gastoCartao=personal('Cartão dezembro',20,'1/1','12/2026');
  const dadosFixture=fixture([
    aberto,fixo,gastoCartao,
    personal('Já pago',100,'3/3','12/2026','Pago','Pix'),
    personal('Cancelado',100,'∞/∞','12/2026','Assinatura Cancelada','Pix'),
    personal('Pix corrente',100,'1/1','10/2026','Em Aberto','Pix')
  ]);
  const {ctx,db}=boot(dadosFixture);ler(ctx);
  db.sheets['Lançamentos'].rows.find(r=>r[1]==='Pix em duas vezes')[17]=15;
  const dados=ler(ctx),forma=pix(dados);
  assert.equal(forma.totalFuturo,'R$ 35,00');assert.equal(forma.futuroPessoalRaw,35);
  assert.equal(dados.faturas.horizonte.previstoPessoal.Pix['12/2026'],10);
  const cartao=dados.formasPagamento.find(f=>f.tipo==='cartao');assert.equal(cartao.totalFuturo,'R$ 20,00');assert.equal(cartao.disponivel,'R$ 980,00');
});

test('datas nativas com outra máscara conservam período/parcela na carga geral e nos empréstimos',()=>{
  const gasto=personal('Pix nativo',40,'2/2','11/2026','Em Aberto','Pix');
  gasto[0]=new Date(2026,9,1);gasto[6]=new Date(2001,1,2);gasto[8]=new Date(2026,10,1);
  const emp=loan('Ana','A Receber',70,'Cartao');emp[0]=new Date(2026,9,1);emp[6]=new Date(2001,0,1);emp[8]=new Date(2026,10,1);
  const {ctx,db}=boot(fixture([gasto],[emp]));ler(ctx);
  const antes=clone(db.sheets['Lançamentos'].rows[1]),antesEmp=clone(db.sheets['Empréstimos'].rows[1]);
  const dados=ler(ctx),item=dados.lancamentos.find(r=>r[1]==='Pix nativo');
  assert.equal(pix(dados).totalFuturo,'R$ 40,00');assert.equal(dados.faturas.horizonte.totalPessoal.Pix['11/2026'],40);
  assert(item);assert.equal(item[6],'2/2');assert.equal(item[8],'11/2026');
  assert.equal(dados.emprestimos.itens[0].mesFatura,'11/2026');assert.equal(dados.emprestimos.itens[0].parcela,'1/1');
  assert(dados.mesesDisponiveis.includes('11/2026'));assert(!dados.mesesDisponiveis.includes('01/11/2026'));
  assert.deepEqual(db.sheets['Lançamentos'].rows[1],antes);assert.deepEqual(db.sheets['Empréstimos'].rows[1],antesEmp);
});

test('reordenar registros com mês nativo não troca MM/AAAA pela máscara visual DD/MM/AAAA',()=>{
  const futuro=personal('Mesmo Pix',40,'2/2','11/2026','Em Aberto','Pix'),anterior=personal('Mesmo Pix',40,'1/2','10/2026','Pago','Pix');
  futuro[8]=new Date(2026,10,1);anterior[8]=new Date(2026,9,1);
  const empFuturo=loan('Ana','A Receber',70,'Cartao'),empAtual=loan('Ana','A Receber',70,'Cartao');
  empFuturo[8]=new Date(2026,10,1);empAtual[8]=new Date(2026,9,1);empFuturo[6]='2/2';empAtual[6]='1/2';
  const {ctx,db}=boot(fixture([futuro,anterior],[empFuturo,empAtual])),dados=ler(ctx);
  assert.deepEqual(db.sheets['Lançamentos'].rows.slice(1).map(r=>r[8]),['10/2026','11/2026']);
  assert.deepEqual(db.sheets['Empréstimos'].rows.slice(1).map(r=>r[8]),['10/2026','11/2026']);
  assert.equal(pix(dados).totalFuturo,'R$ 40,00');assert.deepEqual(Array.from(dados.emprestimos.itens,x=>x.mesFatura),['10/2026','11/2026']);
});

test('despesa fixa Pix com mês nativo continua gerando somente as ocorrências até o mês atual',()=>{
  const fixo=personal('Assinatura Pix',20,'∞/∞','09/2026','Assinatura Paga','Pix','15/09/2026');fixo[0]=new Date(2026,8,15);fixo[8]=new Date(2026,8,1);
  const {ctx,db}=boot(fixture([fixo]));ler(ctx);ler(ctx);
  const ocorrencias=db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[1]==='Assinatura Pix');
  assert.equal(ocorrencias.length,2);
  assert.equal(ctx.formatarCelulaRegistroGestor_(ocorrencias[0][8],'MM/yyyy'),'09/2026');assert.equal(ctx.formatarCelulaRegistroGestor_(ocorrencias[1][8],'MM/yyyy'),'10/2026');
  assert.equal(ocorrencias[1][9],'Assinatura Ativa');
});
