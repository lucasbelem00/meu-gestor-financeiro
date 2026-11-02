const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot,fixture,personal,loan,launch}=require('./fixtures/gestor-mocks.cjs');
const alvo=r=>({registroId:r[11],compraId:r[12],versao:r[13]});
function ambiente(lanc=[],emp=[]){const a=boot(fixture(lanc,emp));a.ctx.console={log(){},warn(){}};a.api=(n,p)=>a.ctx.executarAcaoApi_(n,p??null);a.api('getDadosCompletos');return a;}
function padrao(a){a.api('salvarCategoriasWeb',{categorias:[{nome:'Teste',meta:0,tipoGasto:'variavel',prioridadeGasto:'ajustavel'}],versaoConfiguracao:a.api('getDadosCompletos').versoesConfiguracao.categorias,requestId:'perfil-padrao-auditoria-001'});}
test('converter empréstimo novo em gasto aplica padrão e desativa prazo sem perder pagamento',()=>{
 const a=ambiente([],[loan('Ana','A Receber',100,'Cartao')]);padrao(a);const r=a.db.sheets['Empréstimos'].rows[1];a.ctx.definirDataCombinadaGestor_(r,'10/11/2026');r[10]='Minha observação';r[17]=20;r[16]=a.ctx.hashRegistroGestor_(r);const id=r[11];
 a.api('moverParaGastosPessoaisWeb',{...alvo(r),categoria:'Teste',tags:'#convertido',requestId:'converter-pessoal-auditoria-001'});const p=a.db.sheets['Lançamentos'].rows[1];assert.equal(p[11],id);assert.equal(p[17],20);assert.equal(a.ctx.lerPerfilGastoGestor_(p).tipo,'variavel');assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(p),'');
 a.api('moverParaEmprestimosWeb',{...alvo(p),pessoa:'Ana',requestId:'converter-voltar-auditoria-001'});const e=a.db.sheets['Empréstimos'].rows[1];assert.equal(e[17],20);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(e),'');assert.equal(a.ctx.lerPerfilGastoGestor_(e).prioridade,'ajustavel');
});
test('ida e volta preserva exceção individual e escolha explícita de não classificar',()=>{
 for(const perfil of [{tipo:'fixo',prioridade:'essencial'},{tipo:'',prioridade:''}]){const a=ambiente();padrao(a);a.api('salvarLancamentoWeb',{...launch,numParcelas:1,perfilGasto:perfil,requestId:'compra-ida-volta-auditoria-001'});let r=a.db.sheets['Lançamentos'].rows[1];a.ctx.definirPerfilGastoGestor_(r,perfil);r[16]=a.ctx.hashRegistroGestor_(r);
 a.api('moverParaEmprestimosWeb',{...alvo(r),pessoa:'Ana',requestId:'ida-auditoria-001'});r=a.db.sheets['Empréstimos'].rows[1];a.api('moverParaGastosPessoaisWeb',{...alvo(r),categoria:'Teste',requestId:'volta-auditoria-001'});assert.equal(JSON.stringify(a.ctx.lerPerfilGastoGestor_(a.db.sheets['Lançamentos'].rows[1])),JSON.stringify(perfil));}
});
test('ordenação retroativa preserva perfil, identidades e mesmo contrato do Histórico',()=>{
 const a=ambiente([personal('Posterior',50,'1/1','10/2026','Em Aberto','Cartao','20/10/2026')]);padrao(a);a.api('salvarLancamentoWeb',{...launch,numParcelas:1,dataCompra:'01/10/2026',descricao:'Anterior',requestId:'retroativa-auditoria-001'});
 const d=a.api('getDadosCompletos'),h=a.api('filtrarLancamentosWeb',{filtros:{mes:'10/2026'},offset:0,limite:50});for(const lista of [d.lancamentos,h.itens]){const r=lista.find(r=>r[1]==='Anterior');assert.equal(r.length,22);assert.equal(r[20].tipo,'variavel');assert.equal(r[17],false);assert.equal(r[18],null);assert.equal(r[21],null);assert(r[13]);}
});
test('observação de recebimento parcial não acumula marcadores e preserva conteúdo livre',()=>{
 const a=ambiente();for(const [antes,depois]of [['','Pagamento Parcial'],[' Pago dia 20 ','Pago dia 20 (Pagamento Parcial)'],['Pago dia 20 (Pagamento Parcial) (Pagamento Parcial)','Pago dia 20 (Pagamento Parcial)'],['Pagamento Parcial','Pagamento Parcial']])assert.equal(a.ctx.observacaoPagamentoParcialGestor_(antes),depois);
});
test('fallback bancário adia domingo seguido de Finados e confere data com o calendário da interface',()=>{
 const a=ambiente([personal('Cartão',50,'1/1','11/2026')]),formas=[{nome:'Cartao',tipo:'cartao',vencimento:1}],raw=a.db.sheets['Lançamentos'].rows[1];a.ctx.tipoFormaGestor_=()=> 'cartao';const res=a.ctx.calcularAlertasVencimento_(formas,[{raw,disp:raw}],new Date(2026,10,1));assert.equal(res[0].data,'03/11/2026');assert.equal(res[0].dias,2);
 const front=vm.createContext({localStorage:{getItem:()=>null}});vm.runInContext(fs.readFileSync('interface/situacoes.js','utf8'),front);assert.equal(front.vencimentoFaturaBancarioGestor('Cartao','11/2026',1).data,res[0].data);
});
const html=fs.readFileSync('index.html','utf8');
function funcao(nome,proxima){return html.slice(html.indexOf('    function '+nome+'('),html.indexOf('    function '+proxima+'('));}
test('limpeza bloqueada por envio incerto preserva também tipo e prioridade',()=>{
 const campos={'perfil-novo-tipo':{value:'fixo'},'perfil-novo-prioridade':{value:'essencial'}},avisos=[];const c=vm.createContext({document:{getElementById:id=>campos[id]},estadoIntegracaoInterfaceGestor:{PX_CHAVE_RESULTADO_INCERTO:'incerto'},sessionStorage:{getItem:()=> 'true'},mostrarAviso:(...v)=>avisos.push(v)});vm.runInContext(funcao('limparFormularioNovoGasto','formatarInfoParcelaCard'),c);c.limparFormularioNovoGasto();assert.equal(campos['perfil-novo-tipo'].value,'fixo');assert.equal(campos['perfil-novo-prioridade'].value,'essencial');assert.equal(avisos.length,1);
});
test('Repetir guarda os campos preenchidos como rascunho antes de qualquer digitação',()=>{
 const campos=new Map();const el=id=>{if(!campos.has(id))campos.set(id,{value:'',dataset:{}});return campos.get(id);};let salvo;const c=vm.createContext({document:{getElementById:el},bloqueioFormularioRotinaGestor:()=>false,limparFormularioNovoGasto(){},definirValorMoeda:(id,v)=>el(id).value=v,lerValorMoeda:v=>Number(v),toggleBotaoLimpar(){},atualizarRegrasForma(){},sincronizarChipsTags(){},setAba(){},mostrarAviso(){},salvarRascunho:()=>salvo=Object.fromEntries([...campos].map(([id,e])=>[id,e.value]))});vm.runInContext(funcao('repetirLancamentoHoje','filtrarPorTagRapida'),c);c.repetirLancamentoHoje('Compra','Cartao','Teste','50','#tag');assert.equal(salvo.inpDesc,'Compra');assert.equal(salvo.inpValor,50);assert.equal(salvo.inpTags,'#tag');c.bloqueioFormularioRotinaGestor=()=>true;c.repetirLancamentoHoje('Outra','Pix','Outros','99','');assert.equal(el('inpDesc').value,'Compra');
});
test('cancelar categorias limpa tipo e prioridade além de nome e meta',()=>{
 const campos=new Map(),el=id=>{if(!campos.has(id))campos.set(id,{value:'anterior',disabled:false,classList:{replace(){}}});return campos.get(id);};
 const c=vm.createContext({document:{getElementById:el,addEventListener(){}},pxEl:el,modoEdicaoCategorias:true,pxSalvandoCats:false,pxConfigCatsServidor:[{nome:'Teste'}],categoriasGlobaisEdit:[],toggleEdicaoCategorias(){c.modoEdicaoCategorias=false;}});c.window=c;
 vm.runInContext(fs.readFileSync('interface/perfil.js','utf8'),c);const a=html.indexOf('    var origToggleCat ='),b=html.indexOf('    var pxRemoverCategoriaOriginal',a);vm.runInContext(html.slice(a,b),c);c.toggleEdicaoCategorias();for(const id of ['inpNovaCat','inpNovaMeta','inpCatTipoGasto','inpCatPrioridadeGasto'])assert.equal(el(id).value,'');
});
test('atalho de empréstimo atualiza layout e prévia; atalho pessoal guarda a tag automática no rascunho',()=>{
 const {ambiente}=require('./fixtures/rotina-fluxos-ui.cjs'),a=ambiente();let gravado,empSalvo=0;
 a.c.salvarRascunhoEmp=()=>empSalvo++;a.c.salvarRascunho=()=>gravado=a.el('inpTags').value;a.c.toggleBotaoLimpar=()=>{};a.c.sincronizarChipsTags=()=>{};
 vm.runInContext(funcao('atualizarLayoutParcelasEmprestimo','atualizarFaturaEmprestimo'),a.c);const ini=html.indexOf('function aplicarParcelamentoRapido(qtd'),fim=html.indexOf('    // Resolve a entrada',ini);vm.runInContext(html.slice(ini,fim),a.c);
 a.el('inpEmpValor').value='100';a.el('inpEmpParc').value='1';a.el('selEmpForma').value='Cartao';a.c.atualizarLayoutParcelasEmprestimo();assert.equal(a.el('boxEmpParcIni').classList.contains('hidden'),true);a.c.aplicarParcelamentoRapido(3,'emp');assert.equal(a.el('boxEmpParcIni').classList.contains('hidden'),false);assert.match(a.el('lblPreviewParcEmp').textContent,/33,34/);assert.equal(a.el('lblPreviewParcEmp').hidden,false);assert.equal(empSalvo,1);
 a.el('inpTags').value='#teste';a.c.aplicarParcelamentoRapido(6,'novo');assert.match(gravado,/#parcelado/);
});

test('compra pessoal legada não ganha classificação retroativa ao ir e voltar de empréstimos',()=>{const a=ambiente([personal('Antiga',50)]);padrao(a);let r=a.db.sheets['Lançamentos'].rows[1];assert.equal(a.ctx.perfilRegistradoGastoGestor_(r),null);a.api('moverParaEmprestimosWeb',{...alvo(r),pessoa:'Ana',requestId:'ida-legada-auditoria-001'});r=a.db.sheets['Empréstimos'].rows[1];a.api('moverParaGastosPessoaisWeb',{...alvo(r),categoria:'Teste',requestId:'volta-legada-auditoria-001'});assert.equal(a.ctx.lerPerfilGastoGestor_(a.db.sheets['Lançamentos'].rows[1]).tipo,'');});
