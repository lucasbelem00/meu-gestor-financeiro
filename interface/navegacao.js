// Cada troca de aba tem sua geração. Atualizações da mesma tela podem manter
// a posição; respostas de uma navegação anterior não podem deslocar outra aba.
const nomesAbasTopoGestor={lancamentos:'Histórico',relatorio:'Mensal',anual:'Anual',dashboard:'Painel',ferramentas:'Ferramentas',formas:'Formas de pagamento',categorias:'Categorias e metas',assinaturas:'Despesas fixas',atividade:'Atividade e sincronização'};
// A Central reflete a página aberta. Abrir/fechar o menu não troca a seleção.
function sincronizarSelecaoCentralGestor(){
  for(const botao of document.querySelectorAll('#conteudoCentralNavegacao [data-menu-aba]')){
    const ferramenta=botao.dataset.menuFerramenta;
    const ativo=botao.dataset.menuAba===abaAtivaAtual&&(!ferramenta||document.getElementById('btn-sub-'+ferramenta)?.getAttribute('aria-pressed')==='true');
    if(ativo)botao.setAttribute('aria-current','page');else botao.removeAttribute('aria-current');
  }
}
const abrirAntesSelecaoCentralGestor=window.abrirMenuMobile;
window.abrirMenuMobile=function(...args){sincronizarSelecaoCentralGestor();return abrirAntesSelecaoCentralGestor(...args);};
// Uma entrada temporária permite ao Voltar fechar a Central, sem sair do app.
// O estado anterior é preservado; fechar pelo X também consome essa entrada.
function criarHistoricoCentralGestor(opcoes){
  let aberto=false,id=null,retornoPendente=false,sequencia=0;
  function registrar(){try{id='central-'+Date.now()+'-'+(++sequencia);opcoes.historico.pushState({gestorCentralNavegacao:id,anterior:opcoes.historico.state},'');}catch(_){id=null;}}
  function abrir(){if(aberto)return;aberto=true;if(!retornoPendente)registrar();opcoes.abrir();}
  function fechar(){if(!aberto)return;aberto=false;opcoes.fechar();if(id&&opcoes.historico.state?.gestorCentralNavegacao===id){retornoPendente=true;opcoes.historico.back();}id=null;}
  function voltar(){
    if(retornoPendente){retornoPendente=false;if(aberto)registrar();return;}
    id=null;
    if(aberto){aberto=false;opcoes.fechar();}
    else if(opcoes.historico.state?.gestorCentralNavegacao){id=opcoes.historico.state.gestorCentralNavegacao;aberto=true;opcoes.abrir();}
  }
  return {abrir,fechar,voltar};
}
if(window.history?.pushState){
  if(window.history.state?.gestorCentralNavegacao)window.history.replaceState(window.history.state.anterior??null,'');
  const abrirAntesHistoricoCentralGestor=window.abrirMenuMobile,fecharAntesHistoricoCentralGestor=window.fecharMenuMobile;
  const controleCentralGestor=criarHistoricoCentralGestor({historico:window.history,abrir:abrirAntesHistoricoCentralGestor,fechar:fecharAntesHistoricoCentralGestor});
  window.abrirMenuMobile=controleCentralGestor.abrir;window.fecharMenuMobile=controleCentralGestor.fechar;
  window.addEventListener('popstate',controleCentralGestor.voltar);
}
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
