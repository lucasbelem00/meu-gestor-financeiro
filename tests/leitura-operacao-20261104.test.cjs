const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {boot,fixture,personal}=require('./fixtures/gestor-mocks.cjs');

test('fuso é consultado uma vez por executor e volta a ser lido na próxima operação',()=>{
 const a=boot(fixture());let chamadas=0,fuso='America/Fortaleza';a.ctx.Session.getScriptTimeZone=()=>{chamadas++;return fuso;};
 const executar=()=>a.ctx.executarOperacaoGestor_('ensaioLeitura',{},()=>[a.ctx.getTimezone(),a.ctx.getTimezone()],true);
 assert.deepEqual(Array.from(executar()),[fuso,fuso]);assert.equal(chamadas,1);
 fuso='America/Sao_Paulo';assert.deepEqual(Array.from(executar()),[fuso,fuso]);assert.equal(chamadas,2);
 a.ctx.getTimezone();assert.equal(chamadas,3);
});

test('fotografia virtual compartilha catálogo e ajustes só entre suas duas abas; nova fotografia relê',()=>{
 const a=boot(fixture());a.ctx.ativoAnualGestor_=()=>true;let catalogos=0,ajustes=0;
 a.ctx.catalogoAnosGestor_=()=>{catalogos++;return [];};a.ctx.ajustesAnuaisGestor_=()=>{ajustes++;return [];};
 const abrir=()=>{const ctx={idsIniciais:new Set(),registrosIniciais:{}};const ss=a.ctx.criarPlanilhaVirtualGestor_(a.db,ctx);ss.getSheetByName('Lançamentos');ss.getSheetByName('Empréstimos');return ss;};
 abrir();assert.equal(catalogos,1);assert.equal(ajustes,1);abrir();assert.equal(catalogos,2);assert.equal(ajustes,2);
});

test('ordenação do relatório converte cada data uma vez sem alterar ordem e desempate',()=>{
 const a=boot(fixture([personal('Tardia',10,'1/1','10/2026','Pago','Cartao','12/10/2026'),personal('Inicial',20,'1/1','10/2026','Pago','Cartao','01/10/2026')]));
 a.ctx.executarAcaoApi_('getDadosCompletos');const original=a.ctx.parseDataBR;let chamadas=0;a.ctx.parseDataBR=(...args)=>{chamadas++;return original(...args);};
 const r=a.ctx.lerLancamentosParaRelatorio();assert.equal(chamadas,r.length);assert.deepEqual(Array.from(r,x=>x.desc),['Inicial','Tardia']);
});
