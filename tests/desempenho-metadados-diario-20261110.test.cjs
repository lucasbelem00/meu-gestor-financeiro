const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');
const {boot}=require('./fixtures/gestor-mocks.cjs');
test('leitura anual agrupa metadados das três abas, relê valores e mantém recusa de fórmulas',()=>{
 const a=ambienteProtecao(fixture([personal('Original',40)]));a.ativar();a.ctx.ativarOrganizacaoAnualWeb();const e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026),ss=a.planilhas.get(e.id),get=ss.getSheetByName,getAll=ss.getSheets;let pontuais=0,agrupadas=0;
 ss.getSheetByName=function(n){pontuais++;return get.call(this,n);};ss.getSheets=function(){agrupadas++;return getAll.call(this);};
 const antes=a.ctx.dadosAnoGestor_(e);assert.equal(agrupadas,1);assert.equal(pontuais,0);
 ss.sheets['Lançamentos'].rows[1][1]='Alterada';const depois=a.ctx.dadosAnoGestor_(e);assert.equal(depois.abas[0].valores[1][1],'Alterada');assert.equal(antes.abas[0].valores[1][1],'Original');assert.equal(agrupadas,2);
 ss.sheets['Lançamentos'].getRange(2,2).setValue('=30');assert.throws(()=>a.ctx.dadosAnoGestor_(e),/fórmulas/);
});
test('partes maiores mantêm JSON legível e recuperação sem duplicar o diário',()=>{
 const a=boot(fixture()),p={requestId:'diario-maior-nota-001',operacoes:[{id:'nota-grande',tipo:'upsert',nota:{texto:'a'.repeat(25000)+'=IMPORTXML("a","b")'}}]};
 a.db.failure={name:'Anotações',stage:'before'};assert.throws(()=>a.ctx.salvarNotasWeb(p),/FALHA/);
 const sh=a.db.sheets['_Gestor_Operacoes'],cab=sh.rows.find(r=>r[0]==='salvarNotasWeb:'+p.requestId&&r[2]==='PRONTO'),partes=sh.rows.filter(r=>r[0]===cab[0]&&r[2]==='PARTE');
 const texto=partes.map(r=>JSON.parse(r[4])).join('');assert.equal(partes.length,Math.ceil(texto.length/20000));assert(partes.length<Math.ceil(texto.length/12000));assert(partes.every(r=>r[4].length<49000));JSON.parse(texto);
 const tamanho=sh.rows.length;a.ctx.salvarNotasWeb(p);assert.equal(sh.rows.length,tamanho);assert.equal(cab[2],'CONFIRMADO');
});
