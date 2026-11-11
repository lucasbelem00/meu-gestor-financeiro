const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function ambiente(){
  let instante=new Date(2026,9,28,12).getTime();class Relogio extends Date{constructor(...args){super(...(args.length?args:[instante]));}static now(){return instante;}}
  const select=()=>({options:[],value:'',set innerHTML(v){this.options=[];this.value='';},add(o){this.options.push(o);if(!this.value)this.value=o.value;}});
  const els={selFiltroRelPeriodo:{value:''},selFiltroAnoSimples:select(),btnMesPrev:{},btnMesNext:{},btnAnoPrev:{},btnAnoNext:{}};
  let buscas=[];
  const ctx=vm.createContext({document:{getElementById:id=>els[id],addEventListener(){}},Option:function(text,value){this.text=text;this.value=value;},Date:Relogio,abasConfig:[{id:'relatorio',tituloD:'Fatura Mensal',cor:''}],abaAtivaAtual:'dashboard',dadosCarregadosIniciais:true,fecharMenuMobile(){},salvarCacheLeituraGestor(){},arvoreMesesAno:{'2025':['12/2025'],'2026':['01/2026','10/2026','11/2026']},dispararBuscaRelatorioMensal(){ctx.atualizarEstadoSetasMensal();buscas.push(ctx.periodoMensalSelecionadoGestor()?.valor);}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../interface/usabilidade.js'),'utf8'),ctx);
  vm.runInContext(html.slice(html.indexOf('    function getNomeMes('),html.indexOf('    function dispararBuscaRelatorioMensal(')),ctx);
  vm.runInContext(html.slice(html.indexOf('    function setAba('),html.indexOf('    function abrirFerramenta(')),ctx);
  vm.runInContext(html.slice(html.indexOf('    function irParaFaturaMensal('),html.indexOf('    let compararHorizonteCompleto')),ctx);
  return {ctx,els,buscas,virar:data=>{instante=data.getTime();}};
}
test('setas mensais avançam, voltam, atravessam o ano e respeitam os limites',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','10',false);
  ctx.mudarMesRelatorio(1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'11');assert.equal(els.btnMesNext.disabled,true);
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'10');
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'01');
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[0],'2025');assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'12');assert.equal(els.btnMesPrev.disabled,true);
  assert.deepEqual(buscas,['11/2026','10/2026','01/2026','12/2025']);
});
test('atualização dos dados preserva o mês escolhido e o ano do relatório anual',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','11',false);els.selFiltroAnoSimples.value='2025';
  ctx.atualizarSeletoresRelatorioGestor();assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'11');assert.equal(els.selFiltroRelPeriodo.value.split('-')[0],'2026');assert.equal(els.selFiltroAnoSimples.value,'2025');assert.equal(buscas.length,0);
});


test('seta direita preserva controle nativo e atualiza apenas o período',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','10',false);
  const campo=els.selFiltroRelPeriodo;
  ctx.mudarMesRelatorio('1');assert.equal(els.selFiltroRelPeriodo,campo);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'11');assert.deepEqual(buscas,['11/2026']);
});

test('meses repetidos por gastos e terceiros não fazem a seta recarregar o mesmo mês',()=>{
  const {ctx,els,buscas}=ambiente();
  ctx.arvoreMesesAno={'2026':['10/2026','11/2026','10/2026','10/2026','11/2026']};
  ctx.preencherSeletoresInteligentes('2026','10',false);
  ctx.mudarMesRelatorio(1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'11');assert.equal(els.btnMesNext.disabled,true);
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'10');assert.equal(els.btnMesPrev.disabled,true);
  assert.deepEqual(buscas,['11/2026','10/2026']);
});


test('entradas na Mensal e clique na aba já aberta sempre selecionam o mês vigente',()=>{
 const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2025','12',false);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
 ctx.preencherSeletoresInteligentes('2026','11',false);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');assert.equal(els.selFiltroRelPeriodo.value.split('-')[1],'10');
});
test('mês atual vazio e virada de ano ficam consultáveis sem criar lançamentos ou escolher mês futuro',()=>{
 const {ctx,els,buscas,virar}=ambiente();ctx.arvoreMesesAno={'2026':['11/2026']};ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
 virar(new Date(2027,0,1,12));ctx.setAba('relatorio');assert.equal(buscas.at(-1),'01/2027');assert.equal(els.selFiltroRelPeriodo.value.split('-')[0],'2027');
});
test('recarga de dados na mesma aba preserva consulta manual e entrar novamente retorna ao mês atual',()=>{
 const {ctx,els,buscas}=ambiente();ctx.setAba('relatorio');ctx.preencherSeletoresInteligentes('2025','12',false);ctx.atualizarSeletoresRelatorioGestor();const n=buscas.length;ctx.setAba('relatorio',false);assert.equal(els.selFiltroRelPeriodo.value.split('-')[0],'2025');assert.equal(buscas.length,n);
 ctx.setAba('dashboard');ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
});
test('atalho explícito para uma fatura antiga continua manual e faz uma única consulta',()=>{
 const {ctx,buscas}=ambiente();ctx.irParaFaturaMensal('12/2025');assert.deepEqual(buscas,['12/2025']);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
});

test('mês vazio escolhido manualmente preserva período e encontra vizinhos disponíveis',()=>{const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','06',false);assert.equal(els.selFiltroRelPeriodo.value,'2026-06');ctx.atualizarEstadoSetasMensal();assert.equal(els.btnMesPrev.disabled,false);assert.equal(els.btnMesNext.disabled,false);ctx.mudarMesRelatorio(1);assert.equal(buscas.at(-1),'10/2026');ctx.preencherSeletoresInteligentes('2026','06',false);ctx.atualizarSeletoresRelatorioGestor();assert.equal(els.selFiltroRelPeriodo.value,'2026-06');ctx.mudarMesRelatorio(-1);assert.equal(buscas.at(-1),'01/2026');});

test('controle nativo converte para competência da API e limpar restaura seleção sem consultar',()=>{assert.match(html,/<input type="month" id="selFiltroRelPeriodo" min="1900-01" max="2200-12" required/);const {ctx,els}=ambiente();let consulta='',avisos=0;ctx.mostrarAviso=()=>avisos++;ctx.carregarRelatorioMesUnico=p=>consulta=p;const ini=html.indexOf('    function dispararBuscaRelatorioMensal(){'),fim=html.indexOf('\n    function ',ini+15);vm.runInContext(html.slice(ini,fim),ctx);ctx.preencherSeletoresInteligentes('2026','10',false);els.selFiltroRelPeriodo.value='2027-02';ctx.dispararBuscaRelatorioMensal();assert.equal(consulta,'02/2027');consulta='';els.selFiltroRelPeriodo.value='';ctx.dispararBuscaRelatorioMensal();assert.equal(consulta,'');assert.equal(els.selFiltroRelPeriodo.value,'2027-02');assert.equal(avisos,1);els.selFiltroRelPeriodo.value='2201-01';ctx.dispararBuscaRelatorioMensal();assert.equal(consulta,'');assert.equal(els.selFiltroRelPeriodo.value,'2027-02');});
