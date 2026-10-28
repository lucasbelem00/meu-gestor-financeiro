const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,loan}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
const rows=(a,n)=>a.ctx.matrizFinanceiraAnualGestor_(a.db,n).slice(1);
function ambiente(mes=new Date(2026,9,1)){
 const p=personal('Despesa fictícia',25),e=loan('Pessoa fictícia','A Receber',40,'Cartao');p[8]=mes;e[8]=mes;
 const a=ambienteProtecao(fixture([p],[e]));a.ativar();return a;
}

test('ativação e relatórios aceitam competência Date em gastos pessoais e empréstimos sem converter a origem',()=>{
 const a=ambiente(),origem=rows(a,'Lançamentos')[0][8].getTime();a.ctx.ativarOrganizacaoAnualWeb();
 assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');assert.equal(api(a,'obterRelatorioAnual','2026').total,'R$ 25,00');
 assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).total,65);
 for(const n of ['Lançamentos','Empréstimos']){assert.equal(a.db.sheets[n].getLastRow(),1);const r=rows(a,n)[0];assert(r[8] instanceof Date);assert.equal(r[8].getTime(),origem);}
});

test('Mensal volta a carregar após ativação interrompida pelo leitor antigo de competências',()=>{
 const a=ambiente(),leitor=a.ctx.parseMesFat;
 a.ctx.parseMesFat=v=>v instanceof Date?{m:0,a:0,time:0}:leitor(v);
 assert.throws(()=>a.ctx.ativarOrganizacaoAnualWeb(),/Competência anual inválida/);assert.equal(a.ctx.configProtecaoGestor_().organizacaoAnual,true);
 const ids=rows(a,'Lançamentos').concat(rows(a,'Empréstimos')).map(r=>r[11]);a.ctx.parseMesFat=leitor;
 assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');
 const depois=rows(a,'Lançamentos').concat(rows(a,'Empréstimos'));assert.equal(depois.length,2);assert.deepEqual(Array.from(depois.map(r=>r[11])),Array.from(ids));
 assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 25,00');assert.equal(rows(a,'Lançamentos').length,1);
});

test('ativação em segundo plano retoma o mesmo trabalho após corrigir competência Date',()=>{
 const a=ambiente(),criar=a.ctx.ScriptApp.newTrigger;a.ctx.ScriptApp.newTrigger=n=>{const b=criar(n);b.after=()=>b;return b;};a.ctx.ScriptApp.deleteTrigger=t=>a.gatilhos.splice(a.gatilhos.indexOf(t),1);
 const id=api(a,'ativarOrganizacaoAnualWeb',{}).ativacaoAnual.id,leitor=a.ctx.parseMesFat;a.ctx.parseMesFat=v=>v instanceof Date?{m:0,a:0,time:0}:leitor(v);
 assert.throws(()=>a.ctx.retomarAtivacaoAnualGestor(),/Competência anual inválida/);assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'ERRO');a.ctx.parseMesFat=leitor;
 assert.equal(api(a,'ativarOrganizacaoAnualWeb',{}).ativacaoAnual.id,id);a.ctx.retomarAtivacaoAnualGestor();assert.equal(a.ctx.statusAtivacaoAnualGestor_().estado,'CONCLUIDA');
 assert.equal(rows(a,'Lançamentos').length,1);assert.equal(rows(a,'Empréstimos').length,1);assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}).total,65);
});

test('competência Date preserva ano fechado, pagamentos tardios e restauração JSON v3',()=>{
 const a=ambiente(new Date(2025,11,1));a.ctx.ativarOrganizacaoAnualWeb();a.ctx.cicloAnualGestor_(a.db,a.pasta);
 const e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2025);assert.equal(e.estado,'FECHADO');const retrato=JSON.stringify(a.ctx.dadosAnoGestor_(e)),hash=e.hash;
 const f=api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'});assert.equal(f.total,65);api(a,'registrarPagamentoFaturaWeb',{...f,valor:65,requestId:'date-annual-bank-payment-001'});
 const r=rows(a,'Empréstimos')[0];assert.equal(r[9],'A Receber');api(a,'alternarStatusEmprestimoWeb',{registroId:r[11],compraId:r[12],versao:r[13],statusDesejado:'Recebido',requestId:'date-annual-person-receipt-001'});
 assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),retrato);assert.equal(a.ctx.catalogoAnosGestor_(a.db).find(x=>x.ano===2025).hash,hash);
 const backup=JSON.parse(JSON.stringify(api(a,'exportarBackupDadosWeb',{restauravel:true})));assert.equal(backup.formato,'gestor-financeiro-backup-v3');
 const previa=api(a,'previaRestauracaoBackupWeb',{backup});api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:previa.versaoAtual,hashBackup:previa.hashBackup,confirmacao:'RESTAURAR',requestId:'date-annual-restore-001'});
 a.planilhas.delete(e.id);assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 25,00');assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'}).restante,0);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');
});

test('leitor de competência usa o fuso do projeto na fronteira do mês e do ano',()=>{
 const a=ambiente(),formatar=a.ctx.Utilities.formatDate;let chamadas=0;
 a.ctx.Utilities.formatDate=(d,t,f)=>{if(f!=='MM/yyyy')return formatar(d,t,f);assert.equal(t,'America/Sao_Paulo');chamadas++;const p=new Intl.DateTimeFormat('en',{timeZone:t,month:'2-digit',year:'numeric'}).formatToParts(d);return p.find(x=>x.type==='month').value+'/'+p.find(x=>x.type==='year').value;};
 for(const [iso,mes,ano]of [['2027-01-01T00:30:00Z',12,2026],['2027-01-01T03:30:00Z',1,2027],['2026-11-01T00:30:00Z',10,2026]]){const r=a.ctx.parseMesFat(new Date(iso));assert.equal(r.m,mes);assert.equal(r.a,ano);}
 assert.equal(chamadas,3);for(const texto of ['10/2026',"'10/2026",'1/2027'])assert(a.ctx.parseMesFat(texto).a>=2026);
});

test('data inválida e mês fora do calendário não são convertidos em competência válida',()=>{
 const a=ambiente();for(const valor of [new Date(NaN),'00/2026','13/2026','sem mês']){const r=a.ctx.parseMesFat(valor);assert.equal(r.m,0);assert.equal(r.a,0);assert.equal(r.time,0);}
});

for(const nome of ['Lançamentos','Empréstimos'])test('mês inválido em '+nome+' é recusado antes de mover registros da base',()=>{
 const a=ambiente();a.db.sheets[nome].rows[1][8]='13/2026';const antes=JSON.stringify(a.db.sheets[nome].rows);
 assert.throws(()=>a.ctx.ativarOrganizacaoAnualWeb(),/Mês da fatura inválido/);
 assert.equal(JSON.stringify(a.db.sheets[nome].rows),antes);assert.equal(a.db.sheets['Lançamentos'].getLastRow(),2);assert.equal(a.db.sheets['Empréstimos'].getLastRow(),2);
 for(const [id,db]of a.planilhas)if(id!=='fixture')for(const n of ['Lançamentos','Empréstimos'])assert.equal(db.sheets[n]?.getLastRow(),1);
});
