// Agenda de consulta: usa a mesma carga do Painel e não gera lançamentos previstos.
// Entrada: getDadosCompletos. Saída: eventos com dia UTC para comparação de datas.
// A cache é descartada em renderizarDados; nenhuma ação aqui confirma pagamentos.
let dadosAgendaGestor=null,diaAgendaGestor=null,eventosAgendaGestor=null;
function compromissosPixAgendadosGestor(dados,hoje){
 const atual=hojeSituacaoVisualGestor(hoje),vistos=new Set();
 return (dados?.pixAgendados||[]).filter(i=>{const dia=diaSituacaoVisualGestor(i.data);if(!i.registroId||vistos.has(i.registroId)||i.status!=='Agendado'||dia===null||!Number.isFinite(i.valorRaw)||i.valorRaw<=0)return false;vistos.add(i.registroId);return true;}).map(i=>{const dia=diaSituacaoVisualGestor(i.data);return {...i,id:'pix:'+i.registroId,tipo:'pix',dia,valor:i.valorRaw,situacao:estiloSituacaoVisualGestor(dia<atual?'vencido':dia===atual?'hoje':'pendente',dia<atual?'Pix agendado sem confirmação':dia===atual?'Pix agendado para hoje':'Pix agendado')};});
}
function abrirPixAgendadoGestor(i){
 setAba('lancamentos');abrirModalEdicaoLanc(referenciaLinhaSegura('g',i.linha,i.registroId,i.versao),i.data,i.descricao,i.forma,i.categoria,i.valorRaw,i.mesFatura,i.status,i.tags||'',i.parcela);
}
function mesAgendaValidoGestor(texto){const p=/^(\d{4})-(\d{2})$/.exec(String(texto));return Boolean(p&&anoCompetenciaValidoGestor_(Number(p[1]))&&Number(p[2])>=1&&Number(p[2])<=12);}
function compromissosAgendaGestor(dados,hoje=(typeof hojeCivilGestor==='function'?hojeCivilGestor():new Date())){
 const eventos=[],h=dados?.faturas?.horizonte;
 for(const f of dados?.formasPagamento||[]){
  const vencimento=Number(f.vencimento);if(f.tipo!=='cartao'||!Number.isInteger(vencimento)||vencimento<1||vencimento>31)continue;
  const meses=new Set([...Object.keys(h?.totalBanco?.[f.nome]||{}),...Object.keys(h?.saldoBanco?.[f.nome]||{})]);
  for(const mes of meses){const fim=fimMesSituacaoVisualGestor(mes),saldo=Number(h?.saldoBanco?.[f.nome]?.[mes]||0),total=Number(h?.totalBanco?.[f.nome]?.[mes]??saldo),pago=Number(h?.pagoBanco?.[f.nome]?.[mes]??Math.max(0,total-saldo));if(fim===null||!Number.isFinite(total)||total<=0)continue;
   const prazo=vencimentoFaturaBancarioGestor(f.nome,mes,vencimento),data=prazo.data,event={id:'fatura:'+f.nome+':'+mes,tipo:'cartao',prazo,data,dia:diaSituacaoVisualGestor(data),valor:saldo>0.004?saldo:total,total,pago,saldo,vencimento,descricao:f.nome,forma:f.nome,mesFatura:mes};event.situacao=situacaoBancoVisualGestor(event,hoje);eventos.push(event);
  }
 }
 (dados?.emprestimos?.itens||[]).forEach((i,n)=>{
  let dia=diaSituacaoVisualGestor(i.dataCombinada);const situacao=situacaoRecebimentoVisualGestor(i,hoje),semData=!i.dataCombinada;
  if(semData&&situacao.codigo==='mesEncerrado')dia=fimMesSituacaoVisualGestor(i.mesFatura);
  if(dia===null||!['A Receber','Recebido'].includes(i.status)||!Number.isFinite(Number(i.valorRaw))||Number(i.valorRaw)<=0)return;
  const data=semData?new Date(dia*86400000).toISOString().slice(0,10).split('-').reverse().join('/'):i.dataCombinada;
  eventos.push({...i,id:'devolucao:'+(i.registroId||n),tipo:'devolucao',dia,data,semData,valor:Number(i.valorRaw),situacao});
 });
 eventos.push(...compromissosPixAgendadosGestor(dados,hoje));
 return eventos.sort((a,b)=>a.dia-b.dia||a.tipo.localeCompare(b.tipo)||String(a.descricao||'').localeCompare(String(b.descricao||'')));
}
function criarElementoAgendaGestor(tag,texto,classe){const e=document.createElement(tag);if(texto!==null)e.textContent=texto;if(classe)e.className=classe;return e;}
function moverMesAgendaGestor(passo){
  const campo=document.getElementById('mesAgendaGestor');if(!mesAgendaValidoGestor(campo.value))return;
  const [a,m]=campo.value.split('-').map(Number),d=new Date(Date.UTC(a,m-1+passo,1));if(!anoCompetenciaValidoGestor_(d.getUTCFullYear()))return;
  campo.value=d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');diaAgendaGestor=null;renderizarAgendaGestor();
}
function mostrarMesCompletoAgendaGestor(){diaAgendaGestor=null;renderizarAgendaGestor();}
function renderizarAgendaGestor(){
  const campo=document.getElementById('mesAgendaGestor'),grade=document.getElementById('calendarioAgendaGestor'),lista=document.getElementById('listaAgendaGestor');if(!campo||!grade||!lista)return;
  if(!campo.value){const h=(typeof hojeCivilGestor==='function'?hojeCivilGestor():new Date());campo.value=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0');}
  if(!mesAgendaValidoGestor(campo.value)){grade.replaceChildren();lista.replaceChildren();diaAgendaGestor=null;document.getElementById('verMesAgendaGestor').hidden=true;document.getElementById('agendaAnteriorGestor').disabled=true;document.getElementById('agendaProximoGestor').disabled=true;document.getElementById('estadoAgendaGestor').textContent='Escolha um mês entre 1900 e 2200.';return;}
  const [ano,mes]=campo.value.split('-').map(Number),inicio=Date.UTC(ano,mes-1,1)/86400000,fim=Date.UTC(ano,mes,1)/86400000,tipo=document.getElementById('tipoAgendaGestor').value;
  if(diaAgendaGestor!==null&&(diaAgendaGestor<inicio||diaAgendaGestor>=fim))diaAgendaGestor=null;
  eventosAgendaGestor=compromissosAgendaGestor(dadosAgendaGestor);
  const filtroSituacao=document.getElementById('situacaoAgendaGestor')?.value||'';
  const eventos=eventosAgendaGestor.filter(i=>i.dia>=inicio&&i.dia<fim&&(!tipo||i.tipo===tipo)&&(!filtroSituacao||(filtroSituacao==='pendentes'?i.situacao.prioridade>=2:i.situacao.prioridade===1)));
  document.getElementById('agendaAnteriorGestor').disabled=ano===ANO_MIN_COMPETENCIA_GESTOR_&&mes===1;document.getElementById('agendaProximoGestor').disabled=ano===ANO_MAX_COMPETENCIA_GESTOR_&&mes===12;
  grade.replaceChildren();lista.replaceChildren();
  for(const nome of ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])grade.append(criarElementoAgendaGestor('span',nome,'text-center text-[10px] text-slate-300 py-2'));
  for(let n=0;n<new Date(inicio*86400000).getUTCDay();n++)grade.append(criarElementoAgendaGestor('span',null));
  for(let dia=inicio;dia<fim;dia++){
    const hoje=dia===hojeSituacaoVisualGestor(),numero=dia-inicio+1,itens=eventos.filter(e=>e.dia===dia),situacao=situacaoDiaAgendaGestor(itens),b=criarElementoAgendaGestor('button',null,'min-w-0 min-h-[52px] rounded-lg border p-1 text-xs '+situacao.fundo+(hoje&&diaAgendaGestor!==dia?' ring-1 ring-blue-400 ring-offset-1 ring-offset-slate-900':'')+(diaAgendaGestor===dia?' ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900':''));b.type='button';b.setAttribute('aria-pressed',String(diaAgendaGestor===dia));b.setAttribute('aria-label',numero+'/'+mes+'/'+ano+' • '+itens.length+' compromisso(s) • '+situacao.texto);b.title=itens.map(i=>(i.descricao||i.pessoa||i.forma)+': '+i.situacao.texto).join('\n');b.append(criarElementoAgendaGestor('strong',String(numero),'block'));
    b.id='agendaDiaGestor'+numero;if(hoje)b.setAttribute('aria-current','date');if(hoje)b.append(criarElementoAgendaGestor('span','Hoje','block text-[9px] font-bold'));if(itens.length)b.append(criarElementoAgendaGestor('span',itens.length+' •','block text-[10px]'));b.onclick=()=>{diaAgendaGestor=diaAgendaGestor===dia?null:dia;renderizarAgendaGestor();document.getElementById(b.id)?.focus({preventScroll:true});};grade.append(b);
  }
  const visiveis=eventos.filter(e=>diaAgendaGestor===null||e.dia===diaAgendaGestor);
  document.getElementById('estadoAgendaGestor').textContent=visiveis.length+' compromisso(s) '+(diaAgendaGestor===null?'no mês.':'no dia selecionado.')+' Dados já carregados. Verde: concluído; amarelo vivo: compromisso de hoje; âmbar: pendente; laranja: prazo vencido ou mês encerrado. Nos dias mistos, prevalece a pendência. Previsões não entram.';
  document.getElementById('verMesAgendaGestor').hidden=diaAgendaGestor===null;
  document.getElementById('avisoDadosAgendaGestor').hidden=Boolean(dadosAgendaGestor?.faturas?.horizonte);
  if(!visiveis.length)lista.append(criarElementoAgendaGestor('p','Nenhum compromisso deste tipo com data para esta seleção nos dados carregados.','text-sm text-slate-300 py-4'));
  for(const i of visiveis){
   const b=criarElementoAgendaGestor('button',null,'w-full rounded-xl border p-3 text-left space-y-1 '+i.situacao.fundo);b.type='button';const cartao=i.tipo==='cartao';
   if(i.tipo==='pix'){b.append(criarElementoAgendaGestor('strong','💠 '+i.descricao+' • '+formatBRL(i.valor),'block font-bold'),criarElementoAgendaGestor('span',i.situacao.texto,'block text-xs font-bold'),criarElementoAgendaGestor('span',i.data+' • Data informada para o Pix','block text-xs'),criarElementoAgendaGestor('span','Toque para revisar e confirmar se já foi pago.','block text-xs'));b.onclick=()=>abrirPixAgendadoGestor(i);lista.append(b);continue;}
   b.append(criarElementoAgendaGestor('strong',(cartao?'💳 ':'🤝 ')+(cartao?i.descricao:i.pessoa)+' • '+formatBRL(i.valor),'block font-bold'),criarElementoAgendaGestor('span',i.situacao.texto,'block text-xs font-bold'),criarElementoAgendaGestor('span',i.data+' • '+(cartao?'Vencimento da fatura':i.semData?'Fim do mês da parcela · sem data combinada':'Devolução combinada'),'block text-xs'),criarElementoAgendaGestor('span',cartao?'Pago ao banco: '+formatBRL(i.pago)+' • Falta pagar: '+formatBRL(i.saldo):i.status==='Recebido'?'Recebido da pessoa: '+formatBRL(i.valor):'Falta receber: '+formatBRL(i.valor),'block text-xs'),criarElementoAgendaGestor('span',cartao?'Fatura '+i.mesFatura:i.descricao+' • Fatura de origem '+i.mesFatura,'block text-xs'));
   if(cartao&&i.prazo.dia!==i.prazo.original)b.append(criarElementoAgendaGestor('span','Original: '+i.prazo.dataOriginal+' • '+i.prazo.motivo,'block text-xs'));
   b.onclick=()=>cartao?abrirConferenciaFaturaGestor(i.forma,i.mesFatura):abrirDevolucaoPainelGestor(i);lista.append(b);
  }
}
const dadosAntesAgendaGestor=window.renderizarDados;
window.renderizarDados=function(dados){const r=dadosAntesAgendaGestor(dados);dadosAgendaGestor=dados;eventosAgendaGestor=null;if(typeof abaAtivaAtual!=='undefined'&&abaAtivaAtual==='agenda')renderizarAgendaGestor();return r;};
const abaAntesAgendaGestor=window.setAba;
window.setAba=function(aba,...args){const r=abaAntesAgendaGestor(aba,...args);if(aba==='agenda')renderizarAgendaGestor();return r;};

// Recalcula os avisos com a mesma data usada no calendário, inclusive virada de mês/ano.
function alertasBancariosGestor(dados,hoje=(typeof hojeCivilGestor==='function'?hojeCivilGestor():new Date())){
 const atual=hojeSituacaoVisualGestor(hoje);
 const cartoes=dados?.faturas?.horizonte?compromissosAgendaGestor(dados,hoje).filter(i=>i.tipo==='cartao'&&i.saldo>0.004&&i.dia-atual<=7).map(i=>({forma:i.forma,mes:i.mesFatura,data:i.data,valor:formatBRL(i.saldo),dias:i.dia-atual})):(dados?.alertasVencimento||[]);
 const pix=compromissosPixAgendadosGestor(dados,hoje).filter(i=>i.dia-atual<=7).map(i=>({tipo:'pix',forma:i.descricao,mes:i.mesFatura,data:i.data,valor:formatBRL(i.valor),dias:i.dia-atual,registro:i}));
 return cartoes.concat(pix);
}
