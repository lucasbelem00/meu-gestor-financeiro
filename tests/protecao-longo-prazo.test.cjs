const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,loan,launch,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,acao,p)=>a.ctx.executarAcaoApi_(acao,p||null);
function dadosAnuais(){
 const recebido=loan('Ana','Recebido',70,'Cartao');recebido[8]='12/2025';
 const recebidoBancoAberto=loan('Bruno','Recebido',60,'Cartao');recebidoBancoAberto[8]='12/2025';
 const aReceber=loan('Clara','A Receber',50,'Pix');aReceber[8]='12/2025';
 return fixture([personal('Encerrada',100,'1/1','12/2025','Pago'),personal('Pendente antiga',20,'1/1','11/2025'),personal('Fixo',10,'∞/∞','12/2025','Assinatura Paga'),personal('Atual',40),personal('Futura',90,'1/1','02/2027')],[recebido,recebidoBancoAberto,aReceber]);
}
function ambienteAnual(){const a=ambienteProtecao(dadosAnuais());a.ativar();const r=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Ana');r[14]='Pago';r[17]=70;a.carregar();return a;}
test('pasta privada e instalação única; rotina inativa não cria arquivo',()=>{
 const a=ambienteProtecao();assert.equal(a.ctx.rotinaProtecaoProgramadaGestor().ativo,false);assert.equal(a.arquivos.size,0);a.ativar();a.ctx.configurarProtecaoAutomaticaGestor(a.pasta.id);assert.equal(a.gatilhos.length,1);assert.equal(a.ctx.obterStatusProtecaoWeb().ativo,true);
 a.pasta.getSharingAccess=()=> 'ANYONE';assert.throws(()=>a.ctx.configurarProtecaoAutomaticaGestor(a.pasta.id),/privada/);
});
test('backup mensal é idempotente, relido e confirmado; novo mês cria outra cópia',()=>{
 const a=ambienteProtecao(fixture([personal()]));a.ativar();a.ctx.rotinaProtecaoProgramadaGestor();const arquivos=a.arquivos.size,status=a.ctx.obterStatusProtecaoWeb();assert.equal(status.ultimoBackup.periodo,'2026-10');a.ctx.rotinaProtecaoProgramadaGestor();assert.equal(a.arquivos.size,arquivos);assert.equal(a.ctx.obterStatusProtecaoWeb().ultimoErro,'');
 a.ctx.getHojeSeguro=()=>new Date(2026,10,2);a.ctx.rotinaProtecaoProgramadaGestor();assert(a.arquivos.size>arquivos);assert.equal(a.ctx.obterStatusProtecaoWeb().ultimoBackup.periodo,'2026-11');
});
test('arquivo anual preserva total e consulta; banco aberto, empréstimo pendente, fixo e futuro ficam ativos',()=>{
 const a=ambienteAnual();const antes=a.carregar(),r=a.manter();assert.equal(r.anual.quantidade,2);
 const pessoais=a.db.sheets['Lançamentos'].rows.slice(1).filter(r=>r[1]);assert(!pessoais.some(r=>r[1]==='Encerrada'));assert(pessoais.some(r=>r[1]==='Fixo'));assert(pessoais.some(r=>r[1]==='Futura'));assert(pessoais.some(r=>r[1]==='Pendente antiga'));
 const emprestimos=a.db.sheets['Empréstimos'].rows.slice(1).filter(r=>r[1]);assert(!emprestimos.some(r=>r[1]==='Ana'));assert(emprestimos.some(r=>r[1]==='Bruno'));assert(emprestimos.some(r=>r[1]==='Clara'));
 const depois=a.carregar();assert.equal(depois.kpis.totalGeral,antes.kpis.totalGeral);assert.deepEqual(JSON.parse(JSON.stringify(depois.categorias)),JSON.parse(JSON.stringify(antes.categorias)));assert.deepEqual(JSON.parse(JSON.stringify(depois.consumoCategoriasPorMes)),JSON.parse(JSON.stringify(antes.consumoCategoriasPorMes)));assert(depois.anosDisponiveis.includes('2025'));assert.equal(depois.emprestimos.kpis.totalAReceberGeral,antes.emprestimos.kpis.totalAReceberGeral);
 const rel=api(a,'obterRelatorioMes','12/2025');assert.equal(rel.kpis.total,'R$ 110,00');assert.equal(rel.terceiros.totalRaw,180);assert(rel.lancamentos.some(l=>l[1]==='Encerrada'&&l[19]===true));
 const hist=api(a,'filtrarLancamentosWeb',{filtros:{ano:'2025'},offset:0,limite:50});assert(hist.itens.some(l=>l[1]==='Encerrada'&&l[17]===true));assert.equal(api(a,'obterEmprestimosArquivadosWeb',{}).itens[0].pessoa,'Ana');
});
test('compra com parcela futura não é dividida na mudança de ano',()=>{
 const a=ambienteProtecao();a.ativar();api(a,'salvarLancamentoWeb',{...launch,dataCompra:'01/12/2025',mesPrimeiraFatura:'12/2025',requestId:'compra-virada-ano-001'});const previa=a.ctx.previaManutencaoProtegidaWeb();assert.equal(previa.quantidade,0);
});
test('backup após arquivar contém dados completos e restaura mesmo sem os arquivos originais',()=>{
 const a=ambienteAnual();a.manter();const backup=api(a,'exportarBackupDadosWeb',{restauravel:true});assert.equal(backup.formato,'gestor-financeiro-backup-v2');assert.equal(backup.arquivosAnuais[0].abas[0].valores[1][1],'Encerrada');
 const previa=api(a,'previaRestauracaoBackupWeb',{backup});assert.equal(previa.arquivosAnuais.length,1);const antes=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id;
 api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:previa.versaoAtual,hashBackup:previa.hashBackup,confirmacao:'RESTAURAR',requestId:'restauracao-anual-independente-001'});const depois=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id;assert.notEqual(depois,antes);a.planilhas.delete(antes);
 assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 130,00');
});
test('arquivo anual alterado ou backup sem conteúdo bloqueia consulta/restauração',()=>{
 const a=ambienteAnual();a.manter();const backup=api(a,'exportarBackupDadosWeb',{restauravel:true});const ruim=clone(backup);ruim.arquivosAnuais[0].abas[0].valores[1][7]=1;assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup:ruim}),/alterados|incompletos/);
 const entrada=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0];a.planilhas.get(entrada.id).sheets['Lançamentos'].rows[1][7]=1;assert.throws(()=>api(a,'obterRelatorioMes','12/2025'),/mudou/);
});

test('interrupção depois de publicar catálogo retoma sem perder ou duplicar compras',()=>{
 const a=ambienteAnual(),antes=a.carregar().kpis.totalGeral;
 a.db.failure={name:'Lançamentos',stage:'before',row:1};assert.throws(()=>a.manter(),/FALHA SIMULADA/);
 assert.equal(a.db.sheets['_Gestor_Manutencao'].rows[1][1],'PRONTO');
 assert.equal(a.carregar().kpis.totalGeral,antes);assert.equal(a.db.sheets['_Gestor_Manutencao'].rows[1][1],'CONFIRMADO');
 const hist=api(a,'filtrarLancamentosWeb',{filtros:{ano:'2025'},limite:50});assert.equal(hist.itens.filter(l=>l[1]==='Encerrada').length,1);
});

test('retomada não sobrescreve edição externa após interrupção',()=>{
 const a=ambienteAnual();a.db.failure={name:'Lançamentos',stage:'before',row:1};assert.throws(()=>a.manter());
 a.db.sheets['Lançamentos'].rows[1][1]='Edição externa preservada';const salvo=JSON.stringify(a.db.sheets['Lançamentos'].rows);
 assert.throws(()=>a.ctx.previaManutencaoProtegidaWeb(),/alteração externa/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),salvo);
});

test('backup interrompido após criação reaproveita o mesmo arquivo confirmado',()=>{
 const a=ambienteProtecao(fixture([personal()]));a.ativar();
 const criar=a.pasta.createFile;a.pasta.createFile=function(...args){const f=criar.apply(this,args);a.db.failure={name:'_Gestor_Backups',stage:'before',col:1};return f;};
 assert.throws(()=>a.ctx.executarBackupProtegidoWeb({requestId:'backup-interrompido-001'}),/FALHA/);a.pasta.createFile=criar;
 const n=a.arquivos.size,r=a.ctx.executarBackupProtegidoWeb({requestId:'backup-interrompido-001'});assert.equal(r.sucesso,true);assert.equal(a.arquivos.size,n);
});

test('cópia corrompida não autoriza retirar registros da principal',()=>{
 const a=ambienteAnual(),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows),criar=a.pasta.createFile;
 a.pasta.createFile=function(...args){const f=criar.apply(this,args);f.texto+='alterado';return f;};
 assert.throws(()=>a.manter(),/conferência/);assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(a.db.getSheetByName('_Gestor_ArquivosAnuais'),null);
});

test('compactação preserva reenvio protegido, consulta, cancelamento e histórico',()=>{
 const a=ambienteProtecao(fixture());a.ativar();const p={...launch,numParcelas:1,requestId:'tecnico-antigo-confirmado-001'},r=api(a,'salvarLancamentoWeb',p);
 const diario=a.db.sheets['_Gestor_Operacoes'];diario.rows.filter(l=>l[2]==='CONFIRMADO').forEach(l=>l[5]=new Date(2025,0,1));
 const atividade=a.db.sheets['_Gestor_Atividade'];atividade.rows.filter(l=>l[4]==='EVENTO').forEach(l=>l[1]='2025-01-01T12:00:00Z');
 const c=a.ctx.comLockProtecaoGestor_(ss=>a.ctx.compactarHistoricoProtecaoGestor_(ss,a.pasta));assert(c.operacoes>0);assert(c.eventos>0);
 const qtd=a.db.sheets['Lançamentos'].rows.length;assert.deepEqual(JSON.parse(JSON.stringify(api(a,'salvarLancamentoWeb',p))),JSON.parse(JSON.stringify(r)));assert.equal(a.db.sheets['Lançamentos'].rows.length,qtd);
 assert.throws(()=>api(a,'salvarLancamentoWeb',{...p,valorTotal:111}),/identifica|diferente|outro/i);
 const ref={action:'salvarLancamentoWeb',requestId:p.requestId};assert.equal(a.ctx.consultarOperacaoWeb(ref).estado,'confirmado');assert.equal(a.ctx.cancelarOperacaoWeb(ref).estado,'confirmado');
 const h=api(a,'obterAtividadeWeb',{});assert(h.itens.some(e=>e.acao==='salvarLancamentoWeb'));assert(h.total>0);
});

test('comprovante cancelado permanece no diário após manutenção',()=>{
 const a=ambienteProtecao();a.ativar();const ref={action:'salvarLancamentoWeb',requestId:'tecnico-antigo-cancelado-001'};
 a.ctx.cancelarOperacaoWeb(ref);a.ctx.comLockProtecaoGestor_(ss=>a.ctx.compactarHistoricoProtecaoGestor_(ss,a.pasta));
 assert.throws(()=>api(a,'salvarLancamentoWeb',{...launch,requestId:ref.requestId}),/cancelad/i);assert.equal(a.ctx.consultarOperacaoWeb(ref).estado,'cancelado');
});

test('ação reversível recente mantém compra antiga na principal',()=>{
 const a=ambienteProtecao(fixture([personal('Antiga',50,'1/1','12/2025','Pago')]));a.ativar();
 const r=a.db.sheets['Lançamentos'].rows[1],evento={id:'evento-recente-001',data:new Date().toISOString(),acao:'editarLancamentoLinhaWeb',titulo:'Edição',quantidade:1,reversivel:true,alteracoes:[{id:r[11]}]};
 const sh=a.db.getSheetByName('_Gestor_Atividade')||a.db.insertSheet('_Gestor_Atividade');
 sh.getRange(1,1,3,6).setValues([['Evento','Data','Ação','Resumo','Tipo','Conteúdo'],[evento.id,evento.data,evento.acao,evento.titulo,'EVENTO',1],[evento.id,'','','','PARTE 1',JSON.stringify(JSON.stringify(evento))]]);
 assert.equal(a.ctx.previaManutencaoProtegidaWeb().quantidade,0);
});

test('origem alterada ou com identificação repetida não autoriza arquivamento',()=>{
 const a=ambienteAnual();a.db.sheets['Lançamentos'].rows[1][7]=99;assert.throws(()=>a.ctx.previaManutencaoProtegidaWeb(),/mudou/);
 const b=ambienteAnual();b.db.sheets['Lançamentos'].rows.push(clone(b.db.sheets['Lançamentos'].rows[1]));assert.throws(()=>b.ctx.previaManutencaoProtegidaWeb(),/repetidas/);
});

test('gatilho removido é detectado e reativação não duplica outros gatilhos',()=>{
 const a=ambienteProtecao();a.ativar();a.gatilhos.splice(0);assert.equal(a.ctx.obterStatusProtecaoWeb().rotinaInstalada,false);
 a.gatilhos.push({getHandlerFunction:()=> 'outraRotina'});a.ctx.configurarProtecaoAutomaticaGestor(a.pasta.id);assert.equal(a.ctx.obterStatusProtecaoWeb().rotinaInstalada,true);assert.equal(a.gatilhos.length,2);
});

test('compactação de upload na interface mantém o conteúdo anual e sua assinatura',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const fonte=fs.readFileSync(path.join(__dirname,'../interface/restauracao.js'),'utf8'),trecho=fonte.slice(fonte.indexOf('function compactarBackupRestauracaoGestor'),fonte.indexOf('function mensagemErroRestauracaoGestor'));
 const c=vm.createContext({});vm.runInContext(trecho,c);const a=ambienteAnual();a.manter();const b=api(a,'exportarBackupDadosWeb',{restauravel:true}),compacto=c.compactarBackupRestauracaoGestor(b);
 assert.equal(compacto.hashFinanceiro,b.hashFinanceiro);assert.equal(api(a,'previaRestauracaoBackupWeb',{backup:compacto}).arquivosAnuais.length,1);
});

test('restaurar backup anterior sem arquivos anuais substitui catálogo sem apagar cópias do Drive',()=>{
 const a=ambienteAnual(),b=api(a,'exportarBackupDadosWeb',{restauravel:true});a.manter();const arquivo=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0].id;
 const p=api(a,'previaRestauracaoBackupWeb',{backup:b});assert.equal(p.arquivosAtuais,1);
 api(a,'restaurarBackupDadosWeb',{backup:b,versaoAtual:p.versaoAtual,hashBackup:p.hashBackup,confirmacao:'RESTAURAR',requestId:'restauracao-v1-com-anual-001'});
 assert.equal(a.ctx.catalogoAnualProtecaoGestor_(a.db).length,0);assert(a.arquivos.has(arquivo));assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 110,00');
});

test('arquivo anual com datas nativas conserva competência e permite restaurar',()=>{
 const a=ambienteProtecao(fixture([personal('Data nativa',42,'1/1',new Date(2025,11,1),'Pago','Cartao',new Date(2025,11,8))]));a.ativar();assert.equal(a.manter().anual.quantidade,1);
 assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 42,00');const b=api(a,'exportarBackupDadosWeb',{restauravel:true});assert.equal(api(a,'previaRestauracaoBackupWeb',{backup:b}).arquivosAnuais.length,1);
});

test('compartilhar resumo recebido inclui o empréstimo arquivado que aparece na consulta',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),fonte=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),inicio=fonte.indexOf('function copiarCobrancaPessoaWhats(');
 const a=ambienteAnual();a.manter();const itens=api(a,'obterEmprestimosArquivadosWeb',{}).itens,campos={selFiltroMesEmp:'12/2025',selFiltroStatusEmp:'Recebido',selFiltroFormaEmp:'',inpBuscaEmp:''};let mensagem='';
 const c=vm.createContext({document:{getElementById:id=>({value:campos[id]})},emprestimosGlobal:{itens:[]},itensEmprestimosConsultaProtecaoGestor:()=>itens,formaEhImediataGestor:()=>false,formatBRL:v=>'R$ '+v.toFixed(2).replace('.',','),abrirPreviaCobrancaWhats:texto=>mensagem=texto});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../interface/compartilhamento.js'),'utf8'),c);vm.runInContext(fonte.slice(inicio,fonte.indexOf('// ============================================================================',inicio)),c);c.copiarCobrancaPessoaWhats('Ana');assert.match(mensagem,/Total Recebido.*70,00/);assert.match(mensagem,/Ajuda/);assert(!mensagem.includes('Total em Aberto'));
});
