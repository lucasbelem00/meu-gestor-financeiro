const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot,fixture,launch}=require('./fixtures/gestor-mocks.cjs');
const html=fs.readFileSync('index.html','utf8'),fonte=html.slice(html.indexOf('    function ordenarDescricoesAutofillGestor('),html.indexOf('    function checarAutopreenchimento('));
function ordenar(mapa){const c=vm.createContext({});vm.runInContext(fonte,c);return c.ordenarDescricoesAutofillGestor(mapa);}
test('descrições priorizam frequência, depois compra recente e finalmente ordem alfabética',()=>{
 const mapa={d:{original:'Zebra',frequencia:2,ultimaCompraEm:200},b:{original:'Água',frequencia:2,ultimaCompraEm:200},c:{original:'Mercado',frequencia:2,ultimaCompraEm:100},a:{original:'Café',frequencia:3,ultimaCompraEm:1}},antes=JSON.stringify(mapa);
 assert.equal(JSON.stringify(ordenar(mapa).map(i=>i.original)),JSON.stringify(['Café','Água','Zebra','Mercado']));assert.equal(JSON.stringify(mapa),antes);
});
test('resposta antiga sem frequência continua utilizável sem falha ou alteração dos valores',()=>{
 const itens=ordenar({z:{original:'Zebra',ultimoValor:50,forma:'Cartao'},a:{original:'Almoço',ultimoValor:25,categoria:'Teste'},vazio:{original:''},nulo:null});assert.equal(itens.length,2);assert.equal(itens[0].original,'Almoço');assert.equal(itens[1].ultimoValor,50);assert.equal(itens[1].forma,'Cartao');
});
test('frequência conta compras distintas, não as doze parcelas de uma compra',()=>{
 const a=boot(fixture());a.ctx.console={log(){},warn(){}};let id=0;const api=(n,p)=>a.ctx.executarAcaoApi_(n,p??null);api('getDadosCompletos');
 const comprar=(descricao,dataCompra,numParcelas=1,valorTotal=100)=>api('salvarLancamentoWeb',{...launch,descricao,dataCompra,numParcelas,valorTotal,requestId:'descricao-frequencia-20261103-'+(++id)});
 comprar('Café','01/10/2026');comprar('Café','02/10/2026');comprar('Café','03/10/2026',1,75);comprar('Mercado','15/10/2026');comprar('Mercado','16/10/2026');comprar('Televisão','16/10/2026',12);
 const dados=api('getDadosCompletos'),itens=ordenar(dados.autofill),tv=Object.values(dados.autofill).find(i=>i.original==='Televisão');assert.equal(itens[0].original,'Café');assert.equal(itens[0].frequencia,3);assert.equal(itens[0].ultimoValor,75);assert.equal(itens[1].original,'Mercado');assert.equal(tv.frequencia,1);assert.equal(tv.ultimaCompraEm,new Date(2026,9,16).getTime());
 assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Televisão').length,12);
});
