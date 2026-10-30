const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {boot,fixture,personal,launch}=require('./fixtures/gestor-mocks.cjs');
const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function nativo(){
 const a=boot(fixture());a.ctx.console={log(){}};api(a,'getDadosCompletos');
 const rows=Array.from({length:14},()=>['','','','']);['16/10/2026','Compra nativa','Cartao','Teste',100,1,1,'10/2026','Em Aberto'].forEach((v,i)=>rows[5+i][3]=v);
 a.db.insertSheet('Formulário de Lançamento').rows=rows;a.ctx.LockService.getDocumentLock=()=>({waitLock(){},releaseLock(){}});a.avisos=[];a.ctx.SpreadsheetApp.getUi=()=>({alert:t=>a.avisos.push(t)});return {...a,rows};
}
test('ano digitado incorretamente é recusado antes de gravar gasto ou empréstimo',()=>{
 for(const acao of ['salvarLancamentoWeb','salvarEmprestimoWeb']){const a=boot(fixture());api(a,'getDadosCompletos');const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows)+JSON.stringify(a.db.sheets['Empréstimos'].rows);
 assert.throws(()=>api(a,acao,{...launch,pessoa:'Ana',mesPrimeiraFatura:'10/2926',requestId:'ano-invalido-'+acao}),/1900.*2200/);
 assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows)+JSON.stringify(a.db.sheets['Empréstimos'].rows),antes);}
});
test('a última parcela também respeita o limite, incluindo a parcela inicial selecionada',()=>{
 const a=boot(fixture());api(a,'getDadosCompletos');for(const acao of ['salvarLancamentoWeb','salvarEmprestimoWeb'])assert.throws(()=>api(a,acao,{...launch,pessoa:'Ana',mesPrimeiraFatura:'12/2200',numParcelas:2,requestId:'ano-limite-'+acao}),/ultrapassam.*2200/);
 api(a,'salvarLancamentoWeb',{...launch,mesPrimeiraFatura:'12/2200',numParcelas:2,parcelaInicial:2,requestId:'ano-limite-parcela-final-001'});assert.equal(a.db.sheets['Lançamentos'].rows.length,2);assert.equal(a.db.sheets['Lançamentos'].rows[1][8],'12/2200');
});
test('intervalo histórico aceito no cadastro também funciona na organização anual e consulta',()=>{
 const a=ambienteProtecao(fixture());a.ativar();api(a,'salvarLancamentoWeb',{...launch,mesPrimeiraFatura:'10/1999',numParcelas:1,requestId:'historico-1999-organizacao'});a.ctx.ativarOrganizacaoAnualWeb();assert.equal(api(a,'obterRelatorioMes','10/1999').kpis.total,'R$ 100,00');assert(a.ctx.catalogoAnosGestor_(a.db).some(e=>e.ano===1999));assert.equal(a.ctx.validarMesFaturaWeb_('01/1900'),'01/1900');
});
test('ativação confere competência legada antes de marcar anual/PDF ativos; permite corrigir e retomar',()=>{
 const a=ambienteProtecao(fixture([personal('Compra antiga',25)]));a.ativar();a.db.sheets['Lançamentos'].rows[1][8]='10/2926';
 assert.throws(()=>a.ctx.ativarOrganizacaoAnualWeb(),/Competência anual inválida.*Lançamentos.*registro 1/);assert.equal(Boolean(a.ctx.configProtecaoGestor_().organizacaoAnual),false);assert.equal(Boolean(a.ctx.configProtecaoGestor_().pdfAutomatico),false);assert.equal(a.planilhas.size,1);
 assert(api(a,'getDadosCompletos'));a.db.sheets['Lançamentos'].rows[1][8]='10/2026';a.ctx.ativarOrganizacaoAnualWeb();assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');
});
test('relatórios rejeitam períodos fora do intervalo, em vez de consultar outro ano por truncamento',()=>{
 const a=boot(fixture());for(const [n,p]of [['obterRelatorioMes','10/2926'],['obterRelatorioAnual','2926'],['obterRelatorioAnual','2026texto']])assert.throws(()=>api(a,n,p),/inválido/i);
});
test('formulário nativo rejeita centavos insuficientes antes de reservar pedido e aceita correção',()=>{
 const a=nativo();a.rows[9][3]=0.01;a.rows[10][3]=3;a.ctx.gravarLancamentoDoFormulario();assert(!a.props.has('GESTOR_FORMULARIO_ENVIO_V1'));assert.match(a.avisos[0],/Cada parcela/);a.rows[9][3]=300;a.ctx.gravarLancamentoDoFormulario();assert.equal(a.db.sheets['Lançamentos'].rows.length,4);assert.equal(a.db.sheets['Lançamentos'].rows.slice(1).reduce((s,r)=>s+r[7],0),300);
});
test('pedido inválido da versão anterior é cancelado no servidor antes de substituí-lo',()=>{
 const a=nativo(),p={...launch,descricao:'Compra nativa',valorTotal:0.01,requestId:'form-antigo-invalido-001',baseRestauracao:''};const semId={dataCompra:'16/10/2026',descricao:'Compra nativa',formaPagto:'Cartao',categoria:'Teste',valorTotal:0.01,numParcelas:3,parcelaInicial:1,mesPrimeiraFatura:'10/2026',statusInicial:'Em Aberto',isAssinatura:false,tags:''};
 a.props.set('GESTOR_FORMULARIO_ENVIO_V1',JSON.stringify({base:'fixture',assinatura:a.ctx.hashGestor_(semId),payload:p,confirmado:false}));a.rows[9][3]=300;a.rows[10][3]=3;a.ctx.gravarLancamentoDoFormulario();
 assert.equal(a.ctx.consultarOperacaoWeb({action:'salvarLancamentoWeb',requestId:p.requestId}).estado,'cancelado');assert.throws(()=>a.ctx.salvarLancamentoWeb(p),/cancelado com segurança/);assert.equal(a.db.sheets['Lançamentos'].rows.length,4);assert(!a.props.has('GESTOR_FORMULARIO_ENVIO_V1'));
});
test('rejeição definitiva permite substituir dados, mas resposta perdida depois do commit preserva confirmação',()=>{
 for(const commit of [false,true]){const a=nativo(),salvar=a.ctx.salvarLancamentoWeb;a.ctx.salvarLancamentoWeb=p=>{if(commit)salvar(p);throw Error('Rejeição ou resposta perdida');};a.ctx.gravarLancamentoDoFormulario();a.ctx.salvarLancamentoWeb=salvar;a.rows[6][3]='Compra corrigida';a.ctx.gravarLancamentoDoFormulario();const compras=a.db.sheets['Lançamentos'].rows.slice(1);assert.equal(compras.length,1);assert.equal(compras[0][1],commit?'Compra Nativa':'Compra Corrigida');if(commit)assert.equal(a.rows[6][3],'Compra corrigida');}
});
test('hash acompanha mudança de valor, tipo, controle e Date mutável; ignora só metadados excluídos',()=>{
 const a=boot(fixture()),r=personal();r[0]=new Date(2026,9,1);
 let h=a.ctx.hashRegistroGestor_(r);assert.equal(a.ctx.hashRegistroGestor_(r),h);r[13]=20;assert.equal(a.ctx.hashRegistroGestor_(r),h);
 for(const alterar of [()=>r[7]=60,()=>r[0].setDate(2),()=>r[0]='02/10/2026',()=>r[15]='gestor-devolucao-v1:{"data":"10/11/2026"}']){alterar();const novo=a.ctx.hashRegistroGestor_(r);assert.notEqual(novo,h);h=novo;}
});
test('consulta repetida reduz cálculos redundantes mantendo a verificação de todos os registros',()=>{
 const a=boot(fixture(Array.from({length:100},(_,i)=>personal('Compra '+i,10))));api(a,'getDadosCompletos');let calculos=0;const calcular=a.ctx.calcularHashRegistroGestor_;a.ctx.calcularHashRegistroGestor_=c=>{calculos++;return calcular(c);};api(a,'getDadosCompletos');assert.equal(calculos,400);
});
test('cache termina com a operação; edição direta na planilha continua atualizando a versão',()=>{
 const a=boot(fixture([personal('Compra',50)]));api(a,'getDadosCompletos');const r=a.db.sheets['Lançamentos'].rows[1],versao=r[13];assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_',a.ctx),null);r[7]=75;api(a,'getDadosCompletos');assert(r[13]>versao);assert.equal(vm.runInContext('HASHES_EXECUCAO_GESTOR_',a.ctx),null);
});
