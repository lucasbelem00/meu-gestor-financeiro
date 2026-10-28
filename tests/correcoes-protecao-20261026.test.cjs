const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function anual(){const a=ambienteProtecao(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),personal('Atual',30)]));a.ativar();a.manter();return a;}
function pedido(backup,pre,id){return {backup,hashBackup:pre.hashBackup,versaoAtual:pre.versaoAtual,assinaturaAnuais:pre.recuperacaoAnual.assinatura,confirmacao:'RESTAURAR',confirmarRecuperacaoAnual:true,requestId:id};}

test('resumo adulterado do catálogo não altera os indicadores derivados dos arquivos anuais',()=>{
 const a=anual();assert.equal(a.carregar().kpis.totalGeral,'R$ 130,00');const cat=a.db.sheets['_Gestor_ArquivosAnuais'],r=JSON.parse(cat.rows[1][3]);r.pessoalCentavos=100;r.categoriasCentavos={Teste:100};cat.rows[1][3]=JSON.stringify(r);
 assert.equal(a.carregar().kpis.totalGeral,'R$ 130,00');assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');assert.equal(JSON.parse(cat.rows[1][3]).pessoalCentavos,100); // Não sobrescreve a alteração manual.
});

test('comprovante de resumo anual evita reler arquivos em aberturas sucessivas',()=>{
 const a=anual();let leituras=0;const open=a.ctx.SpreadsheetApp.openById;a.ctx.SpreadsheetApp.openById=id=>{if(id!=='fixture')leituras++;return open(id);};
 a.carregar();const primeira=leituras;a.carregar();a.carregar();assert.equal(leituras,primeira);
});

for(const cabecalho of [false,true])test('JSON completo recupera catálogo '+(cabecalho?'com cabeçalho danificado':'com resumo ilegível')+' somente após prévia e confirmação',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),cat=a.db.sheets['_Gestor_ArquivosAnuais'];cat.rows[1][3]='{invalido';if(cabecalho)cat.rows[0][0]='Cabeçalho alterado';const original=JSON.stringify(cat.rows),originalSerializado=JSON.stringify(a.ctx.serializarGestor_(cat.rows));
 const pre=api(a,'previaRestauracaoBackupWeb',{backup});assert.equal(pre.protocoloGestor,16);assert.equal(pre.recuperacaoAnual.catalogoDanificado,true);assert.equal(pre.recuperacaoAnual.necessaria,true);assert(pre.recuperacaoAnual.erroCatalogo);
 const p=pedido(backup,pre,'correcao-catalogo-'+cabecalho+'-001');assert.throws(()=>api(a,'restaurarBackupDadosWeb',{...p,confirmarRecuperacaoAnual:false}),/Confirme especificamente/);assert.equal(JSON.stringify(cat.rows),original);
 api(a,'restaurarBackupDadosWeb',p);assert.equal(a.carregar().kpis.totalGeral,'R$ 130,00');assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');
 const partes=a.ctx.obterParteCopiaRestauracaoWeb({copiaId:p.requestId,parte:1,quantidade:20}),copia=JSON.parse(partes.chunks.map(p=>p.chunk).join(''));assert.equal(JSON.stringify(copia.recuperacaoOrigem.catalogoOriginal),originalSerializado);assert(copia.recuperacaoOrigem.erroCatalogo);
});

test('recuperação de catálogo recusa JSON incompleto, referências ambíguas e prévia obsoleta',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),cat=a.db.sheets['_Gestor_ArquivosAnuais'];cat.rows[1][3]='{invalido';const parcial=clone(backup);parcial.arquivosAnuais=[];parcial.hashFinanceiro=a.ctx.assinaturaFinanceiraBackupProtecaoGestor_(parcial);assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup:parcial}),/JSON completo/);
 const pre=api(a,'previaRestauracaoBackupWeb',{backup}),p=pedido(backup,pre,'correcao-catalogo-obsoleto-001');cat.rows[1][5]='Mudança depois da prévia';assert.throws(()=>api(a,'restaurarBackupDadosWeb',p),/nova prévia/);
 cat.rows[1][1]='?';assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup}),/recuperação assistida/);assert.equal(cat.rows[1][3],'{invalido');
});

test('coluna extra em linha elegível bloqueia arquivamento antes de copiar ou remover qualquer linha',()=>{
 const antiga=personal('Antiga',100,'1/1','12/2025','Pago');antiga[18]='Observação manual a preservar';const a=ambienteProtecao(fixture([antiga,personal('Atual',30)]));a.ativar();const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows),arquivos=a.planilhas.size;
 assert.throws(()=>a.ctx.previaManutencaoProtegidaWeb(),/coluna|personaliza/i);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(a.planilhas.size,arquivos);assert(!a.db.sheets['_Gestor_ArquivosAnuais']);
});

test('colunas extras vazias não impedem arquivamento; conteúdo extra de linha retida fica intacto',()=>{
 const antiga=personal('Antiga',100,'1/1','12/2025','Pago');antiga[18]='';const atual=personal('Atual',30);atual[18]='Anotação atual';const a=ambienteProtecao(fixture([antiga,atual]));a.ativar();a.manter();assert.equal(a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Atual')[18],'Anotação atual');assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');
});
