function orientacaoPendenciaGestor(p) {
  if(p.diagnosticoServidor?.codigo==='DESTINO_RESTAURACAO_INVALIDO')return 'O arquivo anual desta restauração não pôde ser conferido. Preserve as cópias e recupere o arquivo de destino antes de retomar. Repetir o envio sem recuperar o arquivo não resolve a pendência.';
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

// A revisão é uma cópia local recuperável. Não modifica o pedido financeiro.
function validarRevisaoFilaGestor(chave,assinatura){
 const r=lerJSONLocalGestor(chave,null);
 if(!r||r.versao!==1||r.estado!=='revisar'||chave!==chaveRevisaoFilaGestor(r.chaveFila)||r.chaveFila!==GESTOR_FILA_PREFIXO+r.requestId)throw Error('Esta revisão mudou. Atualize Atividade.');
 if(assinatura&&JSON.stringify(r)!==assinatura)throw Error('Os dados mudaram desde a confirmação. Confira a revisão novamente.');
 return r;
}
function gravarEstadoRevisaoFilaGestor(chave,r,estado,extras={}){
 validarRevisaoFilaGestor(chave,JSON.stringify(r));
 const texto=JSON.stringify({...r,...extras,estado,conferidoEm:Date.now()});gravarArmazenamentoGestor(chave,texto);
 if(localStorage.getItem(chave)!==texto)throw Error('Não foi possível guardar a conferência. A cópia original permanece preservada.');
}
function criarCopiaCorrecaoFilaGestor(r){
 const chave='gestorRascunhoV3:novo:fila-'+r.requestId;
 if(localStorage.getItem(chave))return chave; // Nunca sobrescrever uma correção já iniciada.
 const p=r.payload||{},data=String(p.dataCompra||''),d=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data),perfil=p.perfilGasto;
 const campos={inpData:data,inpDataDia:d?.[1]||'',inpDataMes:d?.[2]||'',inpDataAno:d?.[3]||'',inpMesFat:String(p.mesPrimeiraFatura||''),inpDesc:String(p.descricao||''),selForma:String(p.formaPagto||''),selCat:String(p.categoria||''),inpValor:typeof p.valorTotal==='number'&&Number.isFinite(p.valorTotal)?formatBRL(p.valorTotal):String(p.valorTotal??''),inpParc:String(p.numParcelas??1),inpParcIni:String(p.parcelaInicial??1),inpTags:String(p.tags||''),checkAssinatura:p.isAssinatura===true,chkPixParcelado:p.pixParcelado===true,'perfil-novo-tipo':perfil&&Object.prototype.hasOwnProperty.call(perfil,'tipo')?perfil.tipo:'padrao','perfil-novo-prioridade':perfil&&Object.prototype.hasOwnProperty.call(perfil,'prioridade')?perfil.prioridade:'padrao'};
 const texto=JSON.stringify({versao:3,tipo:'novo',atualizadoEm:Date.now(),dados:{rascunhoId:novoRequestIdGestor(),origemRevisaoFila:r.requestId,campos}});
 gravarArmazenamentoGestor(chave,texto);if(localStorage.getItem(chave)!==texto)throw Error('A cópia para correção não pôde ser guardada. O original continua em revisão.');return chave;
}
async function executarRevisaoFilaGestor(chave,modo,assinatura){
 try{
  if(!navigator.onLine)throw Error('Conecte-se para conferir o envio original. A cópia permanece neste aparelho.');
  const feito=await comTravaAbasGestor('fila',async()=>{
   const r=validarRevisaoFilaGestor(chave,assinatura);
   if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(r.requestId))throw Error('A identificação local precisa de revisão técnica. Use Copiar dados; a cópia não será apagada.');
   const cancelar=['corrigir','cancelar'].includes(modo),res=await apiCall(cancelar?'cancelarOperacaoWeb':'consultarOperacaoWeb',{action:'salvarLancamentoWeb',requestId:r.requestId},1);
   validarRevisaoFilaGestor(chave,JSON.stringify(r));
   if(res.estado==='confirmado'){
    if(typeof conferirPendenciasGestor==='function')await conferirPendenciasGestor([r.requestId]);
    gravarEstadoRevisaoFilaGestor(chave,r,'confirmado');mostrarAviso('Envio já confirmado','O lançamento já foi gravado. Confira o Histórico; nenhuma nova cópia foi preparada.');if(typeof carregarDados==='function')await carregarDados();return;
   }
   if(cancelar&&res.estado==='cancelado'){
    let copia;if(modo==='corrigir')copia=criarCopiaCorrecaoFilaGestor(r);
    if(typeof concluirCancelamentoLocalGestor==='function')concluirCancelamentoLocalGestor({action:'salvarLancamentoWeb',requestId:r.requestId});
    gravarEstadoRevisaoFilaGestor(chave,r,modo==='corrigir'?'rascunho':'cancelado',copia?{rascunho:copia}:{});
    if(typeof renderizarRecuperacaoRascunhosGestor==='function')renderizarRecuperacaoRascunhosGestor();
    mostrarAviso(copia?'Cópia para correção pronta':'Envio cancelado',copia?'Abra Novo → Rascunhos de novo lançamento → Recuperar. Confira os campos antes de salvar. O envio original foi cancelado e sua cópia permanece preservada.':'A nuvem confirmou o cancelamento. A cópia local de revisão foi preservada.');return;
   }
   if(modo==='reenviar'&&res.estado==='nao_localizado'){
    if(r.payload?.requestId!==r.requestId)throw Error('O identificador do conteúdo está diferente da cópia. Cancele o envio antes de preparar uma correção.');
    const atual=localStorage.getItem(r.chaveFila);if(atual&&JSON.stringify(JSON.parse(atual))!==JSON.stringify(r.payload))throw Error('Há outro conteúdo na fila. As duas cópias foram preservadas.');
    gravarArmazenamentoGestor(r.chaveFila,JSON.stringify(r.payload));
    if(localStorage.getItem(r.chaveFila)!==JSON.stringify(r.payload))throw Error('Não foi possível recolocar o envio. A revisão foi preservada.');
    gravarEstadoRevisaoFilaGestor(chave,r,'reenviado');mostrarAviso('Envio recolocado na fila','O conteúdo e a identificação original foram mantidos. Sincronize para tentar novamente.');return;
   }
   if(res.estado==='cancelado'){mostrarAviso('Envio já cancelado','Use Preparar correção para revisar uma nova cópia. O pedido cancelado não será reenviado.');return;}
   mostrarAviso(res.estado==='nao_localizado'?'Envio ainda não localizado':'Gravação precisa de conferência',res.estado==='nao_localizado'?'Você pode recolocar o original na fila ou preparar uma correção com cancelamento seguro.':'A gravação pode ter começado. Consulte a confirmação e a recuperação em Atividade antes de criar outra operação.');
  });
  if(feito===false)mostrarAviso('Outra aba está conferindo a fila','Aguarde a outra aba terminar. Os dados continuam guardados.');
 }catch(e){mostrarAviso('Revisão preservada',e.message);}
 finally{if(typeof renderizarPendenciasAtividadeGestor==='function')renderizarPendenciasAtividadeGestor();if(typeof atualizarBadgeAtividadeGestor==='function')atualizarBadgeAtividadeGestor();if(typeof atualizarIndicadorOffline==='function')atualizarIndicadorOffline();}
}
function renderizarRevisaoFilaGestor(card,p){
 card.append(elementoAtividadeGestor('h3','Lançamento offline — revisar','font-bold text-amber-200'),elementoAtividadeGestor('p',p.descricao,'text-sm text-white break-words'),elementoAtividadeGestor('p',p.motivo,'text-xs text-amber-200 break-words'),elementoAtividadeGestor('p','Retirado da fila automática, com os dados preservados. Confira a confirmação antes de corrigir ou tentar novamente.','text-xs text-slate-200'));
 const detalhes=elementoAtividadeGestor('details',null,'text-xs text-slate-300');detalhes.appendChild(elementoAtividadeGestor('summary','Ver dados guardados','cursor-pointer py-2'));detalhes.appendChild(elementoAtividadeGestor('pre',JSON.stringify(p.payload,null,2),'whitespace-pre-wrap break-words'));card.appendChild(detalhes);
 card.appendChild(botaoAtividadeGestor('Copiar dados',()=>copiarTextoAreaTransferencia(JSON.stringify(lerJSONLocalGestor(p.chaveRevisao,null),null,2),'Cópia de revisão copiada.')));
 card.appendChild(botaoAtividadeGestor('Consultar confirmação',()=>executarRevisaoFilaGestor(p.chaveRevisao,'consultar')));
 for(const [modo,rotulo,texto]of [['reenviar','Recolocar na fila','O app consultará a confirmação e, se não localizar o envio, recolocará exatamente o mesmo conteúdo na fila. Não corrige campos.'],['corrigir','Preparar correção','O app pedirá o cancelamento seguro do envio original. Somente após a confirmação criará um rascunho separado para você revisar em Novo, sem substituir o formulário atual.'],['cancelar','Cancelar envio com segurança','O app pedirá à nuvem o cancelamento. Se já houver gravação, ela será conferida. A cópia local será preservada.']])card.appendChild(botaoAtividadeGestor(rotulo,()=>{
  try{const r=validarRevisaoFilaGestor(p.chaveRevisao),assinatura=JSON.stringify(r);mostrarConfirmacao(rotulo+'?',texto,()=>executarRevisaoFilaGestor(p.chaveRevisao,modo,assinatura),false,rotulo,'neutral');}catch(e){mostrarAviso('Confira a revisão',e.message);}
 }));
}
function renderizarHistoricoRevisoesFilaGestor(box){
 const resolvidas=lerEntradasLocaisGestor('gestorFilaRevisaoV1:').filter(e=>e.valor?.versao===1&&e.valor.estado!=='revisar');if(!resolvidas.length)return;
 const arquivo=elementoAtividadeGestor('details',null,'card-glass p-4 text-xs text-slate-300');arquivo.appendChild(elementoAtividadeGestor('summary','Revisões anteriores neste aparelho ('+resolvidas.length+')','cursor-pointer py-2 font-bold'));let montado=false;
 arquivo.addEventListener('toggle',()=>{if(!arquivo.open||montado)return;montado=true;
  resolvidas.forEach(({valor:r})=>{const item=elementoAtividadeGestor('details',null,'mt-3 border-t border-slate-700 pt-2');item.appendChild(elementoAtividadeGestor('summary',String(r.payload?.descricao||'Lançamento offline')+' — '+({confirmado:'confirmado',cancelado:'cancelado',rascunho:'cópia para correção preparada',reenviado:'recolocado na fila'}[r.estado]||r.estado),'cursor-pointer py-2'));item.appendChild(elementoAtividadeGestor('pre',JSON.stringify(r,null,2),'whitespace-pre-wrap break-words'));item.appendChild(botaoAtividadeGestor('Copiar dados',()=>copiarTextoAreaTransferencia(JSON.stringify(r,null,2),'Cópia de revisão copiada.')));arquivo.appendChild(item);});
 });box.appendChild(arquivo);
}
