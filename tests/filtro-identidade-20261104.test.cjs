const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal}=require('./fixtures/gestor-mocks.cjs');
test('filtro resolve forma uma vez e mantém itens, soma e paginação',()=>{
 const a=boot(fixture(Array.from({length:12},(_,i)=>personal('Compra '+i,10))));a.ctx.executarAcaoApi_('getDadosCompletos');
 const resolver=a.ctx.nomeFormaLeituraGestor_;let resolucoes=0;a.ctx.nomeFormaLeituraGestor_=function(nome,...args){if(nome==='Nome antigo'){resolucoes++;return 'Cartao';}return resolver(nome,...args);};
 const r=a.ctx.executarAcaoApi_('filtrarLancamentosWeb',{filtros:{forma:'Nome antigo',categoria:'Teste'},offset:0,limite:5});
 assert.equal(resolucoes,1);assert.equal(r.qtdTotal,12);assert.equal(r.itens.length,5);assert.equal(r.somaTotal,'R$ 120,00');assert.equal(r.temMais,true);
});
