const fs=require('node:fs'),path=require('node:path');
function sincronizarMotor(){
  const raiz=path.resolve(__dirname,'..'), motor=fs.readFileSync(path.join(raiz,'shared/rachadinha.js'),'utf8').trim();
  for(const nome of ['index.html','Backend/Code.gs']){
    const arquivo=path.join(raiz,nome),fonte=fs.readFileSync(arquivo,'utf8');
    const inicio='// INICIO MOTOR RACHADINHA GERADO',fim='// FIM MOTOR RACHADINHA GERADO';
    if(!fonte.includes(inicio)||!fonte.includes(fim)) throw Error('Marcador do motor não encontrado: '+nome);
    fs.writeFileSync(arquivo,fonte.slice(0,fonte.indexOf(inicio))+inicio+'\n'+motor+'\n'+fonte.slice(fonte.indexOf(fim)));
  }
  const arquivo=path.join(raiz,'index.html');let html=fs.readFileSync(arquivo,'utf8');
  for(const nome of ['rachadinha','sincronizacao','usabilidade','rotina']){
    const inicio='// INICIO INTERFACE '+nome.toUpperCase()+' GERADA',fim='// FIM INTERFACE '+nome.toUpperCase()+' GERADA';
    if(!html.includes(inicio)||!html.includes(fim))throw Error('Marcador da interface não encontrado: '+nome);
    html=html.slice(0,html.indexOf(inicio))+inicio+'\n'+fs.readFileSync(path.join(raiz,'interface',nome+'.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(fim));
  }
  fs.writeFileSync(arquivo,html);
}
if(require.main===module)sincronizarMotor();
module.exports={sincronizarMotor};
