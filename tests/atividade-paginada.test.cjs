const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture}=require('./fixtures/gestor-mocks.cjs');
function ambiente(){
 const {ctx,db}=boot(fixture());ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos',null);const sh=db.insertSheet('_Gestor_Atividade'),linhas=[['Evento','Data','Ação','Resumo','Tipo','Conteúdo']];
 for(let i=0;i<300;i++){const e={id:'historico-'+i,titulo:'Evento '+i,acao:i%2?'salvarLancamentoWeb':'salvarNotasWeb',data:'2026-10-16',resumo:{descricao:i===47?'Encontrar palavra específica':'Registro '+i},quantidade:0,reversivel:false,alteracoes:[]};const texto=JSON.stringify(e);linhas.push([e.id,e.data,e.acao,e.titulo,'EVENTO',1],[e.id,'','','','PARTE 1',JSON.stringify(texto)]);}
 sh.getRange(1,1,linhas.length,6).setValues(linhas);return {ctx,db,sh};
}
test('primeira página lê somente eventos selecionados e mantém total e paginação',()=>{
 const {ctx}=ambiente();let decodificados=0;const original=ctx.decodificarEventosAtividadeGestor_;ctx.decodificarEventosAtividadeGestor_=linhas=>{const eventos=original(linhas);decodificados+=eventos.length;return eventos;};
 const p=ctx.executarAcaoApi_('obterAtividadeWeb',{limite:20});assert.equal(p.total,300);assert.equal(p.temMais,true);assert.equal(p.itens[0].id,'historico-299');assert.equal(p.itens[19].id,'historico-280');assert.equal(decodificados,20);
 const b=ctx.executarAcaoApi_('obterAtividadeWeb',{offset:20,limite:20});assert.equal(b.itens[0].id,'historico-279');assert.equal(decodificados,40);
});
test('tipo é selecionado pelo cabeçalho e busca textual preserva correspondências e total',()=>{
 const {ctx}=ambiente(),tipo=ctx.executarAcaoApi_('obterAtividadeWeb',{tipo:'salvarNotasWeb',limite:10});assert.equal(tipo.total,150);assert.equal(tipo.itens[0].id,'historico-298');assert(tipo.itens.every(e=>e.acao==='salvarNotasWeb'));
 const termo=ctx.executarAcaoApi_('obterAtividadeWeb',{termo:'palavra específica'});assert.equal(termo.total,1);assert.equal(termo.itens[0].id,'historico-47');assert.equal(termo.temMais,false);
});
