const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fonte=fs.readFileSync('interface/navegacao.js','utf8');
function ambiente(){
 const ferramentas=['emprestimos','rachadinha','simulador','calculadora','notas'],paginas=['anual','assinaturas','formas','categorias','atividade'];let selecionada='emprestimos',aberturas=0;
 const botoes=[...ferramentas.map(sub=>({dataset:{menuAba:'ferramentas',menuFerramenta:sub}})),...paginas.map(aba=>({dataset:{menuAba:aba}}))].map(b=>Object.assign(b,{attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}}));
 const c=vm.createContext({abaAtivaAtual:'ferramentas',document:{querySelectorAll:()=>botoes,getElementById:id=>({getAttribute:()=>id==='btn-sub-'+selecionada?'true':'false'})},abrirMenuMobile:()=>aberturas++});c.window=c;const i=fonte.indexOf('function sincronizarSelecaoCentralGestor('),f=fonte.indexOf('// Uma entrada temporária',i);assert(i>=0&&f>i);vm.runInContext(fonte.slice(i,f),c);
 return {c,botoes,escolher:s=>selecionada=s,get aberturas(){return aberturas;},ativos:()=>botoes.filter(b=>b.attrs['aria-current']==='page')};
}
test('reabrir a Central indica exatamente a ferramenta atual para as cinco ferramentas',()=>{
 const a=ambiente();for(const sub of ['simulador','calculadora','notas','rachadinha','emprestimos']){a.escolher(sub);a.c.abrirMenuMobile();assert.equal(a.ativos().length,1);assert.equal(a.ativos()[0].dataset.menuFerramenta,sub);}assert.equal(a.aberturas,5);
});
test('trocar de ferramenta ou aba retira o destaque anterior; página principal não marca atalho errado',()=>{
 const a=ambiente();a.escolher('simulador');a.c.abrirMenuMobile();a.c.abaAtivaAtual='formas';a.c.abrirMenuMobile();assert.equal(a.ativos().length,1);assert.equal(a.ativos()[0].dataset.menuAba,'formas');for(const aba of ['novo','dashboard','lancamentos','relatorio']){a.c.abaAtivaAtual=aba;a.c.abrirMenuMobile();assert.equal(a.ativos().length,0);}assert.equal(a.c.abaAtivaAtual,'relatorio');
});
test('abrir e reabrir preserva a localização sem depender de foco ou da cor do botão',()=>{
 const a=ambiente();a.escolher('notas');a.c.abrirMenuMobile();a.c.abrirMenuMobile();assert.equal(a.ativos().length,1);assert.equal(a.ativos()[0].dataset.menuFerramenta,'notas');assert.equal(a.c.abaAtivaAtual,'ferramentas');
});
test('todos os destinos da Central têm identificação; ações de exportação e Pix continuam ações',()=>{
 const html=fs.readFileSync('index.html','utf8'),i=html.indexOf('<div id="conteudoCentralNavegacao"'),f=html.indexOf('<div id="modalExportarDados"',i),bloco=html.slice(i,f);const bs=[...bloco.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]);assert.equal(bs.length,12);assert.equal(bs.filter(b=>b.includes('data-menu-aba=')).length,10);for(const sub of ['emprestimos','rachadinha','simulador','calculadora','notas'])assert(bs.some(b=>b.includes('data-menu-ferramenta="'+sub+'"')));for(const acao of ['abrirExportacaoDados()','abrirModalPixCobranca()'])assert(!bs.find(b=>b.includes(acao)).includes('data-menu-aba='));
});
