// Cada troca de aba tem sua geração. Atualizações da mesma tela podem manter
// a posição; respostas de uma navegação anterior não podem deslocar outra aba.
// Voltar fecha Menu/modais por history.back(). O navegador não deve restaurar
// a rolagem da aba antiga quando essa volta acontece após abrir outra tela.
try{if(window.history&&'scrollRestoration' in window.history)window.history.scrollRestoration='manual';}catch(_){}
const nomesAbasTopoGestor={extrato:'Conferir extrato',lancamentos:'Histórico',relatorio:'Mensal',anual:'Anual',dashboard:'Painel',agenda:'Agenda financeira',planejamento:'Metas e compras planejadas',ferramentas:'Ferramentas',formas:'Formas de pagamento',categorias:'Categorias e metas',assinaturas:'Recorrências',atividade:'Atividade e sincronização'};
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
// Uma entrada temporária de Menu e modais é coordenada em interface/modais.js.
let revisaoRolagemTopoGestor=0;
function cancelarRolagemTopoAgendadaGestor(){revisaoRolagemTopoGestor++;}
function zerarRolagemDocumentoGestor(){
  // O elemento rolável varia entre navegador, PWA e documento embutido.
  for(const e of new Set([document.scrollingElement,document.documentElement,document.body]))if(e){e.scrollTop=0;e.scrollLeft=0;}
  window.scrollTo({top:0,left:0,behavior:'instant'});
}
function iniciarRolagemNavegacaoGestor(){
  const geracao=(window.geracaoNavegacaoGestor || 0)+1;window.geracaoNavegacaoGestor=geracao;
  const revisao=++revisaoRolagemTopoGestor;
  zerarRolagemDocumentoGestor();
  return {geracao,revisao};
}
function concluirRolagemNavegacaoGestor(visita){
  const atual=()=>window.geracaoNavegacaoGestor===visita.geracao&&revisaoRolagemTopoGestor===visita.revisao;
  if(!atual())return;
  document.getElementById('view-'+abaAtivaAtual)?.focus?.({preventScroll:true});
  zerarRolagemDocumentoGestor();atualizarBotaoTopoGestor();
  // Reaplica após o fechamento do Menu, foco e mudanças de altura do conteúdo.
  requestAnimationFrame(()=>{
    if(!atual())return;
    zerarRolagemDocumentoGestor();atualizarBotaoTopoGestor();
    requestAnimationFrame(()=>{if(atual()){zerarRolagemDocumentoGestor();atualizarBotaoTopoGestor();}});
  });
}
const setAbaAntesRolagemGestor=window.setAba;
window.setAba=function(...args){
  const visita=iniciarRolagemNavegacaoGestor();
  const retorno=setAbaAntesRolagemGestor(...args);concluirRolagemNavegacaoGestor(visita);return retorno;
};
// Subferramentas também iniciam no topo, sem herdar a rolagem da anterior.
const selecionarSubAntesRolagemGestor=window.selecionarSubFerramenta;
if(typeof selecionarSubAntesRolagemGestor==='function')window.selecionarSubFerramenta=function(...args){
  const visita=iniciarRolagemNavegacaoGestor();const retorno=selecionarSubAntesRolagemGestor(...args);concluirRolagemNavegacaoGestor(visita);return retorno;
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
