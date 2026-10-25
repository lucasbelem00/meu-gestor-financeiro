const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fonte=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8');
function contexto(){
  const local=new Map(),sessao=new Map(),campos=new Map();
  const c=vm.createContext({Date,Map,Set,JSON,novoRequestIdGestor:()=> 'pagina-atual',localStorage:{getItem:k=>local.get(k)??null,removeItem:k=>local.delete(k)},sessionStorage:{getItem:k=>sessao.get(k)??null,removeItem:k=>sessao.delete(k)},lerJSONLocalGestor:(k,p)=>local.has(k)?JSON.parse(local.get(k)):p,gravarArmazenamentoGestor:(k,v,o)=>{(o?.sessao?sessao:local).set(k,v);return true;},lerCacheLeituraGestor:()=>null,mostrarAviso(){},document:{getElementById:id=>campos.get(id)},lerEntradasLocaisGestor:prefixo=>Array.from(local).filter(([k])=>k.startsWith(prefixo)).map(([chave,texto])=>({chave,valor:JSON.parse(texto)}))});
  vm.runInContext(fonte.slice(fonte.indexOf('const paginaRascunhoGestor='),fonte.indexOf('const guardarRascunhoAnteriorRotinaGestor=')),c);
  const i=fonte.indexOf('function entradasRecuperaveisRascunhoRotinaGestor(');vm.runInContext(fonte.slice(i,fonte.indexOf('function renderizarRecuperacaoRascunhosGestor(',i)),c);
  return {c,local,sessao,campos};
}
const vazio=()=>({itens:[],pessoas:['Eu','Amigo 2'],nomesEmEdicao:['Eu','Amigo 2'],ajustes:{Eu:{},'Amigo 2':{}},campos:{rachaQtdPessoas:'2',rachaQtdBebeu:'1',rachaServicoPercentual:'10'}});

test('abrir rachadinha com ajustes automáticos não gera rascunho fantasma',()=>{
  const a=contexto(),r=vazio();r.ajustes.Eu={peso:1,pesoTexto:'1,0',pagoCentavos:0};
  assert.equal(a.c.rascunhoRachaVazioRotinaGestor(r),true);a.c.guardarRascunhoRotinaGestor('racha',r);assert.equal(a.local.size,0);
  a.local.set('gestorRascunhoV3:racha:versao-antiga',JSON.stringify({tipo:'racha',dados:r}));assert.equal(a.c.entradasRecuperaveisRascunhoRotinaGestor('racha').length,0);
});

test('ajustes reais, nomes em edição e envios de rachadinha continuam protegidos',()=>{
  for(const alterar of [r=>r.ajustes.Eu.peso=0.5,r=>r.ajustes.Eu.pagoCentavos=1,r=>r.nomesEmEdicao[1]='Ana',r=>r.nomesEmEdicao[1]='',r=>r.envio={estado:'pendente'},r=>r.registroId='racha-protegida',r=>r.partePreparada={valorCentavos:50},r=>r.editando='item-1',r=>r.pessoas=['Eu','Eu']]){
    const a=contexto(),r=vazio();alterar(r);assert.equal(a.c.rascunhoRachaVazioRotinaGestor(r),false);a.c.guardarRascunhoRotinaGestor('racha',r);assert(a.local.size>0);
  }
});

test('recuperação separa empréstimos de rachadinha e não usa cópia com tipo incompatível',()=>{
  const a=contexto();a.local.set('gestorRascunhoV3:emp:outra',JSON.stringify({tipo:'emp',dados:{pessoa:'Ana'}}));a.local.set('gestorRascunhoV3:racha:outra',JSON.stringify({tipo:'racha',dados:{...vazio(),campos:{rachaLocal:'Restaurante'}}}));a.local.set('gestorRascunhoV3:racha:incompativel',JSON.stringify({tipo:'emp',dados:{pessoa:'Não misturar'}}));
  assert.equal(a.c.entradasRecuperaveisRascunhoRotinaGestor('emp').length,1);assert.deepEqual(Array.from(a.c.entradasRecuperaveisRascunhoRotinaGestor('racha'),e=>e.chave),['gestorRascunhoV3:racha:outra']);
});

test('limpar empréstimo remove a cópia da página e atualiza o aviso sem apagar outra página',()=>{
  const a=contexto();let atualizacoes=0;a.c.renderizarRecuperacaoRascunhosGestor=()=>atualizacoes++;a.campos.set('formEmprestimo',{elements:[{dataset:{escolhaManual:'true',valorSugerido:'Pix'}}]});
  a.c.guardarRascunhoRotinaGestor('emp',{pessoa:'Ana'});a.sessao.set('rascunhoEmprestimo','conteudo antigo');a.local.set('gestorRascunhoV3:emp:outra',JSON.stringify({dados:{pessoa:'Outra página'}}));
  const i=fonte.indexOf('function limparCopiaRascunhoRotinaGestor(');vm.runInContext(fonte.slice(i,fonte.indexOf('for(const [nome,emp]',i)),a.c);a.c.limparCopiaRascunhoRotinaGestor(true);
  assert.equal(a.local.has(a.c.chaveRascunhoRotinaGestor('emp')),false);assert.equal(a.sessao.has('rascunhoEmprestimo'),false);assert.equal(a.sessao.has('gestorRascunhoAnterior:emp'),false);assert(a.local.has('gestorRascunhoV3:emp:outra'));assert.equal(atualizacoes,1);
});

test('busca e seletores recebem rótulos e altura iguais, sem puxar os campos para o lado do título',()=>{
  function elemento(tag='div'){
    const classes=new Set();return {tagName:tag.toUpperCase(),classes,children:[],classList:{add:(...v)=>v.forEach(s=>classes.add(s)),remove:(...v)=>v.forEach(s=>classes.delete(s))},closest(nome){return this.parentElement?.tagName===nome.toUpperCase()?this.parentElement:null;},before(n){n.parentElement=this.parentElement;this.parentElement.children.push(n);},append(n){n.parentElement=this;this.children.push(n);}};
  }
  const cabecalho=elemento(),grade=elemento();grade.parentElement=cabecalho;cabecalho.classList.add('sm:flex-row','sm:items-center');const campos=new Map();for(const id of ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroStatusEmp','selFiltroFormaEmp','inpBuscaEmp']){const campo=elemento(id==='inpBuscaEmp'?'input':'select');campo.parentElement=grade;campos.set(id,campo);}
  const c=vm.createContext({document:{getElementById:id=>campos.get(id),createElement:tag=>elemento(tag)}}),i=fonte.indexOf('function prepararFiltrosEmpRotinaGestor(');vm.runInContext(fonte.slice(i,fonte.indexOf('function organizarPagamentosPainelRotinaGestor(',i)),c);c.prepararFiltrosEmpRotinaGestor();c.prepararFiltrosEmpRotinaGestor();
  assert.equal(grade.children.length,5);assert.equal(cabecalho.classes.has('sm:flex-row'),false);for(const campo of campos.values()){assert.equal(campo.parentElement.tagName,'LABEL');assert(campo.classes.has('h-10'));}assert(campos.get('inpBuscaEmp').parentElement.classes.has('lg:col-span-1'));
});

test('atalhos de pagamentos ficam antes da grade completa de gráficos e horizonte',()=>{
  const pagamentos={},destinos=[],grade={before:e=>destinos.push(e)},horizonte={parentElement:grade,before:()=>assert.fail('não inserir dentro da grade de três colunas')};
  const c=vm.createContext({document:{querySelector:()=>pagamentos,getElementById:()=>({closest:()=>horizonte})}}),i=fonte.indexOf('function organizarPagamentosPainelRotinaGestor(');vm.runInContext(fonte.slice(i,fonte.indexOf("document.addEventListener('DOMContentLoaded'",i)),c);c.organizarPagamentosPainelRotinaGestor();assert.equal(destinos[0],pagamentos);
});

test('consulta começa em Todos os meses e conserva o mês escolhido ao atualizar dados',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),i=html.indexOf('      if (selMes && selPes) {'),fim=html.indexOf("      const fMes = selMes?.value || '';",i),bloco=html.slice(i,fim);
  function seletor(){return {value:'',dataset:{},set innerHTML(v){this.markup=v;this.value='';}};}
  const selMes=seletor(),selPes=seletor(),selForma=seletor(),dados=[{pessoa:'Ana',mesFatura:'10/2026',forma:'Pix'},{pessoa:'Bruno',mesFatura:'11/2026',forma:'Cartão'}];
  const c=vm.createContext({selMes,selPes,selForma,todosItens:dados,evolucaoMesAtual:'10/2026',escaparHTML:String});vm.runInContext(bloco,c);assert.equal(selMes.value,'');
  selMes.value='11/2026';selPes.value='Bruno';selForma.value='Cartão';vm.runInContext(bloco,c);assert.equal(selMes.value,'11/2026');assert.equal(selPes.value,'Bruno');assert.equal(selForma.value,'Cartão');
  selMes.value='';vm.runInContext(bloco,c);assert.equal(selMes.value,'');
});
