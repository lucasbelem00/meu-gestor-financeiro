const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..'), destino = path.join(raiz, 'dist');
// Remoção restrita ao diretório gerado: não seguir links para outras pastas.
if (path.relative(raiz,destino) !== 'dist') throw new Error('Diretório de publicação inválido.');
if (fs.existsSync(destino)) {
  if (fs.lstatSync(destino).isSymbolicLink() || path.relative(fs.realpathSync(raiz),fs.realpathSync(destino)) !== 'dist') throw new Error('O diretório de publicação não pode ser um link externo.');
  fs.rmSync(destino,{recursive:true,force:true});
}
fs.mkdirSync(destino, {recursive: true});
// Somente arquivos públicos entram no diretório publicado. Backend e testes ficam fora.
const {prepararIdentidadeInstalacaoGestor}=require('./identidade-instalacao.cjs');
const pub=prepararIdentidadeInstalacaoGestor({html:fs.readFileSync(path.join(raiz,'index.html'),'utf8'),manifesto:JSON.parse(fs.readFileSync(path.join(raiz,'manifest.json'),'utf8')),worker:fs.readFileSync(path.join(raiz,'sw.js'),'utf8')},process.env);
fs.writeFileSync(path.join(destino,'index.html'),pub.html);fs.writeFileSync(path.join(destino,'manifest.json'),JSON.stringify(pub.manifesto,null,2)+'\n');fs.writeFileSync(path.join(destino,'sw.js'),pub.worker);
fs.cpSync(path.join(raiz,'icons'),path.join(destino,'icons'),{recursive:true});
console.log('Arquivos públicos preparados em dist/. A função /api continua na raiz do projeto.');
