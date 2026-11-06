const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal}=require('./fixtures/gestor-mocks.cjs');
test('metadados anuais do resultado usam catálogo da própria fotografia; outra origem relê',()=>{
 const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs'),a=ambienteProtecao(fixture());a.ativar();a.ctx.garantirAnoGestor_(a.db,2026);
 const catalogo=a.ctx.catalogoAnosGestor_(a.db),original=a.ctx.catalogoAnosGestor_;let leituras=0;
 a.ctx.catalogoAnosGestor_=ss=>{leituras++;return original(ss);};
 const ctx={ssReal:a.db,ss:{abas:{}},leituraFinanceiraInicial:{ss:a.db,catalogo}};
 a.ctx.informarOrigemAnualResultadoGestor_({sucesso:true},ctx);assert.equal(leituras,0);
 ctx.leituraFinanceiraInicial.ss={};a.ctx.informarOrigemAnualResultadoGestor_({sucesso:true},ctx);assert.equal(leituras,1);
});
function virtual(){
 const r=personal('Compra',10);r[0]=new Date(2026,9,16);r[7]='=10';
 const a=boot(fixture([r])),ctx={action:'getDadosCompletos',param:{},idsIniciais:new Set(),registrosIniciais:Object.create(null),ssReal:a.db};
 ctx.ss=a.ctx.criarPlanilhaVirtualGestor_(a.db,ctx);
 return {...a,sh:ctx.ss.getSheetByName('Lançamentos')};
}
test('leitura virtual compartilha valores com exibição sem segunda cópia da matriz',()=>{
 const a=virtual(),range=a.sh.getRange;let leituras=0;
 a.sh.getRange=function(...args){const r=range.apply(this,args),ler=r.getValues;r.getValues=()=>{leituras++;return ler();};return r;};
 const l=a.ctx.lerAbaCompleta(a.sh,11);assert.equal(leituras,1);assert.equal(l.raw[0][7],10);assert.equal(l.disp[0][0],'16/10/2026');assert.equal(l.disp[0][7],'10');
 assert.equal(l.raw[0][0] instanceof Date,true);assert.equal(l.raw[0].length,18);
});
test('exibição pública da camada virtual e valores editados preservam o mesmo formato',()=>{
 const a=virtual(),l=a.ctx.lerAbaCompleta(a.sh,18);const exibido=a.sh.getRange(2,1,1,18).getDisplayValues();
 assert.equal(exibido[0][0],l.disp[0][0]);assert.equal(exibido[0][7],l.disp[0][7]);
 a.sh.getRange(2,2).setValue('Corrigido');a.sh.getRange(2,8).setValue(20);
 const novo=a.ctx.lerAbaCompleta(a.sh,18);assert.equal(novo.raw[0][7],20);assert.equal(novo.disp[0][7],'20');assert.equal(novo.disp[0][1],'Corrigido');
 assert.equal(a.db.sheets['Lançamentos'].rows[1][1],'Compra');
});
test('aba real conserva consulta nativa de exibição e ausência continua vazia',()=>{
 const a=boot(fixture([personal('Compra',10)])),sh=a.db.sheets['Lançamentos'],range=sh.getRange;let leituras=0,exibicoes=0,ultimas=0;
 const ultima=sh.getLastRow;sh.getLastRow=function(){ultimas++;return ultima.call(this);};
 sh.getRange=function(...args){const r=range.apply(this,args),ler=r.getValues,exibir=r.getDisplayValues;r.getValues=()=>{leituras++;return ler();};r.getDisplayValues=()=>{exibicoes++;return exibir();};return r;};
 const l=a.ctx.lerAbaCompleta(sh,18);assert.equal(l.raw.length,1);assert.equal(leituras,1);assert.equal(exibicoes,1);assert.equal(ultimas,1);
 const vazio=a.ctx.lerAbaCompleta(null,18);assert.equal(vazio.raw.length,0);assert.equal(vazio.disp.length,0);
});
