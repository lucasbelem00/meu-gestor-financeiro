const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const {boot,fixture}=require('./fixtures/gestor-mocks.cjs');
const fonteBackend = fs.readFileSync(path.join(raiz, 'Backend/Code.gs'), 'utf8');

test('as cópias da interface estão sincronizadas com o arquivo principal', () => {
  for (const nome of ['Index.html', 'Index_para_colar.txt']) assert.equal(fs.readFileSync(path.join(raiz, 'Backend', nome), 'utf8'), html, 'Execute node scripts/sincronizar-interface.cjs para atualizar ' + nome);
});

test('todos os scripts locais têm sintaxe válida', () => {
  for (const [i, m] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries()) if (!/\bsrc\s*=/.test(m[1])) new vm.Script(m[2], { filename: 'index-inline-' + i });
  new vm.Script(fonteBackend, { filename: 'Code.gs' });
  new vm.Script(fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8'), { filename: 'sw.js' });
});

function contextoRelatorio() {
  const {ctx}=boot(fixture());
  function lancamento(ano, valor) {
    const r = ['01/10/' + ano, 'Mercado', 'Cartão Azul', 'Alimentação', valor, 1, '1/1', valor, '10/' + ano, 'Pago', ''];
    return { idx: ano, d: r, r, desc: r[1], forma: r[2], cat: r[3], catRes: r[3], parc: '1/1', infoParc: { total: 1, atual: 1 }, valor, mes: r[8], infoMes: { a: ano, m: 10, time: new Date(ano, 9, 1).getTime() }, status: 'Pago', tags: '', data: r[0], chave: String(ano) };
  }
  ctx.lerLancamentosParaRelatorio = () => [lancamento(2025, 20), lancamento(2026, 30)];
  ctx.lerEmprestimosRelatorio_ = () => [];
  ctx.getHojeSeguro = () => new Date(2026, 9, 16);
  return ctx;
}

test('detalhar categoria do Anual mantém o ano até a consulta do Histórico', () => {
  const ctx = contextoRelatorio();
  const campos = Object.fromEntries(['inpBusca', 'filtAno', 'filtMes', 'filtForma', 'filtCat', 'filtTag', 'filtStatus', 'selFiltroAnoSimples'].map(id => [id, { value: id === 'selFiltroAnoSimples' ? '2026' : '' }]));
  let filtro;
  const front = vm.createContext({ document: { getElementById: id => campos[id] }, setAba() {}, filtrosAtuais: {}, atualizarEstiloChipsRapidosHist() {}, aplicarFiltros() { filtro = { ano: campos.filtAno.value, mes: campos.filtMes.value, categoria: campos.filtCat.value }; } });
  vm.runInContext(html.slice(html.indexOf('    function atualizarIndicadorAnoHistorico('), html.indexOf('    function atualizarEstiloChipsRapidosHist(')), front);
  front.auditarItemAnual('categoria', 'Alimentação');
  assert.equal(filtro.ano, '2026');
  assert.equal(ctx.obterRelatorioAnual(2026).totalRaw, 30);
  const historico = ctx.filtrarLancamentosWeb(filtro, 0, 50);
  assert.equal(historico.somaTotal, 'R$ 30,00'); assert.equal(historico.qtdTotal, 1);
});

test('limpar o ano permite pesquisar em todos os anos', () => {
  const r = contextoRelatorio().filtrarLancamentosWeb({ categoria: 'Alimentação', ano: '' }, 0, 50);
  assert.equal(r.somaTotal, 'R$ 50,00'); assert.equal(r.qtdTotal, 2);
});

test('CSV protege fórmulas e preserva aspas, quebras de linha e delimitadores', () => {
  const ctx = vm.createContext({});
  vm.runInContext(html.slice(html.indexOf('    function converterAbaCSV('), html.indexOf('    async function exportarBackupDados(')), ctx);
  const csv = ctx.converterAbaCSV([['Descrição', 'Valor'], ['  =HYPERLINK("x")', 10], ['Texto; "aspas"\nlinha', 0], ['@SOMA(1)', 1]]);
  assert(csv.startsWith('\uFEFF')); assert(csv.includes("'  =HYPERLINK")); assert(csv.includes('""aspas""')); assert(csv.includes("'@SOMA")); assert(csv.includes('\nlinha'));
});

test('nomes iguais a propriedades internas continuam sendo texto no formulário', () => {
  const ctx = vm.createContext({ dicionarioAutofill: Object.create(null), DICIONARIO_ACENTOS_PT: {}, normalizarTexto: s => String(s).toLowerCase() });
  vm.runInContext(html.slice(html.indexOf('    function formatarTituloInteligente('), html.indexOf('    function formatarTagsAutomaticamente(')), ctx);
  for (const nome of ['constructor', '__proto__', 'toString']) assert.equal(typeof ctx.formatarTituloInteligente(nome), 'string');
});
