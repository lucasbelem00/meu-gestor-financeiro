const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,launch}=require('./fixtures/gestor-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
const ler=a=>api(a,'getDadosCompletos');
const ref=(r,emp=false)=>({registroId:r[11],compraId:r[12],versao:r[13],linha:2,descOriginal:r[emp?2:1],mesOriginal:r[8],parcelaOriginal:r[6]});
function edicao(r,extras={}){return {...ref(r,true),dataCompra:r[0],pessoa:r[1],descricao:r[2],formaPagto:r[3],valorParcela:r[7],mesFatura:r[8],status:r[9],observacoes:r[10],...extras};}
function pix(){const a=boot(fixture([],[loan('Ana','A Receber',120,'Cartao')]));a.ctx.console={log(){}};ler(a);a.p=edicao(a.db.sheets['Empréstimos'].rows[1],{formaPagto:'Pix'});return a;}

test('fixo reprogramado para antes de uma ocorrência futura cria a vigência solicitada',()=>{
 const a=boot(fixture([personal('Streaming',20,'∞/∞','10/2026','Assinatura Paga')]));a.ctx.console={log(){}};
 function editar(mes,valor,id){const s=ler(a).assinaturas[0];return api(a,'editarAssinaturaWeb',{registroId:s.registroId,compraId:s.compraId,versao:s.versao,descOriginal:s.descricao,novaDesc:s.descricao,novaForma:s.forma,novaCat:'Teste',novaValor:valor,aPartirMes:mes,requestId:id});}
 editar('01/2027',25,'correcao-fixo-janeiro-001');const r=editar('11/2026',30,'correcao-fixo-novembro-001');assert.equal(r.aPartirMes,'11/2026');
 a.ctx.getHojeSeguro=()=>new Date(2026,10,16);ler(a);const rs=a.db.sheets['Lançamentos'].rows.slice(1),mes=m=>rs.find(r=>r[8]===m);
 assert.equal(mes('10/2026')[7],20);assert(a.ctx.isStatusPago(mes('10/2026')[9]));assert.equal(mes('11/2026')[7],30);assert.equal(mes('01/2027')[7],30);assert.equal(rs.filter(r=>r[8]==='11/2026').length,1);
});

test('próximas devoluções seguem número da parcela após antecipação para a mesma fatura',()=>{
 const a=boot(fixture());a.ctx.console={log(){}};api(a,'salvarLancamentoWeb',{...launch,requestId:'correcao-antecipacao-compra-001'});let r=a.db.sheets['Lançamentos'].rows.find(r=>r[6]==='1/3');
 let p={...ref(r),mesDestino:'10/2026'};p.previaHash=api(a,'previaAntecipacaoWeb',p).previaHash;api(a,'adiantarParcelasWeb',{...p,requestId:'correcao-antecipacao-001'});
 r=a.db.sheets['Lançamentos'].rows.find(r=>r[6]==='1/3');api(a,'moverParaEmprestimosWeb',{...ref(r),pessoa:'Ana',requestId:'correcao-antecipacao-mover-001'});
 r=a.db.sheets['Empréstimos'].rows.find(r=>r[6]==='2/3');p=edicao(r,{escopoDataCombinada:'proximas',dataCombinada:'31/01/2027'});const pre=api(a,'previaEdicaoEmprestimoWeb',p);
 assert.deepEqual(Array.from(pre.datas.itens,i=>[i.parcela,i.depois]),[['2/3','31/01/2027'],['3/3','28/02/2027']]);
 api(a,'editarEmprestimoLinhaWeb',{...p,assinaturaDatas:pre.datas.assinatura,requestId:'correcao-antecipacao-datas-001'});
 const rs=a.db.sheets['Empréstimos'].rows.slice(1),data=n=>a.ctx.dataCombinadaEmprestimoGestor_(rs.find(r=>r[6]===n));assert.equal(data('1/3'),'');assert.equal(data('2/3'),'31/01/2027');assert.equal(data('3/3'),'28/02/2027');assert(rs.every(r=>r[8]==='10/2026'));
});

test('troca de cartão para Pix exige prévia e consentimento, separando o recebimento',()=>{
 const a=pix(),antes=JSON.stringify(a.db.sheets['Empréstimos'].rows),pre=api(a,'previaEdicaoEmprestimoWeb',a.p);assert.equal(pre.pagamentoPix.total,120);assert.equal(pre.pagamentoPix.quantidade,1);
 assert.throws(()=>api(a,'editarEmprestimoLinhaWeb',{...a.p,requestId:'correcao-pix-sem-consentimento-001'}),/confirme o pagamento/);assert.equal(JSON.stringify(a.db.sheets['Empréstimos'].rows),antes);
 const p={...a.p,confirmarPagamentoPix:true,assinaturaPix:pre.pagamentoPix.assinatura,requestId:'correcao-pix-confirmado-001'};api(a,'editarEmprestimoLinhaWeb',p);
 const item=ler(a).emprestimos.itens[0];assert.equal(item.forma,'Pix');assert.equal(item.pagoBancoRaw,120);assert.equal(item.saldoBancoRaw,0);assert.equal(item.status,'A Receber');const salvo=JSON.stringify(a.db.sheets['Empréstimos'].rows);api(a,'editarEmprestimoLinhaWeb',p);assert.equal(JSON.stringify(a.db.sheets['Empréstimos'].rows),salvo);
});

test('prévia Pix não autoriza um valor diferente nem transfere pagamento já registrado',()=>{
 const a=pix(),pre=api(a,'previaEdicaoEmprestimoWeb',a.p);assert.throws(()=>api(a,'editarEmprestimoLinhaWeb',{...a.p,valorParcela:130,confirmarPagamentoPix:true,assinaturaPix:pre.pagamentoPix.assinatura,requestId:'correcao-pix-previa-alterada-001'}),/confirme o pagamento/);
 const f=api(a,'previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:20});api(a,'registrarPagamentoFaturaWeb',{...f,requestId:'correcao-pix-banco-001'});a.p=edicao(a.db.sheets['Empréstimos'].rows[1],{formaPagto:'Pix'});
 assert.throws(()=>api(a,'previaEdicaoEmprestimoWeb',a.p),/pagamento|pago/);assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).pago,20);assert.equal(a.db.sheets['Empréstimos'].rows[1][3],'Cartao');
});

test('prévia Pix contempla todas as parcelas abertas afetadas e exclui recebidas',()=>{
 const a=boot(fixture());a.ctx.console={log(){}};api(a,'salvarEmprestimoWeb',{dataCompra:'01/10/2026',pessoa:'Ana',descricao:'Compra',formaPagto:'Cartao',valorTotal:300,numParcelas:3,parcelaInicial:1,mesPrimeiraFatura:'10/2026',requestId:'correcao-pix-parcelas-001'});
 const rows=a.db.sheets['Empréstimos'].rows;rows.find(r=>r[6]==='3/3')[9]='Recebido';ler(a);const p=edicao(rows.find(r=>r[6]==='1/3'),{formaPagto:'Pix'}),pre=api(a,'previaEdicaoEmprestimoWeb',p);assert.equal(pre.pagamentoPix.total,200);assert.equal(pre.pagamentoPix.quantidade,2);
 api(a,'editarEmprestimoLinhaWeb',{...p,confirmarPagamentoPix:true,assinaturaPix:pre.pagamentoPix.assinatura,requestId:'correcao-pix-parcelas-salvar-001'});const itens=ler(a).emprestimos.itens;assert.equal(itens.filter(i=>i.forma==='Pix'&&i.pagoBancoRaw===100&&i.status==='A Receber').length,2);assert.equal(rows.find(r=>r[6]==='3/3')[3],'Cartao');
});
