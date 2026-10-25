// Cada troca de aba tem sua geração. Atualizações da mesma tela podem manter
// a posição; respostas de uma navegação anterior não podem deslocar outra aba.
const nomesAbasTopoGestor={lancamentos:'Histórico',relatorio:'Mensal',anual:'Anual',dashboard:'Painel',ferramentas:'Ferramentas',formas:'Formas de pagamento',categorias:'Categorias e metas',assinaturas:'Despesas fixas',atividade:'Atividade e sincronização'};
function iniciarRolagemNavegacaoGestor(){
  const geracao=(window.geracaoNavegacaoGestor || 0)+1;window.geracaoNavegacaoGestor=geracao;
  window.scrollTo({top:0,left:0,behavior:'instant'});
  requestAnimationFrame(()=>{if(window.geracaoNavegacaoGestor===geracao){window.scrollTo({top:0,left:0,behavior:'instant'});atualizarBotaoTopoGestor();}});
}
const setAbaAntesRolagemGestor=window.setAba;
window.setAba=function(...args){
  iniciarRolagemNavegacaoGestor();
  const retorno=setAbaAntesRolagemGestor(...args);atualizarBotaoTopoGestor();return retorno;
};
// Subferramentas também iniciam no topo, sem herdar a rolagem da anterior.
const selecionarSubAntesRolagemGestor=window.selecionarSubFerramenta;
if(typeof selecionarSubAntesRolagemGestor==='function')window.selecionarSubFerramenta=function(...args){
  iniciarRolagemNavegacaoGestor();const retorno=selecionarSubAntesRolagemGestor(...args);atualizarBotaoTopoGestor();return retorno;
};
function atualizarBotaoTopoGestor(){
  const botao=document.getElementById('btnVoltarTopoGestor');if(!botao)return;
  const nome=nomesAbasTopoGestor[abaAtivaAtual];
  botao.hidden=!nome || window.scrollY<400;
  botao.setAttribute('aria-label','Voltar ao topo'+(nome?' de '+nome:''));
  botao.setAttribute('aria-controls','view-'+abaAtivaAtual);
}
function voltarAoTopoGestor(){
  if(!nomesAbasTopoGestor[abaAtivaAtual])return;
  document.getElementById('view-'+abaAtivaAtual)?.focus({preventScroll:true});
  const reduzir=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0,left:0,behavior:reduzir?'instant':'smooth'});
}
document.addEventListener('DOMContentLoaded',()=>{
  for(const [id,nome]of Object.entries(nomesAbasTopoGestor)){
    const view=document.getElementById('view-'+id);if(!view)continue;view.tabIndex=-1;
    if(!view.hasAttribute('role'))view.setAttribute('role','region');
    if(!view.hasAttribute('aria-labelledby')&&!view.hasAttribute('aria-label'))view.setAttribute('aria-label',nome);
  }
  const botao=document.createElement('button');botao.id='btnVoltarTopoGestor';botao.type='button';botao.hidden=true;
  botao.textContent='↑ Voltar ao topo';
  botao.className='fixed right-4 z-40 rounded-full border border-slate-500 bg-slate-800 px-4 py-3 text-xs font-bold text-white shadow-lg';
  botao.onclick=voltarAoTopoGestor;document.body.append(botao);
  let quadroPendente=false;
  window.addEventListener('scroll',()=>{if(quadroPendente)return;quadroPendente=true;requestAnimationFrame(()=>{quadroPendente=false;atualizarBotaoTopoGestor();});},{passive:true});
  atualizarBotaoTopoGestor();
});
