const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fonte = fs.readFileSync('Backend/Code.gs', 'utf8');
const inicio = fonte.indexOf('function prepararAutorizacaoInicialGestor()');
const trecho = fonte.slice(inicio, fonte.indexOf('\nfunction obterPlanilhaGestor_', inicio));
const manifesto = JSON.parse(fs.readFileSync('Backend/appsscript.json', 'utf8'));

test('preparação exige todos os escopos declarados sem acessar dados ou criar rotinas', () => {
  const chamadas = [], c = vm.createContext({
    ScriptApp: { AuthMode: { FULL: 'FULL' }, requireScopes: (modo, escopos) => chamadas.push({ modo, escopos: Array.from(escopos) }) },
    console: { log() {} }
  });
  vm.runInContext(trecho, c);
  assert.equal(c.prepararAutorizacaoInicialGestor().sucesso, true);
  assert.deepEqual(chamadas, [{ modo: 'FULL', escopos: manifesto.oauthScopes }]);
  assert.equal(new Set(manifesto.oauthScopes).size, 4);
});
test('consentimento pendente não anuncia sucesso nem ignora recusa', () => {
  let anunciou = false;
  const c = vm.createContext({ ScriptApp: { AuthMode: { FULL: 'FULL' }, requireScopes() { throw Error('consentimento pendente'); } }, console: { log() { anunciou = true; } } });
  vm.runInContext(trecho, c);
  assert.throws(() => c.prepararAutorizacaoInicialGestor(), /consentimento pendente/);
  assert.equal(anunciou, false);
});
test('preparação manual não pode ser chamada pela API', () => {
  const { CATALOGO_ACOES_GESTOR } = require('../shared/acoes.js');
  assert.equal(Object.hasOwn(CATALOGO_ACOES_GESTOR, 'prepararAutorizacaoInicialGestor'), false);
});
