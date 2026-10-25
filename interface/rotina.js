// Fluxos de uso diário. Não altera identificadores de envios já preparados.
const paginaRascunhoGestor=novoRequestIdGestor();
const chavesRascunhoPaginaGestor=Object.create(null);
function resumoParcelasExatasGestor(valor,qtd){
  const n=Math.max(1,Number(qtd)||1),c=Math.round(Number(valor)*100),base=Math.floor(c/n),resto=c%n;
  return [resto?resto+'x de '+formatBRL((base+1)/100):'',n-resto?(n-resto)+'x de '+formatBRL(base/100):''].filter(Boolean).join(' + ');
}
function podeSugerirCampoGestor(campo){return campo.dataset?.escolhaManual!=='true' && (!campo.value || campo.value===campo.dataset?.valorSugerido);}
function dataPromessaFormularioGestor(id){const v=document.getElementById(id)?.value || '';return /^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):v;}
function assinaturaFormularioRotinaGestor(form){return JSON.stringify(Array.from(form?.elements || []).filter(e=>e.id).map(e=>[e.id,e.value,e.checked]));}
function assinaturaEditorRecebimentoRotinaGestor(form){return JSON.stringify(Array.from(form?.elements || []).filter(e=>e.id && e.id!=='inpDividirEmpValor').map(e=>[e.id,e.value,e.checked]));}
function bloqueioFormularioRotinaGestor(emp){return emp?(salvandoEmprestimoTrava||emprestimoPendenteGestor()):(salvandoGastoTrava||sessionStorage.getItem('lancamentoResultadoIncerto')==='true');}
function chaveRascunhoRotinaGestor(tipo){return chavesRascunhoPaginaGestor[tipo] || (chavesRascunhoPaginaGestor[tipo]='gestorRascunhoV3:'+tipo+':'+paginaRascunhoGestor);}
function lerRascunhoRotinaGestor(tipo){
  const anterior=(()=>{try{return sessionStorage.getItem('gestorRascunhoAnterior:'+tipo);}catch(_){return null;}})();
  const r=anterior?lerJSONLocalGestor(anterior,null):null;
  if(r?.dados && !rascunhoVazioRotinaGestor(tipo,r.dados))return JSON.stringify(r.dados);
  // A chave legada é somente lida. Cada página passa a gravar em sua própria cópia.
  if(tipo==='racha')return lerCacheLeituraGestor('gestorRachadinhaRascunhoV1');
  try{const texto=sessionStorage.getItem(tipo==='novo'?'rascunhoLancamento':'rascunhoEmprestimo');return texto && !rascunhoVazioRotinaGestor(tipo,JSON.parse(texto))?texto:null;}catch(_){return null;}
}
function rascunhoRachaVazioRotinaGestor(dados){
  if(!Array.isArray(dados?.itens) || dados.itens.length || dados.envio || dados.registroId)return false;
  const c=dados.campos || {},texto=['rachaLocal','inpNovoNomeRacha','inpItemDescRacha'].some(id=>String(c[id] || '').trim()),valor=['rachaValorTotal','rachaValorBebida','rachaDesconto','rachaAcrescimo','inpItemValRacha'].some(id=>Number(String(c[id] || '').replace(/[^\d]/g,''))>0);
  return !texto&&!valor&&!c.rachaTaxa10&&String(c.rachaQtdPessoas || 2)==='2'&&String(c.rachaQtdBebeu || 1)==='1'&&String(c.rachaServicoPercentual || 10)==='10'&&(dados.pessoas || []).length===2&&dados.pessoas.every(n=>/^(eu|amigo\s*2)$/i.test(n))&&!Object.keys(dados.ajustes || {}).length;
}
function rascunhoFormularioVazioRotinaGestor(tipo,dados){
  if(!['novo','emp'].includes(tipo))return false;
  if(dados?.requestId || dados?.registroId || dados?.envio || dados?.resultadoIncerto)return false;
  const c=dados?.campos || {},emp=tipo==='emp';
  const textos=emp?['inpEmpPessoa','inpEmpDesc','selEmpForma','inpEmpObs','inpEmpCombinada']:['inpDesc','selForma','selCat','inpTags'];
  if([dados?.desc,dados?.pessoa,dados?.forma,...textos.map(id=>c[id])].some(v=>String(v || '').trim()))return false;
  if(Number(String(dados?.valor || c[emp?'inpEmpValor':'inpValor'] || '').replace(/[^\d]/g,''))>0)return false;
  if(Number(c[emp?'inpEmpParc':'inpParc'] || dados?.parc || 1)>1 || Number(c[emp?'inpEmpParcIni':'inpParcIni'] || 1)>1)return false;
  return ![c.checkAssinatura,c.chkPixParcelado,c.chkPixRecebimento].some(v=>v===true);
}
function rascunhoVazioRotinaGestor(tipo,dados){return tipo==='racha'?rascunhoRachaVazioRotinaGestor(dados):rascunhoFormularioVazioRotinaGestor(tipo,dados);}
function guardarRascunhoRotinaGestor(tipo,dados,obrigatorio=false){
  const chave=chaveRascunhoRotinaGestor(tipo);
  if(rascunhoVazioRotinaGestor(tipo,dados)){try{localStorage.removeItem(chave);if(sessionStorage.getItem('gestorRascunhoAnterior:'+tipo)===chave)sessionStorage.removeItem('gestorRascunhoAnterior:'+tipo);}catch(_){}return true;}
  const salvo=gravarArmazenamentoGestor(chave,JSON.stringify({versao:3,tipo,atualizadoEm:Date.now(),dados}),{opcional:!obrigatorio});
  if(salvo)gravarArmazenamentoGestor('gestorRascunhoAnterior:'+tipo,chave,{sessao:true,opcional:true});
  else mostrarAviso('Rascunho não guardado','Mantenha esta tela aberta e libere espaço. Os campos e os envios pendentes foram preservados.');
  return salvo;
}
const guardarRascunhoAnteriorRotinaGestor=guardarRascunhoGestor;
guardarRascunhoGestor=function(chave,valor){
  const tipo=chave==='rascunhoLancamento'?'novo':chave==='rascunhoEmprestimo'?'emp':null;
  if(!tipo)return guardarRascunhoAnteriorRotinaGestor(chave,valor);
  const dados=JSON.parse(valor);const salvo=guardarRascunhoRotinaGestor(tipo,dados);
  gravarArmazenamentoGestor(chave,valor,{sessao:true,opcional:true});return salvo;
};
const restaurarRascunhoAnteriorRotinaGestor=restaurarRascunhosCompletosGestor;
restaurarRascunhosCompletosGestor=function(){
  const restaurandoAgora=!rascunhosRestauradosGestor;
  if(!rascunhosRestauradosGestor){for(const [tipo,chave]of [['novo','rascunhoLancamento'],['emp','rascunhoEmprestimo']]){const texto=lerRascunhoRotinaGestor(tipo);if(texto)gravarArmazenamentoGestor(chave,texto,{sessao:true,opcional:true});}}
  restaurarRascunhoAnteriorRotinaGestor();
  if(restaurandoAgora)for(const id of ['selForma','selCat','inpMesFat']){const e=document.getElementById(id);if(e?.value)e.dataset.escolhaManual='true';}
  renderizarRecuperacaoRascunhosGestor();
};
function limparCopiaRascunhoRotinaGestor(emp){
  const tipo=emp?'emp':'novo';try{localStorage.removeItem(chaveRascunhoRotinaGestor(tipo));sessionStorage.removeItem('gestorRascunhoAnterior:'+tipo);sessionStorage.removeItem(emp?'rascunhoEmprestimo':'rascunhoLancamento');}catch(_){}
  for(const e of document.getElementById(emp?'formEmprestimo':'formLancamento')?.elements || [])if(e.dataset){delete e.dataset.escolhaManual;delete e.dataset.valorSugerido;}
}
for(const [nome,emp]of [['limparFormularioNovoGasto',false],['limparFormularioEmprestimo',true]]){
  const original=window[nome];window[nome]=function(){if(bloqueioFormularioRotinaGestor(emp))return original();original();limparCopiaRascunhoRotinaGestor(emp);};
}
function pedirLimpezaFormularioGestor(emp){
  const executar=()=>emp?limparFormularioEmprestimo():limparFormularioNovoGasto();
  if(bloqueioFormularioRotinaGestor(emp))return executar();
  const form=document.getElementById(emp?'formEmprestimo':'formLancamento'),antes=assinaturaFormularioRotinaGestor(form);
  if(!haRascunhoFormularioGestor(emp))return executar();
  mostrarConfirmacao('Limpar o formulário?','Os campos ainda não enviados serão apagados. Seus registros salvos permanecem guardados.',()=>{if(assinaturaFormularioRotinaGestor(form)!==antes){mostrarAviso('Os campos mudaram','Confira o formulário antes de limpar.');return;}executar();renderizarRecuperacaoRascunhosGestor();},false,'Limpar campos','neutral');
}
function renderizarRecuperacaoRascunhosGestor(){
  for(const tipo of ['novo','emp','racha']){
    const destino=document.getElementById(tipo==='novo'?'formLancamento':tipo==='emp'?'formEmprestimo':'subview-rachadinha');if(!destino)continue;
    let painel=document.getElementById('recuperarRascunhos-'+tipo);if(!painel){painel=document.createElement('details');painel.id='recuperarRascunhos-'+tipo;painel.className='rounded-xl border border-slate-600 p-3 text-xs text-slate-200 mb-3';destino.prepend(painel);}
    const entradas=lerEntradasLocaisGestor('gestorRascunhoV3:'+tipo+':').filter(e=>e.chave!==chaveRascunhoRotinaGestor(tipo) && !rascunhoVazioRotinaGestor(tipo,e.valor.dados)).sort((a,b)=>b.valor.atualizadoEm-a.valor.atualizadoEm);
    painel.hidden=!entradas.length;painel.replaceChildren();if(!entradas.length)continue;
    const titulo=document.createElement('summary');titulo.textContent='Rascunhos recuperáveis ('+entradas.length+')';titulo.className='cursor-pointer py-1 font-bold';painel.append(titulo);
    entradas.forEach(({chave,valor})=>{const linha=document.createElement('div');linha.className='flex flex-wrap items-center gap-2 mt-2';const texto=document.createElement('span');texto.className='flex-1 min-w-0 break-words';texto.textContent=(valor.dados?.desc||valor.dados?.pessoa||valor.dados?.campos?.rachaLocal||'Rascunho')+' · '+new Date(valor.atualizadoEm).toLocaleString('pt-BR');linha.append(texto);
      const recuperar=document.createElement('button');recuperar.type='button';recuperar.className='rounded-lg border border-sky-400 px-3 py-2 text-sky-200';recuperar.textContent='Recuperar';recuperar.onclick=()=>recuperarRascunhoRotinaGestor(tipo,chave,valor);linha.append(recuperar);
      const descartar=document.createElement('button');descartar.type='button';descartar.className='rounded-lg border border-slate-600 px-3 py-2';descartar.textContent='Descartar';descartar.onclick=()=>mostrarConfirmacao('Descartar esta cópia?','Somente este rascunho será removido. Envios e registros financeiros continuam protegidos.',()=>{if(JSON.stringify(lerJSONLocalGestor(chave,null))!==JSON.stringify(valor)){mostrarAviso('A cópia mudou','Confira a versão atual antes de descartar.');return;}if(valor.dados?.envio?.estado==='pendente' || valor.dados?.registroId && localStorage.getItem('gestorMutacaoV3:'+valor.dados.registroId)){mostrarAviso('Confira o envio','Consulte Atividade antes de descartar uma divisão com envio.');return;}localStorage.removeItem(chave);renderizarRecuperacaoRascunhosGestor();},false,'Descartar cópia','neutral');linha.append(descartar);painel.append(linha);
    });
  }
}
function recuperarRascunhoRotinaGestor(tipo,chave,valor){
  if(tipo==='racha'){
    if(divisaoRachaEnviadaGestor()){mostrarAviso('Confira a divisão atual','Conclua a conferência antes de recuperar outra divisão.');return;}
    mostrarConfirmacao('Recuperar esta divisão?','A cópia será aberta após recarregar. A divisão atual continuará disponível em Rascunhos recuperáveis.',()=>{if(JSON.stringify(lerJSONLocalGestor(chave,null))!==JSON.stringify(valor)){mostrarAviso('A cópia mudou','Abra a lista de rascunhos novamente.');return;}guardarRascunhoRachaGestor(true);gravarArmazenamentoGestor('gestorRascunhoAnterior:racha',chave,{sessao:true});location.reload();},false,'Recuperar divisão','neutral');return;
  }
  const emp=tipo==='emp';if(bloqueioFormularioRotinaGestor(emp)){mostrarAviso('Confira o envio','Resolva a pendência antes de recuperar outro rascunho.');return;}
  const form=document.getElementById(emp?'formEmprestimo':'formLancamento'),antes=assinaturaFormularioRotinaGestor(form);
  const aplicar=()=>{if(bloqueioFormularioRotinaGestor(emp)||assinaturaFormularioRotinaGestor(form)!==antes||JSON.stringify(lerJSONLocalGestor(chave,null))!==JSON.stringify(valor)){mostrarAviso('Os dados mudaram','Confira o formulário e a cópia novamente.');return;}
    if(haRascunhoFormularioGestor(emp)){emp?salvarRascunhoEmp():salvarRascunho();const copia=lerJSONLocalGestor(chaveRascunhoRotinaGestor(tipo),null);if(!copia){mostrarAviso('Rascunho atual não guardado','Libere espaço antes de substituir os campos.');return;}try{gravarArmazenamentoGestor('gestorRascunhoV3:'+tipo+':'+novoRequestIdGestor(),JSON.stringify(copia));}catch(e){mostrarAviso('Rascunho preservado',e.message);return;}}
    Object.entries(valor.dados?.campos || {}).forEach(([id,v])=>{const campo=document.getElementById(id);if(!campo)return;if(campo.type==='checkbox')campo.checked=Boolean(v);else campo.value=v;campo.dataset.escolhaManual='true';});
    if(emp){atualizarLayoutParcelasEmprestimo();atualizarPreviewParcEmp();salvarRascunhoEmp();}else{atualizarLayoutParcelas();atualizarPreviewParcelas();salvarRascunho();}mostrarAviso('Rascunho recuperado','Confira os campos antes de enviar.');};
  mostrarConfirmacao('Recuperar rascunho?','Os campos serão preenchidos com esta cópia. Se houver outro preenchimento, ele continuará disponível nos rascunhos.',aplicar,false,'Recuperar campos','neutral');
}
function restaurarBotoesEditorEmpGestor(){for(const [seletor,texto]of [['#painelDividirEmpCampos button','Conferir recebimento'],['#painelMoverPessoalCampos button','Transferir para Histórico Pessoal']]){const b=document.querySelector(seletor);if(b){b.disabled=false;b.textContent=texto;}}}
function modoRecebimentoEditorRotinaGestor(modal,ativo){
  const campos=[...Array.from(modal.querySelectorAll?.('form > .grid') || [modal.querySelector?.('form > .grid')]),document.getElementById('boxPropagarValorEmp'),modal.querySelector?.('[onclick="togglePainelDividirEmp()"]'),modal.querySelector?.('[onclick="togglePainelMoverPessoal()"]'),document.getElementById('inpEdEmpCombinada')?.closest?.('label'),document.getElementById('btnSalvarEdEmp')];
  campos.filter(Boolean).forEach(e=>{if(ativo){e.dataset.hiddenRecebimento=String(e.hidden);e.dataset.classeRecebimento=String(e.classList.contains('hidden'));e.hidden=true;e.classList.add('hidden');}else if(e.dataset.hiddenRecebimento!==undefined){e.hidden=e.dataset.hiddenRecebimento==='true';e.classList.toggle('hidden',e.dataset.classeRecebimento==='true');delete e.dataset.hiddenRecebimento;delete e.dataset.classeRecebimento;}});
  const titulo=modal.querySelector?.('h3');if(titulo)titulo.textContent=ativo?'Registrar recebimento':'Editar Empréstimo';
}
function protegerEditorRotinaGestor(abrir,fechar,id){
  const originalAbrir=window[abrir],originalFechar=window[fechar];
  window[abrir]=function(...args){const m=document.getElementById(id);if(id==='modalEdicaoEmp')modoRecebimentoEditorRotinaGestor(m,false);const r=originalAbrir(...args);m._sessaoEdicao=novoRequestIdGestor();if(id==='modalEdicaoEmp'){const ref=detalhesReferenciaGestor(args[0]),it=(emprestimosGlobal.itens || []).find(i=>String(i.registroId)===String(ref?.registroId)),data=it?.dataCombinada || '',campo=document.getElementById('inpEdEmpCombinada');if(campo)campo.value=/^\d{2}\/\d{2}\/\d{4}$/.test(data)?data.slice(6)+'-'+data.slice(3,5)+'-'+data.slice(0,2):'';m._assinaturaEditorRecebimento=assinaturaEditorRecebimentoRotinaGestor(m.querySelector('form'));}m._assinaturaInicial=assinaturaFormularioRotinaGestor(m.querySelector('form'));return r;};
  window[fechar]=function(forcar=false){const m=document.getElementById(id),form=m.querySelector('form');if(forcar || m.classList.contains('hidden') || !m._assinaturaInicial || m._assinaturaInicial===assinaturaFormularioRotinaGestor(form)){originalFechar();return;}
    const sessao=m._sessaoEdicao,atual=assinaturaFormularioRotinaGestor(form);mostrarConfirmacao('Descartar alterações da edição?','As mudanças ainda não enviadas serão descartadas. Uma operação que já foi enviada continua protegida em Atividade.',()=>{if(m._sessaoEdicao!==sessao||assinaturaFormularioRotinaGestor(form)!==atual){mostrarAviso('A edição mudou','Confira os campos antes de fechar.');return;}originalFechar();},false,'Descartar alterações','neutral');};
}
for(const a of [['abrirModalEdicaoEmp','fecharModalEdicaoEmp','modalEdicaoEmp'],['abrirModalEdicaoLanc','fecharModalEdicaoLanc','modalEdicaoLanc'],['abrirModalForma','fecharModalForma','modalForma'],['abrirModalEdicaoAss','fecharModalEdicaoAss','modalEdicaoAss']])protegerEditorRotinaGestor(...a);
const statusEmpAnteriorRotinaGestor=alternarStatusItemEmprestimo;
alternarStatusItemEmprestimo=function(linha,pessoa,descricao,parcela){
  const ref=detalhesReferenciaGestor(linha),it=(emprestimosGlobal.itens || []).find(i=>String(i.registroId)===String(ref?.registroId));
  if(!it || Number(it.versao)!==Number(ref?.versao)){mostrarAviso('Atualize a lista','Confira a versão atual antes de registrar o recebimento.');return;}
  if(it.status==='Recebido')return statusEmpAnteriorRotinaGestor(linha,pessoa,descricao,parcela);
  abrirModalEdicaoEmp(linha,it.data,it.pessoa,it.descricao,it.forma,it.valorRaw,it.mesFatura,it.status,it.parcela,it.observacoes);
  modoRecebimentoEditorRotinaGestor(document.getElementById('modalEdicaoEmp'),true);
  const painel=document.getElementById('painelDividirEmpCampos');painel.classList.remove('hidden');definirValorMoeda('inpDividirEmpValor',it.valorRaw);const modal=document.getElementById('modalEdicaoEmp');modal._assinaturaInicial=assinaturaFormularioRotinaGestor(modal.querySelector('form'));atualizarPreviaRecebimentoRotinaGestor();document.getElementById('inpDividirEmpValor').focus();
};
function atualizarPreviaRecebimentoRotinaGestor(){const p=document.getElementById('previaRecebimentoRotina');if(!p)return;const total=Number(document.getElementById('modalEdicaoEmp')._dadosOriginaisEdicao?.valorParcela || 0),valor=lerValorMoeda('inpDividirEmpValor');p.textContent=document.getElementById('inpEdEmpPessoa').value+' · '+document.getElementById('inpEdEmpDescOrig').value+' · Recebendo '+formatBRL(valor)+' · Restarão '+formatBRL(Math.max(0,total-valor))+'. Receber da pessoa não paga a fatura do cartão.';}
const parcialAnteriorRotinaGestor=executarDividirParcelaEmp;
executarDividirParcelaEmp=function(){const m=document.getElementById('modalEdicaoEmp');if(m._dadosOriginaisEdicao?.status==='Recebido'){mostrarAviso('Parcela já recebida','Confira o recebimento existente antes de registrar outro.');return;}if(m._assinaturaEditorRecebimento!==assinaturaEditorRecebimentoRotinaGestor(m.querySelector('form'))){mostrarAviso('Salve as alterações primeiro','A edição do empréstimo e o recebimento são ações separadas. Salve ou descarte a edição antes de registrar a devolução.');return;}const recebido=Math.round(lerValorMoeda('inpDividirEmpValor')*100),total=Math.round(Number(m._dadosOriginaisEdicao?.valorParcela || 0)*100);if(recebido<=0||recebido>total){mostrarAviso('Confira o valor','Informe o valor recebido, até o saldo desta parcela.');return;}
  const sessao=m._sessaoEdicao,assinatura=assinaturaFormularioRotinaGestor(m.querySelector('form'));
  mostrarConfirmacao('Registrar recebimento?',document.getElementById('inpEdEmpPessoa').value+' devolveu '+formatBRL(recebido/100)+'? Restarão '+formatBRL((total-recebido)/100)+'. O pagamento ao banco permanece independente.',()=>{
    if(sessao!==m._sessaoEdicao||assinatura!==assinaturaFormularioRotinaGestor(m.querySelector('form'))){mostrarAviso('Os campos mudaram','Confira o recebimento novamente.');return;}
    if(recebido===total){const linha=document.getElementById('inpEdEmpLinha').value;salvarStatusEmprestimoComAtualizacao(linha,document.getElementById('inpEdEmpPessoa').value,document.getElementById('inpEdEmpDescOrig').value,document.getElementById('inpEdEmpParcelaStr').value,true).then(ok=>{if(ok&&m._sessaoEdicao===sessao)fecharModalEdicaoEmp(true);});}else parcialAnteriorRotinaGestor();
  },false,'Registrar recebimento','success');
};
function mostrarRecebidosEmpGestor(){document.getElementById('selFiltroStatusEmp').value='Recebido';renderizarPainelEmprestimos();}
function limparFiltrosEmpGestor(){for(const id of ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','selFiltroStatusEmp','inpBuscaEmp']){const e=document.getElementById(id);if(e)e.value='';}renderizarPainelEmprestimos();}
ACOES_RENDERIZADAS.add('mostrarRecebidosEmpGestor');ACOES_RENDERIZADAS.add('limparFiltrosEmpGestor');ACOES_RENDERIZADAS.add('reativarFormaRotinaGestor');
function reativarFormaRotinaGestor(nome){const f=buscarFormaPagamentoGestor(nome);if(!f)return;const versaoConfiguracao=versoesConfigGestor.formas;mostrarConfirmacao('Reativar '+nome+'?','A forma voltará a aparecer nos novos lançamentos. O histórico será preservado.',()=>apiCall('salvarFormaPagamentoWeb',{nomeOriginal:nome,nome,banco:f.banco,limite:lerValorMoeda(f.limiteTotal),fechamento:f.fechamento,vencimento:f.vencimento,tipo:f.tipo,reativar:true,versaoConfiguracao}).then(()=>carregarDados()).catch(e=>mostrarAviso('Não reativado',e.message)),false,'Reativar','neutral');}

function escolherValorColadoRotinaGestor(opcoes,aplicar){
  const foco=document.activeElement,modal=document.createElement('div');modal.id='modalEscolherValorColado';modal.className='fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Escolha o valor da transferência');
  const caixa=document.createElement('div');caixa.className='w-full max-w-md rounded-2xl bg-slate-800 border border-slate-600 p-4 space-y-3';const titulo=document.createElement('p');titulo.className='font-bold text-white';titulo.textContent='O texto contém mais de um valor. Qual deseja usar?';caixa.append(titulo);const fechar=()=>{modal.remove();foco?.focus({preventScroll:true});};
  opcoes.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='block w-full rounded-xl border border-sky-500 p-3 text-left text-sky-100';b.textContent=formatBRL(o.valor)+' · '+o.contexto;b.onclick=()=>{fechar();aplicar(o.valor);};caixa.append(b);});const cancelar=document.createElement('button');cancelar.type='button';cancelar.textContent='Cancelar';cancelar.className='w-full rounded-xl bg-slate-700 p-3 text-white';cancelar.onclick=fechar;caixa.append(cancelar);modal.append(caixa);document.body.append(modal);caixa.querySelector('button').focus();modal.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();fechar();}if(e.key==='Tab'){const bs=Array.from(caixa.querySelectorAll('button')),i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();}};
}
const colarPixAnteriorRotinaGestor=extrairValorPixAoColar;
extrairValorPixAoColar=function(event,idValor,idDesc){
  const texto=(event.clipboardData || window.clipboardData).getData('text'),opcoes=[];
  for(const m of texto.matchAll(/R\$\s*([\d.,]+)/gi)){const bruto=m[1].replace(/[.,]+$/,''),valor=bruto.includes(',')?Number(bruto.replace(/\./g,'').replace(',','.')):/^\d+\.\d{1,2}$/.test(bruto)?Number(bruto):Number(bruto.replace(/\./g,''));if(valor>0&&Number.isSafeInteger(Math.round(valor*100)))opcoes.push({valor,contexto:texto.slice(Math.max(0,m.index-30),m.index).trim().slice(-30)});}
  if(!opcoes.length)return;
  if(opcoes.length===1 && !lerValorMoeda(idValor))return colarPixAnteriorRotinaGestor(event,idValor,idDesc);
  event.preventDefault();const campo=document.getElementById(idValor),antes=campo.value;
  const aplicar=valor=>{if(campo.value!==antes){mostrarAviso('O valor mudou','Os campos foram preservados. Cole o texto novamente para conferir.');return;}definirValorMoeda(idValor,valor);campo.dispatchEvent(new Event('input',{bubbles:true}));atualizarPreviewParcelas();atualizarPreviewParcEmp();};
  if(opcoes.length>1)escolherValorColadoRotinaGestor(opcoes,aplicar);else mostrarConfirmacao('Substituir o valor preenchido?','Usar '+formatBRL(opcoes[0].valor)+' em vez de '+formatBRL(lerValorMoeda(idValor))+'?',()=>aplicar(opcoes[0].valor),false,'Usar valor colado','neutral');
};
const painelEmpAnteriorRotinaGestor=renderizarPainelEmprestimos;
renderizarPainelEmprestimos=function(...args){const r=painelEmpAnteriorRotinaGestor(...args),box=document.getElementById('listaResumoPessoasEmp');if(!box)return r;for(const [id,texto]of [['selFiltroMesEmp','Todos'],['selFiltroPessoaEmp','Todas'],['selFiltroFormaEmp','Todas']]){const op=Array.from(document.getElementById(id)?.options || []).find(o=>o.value==='');if(op)op.textContent=texto;}const status=document.getElementById('selFiltroStatusEmp').value;
  if(box.textContent.includes('Nenhum registro')){const p=document.createElement('p');p.className='text-xs text-slate-200 mt-2';p.textContent=status==='A Receber'?'Não há pendências para estes filtros. O recebimento pode estar em Recebidos.':'Nenhum resultado para esta combinação.';box.append(p);for(const [nome,acao]of [['Ver recebidos',mostrarRecebidosEmpGestor],['Limpar filtros',limparFiltrosEmpGestor]]){const b=document.createElement('button');b.type='button';b.textContent=nome;b.className='rounded-lg border border-slate-600 px-3 py-2 text-xs text-white mr-2';b.onclick=acao;box.append(b);}}
  let resumo=document.getElementById('resumoFiltrosEmpRotina');if(!resumo){resumo=document.createElement('p');resumo.id='resumoFiltrosEmpRotina';resumo.className='text-xs text-slate-200 break-words';box.before(resumo);}resumo.textContent=['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','selFiltroStatusEmp','inpBuscaEmp'].map(id=>document.getElementById(id)?.value || '').filter(Boolean).join(' · ') || 'Todos os empréstimos';return r;};
const dadosAntesRotinaGestor=renderizarDados;
renderizarDados=function(dados){const r=dadosAntesRotinaGestor(dados);const escopo=document.getElementById('escopoKpiRotina');if(escopo)escopo.textContent='Seus gastos · '+(dados.faturas?.mesAtual || '')+' · Entenda os indicadores';renderizarRecuperacaoRascunhosGestor();return r;};
const apiAntesRotinaGestor=window.apiCall;
window.apiCall=async function(acao,param,...resto){const leituras=['prepararExportacaoBackupWeb','obterPartesImportacaoBackupWeb','listarCopiasRestauracaoWeb','obterParteCopiaRestauracaoWeb','iniciarImportacaoBackupWeb','enviarPartesBackupWeb','concluirImportacaoBackupWeb','descartarImportacaoBackupWeb','getDadosCompletos','obterRelatorioMes','obterRelatorioAnual','filtrarLancamentosWeb','exportarBackupDadosWeb','previaRestauracaoBackupWeb','obterBackupAnteriorWeb','obterAtividadeWeb','obterFaturaPagamentoWeb','previaPagamentoFaturaWeb','previaAntecipacaoWeb','consultarOperacaoWeb','diagnosticarPendenciasWeb','previaRecuperacaoOperacaoWeb','previaRachadinhaWeb'];if(!leituras.includes(acao) && protocoloServidorGestor<9){await apiAntesRotinaGestor('getDadosCompletos',null,1);if(protocoloServidorGestor<9)throw Error('Atualize também o Backend/Code.gs no Apps Script antes de gravar com esta versão. Seus campos e envios foram preservados.');}return apiAntesRotinaGestor(acao,param,...resto);};
function alternarModoEmprestimosGestor(modo,rolar=false){
  const novo=modo==='novo',cadastro=document.getElementById('painelNovoEmprestimo'),consulta=document.getElementById('painelConsultaEmprestimo');
  for(const [painel,visivel]of [[cadastro,novo],[consulta,!novo]])if(painel){painel.hidden=!visivel;painel.inert=!visivel;painel.setAttribute('aria-hidden',String(!visivel));}
  for(const [id,ativo]of [['btnConsultarEmprestimos',!novo],['btnNovoEmprestimo',novo]]){const b=document.getElementById(id);if(b){b.setAttribute('aria-pressed',String(ativo));b.classList.toggle('bg-amber-500/20',ativo);b.classList.toggle('border-amber-400',ativo);}}
  if(rolar)(novo?cadastro:consulta)?.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('DOMContentLoaded',()=>{
  for(const [id,texto]of [['selFiltroMesEmp','Mês'],['selFiltroPessoaEmp','Pessoa'],['selFiltroStatusEmp','Situação'],['selFiltroFormaEmp','Forma']]){const campo=document.getElementById(id);if(!campo)continue;const l=document.createElement('label');l.className='block min-w-0 text-[11px] text-slate-300';l.textContent=texto;campo.before(l);l.append(campo);campo.classList.add('w-full','mt-1');}
  document.getElementById('selFiltroRelMes')?.setAttribute('aria-label','Mês da fatura');document.getElementById('selFiltroRelAno')?.setAttribute('aria-label','Ano da fatura');
  for(const [id,emp]of [['formLancamento',false],['formEmprestimo',true]]){const f=document.getElementById(id);const b=f?.parentElement?.querySelector('button[onclick="'+(emp?'limparFormularioEmprestimo()':'limparFormularioNovoGasto()')+'"]');if(b)b.onclick=()=>pedirLimpezaFormularioGestor(emp);}
  document.addEventListener('change',e=>{if(['selForma','selCat','inpMesFat'].includes(e.target.id)){e.target.dataset.escolhaManual='true';if(e.target.id==='selForma')delete document.getElementById('inpMesFat').dataset.escolhaManual;}},true);
  document.addEventListener('input',e=>{if(e.target.id==='inpMesFat')e.target.dataset.escolhaManual='true';if(['inpDividirEmpValor','inpEdEmpValor'].includes(e.target.id))atualizarPreviaRecebimentoRotinaGestor();});
  const painel=document.getElementById('painelDividirEmpCampos');if(painel){const resumo=document.createElement('p');resumo.id='previaRecebimentoRotina';resumo.className='text-xs text-amber-100 leading-relaxed';resumo.setAttribute('role','status');painel.prepend(resumo);document.getElementById('inpDividirEmpValor').setAttribute('aria-label','Valor recebido agora');}
  const form=document.getElementById('formEmprestimo');if(form){const nav=document.createElement('div');nav.className='flex gap-2 mb-3';nav.setAttribute('role','group');nav.setAttribute('aria-label','Modo de empréstimos');const consultar=document.createElement('button'),novo=document.createElement('button');for(const b of [consultar,novo]){b.type='button';b.className='flex-1 rounded-xl border border-amber-500/40 px-3 py-3 text-sm font-bold text-amber-200';nav.append(b);}consultar.id='btnConsultarEmprestimos';novo.id='btnNovoEmprestimo';consultar.textContent='Consultar empréstimos';novo.textContent='Novo empréstimo';consultar.onclick=()=>alternarModoEmprestimosGestor('consulta');novo.onclick=()=>alternarModoEmprestimosGestor('novo');form.parentElement.before(nav);alternarModoEmprestimosGestor('consulta');}
  const pagamentos=document.querySelector('[aria-label="Pagamentos e recebimentos"]'),horizonte=document.getElementById('faturas-header')?.closest('.card-glass');if(pagamentos&&horizonte)horizonte.before(pagamentos);
  const explicacao=document.getElementById('horizonte-explicacao');if(explicacao){const d=document.createElement('details'),s=document.createElement('summary');d.className='text-xs text-slate-300 my-2';s.textContent='Entenda os valores';s.className='cursor-pointer py-2';explicacao.before(d);d.append(s,explicacao);const irma=d.nextElementSibling;if(irma?.tagName==='P')d.append(irma);}
  const detalheKpi=document.createElement('details'),tituloKpi=document.createElement('summary'),regraKpi=document.createElement('p');detalheKpi.className='text-xs text-slate-300 mb-2';tituloKpi.id='escopoKpiRotina';tituloKpi.className='cursor-pointer py-2';regraKpi.textContent='Em aberto e Pago: registros pessoais deste mês. Total do mês: registros pessoais deste período, incluindo os já pagos. Total registrado: todos os meses e anos, incluindo parcelas futuras já gravadas. Exclui empréstimos, cancelamentos e valores apenas previstos.';regraKpi.className='mt-2';detalheKpi.append(tituloKpi,regraKpi);const kpi=document.getElementById('kpi-aberto')?.closest('section');if(kpi)kpi.before(detalheKpi);
  const intervalo=document.createElement('p');intervalo.id='intervaloHorizonteRotina';intervalo.className='text-xs font-bold text-sky-200 mb-2';document.getElementById('faturas-header')?.closest('table')?.before(intervalo);
  for(const b of document.querySelectorAll('[data-filtro-mensal-tipo="status"]')){const v=b.dataset.filtroMensalValor;if(v==='aberto'){b.remove();continue;}if(v==='pago'){b.dataset.filtroMensalValor='naopago';b.textContent='Não pagos';b.onclick=()=>aplicarFiltroInternoMensal('status','naopago');}if(v==='parcial')b.textContent='Parciais';}
  const formas=document.getElementById('lista-formas');if(formas){const b=document.createElement('button');b.type='button';b.className='rounded-xl border border-slate-600 px-3 py-2 mb-3 text-xs text-slate-200';b.textContent='Mostrar arquivados';b.onclick=()=>{window.exibirArquivadosGestor=!window.exibirArquivadosGestor;b.textContent=window.exibirArquivadosGestor?'Ocultar arquivados':'Mostrar arquivados';b.setAttribute('aria-pressed',String(window.exibirArquivadosGestor));renderListaFormas();};formas.before(b);}
  for(const [formId,id,texto]of [['formEmprestimo','inpEmpCombinada','Data combinada da primeira devolução (opcional; demais parcelas mensais)'],['modalEdicaoEmp','inpEdEmpCombinada','Data combinada de devolução (opcional)']]){const destino=document.getElementById(formId);if(!destino)continue;const l=document.createElement('label');l.className='block text-xs text-slate-300 mt-3';l.textContent=texto;const i=document.createElement('input');i.type='date';i.id=id;i.className='block w-full rounded-xl bg-slate-900 border border-slate-600 p-3 text-white mt-1';l.append(i);const f=destino.tagName==='FORM'?destino:destino.querySelector('form');const acao=f.querySelector('button[type="submit"]')?.parentElement;if(acao)acao.before(l);else f.append(l);i.onchange=()=>formId==='formEmprestimo'&&salvarRascunhoEmp();}
  const inicio=document.createElement('input');inicio.id='inpAssInicio';inicio.placeholder='MM/AAAA';inicio.maxLength=7;inicio.inputMode='numeric';inicio.className='w-full rounded-xl bg-slate-900 border border-slate-600 p-3 text-white';inicio.setAttribute('aria-label','Novas condições a partir do mês');const fAss=document.getElementById('modalEdicaoAss')?.querySelector('form');if(fAss){const l=document.createElement('label');l.className='block text-xs text-slate-300';l.textContent='Novas condições a partir de (MM/AAAA)';l.append(inicio);fAss.prepend(l);const hoje=new Date();inicio.value=String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();}
  renderizarRecuperacaoRascunhosGestor();
});
