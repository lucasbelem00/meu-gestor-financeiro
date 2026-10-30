// Consulta resumida da fatura e pagamento validado no servidor.
let dadosResumoFaturasGestor=null;
const resumosFaturasGestor=new Map();
const renderDadosAntesFaturasGestor=window.renderizarDados;
window.renderizarDados=function(dados){dadosResumoFaturasGestor=dados;return renderDadosAntesFaturasGestor(dados);};
function normalizarResumoFaturaGestor(f){
  const itens=f.itens||[];
  return {forma:f.forma,mesFatura:f.mesFatura,total:f.total,pago:f.pago,restante:f.restante,
    pessoal:f.pessoal??itens.filter(i=>i.aba==='Lançamentos').reduce((s,i)=>s+Math.round(i.valor*100),0)/100,
    terceiros:f.terceiros??itens.filter(i=>i.aba==='Empréstimos').reduce((s,i)=>s+Math.round(i.valor*100),0)/100,
    quantidade:f.quantidade??itens.length};
}
function resumoFaturaPainelGestor(forma,mes){
  const h=dadosResumoFaturasGestor?.faturas?.horizonte;if(!h)return null;
  const valor=mapa=>Number(h[mapa]?.[forma]?.[mes]||0);
  return {forma,mesFatura:mes,total:valor('totalBanco'),pago:valor('pagoBanco'),restante:valor('saldoBanco'),pessoal:valor('totalPessoal'),terceiros:valor('totalTerceiros')};
}
function mostrarResumoFaturaGestor(f,atualizado,instante){
  const box=document.getElementById('resumoPagamentoFaturaGestor');box.replaceChildren();
  [['Total registrado',f.total],['Pago ao banco',f.pago],['Em aberto',f.restante]].forEach(([rotulo,valor])=>{const c=elementoAtividadeGestor('div',null,'rounded-xl bg-slate-900 border border-slate-600 p-2 min-w-0');c.append(elementoAtividadeGestor('p',rotulo,'text-[10px] text-slate-300'),elementoAtividadeGestor('p',formatBRL(valor),'text-xs sm:text-sm font-bold mt-1 break-words '+(rotulo==='Em aberto'&&valor>0?'text-rose-300':rotulo==='Pago ao banco'?'text-emerald-300':'text-white')));box.append(c);});
  box.append(elementoAtividadeGestor('p','Seus gastos: '+formatBRL(f.pessoal)+' • Gastos de terceiros no cartão: '+formatBRL(f.terceiros),'col-span-3 text-xs text-slate-200 leading-relaxed'));
  document.getElementById('consultaFaturaOrigemGestor').textContent=atualizado?'Consulta às '+new Date(instante).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : 'Resumo dos dados já carregados • aguardando conferência';
  document.getElementById('salvarPagamentoFaturaGestor').disabled=!atualizado||f.restante<=0;
  atualizarComparacaoFaturaGestor(f);
}
function atualizarComparacaoFaturaGestor(f=faturaConferidaGestor){
  const resultado=document.getElementById('resultadoComparacaoFaturaGestor'),campo=document.getElementById('totalBancoConferenciaGestor');
  if(!resultado||!campo)return;
  resultado.className='text-xs text-slate-300 mt-2';
  if(!campo.value.trim()){resultado.textContent='Informe o total para comparar. Esta comparação não registra pagamento.';return;}
  if(!f){resultado.textContent='Aguarde a consulta atualizada para comparar.';return;}
  const diferenca=Math.round(lerValorMoeda(campo.value)*100)-Math.round(f.total*100);
  resultado.textContent=diferenca===0?'✓ Os totais conferem.': 'Diferença: o banco está '+formatBRL(Math.abs(diferenca)/100)+(diferenca>0?' acima':' abaixo')+' do registrado no app.';
  resultado.className='text-xs mt-2 '+(diferenca===0?'text-emerald-300':'text-amber-200');
}
function abrirMensalDaConferenciaGestor(){const mes=document.getElementById('mesPagamentoFaturaGestor').value;if(!/^(0[1-9]|1[0-2])\/\d{4}$/.test(mes)){mostrarAviso('Confira o mês','Use MM/AAAA para abrir o Mensal.');return;}fecharPagamentoFaturaGestor();irParaFaturaMensal(mes);}
async function abrirConferenciaFaturaGestor(forma, mes) {
  if(!formasGlobais.some(f=>formaEhCartaoGestor(f))){mostrarAviso('Nenhum cartão cadastrado','Cadastre um cartão em Cartões e Limites para conferir pagamentos de fatura. Os recebimentos de Pix ficam em Empréstimos.');return;}
  fecharMenuMobile(); const modal = document.getElementById('modalPagamentoFaturaGestor');
  Array.from(document.getElementById('formPagamentoFaturaGestor').elements).forEach(c=>{c.disabled=false;});
  modal._focoAnterior = document.activeElement;
  const select = document.getElementById('cartaoPagamentoFaturaGestor'); select.replaceChildren();
  formasGlobais.filter(f => { const n = typeof f === 'string' ? f : f.nome; return n && formaEhCartaoGestor(f); }).forEach(f => { const n = typeof f === 'string' ? f : f.nome; select.add(new Option(n, n)); });
  if (forma) select.value = forma;
  const hoje = new Date(); document.getElementById('mesPagamentoFaturaGestor').value = mes || String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();
  document.getElementById('valorPagamentoFaturaGestor').value = ''; modal.classList.remove('hidden');
  select.focus(); await conferirPagamentoFaturaGestor();
}
function fecharPagamentoFaturaGestor() { const modal=document.getElementById('modalPagamentoFaturaGestor'); modal.classList.add('hidden'); ++requisicaoPagamentoGestor; if(modal._focoAnterior?.isConnected && !modal._focoAnterior.disabled) modal._focoAnterior.focus({preventScroll:true}); }
async function conferirPagamentoFaturaGestor(forcar=false) {
  const contexto=document.getElementById('cartaoPagamentoFaturaGestor').value+'|'+document.getElementById('mesPagamentoFaturaGestor').value;
  const modal=document.getElementById('modalPagamentoFaturaGestor');if(modal._contextoPagamento!==contexto){document.getElementById('valorPagamentoFaturaGestor').value='';document.getElementById('totalBancoConferenciaGestor').value='';modal._contextoPagamento=contexto;}
  const req = ++requisicaoPagamentoGestor; faturaConferidaGestor = null;
  const estado = document.getElementById('estadoPagamentoFaturaGestor'), box = document.getElementById('resumoPagamentoFaturaGestor'); box.replaceChildren();
  document.getElementById('salvarPagamentoFaturaGestor').disabled = true;
  document.getElementById('consultaFaturaOrigemGestor').textContent='';
  atualizarComparacaoFaturaGestor();
  const forma=document.getElementById('cartaoPagamentoFaturaGestor').value,mes=document.getElementById('mesPagamentoFaturaGestor').value;
  const previo=resumoFaturaPainelGestor(forma,mes);if(previo)mostrarResumoFaturaGestor(previo,false);
  if (!navigator.onLine) { estado.textContent = 'Conecte-se para conferir o saldo atualizado antes de registrar um pagamento.'; return; }
  const cache=resumosFaturasGestor.get(contexto),agora=Date.now();
  if(!forcar&&cache&&cache.geracao===geracaoLeituraGestor&&agora-cache.instante>=0&&agora-cache.instante<15000){faturaConferidaGestor=cache.fatura;mostrarResumoFaturaGestor(cache.fatura,true,cache.instante);estado.textContent=cache.fatura.restante>0?'Você pode registrar um pagamento parcial ou o saldo total.':'Não há saldo em aberto nesta fatura.';return;}
  estado.textContent = 'Conferindo a fatura…';
  const geracao=geracaoLeituraGestor;
  try {
    const resposta = await apiCall('obterFaturaPagamentoWeb', {forma,mesFatura:mes,resumo:true});
    if (req !== requisicaoPagamentoGestor) return;
    const f=normalizarResumoFaturaGestor(resposta);faturaConferidaGestor=f;
    const instante=Date.now();if(geracao===geracaoLeituraGestor){if(resumosFaturasGestor.size>=8)resumosFaturasGestor.delete(resumosFaturasGestor.keys().next().value);resumosFaturasGestor.set(contexto,{fatura:f,instante,geracao});}
    mostrarResumoFaturaGestor(f,true,instante);
    estado.textContent = !f.quantidade ? 'Nenhum lançamento encontrado para este cartão neste mês.' : f.restante > 0 ? 'Você pode registrar um pagamento parcial ou o saldo total.' : 'Não há saldo em aberto nesta fatura.';
  } catch (e) { if (req === requisicaoPagamentoGestor) {faturaConferidaGestor=null;document.getElementById('salvarPagamentoFaturaGestor').disabled=true;estado.textContent='Não foi possível atualizar. '+e.message;atualizarComparacaoFaturaGestor();} }
}
function usarSaldoPagamentoFaturaGestor() { if (faturaConferidaGestor) definirValorMoeda('valorPagamentoFaturaGestor', faturaConferidaGestor.restante); }
function contextoConfirmacaoFaturaGestor(){return JSON.stringify([requisicaoPagamentoGestor,document.getElementById('cartaoPagamentoFaturaGestor').value,document.getElementById('mesPagamentoFaturaGestor').value,Math.round(lerValorMoeda('valorPagamentoFaturaGestor')*100)]);}
async function confirmarPagamentoFaturaGestor() {
  if (pagamentoFaturaEmCursoGestor || !faturaConferidaGestor) return;
  const f = { ...faturaConferidaGestor }, valor = lerValorMoeda('valorPagamentoFaturaGestor');
  if (valor <= 0 || Math.round(valor * 100) > Math.round(f.restante * 100)) { mostrarAviso('Confira o valor', 'Informe um valor maior que zero e até o saldo em aberto.'); return; }
  pagamentoFaturaEmCursoGestor=true;
  const requisicao=requisicaoPagamentoGestor;
  const contexto=contextoConfirmacaoFaturaGestor();
  let previa;
  try {previa=await apiCall('previaPagamentoFaturaWeb',{forma:f.forma,mesFatura:f.mesFatura,valor,resumo:true},1);}
  catch(e) {mostrarAviso('Prévia indisponível',e.message);return;}
  finally {pagamentoFaturaEmCursoGestor=false;}
  if(requisicao!==requisicaoPagamentoGestor||contexto!==contextoConfirmacaoFaturaGestor()) {mostrarAviso('Confira novamente','Os campos da fatura mudaram durante a consulta. Confira o valor e peça uma nova prévia.');return;}
  const distribuicao=previa.distribuicao||{quantidade:previa.aplicacoes.length,pessoal:previa.aplicacoes.filter(i=>i.aba==='Lançamentos').reduce((s,i)=>s+i.aplicar,0),terceiros:previa.aplicacoes.filter(i=>i.aba==='Empréstimos').reduce((s,i)=>s+i.aplicar,0)};
  const mensagem='Registrar '+formatBRL(previa.valor)+' na fatura '+previa.mesFatura+' de '+previa.forma+'?\n\nDistribuição em '+distribuicao.quantidade+' lançamento(s): seus gastos '+formatBRL(distribuicao.pessoal)+'; gastos de terceiros '+formatBRL(distribuicao.terceiros)+'.\n\nOrdem: data da compra e número da parcela, incluindo seus gastos e os de terceiros. Em empate, a ordem de cada registro é mantida.\n\nPagar o banco não marca o empréstimo como recebido. Receber da pessoa também não paga o banco.';
  mostrarConfirmacao('Conferir pagamento ao banco', mensagem, async () => {
    if(contexto!==contextoConfirmacaoFaturaGestor()){mostrarAviso('Confira novamente','A fatura ou o valor mudaram. Peça uma nova prévia antes de registrar.');return;}
    if (pagamentoFaturaEmCursoGestor) return; pagamentoFaturaEmCursoGestor = true;
    const sessao=requisicaoPagamentoGestor,mesmaSessao=()=>sessao===requisicaoPagamentoGestor;
    const campos = Array.from(document.getElementById('formPagamentoFaturaGestor').elements).map(c=>({campo:c,disabled:c.disabled}));
    const restaurarCampos=()=>campos.forEach(c=>{c.campo.disabled=c.disabled;});
    campos.forEach(c => { c.campo.disabled = true; });
    const referencia=previa.forma+' · '+previa.mesFatura;
    try {
      const r = await apiCall('registrarPagamentoFaturaWeb', { forma: previa.forma, mesFatura: previa.mesFatura, versaoFatura: previa.versaoFatura, regra:previa.regra, valor:previa.valor });
      mostrarAviso('Pagamento registrado — '+referencia, 'Saldo restante: ' + formatBRL(r.restante) + '. Você pode conferir ou desfazer em Atividade.');
      if(mesmaSessao()){restaurarCampos();fecharPagamentoFaturaGestor();}
      try{await carregarDados();}catch(e){mostrarAviso('Pagamento registrado — '+referencia,'Não foi possível atualizar a tela. Confira os dados novamente. '+e.message);}
    }
    catch (e) {
      mostrarAviso((e.resultadoIncerto ? 'Pagamento precisa de conferência' : 'Pagamento não confirmado')+' — '+referencia, e.message);
      if(mesmaSessao()){restaurarCampos();if (!e.resultadoIncerto) await conferirPagamentoFaturaGestor();}
    }
    finally { pagamentoFaturaEmCursoGestor = false; if(mesmaSessao())restaurarCampos(); atualizarBadgeAtividadeGestor(); }
  }, false, 'Sim, paguei ao banco', 'success');
}

