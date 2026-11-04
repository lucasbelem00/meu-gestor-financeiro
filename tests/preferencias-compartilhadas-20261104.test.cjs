const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
test('limite compartilhado persiste sem alterar finanças, reenvio é idempotente e outra versão é recusada',()=>{
 const a=ambienteProtecao(),d=a.carregar();assert.equal(d.preferenciasApp.versao,0);const antes=JSON.stringify(['Lançamentos','Empréstimos'].map(n=>a.db.sheets[n].rows));
 const p={centavos:150000,incluirPrevistos:true,versao:0,requestId:'limite-compartilhado-001'};const r=api(a,'salvarLimitePessoalWeb',p);assert.equal(r.versao,1);assert.equal(a.carregar().preferenciasApp.limitePessoal.centavos,150000);assert.equal(api(a,'salvarLimitePessoalWeb',p).versao,1);
 assert.throws(()=>api(a,'salvarLimitePessoalWeb',{...p,requestId:'limite-outro-aparelho-001'}),/outro aparelho/);assert.equal(JSON.stringify(['Lançamentos','Empréstimos'].map(n=>a.db.sheets[n].rows)),antes);
});
test('remover limite compartilha zero, valida centavos/booleanos e backup antigo preserva preferência',()=>{
 const a=ambienteProtecao();a.carregar();const antigo=api(a,'exportarBackupDadosWeb',{restauravel:true});api(a,'salvarLimitePessoalWeb',{centavos:10000,incluirPrevistos:false,versao:0,requestId:'limite-antes-backup-001'});
 assert(api(a,'previaRestauracaoBackupWeb',{backup:antigo}).preservadas.includes('Preferências do app'));const backup=api(a,'exportarBackupDadosWeb',{restauravel:true});assert(backup.abas.some(x=>x.nome==='Preferências do app'));
 api(a,'salvarLimitePessoalWeb',{centavos:0,incluirPrevistos:false,versao:1,requestId:'limite-remover-001'});assert.equal(a.carregar().preferenciasApp.limitePessoal.centavos,0);
 for(const p of [{centavos:-1,incluirPrevistos:false},{centavos:1.2,incluirPrevistos:false},{centavos:100,incluirPrevistos:'true'}])assert.throws(()=>api(a,'salvarLimitePessoalWeb',{...p,versao:2,requestId:'limite-invalido-001'}),/inválid/);
 const previa=api(a,'previaRestauracaoBackupWeb',{backup});api(a,'restaurarBackupDadosWeb',{backup,hashBackup:previa.hashBackup,versaoAtual:previa.versaoAtual,requestId:'limite-restaurar-001',confirmacao:'RESTAURAR'});assert.equal(a.carregar().preferenciasApp.limitePessoal.centavos,10000);
});
test('recorrência de terceiro originada na edição preserva empréstimo original e exige mês seguinte',()=>{
 const {fixture,loan}=require('./fixtures/protecao-mocks.cjs'),a=ambienteProtecao(fixture([],[loan('Ana','A Receber',50,'Cartao')]));a.carregar();const r=a.db.sheets['Empréstimos'].rows[1],antes=JSON.stringify(r),p={origem:'terceiros',modo:'revisao',descricao:'Conta',forma:'Cartao',pessoa:'Ana',categoria:'',valor:50,dia:10,defasagem:1,proximoMes:'11/2026',registroOrigem:r[11],versaoOrigem:r[13],requestId:'recorrencia-origem-terceiros-001'};
 api(a,'salvarRecorrenciaWeb',p);assert.equal(JSON.stringify(a.db.sheets['Empréstimos'].rows[1]),antes);assert.equal(api(a,'obterRecorrenciasWeb',{}).itens[0].origem,'terceiros');
});
