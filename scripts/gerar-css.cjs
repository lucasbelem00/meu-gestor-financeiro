const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const cssnano = require('cssnano');
const raiz = path.resolve(__dirname, '..');

async function gerarCSS() {
  const arquivo = path.join(raiz, 'index.html');
  const html = fs.readFileSync(arquivo, 'utf8');
  const marcador = /<style id="gestor-css-compilado">[\s\S]*?<\/style>/;
  // Nunca escanear o CSS gerado: evita acúmulo de classes a cada compilação.
  const fonte = html.replace(marcador, '').replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/, '');
  validarFonteCSS(fonte);
  const resultado = await postcss([
    tailwind({content: [{raw: fonte, extension: 'html'}], theme: {extend: {}}, plugins: []}),
    cssnano({preset: ['default', {normalizeWhitespace: true}]})
  ]).process('@tailwind base; @tailwind components; @tailwind utilities;', {from: undefined});
  if (!resultado.css.includes('.hidden') || !resultado.css.includes('.text-emerald-400') || !resultado.css.includes('@media')) throw new Error('CSS gerado incompleto. A publicação foi interrompida.');
  const estilo = '<style id="gestor-css-compilado">' + resultado.css + '</style>';
  let saida;
  if (marcador.test(html)) saida = html.replace(marcador, () => estilo);
  else if (html.includes('<script src="https://cdn.tailwindcss.com"></script>')) saida = html.replace('<script src="https://cdn.tailwindcss.com"></script>', () => estilo);
  else throw new Error('Marcador de estilos não encontrado.');
  for (const nome of ['index.html','Backend/Index.html','Backend/Index_para_colar.txt']) fs.writeFileSync(path.join(raiz,nome),saida);
  console.log('CSS compilado: ' + Buffer.byteLength(resultado.css) + ' bytes. Interfaces sincronizadas.');
  return resultado.css;
}
function validarFonteCSS(fonte) {
  // A compilação aceita apenas o HTML local, sem globs nem conteúdo vindo da API.
  if (Buffer.byteLength(fonte)>2000000) throw new Error('Fonte de estilos grande demais; revise antes de publicar.');
  let profundidade=0;
  for (const c of fonte) {
    if (c === '{' && ++profundidade>128) throw new Error('Aninhamento excessivo na fonte de estilos.');
    if (c === '}') profundidade=Math.max(0,profundidade-1);
  }
}
if (require.main === module) gerarCSS().catch(erro => {console.error(erro.message);process.exitCode = 1;});
module.exports = {gerarCSS, validarFonteCSS};
