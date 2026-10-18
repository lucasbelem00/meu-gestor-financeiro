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
for (const nome of ['index.html','manifest.json','sw.js']) fs.copyFileSync(path.join(raiz,nome),path.join(destino,nome));
fs.cpSync(path.join(raiz,'icons'),path.join(destino,'icons'),{recursive:true});
console.log('Arquivos públicos preparados em dist/. A função /api continua na raiz do projeto.');
