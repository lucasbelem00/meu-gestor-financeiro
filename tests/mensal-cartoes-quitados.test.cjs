const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {boot,fixture,personal,loan}=require('./fixtures/gestor-mocks.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),i=html.indexOf("        let htmlFormas = '';"),f=html.indexOf("        const boxTags =",i);
function render(res){const el={innerHTML:''},c=vm.createContext({res,mesFiltro:'10/2026',document:{getElementById:()=>el},formaEhCartaoGestor:f=>f.tipo==='cartao',formatBRL:n=>'R$ '+Number(n).toFixed(2).replace('.',','),escaparHTML:s=>s,acaoHTML:()=>''});vm.runInContext(html.slice(i,f),c);return el.innerHTML;}
test('cartão quitado perde só a ação de pagamento; empréstimos recebidos continuam no mês',()=>{
 const {ctx}=boot(fixture([personal('Meu gasto',100,'1/1','10/2026','Pago')],[loan('Ana','Recebido',70,'Cartao')]));ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos',null);
 let rel=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');assert.match(render(rel),/Conferir fatura/);assert.equal(rel.formas[0].abertoBanco,70);assert.equal(rel.formas[0].terceiros,70);
 const p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:70});ctx.registrarPagamentoFaturaWeb({...p,requestId:'mensal-quitado-banco-001'});
 rel=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');const cartao=rel.formas.find(f=>f.nome==='Cartao');assert.equal(cartao.totalBanco,170);assert.equal(cartao.abertoBanco,0);assert.equal(cartao.terceiros,70);assert.doesNotMatch(render(rel),/Conferir fatura/);assert.match(render(rel),/R\$ 70,00 de terceiros/);assert.equal(rel.terceiros.recebidoRaw,70);
});
test('pagamento parcial conserva a ação e quitação não marca pessoa como recebida',()=>{
 const {ctx}=boot(fixture([],[loan('Ana','A Receber',70,'Cartao')]));ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos',null);
 let p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:20});ctx.registrarPagamentoFaturaWeb({...p,requestId:'mensal-parcial-banco-001'});let rel=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');assert.match(render(rel),/Conferir fatura/);assert.equal(rel.formas[0].abertoBanco,50);
 p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:50});ctx.registrarPagamentoFaturaWeb({...p,requestId:'mensal-parcial-banco-002'});rel=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');assert.doesNotMatch(render(rel),/Conferir fatura/);assert.equal(rel.terceiros.aReceberRaw,70);assert.equal(rel.formas[0].terceiros,70);
});
