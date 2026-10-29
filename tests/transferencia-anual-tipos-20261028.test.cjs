const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambienteProtecao,fixture,personal,loan}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function simularConversaoRegional(db,locale='en_US'){
 db.getSpreadsheetLocale=()=>locale;
 const inserir=db.insertSheet.bind(db);
 function envolver(sh){if(!['Lançamentos','Empréstimos'].includes(sh.name)||sh.regional)return sh;sh.regional=true;
  const get=sh.getRange.bind(sh);sh.getRange=(...args)=>{const rg=get(...args),set=rg.setValues.bind(rg),linha=typeof args[0]==='number'?args[0]:1,coluna=typeof args[1]==='number'?args[1]:1;
   rg.setValues=values=>set(values.map((r,i)=>r.map((v,j)=>{if(linha+i<2||typeof v!=='string')return v;const c=coluna+j-1;
    // A simulação legada remove a proteção que passou a ser obrigatória.
    if(db.gravacaoLegada&&[0,6,8].includes(c)&&v.startsWith("'"))v=v.slice(1);
    if(v.startsWith("'"))return v;
    let p=v.match(/^(\d{1,2})\/(\d{4})$/);if(p&&+p[1]>=1&&+p[1]<=12)return new Date(+p[2],+p[1]-1,1);
    p=v.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);if(!p)return v;const us=db.getSpreadsheetLocale()==='en_US',mes=+(us?p[1]:p[2]),dia=+(us?p[2]:p[1]);if(mes<1||mes>12||dia<1||dia>31)return v;return new Date(p[3]?+p[3]:2026,mes-1,dia);
   })));
   rg.setValue=v=>rg.setValues([[v]]);return rg;
  };return sh;
 }
 Object.values(db.sheets).forEach(envolver);db.insertSheet=n=>envolver(inserir(n));
}
function ambiente(locale='en_US',parcela='1/1'){
 const p=personal('Compra fictícia',25,parcela);p[5]=+parcela.split('/')[1];p[4]=p[5]*25;
 const a=ambienteProtecao(fixture([p],[loan('Pessoa fictícia','A Receber',40,'Cartao')]));a.ativar();
 const criar=a.ctx.SpreadsheetApp.create;a.ctx.SpreadsheetApp.create=n=>{const db=criar(n);simularConversaoRegional(db,locale);return db;};return a;
}
function interrompido(locale='en_US',parcela='1/1'){
 const a=ambiente(locale,parcela),c=a.ctx.configProtecaoGestor_();c.organizacaoAnual=true;c.pdfAutomatico=true;a.ctx.salvarConfigProtecaoGestor_(c);
 const e=a.ctx.garantirAnoGestor_(a.db,2026),db=a.planilhas.get(e.id);db.gravacaoLegada=true;
 assert.throws(()=>api(a,'getDadosCompletos'),/ainda não corresponde/);db.gravacaoLegada=false;
 assert(db.sheets['Lançamentos'].rows[1][6] instanceof Date);assert.equal(a.db.sheets['Lançamentos'].getLastRow(),2);
 return {a,e,db};
}

test('conversão regional reproduz a transferência pendente e o erro de registro repetido',()=>{
 const {a}=interrompido();a.ctx.recuperarTextosTransferenciaAnualGestor_=()=>{};
 assert.throws(()=>api(a,'getDadosCompletos'),/Registro repetido entre os anos/);
});

test('retomada confere origem e plano, repara somente formatos e conclui sem duplicar',()=>{
 const {a,db}=interrompido(),ids=['Lançamentos','Empréstimos'].map(n=>a.db.sheets[n].rows[1][11]);
 const r=api(a,'getDadosCompletos');assert.equal(r.protocoloGestor,16);assert.equal(r.integridade.bloqueada,false);
 assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).total,65);
 for(const [i,n]of ['Lançamentos','Empréstimos'].entries()){assert.equal(a.db.sheets[n].getLastRow(),1);assert.equal(db.sheets[n].getLastRow(),2);assert.equal(db.sheets[n].rows[1][11],ids[i]);assert.equal(typeof db.sheets[n].rows[1][6],'string');assert.equal(typeof db.sheets[n].rows[1][8],'string');}
 assert.equal(a.db.sheets['_Gestor_Operacoes'].rows.filter(r=>r[2]==='PRONTO').length,0);api(a,'getDadosCompletos');assert.equal(db.sheets['Lançamentos'].getLastRow(),2);
});

for(const locale of ['en_US','pt_BR'])test('recupera parcela 2/5 interpretada como data em '+locale+' sem inverter a parcela',()=>{
 const {a,db}=interrompido(locale,'2/5');api(a,'getDadosCompletos');assert.equal(db.sheets['Lançamentos'].rows[1][6],'2/5');assert.equal(db.sheets['Lançamentos'].rows[1][8],'10/2026');assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');
});

for(const alvo of ['valor','id','mes','origem','linha extra'])test('retomada não encobre divergência real: '+alvo,()=>{
 const {a,db}=interrompido(),destino=db.sheets['Lançamentos'];
 if(alvo==='valor')destino.rows[1][7]=99;if(alvo==='id')destino.rows[1][11]='id-externo-divergente';if(alvo==='mes')destino.rows[1][8]=new Date(2026,10,1);if(alvo==='origem')a.db.sheets['Lançamentos'].rows[1][7]=99;if(alvo==='linha extra')destino.rows.push([...destino.rows[1]]);
 const origemAntes=JSON.stringify(a.db.sheets['Lançamentos'].rows),destinoAntes=JSON.stringify(destino.rows);
 let bloqueado=false;try{bloqueado=api(a,'getDadosCompletos').integridade.bloqueada;}catch(_){bloqueado=true;}assert.equal(bloqueado,true);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),origemAntes);assert.equal(JSON.stringify(destino.rows),destinoAntes);assert(a.db.sheets['_Gestor_Operacoes'].rows.some(r=>r[2]==='PRONTO'));
});

test('interrupção no reparo de formato retoma as células restantes sem apagar a origem',()=>{
 const {a,db}=interrompido();db.failure={name:'Lançamentos',stage:'after',row:2,col:7};
 assert.throws(()=>api(a,'getDadosCompletos'));assert.equal(a.db.sheets['Lançamentos'].getLastRow(),2);
 api(a,'getDadosCompletos');assert.equal(a.db.sheets['Lançamentos'].getLastRow(),1);assert.equal(db.sheets['Lançamentos'].getLastRow(),2);assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');
});

for(const locale of ['en_US','pt_BR'])test('gravação e restauração conservam texto, números e Date com configuração '+locale,()=>{
 const a=ambiente(),criar=a.ctx.SpreadsheetApp.create;a.ctx.SpreadsheetApp.create=n=>{const db=criar(n);db.getSpreadsheetLocale=()=>locale;return db;};a.ctx.ativarOrganizacaoAnualWeb();
 const e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026),db=a.planilhas.get(e.id);
 assert.equal(typeof db.sheets['Lançamentos'].rows[1][6],'string');assert.equal(typeof db.sheets['Lançamentos'].rows[1][8],'string');assert.equal(typeof db.sheets['Lançamentos'].rows[1][7],'number');
 const backup=JSON.parse(JSON.stringify(api(a,'exportarBackupDadosWeb',{restauravel:true}))),p=api(a,'previaRestauracaoBackupWeb',{backup});api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:p.versaoAtual,hashBackup:p.hashBackup,confirmacao:'RESTAURAR',requestId:'restore-regional-text-'+locale});
 assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).total,65);
 const real=a.planilhas.get(a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026).id).sheets['Lançamentos'];const r=[...real.rows[1]];r[0]=new Date(2026,9,5);a.ctx.gravarMatrizProtecaoGestor_(real,[real.rows[0],r]);assert(real.rows[1][0] instanceof Date);assert.equal(typeof real.rows[1][6],'string');
});

test('status da proteção informa a versão sem carregar nem modificar registros financeiros',()=>{
 const {a}=interrompido(),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);const r=api(a,'obterStatusProtecaoWeb');assert.equal(r.protocoloGestor,16);assert.equal(r.ativo,true);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
});

test('leitura e exportação anual distinguem data, parcela e competência armazenadas como Date',()=>{
 const r=personal('Compra fictícia',25);r[0]=new Date(2026,9,1);r[6]=new Date(2026,0,1);r[8]=new Date(2026,9,1);
 const a=ambienteProtecao(fixture([r]));a.ativar();a.ctx.ativarOrganizacaoAnualWeb();
 const valores=a.ctx.folhaLeituraAnualGestor_(a.db,'Lançamentos').getRange(2,1,1,18).getDisplayValues()[0];assert.equal(valores[0],'01/10/2026');assert.equal(valores[6],'1/1');assert.equal(valores[8],'10/2026');
 assert.equal(api(a,'obterRelatorioMes','10/2026').lancamentos[0][6],'1/1');const backup=api(a,'exportarBackupDadosWeb',{});assert.equal(backup.abas.find(x=>x.nome==='Lançamentos').exibidos[1][6],'1/1');
});

test('painel permite consultar situação com protocolo ainda desconhecido, sem liberar mutações antigas',async()=>{
 const source=fs.readFileSync('interface/protecao.js','utf8'),ini=source.indexOf('  function disponibilidade('),fim=source.indexOf('  function controles()',ini);
 const c=vm.createContext({navigator:{onLine:true},protocoloServidorGestor:0});vm.runInContext(source.slice(ini,fim),c);assert.doesNotThrow(()=>c.disponibilidade(false));assert.throws(()=>c.disponibilidade(true),/Atualize/);
 const html=fs.readFileSync('index.html','utf8'),p=html.indexOf('    function registrarIdentidadesGestor('),end=html.indexOf('    function prepararMutacaoGestor(',p);c.identidadesRegistrosGestor=new Map();vm.runInContext(html.slice(p,end),c);c.registrarIdentidadesGestor('obterStatusProtecaoWeb',{protocoloGestor:16},true);assert.equal(c.protocoloServidorGestor,16);assert.doesNotThrow(()=>c.disponibilidade(true));
 assert(source.includes('consultar.onclick=()=>acao(async()=>{},false)'));
});
