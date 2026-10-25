const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal}=require('./fixtures/gestor-mocks.cjs');
test('cargas idênticas dispensam manutenção repetida, mas novo dia e edição direta são conferidos',()=>{
 const {ctx,db,props}=boot(fixture([personal()]));ctx.console={log(){}};let organizacoes=0;const old=ctx.organizarEAtualizarPlanilha;ctx.organizarEAtualizarPlanilha=(...a)=>{organizacoes++;return old(...a);};
 const ler=()=>ctx.executarAcaoApi_('getDadosCompletos',null);ler();assert.equal(organizacoes,1);const diario=db.sheets['_Gestor_Operacoes'].rows.length;ler();assert.equal(organizacoes,1);assert.equal(db.sheets['_Gestor_Operacoes'].rows.length,diario);
 db.sheets['Lançamentos'].rows[1][7]=70;assert.equal(ler().kpis.comprometimentoMes,'R$ 70,00');assert.equal(organizacoes,2);
 ctx.getHojeSeguro=()=>new Date(2026,9,17);ler();assert.equal(organizacoes,3);props.delete('GESTOR_MANUTENCAO_V1');ler();assert.equal(organizacoes,4);
});
test('snapshot evita apresentação de abas técnicas não solicitada e mantém cópias e datas independentes',()=>{
 const {ctx,db}=boot(fixture([personal()]));ctx.console={log(){}};let exibicoes=0;for(const sh of Object.values(db.sheets)){const old=sh.getRange.bind(sh);sh.getRange=(...a)=>{const r=old(...a),f=r.getDisplayValues;r.getDisplayValues=(...p)=>{exibicoes++;return f(...p);};return r;};}
 ctx.executarOperacaoGestor_('consulta-snapshot',null,()=>ctx.obterPlanilhaGestor_().getSheetByName('Dashboard & Resumo').getRange(17,2).getValues(),true);assert.equal(exibicoes,0);
 ctx.executarOperacaoGestor_('consulta-exibicao',null,()=>{const sh=ctx.obterPlanilhaGestor_().getSheetByName('Dashboard & Resumo');sh.getRange(17,2).getDisplayValues();sh.getRange(17,2).getDisplayValues();},true);assert.equal(exibicoes,1);
 const entrada={data:new Date(2026,9,1),linhas:[['Texto',1]],nada:null};const copia=ctx.copiarGestor_(entrada);copia.data.setDate(15);copia.linhas[0][0]='Outro';assert.equal(entrada.data.getDate(),1);assert.equal(entrada.linhas[0][0],'Texto');
});
