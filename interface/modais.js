// Histórico temporário de sobreposições: Voltar fecha a camada superior.
// Fechamentos pelo X e troca Menu → modal consomem as entradas em sequência.
// Nunca confirma ações ou apaga campos; usa os mesmos fechamentos dos botões.
function criarHistoricoModaisGestor(opcoes){
 const h=opcoes.historico,sessao='modais-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 let retornoPendente=false;
 const iguais=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
 function estado(){const e=h.state?.gestorSobreposicoes;return e?.sessao===sessao&&Array.isArray(e.ids)?e.ids:[];}
 function empilhar(ids){h.pushState({gestorSobreposicoes:{sessao,ids:ids.slice()},anterior:h.state},'');}
 function sincronizar(){
  if(retornoPendente)return;
  const atuais=opcoes.visiveis(),salvos=estado();let comum=0;
  while(comum<atuais.length&&comum<salvos.length&&atuais[comum]===salvos[comum])comum++;
  try{
   if(salvos.length>comum){retornoPendente=true;h.back();return;}
   for(let i=comum;i<atuais.length;i++)empilhar(atuais.slice(0,i+1));
  }catch(_){retornoPendente=false;}
 }
 function voltar(){
  if(retornoPendente){retornoPendente=false;sincronizar();return;}
  const alvo=estado(),antes=opcoes.visiveis();let comum=0;
  while(comum<antes.length&&comum<alvo.length&&antes[comum]===alvo[comum])comum++;
  for(let i=antes.length-1;i>=comum;i--){
   opcoes.fechar(antes[i]);
   // Um editor pode recusar o fechamento e abrir a confirmação de descarte.
   if(opcoes.visiveis().includes(antes[i])){sincronizar();return;}
  }
  let atuais=opcoes.visiveis();
  if(!iguais(atuais,alvo)){
   const faltam=alvo.slice(atuais.length);
   if(faltam.length&&faltam.every(id=>opcoes.podeReabrir?.(id))){for(const id of faltam)opcoes.abrir(id);}
   else {
    // Avançar não deve ressuscitar editores ou confirmações já encerrados.
    let anterior=h.state?.anterior??null;
    while(anterior?.gestorSobreposicoes&&!iguais(anterior.gestorSobreposicoes.ids||[],atuais))anterior=anterior.anterior??null;
    try{h.replaceState(anterior,'');}catch(_){}
   }
  }
  sincronizar();
 }
 return {sincronizar,voltar};
}
function iniciarHistoricoModaisGestor(){
 if(!window.history?.pushState||typeof MutationObserver!=='function')return;
 let anterior=window.history.state;
 while(anterior?.gestorSobreposicoes||anterior?.gestorCentralNavegacao)anterior=anterior.anterior??null;
 if(anterior!==window.history.state)try{window.history.replaceState(anterior,'');}catch(_){}
 const fechamentos={
  modalEdicaoEmp:()=>window.fecharModalEdicaoEmp(),
  modalEdicaoLanc:()=>window.fecharModalEdicaoLanc(),
  modalForma:()=>window.fecharModalForma(),
  modalEdicaoAss:()=>window.fecharModalEdicaoAss(),
  modalFiltros:()=>window.cancelarFiltrosHistoricoGestor(),
  modalPagamentoFaturaGestor:()=>window.fecharPagamentoFaturaGestor(),
  modalMenuMobile:()=>window.fecharMenuMobile(),
  modalExportarDados:()=>window.fecharExportacaoDados(),
  modalPixCobranca:()=>window.fecharModalPixCobranca(),
  modalConfirmacao:()=>{const m=document.getElementById('modalConfirmacao');if(m?._fecharConfirmacaoGestor)m._fecharConfirmacaoGestor();else m?.classList.add('hidden');},
  modalRegistroRachaGestor:()=>window.fecharRegistroRachaGestor(),
  modalEscolherValorColado:()=>document.getElementById('modalEscolherValorColado')?._fecharModalGestor?.(),
  pxOverlayCopiar:()=>document.getElementById('pxOverlayCopiar')?.remove()
 };
 const ids=Object.keys(fechamentos);
 const visiveis=()=>ids.map(id=>document.getElementById(id))
  .filter(e=>e&&!e.hidden&&!e.classList.contains('hidden')&&e.style.display!=='none')
  .sort((a,b)=>{
    const nivel=e=>typeof getComputedStyle==='function' ? Number(getComputedStyle(e).zIndex)||0 : 0;
    return nivel(a)-nivel(b);
  }).map(e=>e.id);
 const topo=()=>{const id=visiveis().at(-1);return id ? document.getElementById(id) : null;};
 const controle=criarHistoricoModaisGestor({historico:window.history,visiveis,fechar:id=>fechamentos[id]?.(),podeReabrir:id=>id==='modalMenuMobile',abrir:()=>window.abrirMenuMobile()});
 const podeFocar=e=>e?.isConnected&&!e.disabled&&e.getClientRects().length&&!e.closest('[hidden],.hidden,[inert]');
 const focaveis=m=>Array.from(m?.querySelectorAll?.('button,input,select,textarea,a[href],summary,[tabindex]')||[])
   .filter(e=>e.tabIndex>=0&&podeFocar(e));
 const origens=new WeakMap();
 let modalAtual=null,ultimoFoco=document.activeElement;
 function focarModal(modal) {
   const primeiro=focaveis(modal)[0];
   if (primeiro) primeiro.focus({preventScroll:true});
   else { modal.setAttribute?.('tabindex','-1');modal.focus?.({preventScroll:true}); }
 }
 function sincronizarFoco(){
   const modal=topo();
   if(modal===modalAtual)return;
   const anterior=modalAtual,origem=anterior&&origens.get(anterior);
   if(anterior&&!visiveis().includes(anterior.id)){
     origens.delete(anterior);
     if((!modal || modal.contains?.(origem))&&podeFocar(origem)&&
         (document.activeElement===document.body||!podeFocar(document.activeElement)||anterior.contains?.(document.activeElement))) origem.focus({preventScroll:true});
   }
   modalAtual=modal || null;
   if(!modal)return;
   if(!origens.has(modal))origens.set(modal,ultimoFoco);
   if(!modal.contains?.(document.activeElement))focarModal(modal);
 }
 document.addEventListener('focusin',event=>{
   const modal=topo();
   if(!modal || (modal===modalAtual && modal.contains?.(event.target)))ultimoFoco=event.target;
 });
 document.addEventListener('keydown',event=>{
   if(event.key!=='Escape'&&event.key!=='Tab')return;
   const modal=topo();if(!modal)return;
   if(event.key==='Escape'){
     event.preventDefault();event.stopImmediatePropagation();
     fechamentos[modal.id]?.();
     return;
   }
   const controles=focaveis(modal),indice=controles.indexOf(document.activeElement);
   if(!controles.length || indice<0 || (event.shiftKey?indice===0:indice===controles.length-1)){
     event.preventDefault();event.stopImmediatePropagation();
     const destino=event.shiftKey?controles.at(-1):controles[0];
     if(destino)destino.focus({preventScroll:true});else focarModal(modal);
   }
 },true);
 window.addEventListener('popstate',()=>{controle.voltar();sincronizarFoco();});
 const observador=new MutationObserver(registros=>{
  if(registros.some(r=>r.type==='attributes'?ids.includes(r.target.id):[...r.addedNodes,...r.removedNodes].some(n=>ids.includes(n.id)))){controle.sincronizar();sincronizarFoco();}
 });
 observador.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
 controle.sincronizar();sincronizarFoco();
}
document.addEventListener('DOMContentLoaded',iniciarHistoricoModaisGestor);
