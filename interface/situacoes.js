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
  return {codigo,texto,prioridade:atencao?3:concluido?1:neutro?0:2,cor:atencao?'text-orange-300':concluido?'text-emerald-300':neutro?'text-slate-300':'text-amber-200',fundo:atencao?'bg-orange-900/70 border-orange-500 text-orange-100':concluido?'bg-emerald-900/60 border-emerald-500 text-emerald-100':neutro?'bg-slate-900 border-slate-700 text-slate-200':'bg-amber-900/60 border-amber-500 text-amber-100'};
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
function situacaoBancoVisualGestor(item,hoje=new Date()){
  const total=Number(item.total)||0,pago=Number(item.pago)||0,saldo=Number.isFinite(item.saldo)?item.saldo:Math.max(0,total-pago);
  if(total<=0)return estiloSituacaoVisualGestor('vazio','Sem lançamento');
  if(saldo<0.005)return estiloSituacaoVisualGestor('pago',item.imediato?'Pagamento realizado':'Pago ao banco');
  const fim=fimMesSituacaoVisualGestor(item.mesFatura),vencimento=Number(item.vencimento);
  if(fim!==null&&Number.isInteger(vencimento)&&vencimento>=1&&vencimento<=31){const p=item.mesFatura.split('/').map(Number),d=Math.min(vencimento,new Date(fim*86400000).getUTCDate()),dia=Date.UTC(p[1],p[0]-1,d)/86400000,atual=hojeSituacaoVisualGestor(hoje);if(dia<atual)return estiloSituacaoVisualGestor('vencido','Vencido há '+(atual-dia)+' dia(s)');}
  return estiloSituacaoVisualGestor(pago>0?'parcial':'pendente',pago>0?'Pagamento parcial':'A pagar');
}
function formaSituacaoVisualGestor(nome){return (typeof formasGlobais==='undefined'?[]:formasGlobais).find(f=>(typeof f==='string'?f:f.nome)===nome)||{};}
function situacaoDiaAgendaGestor(itens){return itens.reduce((p,i)=>i.situacao.prioridade>p.prioridade?i.situacao:p,estiloSituacaoVisualGestor('vazio','Sem compromissos'));}
function chaveParcelaRecebidaVisualGestor(i){return i.compraId?JSON.stringify([i.compraId,i.parcela,i.mesFatura,i.forma,i.pessoa]):null;}
function mapaRecebidosParcelasVisualGestor(itens){
  const mapa=new Map();for(const i of itens){const chave=chaveParcelaRecebidaVisualGestor(i),centavos=Math.round(Number(i.valorRaw)*100);if(chave&&i.status==='Recebido'&&Number.isSafeInteger(centavos)&&centavos>0)mapa.set(chave,(mapa.get(chave)||0)+centavos);}return mapa;
}
