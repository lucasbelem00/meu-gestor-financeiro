const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');

test('matriz anual lê cabeçalho e dados locais uma vez e observa a próxima alteração',()=>{
 const a=ambienteProtecao(fixture([personal('Teste',30)]));a.ativar();
 const sh=a.db.sheets['Lançamentos'],ler=sh.getDataRange;let leituras=0;
 sh.getDataRange=function(){leituras++;return ler.call(this);};
 const antes=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos');assert.equal(leituras,1);
 sh.rows[1][7]=45;const depois=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos');
 assert.equal(leituras,2);assert.equal(antes[1][7],30);assert.equal(depois[1][7],45);
});

test('identidade anual é lida em bloco e continua recusando origem ou ano divergente',()=>{
 const a=ambienteProtecao();a.ativar();const e=a.ctx.garantirAnoGestor_(a.db,2026),sh=a.planilhas.get(e.id).sheets['Leia-me'],ler=sh.getRange;let leituras=0;
 sh.getRange=function(...args){leituras++;assert.deepEqual(args,[2,2,2,1]);return ler.apply(this,args);};
 assert.equal(a.ctx.dadosAnoGestor_(e).ano,2026);assert.equal(leituras,1);
 sh.rows[1][1]='outra-origem';assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);
 sh.rows[1][1]='fixture';sh.rows[2][1]=2025;assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);
});

test('formatação monetária em lote usa as mesmas três colunas, com fallback e propagação de erro',()=>{
 const a=ambienteProtecao(),chamadas=[];
 const sh={getRangeList(r){chamadas.push(Array.from(r));return {setNumberFormat(f){chamadas.push(f);}};}};
 a.ctx.formatarMoedasPlanoGestor_(sh,1);assert.equal(chamadas.length,0);
 a.ctx.formatarMoedasPlanoGestor_(sh,4);assert.deepEqual(chamadas[0],['E2:E4','H2:H4','R2:R4']);
 const antigas=[];a.ctx.formatarMoedasPlanoGestor_({getRange(...r){antigas.push(r);return {setNumberFormat(f){assert.equal(f,chamadas[1]);}};}},4);
 assert.deepEqual(antigas,[[2,5,3,1],[2,8,3,1],[2,18,3,1]]);
 assert.throws(()=>a.ctx.formatarMoedasPlanoGestor_({getRangeList(){throw Error('falha Sheets');}},4),/falha Sheets/);
});

test('resumo divergente dispensa leitura de fórmulas; resumo igual só é preservado sem fórmulas',()=>{
 const a=ambienteProtecao(),esperado=[['controle'],['hash'],['Atualizado em','2026-11-04T00:00:00.000Z'],['dados']],sh=a.db.insertSheet('Resumo teste');
 a.ctx.gravarResumoConferidoGestor_(sh,esperado);
 const ler=sh.getDataRange;let consultas=0;
 sh.getDataRange=function(){const r=ler.call(this),f=r.getFormulas;r.getFormulas=function(){consultas++;return f.call(this);};return r;};
 const novo=esperado.map(r=>r.slice());novo[3][0]='novo';
 assert.equal(a.ctx.gravarResumoConferidoGestor_(sh,novo),true);assert.equal(consultas,0);
 assert.equal(a.ctx.gravarResumoConferidoGestor_(sh,novo),false);assert.equal(consultas,1);
});
