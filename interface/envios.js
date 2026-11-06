// Estado visual temporário; nunca substitui requestId, journal ou versão do servidor.
function controleSaidaDuranteEnvioGestor(e){
  if(e.tagName!=='BUTTON')return false;
  const acao=e.getAttribute?.('onclick')||'',texto=String(e.textContent||'').replace(/^[✕×]\s*/,'').trim();
  return /\b(fechar\w*|cancelar\w*|setAba|voltar)\s*\(/i.test(acao)||/^(Cancelar|Fechar|Voltar)$/i.test(texto)||e.hasAttribute?.('data-menu-aba')||e.classList?.contains('tab-btn-global');
}
function reiniciarControlesEditorEnvioGestor(raiz){
  const bloco=raiz?._bloqueioControlesEnvioGestor;if(!bloco)return;
  bloco.campos.forEach(([e,antes])=>{e.disabled=antes;});delete raiz._bloqueioControlesEnvioGestor;raiz.removeAttribute?.('aria-busy');
}
function bloquearControlesEnvioGestor(raiz){
  if(!raiz?.querySelectorAll)return ()=>{};
  let bloco=raiz._bloqueioControlesEnvioGestor;
  if(!bloco){
    const campos=Array.from(raiz.querySelectorAll('button,input,select,textarea')).filter(e=>!controleSaidaDuranteEnvioGestor(e)).map(e=>[e,e.disabled]);
    bloco={campos,sessao:raiz._sessaoEdicao,usuarios:0};raiz._bloqueioControlesEnvioGestor=bloco;
    campos.forEach(([e])=>e.disabled=true);raiz.setAttribute?.('aria-busy','true');
  }
  bloco.usuarios++;let liberado=false;
  return ()=>{if(liberado)return;liberado=true;if(raiz._bloqueioControlesEnvioGestor!==bloco)return;
    if(--bloco.usuarios>0)return;delete raiz._bloqueioControlesEnvioGestor;raiz.removeAttribute?.('aria-busy');
    if(raiz._sessaoEdicao!==bloco.sessao)return;bloco.campos.forEach(([e,antes])=>{e.disabled=antes;});};
}
const enviosVisuaisGestor=new Set(),apiAntesBloqueioVisualGestor=window.apiCall;
window.apiCall=async function(acao,p,...resto){
  if(CATALOGO_ACOES_GESTOR[acao]?.tipo!=='financeira')return apiAntesBloqueioVisualGestor(acao,p,...resto);
  const raizes=Array.from(document.querySelectorAll?.('[role="dialog"],[id^="view-"]')||[]).filter(e=>!e.classList.contains('hidden')&&!e.closest?.('[inert]'));
  const form=document.activeElement?.closest?.('form');if(form&&!form.closest?.('.hidden,[inert]'))raizes.push(form);
  const unicas=[...new Set(raizes)].filter(e=>!raizes.some(pai=>pai!==e&&pai.contains?.(e)));
  if(unicas.some(e=>enviosVisuaisGestor.has(e)))throw Error('Aguarde a confirmação do envio em andamento.');
  unicas.forEach(e=>enviosVisuaisGestor.add(e));const liberar=unicas.map(bloquearControlesEnvioGestor);
  try{return await apiAntesBloqueioVisualGestor(acao,p,...resto);}finally{liberar.forEach(f=>f());unicas.forEach(e=>enviosVisuaisGestor.delete(e));}
};
function atualizarRotuloParcelasEmpGestor(){
  const c=document.getElementById('inpEmpParc'),r=document.getElementById('rotuloAVistaEmpGestor');if(!c||!r)return;
  const mostrar=document.activeElement!==c&&Number(c.value||1)===1;r.hidden=!mostrar;r.classList.toggle('hidden',!mostrar);if(c.style)c.style.color=mostrar?'transparent':'';
}
function iniciarEdicaoParcelasEmpGestor(){const c=document.getElementById('inpEmpParc');if(Number(c.value||1)===1)c.value='';atualizarRotuloParcelasEmpGestor();}
function concluirEdicaoParcelasEmpGestor(){const c=document.getElementById('inpEmpParc');if(!c.value||Number(c.value)===1)c.value='1';atualizarLayoutParcelasEmprestimo();salvarRascunhoEmp();}
function voltarPagamentoAVistaEmpGestor(){document.getElementById('inpEmpParc').value='1';document.getElementById('inpEmpParcIni').value='1';atualizarLayoutParcelasEmprestimo();salvarRascunhoEmp();}
async function mudarMesConferenciaFaturaGestor(delta){
  if(pagamentoFaturaEmCursoGestor)return;
  const c=document.getElementById('mesPagamentoFaturaGestor'),p=interpretarCompetenciaGestor(c.value);if(!p.m){mostrarAviso('Confira o mês','Informe uma competência válida antes de navegar.');return;}
  const d=new Date(p.a,p.m-1+delta,1);if(!anoCompetenciaValidoGestor_(d.getFullYear()))return;
  if(document.getElementById('valorPagamentoFaturaGestor').value.trim()){
    mostrarConfirmacao('Trocar a fatura?','O valor digitado ainda não enviado será limpo. Nenhum pagamento será registrado.',()=>{if(pagamentoFaturaEmCursoGestor)return;c.value=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();conferirPagamentoFaturaGestor();},false,'Trocar mês','neutral');return;
  }
  c.value=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();await conferirPagamentoFaturaGestor();
}
