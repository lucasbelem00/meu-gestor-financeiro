const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('filtro mensal marca, desmarca e troca seleção sem deixar estado residual',()=>{
  const controles=[['forma','Pix'],['forma','Cartão'],['tag','casal']].map(([tipo,valor])=>({dataset:{filtroMensalTipo:tipo,filtroMensalValor:valor},pressed:'false',setAttribute(nome,valor){assert.equal(nome,'aria-pressed');this.pressed=valor;}}));
  let renders=0;const ctx=vm.createContext({ultimoRelatorioMensalCache:{},filtroInternoMensalAtivo:{tipo:'todos',valor:''},document:{querySelectorAll:()=>controles},renderizarListaItensFaturaMensal:()=>renders++});
  vm.runInContext(html.slice(html.indexOf('    function sincronizarEstadoFiltrosMensalGestor('),html.indexOf('    function montarCardFaturaMensalSeguro(')),ctx);
  ctx.aplicarFiltroInternoMensal('forma','Pix');assert.deepEqual(controles.map(c=>c.pressed),['true','false','false']);
  ctx.aplicarFiltroInternoMensal('forma','Pix');assert.deepEqual(controles.map(c=>c.pressed),['false','false','false']);
  ctx.aplicarFiltroInternoMensal('forma','Cartão');ctx.aplicarFiltroInternoMensal('tag','casal');assert.deepEqual(controles.map(c=>c.pressed),['false','false','true']);
  ctx.aplicarFiltroInternoMensal('todos','');assert(controles.every(c=>c.pressed==='false'));assert.equal(renders,5);
});
test('cartões não usam hover de fundo e filtro usa botão nativo separado de pagamento',()=>{
  assert(!html.includes('card-filtro-mensal bg-slate-900/50 hover:bg-slate-800'));
  assert(html.includes('@media (hover: hover) and (pointer: fine)'));
  assert(html.includes('[data-filtro-mensal-tipo]:focus-visible'));
  assert(html.includes('type="button" aria-pressed="false" data-filtro-mensal-tipo="forma"'));
  assert(html.includes('</button>${btnQuitar}</div>${infoTerc}'));
});


test('recarga do mesmo mês preserva filtro existente; outro mês ou opção removida limpa',()=>{
 const ctx=vm.createContext({});vm.runInContext(html.slice(html.indexOf('    function escolherFiltroAposRecargaMensalGestor('),html.indexOf('    function aplicarFiltroInternoMensal(')),ctx);
 const f={tipo:'forma',valor:'Pix'},res={formas:[{nome:'Pix'}]};
 assert.equal(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','10/2026',res),f);
 assert.equal(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','11/2026',res).tipo,'todos');
 assert.equal(ctx.escolherFiltroAposRecargaMensalGestor(f,'10/2026','10/2026',{formas:[]}).tipo,'todos');
});
