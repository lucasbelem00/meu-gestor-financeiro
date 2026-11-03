const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,launch,clone}=require('./fixtures/gestor-mocks.cjs');
const data=c=>c.executarAcaoApi_('getDadosCompletos',null);
const alvo=r=>({registroId:r[11],versao:r[13],linha:2,descricao:r[1],mesFatura:r[8],parcela:r[6]});
const pagar=(c,valor)=>c.registrarPagamentoFaturaWeb({...c.executarAcaoApi_('obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'10/2026'}),valor,requestId:'auditoria-pagamento-001'});
test('prévia exige habilitação e identidade do executor; visitante e identidade vazia são recusados',()=>{
 const {ctx:c,props}=boot(fixture());let executou=0;c.executarAcaoApi_=()=>{executou++;return 'ok';};
 assert.equal(JSON.parse(c.apiCallServidor('leitura',{})).sucesso,true);
 for(const email of ['', 'visitante@example.test']){c.Session.getActiveUser=()=>({getEmail:()=>email});assert.equal(JSON.parse(c.apiCallServidor('leitura',{})).sucesso,false);}
 c.Session.getActiveUser=()=>{throw Error('indisponível');};assert.equal(c.acessoPreviaDiretaGestor_(),false);
 c.Session.getActiveUser=()=>({getEmail:()=> 'dono@example.test'});props.set('GESTOR_API_BRIDGE_ENABLED','false');assert.equal(c.acessoPreviaDiretaGestor_(),false);assert.equal(executou,1);
});
test('prévia negada não entrega HTML e não bloqueia doPost com token correto',()=>{
 const {ctx:c}=boot(fixture());c.Session.getActiveUser=()=>({getEmail:()=>''});let html=0;c.HtmlService={createHtmlOutputFromFile(){html++;return {setTitle(){return this;}};}};
 assert.equal(c.doGet({parameter:{preview:'1'}}).content,'');assert.equal(html,0);
 c.executarAcaoApi_=()=>({ok:true});const e=token=>({postData:{contents:JSON.stringify({action:'teste',apiToken:token})}});
 assert.equal(JSON.parse(c.doPost(e('fake-token')).content).sucesso,true);assert.equal(JSON.parse(c.doPost(e('errado')).content).sucesso,false);
});
test('fila com item inválido confirma os válidos e mantém identificações para reenvio sem duplicar',()=>{
 const {ctx:c,db}=boot(fixture()),a={...launch,numParcelas:1,requestId:'offline-auditoria-001'},b={...a,requestId:'offline-auditoria-002',descricao:''},d={...a,requestId:'offline-auditoria-003',descricao:'Outro'};
 const r=c.sincronizarLoteWeb([a,b,d]);assert.equal(r.completo,false);assert.deepEqual(Array.from(r.requestIds),[a.requestId,d.requestId]);assert.equal(r.invalidos[0].indice,2);assert.equal(db.sheets['Lançamentos'].rows.length,3);
 b.descricao='Corrigido';const fim=c.sincronizarLoteWeb([a,b,d]);assert.equal(fim.completo,true);assert.equal(db.sheets['Lançamentos'].rows.length,4);
});
test('Histórico inicial e paginado entregam valores de pagamento parcial sem trocar marca de arquivo',()=>{
 const {ctx:c}=boot(fixture([personal('Parcial',100)]));data(c);pagar(c,20);
 const listas=[data(c).lancamentos,c.filtrarLancamentosWeb({filtros:{mes:'10/2026'},offset:0,limite:50}).itens];
 for(const itens of listas){const r=itens.find(x=>x[1]==='Parcial');assert.equal(r[17],false);assert.equal(r[18],20);assert.equal(r[19],80);assert.equal(r.length,22);}
});
test('exclusão de gasto parcialmente pago falha sem remover dados',()=>{
 const {ctx:c,db}=boot(fixture([personal('Parcial',100)]));data(c);pagar(c,20);const r=db.sheets['Lançamentos'].rows[1],antes=clone(db.sheets['Lançamentos'].rows);
 assert.throws(()=>c.excluirLancamentoWeb({...alvo(r),requestId:'excluir-pago-auditoria-001'}),/pagamento registrado/);assert.deepEqual(db.sheets['Lançamentos'].rows,antes);
});
test('exclusão de empréstimo recebido é recusada preservando a dívida registrada',()=>{
 const {ctx:c,db}=boot(fixture([],[loan('Ana','Recebido',50,'Cartao')]));data(c);const r=db.sheets['Empréstimos'].rows[1],antes=clone(db.sheets['Empréstimos'].rows);
 assert.throws(()=>c.excluirEmprestimoWeb({...alvo(r),descricao:r[2],requestId:'excluir-recebido-auditoria-001'}),/recebimento ou pagamento/);assert.deepEqual(db.sheets['Empréstimos'].rows,antes);
});
test('rota antiga de quitação é recusada também no roteador público',()=>{const {ctx:c}=boot(fixture());assert.throws(()=>c.executarAcaoApi_('quitarFaturaWeb',{}),/Conferir fatura/);});
test('comando manual de manutenção processa recorrências antes de organizar',()=>{const {ctx:c}=boot(fixture()),ordem=[];c.processarAssinaturasAutomaticas=()=>ordem.push('recorrencias');c.organizarEAtualizarPlanilha=()=>ordem.push('organizar');c.organizarAbaEmprestimos=()=>{};c.atualizarStatusAutomaticoInterno_();assert.deepEqual(ordem,['recorrencias','organizar']);});
