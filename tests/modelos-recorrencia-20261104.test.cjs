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

const cadastro={dataCompra:'16/10/2026',mesPrimeiraFatura:'11/2026',descricao:'Nova Conta',formaPagto:'Cartao',categoria:'Teste',valorTotal:80,numParcelas:1,parcelaInicial:1,recorrenciaModo:'revisao'};
test('cadastro pessoal salva gasto atual e modelo futuro juntos; reenvio não duplica',()=>{
 const a=ambiente(),p={...cadastro,requestId:'cadastro-modelo-001'};api(a,'salvarLancamentoWeb',p);api(a,'salvarLancamentoWeb',p);
 const r=a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Nova Conta');assert.equal(r.length,1);assert.equal(a.ctx.limparApostrofo(r[0][6]),'1/1');assert.equal(lista(a).length,1);assert.equal(lista(a)[0].proximoMes,'11/2026');assert.equal(lista(a)[0].defasagem,1);
});
test('cadastro terceiro conserva dívida e banco separados e prepara próxima ocorrência',()=>{
 const a=ambiente();api(a,'salvarEmprestimoWeb',{...cadastro,pessoa:'Ana',requestId:'cadastro-terceiro-001'});
 const r=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Ana');assert(r);assert.equal(r[9],'A Receber');assert.equal(a.ctx.valorPagoBancoGestor_(r,true),0);assert.equal(lista(a)[0].origem,'terceiros');assert.equal(lista(a)[0].proximoMes,'11/2026');
});
test('falha no modelo não deixa gasto salvo; parcelamento incompatível também é recusado',()=>{
 const a=ambiente(),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);
 assert.throws(()=>api(a,'salvarLancamentoWeb',{...cadastro,recorrenciaModo:'automatico',requestId:'cadastro-protecao-001'}),/proteção automática/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(lista(a).length,0);
 assert.throws(()=>api(a,'salvarLancamentoWeb',{...cadastro,numParcelas:2,requestId:'cadastro-invalido-001'}),/sem parcelamento/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
});
test('cadastro automático aguarda próximo mês e não recria ocorrência atual',()=>{
 const a=ambiente();a.ativar();api(a,'salvarLancamentoWeb',{...cadastro,recorrenciaModo:'automatico',requestId:'cadastro-automatico-001'});
 assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,0);a.ctx.getHojeSeguro=()=>new Date(2026,10,16);assert.equal(a.ctx.rotinaModelosRecorrenciaGestor().criados,1);assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Nova Conta').length,2);
});
test('prévia compartilhada preserva dia 31, não gera atrasados e respeita fatura e limite anual',()=>{
 const a=ambiente(),plano=a.ctx.planoRecorrenciaCadastroGestor;
 assert.equal(plano('31/01/2028','02/2028',new Date(2028,0,31)).dataProxima,'29/02/2028');assert.equal(plano('31/01/2028','02/2028',new Date(2028,2,1)).dataProxima,'31/03/2028');
 assert.equal(plano('16/08/2026','09/2026',new Date(2026,9,17)).dataProxima,'16/11/2026');
 assert.throws(()=>plano('16/10/2026','09/2026',new Date(2026,9,16)),/mesmo mês/);assert.throws(()=>plano('31/12/2199','12/2199',new Date(2026,9,16)),/limite/);
});

test('fila offline cria recorrência integrada, duplicata e interrupção preservam atomicidade',()=>{
 const a=ambiente(),p={...cadastro,requestId:'offline-recorrente-001'};const res=api(a,'sincronizarLoteWeb',[p]);assert.equal(res.sucesso,true);assert.equal(lista(a).length,1);
 const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);assert.throws(()=>api(a,'salvarLancamentoWeb',{...p,requestId:'outra-recorrencia-001'}),/Já existe/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
 const b=ambiente(),aplicar=b.ctx.aplicarPlanoGestor_;b.ctx.aplicarPlanoGestor_=()=>{throw Error('interrupção simulada');};assert.throws(()=>api(b,'salvarLancamentoWeb',p),/interrupção/);b.ctx.aplicarPlanoGestor_=aplicar;api(b,'salvarLancamentoWeb',p);assert.equal(lista(b).length,1);assert.equal(b.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Nova Conta').length,1);
});

test('desfazer isolado não pode remover só o gasto deixando a recorrência ativa',()=>{
 const a=ambiente(),p={...cadastro,requestId:'cadastro-sem-desfazer-001'};api(a,'salvarLancamentoWeb',p);
 const r=api(a,'obterAtividadeWeb',{}),e=r.itens.find(e=>e.id==='salvarLancamentoWeb:'+p.requestId);assert(e);assert.equal(e.podeDesfazer,false);assert.match(e.motivo,/criados juntos/);
 assert.throws(()=>api(a,'desfazerAtividadeWeb',{eventoId:e.id,requestId:'desfazer-integrado-001'}),/criados juntos/);assert.equal(lista(a).length,1);assert.equal(a.db.sheets['Lançamentos'].rows.filter(r=>r[1]==='Nova Conta').length,1);
});
