const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function tela(){const c=vm.createContext({window:{renderizarDados(){},setAba(){}},document:{addEventListener(){}},lerValorMoeda:Number,formatBRL:v=>'R$ '+v});for(const p of ['shared/competencias.js','interface/situacoes.js','interface/agenda.js'])vm.runInContext(fs.readFileSync(p,'utf8'),c);return c;}
const pix=(id,data)=>({registroId:id,versao:1,linha:2,status:'Agendado',data,descricao:'Teste',valorRaw:30,mesFatura:'11/2026',forma:'Pix',parcela:'1/1'});
test('Agenda e Painel usam a data exata do Pix inclusive domingo/feriado, sem quitação automática',()=>{
 const c=tela(),dados={pixAgendados:[pix('um','01/11/2026'),pix('dois','02/11/2026'),pix('longe','20/11/2026')]},antes=JSON.stringify(dados),hoje=new Date(2026,10,1);
 const e=c.compromissosAgendaGestor(dados,hoje);assert.equal(e.length,3);assert.equal(e[0].data,'01/11/2026');assert.equal(e[0].situacao.codigo,'hoje');assert.equal(e[1].data,'02/11/2026');
 const avisos=c.alertasBancariosGestor(dados,hoje);assert.equal(avisos.length,2);assert(avisos.every(a=>a.tipo==='pix'));assert.equal(avisos[0].dias,0);assert.equal(JSON.stringify(dados),antes);
 const vencido=c.alertasBancariosGestor(dados,new Date(2026,10,4));assert(vencido.every(a=>a.dias<0));assert(c.compromissosAgendaGestor(dados,new Date(2026,10,4))[0].situacao.codigo==='vencido');
});
test('Pix pago, inválido e repetido não gera avisos duplicados; carga antiga continua aceita',()=>{
 const c=tela();assert.equal(c.alertasBancariosGestor({alertasVencimento:[]}).length,0);
 const d={pixAgendados:[pix('um','10/11/2026'),pix('um','10/11/2026'),{...pix('pago','10/11/2026'),status:'Pago'},pix('invalido','31/11/2026')]};assert.equal(c.compromissosAgendaGestor(d,new Date(2026,10,4)).length,1);
});
test('correção de data sugere pagamento mas permite desmarcar; cartão e data futura não habilitam',()=>{
 const html=fs.readFileSync('index.html','utf8'),s=html.slice(html.indexOf('    function atualizarConfirmacaoPagamentoImediatoEdicaoGestor(){'),html.indexOf('    function confirmarEdicaoFinanceiraGestor('));
 const el={modalEdicaoLanc:{_dadosOriginaisEdicao:{dataCompra:'10/11/2026',formaPagto:'Pix',status:'Agendado'}},boxEdPagamentoImediato:{hidden:true},chkEdPagamentoImediato:{checked:false},inpEdData:{value:'10/11/2026'},inpEdParcelaStr:{value:'1/1'},selEdForma:{value:'Pix'}};
 const c=tela();c.document.getElementById=id=>el[id];c.formaEhImediataGestor=f=>f==='Pix';c.hojeSituacaoVisualGestor=()=>Date.UTC(2026,10,4)/86400000;vm.runInContext(s,c);
 c.atualizarConfirmacaoPagamentoImediatoEdicaoGestor();assert.equal(el.boxEdPagamentoImediato.hidden,true);
 el.inpEdData.value='25/10/2026';c.atualizarConfirmacaoPagamentoImediatoEdicaoGestor();assert.equal(el.boxEdPagamentoImediato.hidden,false);assert.equal(el.chkEdPagamentoImediato.checked,true);
 el.chkEdPagamentoImediato.checked=false;c.atualizarConfirmacaoPagamentoImediatoEdicaoGestor();assert.equal(el.chkEdPagamentoImediato.checked,false);
 el.selEdForma.value='Cartao';c.atualizarConfirmacaoPagamentoImediatoEdicaoGestor();assert.equal(el.boxEdPagamentoImediato.hidden,true);
});
