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

test('página não reversível e busca vazia dispensam mapa financeiro',()=>{const {ctx}=ambiente();let mapas=0;const original=ctx.mapaRegistrosAtividadeGestor_;ctx.mapaRegistrosAtividadeGestor_=()=>{mapas++;return original()};assert.equal(ctx.executarAcaoApi_('obterAtividadeWeb',{limite:20}).itens.length,20);assert.equal(ctx.executarAcaoApi_('obterAtividadeWeb',{termo:'termo inexistente'}).itens.length,0);assert.equal(mapas,0);});
test('ação reversível ainda consulta mapa atual e recusa desfazer após mudança',()=>{const {boot,fixture,loan}=require('./fixtures/gestor-mocks.cjs');const {ctx,db}=boot(fixture([],[loan()]));ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos',null);const r=db.sheets['Empréstimos'].rows[1];ctx.alternarStatusEmprestimoWeb({registroId:r[11],versao:r[13],statusDesejado:'Recebido',requestId:'mapa-atividade-receber-001'});let mapas=0;const original=ctx.mapaRegistrosAtividadeGestor_;ctx.mapaRegistrosAtividadeGestor_=()=>{mapas++;return original()};assert(ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0].podeDesfazer);assert.equal(mapas,1);db.sheets['Empréstimos'].rows[1][13]++;assert.equal(ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0].podeDesfazer,false);assert.equal(mapas,2);});


test('página e reversões compartilham leitura sem repetir evento nem liberar desfazer antigo',()=>{const {boot,fixture,loan}=require('./fixtures/gestor-mocks.cjs'),{ctx,db}=boot(fixture([],[loan()]));ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos');const r=db.sheets['Empréstimos'].rows[1];ctx.alternarStatusEmprestimoWeb({registroId:r[11],versao:r[13],statusDesejado:'Recebido',requestId:'atividade-unica-receber'});const e=ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0];ctx.desfazerAtividadeWeb({eventoId:e.id,requestId:'atividade-unica-desfazer'});const ler=ctx.lerEventosAtividadeGestor_;let chamadas=0;ctx.lerEventosAtividadeGestor_=(selecionadas,indice)=>{chamadas++;assert.equal(selecionadas.length,new Set(selecionadas).size);return ler(selecionadas,indice);};const p=ctx.executarAcaoApi_('obterAtividadeWeb',{});assert.equal(chamadas,1);const antigo=p.itens.find(x=>x.id===e.id);assert.equal(antigo.desfeita,true);assert.equal(antigo.podeDesfazer,false);assert.equal(p.itens[0].acao,'desfazerAtividadeWeb');});
