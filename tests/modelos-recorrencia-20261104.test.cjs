const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
const modelo={origem:'pessoal',modo:'revisao',descricao:'Conta mensal',forma:'Cartao',categoria:'Teste',pessoa:'',valor:100,dia:10,defasagem:1,proximoMes:'10/2026'};
function ambiente(){const a=ambienteProtecao();a.carregar();return a;}
const criar=(a,p={})=>api(a,'salvarRecorrenciaWeb',{...modelo,requestId:'modelo-criar-001',...p});
const lista=a=>api(a,'obterRecorrenciasWeb',{}).itens;
const confirmar=(a,m,p={})=>api(a,'confirmarMesRecorrenciaWeb',{id:m.id,versao:m.versao,mes:m.proximoMes,valor:120,requestId:'modelo-confirmar-001',...p});

test('modelo variável pessoal não cria gasto até confirmar; valor e fatura independentes, reenvio não duplica',()=>{
 const a=ambiente(),antes=a.db.sheets['Lançamentos'].rows.length;criar(a);assert.equal(a.db.sheets['Lançamentos'].rows.length,antes);
 const m=lista(a)[0];confirmar(a,m);const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Conta Mensal');assert(r);assert.equal(r[7],120);assert.equal(a.ctx.limparApostrofo(r[0]),'10/10/2026');assert.equal(a.ctx.limparApostrofo(r[8]),'11/2026');
 assert.equal(lista(a)[0].proximoMes,'11/2026');assert.equal(lista(a)[0].valorCentavos,12000);
 confirmar(a,m);assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Conta Mensal').length,1);
 assert.throws(()=>confirmar(a,m,{requestId:'outro-envio-001'}),/já foi tratado|mudou/);
});
test('terceiros cria apenas empréstimo, sem registrar recebimento ou quitar cartão',()=>{
 const a=ambiente(),antes=a.db.sheets['Lançamentos'].rows.length;criar(a,{origem:'terceiros',pessoa:'Ana'});confirmar(a,lista(a)[0]);
 assert.equal(a.db.sheets['Lançamentos'].rows.length,antes);const r=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Ana');assert(r);assert.equal(r[9],'A Receber');assert.equal(a.ctx.valorPagoBancoGestor_(r,true),0);assert.equal(r[7],120);
});
test('pular avança só o modelo, preserva valores; confirmação futura bloqueada',()=>{
 const a=ambiente();criar(a);const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);confirmar(a,lista(a)[0],{pular:true});assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(lista(a)[0].proximoMes,'11/2026');assert.equal(lista(a)[0].valorCentavos,10000);
 assert.throws(()=>confirmar(a,lista(a)[0],{requestId:'confirmar-futuro-001'}),/Aguarde/);
});
test('desativação e conflito entre aparelhos preservam meses reais e exigem versão atual',()=>{
 const a=ambiente();criar(a);const m=lista(a)[0];api(a,'salvarRecorrenciaWeb',{id:m.id,versao:m.versao,desativar:true,requestId:'desativar-modelo-001'});assert.equal(lista(a)[0].ativo,false);
 assert.throws(()=>confirmar(a,m),/mudou/);assert.throws(()=>confirmar(a,lista(a)[0]),/desativada/);
});
test('interrupção em PRONTO recupera gasto e avanço juntos, sem duplicidade',()=>{
 const a=ambiente();criar(a);const m=lista(a)[0],aplicar=a.ctx.aplicarPlanoGestor_;a.ctx.aplicarPlanoGestor_=()=>{throw Error('interrupção simulada');};assert.throws(()=>confirmar(a,m),/interrupção/);
 a.ctx.aplicarPlanoGestor_=aplicar;confirmar(a,m);assert.equal(lista(a)[0].proximoMes,'11/2026');assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Conta Mensal').length,1);
});
test('automático exige proteção, roda pela rotina e não repete após reexecução',()=>{
 const a=ambiente();assert.throws(()=>criar(a,{modo:'automatico'}),/proteção automática/);a.ativar();criar(a,{modo:'automatico',origem:'terceiros',pessoa:'Ana',dia:31,proximoMes:'10/2026'});
 assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,0);a.ctx.getHojeSeguro=()=>new Date(2026,10,2);
 assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,1);assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,0);assert.equal(lista(a)[0].proximoMes,'11/2026');
 const r=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Ana');assert.equal(a.ctx.limparApostrofo(r[0]),'31/10/2026');assert.equal(r[9],'A Receber');
});
test('dia 31 em fevereiro bissexto usa dia 29; revisão nunca é registrada pelo automático',()=>{
 const a=ambiente();a.ctx.getHojeSeguro=()=>new Date(2028,1,29);criar(a,{dia:31,proximoMes:'02/2028'});a.ativar();assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,0);confirmar(a,lista(a)[0]);
 const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Conta Mensal');assert.equal(a.ctx.limparApostrofo(r[0]),'29/02/2028');assert.equal(lista(a)[0].proximoMes,'03/2028');
});
test('modelo e JSON inválidos, duplicata e mês retroativo são recusados sem gravar',()=>{
 const a=ambiente();assert.throws(()=>criar(a,{valor:-10}),/modelo|valor/i);assert.throws(()=>criar(a,{proximoMes:'09/2026'}),/mês atual/);criar(a);assert.throws(()=>criar(a,{requestId:'duplicata-modelo-001'}),/Já existe/);
 const sh=a.db.sheets['Recorrências'];sh.rows[1][1]='=1';assert.throws(()=>lista(a),/fórmulas/);
});

test('novo lançamento recorrente antigo também bloqueia conta já cadastrada como modelo',()=>{
 const a=ambiente();criar(a);
 assert.throws(()=>api(a,'salvarLancamentoWeb',{requestId:'serie-duplicada-001',descricao:'Conta mensal',formaPagto:'Cartao',categoria:'Teste',valorTotal:100,isAssinatura:true,dataCompra:'16/10/2026',mesPrimeiraFatura:'10/2026',numParcelas:1}),/modelo ativo/);
});
test('Histórico exige versão de origem e início posterior, preservando gasto pago',()=>{
 const a=ambienteProtecao(fixture([personal('Original',50,'1/1','10/2026','Pago')]));a.carregar();const r=a.db.sheets['Lançamentos'].rows[1],antes=JSON.stringify(r);
 assert.throws(()=>criar(a,{registroOrigem:r[11],versaoOrigem:r[13],proximoMes:'10/2026'}),/após o mês/);
 criar(a,{registroOrigem:r[11],versaoOrigem:r[13],proximoMes:'11/2026'});assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows[1]),antes);
});
test('backup inclui modelos, valida estrutura e não aceita fórmulas',()=>{
 const a=ambiente();criar(a);const b=api(a,'exportarBackupDadosWeb',{restauravel:true});assert(b.abas.some(x=>x.nome==='Recorrências'));
 const aba=b.abas.find(x=>x.nome==='Recorrências');assert.doesNotThrow(()=>a.ctx.validarConteudoAbaBackupGestor_(aba));aba.valores[1][1]='{}';assert.throws(()=>a.ctx.validarConteudoAbaBackupGestor_(aba),/modelo/i);
});

test('backup completo restaura próximo mês e último valor; backup antigo preserva modelos explicitamente',()=>{
 const a=ambiente(),antigo=api(a,'exportarBackupDadosWeb',{restauravel:true});criar(a);const completo=api(a,'exportarBackupDadosWeb',{restauravel:true});
 assert(api(a,'previaRestauracaoBackupWeb',{backup:antigo}).preservadas.includes('Recorrências'));
 confirmar(a,lista(a)[0]);assert.equal(lista(a)[0].proximoMes,'11/2026');
 const p=api(a,'previaRestauracaoBackupWeb',{backup:completo});api(a,'restaurarBackupDadosWeb',{backup:completo,hashBackup:p.hashBackup,versaoAtual:p.versaoAtual,confirmacao:'RESTAURAR',requestId:'modelo-restaurar-001'});
 assert.equal(lista(a)[0].proximoMes,'10/2026');assert.equal(lista(a)[0].valorCentavos,10000);assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Conta Mensal').length,0);
});
