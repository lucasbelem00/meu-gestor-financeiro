const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambiente}=require('./fixtures/rotina-fluxos-ui.cjs');
const html=fs.readFileSync('index.html','utf8'),rotina=fs.readFileSync('interface/rotina.js','utf8');
test('prévia de empréstimo preserva centavos e explica somente o intervalo restante',()=>{
 const a=ambiente();Object.entries({inpEmpValor:'100',inpEmpParc:'3',inpEmpParcIni:'2',inpEmpMesFat:'01/2027'}).forEach(([k,v])=>a.el(k).value=v);
 a.c.atualizarPreviewParcEmp();assert.equal(a.el('lblPreviewParcEmp').textContent,'Divisão em 3 parcelas · A partir da parcela 2 de 3\n2 de R$ 33,33');assert.match(a.el('avisoInicioParcelasEmpGestor').textContent,/01\/2027.*parcela 2/);assert.equal(a.el('rotuloMesFaturaEmpGestor').textContent,'Fatura da parcela 2');
 a.el('inpEmpParcIni').value='4';a.c.atualizarPreviewParcEmp();assert.match(a.el('lblPreviewParcEmp').textContent,/Informe um início/);
});
test('início move o mês pela diferença nos dois formulários, atravessa ano e não desloca ao renderizar',()=>{
 for(const emp of [false,true]){const a=ambiente(),prefix=emp?'inpEmp':'inp';a.el(prefix+'Valor').value='100';a.el(prefix+'Parc').value='12';a.el(prefix+'ParcIni').value='1';a.el(prefix+'MesFat').value='12/2026';const preview=()=>emp?a.c.atualizarPreviewParcEmp():a.c.atualizarPreviewParcelas();preview();
 a.el(prefix+'ParcIni').value='3';a.c.aoMudarInicioParcelasGestor(emp);preview();assert.equal(a.el(prefix+'MesFat').value,'02/2027');preview();assert.equal(a.el(prefix+'MesFat').value,'02/2027');a.el(prefix+'ParcIni').value='2';a.c.aoMudarInicioParcelasGestor(emp);preview();assert.equal(a.el(prefix+'MesFat').value,'01/2027');a.el(prefix+'ParcIni').value='99';a.c.aoMudarInicioParcelasGestor(emp);assert.equal(a.el(prefix+'MesFat').value,'01/2027');}
});
test('recalcular empréstimo usa a fatura da parcela inicial e preserva ajuste manual',()=>{
 const a=ambiente();a.el('selEmpForma').value='Cartao';a.c.preencherDataTripla('emp','25/11/2026');a.el('inpEmpParcIni').value='3';a.el('inpEmpParc').value='12';a.c.atualizarFaturaEmprestimo();assert.equal(a.el('inpEmpMesFat').value,'01/2027');a.el('inpEmpMesFat').value='04/2027';a.el('inpEmpMesFat').dataset.escolhaManual='true';a.c.atualizarFaturaEmprestimo();assert.equal(a.el('inpEmpMesFat').value,'04/2027');
});
test('seleção da recorrência sincroniza somente tipo, preservando prioridade e escolha após desligar',()=>{
 const a=ambiente(),fonte=fs.readFileSync('interface/recorrencias.js','utf8');vm.runInContext(fonte.slice(fonte.indexOf('function sincronizarTipoRecorrenciaNovoGestor')),a.c);a.el('checkAssinatura').checked=true;a.el('perfil-novo-prioridade').value='essencial';
 for(const [modo,tipo]of [['automatico','fixo'],['revisao','variavel']]){a.el('modoRecorrenciaNovoGestor').value=modo;a.c.sincronizarTipoRecorrenciaNovoGestor();assert.equal(a.el('perfil-novo-tipo').value,tipo);assert.equal(a.el('perfil-novo-prioridade').value,'essencial');}a.el('checkAssinatura').checked=false;a.el('perfil-novo-tipo').value='fixo';a.c.sincronizarTipoRecorrenciaNovoGestor();assert.equal(a.el('perfil-novo-tipo').value,'fixo');
});
test('limpar consulta de empréstimos remove todos os filtros e inclui recebidos',()=>{const a=ambiente();let renders=0;a.c.renderizarPainelEmprestimos=()=>renders++;vm.runInContext(rotina.slice(rotina.indexOf('function limparFiltrosEmpGestor()'),rotina.indexOf("ACOES_RENDERIZADAS.add('mostrarRecebidosEmpGestor')")),a.c);for(const id of ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','selFiltroStatusEmp','inpBuscaEmp'])a.el(id).value='selecionado';a.c.limparFiltrosEmpGestor();for(const id of ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','selFiltroStatusEmp','inpBuscaEmp'])assert.equal(a.el(id).value,'');assert.equal(renders,1);});
test('Limpar remove todos os filtros do Histórico e reinicia a paginação',()=>{const a=ambiente();let pedidos=0;a.c.estadoIntegracaoInterfaceGestor={pxEl:a.el};a.c.toggleBotaoLimpar=()=>{};a.c.atualizarEstiloChipsRapidosHist=()=>{};a.c.renderTabelaLancamentos=()=>{};a.c.ultimosLancamentosCache=[];a.c.atualizarContextoPerfilHistoricoGestor=()=>{};a.c.chamarFiltroBackend=()=>pedidos++;a.c.filtrosAtuais={ano:'2026',perfilCampo:'tipo',perfilValor:'fixo',termo:'teste'};a.c.offsetAtual=50;vm.runInContext(html.slice(html.indexOf('    function limparFiltros()'),html.indexOf('    function temAlgumFiltroAtivo()')),a.c);a.c.limparFiltros();assert.equal(a.c.offsetAtual,0);assert.equal(a.c.filtrosAtuais.perfilCampo,undefined);assert.equal(a.el('filtAno').value,'');assert.equal(a.el('inpBusca').value,'');assert.equal(pedidos,1);assert.equal(a.el('filtPerfilHistorico').value,'');});

function calendario(){
 const elementos=new Map();let ativo=null,eventos=0;
 class Input{
  constructor(){this._value='';this.dataset={};this.required=false;this.className='';this.children=[];this.attributes={};this.type='text';}
  get value(){return this._value;}set value(v){this._value=String(v);}
  set id(v){this._id=v;elementos.set(v,this);}get id(){return this._id;}
  append(e){this.children.push(e);}before(e){this.caixa=e;}
  setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]||null;}
  setCustomValidity(e){this.erro=e;}checkValidity(){return !this.erro&&(!this.required||!!this.value);}
  focus(){ativo=this;this.onfocus?.();}select(){this.selectionStart=0;this.selectionEnd=this.value.length;}
  dispatchEvent(){eventos++;}
 }
 const doc={getElementById:id=>elementos.get(id),createElement:()=>new Input()};
 const c=vm.createContext({HTMLInputElement:Input,document:doc,Date,Event:class{}});
 const i=rotina.indexOf('function dividirCampoCalendarioGestor'),f=rotina.indexOf("if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded'",i);vm.runInContext(rotina.slice(i,f),c);
 function criar(id,valor,required=false,data=false){const original=new Input();original.id=id;original.value=valor;original.required=required;c.dividirCampoCalendarioGestor(id,data);return original;}
 return {c,criar,el:id=>elementos.get(id),ativo:()=>ativo,eventos:()=>eventos};
}
test('editar mês não desloca ano; campos acompanham setas/rascunho e avançam selecionando a próxima parte',()=>{
 const a=calendario(),original=a.criar('fat','11/2026',true),mes=a.el('fatMes'),ano=a.el('fatAno');
 mes.focus();assert.equal(mes.selectionEnd,2);mes.value='';mes.oninput();assert.equal(ano.value,'2026');assert(!mes.checkValidity());mes.value='02';mes.oninput();assert.equal(original.value,'02/2026');assert.equal(a.ativo(),ano);assert.equal(ano.selectionEnd,4);assert(mes.checkValidity());
 original.value='01/2027';assert.equal(mes.value,'01');assert.equal(ano.value,'2027');mes.value='3';mes.onkeydown({key:'/',preventDefault(){}});assert.equal(original.value,'03/2027');assert(a.eventos()>0);
});
test('data combinada mantém padrão em maiúsculas, recebe ISO antigo, recusa data impossível e permite vazio',()=>{
 const a=calendario(),original=a.criar('combinada','2026-11-25',false,true),dia=a.el('combinadaDia'),mes=a.el('combinadaMes'),ano=a.el('combinadaAno');
 assert.equal(original.value,'25/11/2026');assert.equal(dia.placeholder,'DD');assert.equal(mes.placeholder,'MM');assert.equal(ano.placeholder,'AAAA');
 dia.value='31';mes.value='02';ano.value='2027';dia.oninput();assert(!dia.checkValidity());dia.value='28';dia.oninput();assert(dia.checkValidity());assert.equal(original.value,'28/02/2027');
 dia.value='';mes.value='';ano.value='';dia.oninput();assert.equal(original.value,'');assert(dia.checkValidity());assert(!dia.required);
});

test('remover um filtro do Histórico preserva as demais seleções e inicia nova consulta', () => {
  const a = ambiente();
  const painel = a.el('filtrosAtivosHistorico');
  painel.replaceChildren = (...chips) => { painel.children = chips; };
  painel.querySelector = () => null;
  a.c.document.createElement = () => ({ setAttribute() {} });
  a.c.document.querySelector = () => null;
  a.c.filtrosAtuais = { mes: '11/2026', perfilCampo: 'prioridade', perfilValor: 'ajustavel' };
  a.el('filtMes').value = '11/2026';
  a.el('filtPerfilHistorico').value = 'prioridade:ajustavel';
  a.el('filtPerfilHistorico').selectedOptions = [{ textContent: 'Ajustável' }];
  let consultas = 0;
  a.c.aplicarFiltros = () => { consultas++; };

  vm.runInContext(html.slice(html.indexOf('    function atualizarFiltrosAtivosHistoricoGestor('), html.indexOf('    function auditarItemAnual(')), a.c);
  a.c.atualizarFiltrosAtivosHistoricoGestor();
  assert.deepEqual(painel.children.map(chip => chip.textContent), ['novembro de 2026 ×', 'Ajustável ×']);
  painel.children[1].onclick();
  assert.equal(a.el('filtPerfilHistorico').value, '');
  assert.equal(a.el('filtMes').value, '11/2026');
  assert.equal(consultas, 1);
});
