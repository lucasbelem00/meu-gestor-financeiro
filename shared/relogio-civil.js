// Calendário civil no fuso do projeto. Não converte nem reescreve datas informadas.
function criarRelogioCivilGestor(opcoes={}){
 const agora=opcoes.agora||Date.now,monotono=opcoes.monotono||(()=>null),limite=30*86400000;
 let referencia=null,fuso='America/Sao_Paulo',base=0,parede=0,mono=null,origem='aparelho',ultimaSincronizacao=0,ultimoServidorEmSessao=0;
 const formatadores=new Map();let cacheCivil=null;
 function formatador(z){if(!formatadores.has(z))formatadores.set(z,new Intl.DateTimeFormat('en-CA',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}));return formatadores.get(z);}
 function partes(instante,z){const p=Object.fromEntries(formatador(z).formatToParts(new Date(instante)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return {ano:Number(p.year),mes:Number(p.month),dia:Number(p.day),iso:p.year+'-'+p.month+'-'+p.day};}
 function validar(r){try{if(!r||r.versao!==1||!Number.isSafeInteger(r.instante)||!Number.isFinite(new Date(r.instante).getTime())||typeof r.fuso!=='string'||r.fuso.length>80)return null;const p=partes(r.instante,r.fuso);if(r.dia!==undefined&&r.dia!==p.iso)return null;return {versao:1,instante:r.instante,fuso:r.fuso,dia:p.iso};}catch(_){return null;}}
 function ancorar(instante,fonte){base=instante;parede=agora();const m=monotono();mono=Number.isFinite(m)?m:null;origem=fonte;}
 function instante(){if(!referencia)return agora();const m=monotono(),delta=mono!==null&&Number.isFinite(m)&&m>=mono?m-mono:Math.max(0,agora()-parede);return base+delta;}
 function sincronizar(r){const valida=validar(r);if(!valida||valida.instante<ultimoServidorEmSessao)return false;referencia=valida;fuso=valida.fuso;ultimaSincronizacao=valida.instante;ultimoServidorEmSessao=valida.instante;ancorar(valida.instante,'servidor');try{opcoes.salvar?.({...valida,recebidoEm:parede});}catch(_){}return true;}
 // Na reabertura, só é possível estimar o tempo decorrido pelo relógio do aparelho.
 try{const salva=opcoes.ler?.(),r=validar(salva);if(r){fuso=r.fuso;const delta=agora()-salva.recebidoEm;if(Number.isFinite(salva.recebidoEm)&&delta>=0&&delta<=limite){referencia=r;ultimaSincronizacao=r.instante;ancorar(r.instante+delta,'referencia-salva-estimada');}}}catch(_){}
 function retomar(){if(!referencia)return;const delta=agora()-parede;if(delta>=0&&delta<=limite){const estimado=base+delta;if(estimado>instante()+60000)ancorar(estimado,'referencia-salva-estimada');}}
 function data(){const t=instante(),chave=fuso+'|'+Math.floor(t/1000);if(cacheCivil?.chave===chave)return {...cacheCivil.valor};let valor;try{valor=partes(t,fuso);}catch(_){const d=new Date(t);valor={ano:d.getFullYear(),mes:d.getMonth()+1,dia:d.getDate(),iso:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};}cacheCivil={chave,valor};return {...valor};}
 function hoje(){const p=data();return new Date(p.ano,p.mes-1,p.dia,12,0,0,0);}
 function diagnostico(){return {fuso,origem,dataCivil:data().iso,referenciaServidor:referencia!==null,ultimaSincronizacao:ultimaSincronizacao||null,avancoLocalEstimado:true};}
 return {sincronizar,instante,data,hoje,retomar,diagnostico};
}
if(typeof module!=='undefined'&&module.exports)module.exports={criarRelogioCivilGestor};
