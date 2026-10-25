const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {boot,fixture,personal,clone}=require('./fixtures/gestor-mocks.cjs');
function preparar(dados=fixture([personal()])) {const a=boot(dados);a.ctx.console={log(){}};a.ctx.executarAcaoApi_('getDadosCompletos',null);return a;}
function exportar(ctx){const b=ctx.executarAcaoApi_('exportarBackupDadosWeb',null);b.abas=b.abas.filter(a=>a.nome!=='_Gestor_Atividade').map(({exibidos,...a})=>a);return b;}
function entrada(b,id='importacao-segura-001') {const texto=JSON.stringify(b),partes=texto.match(/[\s\S]{1,12000}/g);return {texto,partes,ref:{importacaoId:id,hashImportacao:crypto.createHash('sha256').update(texto).digest('hex'),totalPartes:partes.length,bytes:Buffer.byteLength(texto)}};}
function enviar(ctx,e){ctx.iniciarImportacaoBackupWeb(e.ref);for(let i=0;i<e.partes.length;i+=24)ctx.enviarPartesBackupWeb({...e.ref,partes:e.partes.slice(i,i+24).map((chunk,n)=>({parte:i+n+1,chunk}))});return ctx.concluirImportacaoBackupWeb(e.ref);}
test('preparação interrompida retoma sem repetir partes nem tocar dados financeiros',()=>{
 const {ctx,db}=preparar(),b=exportar(ctx);b.abas.find(a=>a.nome==='Lançamentos').valores[1][1]='Compra recuperada';const e=entrada(b),antes=JSON.stringify(db.sheets['Lançamentos'].rows);
 ctx.iniciarImportacaoBackupWeb(e.ref);const pedido={...e.ref,partes:[{parte:1,chunk:e.partes[0]}]};
 db.failure={name:'_Gestor_Importacoes',stage:'after',col:1};assert.throws(()=>ctx.enviarPartesBackupWeb(pedido),/FALHA SIMULADA/);ctx.enviarPartesBackupWeb(pedido);
 assert.deepEqual(Array.from(ctx.iniciarImportacaoBackupWeb(e.ref).recebidas),[1]);assert.equal(db.sheets['_Gestor_Importacoes'].rows.length,3);
 ctx.concluirImportacaoBackupWeb(e.ref);assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
 const p=ctx.previaRestauracaoBackupWeb(e.ref);ctx.restaurarBackupDadosWeb({...e.ref,...p,confirmacao:'RESTAURAR',requestId:'restauracao-importada-001'});
 assert.equal(db.sheets['Lançamentos'].rows[1][1],'Compra recuperada');
});
test('partes faltantes, divergentes e arquivo adulterado são recusados sem substituir registros',()=>{
 const {ctx,db}=preparar(),b=exportar(ctx),e=entrada(b),antes=JSON.stringify(db.sheets['Lançamentos'].rows);ctx.iniciarImportacaoBackupWeb(e.ref);
 assert.throws(()=>ctx.concluirImportacaoBackupWeb(e.ref),/completo/);
 ctx.enviarPartesBackupWeb({...e.ref,partes:[{parte:1,chunk:e.partes[0]}]});
 assert.throws(()=>ctx.enviarPartesBackupWeb({...e.ref,partes:[{parte:1,chunk:e.partes[0]+' '}]}),/outro conteúdo/);
 db.sheets['_Gestor_Importacoes'].rows[2][4]=JSON.stringify(e.partes[0].replace('Compra','Outra!'));
 assert.throws(()=>ctx.concluirImportacaoBackupWeb(e.ref),/integridade/);assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
});
test('backup maior que o limite antigo restaura por referência e preserva cópia anterior verificável',()=>{
 const f=fixture([personal('Atual')]);f['Anotações']=[['ID','Texto','Concluída','Data','Versão','Excluída'],...Array.from({length:30},(_,i)=>['nota-'+i,'Texto '+i+' '+('á'.repeat(18000)),false,'16/10/2026',1,false])];
 const {ctx,db}=preparar(f),b=exportar(ctx);b.abas.find(a=>a.nome==='Lançamentos').valores[1][1]='Recuperado grande';const e=entrada(b,'importacao-grande-001');assert(e.ref.bytes>900000);assert(e.ref.bytes<8*1024*1024);
 enviar(ctx,e);const p=ctx.previaRestauracaoBackupWeb(e.ref),pedido={importacaoId:e.ref.importacaoId,hashImportacao:e.ref.hashImportacao,hashBackup:p.hashBackup,versaoAtual:p.versaoAtual,confirmacao:'RESTAURAR',requestId:'restauracao-grande-001'};
 ctx.restaurarBackupDadosWeb(pedido);assert.equal(db.sheets['Lançamentos'].rows[1][1],'Recuperado grande');assert.equal(db.sheets['Anotações'].rows.length,31);
 ctx.descartarImportacaoBackupWeb(e.ref);assert.doesNotThrow(()=>ctx.restaurarBackupDadosWeb(pedido));
 const copia=ctx.obterBackupAnteriorWeb({});assert.equal(copia.abas.find(a=>a.nome==='Lançamentos').valores[1][1],'Atual');assert.equal(copia.abas.find(a=>a.nome==='Anotações').valores.length,31);
});
test('referência incompleta, importação expirada e ID reaproveitado não autorizam restauração',()=>{
 const {ctx,db}=preparar(),e=entrada(exportar(ctx));ctx.iniciarImportacaoBackupWeb(e.ref);
 assert.throws(()=>ctx.previaRestauracaoBackupWeb(e.ref),/preparado|expirou/);
 assert.throws(()=>ctx.iniciarImportacaoBackupWeb({...e.ref,hashImportacao:'a'.repeat(64)}),/outro arquivo/);
 const r=db.sheets['_Gestor_Importacoes'].rows[1],m=JSON.parse(r[4]);m.expiraEm=Date.now()-1;r[4]=JSON.stringify(m);
 assert.throws(()=>ctx.iniciarImportacaoBackupWeb(e.ref),/expirou/);assert.equal(ctx.descartarImportacaoBackupWeb(e.ref).descartada,true);assert.equal(db.sheets['_Gestor_Importacoes'].rows.length,1);
});
test('descarte temporário mantém importação de outra página e diário financeiro',()=>{
 const {ctx,db}=preparar(),b=exportar(ctx),a=entrada(b,'importacao-pagina-A'),c=entrada(b,'importacao-pagina-B');enviar(ctx,a);enviar(ctx,c);const financeiro=clone(db.sheets['Lançamentos'].rows),diario=clone(db.sheets['_Gestor_Operacoes'].rows);
 ctx.descartarImportacaoBackupWeb(a.ref);assert.doesNotThrow(()=>ctx.previaRestauracaoBackupWeb(c.ref));assert.deepEqual(db.sheets['Lançamentos'].rows,financeiro);assert.deepEqual(db.sheets['_Gestor_Operacoes'].rows,diario);
});
test('exportação grande usa partes conferíveis, mantém snapshot e dispensa histórico técnico duplicado',()=>{
 const {ctx,db}=preparar(),antes=JSON.stringify(db.sheets['Lançamentos'].rows),ref=ctx.prepararExportacaoBackupWeb({importacaoId:'exportacao-backup-001'});const partes=[];
 for(let p=1;p<=ref.totalPartes;){const r=ctx.obterPartesImportacaoBackupWeb({...ref,parte:p,quantidade:20});partes.push(...r.chunks.map(c=>c.chunk));p=r.proximaParte;}
 const texto=partes.join(''),b=JSON.parse(texto);assert.equal(crypto.createHash('sha256').update(texto).digest('hex'),ref.hashImportacao);assert.equal(Buffer.byteLength(texto),ref.bytes);assert(!b.abas.some(a=>a.nome==='_Gestor_Atividade'));assert(!('exibidos' in b.abas[0]));assert.doesNotThrow(()=>ctx.previaRestauracaoBackupWeb({backup:b}));
 db.sheets['Lançamentos'].rows[1][1]='Mudança posterior';const ref2=ctx.prepararExportacaoBackupWeb({importacaoId:'exportacao-backup-001'});assert.equal(ref2.hashImportacao,ref.hashImportacao);db.sheets['Lançamentos'].rows[1][1]=JSON.parse(antes)[1][1];assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
 ctx.descartarImportacaoBackupWeb(ref);assert.equal(db.sheets['_Gestor_Importacoes'].rows.length,1);
});
