const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambienteProtecao,fixture,personal,loan,launch}=require('./fixtures/protecao-mocks.cjs');
function anual(dados=fixture([personal('Compra',25)])){const a=ambienteProtecao(dados);a.ativar();a.ctx.ativarOrganizacaoAnualWeb();return a;}
function destino(a,ano=2026){return a.planilhas.get(a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===ano).id);}
test('novas bases herdam região e fuso e reaproveitam a aba inicial vazia como resumo',()=>{
 const a=ambienteProtecao(fixture()),criar=a.ctx.SpreadsheetApp.create,opcoes=[];a.ativar();a.db.getSpreadsheetTimeZone=()=> 'America/Fortaleza';a.db.getSpreadsheetLocale=()=> 'pt_BR';
 a.ctx.SpreadsheetApp.create=nome=>{const d=criar(nome),s=d.insertSheet('Página1');s.setName=n=>{delete d.sheets[s.name];s.name=n;d.sheets[n]=s;return s;};d.setSpreadsheetTimeZone=v=>opcoes.push(v);d.setSpreadsheetLocale=v=>opcoes.push(v);return d;};
 a.ctx.ativarOrganizacaoAnualWeb();assert(opcoes.includes('America/Fortaleza'));assert(opcoes.includes('pt_BR'));assert.equal(destino(a).getSheetByName('Página1'),null);assert(destino(a).getSheetByName('Dashboard & Resumo'));
});
test('base anual recebe resumo de doze meses somente daquele ano, sem copiar controle',()=>{
 const a=anual(),d=destino(a),s=d.getSheetByName('Dashboard & Resumo');assert(s);assert.equal(s.rows[0][4],'CONFIRMADO');assert.deepEqual(s.rows.slice(8,20).map(r=>r[0]),Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')+'/2026'));assert.match(s.getRange(9,3).getFormulas()[0][0],/Lançamentos.*R2:R/);assert(!JSON.stringify(s.rows).includes('TODAY'));assert.equal(d.getSheetByName('Formas de Pagamento'),null);assert.equal(d.getSheetByName('_Gestor_Operacoes'),null);
});
test('apresentação de ano fechado preserva datas nativas, identificações e comprovante financeiro',()=>{
 const p=personal('Antiga',25,'1/1',new Date(2025,9,1),'Pago','Cartao',new Date(2025,9,5)),a=anual(fixture([p]));const e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2025),antes=JSON.stringify(a.ctx.dadosAnoGestor_(e));a.ctx.prepararApresentacaoAnoGestor_(a.db,destino(a,2025),2025,'FECHADO');assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),antes);assert.equal(a.ctx.hashGestor_(a.ctx.dadosAnoGestor_(e)),e.hash);assert.match(destino(a,2025).getSheetByName('Dashboard & Resumo').rows[2][0],/Fechado/);
});
test('fórmulas do resumo normalizam datas nativas e reconhecem quitação integral pelo status',()=>{
 const a=anual(),d=destino(a),formulas=d.getSheetByName('Dashboard & Resumo').getRange(9,2,1,2).getFormulas()[0];assert(formulas.every(f=>f.includes('ISNUMBER')&&f.includes('TEXT(')));assert(formulas[1].includes('pago (cancelada)'));assert(formulas[1].includes('assinatura paga'));assert(formulas[1].includes('H2:H'));assert(formulas[1].includes('R2:R'));assert(formulas.every(f=>f.startsWith('=IFNA(')));
});
test('falha durante o resumo derivado pode ser retomada sem duplicar ou alterar dados financeiros',()=>{
 for(const stage of ['before','after']){const a=anual(),d=destino(a),antes=JSON.stringify(d.sheets['Lançamentos'].rows);d.failure={name:'Dashboard & Resumo',stage,row:2};assert.throws(()=>a.ctx.atualizarResumoVisualAnualGestor_(d,2026,'FECHADO'),/FALHA SIMULADA/);a.ctx.atualizarResumoVisualAnualGestor_(d,2026,'FECHADO');assert.equal(d.sheets['Dashboard & Resumo'].rows[0][4],'CONFIRMADO');assert.equal(JSON.stringify(d.sheets['Lançamentos'].rows),antes);}
});
test('separadores normalizados pelo Sheets não são confundidos com personalização do resumo',()=>{
 const a=anual(),d=destino(a),s=d.sheets['Dashboard & Resumo'],original=s.getRange.bind(s);s.getRange=(...args)=>{const rg=original(...args),f=rg.getFormulas;rg.getFormulas=()=>f().map(r=>r.map(x=>x.replace(/;/g,',')));return rg;};assert.doesNotThrow(()=>a.ctx.atualizarResumoVisualAnualGestor_(d,2026,'ABERTO'));s.rows[8][1]='=SUM(H999:H1000)';assert.throws(()=>a.ctx.atualizarResumoVisualAnualGestor_(d,2026,'ABERTO'),/personalizado/);
});
test('personalização do resumo fica preservada e seu aviso não bloqueia novas compras',()=>{
 const a=anual(),d=destino(a);d.sheets['Dashboard & Resumo'].rows[1][0]='Meu resumo particular';a.ctx.cicloAnualGestor_(a.db,a.pasta);assert.match(a.ctx.configProtecaoGestor_().avisoApresentacaoAnual,/personalizado/);assert.equal(d.sheets['Dashboard & Resumo'].rows[1][0],'Meu resumo particular');a.ctx.executarAcaoApi_('salvarLancamentoWeb',{...launch,numParcelas:1,requestId:'compra-com-resumo-particular-001'});assert.equal(a.ctx.executarAcaoApi_('obterRelatorioMes','10/2026').kpis.total,'R$ 125,00');assert.match(a.ctx.obterStatusProtecaoWeb().avisoApresentacaoAnual,/personalizado/);
});
test('backup aceita mais de 201 anos válidos dentro do intervalo e mantém o teto de células',()=>{
 const a=ambienteProtecao(fixture());a.carregar();const base=a.ctx.executarAcaoApi_('exportarBackupDadosWeb',{restauravel:true}),financeiras=base.abas.filter(x=>['Lançamentos','Empréstimos'].includes(x.nome));const b={...base,formato:'gestor-financeiro-backup-v3',anos:Array.from({length:202},(_,i)=>({ano:1900+i,estado:'ABERTO',dados:{ano:1900+i,abas:financeiras}}))};b.hashOrganizacao=a.ctx.assinaturaBackupAnualGestor_(b);assert.equal(a.ctx.validarBackupAnualGestor_(b).anos.length,202);
});
function agenda(){const c=vm.createContext({window:{renderizarDados(){},setAba(){}},document:{addEventListener(){}},lerValorMoeda:Number});vm.runInContext(fs.readFileSync('shared/competencias.js','utf8'),c);const p=fs.readFileSync('interface/painel.js','utf8');vm.runInContext(p.slice(p.indexOf('function diaDevolucaoPainelGestor('),p.indexOf('function listarDevolucoesPainelGestor(')),c);vm.runInContext(fs.readFileSync('interface/agenda.js','utf8'),c);return c;}
test('Agenda separa banco de devolução, exclui recebidos, sem data e valores só previstos',()=>{
 const c=agenda(),dados={formasPagamento:[{nome:'Cartao',tipo:'cartao',vencimento:31},{nome:'Pix',tipo:'pix',vencimento:5}],faturas:{horizonte:{saldoBanco:{Cartao:{'02/2026':50,'03/2026':0},Pix:{'02/2026':100}},previstoPessoal:{Cartao:{'03/2026':900}}}},emprestimos:{itens:[{registroId:'a',pessoa:'Ana',descricao:'Jantar',status:'A Receber',mesFatura:'01/2026',dataCombinada:'05/03/2026',valorRaw:20},{pessoa:'B',status:'Recebido',dataCombinada:'05/03/2026',valorRaw:20},{pessoa:'C',status:'A Receber',dataCombinada:'',valorRaw:20}]}};
 const e=c.compromissosAgendaGestor(dados);assert.equal(e.length,2);assert.equal(e[0].data,'28/02/2026');assert.equal(e[0].valor,50);assert.equal(e[1].data,'05/03/2026');assert.equal(e[1].mesFatura,'01/2026');assert.equal(e[1].tipo,'devolucao');assert.equal(dados.faturas.horizonte.previstoPessoal.Cartao['03/2026'],900);
});
test('Agenda limita mês/ano e ajusta o vencimento no fevereiro bissexto',()=>{
 const c=agenda();for(const m of ['2026-00','2026-13','2926-01','abc'])assert.equal(c.mesAgendaValidoGestor(m),false);assert.equal(c.mesAgendaValidoGestor('2024-02'),true);const e=c.compromissosAgendaGestor({formasPagamento:[{nome:'A',tipo:'cartao',vencimento:31}],faturas:{horizonte:{saldoBanco:{A:{'02/2024':10}}}}});assert.equal(e[0].data,'29/02/2024');
});
test('fixo programado omite repetição; mudanças futuras de categoria e valor ficam explícitas',()=>{
 const c=vm.createContext({document:{addEventListener(){}}});vm.runInContext(fs.readFileSync('interface/usabilidade.js','utf8'),c);const p={mes:'11/2026',valor:'R$ 139,90',descricao:'Total Pass',forma:'Cartao',categoria:'Saúde'};assert.equal(c.textosProgramacoesFixasGestor({vigente:null,programadas:[p]})[0],'A partir da fatura 11/2026');const t=c.textosProgramacoesFixasGestor({vigente:p,programadas:[{...p,mes:'12/2026',valor:'R$ 149,90',categoria:'Outros'}]})[0];assert.match(t,/Novo valor: R\$ 149,90/);assert.match(t,/Categoria: Outros/);assert(!t.includes('Total Pass'));
});
