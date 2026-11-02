function diaSituacaoVisualGestor(texto){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto||''));if(!m)return null;
  const a=+m[3],mes=+m[2],d=+m[1],data=new Date(Date.UTC(a,mes-1,d));
  return a>=1900&&a<=2200&&data.getUTCFullYear()===a&&data.getUTCMonth()===mes-1&&data.getUTCDate()===d?data.getTime()/86400000:null;
}
function fimMesSituacaoVisualGestor(mes){const p=/^(0[1-9]|1[0-2])\/(\d{4})$/.exec(String(mes||''));if(!p||+p[2]<1900||+p[2]>2200)return null;return Date.UTC(+p[2],+p[1],0)/86400000;}
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
function vencimentoFaturaBaseBancarioGestor(mes,vencimento){
 const fim=fimMesSituacaoVisualGestor(mes),n=Number(vencimento);if(fim===null||!Number.isInteger(n)||n<1||n>31)return null;
 const [m,a]=mes.split('/').map(Number),original=Date.UTC(a,m-1,Math.min(n,new Date(fim*86400000).getUTCDate()))/86400000;
 let dia=original;const motivos=[];
 for(let t=0;t<20;t++,dia++){const d=new Date(dia*86400000),feriado=feriadosBancariosGestor(d.getUTCFullYear()).get(dia),fimSemana=[0,6].includes(d.getUTCDay());if(!feriado&&!fimSemana)break;motivos.push(feriado||'Fim de semana');}
 return {dia,original,data:dataDiaBancarioGestor(dia),dataOriginal:dataDiaBancarioGestor(original),motivo:Array.from(new Set(motivos)).join(' e ')};
}
