const {test} = require('node:test');
const assert = require('node:assert/strict');
const {boot, fixture, personal, loan, launch, clone} = require('./fixtures/gestor-mocks.cjs');
const ler = ctx => ctx.executarAcaoApi_('getDadosCompletos', null);
function backup(ctx) {
  const dados = ctx.executarAcaoApi_('exportarBackupDadosWeb', null);
  dados.abas = dados.abas.filter(a => a.nome !== '_Gestor_Atividade').map(a => { const {exibidos,...b}=a; return b; });
  return dados;
}
const previa = (ctx,b) => ctx.executarAcaoApi_('previaRestauracaoBackupWeb', {backup:b});
const restaurar = (ctx,b,p,id='restauracao-teste-001') => ctx.restaurarBackupDadosWeb({backup:b,...p,confirmacao:'RESTAURAR',requestId:id});
const rows = (db,nome) => db.sheets[nome].rows.slice(1).filter(r=>r[11]);

test('prévia não substitui lançamentos; restauração substitui e preserva cópia anterior',()=>{
  const {ctx,db}=boot(fixture([personal('Original')],[loan()]));ler(ctx);const b=backup(ctx);
  ctx.salvarLancamentoWeb({...launch,requestId:'antes-restauracao-001'});
  const p=previa(ctx,b);assert.equal(rows(db,'Lançamentos').length,4);
  assert.equal(p.abas.find(a=>a.nome==='Lançamentos').atual.registros,4);
  restaurar(ctx,b,p);assert.equal(rows(db,'Lançamentos').length,1);assert.equal(rows(db,'Empréstimos').length,1);
  const anterior=ctx.executarAcaoApi_('obterBackupAnteriorWeb',null);
  assert.equal(anterior.abas.find(a=>a.nome==='Lançamentos').valores.length,5);
  assert.equal(ler(ctx).epocaRestauracao,'restauracao-teste-001');
});

test('alteração depois da prévia bloqueia restauração',()=>{
  const {ctx,db}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx),p=previa(ctx,b);
  ctx.salvarLancamentoWeb({...launch,requestId:'altera-apos-previa-001'});
  assert.throws(()=>restaurar(ctx,b,p),/mudaram desde a prévia/);assert.equal(rows(db,'Lançamentos').length,4);
});

test('reenvio da restauração é idempotente e não duplica cópia anterior',()=>{
  const {ctx,db}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx),p=previa(ctx,b);
  restaurar(ctx,b,p);const qtd=db.sheets['_Gestor_Restauracoes'].rows.length;restaurar(ctx,b,p);
  assert.equal(db.sheets['_Gestor_Restauracoes'].rows.length,qtd);assert.equal(rows(db,'Lançamentos').length,1);
});

test('restauração interrompida recupera pelo diário com a cópia anterior já gravada',()=>{
  const {ctx,db}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx);
  ctx.salvarLancamentoWeb({...launch,requestId:'altera-antes-falha-001'});const p=previa(ctx,b);
  db.failure={name:'Lançamentos',stage:'after',row:1,col:1};
  assert.throws(()=>restaurar(ctx,b,p),/FALHA SIMULADA/);
  assert(db.sheets['_Gestor_Restauracoes'].rows.length>1);
  restaurar(ctx,b,p);assert.equal(rows(db,'Lançamentos').length,1);
});

test('backup alterado depois da prévia e fórmula externa são recusados',()=>{
  const {ctx}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx),p=previa(ctx,b);
  const alterado=clone(b);alterado.abas.find(a=>a.nome==='Lançamentos').valores[1][1]='Alterado';
  assert.throws(()=>restaurar(ctx,alterado,p),/mudaram desde a prévia/);
  const externo=clone(b),a=externo.abas.find(a=>a.nome==='Dashboard & Resumo');a.formulas[0][0]='=IMPORTRANGE("https://example.test","A1")';
  assert.throws(()=>previa(ctx,externo),/Fórmula não suportada/);
});

test('envio preparado antes da restauração é bloqueado e novo envio atualizado funciona',()=>{
  const {ctx}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx),p=previa(ctx,b);restaurar(ctx,b,p);
  assert.throws(()=>ctx.salvarLancamentoWeb({...launch,requestId:'envio-antigo-001'}),/planilha foi restaurada/);
  ctx.salvarLancamentoWeb({...launch,requestId:'envio-atualizado-001',baseRestauracao:'restauracao-teste-001'});
});

test('identidade duplicada e aba desconhecida não passam pela prévia',()=>{
  const {ctx}=boot(fixture([personal()]));ler(ctx);const b=backup(ctx);
  const repetido=clone(b),aba=repetido.abas.find(a=>a.nome==='Lançamentos');aba.valores.push(clone(aba.valores[1]));aba.formulas.push(clone(aba.formulas[1]));aba.formatosNumericos.push(clone(aba.formatosNumericos[1]));
  assert.throws(()=>previa(ctx,repetido),/repetido/);
  const desconhecido=clone(b);desconhecido.abas.push({nome:'Outra aba',valores:[['X']]});assert.throws(()=>previa(ctx,desconhecido),/desconhecidas/);
});
