const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('filtro mensal marca, desmarca e troca seleção sem deixar estado residual',()=>{
  const controles=[['forma','Pix'],['forma','Cartão'],['tag','casal']].map(([tipo,valor])=>({dataset:{filtroMensalTipo:tipo,filtroMensalValor:valor},pressed:'false',setAttribute(nome,valor){assert.equal(nome,'aria-pressed');this.pressed=valor;}}));
  let renders=0;const ctx=vm.createContext({ultimoRelatorioMensalCache:{},filtroInternoMensalAtivo:{tipo:'todos',valor:''},document:{querySelectorAll:()=>controles},renderizarListaItensFaturaMensal:()=>renders++});
  vm.runInContext(html.slice(html.indexOf('    function filtrosMensaisVaziosGestor('),html.indexOf('    function montarCardFaturaMensalSeguro(')),ctx);
  ctx.aplicarFiltroInternoMensal('forma','Pix');assert.deepEqual(controles.map(c=>c.pressed),['true','false','false']);
  ctx.aplicarFiltroInternoMensal('forma','Pix');assert.deepEqual(controles.map(c=>c.pressed),['false','false','false']);
  ctx.aplicarFiltroInternoMensal('forma','Cartão');ctx.aplicarFiltroInternoMensal('tag','casal');assert.deepEqual(controles.map(c=>c.pressed),['false','true','true']);
  ctx.aplicarFiltroInternoMensal('todos','');assert(controles.every(c=>c.pressed==='false'));assert.equal(renders,5);
});
test('cartões não usam hover de fundo e filtro usa botão nativo separado de pagamento',()=>{
  assert(!html.includes('card-filtro-mensal bg-slate-900/50 hover:bg-slate-800'));
  assert(html.includes('@media (hover: hover) and (pointer: fine)'));
  assert(html.includes('[data-filtro-mensal-tipo]:focus-visible'));
  assert(html.includes('type="button" aria-pressed="false" data-filtro-mensal-tipo="forma"'));
  assert(html.includes('</span>${btnQuitar}</div><span class="text-right whitespace-nowrap shrink-0">'));
});

test('conferir pagamento fica no grupo à esquerda e saldo parcial tem cor e rótulo próprios',()=>{
 const linha=html.slice(html.indexOf('          htmlFormas += `<div data-forma='),html.indexOf("document.getElementById('rel-formas-usadas')"));
 assert(linha.indexOf('${btnQuitar}')<linha.indexOf('text-right whitespace-nowrap'));
 assert(html.includes('text-emerald-300">Pago: ${formatBRL(l[17])}'));
 assert(html.includes('text-rose-300 font-bold">Saldo restante: ${formatBRL(l[18])}'));
 assert(linha.includes('grid-cols-[minmax(0,1fr)_auto]'));
});

test('área inteira filtra sem executar pagamento; conferir pagamento não alterna o filtro',()=>{
  let clicar,markup='';const chamadas=[];
  class Element{constructor(dataset,parent=null){this.dataset=dataset;this.parent=parent;this.tagName='BUTTON';}closest(){return this.dataset?.gestorAcao?this:this.parent;}}
  const c=vm.createContext({Element,ACOES_RENDERIZADAS:new Set(['aplicarFiltroInternoMensal','quitarFaturaCartaoMes']),
    document:{addEventListener:(tipo,fn)=>{if(tipo==='click')clicar=fn;},getElementById:()=>({set innerHTML(v){markup=v;}})},
    escaparHTML:s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),formatBRL:n=>'R$ '+n.toFixed(2),formaEhCartaoGestor:()=>true,
    res:{totalRaw:100,formas:[{nome:'PicPay',total:0,totalBanco:208,terceiros:208}]},mesFiltro:'10/2026',
    aplicarFiltroInternoMensal:(...args)=>chamadas.push(['filtro',...args]),quitarFaturaCartaoMes:(...args)=>chamadas.push(['pagamento',...args])});c.window=c;
  vm.runInContext(html.slice(html.indexOf('    function acaoHTML('),html.indexOf('    function selecionarCartaoSimulador(')),c);
  const inicio=html.indexOf("        let htmlFormas = '';");vm.runInContext(html.slice(inicio,html.indexOf("        const boxTags =",inicio)),c);
  const botoes=[...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];assert.equal(botoes.length,2);assert(botoes.every(b=>!b[2].includes('<button')));
  const botao=b=>new Element({gestorAcao:/data-gestor-acao="([^"]+)"/.exec(b[1])[1],gestorArgumentos:/data-gestor-argumentos="([^"]+)"/.exec(b[1])[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&')});
  assert.match(botoes[0][1],/absolute inset-0 w-full h-full/);assert.match(botoes[1][1],/pointer-events-auto/);
  const evento=target=>({target,stopPropagation(){},preventDefault(){}});
  clicar(evento(botao(botoes[0])));assert.deepEqual(chamadas,[['filtro','forma','PicPay']]);
  chamadas.length=0;clicar(evento(new Element({},botao(botoes[1]))));assert.deepEqual(chamadas,[['pagamento','PicPay','10/2026']]);
});


test('recarga do mesmo mês preserva filtro existente; outro mês ou opção removida limpa',()=>{
 const ctx=vm.createContext({});vm.runInContext(html.slice(html.indexOf('    function filtrosMensaisVaziosGestor('),html.indexOf('    function aplicarFiltroInternoMensal(')),ctx);
 const f={tipo:'forma',valor:'Pix'},res={formas:[{nome:'Pix'}]};
 assert.deepEqual(Array.from(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','10/2026',res).forma),['Pix']);
 assert.equal(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','11/2026',res).forma.length,0);
 assert.equal(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','10/2026',{formas:[]}).forma.length,0);
});

function motorFiltros(){
 const ctx=vm.createContext({normalizarTexto:v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),lerValorMoeda:v=>Number(String(v).replace(/[^\d,.-]/g,'').replace(',','.'))});
 vm.runInContext(html.slice(html.indexOf('    function filtrosMensaisVaziosGestor('),html.indexOf('    function montarCardFaturaMensalSeguro(')),ctx);
 vm.runInContext(html.slice(html.indexOf('    function filtrarItensMensaisGestor('),html.indexOf('    function renderizarListaItensFaturaMensal(')),ctx);return ctx;
}
function item(nome,categoria,tag,forma='Pix',parcela='1/1',pago=0){const l=['16/10/2026',nome,forma,categoria,'',1,parcela,'R$ 100,00','10/2026','Em Aberto',tag];l[17]=pago;l[18]=100-pago;return l;}
test('mensal combina grupos, soma categorias com OU e compara tags completas',()=>{
 const c=motorFiltros(),itens=[item('A','Alimentação 🍔','#casal'),item('B','Transporte 🚗','#casal'),item('C','Lazer','#casal'),item('D','Alimentação','#casalviagem'),item('E','Alimentação','#casal','Cartão')];
 const f={forma:['Pix'],categoria:['Alimentação','Transporte'],tag:['casal'],tipoGasto:['avista']};
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,f),l=>l[1]),['A','B']);
});
test('mensal inclui pagamentos parciais tanto em com pagamento como com saldo',()=>{
 const c=motorFiltros(),itens=[item('Parcial','Teste','','Cartão','2/3',30),item('Quitado','Teste','','Cartão','1/1',100),item('Sem pagar','Teste','')];
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,{status:['pago']}),l=>l[1]),['Parcial','Quitado']);
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,{status:['aberto']}),l=>l[1]),['Parcial','Sem pagar']);
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,{status:['parcial'],tipoGasto:['rigido']}),l=>l[1]),['Parcial']);
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,{status:['quitado']}),l=>l[1]),['Quitado']);
});
