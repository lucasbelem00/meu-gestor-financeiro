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
  const box=document.getElementById('devolucoesPainelGestor'),lista=document.getElementById('listaDevolucoesPainelGestor');
  if(box&&lista){
    const itens=listarDevolucoesPainelGestor(dados.emprestimos?.itens);box.hidden=!itens.length;lista.replaceChildren();
    document.getElementById('tituloDevolucoesPainelGestor').textContent='🤝 Devoluções combinadas • '+itens.length+' pendência(s)';
    itens.slice(0,12).forEach(i=>{const b=document.createElement('button');b.type='button';b.className='w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-left text-xs';const titulo=document.createElement('strong'),detalhe=document.createElement('span');titulo.className='block text-amber-200';titulo.textContent=i.pessoa+' • '+formatBRL(i.valorRaw);detalhe.className='block mt-1 text-slate-300';detalhe.textContent=i.dataCombinada+' • '+(i.dias<0?'Devolução atrasada':i.dias===0?'Combinado para hoje':'Em '+i.dias+' dia(s)')+' • '+i.descricao;b.append(titulo,detalhe);b.onclick=()=>abrirDevolucaoPainelGestor(i);lista.append(b);});
    if(itens.length>12){const p=document.createElement('p');p.className='text-xs text-slate-300';p.textContent='Mostrando as primeiras 12. Confira as demais em Empréstimos.';lista.append(p);}
  }
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
