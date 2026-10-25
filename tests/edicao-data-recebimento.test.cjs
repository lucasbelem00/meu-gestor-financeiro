const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,loan,personal,clone}=require('./fixtures/gestor-mocks.cjs');
const ler=a=>a.ctx.executarAcaoApi_('getDadosCompletos',null);
function ambiente(emp=true,pago=208){
 const primeira=emp?loan('Ana','A Receber',208,'Cartao'):personal('Compra',208),segunda=clone(primeira);
 primeira[4]=segunda[4]=416;primeira[5]=segunda[5]=2;primeira[6]='1/2';segunda[6]='2/2';segunda[8]='11/2026';
 const a=boot(fixture(emp?[]:[primeira,segunda],emp?[primeira,segunda]:[]));a.ctx.console={log(){}};ler(a);
 const p=a.ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:pago});a.ctx.registrarPagamentoFaturaWeb({...p,requestId:'pagar-para-editar-data-001'});
 a.nome=emp?'Empréstimos':'Lançamentos';a.db.sheets[a.nome].rows.slice(1).forEach(r=>{r[8]=new Date(2026,r[6]==='1/2'?9:10,1);});ler(a);return a;
}
function pedido(a,emp=true,extras={}){
 const r=a.db.sheets[a.nome].rows.find(r=>r[6]==='1/2');return {registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[emp?2:1],mesOriginal:'10/2026',parcelaOriginal:r[6],dataCompra:'01/10/2026',pessoa:'Ana',descricao:emp?'Ajuda':'Compra',formaPagto:'Cartao',categoria:'Teste',valorParcela:208,mesFatura:'10/2026',status:r[9],observacoes:'',tags:'',dataCombinada:'14/11/2026',requestId:'editar-data-combinada-001',...extras};
}
test('data de recebimento individual é editável com fatura paga e mês nativo do Sheets',()=>{
 const a=ambiente(),p=pedido(a);assert(a.db.sheets[a.nome].rows[1][8] instanceof Date);a.ctx.editarEmprestimoLinhaWeb(p);
 const rows=a.db.sheets[a.nome].rows.slice(1),r=rows.find(r=>r[11]===p.registroId),outra=rows.find(r=>r[11]!==p.registroId);
 assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(r),'14/11/2026');assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(outra),'');assert.equal(r[17],208);assert.equal(r[14],'Pago');assert.equal(r[9],'A Receber');assert.equal(a.ctx.formatarCelulaRegistroGestor_(r[8],'MM/yyyy'),'10/2026');assert.equal(a.ctx.formatarCelulaRegistroGestor_(outra[8],'MM/yyyy'),'11/2026');
});
test('data combinada não transfere pagamento parcial para outra fatura',()=>{
 const a=ambiente(true,50),p=pedido(a);a.ctx.editarEmprestimoLinhaWeb(p);const r=a.db.sheets[a.nome].rows.find(r=>r[11]===p.registroId);assert.equal(r[17],50);assert.equal(r[14],'Em Aberto');
 const antes=JSON.stringify(a.db.sheets[a.nome].rows);assert.throws(()=>a.ctx.editarEmprestimoLinhaWeb({...pedido(a),mesFatura:'12/2026',requestId:'mudar-mes-realmente-001'}),/fatura original/);assert.equal(JSON.stringify(a.db.sheets[a.nome].rows),antes);
});
test('propagar valor conserva os meses nativos e não propaga a data de recebimento',()=>{
 const a=ambiente(),p=pedido(a,true,{propagarValorParcelas:true});a.ctx.editarEmprestimoLinhaWeb(p);const rs=a.db.sheets[a.nome].rows.slice(1);assert.equal(rs.filter(r=>a.ctx.dataCombinadaEmprestimoGestor_(r)).length,1);assert.equal(rs.reduce((s,r)=>s+r[17],0),208);assert.deepEqual(rs.map(r=>a.ctx.formatarCelulaRegistroGestor_(r[8],'MM/yyyy')).sort(),['10/2026','11/2026']);
});
test('proteção de pagamento pessoal também compara a competência em vez do tipo da célula',()=>{
 const a=ambiente(false),p=pedido(a,false,{descricao:'Compra corrigida'});a.ctx.editarLancamentoLinhaWeb(p);const r=a.db.sheets[a.nome].rows.find(r=>r[11]===p.registroId);assert.equal(r[17],208);assert.equal(r[9],'Pago');assert.equal(a.ctx.formatarCelulaRegistroGestor_(r[8],'MM/yyyy'),'10/2026');
});
