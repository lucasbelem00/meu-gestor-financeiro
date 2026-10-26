const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,clone}=require('./fixtures/gestor-mocks.cjs');
const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
const ler=a=>a.ctx.executarAcaoApi_('getDadosCompletos',null);
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
function nativo(emp=true){const a=boot(fixture(emp?[]:[personal('Compra',120)],emp?[loan('Ana','A Receber',120,'Cartao')]:[]));a.ctx.console={log(){}};ler(a);a.sh=a.db.sheets[emp?'Empréstimos':'Lançamentos'];a.sh.rows[1][8]=new Date(2026,9,1);ler(a);return a;}
function ref(a,emp=true){const r=a.sh.rows[1];return {registroId:r[11],compraId:r[12],versao:r[13],linha:2,descricao:r[emp?2:1],descOriginal:r[emp?2:1],pessoa:'Ana',mesFatura:'10/2026',mesOriginal:'10/2026',parcela:r[6],parcelaOriginal:r[6]};}
test('recebimento parcial com mês Date conserva todo o saldo bancário e os centavos',()=>{
 const a=nativo(),f=a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});a.ctx.registrarPagamentoFaturaWeb({...f,valor:60,requestId:'vistoria-pagar-parte-001'});
 a.ctx.dividirParcelaEmprestimoWeb({...ref(a),valorRecebido:30,requestId:'vistoria-receber-parte-001'});
 const depois=a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});assert.equal(depois.total,120);assert.equal(depois.pago,60);assert.equal(depois.restante,60);
 const rs=a.sh.rows.slice(1);assert.equal(rs.filter(r=>r[9]==='Recebido').reduce((s,r)=>s+r[7],0),30);assert(rs.every(r=>a.ctx.formatarCelulaRegistroGestor_(r[8],'MM/yyyy')==='10/2026'));
});
test('receber lote com mês Date e mover entre pessoal e empréstimos conserva competência',()=>{
 const a=nativo(),r=a.sh.rows[1];a.ctx.alternarStatusEmprestimoWeb({quitarMesPessoa:true,pessoa:'Ana',mesFatura:'10/2026',itensConferidos:[{id:r[11],versao:r[13]}],totalConferido:120,requestId:'vistoria-receber-lote-001'});assert.equal(a.sh.rows[1][9],'Recebido');
 const b=nativo(false);b.ctx.moverParaEmprestimosWeb({...ref(b,false),requestId:'vistoria-mover-emp-001'});assert.equal(b.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'}).total,120);assert.equal(b.db.sheets['Empréstimos'].rows[1][8],'10/2026');
 const c=nativo();c.ctx.moverParaGastosPessoaisWeb({...ref(c),categoria:'Teste',tags:'',requestId:'vistoria-mover-pessoal-001'});assert.equal(c.ctx.obterRelatorioMes('10/2026').kpis.total,'R$ 120,00');
});
test('condição futura de fixo conserva novembro/dezembro e vigora a partir de janeiro',()=>{
 const a=boot(fixture([personal('Assinatura',20,'∞/∞','10/2026','Assinatura Paga'),personal('Compra novembro',5,'1/1','11/2026')]));a.ctx.console={log(){}};ler(a);
 const r=a.db.sheets['Lançamentos'].rows.find(r=>r[6]==='∞/∞');a.ctx.editarAssinaturaWeb({registroId:r[11],compraId:r[12],versao:r[13],linhaBase:2,descOriginal:'Assinatura',novaDesc:'Assinatura nova',novaForma:'Cartao',novaCat:'Teste',novaValor:25,aPartirMes:'01/2027',requestId:'vistoria-fixo-futuro-001'});
 const d=ler(a);assert.equal(d.faturas.pivot.Cartao['11/2026'],25);
 a.ctx.getHojeSeguro=()=>new Date(2027,1,16);ler(a);
 const linhas=a.db.sheets['Lançamentos'].rows.filter(r=>r[12]===a.db.sheets['Lançamentos'].rows.find(r=>r[6]==='∞/∞')[12]),porMes=new Map(linhas.map(r=>[a.ctx.formatarCelulaRegistroGestor_(r[8],'MM/yyyy'),r]));
 assert.equal(porMes.get('11/2026')[7],20);assert.equal(porMes.get('12/2026')[7],20);assert.equal(porMes.get('01/2027')[7],25);assert.equal(porMes.get('02/2027')[7],25);assert.equal(porMes.get('11/2026')[1],'Assinatura');assert.equal(porMes.get('02/2027')[1],'Assinatura Nova');
});
function anual(){const e=loan('Ana','Recebido',70,'Cartao');e[8]='12/2025';const a=ambienteProtecao(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),personal('Atual',30)], [e]));a.ativar();const r=a.db.sheets['Empréstimos'].rows[1];r[14]='Pago';r[17]=70;a.carregar();a.manter();return a;}
function pedido(a,backup,id,extras={}){const p=api(a,'previaRestauracaoBackupWeb',{backup});return {backup,hashBackup:p.hashBackup,versaoAtual:p.versaoAtual,assinaturaAnuais:p.recuperacaoAnual.assinatura,confirmacao:'RESTAURAR',requestId:id,...extras};}
test('backup parcial preserva os empréstimos ativos e anuais e substitui só os pessoais anuais',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true});backup.formato='gestor-financeiro-backup-v1';delete backup.arquivosAnuais;delete backup.hashFinanceiro;backup.abas=backup.abas.filter(a=>a.nome!=='Empréstimos');
 const p=api(a,'previaRestauracaoBackupWeb',{backup});assert(p.preservadasAnuais.includes('Empréstimos'));assert.equal(p.arquivosAnuais[0].resumo.quantidade,1);
 api(a,'restaurarBackupDadosWeb',pedido(a,backup,'vistoria-restaurar-parcial-001'));
 assert.equal(api(a,'obterEmprestimosArquivadosWeb',{}).itens.length,1);assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 0,00');
});
test('JSON completo recupera anual ausente com consentimento e conserva diagnóstico na cópia anterior',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),id=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id;a.planilhas.delete(id);
 const p=api(a,'previaRestauracaoBackupWeb',{backup});assert.equal(p.recuperacaoAnual.necessaria,true);assert.equal(p.recuperacaoAnual.indisponiveis[0].ano,2025);
 assert.throws(()=>api(a,'restaurarBackupDadosWeb',pedido(a,backup,'vistoria-recuperar-sem-confirmar-001')),/Confirme especificamente/);
 api(a,'restaurarBackupDadosWeb',pedido(a,backup,'vistoria-recuperar-anual-001',{confirmarRecuperacaoAnual:true}));assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');
 const partes=a.ctx.obterParteCopiaRestauracaoWeb({copiaId:'vistoria-recuperar-anual-001',parte:1,quantidade:20}),copia=JSON.parse(partes.chunks.map(p=>p.chunk).join(''));assert.equal(copia.recuperacaoOrigem.indisponiveis[0].id,id);assert.equal(copia.recuperacaoOrigem.catalogo.length,1);assert(copia.abas.some(a=>a.nome==='Lançamentos'));
});
test('anual desaparecido depois da prévia exige nova conferência; parcial não finge recuperar o ano',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),p=pedido(a,backup,'vistoria-previa-obsoleta-001');a.planilhas.delete(a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id);
 assert.throws(()=>api(a,'restaurarBackupDadosWeb',p),/nova prévia/);
 const parcial=clone(backup);parcial.formato='gestor-financeiro-backup-v1';delete parcial.arquivosAnuais;delete parcial.hashFinanceiro;assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup:parcial}),/JSON completo/);
});
test('recuperação preserva conteúdo anual legível mas divergente sem misturá-lo à restauração',()=>{
 const a=anual(),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),id=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id;a.planilhas.get(id).sheets['Lançamentos'].rows[1][1]='Conteúdo externo que deve ser preservado';
 const p=pedido(a,backup,'vistoria-recuperar-divergente-001',{confirmarRecuperacaoAnual:true});api(a,'restaurarBackupDadosWeb',p);
 const r=a.ctx.obterParteCopiaRestauracaoWeb({copiaId:p.requestId,parte:1,quantidade:20}),copia=JSON.parse(r.chunks.map(p=>p.chunk).join(''));
 assert.equal(copia.recuperacaoOrigem.arquivosNaoConferidos[0].abas[0].valores[1][1],'Conteúdo externo que deve ser preservado');assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');assert.equal(a.planilhas.get(id).sheets['Lançamentos'].rows[1][1],'Conteúdo externo que deve ser preservado');
});
test('manutenção preserva fórmula original e texto literal em colunas extras, inclusive após retomada',()=>{
 const a=anual(); // Arquiva primeiro a compra antiga; prepara outra elegível.
 const sh=a.db.sheets['Lançamentos'],r=sh.rows.find(r=>r[1]==='Atual');r[18]='=1000+1000';r[19]="'=NAO_EXECUTAR()";
 sh.getRange(sh.rows.indexOf(r)+1,19,1,2).setValues([['=1000+1000',"'=NAO_EXECUTAR()"]]);
 const antiga=personal('Outra antiga',15,'1/1','12/2025','Pago');sh.rows.push(antiga);a.carregar();
 a.db.failure={name:'Lançamentos',stage:'after',row:1};assert.throws(()=>a.manter(),/FALHA/);a.carregar();
 const i=sh.rows.findIndex(r=>r[1]==='Atual')+1,range=sh.getRange(i,19,1,2);assert.equal(range.getValues()[0][0],2000);assert.equal(range.getFormulas()[0][0],'=1000+1000');assert.equal(range.getFormulas()[0][1],'');assert.equal(range.getValues()[0][1],'=NAO_EXECUTAR()');
});
function parcelasDatas(){
 const a=boot(fixture());a.ctx.console={log(){}};
 a.ctx.salvarEmprestimoWeb({dataCompra:'01/10/2026',pessoa:'Ana',descricao:'Compra',formaPagto:'Cartao',valorTotal:500,numParcelas:5,parcelaInicial:1,mesPrimeiraFatura:'10/2026',dataCombinada:'14/10/2026',requestId:'vistoria-compra-datas-001'});
 const rs=a.db.sheets['Empréstimos'].rows;rs.find(r=>r[6]==='4/5')[9]='Recebido';ler(a);const alvo=rs.find(r=>r[6]==='2/5');
 a.p={registroId:alvo[11],compraId:alvo[12],versao:alvo[13],linha:rs.indexOf(alvo)+1,descOriginal:'Compra',mesOriginal:'11/2026',parcelaOriginal:'2/5',dataCompra:'01/10/2026',pessoa:'Ana',descricao:'Compra',formaPagto:'Cartao',valorParcela:100,mesFatura:'11/2026',status:'A Receber',observacoes:'',dataCombinada:'31/01/2027',escopoDataCombinada:'proximas'};return a;
}
test('prévia e edição de próximas datas ignoram parcelas passadas e recebidas e ajustam fevereiro',()=>{
 const a=parcelasDatas(),p=api(a,'previaDatasDevolucaoWeb',a.p);assert.deepEqual(Array.from(p.itens,i=>i.depois),['31/01/2027','28/02/2027','30/04/2027']);
 const antes=new Map(a.db.sheets['Empréstimos'].rows.slice(1).map(r=>[r[11],r.slice()]));a.ctx.editarEmprestimoLinhaWeb({...a.p,assinaturaDatas:p.assinatura,requestId:'vistoria-aplicar-datas-001'});
 const rs=a.db.sheets['Empréstimos'].rows.slice(1);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(rs.find(r=>r[6]==='1/5')),'14/10/2026');assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(rs.find(r=>r[6]==='4/5')),'14/01/2027');
 rs.forEach(r=>{assert.equal(r[8],antes.get(r[11])[8]);assert.equal(r[9],antes.get(r[11])[9]);assert.equal(r[17],antes.get(r[11])[17]);});
});
test('prévia de datas obsoleta não edita nenhuma parcela e reenvio confirmado não reaplica',()=>{
 const a=parcelasDatas(),p=api(a,'previaDatasDevolucaoWeb',a.p),outra=a.db.sheets['Empréstimos'].rows.find(r=>r[6]==='3/5');outra[10]='Mudou em outra tela';ler(a);const antes=JSON.stringify(a.db.sheets['Empréstimos'].rows);
 assert.throws(()=>a.ctx.editarEmprestimoLinhaWeb({...a.p,assinaturaDatas:p.assinatura,requestId:'vistoria-datas-obsoletas-001'}),/mudaram desde a prévia/);assert.equal(JSON.stringify(a.db.sheets['Empréstimos'].rows),antes);
 const nova=api(a,'previaDatasDevolucaoWeb',a.p),pedido={...a.p,assinaturaDatas:nova.assinatura,requestId:'vistoria-datas-confirmadas-001'};a.ctx.editarEmprestimoLinhaWeb(pedido);const salvo=JSON.stringify(a.db.sheets['Empréstimos'].rows);a.ctx.editarEmprestimoLinhaWeb(pedido);assert.equal(JSON.stringify(a.db.sheets['Empréstimos'].rows),salvo);
});
test('data em conjunto pode ser removida sem mexer nos pagamentos bancários',()=>{
 const a=parcelasDatas(),f=a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'11/2026'});a.ctx.registrarPagamentoFaturaWeb({...f,valor:100,requestId:'vistoria-banco-datas-001'});const r=a.db.sheets['Empréstimos'].rows.find(r=>r[11]===a.p.registroId);a.p.versao=r[13];a.p.dataCombinada='';const p=api(a,'previaDatasDevolucaoWeb',a.p);
 a.ctx.editarEmprestimoLinhaWeb({...a.p,assinaturaDatas:p.assinatura,requestId:'vistoria-remover-datas-001'});assert.equal(a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'11/2026'}).pago,100);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(a.db.sheets['Empréstimos'].rows.find(l=>l[11]===r[11])), '');
});
test('dados do cartão distinguem saldo bancário de recebimento',()=>{
 const a=nativo();let d=ler(a);assert.equal(d.emprestimos.itens[0].saldoBancoRaw,120);
 a.ctx.alternarStatusEmprestimoWeb({...ref(a),statusDesejado:'Recebido',requestId:'vistoria-somente-recebido-001'});d=ler(a);assert.equal(d.emprestimos.itens[0].status,'Recebido');assert.equal(d.emprestimos.itens[0].saldoBancoRaw,120);
 const f=a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});a.ctx.registrarPagamentoFaturaWeb({...f,valor:120,requestId:'vistoria-agora-banco-001'});d=ler(a);assert.equal(d.emprestimos.itens[0].saldoBancoRaw,0);assert.equal(d.emprestimos.itens[0].pagoBancoRaw,120);
});
test('referência de célula em fórmula personalizada bloqueia compactação antes de mover linhas',()=>{
 const a=anual(),sh=a.db.sheets['Lançamentos'];sh.rows.push(personal('Antiga para arquivar',15,'1/1','12/2025','Pago'));a.carregar();const r=sh.rows.find(r=>r[1]==='Atual');sh.getRange(sh.rows.indexOf(r)+1,19).setValue('=H2');const antes=JSON.stringify(sh.rows);
 assert.throws(()=>a.manter(),/fórmulas personalizadas com referências/);assert.equal(JSON.stringify(sh.rows),antes);assert.equal(sh.getRange(sh.rows.indexOf(r)+1,19).getFormulas()[0][0],'=H2');
});
