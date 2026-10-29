const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),rotina=fs.readFileSync('interface/rotina.js','utf8'),nav=fs.readFileSync('interface/navegacao.js','utf8'),perf=fs.readFileSync('interface/desempenho.js','utf8');
function trecho(fonte,a,b){const i=fonte.indexOf(a),f=fonte.indexOf(b,i+a.length);assert(i>=0&&f>i,a);return fonte.slice(i,f);}
function historico(){
 const entradas=[{origem:'aba anterior'}];let pos=0,aberturas=0,fechamentos=0,pedidosVoltar=0;
 const h={get state(){return entradas[pos];},pushState(s){entradas.splice(++pos);entradas.push(s);},back(){pedidosVoltar++;}};
 const c=vm.createContext({Date});vm.runInContext(trecho(nav,'function criarHistoricoCentralGestor(','if(window.history'),c);
 const controle=c.criarHistoricoCentralGestor({historico:h,abrir(){aberturas++;},fechar(){fechamentos++;}});
 return {controle,h,entradas,get aberturas(){return aberturas;},get fechamentos(){return fechamentos;},get pedidosVoltar(){return pedidosVoltar;},voltar(){pos--;controle.voltar();},avancar(){pos++;controle.voltar();}};
}
test('Voltar fecha a Central sem sair da aba e preserva o estado anterior',()=>{
 const a=historico();a.controle.abrir();a.controle.abrir();assert.equal(a.entradas.length,2);assert.equal(a.aberturas,1);a.voltar();assert.equal(a.fechamentos,1);assert.equal(a.pedidosVoltar,0);assert.equal(a.h.state.origem,'aba anterior');a.avancar();assert.equal(a.aberturas,2);
});
test('fechar pelo X ou escolher ferramenta consome só a entrada do menu',()=>{
 const a=historico();a.controle.abrir();a.controle.fechar();a.controle.fechar();assert.equal(a.fechamentos,1);assert.equal(a.pedidosVoltar,1);a.voltar();assert.equal(a.fechamentos,1);a.controle.abrir();assert.equal(a.entradas.length,2);
});
test('reabrir rapidamente enquanto o histórico volta mantém uma única proteção',()=>{
 const a=historico();a.controle.abrir();a.controle.fechar();a.controle.abrir();a.voltar();assert.equal(a.entradas.length,2);assert.equal(a.fechamentos,1);a.voltar();assert.equal(a.fechamentos,2);
});
test('modo selecionado de empréstimos tem uma única cor e preserva o rascunho',()=>{
 const elementos=new Map();for(const id of ['painelNovoEmprestimo','painelConsultaEmprestimo','btnConsultarEmprestimos','btnNovoEmprestimo']){const classes=new Set(['bg-slate-800','border-slate-600','text-slate-100']);elementos.set(id,{hidden:false,classes,setAttribute(k,v){this[k]=v;},classList:{toggle(c,b){b?classes.add(c):classes.delete(c);}}});}
 const c=vm.createContext({document:{getElementById:id=>elementos.get(id)}});vm.runInContext(trecho(rotina,'function alternarModoEmprestimosGestor(','function prepararFiltrosEmpRotinaGestor('),c);c.alternarModoEmprestimosGestor('novo');const novo=elementos.get('btnNovoEmprestimo'),consulta=elementos.get('btnConsultarEmprestimos');assert(novo.classes.has('bg-amber-500/20'));assert(!novo.classes.has('bg-slate-800'));assert.equal(novo['aria-pressed'],'true');assert(consulta.classes.has('bg-slate-800'));assert.equal(consulta['aria-pressed'],'false');c.alternarModoEmprestimosGestor('consulta');assert(!novo.classes.has('bg-amber-500/20'));assert(consulta.classes.has('bg-amber-500/20'));
});
test('cadastro atualiza KPIs sem montar milhares de parcelas da consulta oculta',()=>{
 const elementos=new Map([['painelConsultaEmprestimo',{hidden:true}],['emp-kpi-mes',{}]]),dados={kpis:{aReceberMes:'R$ 80,00'},pessoasFrequentes:[]};Object.defineProperty(dados,'itens',{get(){throw Error('consulta oculta não deve acessar a lista');}});
 const c=vm.createContext({emprestimosGlobal:dados,document:{getElementById:id=>elementos.get(id)}});vm.runInContext(trecho(html,'   function renderizarPainelEmprestimos()','    function alternarStatusItemEmprestimo('),c);c.renderizarPainelEmprestimos();assert.equal(elementos.get('emp-kpi-mes').textContent,'R$ 80,00');
});
test('busca espera a pausa na digitação e renderiza somente o termo mais recente',()=>{
 const tarefas=new Map();let n=0,execucoes=0;const c=vm.createContext({clearTimeout:id=>tarefas.delete(id),setTimeout:(fn,ms)=>{assert.equal(ms,160);tarefas.set(++n,fn);return n;},renderizarPainelEmprestimos:()=>execucoes++});vm.runInContext(trecho(perf,'let buscaEmprestimosPendenteGestor=','function criarCoordenadorLeiturasGestor('),c);c.agendarBuscaEmprestimosGestor();c.agendarBuscaEmprestimosGestor();c.agendarBuscaEmprestimosGestor();assert.equal(tarefas.size,1);[...tarefas.values()][0]();assert.equal(execucoes,1);
});

test('trocar ferramenta mostra nome e seleção em azul, rolando apenas a barra horizontal',()=>{
 const elementos=new Map(),rolagens=[];for(const id of ['emprestimos','rachadinha','simulador','calculadora','notas']){elementos.set('subview-'+id,{classList:{add(){},remove(){}},setAttribute(){}});elementos.set('btn-sub-'+id,{setAttribute(k,v){this[k]=v;},offsetWidth:100,getBoundingClientRect:()=>({left:350}),scrollIntoView(){throw Error('não pode deslocar a página para trás do cabeçalho');},parentElement:{scrollLeft:40,clientWidth:340,getBoundingClientRect:()=>({left:16}),scrollTo:o=>rolagens.push(o)}});}elementos.set('subtituloMobileAba',{});
 const c=vm.createContext({document:{getElementById:id=>elementos.get(id)},rodarSimuladorCompra(){}});vm.runInContext(trecho(html,'    function selecionarSubFerramenta(','    function renderizarChipsTags('),c);c.selecionarSubFerramenta('simulador');assert.equal(elementos.get('subtituloMobileAba').textContent,'Simular Compra');assert.equal(elementos.get('btn-sub-simulador')['aria-pressed'],'true');assert.equal(elementos.get('btn-sub-notas')['aria-pressed'],'false');assert.match(elementos.get('btn-sub-simulador').className,/bg-blue-600/);assert.equal(rolagens.length,1);assert.equal(rolagens[0].left,254);assert(!('top' in rolagens[0]));
});

test('metade restaura o valor original e remove apenas a tag automática',()=>{
 const valor={value:25.50},tags={value:'#casal'},estados=[];
 const c=vm.createContext({valorOriginalAntesMetade:null,tagDivididoAutoAdicionada:false,pxEl:id=>id==='inpValor'?valor:tags,lerValorMoeda:el=>el.value,definirValorMoeda:(el,v)=>el.value=v,pxEstiloBotaoMetade:v=>estados.push(v),toggleBotaoLimpar(){},sincronizarChipsTags(){},atualizarPreviewParcelas(){},salvarRascunho(){},mostrarAviso(){}});
 require('./fixtures/integracao-interface-ui.cjs')(c,'alternarMetadeValor','removerTagDivididoAutomatica');c.alternarMetadeValor();assert.equal(valor.value,12.75);assert.equal(tags.value,'#casal, #dividido');c.alternarMetadeValor();assert.equal(valor.value,25.50);assert.equal(tags.value,'#casal');assert.deepEqual(estados,[true,false]);
 tags.value='#dividido, #casal';c.alternarMetadeValor();c.alternarMetadeValor();assert.equal(tags.value,'#dividido, #casal');
});
