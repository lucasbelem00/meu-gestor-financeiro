// VERCEL_ENV: https://vercel.com/docs/environment-variables/system-environment-variables
function identidadeInstalacaoGestor(env={}){
 const valor=env.GESTOR_IDENTIDADE||env.VERCEL_ENV||'production';
 if(!['production','preview','development'].includes(valor))throw Error('Ambiente de identidade inválido. Use production ou preview.');
 const preview=valor!=='production';return {preview,nome:preview?'Gestor de Gastos — Preview':'Gestor de Gastos',curto:preview?'Gestor Preview':'Gestor de Gastos',prefixo:preview?'gestor-preview-v2':'gestor-v2',svg:preview?'gestor-preview.svg':'gestor.svg'};
}
function prepararIdentidadeInstalacaoGestor({html,manifesto,worker},env={}){
 const id=identidadeInstalacaoGestor(env),saida={...manifesto,id:'/',scope:'/',name:id.nome,short_name:id.curto,icons:[192,512].map(t=>({src:'icons/'+id.prefixo+'-'+t+'.png',sizes:t+'x'+t,type:'image/png',purpose:'any maskable'}))};
 html=html.replace(/<title>[^<]*<\/title>/,'<title>'+id.nome+'</title>').replace(/(<meta name="application-name" content=")[^"]*/, '$1'+id.nome).replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*/, '$1'+id.curto).replace(/(<link rel="icon"[^>]*href=")[^"]*/, '$1icons/'+id.svg+'?v=identidade-2').replace(/(<link rel="apple-touch-icon"[^>]*href=")[^"]*/, '$1icons/'+id.prefixo+'-180.png');
 if(id.preview)worker=worker.replace(/(gestor-gastos-v\d+)(?=['"])/,'$1-preview');
 return {html,manifesto:saida,worker,identidade:id};
}
module.exports={identidadeInstalacaoGestor,prepararIdentidadeInstalacaoGestor};
