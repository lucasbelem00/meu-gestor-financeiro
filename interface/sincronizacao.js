function orientacaoPendenciaGestor(p) {
  if(p.tipo==='serie') return 'Esta série precisa de revisão. Os outros lançamentos podem continuar sendo usados.';
  if(p.tipo==='servidor'||p.noServidor) return 'A gravação começou na planilha, mas a confirmação não terminou. Consulte a confirmação. Se continuar pendente, veja os detalhes e confira a recuperação segura. Não cadastre o mesmo gasto novamente.';
  if(p.tipo==='notas') return 'Abra Conferir notas. Se houver conflito, compare as versões antes de escolher qual manter.';
  if(p.cancelamentoSolicitado) return 'Consulte o cancelamento. Os campos continuam guardados até a resposta da nuvem.';
  if(!navigator.onLine) return 'Este envio está guardado neste aparelho. Conecte-se e use Repetir envio protegido para enviar a mesma operação.';
  return 'Primeiro consulte a confirmação. Se ela não estiver disponível, use Repetir envio protegido; ele mantém a identificação original e evita duplicação.';
}
async function conferirRecuperacaoServidorGestor(p) {
  try {
    const previa=await apiCall('previaRecuperacaoOperacaoWeb',{action:p.action,requestId:p.id},1);
    if(previa.estado==='sem_pendencia'){await carregarDados();return;}
    const texto=previa.resumo.map(a=>a.aba+': '+a.estado+(a.linhasConferidas?' ('+a.linhasConferidas+' linha(s))':'')).join('\n');
    mostrarConfirmacao('Concluir confirmação existente?',texto+'\n\nAs linhas da operação já correspondem ao envio original. Concluir não cria outro lançamento nem substitui as demais linhas da planilha. O diário original e esta aprovação serão preservados.',async()=>{
      try{
        await apiCall('concluirRecuperacaoOperacaoWeb',{action:p.action,requestId:p.id,assinatura:previa.assinatura},1);
        await conferirPendenciasGestor([p.id]);await carregarDados();
        mostrarAviso('Conferência concluída','A operação foi confirmada sem repetir o lançamento.');
      }catch(e){mostrarAviso('Conferência ainda pendente',e.message+' Consulte a confirmação antes de tentar novamente.');}
    },false,'Concluir sem repetir','neutral');
  }catch(e){mostrarAviso('Recuperação precisa de revisão',e.message);}
}
document.addEventListener('DOMContentLoaded',()=>{
  const painel=document.getElementById('atividade-pendentes');
  const guia=document.createElement('details');guia.className='card-glass p-4 text-xs text-slate-200 space-y-2';
  guia.innerHTML='<summary class="cursor-pointer font-bold text-white py-1">Como resolver cada situação</summary><ul class="space-y-2 mt-3"><li><strong>Sem conexão:</strong> mantenha o app instalado e reconecte. Os envios locais continuam guardados.</li><li><strong>Confirmação pendente:</strong> use Consultar confirmação. Se necessário, repita o envio protegido; não crie outro gasto igual.</li><li><strong>Diferença na planilha:</strong> veja os detalhes e a recuperação segura. Se ela não puder concluir, copie o diagnóstico para revisão.</li><li><strong>Campo inválido:</strong> corrija o campo indicado antes de enviar novamente.</li><li><strong>Armazenamento indisponível:</strong> feche outras abas e libere espaço no aparelho. Não apague os dados do site enquanto houver envios pendentes.</li></ul><p class="mt-3 text-slate-300">Os botões explicam a ação antes de alterar dados. O diagnóstico técnico não inclui o conteúdo financeiro.</p>';
  painel.prepend(guia);
});
