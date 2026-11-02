const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan}=require('./fixtures/gestor-mocks.cjs');
function ambiente(linhas){const a=boot(fixture(linhas,[loan('Terceiro','A Receber',999)]));a.ctx.console={log(){},warn(){}};a.ctx.executarAcaoApi_('getDadosCompletos',null);a.ctx.getHojeSeguro=()=>new Date(2026,10,2);return a;}
test('ano atual compara os mesmos meses, sem parcelas futuras, terceiros ou canceladas',()=>{
 const a=ambiente([personal('Atual',150,'1/1','11/2026'),personal('Futura',800,'1/1','12/2026'),personal('Anterior',100,'1/1','11/2025'),personal('Dezembro anterior',900,'1/1','12/2025'),personal('Cancelada',500,'∞/∞','11/2026','Ocorrência Pulada')]);const d=a.ctx.obterRelatorioAnual(2026),c=d.comparacaoAnterior;
 assert.equal(d.totalRaw,950);assert.equal(c.atualRaw,150);assert.equal(c.anteriorRaw,100);assert.equal(c.variacao,50);assert.equal(c.mesLimite,11);assert.match(c.texto,/50,0% acima de 2025/);assert.equal(c.intervalo,'Jan a Nov');
});
test('anos passados comparam doze meses e distinguem igualdade, queda e ausência de base',()=>{
 const a=ambiente([personal('Atual',80,'1/1','12/2025'),personal('Base',100,'1/1','12/2024')]);assert.equal(a.ctx.obterRelatorioAnual(2025).comparacaoAnterior.variacao,-20);assert.equal(a.ctx.obterRelatorioAnual(2024).comparacaoAnterior.variacao,null);
 const c=a.ctx.compararAnosGastosGestor_([{ano:2025,mes:12,total:100},{ano:2024,mes:12,total:100}],2025);assert.equal(c.variacao,0);assert.equal(c.texto,'Mesmo valor de 2024');assert.equal(c.mesLimite,12);
 assert.equal(a.ctx.obterRelatorioAnual(2027).comparacaoAnterior.variacao,null);assert.match(a.ctx.obterRelatorioAnual(2027).comparacaoAnterior.texto,/Ano futuro/);
});
test('PDF automático anual usa a mesma comparação e muda revisão se a base anterior muda',()=>{
 const a=ambiente([personal('Atual',80,'1/1','12/2025'),personal('Base',100,'1/1','12/2024')]),dados=()=>a.ctx.dadosPeriodoPDFGestor_(a.ctx.registrosResumoNativoGestor_(a.db),'2025');const d=dados();assert.equal(JSON.stringify(d.comparacaoAnterior),JSON.stringify(a.ctx.obterRelatorioAnual(2025).comparacaoAnterior));assert.match(a.ctx.htmlRelatorioPDFGestor_(d,'hoje'),/Comparação com o ano anterior/);
 const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Base');r[7]=200;r[16]=a.ctx.hashRegistroGestor_(r);assert.notEqual(dados().hash,d.hash);assert.equal(dados().comparacaoAnterior.variacao,-60);
});
