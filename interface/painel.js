// Lembretes e limite pessoal usam a carga existente: nenhuma consulta adicional.
let dadosRotinaPainelGestor=null;
let limitePessoalEmEdicaoGestor=false;
function abrirDevolucaoPainelGestor(item){
  abrirResumoEmprestimos();
  for(const [id,valor] of [['selFiltroMesEmp',item.mesFatura],['selFiltroPessoaEmp',item.pessoa],['selFiltroStatusEmp','A Receber'],['selFiltroFormaEmp',''],['inpBuscaEmp','']]){const campo=document.getElementById(id);if(campo)campo.value=valor||'';}
  renderizarPainelEmprestimos();
}
function diaDevolucaoPainelGestor(texto){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto||''));if(!m)return null;
  const dia=Number(m[1]),mes=Number(m[2])-1,ano=Number(m[3]),d=new Date(Date.UTC(ano,mes,dia));
  return d.getUTCFullYear()===ano&&d.getUTCMonth()===mes&&d.getUTCDate()===dia?d.getTime()/86400000:null;
}
function listarDevolucoesPainelGestor(itens,hoje=new Date()){
  const dia=Date.UTC(hoje.getFullYear(),hoje.getMonth(),hoje.getDate())/86400000;
  return (itens||[]).filter(i=>i.status==='A Receber'&&!i.arquivado).map(i=>({...i,dias:diaDevolucaoPainelGestor(i.dataCombinada)===null?null:diaDevolucaoPainelGestor(i.dataCombinada)-dia})).filter(i=>i.dias!==null&&i.dias<=7).sort((a,b)=>a.dias-b.dias||String(a.pessoa).localeCompare(String(b.pessoa),'pt-BR'));
}
function calcularLimitePessoalPainelGestor(dados,config){
  const mes=dados?.faturas?.mesAtual,h=dados?.faturas?.horizonte;
  const somar=mapa=>Object.values(mapa||{}).reduce((s,v)=>s+Math.round(Number(v[mes]||0)*100),0);
  const registrado=h?somar(h.totalPessoal):Math.round(lerValorMoeda(dados?.kpis?.comprometimentoMes||0)*100);
  const previsto=config.incluirPrevistos?somar(h?.previstoPessoal):0;
  const limite=Number(config.centavos)||0,total=registrado+previsto;
  return {mes,registrado,previsto,total,limite,margem:limite-total,percentual:limite>0?Math.round(total*100/limite):0};
}
function renderizarRotinaPainelGestor(){
  const dados=dadosRotinaPainelGestor;if(!dados)return;
  const acaoTerceiros=document.getElementById('resumoTerceirosPainelGestor');if(acaoTerceiros)acaoTerceiros.textContent='A receber de terceiros: '+(dados.emprestimos?.kpis?.totalAReceberGeral||'R$ 0,00')+' • todos os meses';
  const box=document.getElementById('devolucoesPainelGestor'),lista=document.getElementById('listaDevolucoesPainelGestor');
  if(box&&lista){
    const itens=listarDevolucoesPainelGestor(dados.emprestimos?.itens);box.hidden=!itens.length;lista.replaceChildren();
    document.getElementById('tituloDevolucoesPainelGestor').textContent='🤝 Devoluções combinadas • '+itens.length+' pendência(s)';
    itens.slice(0,12).forEach(i=>{const b=document.createElement('button');b.type='button';b.className='w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-left text-xs';const titulo=document.createElement('strong'),detalhe=document.createElement('span');titulo.className='block text-amber-200';titulo.textContent=i.pessoa+' • '+formatBRL(i.valorRaw);detalhe.className='block mt-1 text-slate-300';detalhe.textContent=i.dataCombinada+' • '+(i.dias<0?'Devolução atrasada':i.dias===0?'Combinado para hoje':'Em '+i.dias+' dia(s)')+' • '+i.descricao;b.append(titulo,detalhe);b.onclick=()=>abrirDevolucaoPainelGestor(i);lista.append(b);});
    if(itens.length>12){const p=document.createElement('p');p.className='text-xs text-slate-300';p.textContent='Mostrando as primeiras 12. Confira as demais em Empréstimos.';lista.append(p);}
  }
  const semAvisos=document.getElementById('semAvisosPainelGestor');if(semAvisos)semAvisos.hidden=!(document.getElementById('bannerVencimentoFatura')?.classList?.contains('hidden')&&document.getElementById('devolucoesPainelGestor')?.hidden);
  const resumo=document.getElementById('resumoLimitePessoalGestor');if(!resumo)return;
  const config=lerJSONLocalGestor('gestorLimitePessoalV1',{}),r=calcularLimitePessoalPainelGestor(dados,config);
  const campo=document.getElementById('valorLimitePessoalGestor');
  if(!limitePessoalEmEdicaoGestor){if(document.activeElement!==campo)campo.value=r.limite>0?formatBRL(r.limite/100):'';document.getElementById('previsoesLimitePessoalGestor').checked=config.incluirPrevistos===true;}
  document.getElementById('periodoLimitePessoalGestor').textContent=r.mes||'';
  const indicador=document.getElementById('indicadorLimitePessoalGestor');if(indicador){indicador.textContent=r.limite>0?' • '+r.percentual+'% utilizado':'';indicador.className=r.limite>0&&r.margem<0?'text-rose-300':'text-slate-300';}
  resumo.textContent=r.limite>0?'Registrado: '+formatBRL(r.registrado/100)+(config.incluirPrevistos?' • Previsto: '+formatBRL(r.previsto/100):'')+' • '+(r.margem>=0?'Margem: '+formatBRL(r.margem/100):'Acima do limite: '+formatBRL(-r.margem/100))+' ('+r.percentual+'% do limite).':'Sem limite definido. Configure apenas se quiser acompanhar um teto geral de gastos.';
  resumo.className='text-xs mt-3 '+(r.limite>0&&r.margem<0?'text-rose-300':'text-slate-200');
}
function salvarLimitePessoalPainelGestor(limpar=false){
  const valor=limpar?0:lerValorMoeda('valorLimitePessoalGestor'),centavos=Math.round(valor*100);
  if(!limpar&&(!Number.isSafeInteger(centavos)||centavos<=0)){mostrarAviso('Confira o limite','Informe um valor maior que zero.');return;}
  try{gravarArmazenamentoGestor('gestorLimitePessoalV1',JSON.stringify({centavos,incluirPrevistos:!limpar&&document.getElementById('previsoesLimitePessoalGestor').checked}));limitePessoalEmEdicaoGestor=false;renderizarRotinaPainelGestor();}
  catch(e){mostrarAviso('Limite não guardado',e.message);}
}
const renderDadosAntesRotinaPainelGestor=window.renderizarDados;
window.renderizarDados=function(dados){const r=renderDadosAntesRotinaPainelGestor(dados);dadosRotinaPainelGestor=dados;renderizarRotinaPainelGestor();return r;};
window.addEventListener('storage',e=>{if(e.key==='gestorLimitePessoalV1')renderizarRotinaPainelGestor();});
function organizarPainelDiarioGestor(){
  const raiz=document.getElementById('view-dashboard');if(!raiz||document.getElementById('resumoMesPainelGestor'))return;
  const kpis=document.getElementById('kpi-comp')?.closest('section'),horizonte=document.getElementById('tabelaHorizonte')?.closest('.card-glass'),grafico=document.getElementById('chartCategorias')?.closest('.card-glass');if(!kpis||!horizonte||!grafico)return;
  const grade=horizonte.parentElement,explicacao=document.getElementById('escopoKpiRotina')?.closest('details'),geral=document.getElementById('kpi-geral')?.parentElement;
  document.getElementById('chartCategorias').parentElement.className='relative h-64 flex items-center justify-center';
  const criar=(tag,texto,classe)=>{const e=document.createElement(tag);if(texto)e.textContent=texto;if(classe)e.className=classe;return e;};
  const resumo=criar('section',null,'space-y-3');resumo.id='resumoMesPainelGestor';resumo.append(criar('h2','Seu mês','text-base font-bold text-white'));
  const total=document.getElementById('kpi-comp').parentElement;total.classList.add('col-span-2','sm:col-span-1');kpis.className='grid grid-cols-2 sm:grid-cols-3 gap-3';kpis.append(total,document.getElementById('kpi-aberto').parentElement,document.getElementById('kpi-pago').parentElement);if(geral)geral.remove();resumo.append(kpis);if(explicacao)resumo.append(explicacao);
  const atencao=criar('section',null,'space-y-3');atencao.append(criar('h2','O que precisa de atenção','text-base font-bold text-white'));for(const id of ['bannerVencimentoFatura','devolucoesPainelGestor']){const e=document.getElementById(id);if(e)atencao.append(e);}
  const vazio=criar('p','Sem avisos de vencimento ou devolução nos próximos 7 dias.','text-xs text-slate-300');vazio.id='semAvisosPainelGestor';vazio.hidden=true;atencao.append(vazio);
  // O resumo geral de terceiros fica junto da ação; não repete um segundo banner.
  const banner=document.getElementById('bannerEmprestimosDash');if(banner){banner.style.display='none';banner.hidden=true;}
  const acoes=raiz.querySelector('[aria-label="Pagamentos e recebimentos"]');if(acoes){acoes.className='card-glass p-4 space-y-3';const p=criar('p',null,'text-xs text-amber-200');p.id='resumoTerceirosPainelGestor';acoes.querySelector('h3')?.after(p);}
  const analise=criar('section',null,'space-y-3');analise.append(criar('h2','Análise e planejamento','text-base font-bold text-white'),grafico);const limite=document.getElementById('limitePessoalPainelGestor');if(limite)analise.append(limite);
  if(geral){const d=criar('details',null,'space-y-2');d.append(criar('summary','Consultar todo o histórico registrado','text-xs text-slate-300 cursor-pointer py-2'),geral);analise.append(d);}
  raiz.append(resumo,atencao);if(acoes)raiz.append(acoes);raiz.append(horizonte,analise);if(grade&&!grade.children.length)grade.remove();
  renderizarRotinaPainelGestor();
}
document.addEventListener('DOMContentLoaded',organizarPainelDiarioGestor);
