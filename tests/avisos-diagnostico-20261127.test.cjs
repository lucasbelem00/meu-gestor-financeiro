const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function executar(inicio,fim,ctx){
  const indice=html.indexOf(inicio);
  vm.runInNewContext(html.slice(indice,html.indexOf(fim,indice)),ctx);
  return ctx;
}
test('avisos vazios mantêm instrução no erro e ocultam detalhe opcional na confirmação',()=>{
  const classes={add(){},remove(){}};
  const elementos={toastNotificacao:{dataset:{},classList:classes},toastIconeGestor:{},toastTitulo:{},toastMensagem:{}};
  const ctx=executar('   function tipoAvisoGestor','    // ===',{document:{getElementById:id=>elementos[id]},setTimeout:()=>1,clearTimeout(){}});
  ctx.mostrarAviso('Erro','  ');
  assert.equal(elementos.toastNotificacao.dataset.tipo,'erro');
  assert.match(elementos.toastMensagem.textContent,/Tente novamente/);
  ctx.mostrarAviso('Envio ainda não confirmado');
  assert.equal(elementos.toastNotificacao.dataset.tipo,'pendencia');
  assert.match(elementos.toastMensagem.textContent,/Atividade/);
  ctx.mostrarAviso('Sincronizado');
  assert.equal(elementos.toastMensagem.hidden,true);
});
test('Diagnóstico informa progresso, sucesso, falha e modo offline e evita duplicidade',async()=>{
  const botao={},estado={},elementos={btnAtualizarDiagnosticoGestor:botao,retornoAtualizarDiagnosticoGestor:estado};
  let chamadas=0,terminar,revisoes=0;
  const ctx=executar('async function atualizarCentralAtividadeGestor','async function carregarHistoricoAtividadeGestor',{
    document:{getElementById:id=>elementos[id]},navigator:{onLine:true},
    carregarDados(){chamadas++;return new Promise(resolve=>{terminar=resolve;});},
    renderizarPendenciasAtividadeGestor(){revisoes++;},atualizarBadgeAtividadeGestor(){}
  });
  const primeira=ctx.atualizarCentralAtividadeGestor();
  assert.equal(botao.disabled,true);
  assert.match(estado.textContent,/Buscando/);
  await ctx.atualizarCentralAtividadeGestor();
  assert.equal(chamadas,1);
  terminar(true);
  await primeira;
  assert.equal(botao.disabled,false);
  assert.equal(revisoes,1);
  assert.match(estado.textContent,/Dados atualizados/);
  const segunda=ctx.atualizarCentralAtividadeGestor();
  terminar(false);
  await segunda;
  assert.match(estado.textContent,/Não foi possível/);
  ctx.navigator.onLine=false;
  await ctx.atualizarCentralAtividadeGestor();
  assert.match(estado.textContent,/Sem conexão/);
  assert.equal(chamadas,2);
});
test('prioridade no Histórico alterna o filtro e preserva a categoria',()=>{
  const select={value:''},filtrosAtuais={categoria:'Alimentação'};
  const ctx=executar('    function filtrarPorCampoHistoricoGestor','    function filtrarPorTagRapida',{
    filtrosAtuais,abaAtivaAtual:'lancamentos',document:{getElementById:id=>id==='filtPerfilHistorico'?select:null},
    aplicarFiltros(){const [campo,valor]=select.value.split(':');Object.assign(filtrosAtuais,{perfilCampo:campo,perfilValor:valor});}
  });
  ctx.filtrarPorCampoHistoricoGestor('prioridade','essencial');
  assert.equal(filtrosAtuais.perfilValor,'essencial');
  ctx.filtrarPorCampoHistoricoGestor('prioridade','essencial');
  assert.equal(select.value,'');
  ctx.filtrarPorCampoHistoricoGestor('prioridade','ajustavel');
  assert.equal(filtrosAtuais.perfilValor,'ajustavel');
  assert.equal(filtrosAtuais.categoria,'Alimentação');
});
