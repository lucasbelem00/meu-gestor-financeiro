// Fonte da interface: Horizonte, simulador, calculadora e notas.
let horizonteDetalhadoGestor = null;
let modoHorizonteGestor = 'total';
let simuladorExpandidoGestor = false;
let calcExprStr = '', calcAposIgualGestor = false;
let historicoCalcGestor = [];
let notaEmEdicaoGestor = null;
let notasFixadasGestor = [];
let revisaoTextoNotaGestor = 0;
let mensalEntradaPendenteGestor = false;
let mensalNavegacaoManualGestor = false;
let mensalConsultaPendenteGestor = false;
let notaRascunhoChaveGestor = '';
let notaRascunhoAnteriorGestor = '';
const NOTA_RASCUNHO_PREFIXO_GESTOR = 'gestorNotaRascunhoV2:';
const rascunhosNotasRecuperadosGestor = new Map();

function centavosInterfaceGestor(valor) {
  const n = Math.round((Number(valor) + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(n) || n < 0) throw Error('Confira o valor informado.');
  return n;
}
function valorMapaHorizonteGestor(mapa, forma, mes) { return Number(mapa?.[forma]?.[mes] || 0); }
function somaMapaHorizonteGestor(mapa, mes, apenasCartao = false) {
  return Object.keys(mapa || {}).reduce((s, forma) => s + ((!apenasCartao || formaEhCartaoGestor(forma)) ? centavosInterfaceGestor(mapa[forma]?.[mes] || 0) : 0), 0) / 100;
}
function escolherModoHorizonteGestor(modo) {
  modoHorizonteGestor = modo === 'saldo' ? 'saldo' : 'total';
  salvarCacheLeituraGestor('gestorHorizonteModoV1', modoHorizonteGestor);
  renderTabelaEvolucao();
}
function renderTabelaEvolucao() {
  const h = horizonteDetalhadoGestor;
  const compacto = window.innerWidth < 640 && !compararHorizonteCompleto;
  const qtdCols = compacto ? 2 : 4;
  const meses = evolucaoMeses.slice(evolucaoIdx, evolucaoIdx + qtdCols);
  const moeda = n => compacto ? Number(n).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : formatBRL(n);
  const total = modoHorizonteGestor === 'total';
  const botoes = document.querySelectorAll('[data-modo-horizonte]');
  botoes.forEach(b => { const ativo = b.dataset.modoHorizonte === modoHorizonteGestor; b.setAttribute('aria-pressed', String(ativo)); b.className = 'rounded-lg px-3 py-2 text-xs font-bold border '+(ativo ? 'bg-sky-900 border-sky-400 text-white' : 'bg-slate-900 border-slate-600 text-slate-300'); });
  document.getElementById('horizonte-explicacao').textContent = h ? (total ? 'Total do período: registrado + previsto. Verde indica quitação dos registros; toque em Prev. para detalhar.' : 'Saldo dos registros + fixos previstos. O previsto é uma estimativa, não uma nova cobrança.') : 'Atualize o Apps Script e os dados para consultar os totais pagos. Exibindo os saldos disponíveis.';
  const nomes = h ? [...new Set([...Object.keys(h.totalPessoal), ...Object.keys(h.totalBanco), ...Object.keys(h.previstoPessoal)])] : Object.keys(evolucaoPivot).filter(f => ![evolucaoChaveResumoGestor,'__BANCO_TOTAL__','__TERCEIROS_A_RECEBER__'].includes(f));
  const formas = nomes.filter(f => tipoFormaPagamentoGestor(f) !== 'resumo').filter(f => evolucaoMeses.some(m => h ? valorMapaHorizonteGestor(h.totalPessoal,f,m)+valorMapaHorizonteGestor(h.totalBanco,f,m)+valorMapaHorizonteGestor(h.previstoPessoal,f,m)>0 : (evolucaoPivot[f]?.[m] || 0)>0)).sort((a,b) => Number(formaEhPixGestor(a))-Number(formaEhPixGestor(b)) || a.localeCompare(b,'pt-BR'));
  let cabecalho = '<th class="py-2 pl-2">Forma'+(compacto?'<span class="block text-[9px] font-normal">Valores em R$</span>':'')+'</th>';
  meses.forEach(m => cabecalho += `<th class="py-2 text-center"><button type="button" ${acaoHTML('irParaFaturaMensal',[m])} class="px-1 py-2 text-sky-300 underline font-bold" aria-label="Abrir mês ${escaparHTML(m)}">${escaparHTML(m.slice(0,3)+m.slice(5))} ↗</button></th>`);
  cabecalho += `<th class="text-right pr-2 ${compacto?'hidden':''}">Total exibido</th>`;
  document.getElementById('faturas-header').innerHTML = cabecalho;
  let html = '';
  function linha(rotulo, valores, classe, abrir = false) {
    const soma = valores.reduce((s,v) => s + centavosInterfaceGestor(v.valor),0)/100;
    const cols = valores.map((v,i) => {
      const quitado = v.registrado > 0 && v.saldo < 0.005 && !v.previsto;
      const cor = quitado ? 'text-emerald-400' : v.pago > 0 && v.saldo > 0 ? 'text-rose-300' : classe;
      const aviso = v.previsto > 0 ? 'Inclui previsto' : quitado ? 'Quitado' : v.pago > 0 ? 'Parcial' : '';
      const titulo = `Registrado: ${formatBRL(v.registrado || 0)}. ${rotulo==='Terceiros'?'Recebido':'Pago'}: ${formatBRL(v.pago || 0)}. Restante: ${formatBRL(v.saldo || 0)}.${v.previsto?' Previsto: '+formatBRL(v.previsto)+'.':''}`;
      const acao = v.previsto > 0 ? acaoHTML('abrirDetalheHorizonteGestor',[rotulo,meses[i],v,abrir]) : acaoHTML(abrir?'abrirConferenciaFaturaGestor':'irParaFaturaMensal',abrir?[rotulo,meses[i]]:[meses[i]]);
      return `<td class="py-3 px-1 text-center ${cor}"><button type="button" ${acao} class="w-full py-1 font-bold whitespace-nowrap" title="${escaparHTML(titulo)}" aria-label="${escaparHTML(rotulo+' '+meses[i]+'. '+titulo)}">${v.valor>0?moeda(v.valor):quitado?moeda(0):'—'}${aviso?'<span class="block text-[9px] font-normal">'+(v.previsto>0?'Prev.: '+moeda(v.previsto)+' · detalhar':aviso)+'</span>':''}</button></td>`;
    }).join('');
    html += `<tr class="border-b border-slate-700"><th scope="row" class="text-left py-3 pl-2 pr-1 font-bold ${classe}">${escaparHTML(rotulo)}</th>${cols}<td class="text-right pr-2 font-bold ${classe} ${compacto?'hidden':''}">${soma>0?moeda(soma):'—'}</td></tr>`;
  }
  formas.forEach(f => linha(f,meses.map(m => {
    if(!h)return {valor:evolucaoPivot[f]?.[m] || 0};
    const cartao = formaEhCartaoGestor(f), previsto = valorMapaHorizonteGestor(h.previstoPessoal,f,m);
    const registrado=valorMapaHorizonteGestor(cartao?h.totalBanco:h.totalPessoal,f,m),pago=valorMapaHorizonteGestor(cartao?h.pagoBanco:h.pagoPessoal,f,m),saldo=valorMapaHorizonteGestor(cartao?h.saldoBanco:h.saldoPessoal,f,m);
    return {valor:(total?registrado:saldo)+previsto,registrado,pago,saldo,previsto};
  }),'text-white',formaEhCartaoGestor(f)));
  if(h){
    function resumo(pessoal) { return meses.map(m => {
      const registrado=somaMapaHorizonteGestor(pessoal?h.totalPessoal:h.totalBanco,m,true),pago=somaMapaHorizonteGestor(pessoal?h.pagoPessoal:h.pagoBanco,m,true),saldo=somaMapaHorizonteGestor(pessoal?h.saldoPessoal:h.saldoBanco,m,true),previsto=somaMapaHorizonteGestor(h.previstoPessoal,m,true);
      return {registrado,pago,saldo,previsto,valor:(total?registrado:saldo)+previsto};
    }); }
    linha('Total Carteira',resumo(true),'text-purple-300');
    if(meses.some(m=>total?somaMapaHorizonteGestor(h.totalTerceiros,m,true)>0:somaMapaHorizonteGestor(h.saldoBanco,m,true)-somaMapaHorizonteGestor(h.saldoPessoal,m,true)>0.004))linha('Fatura Real',resumo(false),'text-purple-300');
    if(meses.some(m=>somaMapaHorizonteGestor(h.totalTerceiros,m)-somaMapaHorizonteGestor(h.recebidoTerceiros,m)>0.004))linha('Terceiros',meses.map(m=>{const registrado=somaMapaHorizonteGestor(h.totalTerceiros,m),pago=somaMapaHorizonteGestor(h.recebidoTerceiros,m),saldo=Math.max(0,registrado-pago);return {valor:saldo,registrado,pago,saldo};}),'text-amber-300');
  }else{
    [evolucaoChaveResumoGestor,'__BANCO_TOTAL__','__TERCEIROS_A_RECEBER__'].forEach((f,i)=>{if(i===0||meses.some(m=>(evolucaoPivot[f]?.[m] || 0)>0))linha(['Total Carteira','Fatura Real','Terceiros'][i],meses.map(m=>({valor:evolucaoPivot[f]?.[m] || 0})),i===2?'text-amber-300':'text-purple-300');});
  }
  document.getElementById('faturas-body').innerHTML = html || '<tr><td colspan="6" class="py-4 text-slate-300 text-center">Nenhum valor neste período.</td></tr>';
  document.getElementById('btnEvolPrev').disabled = evolucaoIdx === 0;
  document.getElementById('btnEvolNext').disabled = evolucaoIdx+qtdCols >= evolucaoMeses.length;
}
function abrirDetalheHorizonteGestor(forma, mes, v, cartao) {
  const titulo = forma + ' · ' + mes;
  const texto = 'Registrado: ' + formatBRL(v.registrado || 0) + '\nPago: ' + formatBRL(v.pago || 0) + '\nSaldo dos registros: ' + formatBRL(v.saldo || 0) + '\nFixo previsto: ' + formatBRL(v.previsto || 0) + '\n\nO previsto é uma estimativa, não um lançamento nem um pagamento. A conferência mostra somente os registros existentes. Nenhum mês adicional foi criado.';
  mostrarConfirmacao(titulo,texto,()=>cartao&&v.registrado>0?abrirConferenciaFaturaGestor(forma,mes):irParaFaturaMensal(mes),false,'Conferir registros','neutral');
}
function mudarMesEvolucao(step) {
  const qtd=window.innerWidth<640&&!compararHorizonteCompleto?2:4;
  evolucaoIdx=Math.max(0,Math.min(evolucaoIdx+step,Math.max(0,evolucaoMeses.length-qtd)));
  renderTabelaEvolucao();
}

function dataSimuladorGestor() {
  const v=document.getElementById('simData').value;
  const p=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if(!p)throw Error('Informe a data prevista da compra.');
  const dt=new Date(Number(p[1]),Number(p[2])-1,Number(p[3]));
  if(Number(p[1])<1900||dt.getDate()!==Number(p[3])||dt.getMonth()+1!==Number(p[2]))throw Error('Confira a data prevista da compra.');
  return p[3]+'/'+p[2]+'/'+p[1];
}
function lerSimulacaoGestor(exigirCartao=false) {
  const valor=lerValorMoeda('simValor'),n=Number(document.getElementById('simParcelas').value),centavos=centavosInterfaceGestor(valor);
  if(!centavos)throw Error('Informe o valor da compra para simular.');
  if(!Number.isInteger(n)||n<1||n>600)throw Error('Informe uma quantidade inteira entre 1 e 600 parcelas.');
  if(centavos<n)throw Error('Cada parcela deve ter pelo menos um centavo.');
  const forma=document.getElementById('simCartao').value;
  if(exigirCartao&&(!forma||!formaEhCartaoGestor(forma)))throw Error('Escolha o cartão no comparativo antes de transferir a simulação.');
  const parcelas=Array.from({length:n},(_,i)=>(Math.floor(centavos/n)+(i<centavos%n?1:0))/100);
  const avista=lerValorMoeda('simAVista');
  return {valor:centavos/100,n,forma,parcelas,data:dataSimuladorGestor(),avista};
}
function resumoParcelasSimuladorGestor(s) {
  const contagens=new Map();s.parcelas.forEach(v=>contagens.set(v,(contagens.get(v)||0)+1));
  return [...contagens].map(([v,q])=>q+'x de '+formatBRL(v)).join(' + ');
}
function alternarProjecaoSimuladorGestor(){simuladorExpandidoGestor=!simuladorExpandidoGestor;rodarSimuladorCompra();}
function rodarSimuladorCompra() {
  const box=document.getElementById('boxResultadoSimulador');if(!box)return;
  let s;try{s=lerSimulacaoGestor();}catch(e){box.textContent=e.message;return;}
  const cartoes=formasGlobais.filter(f=>formaEhCartaoGestor(f)&&!f.arquivado);
  let html=`<div class="rounded-xl p-3 bg-slate-950"><p class="text-xs text-slate-300">Plano simulado · ${escaparHTML(s.data)}</p><strong class="block text-sky-300 text-lg">${escaparHTML(resumoParcelasSimuladorGestor(s))}</strong><p class="text-sm text-white">Total: ${formatBRL(s.valor)}</p></div>`;
  if(s.avista>0){const dif=centavosInterfaceGestor(s.valor)-centavosInterfaceGestor(s.avista);html+=`<p class="text-xs text-slate-200">À vista: <strong>${formatBRL(s.avista)}</strong> · ${dif>=0?'Economia à vista':'Diferença a favor do parcelado'}: <strong class="text-emerald-300">${formatBRL(Math.abs(dif)/100)}</strong>. Juros já devem estar incluídos no total informado.</p>`;}
  const ultima=lerJSONLocalGestor('gestorUltimaAtualizacaoV1',null);
  html+=`<p class="text-[11px] text-slate-300">Base: ${ultima?escaparHTML(new Date(ultima).toLocaleString('pt-BR')):'dados carregados no aparelho'}. ${navigator.onLine?'':'Offline: os saldos podem estar desatualizados.'}</p>`;
  html+='<div class="space-y-2"><p class="text-xs text-slate-300">Escolha o cartão · limite após a compra completa</p>';
  cartoes.forEach(c=>{const calc=calcularMesFaturaCartao(c,s.data),disp=Number(c.disponivelRaw||0)-s.valor;html+=`<button type="button" ${acaoHTML('selecionarCartaoSimulador',[c.nome])} aria-pressed="${s.forma===c.nome}" class="w-full rounded-xl border p-3 text-left ${s.forma===c.nome?'border-sky-400 bg-sky-950':'border-slate-600 bg-slate-900'}"><span class="flex justify-between gap-2"><strong class="text-white">${escaparHTML(c.nome)}</strong><strong class="${disp<0?'text-rose-300':'text-emerald-300'}">${formatBRL(disp)}</strong></span><span class="block text-xs text-slate-300 mt-1">Primeira fatura: ${escaparHTML(calc.mesFat)}</span></button>`;});
  html+='</div><p class="text-[10px] text-slate-300">O limite é o saldo atual menos esta compra. A simulação não presume outros pagamentos ou compras até a data escolhida.</p>';
  if(!cartoes.length)html+='<p class="text-xs text-slate-300">Cadastre um cartão para comparar o limite e as faturas.</p>';
  const c=buscarFormaPagamentoGestor(s.forma);
  if(c&&formaEhCartaoGestor(c)){
    const mes=calcularMesFaturaCartao(c,s.data).mesFat,[m,a]=mes.split('/').map(Number),q=simuladorExpandidoGestor?s.n:Math.min(6,s.n);
    html+='<section class="space-y-2"><h3 class="text-xs font-bold text-white">Saldo projetado a pagar · inclui terceiros e fixos previstos</h3>';
    if(!horizonteDetalhadoGestor)html+='<p class="text-xs text-amber-200">Atualize o Apps Script e os dados antes de conferir a projeção completa.</p>';
    for(let i=0;i<q;i++){
      const dt=new Date(a,m-1+i,1),ref=String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();
      const h=horizonteDetalhadoGestor;
      let previsto=h?valorMapaHorizonteGestor(h.previstoPessoal,c.nome,ref):0;
      // Só projeta fixos em meses que já existem por registros; não cria novos períodos.
      const base=h?valorMapaHorizonteGestor(h.saldoBanco,c.nome,ref)+previsto:Number(evolucaoPivot[c.nome]?.[ref]||0);
      html+=`<div class="flex justify-between gap-2 text-xs border-b border-slate-700 py-2"><span class="text-slate-300">${ref} · ${i+1}/${s.n}${previsto?' · previsto':''}</span><span class="text-slate-300">${formatBRL(base)} → <strong class="text-sky-300">${formatBRL((centavosInterfaceGestor(base)+centavosInterfaceGestor(s.parcelas[i]))/100)}</strong></span></div>`;
    }
    if(s.n>6)html+=`<button type="button" ${acaoHTML('alternarProjecaoSimuladorGestor',[])} class="text-xs text-sky-300 underline py-2">${simuladorExpandidoGestor?'Recolher parcelas':'Ver todas as '+s.n+' parcelas (mostrando 6)'}</button>`;
    html+='</section>';
  }
  box.innerHTML=html;
}
function copiarSimulacaoWhats() {
  try{const s=lerSimulacaoGestor();let txt='Simulação de compra\nData: '+s.data+'\nTotal: '+formatBRL(s.valor)+'\nParcelas: '+resumoParcelasSimuladorGestor(s);if(s.forma)txt+='\nCartão: '+s.forma+'\nPrimeira fatura: '+calcularMesFaturaCartao(buscarFormaPagamentoGestor(s.forma),s.data).mesFat;if(s.avista>0)txt+='\nPreço à vista: '+formatBRL(s.avista);copiarTextoAreaTransferencia(txt,'Simulação copiada!');}catch(e){mostrarAviso('Confira a simulação',e.message);}
}
function transferirSimulacaoGestor(emp) {
  let s;try{s=lerSimulacaoGestor(true);}catch(e){mostrarAviso('Confira a simulação',e.message);return;}
  const bloqueado=()=>emp?(salvandoEmprestimoTrava||emprestimoPendenteGestor()):(salvandoGastoTrava||sessionStorage.getItem('lancamentoResultadoIncerto')==='true');
  if(bloqueado()){mostrarAviso('Há um envio em conferência','Conclua a conferência antes de substituir os campos.');return;}
  const id=emp?'formEmprestimo':'formLancamento',form=document.getElementById(id);
  const assinatura=()=>JSON.stringify(Array.from(form.elements).map(e=>[e.id,e.value,e.checked]));
  const antes=assinatura();
  function aplicar(){
    if(bloqueado()||assinatura()!==antes){mostrarAviso('O formulário mudou','Os campos foram preservados. Confira e transfira a simulação novamente.');return;}
    if(emp){limparFormularioEmprestimo();preencherDataTripla('emp',s.data);document.getElementById('selEmpForma').value=s.forma;document.getElementById('inpEmpParc').value=s.n;document.getElementById('inpEmpParcIni').value='1';definirValorMoeda('inpEmpValor',s.valor);atualizarFaturaEmprestimo();atualizarPreviewParcEmp();salvarRascunhoEmp();abrirFerramenta('emprestimos');document.getElementById('inpEmpPessoa').focus();}
    else{limparFormularioNovoGasto();preencherDataTripla('novo',s.data);document.getElementById('selForma').value=s.forma;document.getElementById('inpParc').value=s.n;document.getElementById('inpParcIni').value='1';definirValorMoeda('inpValor',s.valor);atualizarRegrasForma();salvarRascunho();setAba('novo');document.getElementById('inpDesc').focus();}
    mostrarAviso('Simulação preenchida','Confira os campos e complete os dados antes de salvar. Nenhum lançamento foi gravado.');
  }
  if(haRascunhoFormularioGestor(emp))mostrarConfirmacao('Substituir o rascunho?', 'Já existem dados no formulário. Deseja substituí-los pelos valores desta simulação? Pessoa, descrição e parcela inicial antigas serão limpas.',aplicar,false,'Substituir rascunho','neutral');else aplicar();
}
function haRascunhoFormularioGestor(emp) {
  const hoje=new Date(),dia=String(hoje.getDate()).padStart(2,'0'),mes=String(hoje.getMonth()+1).padStart(2,'0'),ano=String(hoje.getFullYear());
  const defaults=emp?{inpEmpDataDia:dia,inpEmpDataMes:mes,inpEmpDataAno:ano,inpEmpData:dia+'/'+mes+'/'+ano,inpEmpMesFat:'',inpEmpPessoa:'',inpEmpDesc:'',selEmpForma:'',inpEmpParc:'1',inpEmpParcIni:'1',inpEmpObs:'',chkPixRecebimento:false}:{inpDataDia:dia,inpDataMes:mes,inpDataAno:ano,inpData:dia+'/'+mes+'/'+ano,inpMesFat:'',inpDesc:'',selForma:'',selCat:'',inpParc:'1',inpParcIni:'1',inpTags:'',checkAssinatura:false,chkPixParcelado:false};
  if(lerValorMoeda(emp?'inpEmpValor':'inpValor')>0)return true;
  return Object.entries(defaults).some(([id,padrao])=>{const e=document.getElementById(id);if(!e)return false;return typeof padrao==='boolean'?Boolean(e.checked)!==padrao:String(e.value||'').trim()!==padrao;});
}
function transformarSimulacaoEmEmprestimo(){transferirSimulacaoGestor(true);}
function transformarSimulacaoEmLancamento(){transferirSimulacaoGestor(false);}

function numeroExpressaoCalcGestor(n){const s=String(n);if(!/[eE]/.test(s))return s;const [mant,e]=s.toLowerCase().split('e'),neg=mant.startsWith('-'),limpo=mant.replace('-',''),partes=limpo.split('.'),digits=partes.join(''),pos=partes[0].length+Number(e);return (neg?'-':'')+(pos<=0?'0.'+'0'.repeat(-pos)+digits:pos>=digits.length?digits+'0'.repeat(pos-digits.length):digits.slice(0,pos)+'.'+digits.slice(pos));}
function calcDigito(d){if(calcAposIgualGestor){calcExprStr='';calcAposIgualGestor=false;}if(d==='.'&&(!calcExprStr||/[+\-*/(]$/.test(calcExprStr)))calcExprStr+='0';calcExprStr+=d;atualizarVisorCalc();}
function calcAcao(op){
  if(op==='C'){calcExprStr='';calcAposIgualGestor=false;document.getElementById('calcExpressao').textContent='';document.getElementById('calcVisor').textContent='0';return;}
  if(op==='BACK'){if(calcAposIgualGestor)calcExprStr='';else calcExprStr=calcExprStr.slice(0,-1);calcAposIgualGestor=false;atualizarVisorCalc();return;}
  if(op==='='){
    if(calcAposIgualGestor)return;
    const res=avaliarExpressaoCalc(calcExprStr);if(res===null){mostrarAviso('Confira a conta','A expressão está incompleta ou contém uma divisão inválida.');return;}
    if(!calcExprStr)return;
    const item={expressao:calcExprStr,resultado:res,data:Date.now()};historicoCalcGestor=[item,...historicoCalcGestor].slice(0,20);salvarCacheLeituraGestor('gestorCalculadoraHistoricoV1',JSON.stringify(historicoCalcGestor));renderizarHistoricoCalcGestor();
    document.getElementById('calcHistoricoMini').textContent='';document.getElementById('calcExpressao').textContent=calcExprStr+' =';calcExprStr=numeroExpressaoCalcGestor(res);calcAposIgualGestor=true;document.getElementById('calcVisor').textContent=formatBRL(res);return;
  }
  calcAposIgualGestor=false;calcExprStr+=op;atualizarVisorCalc();
}
function atualizarVisorCalc(){document.getElementById('calcExpressao').textContent=calcExprStr.replace(/\*/g,'×').replace(/\//g,'÷');const n=avaliarExpressaoCalc(calcExprStr);document.getElementById('calcVisor').textContent=n===null?'…':n.toLocaleString('pt-BR',{maximumFractionDigits:2});}
function aplicarPercentualCalcGestor(acrescimo){const n=avaliarExpressaoCalc(calcExprStr),p=Number(document.getElementById('calcPercentual').value);if(n===null||!calcExprStr||!Number.isFinite(p)||p<0||p>100||!document.getElementById('calcPercentual').value){mostrarAviso('Confira o percentual','Calcule um valor e informe um percentual entre 0 e 100.');return;}calcExprStr='('+numeroExpressaoCalcGestor(n)+')*(1'+(acrescimo?'+':'-')+numeroExpressaoCalcGestor(p)+'/100)';calcAposIgualGestor=false;calcAcao('=');}
function usarResultadoCalculadoraNoGasto(){const val=avaliarExpressaoCalc(calcExprStr);if(!val||val<=0||!Number.isSafeInteger(Math.round(val*100))){mostrarAviso('Confira o resultado','Calcule um valor monetário positivo primeiro.');return;}if(salvandoGastoTrava||sessionStorage.getItem('lancamentoResultadoIncerto')==='true'){mostrarAviso('Há um envio em conferência','Confira o envio antes de substituir o valor.');return;}const antigo=document.getElementById('inpValor').value;function aplicar(){if(salvandoGastoTrava||sessionStorage.getItem('lancamentoResultadoIncerto')==='true'||document.getElementById('inpValor').value!==antigo){mostrarAviso('O formulário mudou','Confira o valor atual antes de aplicar novamente.');return;}definirValorMoeda('inpValor',val);atualizarPreviewParcelas();salvarRascunho();setAba('novo');}if(lerValorMoeda('inpValor')>0)mostrarConfirmacao('Substituir o valor?', 'Usar '+formatBRL(val)+' no lançamento que está preenchido?',aplicar,false,'Usar resultado','neutral');else aplicar();}
function reutilizarCalcGestor(i,expressao){const item=historicoCalcGestor[i];if(!item)return;calcExprStr=expressao?item.expressao:numeroExpressaoCalcGestor(item.resultado);calcAposIgualGestor=!expressao;atualizarVisorCalc();}
function copiarCalcGestor(i){const n=historicoCalcGestor[i];if(n)copiarTextoAreaTransferencia(n.expressao+' = '+n.resultado.toLocaleString('pt-BR',{maximumFractionDigits:15}),'Conta copiada!');}
function limparHistoricoCalcGestor(){mostrarConfirmacao('Limpar histórico da calculadora?','As contas recentes deste aparelho serão removidas. Seus lançamentos permanecem guardados.',()=>{historicoCalcGestor=[];salvarCacheLeituraGestor('gestorCalculadoraHistoricoV1','[]');renderizarHistoricoCalcGestor();},false,'Limpar histórico','neutral');}
function renderizarHistoricoCalcGestor(){const box=document.getElementById('calcListaHistorico');if(!box)return;box.innerHTML=historicoCalcGestor.map((h,i)=>`<div class="rounded-xl bg-slate-900 p-3 text-xs space-y-2"><p class="text-slate-300 break-all">${escaparHTML(h.expressao)}</p><strong class="block text-emerald-300">${escaparHTML(h.resultado.toLocaleString('pt-BR',{maximumFractionDigits:15}))}</strong><div class="flex flex-wrap gap-2"><button type="button" ${acaoHTML('reutilizarCalcGestor',[i,false])} class="text-sky-300 py-1">Usar resultado</button><button type="button" ${acaoHTML('reutilizarCalcGestor',[i,true])} class="text-slate-200 py-1">Reabrir conta</button><button type="button" ${acaoHTML('copiarCalcGestor',[i])} class="text-slate-200 py-1">Copiar</button></div></div>`).join('')||'<p class="text-xs text-slate-300">Nenhuma conta recente neste aparelho.</p>';}

function garantirChaveRascunhoNotaGestor() {
  if(notaRascunhoChaveGestor)return notaRascunhoChaveGestor;
  let anterior;try{anterior=sessionStorage.getItem('gestorNotaAbaV2');}catch(e){}
  if(anterior&&/^[A-Za-z0-9_.:-]{8,160}$/.test(anterior))notaRascunhoAnteriorGestor=NOTA_RASCUNHO_PREFIXO_GESTOR+anterior;
  // Duplicar uma aba copia sessionStorage. Cada página ganha uma chave nova para não sobrescrever a outra.
  const id=novoRequestIdGestor();
  gravarArmazenamentoGestor('gestorNotaAbaV2',id,{sessao:true,opcional:true});
  notaRascunhoChaveGestor=NOTA_RASCUNHO_PREFIXO_GESTOR+id;return notaRascunhoChaveGestor;
}
function normalizarRascunhoNotaGestor(r) {
  if(!r||typeof r!=='object'||typeof r.texto!=='string')return null;
  let edicao=null;
  if(r.edicao){const n=r.edicao;if(typeof n.id!=='string'||!n.id||typeof n.texto!=='string'||!Number.isSafeInteger(Number(n.revision))||Number(n.revision)<0)return null;edicao={id:n.id,revision:Number(n.revision),texto:n.texto,baseRestauracao:typeof n.baseRestauracao==='string'?n.baseRestauracao:''};}
  return {versao:2,texto:r.texto,edicao,atualizadoEm:Number.isFinite(r.atualizadoEm)?r.atualizadoEm:0};
}
function persistirRascunhoNotaGestor() {
  const inp=document.getElementById('inpNovaNotaTexto'),chave=garantirChaveRascunhoNotaGestor();
  const r={versao:2,texto:inp.value,edicao:notaEmEdicaoGestor,atualizadoEm:Date.now()};
  try{
    if(!r.texto&&!r.edicao){localStorage.removeItem(chave);sessionStorage.removeItem('gestorNotaTextoRascunhoV1');}
    else{gravarArmazenamentoGestor(chave,JSON.stringify(r));try{sessionStorage.removeItem('gestorNotaTextoRascunhoV1');}catch(e){}}
    return true;
  }catch(e){guardarRascunhoGestor('gestorNotaTextoRascunhoV1',JSON.stringify(r));mostrarAviso('Rascunho somente nesta sessão','Não foi possível guardar uma cópia durável. Mantenha a aba aberta ou copie o texto antes de fechar.');return false;}
}
function guardarTextoNotaGestor(){revisaoTextoNotaGestor++;persistirRascunhoNotaGestor();}
function aplicarRascunhoNotaGestor(r){notaEmEdicaoGestor=r.edicao;document.getElementById('inpNovaNotaTexto').value=r.texto;document.getElementById('btnAdicionarNotaGestor').textContent=r.edicao?'Salvar alterações':'Adicionar lembrete';document.getElementById('cancelarEdicaoNotaGestor').hidden=!r.edicao;}
function restaurarRascunhoNotaGestor(){
  garantirChaveRascunhoNotaGestor();let salvo=normalizarRascunhoNotaGestor(lerJSONLocalGestor(notaRascunhoAnteriorGestor,null));
  if(!salvo)try{salvo=normalizarRascunhoNotaGestor(JSON.parse(sessionStorage.getItem('gestorNotaTextoRascunhoV1')||'null'));}catch(e){}
  if(salvo){aplicarRascunhoNotaGestor(salvo);if(persistirRascunhoNotaGestor()&&notaRascunhoAnteriorGestor)rascunhosNotasRecuperadosGestor.set(notaRascunhoAnteriorGestor,JSON.stringify(salvo));}
  renderizarRascunhosNotasGestor();
}
function listarRascunhosNotasGestor(){
  const assinatura=r=>JSON.stringify([r.texto,r.edicao]),vistos=new Set();
  const proprio=normalizarRascunhoNotaGestor(lerJSONLocalGestor(garantirChaveRascunhoNotaGestor(),null));if(proprio)vistos.add(assinatura(proprio));
  return lerEntradasLocaisGestor(NOTA_RASCUNHO_PREFIXO_GESTOR).filter(e=>e.chave!==notaRascunhoChaveGestor).map(e=>({chave:e.chave,valor:normalizarRascunhoNotaGestor(e.valor)})).filter(e=>e.valor&&e.valor.texto.trim()&&rascunhosNotasRecuperadosGestor.get(e.chave)!==JSON.stringify(e.valor)).sort((a,b)=>b.valor.atualizadoEm-a.valor.atualizadoEm).filter(e=>{const k=assinatura(e.valor);if(vistos.has(k))return false;vistos.add(k);return true;});
}
function recuperarRascunhoNotaGestor(chave, descartar=false){
  if(!String(chave).startsWith(NOTA_RASCUNHO_PREFIXO_GESTOR)||chave===garantirChaveRascunhoNotaGestor())return;
  const r=normalizarRascunhoNotaGestor(lerJSONLocalGestor(chave,null));if(!r)return;
  const original=JSON.stringify(r),rev=revisaoTextoNotaGestor;
  const aplicar=()=>{
    if(JSON.stringify(normalizarRascunhoNotaGestor(lerJSONLocalGestor(chave,null)))!==original){mostrarAviso('O rascunho mudou','Confira a cópia mais recente antes de continuar.');renderizarRascunhosNotasGestor();return;}
    if(descartar){localStorage.removeItem(chave);renderizarRascunhosNotasGestor();return;}
    if(rev!==revisaoTextoNotaGestor){mostrarAviso('O texto atual mudou','Ele foi preservado. Recupere a cópia novamente.');return;}
    aplicarRascunhoNotaGestor(r);revisaoTextoNotaGestor++;
    if(persistirRascunhoNotaGestor())rascunhosNotasRecuperadosGestor.set(chave,original);
    renderizarRascunhosNotasGestor();document.getElementById('inpNovaNotaTexto').focus();
  };
  if(descartar||document.getElementById('inpNovaNotaTexto').value.trim())mostrarConfirmacao(descartar?'Descartar esta cópia?':'Recuperar outro rascunho?',descartar?'Apenas esta cópia local será removida; notas adicionadas permanecem na planilha.':'O texto atual será substituído pela cópia escolhida. A cópia original continua guardada.',aplicar,false,descartar?'Descartar cópia':'Recuperar cópia','neutral');else aplicar();
}
function renderizarRascunhosNotasGestor(){
  const lista=document.getElementById('listaNotasUI');if(!lista)return;
  let painel=document.getElementById('rascunhosNotasGestor');if(!painel){painel=document.createElement('details');painel.id='rascunhosNotasGestor';painel.className='rounded-xl border border-slate-600 p-3 text-xs text-slate-200';lista.before(painel);}
  const copias=listarRascunhosNotasGestor();painel.hidden=!copias.length;painel.replaceChildren();if(!copias.length)return;
  const titulo=document.createElement('summary');titulo.textContent=copias.length+' rascunho(s) guardado(s) neste aparelho';titulo.className='cursor-pointer py-1 font-bold';painel.append(titulo);
  copias.forEach(c=>{const linha=document.createElement('div');linha.className='border-t border-slate-700 pt-2 mt-2';const texto=document.createElement('p');texto.textContent=c.valor.texto.slice(0,100)+(c.valor.texto.length>100?'…':'');texto.className='break-words whitespace-pre-line';linha.append(texto);[['Recuperar',false],['Descartar',true]].forEach(([rotulo,remover])=>{const btn=document.createElement('button');btn.type='button';btn.textContent=rotulo;btn.className='text-sky-300 py-2 mr-3';btn.onclick=()=>recuperarRascunhoNotaGestor(c.chave,remover);linha.append(btn);});painel.append(linha);});
}
function configurarEdicaoNotaGestor(nota){notaEmEdicaoGestor=nota?{id:nota.id,revision:Number(nota.revision||0),texto:nota.texto,baseRestauracao:localStorage.getItem('gestorEpocaRestauracaoV1')||''}:null;document.getElementById('inpNovaNotaTexto').value=nota?.texto||'';document.getElementById('btnAdicionarNotaGestor').textContent=nota?'Salvar alterações':'Adicionar lembrete';document.getElementById('cancelarEdicaoNotaGestor').hidden=!nota;guardarTextoNotaGestor();document.getElementById('inpNovaNotaTexto').focus();}
function reconciliarEdicaoNotaConfirmadaGestor(envio,resultado){
  const base=notaEmEdicaoGestor;if(!base)return;
  if((base.baseRestauracao||'')!==(localStorage.getItem('gestorEpocaRestauracaoV1')||'')||(envio.baseRestauracao||'')!==(base.baseRestauracao||''))return;
  const enviada=(envio.operacoes||[]).find(op=>String(op.id)===String(base.id)&&op.tipo==='upsert');
  const confirmada=(resultado.anotacoes||[]).find(n=>String(n.id)===String(base.id));
  if(!enviada||!confirmada||!enviada.nota||Number(enviada.revision||0)!==base.revision||enviada.nota.texto!==base.texto||confirmada.texto!==base.texto||!Number.isSafeInteger(confirmada.revision)||confirmada.revision<=base.revision)return;
  // Apenas uma resposta do envio original autoriza atualizar a referência do editor.
  notaEmEdicaoGestor={...base,revision:confirmada.revision};persistirRascunhoNotaGestor();
}
function editarNotaRapidaGestor(id){const n=notasGlobais.find(n=>String(n.id)===String(id));if(!n)return;const texto=document.getElementById('inpNovaNotaTexto').value,rev=revisaoTextoNotaGestor;const aplicar=()=>{if(rev!==revisaoTextoNotaGestor){mostrarAviso('O texto mudou','O rascunho foi preservado. Abra a edição novamente.');return;}configurarEdicaoNotaGestor(n);};if(texto.trim())mostrarConfirmacao('Abrir outra nota?','O texto ainda não adicionado será substituído. Deseja continuar?',aplicar,false,'Abrir nota','neutral');else aplicar();}
function cancelarEdicaoNotaGestor(){const rev=revisaoTextoNotaGestor;mostrarConfirmacao('Cancelar edição?','As alterações deste rascunho serão descartadas. A nota salva será preservada.',()=>{if(rev===revisaoTextoNotaGestor)configurarEdicaoNotaGestor(null);},false,'Descartar rascunho','neutral');}
function alternarFixacaoNotaGestor(id){const copia=notasFixadasGestor.includes(String(id))?notasFixadasGestor.filter(n=>n!==String(id)):[String(id),...notasFixadasGestor].slice(0,200);if(salvarCacheLeituraGestor('gestorNotasFixadasV1',JSON.stringify(copia))){notasFixadasGestor=copia;renderizarNotasUI();}}
function renderizarNotasUI(){
  const box=document.getElementById('listaNotasUI');if(!box)return;
  const termo=normalizarTexto(document.getElementById('buscaNotasGestor')?.value||''),filtro=document.getElementById('filtroNotasGestor')?.value||'todas';
  const itens=(notasGlobais||[]).filter(n=>(!termo||normalizarTexto(n.texto).includes(termo))&&(filtro==='todas'||(filtro==='concluidas')===Boolean(n.concluida))).slice().sort((a,b)=>Number(notasFixadasGestor.includes(String(b.id)))-Number(notasFixadasGestor.includes(String(a.id)))||Number(a.concluida)-Number(b.concluida));
  document.getElementById('contagemNotasGestor').textContent=itens.length+' de '+(notasGlobais||[]).length+' notas · fixação apenas neste aparelho';
  box.replaceChildren();
  if(!itens.length){const p=document.createElement('p');p.className='text-xs text-slate-300 py-4';p.textContent=termo||filtro!=='todas'?'Nenhuma nota corresponde aos filtros.':'Nenhuma anotação salva.';box.append(p);return;}
  itens.forEach(n=>{
    const card=document.createElement('div');card.className='rounded-xl border border-slate-600 bg-slate-900 p-3 space-y-2';
    const label=document.createElement('label');label.className='flex items-start gap-3 cursor-pointer';
    const check=document.createElement('input');check.type='checkbox';check.checked=Boolean(n.concluida);check.className='mt-1 shrink-0';check.addEventListener('change',()=>toggleNotaConcluida(n.id));
    const txt=document.createElement('span');txt.textContent=n.texto;txt.className='text-sm whitespace-pre-line break-words min-w-0 '+(n.concluida?'line-through text-slate-400':'text-white');label.append(check,txt);card.append(label);
    const meta=document.createElement('p');meta.textContent=n.data||'';meta.className='text-[10px] text-slate-300';card.append(meta);
    const actions=document.createElement('div');actions.className='flex flex-wrap justify-end gap-3';
    [[notasFixadasGestor.includes(String(n.id))?'Desafixar':'Fixar',()=>alternarFixacaoNotaGestor(n.id)],['Editar',()=>editarNotaRapidaGestor(n.id)],['Excluir',()=>excluirNotaRapida(n.id)]].forEach(([rotulo,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=rotulo;b.className='text-xs py-2 '+(rotulo==='Excluir'?'text-rose-300':'text-amber-200');b.onclick=fn;actions.append(b);});card.append(actions);box.append(card);
  });
}
function adicionarNotaRapida(){
  const inp=document.getElementById('inpNovaNotaTexto'),txt=inp.value.trim();if(!txt)return;
  inicializarNotasLocaisGestor();let nota;
  if(notaEmEdicaoGestor){const atual=notasGlobais.find(n=>String(n.id)===String(notaEmEdicaoGestor.id));if((notaEmEdicaoGestor.baseRestauracao||'')!==(localStorage.getItem('gestorEpocaRestauracaoV1')||'')||!atual||Number(atual.revision||0)!==notaEmEdicaoGestor.revision||atual.texto!==notaEmEdicaoGestor.texto){mostrarAviso('A nota mudou','Seu rascunho permanece no campo. Confira a versão atual antes de editar novamente.');return;}nota={...atual,texto:txt};}
  else nota={id:novoRequestIdGestor(),texto:txt,concluida:false,data:new Date().toLocaleDateString('pt-BR')};
  try{registrarOperacaoNotaGestor('upsert',nota);}catch(e){mostrarAviso('Não foi possível guardar a nota','Copie o texto antes de fechar o app. Ele permanece no campo.');return;}
  configurarEdicaoNotaGestor(null);recomporNotasLocaisGestor();sincronizarNotasNuvem();
}
function toggleNotaConcluida(id){inicializarNotasLocaisGestor();const item=notasGlobais.find(n=>String(n.id)===String(id));if(!item)return;try{registrarOperacaoNotaGestor('upsert',{...item,concluida:!item.concluida});recomporNotasLocaisGestor();sincronizarNotasNuvem();}catch(e){mostrarAviso('Nota não alterada','Não foi possível guardar a alteração neste aparelho.');renderizarNotasUI();}}
function excluirNotaRapida(id){
  const item=notasGlobais.find(n=>String(n.id)===String(id));if(!item)return;
  mostrarConfirmacao('Excluir esta nota?',item.texto+'\n\nA exclusão será sincronizada com seus outros aparelhos.',()=>{
    const atual=notasGlobais.find(n=>String(n.id)===String(id));if(!atual||atual.texto!==item.texto||atual.revision!==item.revision||atual.concluida!==item.concluida){mostrarAviso('A nota mudou','Confira a nota atual antes de excluir.');return;}
    try{registrarOperacaoNotaGestor('delete',id);recomporNotasLocaisGestor();sincronizarNotasNuvem();}catch(e){mostrarAviso('Nota não excluída','Não foi possível guardar a alteração neste aparelho.');}
  });
}

function mesSeguinteGestor(mes){const [m,a]=String(mes).split('/').map(Number),d=new Date(a,m,1);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function proximoMensalDisponivelGestor(res){
  if(!navigator.onLine||mensalConsultaPendenteGestor||!res?.periodoReferencia||res.integridade?.bloqueada||!Array.isArray(res.formas))return null;
  const idade=Date.now()-Number(res.recebidoEmGestor||0);
  if(idade<0||idade>60000||!Number.isFinite(idade)||res.geracaoConsultaGestor!==geracaoLeituraGestor)return null;
  const mes=res.periodoReferencia;
  // O saldo vem do relatório recém-consultado, nunca do resumo anterior do Painel.
  const cartoes=res.formas.filter(f=>f&&f.tipo==='cartao');
  if(!cartoes.length||cartoes.some(f=>!Number.isFinite(f.totalBanco)||!Number.isFinite(f.pagoBanco)||!Number.isFinite(f.abertoBanco)||f.totalBanco<0||f.pagoBanco<0||f.pagoBanco>f.totalBanco||Math.round(f.abertoBanco*100)!==Math.round((f.totalBanco-f.pagoBanco)*100)||Math.round(f.abertoBanco*100)!==0)||cartoes.reduce((s,f)=>s+f.totalBanco,0)<=0)return null;
  // Exige o fechamento de todos os cartões ativos, inclusive os sem gasto no mês.
  const ativos=formasGlobais.filter(f=>formaEhCartaoGestor(f)&&!f.arquivado);
  const dt=new Date(),hoje=String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();
  const chave=m=>Number(m.slice(3))*12+Number(m.slice(0,2));
  if(!ativos.length||ativos.some(f=>chave(calcularMesFaturaCartao(f,hoje).mesFat)<=chave(mes)))return null;
  const prox=mesSeguinteGestor(mes);return (arvoreMesesAno[prox.slice(3)]||[]).includes(prox)?prox:null;
}
function atualizarSugestaoMensalGestor(res){
  const box=document.getElementById('sugestaoProximoMesGestor'),prox=proximoMensalDisponivelGestor(res);box.replaceChildren();box.hidden=!prox;
  const auto=document.getElementById('seguirProximoMesGestor');
  if(prox){const texto=document.createElement('p');texto.textContent='Faturas dos cartões quitadas e período fechado para novas compras regulares. Pix e valores a receber continuam disponíveis neste mês.';texto.className='text-xs text-slate-200';const b=document.createElement('button');b.type='button';b.className='text-sky-300 text-xs font-bold py-2';b.textContent='Ver '+prox;b.onclick=()=>irParaFaturaMensal(prox);box.append(texto,b);}
  // Só avança ao entrar novamente no Mensal. Recargas e pagamentos nunca trocam o período.
  if(mensalEntradaPendenteGestor&&!mensalConsultaPendenteGestor){mensalEntradaPendenteGestor=false;if(prox&&auto.checked&&!mensalNavegacaoManualGestor)requestAnimationFrame(()=>{if(abaAtivaAtual==='relatorio'&&ultimoRelatorioMensalCache===res&&!mensalNavegacaoManualGestor&&proximoMensalDisponivelGestor(res)===prox)irParaFaturaMensal(prox,true);});}
}
function aoEntrarMensalGestor(){mensalEntradaPendenteGestor=!mensalNavegacaoManualGestor;document.getElementById('sugestaoProximoMesGestor').hidden=true;if(document.getElementById('seguirProximoMesGestor').checked&&!mensalNavegacaoManualGestor){relatorioMensalPendente=true;mensalConsultaPendenteGestor=true;}}
function marcarEscolhaMensalGestor(){mensalEntradaPendenteGestor=false;mensalNavegacaoManualGestor=true;}
function inicializarUsabilidadeGestor(){
  const partes=[
    ()=>{modoHorizonteGestor=localStorage.getItem('gestorHorizonteModoV1')==='saldo'?'saldo':'total';},
    ()=>{const hoje=new Date();document.getElementById('simData').value=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0');},
    ()=>{const hist=lerJSONLocalGestor('gestorCalculadoraHistoricoV1',[]);historicoCalcGestor=Array.isArray(hist)?hist.filter(h=>h&&typeof h==='object'&&typeof h.expressao==='string'&&h.expressao.length<=256&&Number.isFinite(h.resultado)).slice(0,20):[];renderizarHistoricoCalcGestor();},
    ()=>{const pins=lerJSONLocalGestor('gestorNotasFixadasV1',[]);notasFixadasGestor=Array.isArray(pins)?pins.filter(p=>typeof p==='string').slice(0,200):[];},
    ()=>document.getElementById('inpNovaNotaTexto').addEventListener('input',guardarTextoNotaGestor),
    restaurarRascunhoNotaGestor,
    ()=>{const pref=document.getElementById('seguirProximoMesGestor');pref.checked=lerJSONLocalGestor('gestorSeguirMesV1',false)===true;pref.addEventListener('change',()=>{mensalNavegacaoManualGestor=false;salvarCacheLeituraGestor('gestorSeguirMesV1',JSON.stringify(pref.checked));});},
    ()=>['selFiltroRelAno','selFiltroRelMes'].forEach(id=>document.getElementById(id).addEventListener('change',marcarEscolhaMensalGestor))
  ];
  partes.forEach(iniciar=>{try{iniciar();}catch(e){console.warn('Uma preferência local não pôde ser recuperada:',e.message);}});
}
document.addEventListener('DOMContentLoaded',inicializarUsabilidadeGestor);

    function avaliarExpressaoCalc(expr) {
      try {
        if (!expr) return 0;
        const texto = String(expr).replace(/,/g, '.').replace(/\s/g, '');
        if (texto.length > 256 || /[^0-9+\-*/.%()]/.test(texto)) return null;
        let pos = 0, profundidade = 0;
        function fator() {
          if (++profundidade > 32) throw new Error('Expressão extensa');
          let n;
          if (texto[pos] === '+' || texto[pos] === '-') { const sinal = texto[pos++]; n = fator() * (sinal === '-' ? -1 : 1); }
          else if (texto[pos] === '(') { pos++; n = soma(); if (texto[pos++] !== ')') throw new Error('Parêntese incompleto'); }
          else { const numero = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(texto.slice(pos)); if (!numero) throw new Error('Número esperado'); pos += numero[0].length; n = Number(numero[0]); }
          if (texto[pos] === '%') { pos++; n /= 100; }
          profundidade--; return n;
        }
        function produto() { let n = fator(); while (texto[pos] === '*' || texto[pos] === '/') { const op = texto[pos++], b = fator(); n = op === '*' ? n * b : n / b; } return n; }
        function soma() { let n = produto(); while (texto[pos] === '+' || texto[pos] === '-') { const op = texto[pos++], b = produto(); n = op === '+' ? n + b : n - b; } return n; }
        const valor = soma();
        return pos === texto.length && Number.isFinite(valor) ? valor : null;
      } catch (e) { return null; }
    }

