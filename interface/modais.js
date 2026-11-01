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
  modalFiltros:()=>window.fecharModalFiltros(),
  modalPagamentoFaturaGestor:()=>window.fecharPagamentoFaturaGestor(),
  modalMenuMobile:()=>window.fecharMenuMobile(),
  modalExportarDados:()=>window.fecharExportacaoDados(),
  modalPixCobranca:()=>window.fecharModalPixCobranca(),
  modalConfirmacao:()=>{const m=document.getElementById('modalConfirmacao');if(m?._fecharConfirmacaoGestor)m._fecharConfirmacaoGestor();else m?.classList.add('hidden');},
  pxOverlayCopiar:()=>document.getElementById('pxOverlayCopiar')?.remove()
 };
 const ids=Object.keys(fechamentos);
 const visiveis=()=>ids.filter(id=>{const e=document.getElementById(id);return e&&!e.hidden&&!e.classList.contains('hidden')&&e.style.display!=='none';});
 const controle=criarHistoricoModaisGestor({historico:window.history,visiveis,fechar:id=>fechamentos[id]?.(),podeReabrir:id=>id==='modalMenuMobile',abrir:()=>window.abrirMenuMobile()});
 window.addEventListener('popstate',controle.voltar);
 const observador=new MutationObserver(registros=>{
  if(registros.some(r=>r.type==='attributes'?ids.includes(r.target.id):[...r.addedNodes,...r.removedNodes].some(n=>ids.includes(n.id))))controle.sincronizar();
 });
 observador.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
 controle.sincronizar();
}
document.addEventListener('DOMContentLoaded',iniciarHistoricoModaisGestor);
