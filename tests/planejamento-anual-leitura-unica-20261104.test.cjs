const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambienteProtecao,fixture,personal,loan,clone}=require('./fixtures/protecao-mocks.cjs');
// Testa a fonte sem depender de já ter regenerado o bloco distribuído.
function carregarFonte(a){
 const fonte=fs.readFileSync('shared/anual.js','utf8');
 for(const [inicio,fim]of [['function cabFinanceiroAnualGestor_','function novaPlanilhaAnoGestor_'],['function desdobrarPlanoAnualGestor_','function destinoMudancaAnualGestor_']])vm.runInContext(fonte.slice(fonte.indexOf(inicio),fonte.indexOf(fim)),a.ctx);
 return a;
}
function ambiente(){
 const a=carregarFonte(ambienteProtecao(fixture([personal('Pessoal',30)],[loan('Ana','A Receber',20,'Cartao')])));a.ativar();
 const e=a.ctx.garantirAnoGestor_(a.db,2026),banco=a.planilhas.get(e.id);
 for(const nome of ['Lançamentos','Empréstimos']){banco.sheets[nome].rows=clone(a.db.sheets[nome].rows);a.db.sheets[nome].rows=[clone(banco.sheets[nome].rows[0])];}
 const montar=()=>({action:'editarLancamentoLinhaWeb',ssReal:a.db,ss:{abas:Object.fromEntries(['Lançamentos','Empréstimos'].map(nome=>[nome,{valores:a.ctx.matrizFinanceiraAnualGestor_(a.db,nome)}]))}});
 return {...a,e,banco,montar};
}

test('planejamento anual confere cada ano uma vez para pessoal e terceiros, sem cache na próxima chamada',()=>{
 const a=ambiente(),ler=a.ctx.dadosAnoGestor_;let leituras=0;
 const ctx=a.montar();ctx.ss.abas['Lançamentos'].valores[1][1]='Corrigido';
 a.ctx.dadosAnoGestor_=e=>{leituras++;return ler(e);};
 const plano=a.ctx.desdobrarPlanoAnualGestor_(ctx,[{nome:'Lançamentos'}]);assert.equal(leituras,1);assert(plano.some(m=>m.nome==='Lançamentos'&&m.destinoAnual));
 a.ctx.aplicarPlanoGestor_(a.db,{mudancas:plano});assert.equal(a.banco.sheets['Lançamentos'].rows[1][1],'Corrigido');
 const atual=a.montar();leituras=0;a.ctx.desdobrarPlanoAnualGestor_(atual,[{nome:'Lançamentos'}]);assert.equal(leituras,1);
});

test('plano anual continua recusando ano fechado alterado e fórmulas entre montagens',()=>{
 const a=ambiente(),ctx=a.montar(),dados=a.ctx.dadosAnoGestor_(a.e),linha=a.db.sheets['_Gestor_Anos'].rows.find(r=>r[0]===2026);linha[2]='FECHADO';linha[3]=a.ctx.hashGestor_(dados);
 const ler=a.ctx.dadosAnoGestor_;let leituras=0;a.ctx.dadosAnoGestor_=e=>{leituras++;return ler(e);};
 a.ctx.desdobrarPlanoAnualGestor_(ctx,[{nome:'Lançamentos'}]);assert.equal(leituras,1);
 a.banco.sheets['Lançamentos'].rows[1][7]=99;
 assert.throws(()=>a.ctx.desdobrarPlanoAnualGestor_(ctx,[{nome:'Lançamentos'}]),/ano fechado.*alterado/);
 a.banco.sheets['Lançamentos'].rows[1][7]=30;a.banco.sheets['Empréstimos'].getRange(2,3).setValue('=1+2');
 assert.throws(()=>a.ctx.desdobrarPlanoAnualGestor_(ctx,[{nome:'Lançamentos'}]),/fórmulas/);
});

test('cabeçalho anual lê só a primeira linha e preserva normalização e aba ausente',()=>{
 const a=carregarFonte(ambienteProtecao(fixture([personal()]))),sh=a.db.sheets['Lançamentos'];
 sh.getDataRange=()=>{throw Error('não ler a matriz inteira');};
 assert.equal(a.ctx.cabFinanceiroAnualGestor_(a.db,'Lançamentos').length,18);
 assert.equal(a.ctx.cabFinanceiroAnualGestor_(a.db,'Lançamentos')[1],'Descrição');
 sh.getMaxColumns=()=>3;assert.equal(a.ctx.cabFinanceiroAnualGestor_(a.db,'Lançamentos')[3],'');
 assert(a.ctx.cabFinanceiroAnualGestor_(a.db,'Ausente').every(v=>v===''));
});
