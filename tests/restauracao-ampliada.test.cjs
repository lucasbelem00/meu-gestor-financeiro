const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {boot,fixture,personal,loan,clone}=require('./fixtures/gestor-mocks.cjs');
function ambiente(lanc=[personal()],emp=[]){const a=boot(fixture(lanc,emp));a.ctx.console={log(){},warn(){}};a.ctx.executarAcaoApi_('getDadosCompletos',null);return a;}
function backup(ctx){const b=ctx.executarAcaoApi_('exportarBackupDadosWeb',null);b.abas=b.abas.filter(a=>a.nome!=='_Gestor_Atividade').map(a=>{const {exibidos,...resto}=a;return resto;});return b;}
const previa=(ctx,b)=>ctx.previaRestauracaoBackupWeb({backup:b});
const aplicar=(ctx,b,p,id)=>ctx.restaurarBackupDadosWeb({backup:b,...p,confirmacao:'RESTAURAR',requestId:id});

test('prévia discrimina cadastros, cancelados, banco e recebimentos sem misturar os saldos',()=>{
 const a=ambiente([personal('Ativa',100),personal('Cancelada',50,'1/1','10/2026','Assinatura Cancelada')],[loan('Ana','Recebido',70,'Cartao')]);
 a.db.sheets['Lançamentos'].rows[1][17]=20;
 const b=backup(a.ctx),p=previa(a.ctx,b),l=p.abas.find(x=>x.nome==='Lançamentos'),e=p.abas.find(x=>x.nome==='Empréstimos');
 assert.equal(l.backup.total,100);assert.equal(l.backup.pagoBanco,20);assert.equal(l.backup.saldoBanco,80);assert.equal(l.backup.valorCancelado,50);
 assert.equal(e.backup.recebido,70);assert.equal(e.backup.aReceber,0);assert.equal(e.backup.pagoBanco,0);assert.equal(e.backup.saldoBanco,70);
 assert.equal(p.abas.find(x=>x.nome==='Formas de Pagamento').backup.registros,2);assert.equal(p.abas.find(x=>x.nome==='Dashboard & Resumo').backup.registros,1);
 assert.equal(p.historicoPreservado,true);assert.equal(p.modo,'substituicao');assert.equal(l.diferencas.mantidos,2);
});

test('prévia usa IDs para separar inclusão, alteração e remoção antes de substituir',()=>{
 const a=ambiente([personal('Mudar'),personal('Remover')]),b=backup(a.ctx),r=b.abas.find(x=>x.nome==='Lançamentos');
 r.valores[1][1]='Corrigida';r.valores.splice(2,1);r.formulas.splice(2,1);const nova=clone(r.valores[1]);nova[1]='Nova';nova[11]='registro-novo';nova[12]='compra-nova';r.valores.push(nova);r.formulas.push(Array(nova.length).fill(''));
 const d=previa(a.ctx,b).abas.find(x=>x.nome==='Lançamentos').diferencas;
 assert.equal(d.incluidos,1);assert.equal(d.alterados,1);assert.equal(d.removidos,1);assert.equal(a.db.sheets['Lançamentos'].rows[1][1],'Mudar');
});

test('cópias anteriores têm catálogo, checksum e download em partes verificável',()=>{
 const a=ambiente([personal('Original')]),b=backup(a.ctx);aplicar(a.ctx,b,previa(a.ctx,b),'restaurar-catalogo-001');
 const c=a.ctx.listarCopiasRestauracaoWeb({});assert.equal(c.total,1);assert.equal(c.itens[0].id,'restaurar-catalogo-001');assert.equal(c.itens[0].integridade,'com_comprovante');assert.equal(c.itens[0].disponivel,true);
 const chunks=[];for(let i=1;i<=c.itens[0].partes;i++){const p=a.ctx.obterParteCopiaRestauracaoWeb({copiaId:c.itens[0].id,parte:i});assert.equal(p.parte,i);assert.equal(p.totalPartes,c.itens[0].partes);chunks.push(p.chunk);}
 assert.equal(crypto.createHash('sha256').update(chunks.join('')).digest('hex'),c.itens[0].hashCopia);
 assert.equal(a.ctx.obterBackupAnteriorWeb({copiaId:c.itens[0].id}).formato,'gestor-financeiro-backup-v1');
 assert.throws(()=>a.ctx.obterParteCopiaRestauracaoWeb({copiaId:c.itens[0].id,parte:0}),/Parte.*inválida/);
});

test('alteração ainda JSON válido e truncamento da cópia não passam pela conferência',()=>{
 const a=ambiente([personal('Original '+ 'A'.repeat(25000))]),b=backup(a.ctx);aplicar(a.ctx,b,previa(a.ctx,b),'restaurar-checksum-001');
 const sh=a.db.sheets['_Gestor_Restauracoes'],linha=sh.rows[1];assert(sh.rows.length>3);
 const original=linha[3];linha[3]=original.replace('Original','Trocada');assert.throws(()=>a.ctx.obterBackupAnteriorWeb({}),/integridade não confere/);linha[3]=original;
 sh.rows.pop();const c=a.ctx.listarCopiasRestauracaoWeb({});assert.equal(c.itens[0].disponivel,false);assert.match(c.itens[0].motivo,/incompleta/);assert.throws(()=>a.ctx.obterBackupAnteriorWeb({}),/incompleta/);
});

test('restauração interrompida na cópia anterior não altera finanças e retoma sem duplicar',()=>{
 const a=ambiente([personal('Original')]),b=backup(a.ctx),r=b.abas.find(x=>x.nome==='Lançamentos');r.valores[1][1]='Restaurada';
 const p=previa(a.ctx,b),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);a.db.failure={name:'_Gestor_Restauracoes',stage:'after',col:1};
 assert.throws(()=>aplicar(a.ctx,b,p,'restaurar-falha-copia-001'),/FALHA SIMULADA/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
 const qtd=a.db.sheets['_Gestor_Restauracoes'].rows.length;aplicar(a.ctx,b,p,'restaurar-falha-copia-001');assert.equal(a.db.sheets['_Gestor_Restauracoes'].rows.length,qtd);assert.equal(a.db.sheets['Lançamentos'].rows[1][1],'Restaurada');
});

test('nova restauração não lê nem regrava o conteúdo das cópias históricas',()=>{
 const a=ambiente(),b=backup(a.ctx);aplicar(a.ctx,b,previa(a.ctx,b),'restaurar-anexo-001');
 const sh=a.db.sheets['_Gestor_Restauracoes'];sh.getDataRange=()=>{throw Error('Cópias históricas não devem entrar no snapshot');};
 const p=previa(a.ctx,b);aplicar(a.ctx,b,p,'restaurar-anexo-002');const c=a.ctx.listarCopiasRestauracaoWeb({});assert.equal(c.total,2);assert.equal(c.itens[1].id,'restaurar-anexo-001');
 assert.equal(a.ctx.obterBackupAnteriorWeb({copiaId:'restaurar-anexo-001'}).formato,'gestor-financeiro-backup-v1');
});

test('cópia legada continua acessível com indicação explícita de ausência de comprovante',()=>{
 const a=ambiente(),b=backup(a.ctx),texto=JSON.stringify(b),sh=a.db.insertSheet('_Gestor_Restauracoes');
 sh.rows=[['Operação','Data','Parte','Conteúdo'],['legado-001','2026-10-24',1,JSON.stringify(texto)]];
 assert.equal(a.ctx.listarCopiasRestauracaoWeb({}).itens[0].integridade,'legado');assert.equal(a.ctx.obterBackupAnteriorWeb({}).formato,b.formato);
});

test('backup acima de900KB passa na prévia até8MB sem perder notas ou identidades',()=>{
 const a=ambiente(),b=backup(a.ctx),valores=[['ID','Texto','Concluída','Data','Versão','Excluída']];
 for(let i=0;i<40;i++)valores.push(['nota-'+i,'Texto '.repeat(4000),false,'24/10/2026',1,false]);b.abas.push({nome:'Anotações',valores});
 assert(Buffer.byteLength(JSON.stringify(b))>900000);const p=previa(a.ctx,b);assert.equal(p.abas.find(x=>x.nome==='Anotações').backup.ativas,40);
 const grande=clone(b);grande.extra='x'.repeat(8*1024*1024);assert.throws(()=>previa(a.ctx,grande),/8 MB/);
});

test('frações de centavo, status desconhecido e pagamento incoerente são recusados sem escrita',()=>{
 const a=ambiente(),b=backup(a.ctx),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);
 for(const mudar of [r=>r[7]=49.999,r=>r[9]='Talvez pago',r=>{r[9]='Pago';r[17]=10;},r=>r[14]='Recebido']){const c=clone(b);mudar(c.abas.find(x=>x.nome==='Lançamentos').valores[1]);assert.throws(()=>previa(a.ctx,c),/centavo|Situação|Pagamento|Estado/);}
 assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
});
