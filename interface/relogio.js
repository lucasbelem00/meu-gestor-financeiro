// Referência técnica local: não contém dados financeiros e não participa do backup.
const relogioCivilGestor=criarRelogioCivilGestor({
 agora:()=>Date.now(),monotono:()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():null,
 ler:()=>{try{return JSON.parse(localStorage.getItem('gestorRelogioCivilV1')||'null');}catch(_){return null;}},
 salvar:r=>{try{localStorage.setItem('gestorRelogioCivilV1',JSON.stringify(r));}catch(_){}}
});
function hojeCivilGestor(){return relogioCivilGestor.hoje();}
function instanteCivilGestor(){return relogioCivilGestor.instante();}
function dataCivilISOGestor(){return relogioCivilGestor.data().iso;}
function sincronizarRelogioCivilGestor(r){
 try{const antes=dataCivilISOGestor(),ok=relogioCivilGestor.sincronizar(r);if(ok&&antes!==dataCivilISOGestor()&&typeof atualizarDatasAutomaticasRelogioGestor==='function'){try{atualizarDatasAutomaticasRelogioGestor();}catch(_){}}return ok;}catch(_){return false;}
}
function diagnosticoRelogioCivilGestor(){return relogioCivilGestor.diagnostico();}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')relogioCivilGestor.retomar();});
