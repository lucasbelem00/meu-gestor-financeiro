// Lembretes e limite pessoal usam a carga existente: nenhuma consulta adicional.
let dadosRotinaPainelGestor=null;
let limitePessoalEmEdicaoGestor=false;
function abrirDevolucaoPainelGestor(item){
  abrirResumoEmprestimos();
  for(const [id,valor] of [['selFiltroMesEmp',item.mesFatura],['selFiltroPessoaEmp',item.pessoa],['selFiltroStatusEmp',item.status==='Recebido'?'Recebido':'A Receber'],['selFiltroFormaEmp',''],['inpBuscaEmp','']]){const campo=document.getElementById(id);if(campo)campo.value=valor||'';}
  renderizarPainelEmprestimos();
}
function listarDevolucoesPainelGestor(itens,hoje=new Date()){
 const atual=hojeSituacaoVisualGestor(hoje);
 return (itens||[]).filter(i=>i.status==='A Receber'&&!i.arquivado).map(i=>{const situacao=situacaoRecebimentoVisualGestor(i,hoje),dia=diaSituacaoVisualGestor(i.dataCombinada)??(situacao.codigo==='mesEncerrado'?fimMesSituacaoVisualGestor(i.mesFatura):null);return {...i,situacao,dias:dia===null?null:dia-atual};}).filter(i=>i.dias!==null&&i.dias<=7).sort((a,b)=>a.dias-b.dias||String(a.pessoa).localeCompare(String(b.pessoa),'pt-BR'));
}
function normalizarConfigLimitePessoalGestor(config){
  return {centavos:Number.isSafeInteger(config?.centavos)&&config.centavos>0?config.centavos:0,incluirPrevistos:config?.incluirPrevistos===true};
}
function calcularLimitePessoalPainelGestor(dados,config){
  config=normalizarConfigLimitePessoalGestor(config);
  const mes=dados?.faturas?.mesAtual,h=dados?.faturas?.horizonte;
  const somar=mapa=>Object.values(mapa||{}).reduce((s,v)=>s+Math.round(Number(v[mes]||0)*100),0);
  const registrado=h?somar(h.totalPessoal):Math.round(lerValorMoeda(dados?.kpis?.comprometimentoMes||0)*100);
  const previsto=config.incluirPrevistos?somar(h?.previstoPessoal):0;
  const limite=Number(config.centavos)||0,total=registrado+previsto;
  return {mes,registrado,previsto,total,limite,margem:limite-total,percentual:limite>0?Math.round(total*100/limite):0};
}
function sinalizarEdicaoLimitePainelGestor(){
  limitePessoalEmEdicaoGestor=true;
  const aviso=document.getElementById('avisoEdicaoLimitePessoalGestor');if(aviso)aviso.hidden=false;
}
function renderizarResultadoLimitePessoalGestor(resumo,r,config){
  const criar=(tag,texto,classe)=>{const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;};
  resumo.replaceChildren();resumo.className='mt-4 space-y-3';
  const aviso=criar('p','Você está editando. O resultado abaixo usa o limite guardado; clique em Guardar limite para atualizar.','text-xs text-amber-200');aviso.id='avisoEdicaoLimitePessoalGestor';aviso.hidden=!limitePessoalEmEdicaoGestor;resumo.append(aviso);
  if(r.limite<=0){resumo.append(criar('p','Sem limite definido. Abra “Definir ou editar limite” para acompanhar seu teto mensal.','text-sm text-slate-300'));return;}
  const acima=r.margem<0,atingido=r.margem===0,cor=acima?'text-rose-300':atingido?'text-amber-300':'text-sky-300';
  const principal=criar('section','','rounded-2xl border p-4 space-y-2 '+(acima?'border-rose-500/40 bg-rose-500/10':atingido?'border-amber-500/40 bg-amber-500/10':'border-sky-500/40 bg-sky-500/10'));
  principal.append(criar('h4',acima?'Acima do limite':atingido?'Limite atingido':'Restam no limite','text-sm font-bold '+cor),criar('p',formatBRL(Math.abs(r.margem)/100),'text-2xl font-bold '+cor));
  principal.append(criar('p',r.percentual+'% do limite utilizado'+(config.incluirPrevistos?' • inclui as previsões selecionadas.':'.'),'text-sm text-slate-200'));
  resumo.append(principal);
  const barra=criar('div','','h-2.5 rounded-full bg-slate-800 overflow-hidden'),preenchido=criar('div','','h-full rounded-full '+(acima?'bg-rose-400':r.percentual>=80?'bg-amber-400':'bg-sky-400'));
  preenchido.style.width=Math.max(0,Math.min(100,r.percentual))+'%';barra.append(preenchido);barra.setAttribute('role','progressbar');barra.setAttribute('aria-label','Uso do limite pessoal mensal');barra.setAttribute('aria-valuemin','0');barra.setAttribute('aria-valuemax','100');barra.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,r.percentual))));barra.setAttribute('aria-valuetext',r.percentual+'% utilizado'+(acima?', acima do limite':''));resumo.append(barra);
  const grade=criar('div','','grid grid-cols-2 gap-3');
  for(const [titulo,valor]of [['Limite definido',r.limite],['Gastos registrados',r.registrado]]){const c=criar('div','','min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3 space-y-1');c.append(criar('p',titulo,'text-xs text-slate-300'),criar('p',formatBRL(valor/100),'font-bold text-white break-words'));grade.append(c);}resumo.append(grade);
  if(config.incluirPrevistos){const detalhe=criar('div','','rounded-xl border border-slate-700 bg-slate-900 p-3 space-y-2');detalhe.append(criar('p','Fixos previstos incluídos','text-xs text-slate-300'),criar('p',formatBRL(r.previsto/100),'font-bold text-violet-300'),criar('p','Total considerado: '+formatBRL(r.total/100),'text-sm text-slate-200'));resumo.append(detalhe);}
  resumo.append(criar('p','Gastos já pagos continuam contando. O valor restante é uma margem do seu limite, não saldo bancário.','text-xs text-slate-300'));
}
function renderizarRotinaPainelGestor(){
  const dados=dadosRotinaPainelGestor;if(!dados){const resumo=document.getElementById('resumoLimitePessoalGestor');if(resumo)resumo.textContent='Aguardando os gastos do mês. Você pode guardar seu limite agora; o resultado aparece quando a consulta estiver disponível.';return;}
  renderizarLimitePessoalPainelGestor(dados);
  if(typeof renderizarPerfilGastosPainelGestor==='function')renderizarPerfilGastosPainelGestor(dados);
  const acaoTerceiros=document.getElementById('resumoTerceirosPainelGestor');if(acaoTerceiros)acaoTerceiros.textContent='A receber de terceiros: '+(dados.emprestimos?.kpis?.totalAReceberGeral||'R$ 0,00')+' • todos os meses';
  const box=document.getElementById('devolucoesPainelGestor'),lista=document.getElementById('listaDevolucoesPainelGestor');
  if(box&&lista){
    const itens=listarDevolucoesPainelGestor(dados.emprestimos?.itens);box.hidden=!itens.length;lista.replaceChildren();
    document.getElementById('tituloDevolucoesPainelGestor').textContent='🤝 Recebimentos para acompanhar • '+itens.length+' pendência(s)';
    itens.slice(0,12).forEach(i=>{const b=document.createElement('button');b.type='button';b.className='w-full rounded-xl border p-3 text-left text-xs '+i.situacao.fundo;const titulo=document.createElement('strong'),detalhe=document.createElement('span');titulo.className='block font-bold';titulo.textContent=i.pessoa+' • '+formatBRL(i.valorRaw);detalhe.className='block mt-1';detalhe.textContent=(i.dataCombinada||'Parcela de '+i.mesFatura)+' • '+i.situacao.texto+' • Falta receber: '+formatBRL(i.valorRaw)+' • '+i.descricao;b.append(titulo,detalhe);b.onclick=()=>abrirDevolucaoPainelGestor(i);lista.append(b);});
    if(itens.length>12){const p=document.createElement('p');p.className='text-xs text-slate-300';p.textContent='Mostrando as primeiras 12. Confira as demais em Empréstimos.';lista.append(p);}
  }
  const semAvisos=document.getElementById('semAvisosPainelGestor');if(semAvisos)semAvisos.hidden=!(document.getElementById('bannerVencimentoFatura')?.classList?.contains('hidden')&&document.getElementById('devolucoesPainelGestor')?.hidden);

}
function renderizarLimitePessoalPainelGestor(dados){
  const resumo=document.getElementById('resumoLimitePessoalGestor');if(!resumo)return;
  const config=normalizarConfigLimitePessoalGestor(lerJSONLocalGestor('gestorLimitePessoalV1',{})),r=calcularLimitePessoalPainelGestor(dados,config);
  const campo=document.getElementById('valorLimitePessoalGestor');
  if(!limitePessoalEmEdicaoGestor){if(document.activeElement!==campo)campo.value=r.limite>0?formatBRL(r.limite/100):'';document.getElementById('previsoesLimitePessoalGestor').checked=config.incluirPrevistos===true;}
  document.getElementById('periodoLimitePessoalGestor').textContent=r.mes||'';
  renderizarResultadoLimitePessoalGestor(resumo,r,config);
}
function salvarLimitePessoalPainelGestor(limpar=false){
  const valor=limpar?0:lerValorMoeda('valorLimitePessoalGestor'),centavos=Math.round(valor*100);
  if(!limpar&&(!Number.isSafeInteger(centavos)||centavos<=0)){mostrarAviso('Confira o limite','Informe um valor maior que zero.');return;}
  try{gravarArmazenamentoGestor('gestorLimitePessoalV1',JSON.stringify({centavos,incluirPrevistos:!limpar&&document.getElementById('previsoesLimitePessoalGestor').checked}));limitePessoalEmEdicaoGestor=false;renderizarRotinaPainelGestor();mostrarAviso(limpar?'Limite removido':'Limite guardado',dadosRotinaPainelGestor?'O acompanhamento mensal foi atualizado.':'O limite está salvo neste aparelho. Aguarde a consulta dos gastos para ver o resultado.');}
  catch(e){mostrarAviso('Limite não guardado',e.message);}
}
const renderDadosAntesRotinaPainelGestor=window.renderizarDados;
window.renderizarDados=function(dados){dadosRotinaPainelGestor=dados;try{return renderDadosAntesRotinaPainelGestor(dados);}finally{renderizarRotinaPainelGestor();}};
window.addEventListener('storage',e=>{if(e.key==='gestorLimitePessoalV1')renderizarRotinaPainelGestor();});
function organizarPainelDiarioGestor(){
  const raiz=document.getElementById('view-dashboard');if(!raiz||document.getElementById('resumoMesPainelGestor'))return;
  const kpis=document.getElementById('kpi-comp')?.closest('section'),horizonte=document.getElementById('tabelaHorizonte')?.closest('.card-glass'),grafico=document.getElementById('chartCategorias')?.closest('.card-glass');if(!kpis||!horizonte||!grafico)return;
  const grade=horizonte.parentElement,explicacao=document.getElementById('escopoKpiRotina')?.closest('details'),geral=document.getElementById('kpi-geral')?.parentElement;
  document.getElementById('chartCategorias').parentElement.className='relative h-64 lg:h-auto lg:flex-1 lg:min-h-[24rem] flex items-center justify-center';
  const criar=(tag,texto,classe)=>{const e=document.createElement(tag);if(texto)e.textContent=texto;if(classe)e.className=classe;return e;};
  const resumo=criar('section',null,'space-y-3');resumo.id='resumoMesPainelGestor';resumo.append(criar('h2','Seu mês','text-base font-bold text-white'));
  const total=document.getElementById('kpi-comp').parentElement;total.classList.add('col-span-2','sm:col-span-1');kpis.className='grid grid-cols-2 sm:grid-cols-3 gap-3';kpis.append(total,document.getElementById('kpi-aberto').parentElement,document.getElementById('kpi-pago').parentElement);if(geral)geral.remove();resumo.append(kpis);if(explicacao)resumo.append(explicacao);
  const atencao=criar('section',null,'space-y-3');atencao.append(criar('h2','O que precisa de atenção','text-base font-bold text-white'));for(const id of ['bannerVencimentoFatura','devolucoesPainelGestor']){const e=document.getElementById(id);if(e)atencao.append(e);}
  const vazio=criar('p','Sem avisos de vencimento ou devolução nos próximos 7 dias.','text-xs text-slate-300');vazio.id='semAvisosPainelGestor';vazio.hidden=true;atencao.append(vazio);
  // O resumo geral de terceiros fica junto da ação; não repete um segundo banner.
  const banner=document.getElementById('bannerEmprestimosDash');if(banner){banner.style.display='none';banner.hidden=true;}
  const acoes=raiz.querySelector('[aria-label="Pagamentos e recebimentos"]');if(acoes){acoes.className='card-glass p-4 space-y-3';const p=criar('p',null,'text-xs text-amber-200');p.id='resumoTerceirosPainelGestor';acoes.querySelector('h3')?.after(p);}
  // A mesma grade empilha no celular; no computador mantém gráfico e Horizonte lado a lado.
  const comparacao=criar('div',null,'grid grid-cols-1 lg:grid-cols-3 gap-6');comparacao.id='comparacaoPainelGestor';grafico.classList.add('lg:order-1');horizonte.classList.add('lg:order-2');comparacao.append(horizonte,grafico);
  const analise=criar('section',null,'space-y-3');analise.append(criar('h2','Análise e planejamento','text-base font-bold text-white'));const limite=document.getElementById('limitePessoalPainelGestor');if(limite)analise.append(limite);
  if(geral){const d=criar('details',null,'space-y-2');d.append(criar('summary','Consultar todo o histórico registrado','text-xs text-slate-300 cursor-pointer py-2'),geral);analise.append(d);}
  raiz.append(resumo,atencao);if(acoes)raiz.append(acoes);raiz.append(comparacao,analise);if(grade&&!grade.children.length)grade.remove();
  renderizarRotinaPainelGestor();
}
document.addEventListener('DOMContentLoaded',organizarPainelDiarioGestor);
