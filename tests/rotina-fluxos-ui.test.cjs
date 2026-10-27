const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {ambiente,esperar}=require('./fixtures/rotina-fluxos-ui.cjs');
test('alterar a data visível do empréstimo sincroniza o payload',async()=>{
 const a=ambiente();a.c.preencherDataTripla('emp','16/10/2026');a.el('inpEmpDataDia').value='07';a.el('inpEmpDataMes').value='09';a.el('inpEmpDataAno').value='2026';
 for(const [id,v]of Object.entries({selEmpForma:'Cartao',inpEmpMesFat:'09/2026',inpEmpPessoa:'Pessoa Teste',inpEmpDesc:'Compra',inpEmpValor:'120',inpEmpParc:'1',inpEmpParcIni:'1'}))a.el(id).value=v;
 a.c.sincronizarDataEmp();await a.c.window.enviarEmprestimo({preventDefault(){}});assert.equal(a.envios[0].dataCompra,'07/09/2026');assert.equal(a.calculos.at(-1),'07/09/2026');
});
test('data impossível preserva os campos e não prepara empréstimo',()=>{
 const a=ambiente();a.c.preencherDataTripla('emp','31/02/2026');a.c.window.enviarEmprestimo({preventDefault(){}});assert.equal(a.envios.length,0);assert.equal(a.el('inpEmpDataDia').value,'31');assert.equal(a.avisos.at(-1)[0],'Data inválida');
});
test('botões de recebimento parcial e transferência voltam a funcionar após sucesso',async()=>{
 for(const mover of [false,true]){const a=ambiente();a.c.abrirModalEdicaoEmp('e:A:1:2','01/10/2026','Ana','Compra','Cartao',100,'10/2026','A Receber','1/1','');if(mover){a.el('selMoverPessoalCat').value='Teste';a.c.executarMoverParaPessoal();}else{a.el('inpDividirEmpValor').value='40';a.c.executarDividirParcelaEmp();}
  a.chamadas[0].resolve({restante:60,qtdMovida:1});await esperar();a.c.abrirModalEdicaoEmp('e:B:1:3','01/10/2026','Bruno','Outra','Cartao',60,'10/2026','A Receber','1/1','');assert.equal(a.el(mover?'botaoMover':'botaoParcial').disabled,false);assert.notEqual(a.el(mover?'botaoMover':'botaoParcial').textContent,mover?'Transferindo...':'Processando...');
 }
});
test('resposta tardia de A não fecha o editor de B nem grava em B',async()=>{
 const a=ambiente();a.c.abrirModalEdicaoEmp('e:A:1:2','01/10/2026','Ana','A','Cartao',100,'10/2026','A Receber','1/1','');a.el('inpEdEmpObs').value='A alterado';a.c.salvarEdicaoEmp({preventDefault(){}});a.c.fecharModalEdicaoEmp();a.c.abrirModalEdicaoEmp('e:B:1:3','01/10/2026','Bruno','B','Cartao',50,'10/2026','A Receber','1/1','');a.el('inpEdEmpObs').value='B em elaboração';a.chamadas[0].resolve({sucesso:true});await esperar();assert.equal(a.el('modalEdicaoEmp').classList.contains('hidden'),false);assert.equal(a.el('inpEdEmpObs').value,'B em elaboração');assert.equal(a.chamadas.length,1);assert.equal(a.chamadas[0].p.linha,'e:A:1:2');
});
test('prévia pessoal e empréstimo mostram parcelas que somam o total informado',()=>{
 const a=ambiente();a.el('inpValor').value='100';a.el('inpParc').value='3';a.el('inpEmpValor').value='100';a.el('inpEmpParc').value='3';a.c.atualizarPreviewParcelas();a.c.atualizarPreviewParcEmp();assert.equal(a.el('lblPreviewParcelas').textContent,'1x de R$ 33,34 + 2x de R$ 33,33');assert.equal(a.el('lblPreviewParcEmp').textContent,a.el('lblPreviewParcelas').textContent);
});
function colagem(){const a=ambiente(),c=a.c,fonte=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8');const i=fonte.indexOf('    window.extrairValorPixAoColar = function'),f=fonte.indexOf('\n  });\n\n  /* ----------------------------------------------------------------- 12 */',i);vm.runInContext(fonte.slice(i,f),c);c.Event=function(){};for(const id of ['inpValor','inpDesc'])a.el(id).dispatchEvent=()=>{};const inicio=rotina.indexOf('const colarPixAnteriorRotinaGestor='),fim=rotina.indexOf('const painelEmpAnteriorRotinaGestor=',inicio);vm.runInContext(rotina.slice(inicio,fim),c);const escolhas=[];c.escolherValorColadoRotinaGestor=(opcoes,aplicar)=>escolhas.push({opcoes,aplicar});return {...a,escolhas,colar:texto=>c.extrairValorPixAoColar({clipboardData:{getData:()=>texto},preventDefault(){}},'inpValor','inpDesc')};}
test('colagem com saldo e transferência exige escolha, preservando valor manual',()=>{
 const a=colagem();a.el('inpValor').value='80';a.colar('Saldo R$ 900,00. Transferência R$ 25,50.');assert.equal(a.el('inpValor').value,'80');assert.equal(a.escolhas.length,1);assert.equal(a.escolhas[0].opcoes.length,2);a.escolhas[0].aplicar(25.5);assert.equal(a.el('inpValor').value,'25.5');
});
test('colagem única não substitui valor manual sem confirmar e rejeita uma prévia alterada',()=>{
 const a=colagem();a.el('inpValor').value='80';a.colar('Pix R$ 25,50');assert.equal(a.confirmacoes.length,1);assert.equal(a.el('inpValor').value,'80');a.el('inpValor').value='90';a.confirmacoes[0][2]();assert.equal(a.el('inpValor').value,'90');
});
test('fechar editor alterado pede confirmação e recusa descartar uma versão que mudou',()=>{
 const a=ambiente(),rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8');const m=a.el('modalEdicaoEmp'),form=a.el('formEditorTeste');form.elements=['inpEdEmpPessoa','inpEdEmpDesc','inpEdEmpObs'].map(a.el);m.querySelector=()=>form;
 const i=rotina.indexOf('function protegerEditorRotinaGestor('),f=rotina.indexOf("for(const a of [['abrirModalEdicaoEmp'",i);vm.runInContext(rotina.slice(i,f),a.c);a.c.protegerEditorRotinaGestor('abrirModalEdicaoEmp','fecharModalEdicaoEmp','modalEdicaoEmp');
 const abrir=()=>a.c.abrirModalEdicaoEmp('e:A:1:2','01/10/2026','Ana','Compra','Cartao',100,'10/2026','A Receber','1/1','Original');abrir();a.c.fecharModalEdicaoEmp();assert.equal(a.confirmacoes.length,0);abrir();a.el('inpEdEmpObs').value='Em elaboração';a.c.fecharModalEdicaoEmp();assert.equal(a.confirmacoes.length,1);assert.equal(m.classList.contains('hidden'),false);a.el('inpEdEmpObs').value='Mais recente';a.confirmacoes[0][2]();assert.equal(m.classList.contains('hidden'),false);a.c.fecharModalEdicaoEmp();a.confirmacoes[1][2]();assert.equal(m.classList.contains('hidden'),true);
});
test('limpar formulário preenchido exige confirmação e mantém alterações posteriores',()=>{
 const a=ambiente(),rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8');a.c.bloqueioFormularioRotinaGestor=()=>false;a.c.haRascunhoFormularioGestor=()=>true;a.c.renderizarRecuperacaoRascunhosGestor=()=>{};a.c.limparFormularioNovoGasto=()=>a.el('inpDesc').value='';a.el('formLancamento').elements=[a.el('inpDesc')];a.el('inpDesc').value='Meu rascunho';const i=rotina.indexOf('function pedirLimpezaFormularioGestor('),f=rotina.indexOf('function renderizarRecuperacaoRascunhosGestor(',i);vm.runInContext(rotina.slice(i,f),a.c);a.c.pedirLimpezaFormularioGestor(false);assert.equal(a.el('inpDesc').value,'Meu rascunho');a.el('inpDesc').value='Alterado';a.confirmacoes[0][2]();assert.equal(a.el('inpDesc').value,'Alterado');a.c.pedirLimpezaFormularioGestor(false);a.confirmacoes[1][2]();assert.equal(a.el('inpDesc').value,'');
});
test('recarga descartada não retorna sucesso quando a consulta mais recente falha',async()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),i=html.indexOf('    function carregarDados() {'),f=html.indexOf('function limparFormularioEmprestimo()',i),pedidos=[];let renders=0;
 const c=vm.createContext({console,requisicaoCarregarDadosAtual:0,dadosCarregadosIniciais:true,notasGlobais:[],inicializarNotasLocaisGestor(){},lerCacheLeituraGestor:()=>null,salvarCacheLeituraGestor(){},renderizarDados(){renders++;},sincronizarNotasNuvem(){},mostrarAviso(){},apiCall:()=>new Promise((resolve,reject)=>pedidos.push({resolve,reject}))});require('./fixtures/aviso-leitura-ui.cjs')(c);vm.runInContext(html.slice(i,f),c);const a=c.carregarDados(),b=c.carregarDados();pedidos[0].resolve({});assert.equal(await a,false);pedidos[1].reject(Error('Conexão fictícia indisponível'));assert.equal(await b,false);assert.equal(renders,0);
});
test('recebimento não pode quitar o valor original usando uma edição menor ainda não salva',()=>{
 const a=ambiente(),rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8'),m=a.el('modalEdicaoEmp'),form=a.el('formTesteRecebimento');form.elements=['inpEdEmpPessoa','inpEdEmpDesc','inpEdEmpValor','inpEdEmpObs','inpDividirEmpValor'].map(a.el);m.querySelector=()=>form;
 const i=rotina.indexOf('function protegerEditorRotinaGestor('),f=rotina.indexOf("for(const a of [['abrirModalEdicaoEmp'",i);vm.runInContext(rotina.slice(i,f),a.c);a.c.protegerEditorRotinaGestor('abrirModalEdicaoEmp','fecharModalEdicaoEmp','modalEdicaoEmp');
 const inicio=rotina.indexOf('const parcialAnteriorRotinaGestor='),fim=rotina.indexOf('function mostrarRecebidosEmpGestor(',inicio);vm.runInContext(rotina.slice(inicio,fim),a.c);
 a.c.abrirModalEdicaoEmp('e:A:1:2','01/10/2026','Ana','Compra','Cartao',100,'10/2026','A Receber','1/1','');a.el('inpEdEmpValor').value='50';a.el('inpDividirEmpValor').value='50';a.c.executarDividirParcelaEmp();assert.equal(a.chamadas.length,0);assert.equal(a.confirmacoes.length,0);assert.equal(a.avisos.at(-1)[0],'Salve as alterações primeiro');
});
