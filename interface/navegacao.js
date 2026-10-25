// Cada troca de aba tem sua geração. Atualizações da mesma tela podem manter
// a posição; respostas de uma navegação anterior não podem deslocar outra aba.
const setAbaAntesRolagemGestor=window.setAba;
window.setAba=function(...args){
  const geracao=(window.geracaoNavegacaoGestor || 0)+1;window.geracaoNavegacaoGestor=geracao;
  window.scrollTo({top:0,left:0,behavior:'instant'});
  const retorno=setAbaAntesRolagemGestor(...args);
  atualizarBotaoTopoHistoricoGestor();
  requestAnimationFrame(()=>{if(window.geracaoNavegacaoGestor===geracao)window.scrollTo({top:0,left:0,behavior:'instant'});});
  return retorno;
};
function atualizarBotaoTopoHistoricoGestor(){
  const botao=document.getElementById('btnTopoHistoricoGestor');
  if(botao)botao.hidden=abaAtivaAtual!=='lancamentos' || window.scrollY<600;
}
function voltarAoTopoHistoricoGestor(){
  if(abaAtivaAtual!=='lancamentos')return;
  const view=document.getElementById('view-lancamentos');
  view?.focus({preventScroll:true});
  const reduzir=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0,left:0,behavior:reduzir?'instant':'smooth'});
}
document.addEventListener('DOMContentLoaded',()=>{
  const view=document.getElementById('view-lancamentos');if(!view)return;
  view.tabIndex=-1;view.setAttribute('role','region');view.setAttribute('aria-label','Histórico de lançamentos');
  const botao=document.createElement('button');botao.id='btnTopoHistoricoGestor';botao.type='button';botao.hidden=true;
  botao.textContent='↑ Voltar ao topo';botao.setAttribute('aria-label','Voltar ao topo do Histórico');botao.setAttribute('aria-controls','view-lancamentos');
  botao.className='fixed right-4 z-40 rounded-full border border-slate-500 bg-slate-800 px-4 py-3 text-xs font-bold text-white shadow-lg';
  botao.onclick=voltarAoTopoHistoricoGestor;document.body.append(botao);
  let quadroPendente=false;
  window.addEventListener('scroll',()=>{if(quadroPendente)return;quadroPendente=true;requestAnimationFrame(()=>{quadroPendente=false;atualizarBotaoTopoHistoricoGestor();});},{passive:true});
  atualizarBotaoTopoHistoricoGestor();
});
