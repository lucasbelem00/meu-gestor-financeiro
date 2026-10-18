const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('CSS compilado mantém utilitários de estado, campos e telas móveis',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert(!html.includes('<script src="https://cdn.tailwindcss.com"></script>'));
  const css=html.match(/<style id="gestor-css-compilado">([\s\S]*?)<\/style>/)?.[1];assert(css);
  const postcss=require('postcss'),seletores=new Set();postcss.parse(css).walkRules(r=>seletores.add(r.selector));
  for(const regra of ['.hidden','.text-emerald-400','.text-amber-200','.h-6','.grid-cols-2','.text-sky-200','.\\!text-white'])assert(seletores.has(regra),regra);
  assert(css.includes('min-width:640px'));
});
test('publicação expõe somente arquivos públicos e preserva função de API',()=>{
  const cfg=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));assert.equal(cfg.outputDirectory,'dist');
  if(fs.existsSync(path.join(root,'dist'))){const arquivos=fs.readdirSync(path.join(root,'dist')).sort();assert.deepEqual(arquivos,['icons','index.html','manifest.json','sw.js']);}
  const publicador=fs.readFileSync(path.join(root,'scripts/publicar-estatico.cjs'),'utf8');assert(publicador.includes('manifest.json'));assert(!publicador.includes("copyFileSync('Backend"));
  assert(fs.existsSync(path.join(root,'api/gestor.js')));
});
test('compilação limita tamanho e aninhamento da fonte local',()=>{
  const {validarFonteCSS}=require('../scripts/gerar-css.cjs');
  assert.throws(()=>validarFonteCSS('{'.repeat(129)),/Aninhamento/);
  assert.throws(()=>validarFonteCSS('a'.repeat(2000001)),/grande demais/);
  assert.doesNotThrow(()=>validarFonteCSS('<div class="hidden">Teste</div>'));
});
