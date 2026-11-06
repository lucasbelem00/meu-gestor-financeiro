const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function ambiente(){
 const html=fs.readFileSync('index.html','utf8'),envios=[];
 const el=()=>({innerHTML:'anteriores',textContent:'',inert:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},classList:{add(){},remove(){},toggle(){}},querySelector(){return this.botao||(this.botao={});}});
 const els=Object.fromEntries(['estadoConsultaHistoricoGestor','lista-lancamentos','barraSomaFiltro','boxCarregarMais'].map(k=>[k,el()]));
 const ctx=vm.createContext({document:{getElementById:k=>els[k]},window:{scrollY:0},estadoIntegracaoInterfaceGestor:{pxEl:k=>els[k],pxReqFiltroId:0},offsetAtual:0,LIMITE_PAGINA:50,filtrosAtuais:{},mostrarAviso(){},temAlgumFiltroAtivo:()=>false,
 consultarHistoricoVisivelGestor:()=>new Promise((resolve,reject)=>envios.push({resolve,reject})),renderTabelaLancamentos:itens=>{els['lista-lancamentos'].innerHTML=itens.join(',');}});
 vm.runInContext(html.slice(html.indexOf('    function informarEstadoConsultaHistoricoGestor'),html.indexOf('    async function copiarResumoFiltroWhats')),ctx);
 return {ctx,els,envios};
}
test('consulta mantém resultados visíveis, mas bloqueados; sucesso substitui e libera',async()=>{
 const {ctx,els,envios}=ambiente(),p=ctx.chamarFiltroBackend(false),lista=els['lista-lancamentos'];
 assert.equal(lista.innerHTML,'anteriores');assert.equal(lista.inert,true);assert.equal(lista.attrs['aria-busy'],'true');
 envios[0].resolve({itens:['novos'],versaoConsulta:'v1',qtdTotal:1,temMais:false});await p;
 assert.equal(lista.innerHTML,'novos');assert.equal(lista.inert,false);assert.equal(els.estadoConsultaHistoricoGestor.textContent,'');
});
test('ocupação e falha preservam resultados com aviso, sem permitir ações desatualizadas',async()=>{
 for(const codigo of ['SERVICO_OCUPADO','CONSULTA_ALTERADA','CONSULTA_SUBSTITUIDA','REDE']){
 const {ctx,els,envios}=ambiente(),p=ctx.chamarFiltroBackend(false);
 envios[0].reject(Object.assign(Error('falhou'),{codigo}));await p;
 assert.equal(els['lista-lancamentos'].innerHTML,'anteriores');assert.equal(els['lista-lancamentos'].inert,true,codigo);
 assert(els.estadoConsultaHistoricoGestor.textContent.length>0,codigo);
 }
});
test('resposta antiga não substitui resultados nem desbloqueia a consulta mais nova',async()=>{
 const {ctx,els,envios}=ambiente(),p1=ctx.chamarFiltroBackend(false),p2=ctx.chamarFiltroBackend(false);
 envios[0].resolve({itens:['antigos'],temMais:false});await p1;assert.equal(els['lista-lancamentos'].inert,true);
 envios[1].resolve({itens:['corretos'],temMais:false});await p2;
 assert.equal(els['lista-lancamentos'].innerHTML,'corretos');assert.equal(els['lista-lancamentos'].inert,false);
});

test('primeira página confirmada dispensa rede; Carregar mais reconfere versão antes de paginar',async()=>{
 const {ctx,els,envios}=ambiente();let consumos=0;
 ctx.requestAnimationFrame=f=>f();ctx.window.scrollTo=()=>{};
 ctx.consumirHistoricoAtualizacaoGestor=()=>++consumos===1?{itens:['confirmado'],versaoConsulta:null,qtdTotal:51,temMais:true}:null;
 await ctx.chamarFiltroBackend(false);assert.equal(envios.length,0);assert.equal(els['lista-lancamentos'].innerHTML,'confirmado');
 const p=ctx.chamarFiltroBackend(true);assert.equal(envios.length,1);
 envios[0].resolve({itens:['reconferido'],versaoConsulta:'real',qtdTotal:51,temMais:true});
 await new Promise(r=>setImmediate(r));assert.equal(envios.length,2);
 envios[1].resolve({itens:['pagina2'],versaoConsulta:'real',qtdTotal:51,temMais:false});await p;
 assert.equal(ctx.offsetAtual,50);assert.equal(ctx.estadoIntegracaoInterfaceGestor.pxVersaoConsultaHistorico,'real');
 assert.equal(els['lista-lancamentos'].innerHTML,'reconferido,pagina2');
});
