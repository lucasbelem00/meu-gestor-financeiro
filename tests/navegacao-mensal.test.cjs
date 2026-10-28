const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function ambiente(){
  let instante=new Date(2026,9,28,12).getTime();class Relogio extends Date{constructor(...args){super(...(args.length?args:[instante]));}static now(){return instante;}}
  const select=()=>({options:[],value:'',set innerHTML(v){this.options=[];this.value='';},add(o){this.options.push(o);if(!this.value)this.value=o.value;}});
  const els={selFiltroRelMes:select(),selFiltroRelAno:select(),selFiltroAnoSimples:select(),btnMesPrev:{},btnMesNext:{},btnAnoPrev:{},btnAnoNext:{}};
  let buscas=[];
  const ctx=vm.createContext({document:{getElementById:id=>els[id],addEventListener(){}},Option:function(text,value){this.text=text;this.value=value;},Date:Relogio,abasConfig:[{id:'relatorio',tituloD:'Fatura Mensal',cor:''}],abaAtivaAtual:'dashboard',dadosCarregadosIniciais:true,fecharMenuMobile(){},salvarCacheLeituraGestor(){},arvoreMesesAno:{'2025':['12/2025'],'2026':['01/2026','10/2026','11/2026']},dispararBuscaRelatorioMensal(){ctx.atualizarEstadoSetasMensal();buscas.push(els.selFiltroRelMes.value+'/'+els.selFiltroRelAno.value);}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../interface/usabilidade.js'),'utf8'),ctx);
  vm.runInContext(html.slice(html.indexOf('    function getNomeMes('),html.indexOf('    function dispararBuscaRelatorioMensal(')),ctx);
  vm.runInContext(html.slice(html.indexOf('    function setAba('),html.indexOf('    function abrirFerramenta(')),ctx);
  vm.runInContext(html.slice(html.indexOf('    function irParaFaturaMensal('),html.indexOf('    let compararHorizonteCompleto')),ctx);
  return {ctx,els,buscas,virar:data=>{instante=data.getTime();}};
}
test('setas mensais avançam, voltam, atravessam o ano e respeitam os limites',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','10',false);
  ctx.mudarMesRelatorio(1);assert.equal(els.selFiltroRelMes.value,'11');assert.equal(els.btnMesNext.disabled,true);
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelMes.value,'10');
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelMes.value,'01');
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelAno.value,'2025');assert.equal(els.selFiltroRelMes.value,'12');assert.equal(els.btnMesPrev.disabled,true);
  assert.deepEqual(buscas,['11/2026','10/2026','01/2026','12/2025']);
});
test('atualização dos dados preserva o mês escolhido e o ano do relatório anual',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','11',false);els.selFiltroAnoSimples.value='2025';
  ctx.atualizarSeletoresRelatorioGestor();assert.equal(els.selFiltroRelMes.value,'11');assert.equal(els.selFiltroRelAno.value,'2026');assert.equal(els.selFiltroAnoSimples.value,'2025');assert.equal(buscas.length,0);
});


test('seta direita usa seleção existente sem reconstruir meses do mesmo ano',()=>{
  const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2026','10',false);
  ctx.atualizarMesesDisponiveis=()=>{throw Error('Não deve reconstruir o mesmo ano');};
  ctx.mudarMesRelatorio('1');assert.equal(els.selFiltroRelMes.value,'11');assert.deepEqual(buscas,['11/2026']);
});

test('meses repetidos por gastos e terceiros não fazem a seta recarregar o mesmo mês',()=>{
  const {ctx,els,buscas}=ambiente();
  ctx.arvoreMesesAno={'2026':['10/2026','11/2026','10/2026','10/2026','11/2026']};
  ctx.preencherSeletoresInteligentes('2026','10',false);
  ctx.mudarMesRelatorio(1);assert.equal(els.selFiltroRelMes.value,'11');assert.equal(els.btnMesNext.disabled,true);
  ctx.mudarMesRelatorio(-1);assert.equal(els.selFiltroRelMes.value,'10');assert.equal(els.btnMesPrev.disabled,true);
  assert.deepEqual(buscas,['11/2026','10/2026']);
});


test('entradas na Mensal e clique na aba já aberta sempre selecionam o mês vigente',()=>{
 const {ctx,els,buscas}=ambiente();ctx.preencherSeletoresInteligentes('2025','12',false);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
 ctx.preencherSeletoresInteligentes('2026','11',false);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');assert.equal(els.selFiltroRelMes.value,'10');
});
test('mês atual vazio e virada de ano ficam consultáveis sem criar lançamentos ou escolher mês futuro',()=>{
 const {ctx,els,buscas,virar}=ambiente();ctx.arvoreMesesAno={'2026':['11/2026']};ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
 virar(new Date(2027,0,1,12));ctx.setAba('relatorio');assert.equal(buscas.at(-1),'01/2027');assert.equal(els.selFiltroRelAno.value,'2027');
});
test('recarga de dados na mesma aba preserva consulta manual e entrar novamente retorna ao mês atual',()=>{
 const {ctx,els,buscas}=ambiente();ctx.setAba('relatorio');ctx.preencherSeletoresInteligentes('2025','12',false);ctx.atualizarSeletoresRelatorioGestor();const n=buscas.length;ctx.setAba('relatorio',false);assert.equal(els.selFiltroRelAno.value,'2025');assert.equal(buscas.length,n);
 ctx.setAba('dashboard');ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
});
test('atalho explícito para uma fatura antiga continua manual e faz uma única consulta',()=>{
 const {ctx,buscas}=ambiente();ctx.irParaFaturaMensal('12/2025');assert.deepEqual(buscas,['12/2025']);ctx.setAba('relatorio');assert.equal(buscas.at(-1),'10/2026');
});
