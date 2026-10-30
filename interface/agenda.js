// Agenda de consulta: usa a mesma carga do Painel e não gera lançamentos previstos.
// Entrada: getDadosCompletos. Saída: eventos com dia UTC para comparação de datas.
// A cache é descartada em renderizarDados; nenhuma ação aqui confirma pagamentos.
let dadosAgendaGestor=null,diaAgendaGestor=null,eventosAgendaGestor=null;
function mesAgendaValidoGestor(texto){const p=/^(\d{4})-(\d{2})$/.exec(String(texto));return Boolean(p&&anoCompetenciaValidoGestor_(Number(p[1]))&&Number(p[2])>=1&&Number(p[2])<=12);}
function compromissosAgendaGestor(dados){
  const eventos=[],h=dados?.faturas?.horizonte;
  for(const f of dados?.formasPagamento||[]){
    const dia=Number(f.vencimento);if(f.tipo!=='cartao'||!Number.isInteger(dia)||dia<1||dia>31)continue;
    for(const [mes,valor]of Object.entries(h?.saldoBanco?.[f.nome]||{})){
      const p=/^(\d{2})\/(\d{4})$/.exec(mes),centavos=Math.round(Number(valor)*100);if(!p||!anoCompetenciaValidoGestor_(Number(p[2]))||Number(p[1])<1||Number(p[1])>12||!Number.isSafeInteger(centavos)||centavos<=0)continue;
      const d=Math.min(dia,new Date(Date.UTC(Number(p[2]),Number(p[1]),0)).getUTCDate()),data=String(d).padStart(2,'0')+'/'+mes;
      eventos.push({id:'fatura:'+f.nome+':'+mes,tipo:'cartao',data,dia:diaDevolucaoPainelGestor(data),valor:centavos/100,descricao:f.nome,forma:f.nome,mesFatura:mes});
    }
  }
  (dados?.emprestimos?.itens||[]).forEach((i,n)=>{const dia=diaDevolucaoPainelGestor(i.dataCombinada);if(i.status==='A Receber'&&dia!==null&&Number.isFinite(Number(i.valorRaw))&&Number(i.valorRaw)>0)eventos.push({...i,id:'devolucao:'+(i.registroId||n),tipo:'devolucao',dia,data:i.dataCombinada,valor:Number(i.valorRaw)});});
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
  if(!campo.value){const h=new Date();campo.value=h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0');}
  if(!mesAgendaValidoGestor(campo.value)){grade.replaceChildren();lista.replaceChildren();diaAgendaGestor=null;document.getElementById('verMesAgendaGestor').hidden=true;document.getElementById('agendaAnteriorGestor').disabled=true;document.getElementById('agendaProximoGestor').disabled=true;document.getElementById('estadoAgendaGestor').textContent='Escolha um mês entre 1900 e 2200.';return;}
  const [ano,mes]=campo.value.split('-').map(Number),inicio=Date.UTC(ano,mes-1,1)/86400000,fim=Date.UTC(ano,mes,1)/86400000,tipo=document.getElementById('tipoAgendaGestor').value;
  if(diaAgendaGestor!==null&&(diaAgendaGestor<inicio||diaAgendaGestor>=fim))diaAgendaGestor=null;
  if(!eventosAgendaGestor)eventosAgendaGestor=compromissosAgendaGestor(dadosAgendaGestor);
  const eventos=eventosAgendaGestor.filter(i=>i.dia>=inicio&&i.dia<fim&&(!tipo||i.tipo===tipo));
  document.getElementById('agendaAnteriorGestor').disabled=ano===ANO_MIN_COMPETENCIA_GESTOR_&&mes===1;document.getElementById('agendaProximoGestor').disabled=ano===ANO_MAX_COMPETENCIA_GESTOR_&&mes===12;
  grade.replaceChildren();lista.replaceChildren();
  for(const nome of ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])grade.append(criarElementoAgendaGestor('span',nome,'text-center text-[10px] text-slate-300 py-2'));
  for(let n=0;n<new Date(inicio*86400000).getUTCDay();n++)grade.append(criarElementoAgendaGestor('span',null));
  for(let dia=inicio;dia<fim;dia++){
    const numero=dia-inicio+1,itens=eventos.filter(e=>e.dia===dia),b=criarElementoAgendaGestor('button',null,'min-w-0 min-h-[48px] rounded-lg border p-1 text-xs '+(diaAgendaGestor===dia?'border-sky-300 bg-blue-900 text-white':'border-slate-700 bg-slate-900 text-slate-200'));b.type='button';b.setAttribute('aria-pressed',String(diaAgendaGestor===dia));b.setAttribute('aria-label',numero+'/'+mes+'/'+ano+' • '+itens.length+' compromisso(s)');b.append(criarElementoAgendaGestor('strong',String(numero),'block'));
    b.id='agendaDiaGestor'+numero;if(itens.length)b.append(criarElementoAgendaGestor('span',itens.length+' •','block text-[10px] text-sky-200'));b.onclick=()=>{diaAgendaGestor=dia;renderizarAgendaGestor();document.getElementById(b.id)?.focus({preventScroll:true});};grade.append(b);
  }
  const visiveis=eventos.filter(e=>diaAgendaGestor===null||e.dia===diaAgendaGestor),hoje=new Date(),diaHoje=Date.UTC(hoje.getFullYear(),hoje.getMonth(),hoje.getDate())/86400000;
  document.getElementById('estadoAgendaGestor').textContent=visiveis.length+' compromisso(s) '+(diaAgendaGestor===null?'no mês.':'no dia selecionado.')+' Dados já carregados; previsões de fixos não entram como faturas registradas.';
  document.getElementById('verMesAgendaGestor').hidden=diaAgendaGestor===null;
  document.getElementById('avisoDadosAgendaGestor').hidden=Boolean(dadosAgendaGestor?.faturas?.horizonte);
  if(!visiveis.length)lista.append(criarElementoAgendaGestor('p','Nenhum compromisso deste tipo com data para esta seleção nos dados carregados.','text-sm text-slate-300 py-4'));
  for(const i of visiveis){const b=criarElementoAgendaGestor('button',null,'w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-left space-y-1');b.type='button';const cartao=i.tipo==='cartao';b.append(criarElementoAgendaGestor('strong',(cartao?'💳 ':'🤝 ')+(cartao?i.descricao:i.pessoa)+' • '+formatBRL(i.valor),cartao?'block text-sky-200':'block text-amber-200'),criarElementoAgendaGestor('span',i.data+' • '+(cartao?'Vencimento da fatura':'Devolução combinada')+(i.dia<diaHoje?' • Data passada':''),'block text-xs text-slate-200'),criarElementoAgendaGestor('span',(cartao?'Fatura '+i.mesFatura:i.descricao+' • Fatura de origem '+i.mesFatura),'block text-xs text-slate-300'));b.onclick=()=>cartao?abrirConferenciaFaturaGestor(i.forma,i.mesFatura):abrirDevolucaoPainelGestor(i);lista.append(b);}
}
const dadosAntesAgendaGestor=window.renderizarDados;
window.renderizarDados=function(dados){const r=dadosAntesAgendaGestor(dados);dadosAgendaGestor=dados;eventosAgendaGestor=null;if(typeof abaAtivaAtual!=='undefined'&&abaAtivaAtual==='agenda')renderizarAgendaGestor();return r;};
const abaAntesAgendaGestor=window.setAba;
window.setAba=function(aba,...args){const r=abaAntesAgendaGestor(aba,...args);if(aba==='agenda')renderizarAgendaGestor();return r;};
