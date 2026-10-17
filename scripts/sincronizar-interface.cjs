const fs = require('node:fs');
const path = require('node:path');

// O index.html da raiz é a origem. As duas cópias recebem exatamente o mesmo conteúdo.
const raiz = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'));
for (const nome of ['Index.html', 'Index_para_colar.txt']) fs.writeFileSync(path.join(raiz, 'Backend', nome), html);
console.log('As duas cópias da interface foram sincronizadas com index.html.');
