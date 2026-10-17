const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boot, fixture, personal, loan, launch, clone } = require('./fixtures/gestor-mocks.cjs');
const ler = ctx => ctx.executarAcaoApi_('getDadosCompletos', null);
const historico = ctx => ctx.executarAcaoApi_('obterAtividadeWeb', {});
const alvo = r => ({ registroId: r[11], versao: r[13], linha: 2, descricao: r[2], descOriginal: r[1], mesFatura: r[8], mesOriginal: r[8], parcela: r[6], parcelaOriginal: r[6] });
const pagar = (ctx, valor, id = 'pagamento-teste-001') => { const f = ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' }); return ctx.registrarPagamentoFaturaWeb({ ...f, valor, requestId: id }); };

test('reabrir lançamento pago remove pagamento anterior e editar valor pago atualiza o total', () => {
  const { ctx } = boot(fixture());
  const r = personal('Compra', 100); r[9] = 'Pago'; r[17] = 100;
  assert.equal(ctx.montarLinhaLanc(r, r, { status: 'Em Aberto' })[17], 0);
  assert.equal(ctx.montarLinhaLanc(r, r, { valor: 80 })[17], 80);
});

test('atividade é gravada junto do lançamento e reenvio não duplica histórico', () => {
  const { ctx } = boot(fixture()); const p = { ...launch, requestId: 'atividade-criar-001' };
  ctx.salvarLancamentoWeb(p); ctx.salvarLancamentoWeb(p);
  const h = historico(ctx); assert.equal(h.total, 1); assert.equal(h.itens[0].quantidade, 3); assert.equal(h.itens[0].titulo, 'Lançamento criado');
});
test('exclusão recupera só registros excluídos sem apagar lançamentos posteriores', () => {
  const { ctx, db } = boot(fixture([personal('Original')])); ler(ctx);
  const r = clone(db.sheets['Lançamentos'].rows[1]); ctx.excluirLancamentoWeb({ ...alvo(r), requestId: 'atividade-excluir-001' });
  const evento = historico(ctx).itens[0]; assert.equal(evento.podeDesfazer, true);
  ctx.salvarLancamentoWeb({ ...launch, descricao: 'Outro lançamento', requestId: 'atividade-criar-002' });
  const p = { eventoId: evento.id, requestId: 'atividade-desfazer-001' }; ctx.desfazerAtividadeWeb(p); ctx.desfazerAtividadeWeb(p);
  const rows = db.sheets['Lançamentos'].rows.slice(1).filter(r => r[11]); assert.equal(rows.filter(r => r[1] === 'Original').length, 1); assert.equal(rows.filter(r => r[1] === 'Outro Lançamento').length, 3);
  assert.equal(historico(ctx).itens.find(e => e.id === evento.id).desfeita, true);
  assert.throws(() => ctx.desfazerAtividadeWeb({ eventoId: evento.id, requestId: 'atividade-desfazer-002' }), /já foi desfeita/);
});
test('desfazer recebimento rejeita registro alterado manualmente depois', () => {
  const { ctx, db } = boot(fixture([], [loan()])); ler(ctx); const r = clone(db.sheets['Empréstimos'].rows[1]);
  ctx.alternarStatusEmprestimoWeb({ ...alvo(r), requestId: 'atividade-receber-001', statusDesejado: 'Recebido' });
  const evento = historico(ctx).itens[0]; db.sheets['Empréstimos'].rows[1][7] = 240;
  assert.throws(() => ctx.desfazerAtividadeWeb({ eventoId: evento.id, requestId: 'atividade-desfazer-003' }), /mudou depois/);
  assert.equal(db.sheets['Empréstimos'].rows[1][9], 'Recebido');
});
test('recebimento parcial pode ser desfeito sem perder centavos', () => {
  const { ctx, db } = boot(fixture([], [loan()])); ler(ctx); const r = clone(db.sheets['Empréstimos'].rows[1]);
  ctx.dividirParcelaEmprestimoWeb({ ...alvo(r), requestId: 'atividade-parcial-001', valorRecebido: 40 });
  const e = historico(ctx).itens[0]; ctx.desfazerAtividadeWeb({ eventoId: e.id, requestId: 'atividade-desfazer-004' });
  const rows = db.sheets['Empréstimos'].rows.slice(1).filter(r => r[11]); assert.equal(rows.length, 1); assert.equal(rows[0][7], 120); assert.equal(rows[0][9], 'A Receber');
});
test('pagamento parcial altera limite e saldo, mantendo gastos e dívida de terceiro', () => {
  const { ctx } = boot(fixture([personal('Minha compra', 100)], [loan('Ana', 'A Receber', 120, 'Cartao')])); ler(ctx); pagar(ctx, 70);
  const f = ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' }); assert.equal(f.total, 220); assert.equal(f.pago, 70); assert.equal(f.restante, 150);
  const d = ler(ctx); assert.equal(d.formasPagamento[0].disponivelRaw, 850); assert.equal(d.emprestimos.itens[0].status, 'A Receber');
  const evento = historico(ctx).itens[0]; ctx.desfazerAtividadeWeb({ eventoId: evento.id, requestId: 'atividade-desfazer-005' });
  assert.equal(ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' }).restante, 220);
});
test('pagamento integral preserva recebimento e reenvio é idempotente', () => {
  const { ctx } = boot(fixture([], [loan('Ana', 'A Receber', 120, 'Cartao')])); ler(ctx);
  const f = ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' }), p = { ...f, valor: 120, requestId: 'pagamento-teste-002' };
  ctx.registrarPagamentoFaturaWeb(p); ctx.registrarPagamentoFaturaWeb(p);
  const d = ler(ctx); assert.equal(d.emprestimos.itens[0].estadoBanco, 'Pago'); assert.equal(d.emprestimos.itens[0].status, 'A Receber'); assert.equal(historico(ctx).total, 1);
});
test('fatura alterada e pagamento maior que saldo são recusados', () => {
  const { ctx, db } = boot(fixture([personal('Minha compra', 100)])); ler(ctx);
  const f = ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' });
  assert.throws(() => ctx.registrarPagamentoFaturaWeb({ ...f, valor: 101, requestId: 'pagamento-teste-003' }), /saldo em aberto/);
  db.sheets['Lançamentos'].rows[1][7] = 110;
  assert.throws(() => ctx.registrarPagamentoFaturaWeb({ ...f, valor: 100, requestId: 'pagamento-teste-004' }), /fatura mudou/);
});
test('parcial da pessoa preserva pagamento parcial já feito ao banco', () => {
  const { ctx, db } = boot(fixture([], [loan('Ana', 'A Receber', 120, 'Cartao')])); ler(ctx); pagar(ctx, 60);
  const r = clone(db.sheets['Empréstimos'].rows[1]); ctx.dividirParcelaEmprestimoWeb({ ...alvo(r), requestId: 'atividade-parcial-002', valorRecebido: 100 });
  const f = ctx.executarAcaoApi_('obterFaturaPagamentoWeb', { forma: 'Cartao', mesFatura: '10/2026' }); assert.equal(f.total, 120); assert.equal(f.pago, 60); assert.equal(f.restante, 60);
});

test('pagamento parcial aparece no painel, relatório e alerta sem mudar o gasto', () => {
  const { ctx } = boot(fixture([personal('Compra', 100)])); ler(ctx); pagar(ctx, 40);
  const d = ler(ctx), rel = ctx.executarAcaoApi_('obterRelatorioMes', '10/2026');
  assert.equal(rel.totalRaw, 100); assert.equal(rel.kpis.pago, 'R$ 40,00'); assert.equal(rel.kpis.aberto, 'R$ 60,00');
  assert.equal(rel.formas[0].pagoBanco, 40); assert.equal(rel.formas[0].abertoBanco, 60);
  assert.equal(d.kpis.totalPago, 'R$ 40,00'); assert.equal(d.alertasVencimento[0].valorRaw, 60);
});
test('cartão só com terceiros gera aviso pelo saldo ainda devido ao banco', () => {
  const { ctx } = boot(fixture([], [loan('Ana', 'Recebido', 120, 'Cartao')])); ler(ctx); pagar(ctx, 45);
  const d = ler(ctx); assert.equal(d.alertasVencimento[0].valorRaw, 75); assert.equal(d.emprestimos.itens[0].status, 'Recebido');
});
test('falha ao gravar atividade recupera transação e grava um único histórico', () => {
  const { ctx, db } = boot(fixture()); const p = { ...launch, requestId: 'atividade-falha-001' };
  db.failure = { name: '_Gestor_Atividade', stage: 'before' };
  assert.throws(() => ctx.salvarLancamentoWeb(p), e => e.resultadoIncerto === true); ctx.salvarLancamentoWeb(p);
  assert.equal(db.sheets['Lançamentos'].rows.slice(1).filter(r => r[11]).length, 3); assert.equal(historico(ctx).total, 1);
});
test('desfazer com resposta perdida não recupera exclusão duas vezes', () => {
  const { ctx, db } = boot(fixture([personal('Compra')])); ler(ctx); const r = clone(db.sheets['Lançamentos'].rows[1]);
  ctx.excluirLancamentoWeb({ ...alvo(r), requestId: 'atividade-excluir-002' }); const e = historico(ctx).itens[0];
  const p = { eventoId: e.id, requestId: 'atividade-desfazer-006' }; db.failure = { name: '_Gestor_Atividade', stage: 'before' };
  assert.throws(() => ctx.desfazerAtividadeWeb(p), x => x.resultadoIncerto === true); ctx.desfazerAtividadeWeb(p);
  assert.equal(db.sheets['Lançamentos'].rows.slice(1).filter(r => r[11]).length, 1);
});
test('coluna R particular é preservada e bloqueia migração', () => {
  const f = fixture([personal()]); f['Lançamentos'][0][17] = 'Meu controle'; f['Lançamentos'][1][17] = 'Não apagar';
  const { ctx, db } = boot(f); assert.throws(() => ler(ctx), /coluna R/); assert.equal(db.sheets['Lançamentos'].rows[1][17], 'Não apagar');
});
