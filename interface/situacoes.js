// Identidade visual de situações. Somente apresentação: não registra baixas.
function diaSituacaoVisualGestor(texto){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto||''));if(!m)return null;
  const a=+m[3],mes=+m[2],d=+m[1],data=new Date(Date.UTC(a,mes-1,d));
  return a>=1900&&a<=2200&&data.getUTCFullYear()===a&&data.getUTCMonth()===mes-1&&data.getUTCDate()===d?data.getTime()/86400000:null;
}
function fimMesSituacaoVisualGestor(mes){const p=/^(0[1-9]|1[0-2])\/(\d{4})$/.exec(String(mes||''));if(!p||+p[2]<1900||+p[2]>2200)return null;return Date.UTC(+p[2],+p[1],0)/86400000;}
function hojeSituacaoVisualGestor(hoje=new Date()){return Date.UTC(hoje.getFullYear(),hoje.getMonth(),hoje.getDate())/86400000;}
function estiloSituacaoVisualGestor(codigo,texto){
  const concluido=['recebido','pago'].includes(codigo),atencao=['vencido','mesEncerrado'].includes(codigo),neutro=codigo==='vazio';
  return {codigo,texto,prioridade:atencao?3:concluido?1:neutro?0:2,cor:atencao?'text-[#ff9570]':concluido?'text-emerald-300':neutro?'text-slate-300':'text-amber-200',fundo:atencao?'bg-[#7c2d20]/80 border-[#f97350] text-[#ffdfd4]':concluido?'bg-emerald-900/60 border-emerald-500 text-emerald-100':neutro?'bg-slate-900 border-slate-700 text-slate-200':'bg-amber-900/60 border-amber-500 text-amber-100'};
}
function situacaoRecebimentoVisualGestor(item,hoje=new Date()){
  if(item.status==='Recebido')return estiloSituacaoVisualGestor('recebido','Recebido');
  if(/^cancelad/i.test(String(item.status||'')))return estiloSituacaoVisualGestor('vazio','Cancelado');
  const dia=diaSituacaoVisualGestor(item.dataCombinada),atual=hojeSituacaoVisualGestor(hoje);
  if(item.dataCombinada&&dia===null)return estiloSituacaoVisualGestor('conferir','Conferir data combinada');
  if(dia!==null)return dia<atual?estiloSituacaoVisualGestor('vencido','Vencido há '+(atual-dia)+' dia(s)'):estiloSituacaoVisualGestor('pendente',dia===atual?'A receber hoje':'A receber');
  const fim=fimMesSituacaoVisualGestor(item.mesFatura);
  return fim!==null&&fim<atual?estiloSituacaoVisualGestor('mesEncerrado','Mês encerrado · A receber'):estiloSituacaoVisualGestor('pendente','A receber · Sem data combinada');
}
// Calendário nacional de pagamentos; horário reduzido não equivale a feriado.
const feriadosBancariosCacheGestor=new Map();
function feriadosBancariosGestor(ano){
 if(feriadosBancariosCacheGestor.has(ano))return feriadosBancariosCacheGestor.get(ano);
 const datas=new Map(),adicionar=(m,d,n)=>datas.set(Date.UTC(ano,m-1,d)/86400000,n);
 for(const [m,d,n]of [[1,1,'Confraternização Universal'],[4,21,'Tiradentes'],[5,1,'Dia do Trabalho'],[9,7,'Independência'],[10,12,'Nossa Senhora Aparecida'],[11,2,'Finados'],[11,15,'Proclamação da República'],[12,25,'Natal']])adicionar(m,d,n);
 if(ano>=2024)adicionar(11,20,'Consciência Negra');
 const a=ano%19,b=Math.floor(ano/100),c=ano%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=(h+l-7*m+114)%31+1,pascoa=Date.UTC(ano,mes-1,dia)/86400000;
 for(const [offset,nome]of [[-48,'Carnaval'],[-47,'Carnaval'],[-2,'Sexta-feira da Paixão'],[60,'Corpus Christi']])datas.set(pascoa+offset,nome);
 feriadosBancariosCacheGestor.set(ano,datas);return datas;
}
function dataDiaBancarioGestor(dia){return new Date(dia*86400000).toISOString().slice(0,10).split('-').reverse().join('/');}
function vencimentoFaturaBancarioGestor(forma,mes,vencimento,usarCorrecao=true){
 const fim=fimMesSituacaoVisualGestor(mes),n=Number(vencimento);if(fim===null||!Number.isInteger(n)||n<1||n>31)return null;
 const [m,a]=mes.split('/').map(Number),original=Date.UTC(a,m-1,Math.min(n,new Date(fim*86400000).getUTCDate()))/86400000;
 let dia=original;const motivos=[];
 for(let t=0;t<20;t++,dia++){const d=new Date(dia*86400000),feriado=feriadosBancariosGestor(d.getUTCFullYear()).get(dia),fimSemana=[0,6].includes(d.getUTCDay());if(!feriado&&!fimSemana)break;motivos.push(feriado||'Fim de semana');}
 const automatico=dia;
 if(usarCorrecao&&forma){try{const mapa=JSON.parse(localStorage.getItem('gestorVencimentosFaturasV1')||'{}'),data=mapa[JSON.stringify([forma,mes])],manual=diaSituacaoVisualGestor(data);if(manual!==null)dia=manual;}catch(e){/* Preferência ausente ou inválida: usa o calendário. */}}
 return {dia,original,automatico,data:dataDiaBancarioGestor(dia),dataOriginal:dataDiaBancarioGestor(original),manual:dia!==automatico,motivo:dia!==automatico?'Data informada pelo banco':Array.from(new Set(motivos)).join(' e ')};
}
function situacaoBancoVisualGestor(item,hoje=new Date()){
  const total=Number(item.total)||0,pago=Number(item.pago)||0,saldo=Number.isFinite(item.saldo)?item.saldo:Math.max(0,total-pago);
  if(total<=0)return estiloSituacaoVisualGestor('vazio','Sem lançamento');
  if(saldo<0.005)return estiloSituacaoVisualGestor('pago',item.imediato?'Pagamento realizado':'Pago ao banco');
  const prazo=item.imediato?null:vencimentoFaturaBancarioGestor(item.forma,item.mesFatura,item.vencimento),atual=hojeSituacaoVisualGestor(hoje);
  if(prazo&&prazo.dia<atual)return estiloSituacaoVisualGestor('vencido','Vencido há '+(atual-prazo.dia)+' dia(s)');
  return estiloSituacaoVisualGestor(pago>0?'parcial':'pendente',pago>0?'Pagamento parcial':'A pagar');
}
function formaSituacaoVisualGestor(nome){return (typeof formasGlobais==='undefined'?[]:formasGlobais).find(f=>(typeof f==='string'?f:f.nome)===nome)||{};}
function situacaoDiaAgendaGestor(itens){return itens.reduce((p,i)=>i.situacao.prioridade>p.prioridade?i.situacao:p,estiloSituacaoVisualGestor('vazio','Sem compromissos'));}
function chaveParcelaRecebidaVisualGestor(i){return i.compraId?JSON.stringify([i.compraId,i.parcela,i.mesFatura,i.forma,i.pessoa]):null;}
function mapaRecebidosParcelasVisualGestor(itens){
  const mapa=new Map();for(const i of itens){const chave=chaveParcelaRecebidaVisualGestor(i),centavos=Math.round(Number(i.valorRaw)*100);if(chave&&i.status==='Recebido'&&Number.isSafeInteger(centavos)&&centavos>0)mapa.set(chave,(mapa.get(chave)||0)+centavos);}return mapa;
}
