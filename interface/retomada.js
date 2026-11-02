// Reaproveita o editor protegido: Voltar, Escape e descarte continuam iguais.
function configurarModoAssinaturaGestor(retomar){
  const modal=document.getElementById('modalEdicaoAss');modal._retomadaGestor=null;
  document.getElementById('tituloEdicaoAssGestor').textContent=retomar?'▶️ Retomar recorrência':'✏️ Editar recorrência';
  document.getElementById('ajudaEdicaoAssGestor').textContent=retomar?'Revise os dados para iniciar um novo período. Não cria cobranças nos meses da pausa nem registra pagamento. O histórico anterior fica preservado.':'Altera o mês atual e futuros. O histórico de meses passados fica protegido.';
  const box=document.getElementById('boxDiaRetomadaAssGestor'),dia=document.getElementById('diaRetomadaAssGestor');box.hidden=!retomar;box.classList.toggle('hidden',!retomar);dia.disabled=!retomar;dia.required=retomar;
  const rotulo=document.getElementById('rotuloInicioAssGestor');if(rotulo)rotulo.textContent=retomar?'Mês de retorno (MM/AAAA)':'Novas condições a partir de (MM/AAAA)';
  const inicio=document.getElementById('inpAssInicio');if(inicio){inicio.required=retomar;inicio.setAttribute('aria-label',retomar?'Mês de retorno':'Novas condições a partir do mês');if(!retomar){const hoje=new Date();inicio.value=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();}}
  const btn=document.getElementById('btnSalvarEdAss');btn.disabled=false;btn.textContent=retomar?'▶️ Retomar':'↻ Atualizar recorrência';
}
function abrirRetomadaAssinaturaGestor(assinatura){
  const a={...assinatura};
  if(!a.registroId||!a.versao||!Number.isInteger(a.diaCobranca)) {mostrarAviso('Atualize os dados','Atualize também o Apps Script e carregue os dados para retomar com o dia de cobrança correto.');return;}
  if(!a.retomarAPartir){mostrarAviso('Período indisponível','Não há um mês de retorno disponível dentro do período aceito.');return;}
  abrirModalEdicaoAss(a.descricao,a.forma,a.categoria,a.valor,{registroId:a.registroId,compraId:a.compraId,versao:a.versao});
  configurarModoAssinaturaGestor(true);
  const modal=document.getElementById('modalEdicaoAss');modal._retomadaGestor=a;
  const formas=document.getElementById('selAssForma');formas.replaceChildren();
  formas.add(new Option('Selecione…',''));
  formasGlobais.filter(f=>!(typeof f==='object'&&f.arquivado)&&tipoFormaPagamentoGestor(f)!=='resumo').forEach(f=>{const n=typeof f==='string'?f:f.nome;formas.add(new Option(n,n));});
  formas.value=a.forma;formas.required=true;
  const categorias=document.getElementById('selAssCat');categorias.replaceChildren();categorias.add(new Option('Selecione…',''));
  categoriasGlobaisEdit.forEach(c=>categorias.add(new Option(isCategoriaOutros(c.nome)?'Outros 📦':c.nome,c.nome)));categorias.value=a.categoria;categorias.required=true;
  document.getElementById('inpAssInicio').value=a.retomarAPartir;
  document.getElementById('diaRetomadaAssGestor').value=a.diaCobranca;
  modal._assinaturaInicial=assinaturaFormularioRotinaGestor(modal.querySelector('form'));
  modal.querySelector('h3')?.focus({preventScroll:true});
}
async function salvarRetomadaAssinaturaGestor(){
  const modal=document.getElementById('modalEdicaoAss'),a=modal._retomadaGestor;if(!a)return;
  const btn=document.getElementById('btnSalvarEdAss');if(btn.disabled)return;
  const mes=document.getElementById('inpAssInicio').value.trim(),dia=Number(document.getElementById('diaRetomadaAssGestor').value);
  if(!parseMesFat(mes).m||!Number.isInteger(dia)||dia<1||dia>31){mostrarAviso('Confira o retorno','Informe um mês válido e um dia de cobrança entre 1 e 31.');return;}
  const sessao=modal._sessaoEdicao,param={registroId:a.registroId,compraId:a.compraId,versao:a.versao,descOriginal:a.descricao,descricao:formatarTituloInteligente(document.getElementById('inpAssDesc').value),formaPagto:document.getElementById('selAssForma').value,categoria:document.getElementById('selAssCat').value,valorMensal:lerValorMoeda(document.getElementById('inpAssValor').value),mesRetorno:mes,diaCobranca:dia};
  if(!param.descricao||!param.formaPagto||!param.categoria||param.valorMensal<=0){mostrarAviso('Confira os dados','Preencha descrição, forma de pagamento, categoria e valor mensal.');return;}
  btn.disabled=true;btn.textContent='Enviando…';
  let confirmado=false;
  try {
    const res=await apiCall('retomarAssinaturaWeb',param);
    confirmado=true;
    if(modal._sessaoEdicao===sessao)fecharModalEdicaoAss(true);
    mostrarAviso('Recorrência retomada','Novo período a partir de '+res.mesRetorno+', no dia '+res.diaCobranca+'. O histórico anterior foi preservado.');
    await carregarDados();
  }catch(e){mostrarAviso(confirmado?'Retomada registrada':'Retomada não concluída',confirmado?'A retomada foi confirmada. Atualize os dados para visualizar.':e.message);}
  finally{if(modal._sessaoEdicao===sessao){btn.disabled=false;btn.textContent='▶️ Retomar';}}
}
