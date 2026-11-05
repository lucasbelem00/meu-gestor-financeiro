// Limites iguais em cadastro, relatórios, backup e organização anual.
// Mantém os anos históricos já aceitos pelo cadastro antes da organização anual.
const ANO_MIN_COMPETENCIA_GESTOR_=1900;
const ANO_MAX_COMPETENCIA_GESTOR_=2200;
function anoCompetenciaValidoGestor_(ano){return Number.isInteger(ano)&&ano>=ANO_MIN_COMPETENCIA_GESTOR_&&ano<=ANO_MAX_COMPETENCIA_GESTOR_;}
// Leitura estrita compartilhada. Não depender do parseMesFat exclusivo do servidor.
function interpretarCompetenciaGestor(valor){
  const p=/^(\d{2})\/(\d{4})$/.exec(String(valor||'').replace(/^'/,'').trim());
  if(!p||Number(p[1])<1||Number(p[1])>12||!anoCompetenciaValidoGestor_(Number(p[2])))return {m:0,a:0,time:0};
  const m=Number(p[1]),a=Number(p[2]);return {m,a,time:new Date(a,m-1,1).getTime()};
}
function validarPeriodoParcelasGestor_(valor,quantidade=1,inicial=1){
  const texto=String(valor||'').replace(/^'/,'').trim(),p=/^(\d{2})\/(\d{4})$/.exec(texto);
  if(!p||Number(p[1])<1||Number(p[1])>12||!anoCompetenciaValidoGestor_(Number(p[2])))throw Error('Mês da fatura inválido. Use MM/AAAA, entre '+ANO_MIN_COMPETENCIA_GESTOR_+' e '+ANO_MAX_COMPETENCIA_GESTOR_+'.');
  if(!Number.isInteger(quantidade)||!Number.isInteger(inicial)||inicial<1||quantidade<inicial)throw Error('Confira a quantidade de parcelas e a parcela inicial.');
  const ultimoAno=Math.floor((Number(p[2])*12+Number(p[1])-1+quantidade-inicial)/12);
  if(!anoCompetenciaValidoGestor_(ultimoAno))throw Error('As parcelas ultrapassam o ano máximo permitido ('+ANO_MAX_COMPETENCIA_GESTOR_+'). Confira o mês da primeira fatura e as parcelas.');
  return texto;
}

// Mesmo cálculo no formulário e no servidor; não gera cobranças retroativas.
function planoRecorrenciaCadastroGestor(data,competencia,hoje){
 const v=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(data||'')),f=interpretarCompetenciaGestor(competencia);
 if(!v||!f.m)throw Error('Confira a data e o mês da fatura.');
 const dia=Number(v[1]),mes=Number(v[2]),ano=Number(v[3]),d=new Date(ano,mes-1,dia);
 if(d.getDate()!==dia||d.getMonth()!==mes-1||d.getFullYear()!==ano)throw Error('Data do gasto inválida.');
 const defasagem=(f.a-ano)*12+f.m-mes;
 if(defasagem<0||defasagem>2)throw Error('Para recorrência, a fatura deve ficar no mesmo mês da cobrança ou até dois meses depois.');
 const atual=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());let proximo=new Date(ano,mes,1),omitidos=0;
 const ocorrencia=()=>new Date(proximo.getFullYear(),proximo.getMonth(),Math.min(dia,new Date(proximo.getFullYear(),proximo.getMonth()+1,0).getDate()));
 while(ocorrencia()<atual){proximo.setMonth(proximo.getMonth()+1);omitidos++;}
 if(proximo.getFullYear()>2199||proximo.getFullYear()<2000)throw Error('Ano da próxima recorrência fora do limite.');
 const fmt=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
 return {dia,defasagem,proximoMes:String(proximo.getMonth()+1).padStart(2,'0')+'/'+proximo.getFullYear(),dataProxima:fmt(ocorrencia()),omitidos};
}
