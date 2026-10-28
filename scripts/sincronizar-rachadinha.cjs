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
  const catInicio='// INICIO CATALOGO ACOES GERADO',catFim='// FIM CATALOGO ACOES GERADO';
  if(html.includes(catInicio))html=html.slice(0,html.indexOf(catInicio))+catInicio+'\n'+fs.readFileSync(path.join(raiz,'shared/acoes.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(catFim));
  for(const nome of ['rachadinha','sincronizacao','usabilidade','rotina','desempenho','restauracao','navegacao','protecao']){
    const inicio='// INICIO INTERFACE '+nome.toUpperCase()+' GERADA',fim='// FIM INTERFACE '+nome.toUpperCase()+' GERADA';
    if(!html.includes(inicio)||!html.includes(fim))throw Error('Marcador da interface não encontrado: '+nome);
    html=html.slice(0,html.indexOf(inicio))+inicio+'\n'+fs.readFileSync(path.join(raiz,'interface',nome+'.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(fim));
  }
  fs.writeFileSync(arquivo,html);
  const backend=path.join(raiz,'Backend/Code.gs');let codigo=fs.readFileSync(backend,'utf8');
  for(const nome of ['notas-backup','anual','relatorios']){
    const fonteLocal=path.join(raiz,'shared',nome+'.js');if(!fs.existsSync(fonteLocal))continue;
    const ini='// INICIO MODULO '+nome.toUpperCase()+' GERADO',fimLocal='// FIM MODULO '+nome.toUpperCase()+' GERADO',conteudo=fs.readFileSync(fonteLocal,'utf8').trim();
    codigo=codigo.includes(ini)?codigo.slice(0,codigo.indexOf(ini))+ini+'\n'+conteudo+'\n'+codigo.slice(codigo.indexOf(fimLocal)):codigo+'\n'+ini+'\n'+conteudo+'\n'+fimLocal+'\n';
  }
  const inicio='// INICIO PROTECAO GERADA',fim='// FIM PROTECAO GERADA',fonte=fs.readFileSync(path.join(raiz,'shared/protecao.js'),'utf8').trim();
  if(codigo.includes(inicio))codigo=codigo.slice(0,codigo.indexOf(inicio))+inicio+'\n'+fonte+'\n'+codigo.slice(codigo.indexOf(fim));
  else codigo+='\n'+inicio+'\n'+fonte+'\n'+fim+'\n';
  fs.writeFileSync(backend,codigo);
}
if(require.main===module)sincronizarMotor();
module.exports={sincronizarMotor};
