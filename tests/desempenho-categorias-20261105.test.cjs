const {test}=require('node:test'),assert=require('node:assert/strict');const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
test('consulta completa carrega perfis uma vez para várias categorias, preservando nomes e metas',()=>{const a=ambienteProtecao();a.carregar();const dash=a.db.sheets['Dashboard & Resumo'];dash.getRange(17,2,3,3).setValues([['Categoria A','',100],['Categoria B','',200],['Categoria C','',300]]);let leituras=0;const original=a.ctx.lerPerfisCategoriasGestor_;a.ctx.lerPerfisCategoriasGestor_=ss=>{leituras++;return original(ss);};const r=a.ctx.executarAcaoApi_('getDadosCompletos',{});assert.equal(leituras,1);for(const [nome,meta]of [['Categoria A',100],['Categoria B',200],['Categoria C',300]])assert.equal(r.configCategorias.find(c=>c.nome===nome).meta,meta);});

test('versão agrupada conserva o hash anterior, fórmulas e recusa alteração posterior',()=>{
 const a=ambienteProtecao();a.carregar();const sh=a.db.sheets['Dashboard & Resumo'];sh.getRange(17,2).setValue('Teste');sh.getRange(17,4).setValue('=100+1');
 const ler=rg=>{const v=rg.getValues(),f=rg.getFormulas();return v.map((r,i)=>r.map((x,j)=>f[i][j]||x));};
 const anterior=a.ctx.hashEstadoGestor_([ler(sh.getRange('B17:B41')).map(r=>r[0]),ler(sh.getRange('D17:D41')).map(r=>r[0]),[JSON.stringify(a.ctx.lerPerfisCategoriasGestor_(a.db))]]);
 assert.equal(a.ctx.versaoConfiguracaoGestor_(a.db,'categorias'),anterior);sh.getRange(17,4).setValue(200);assert.throws(()=>a.ctx.validarVersaoConfiguracaoGestor_(a.db,'categorias',{versaoConfiguracao:anterior}),/configuração mudou/);
});
