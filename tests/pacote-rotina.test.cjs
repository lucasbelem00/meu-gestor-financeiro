const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const {boot,fixture,personal,loan,launch}=require('./fixtures/gestor-mocks.cjs');
const {ambiente,exibirMesesNativos,esperar}=require('./fixtures/pacote-rotina-ui.cjs');
const ler=ctx=>ctx.executarAcaoApi_('getDadosCompletos',null);
const alvo=(r,linha=2)=>({registroId:r[11],compraId:r[12],versao:r[13],linha,descricao:r[1],descOriginal:r[1],mesFatura:r[8],mesOriginal:r[8],parcela:r[6],parcelaOriginal:r[6]});
test('pular fixo, recarregar e desfazer conserva uma única ocorrência e o total',()=>{
 const r=personal('Assinatura',90,'∞/∞','09/2026','Assinatura Ativa','Cartao','30/09/2026');
 const {ctx,db}=boot(fixture([r]));ler(ctx);let outubro=db.sheets['Lançamentos'].rows.find(r=>String(r[8]).replace(/^'/,'')==='10/2026');
 const p={...alvo(outubro,db.sheets['Lançamentos'].rows.indexOf(outubro)+1),requestId:'rotina-pular-001'};
 ctx.excluirLancamentoWeb(p);ctx.excluirLancamentoWeb(p);ler(ctx);
 let linhas=db.sheets['Lançamentos'].rows.filter(r=>String(r[8]).replace(/^'/,'')==='10/2026');assert.equal(linhas.length,1);assert.equal(linhas[0][9],'Ocorrência Pulada');
 const e=ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens.find(e=>e.acao==='excluirLancamentoWeb');assert.equal(e.podeDesfazer,true);
 ctx.desfazerAtividadeWeb({eventoId:e.id,requestId:'rotina-desfazer-001'});ler(ctx);linhas=db.sheets['Lançamentos'].rows.filter(r=>String(r[8]).replace(/^'/,'')==='10/2026');assert.equal(linhas.length,1);assert.equal(linhas[0][7],90);assert.equal(ctx.isStatusCancelado(linhas[0][9]),false);
});
test('pular a única ocorrência não permite criar uma segunda série idêntica',()=>{
 const {ctx,db}=boot(fixture([personal('Assinatura',90,'∞/∞','10/2026','Assinatura Ativa')]));ler(ctx);ctx.excluirLancamentoWeb({...alvo(db.sheets['Lançamentos'].rows[1]),requestId:'rotina-pular-unica-001'});assert.throws(()=>ctx.salvarLancamentoWeb({...launch,descricao:'Assinatura',numParcelas:1,valorTotal:90,isAssinatura:true,requestId:'rotina-ass-duplicada-001'}),/assinatura ativa/);
});
test('desfazer exclusão legada de fixo é bloqueado se outra ocorrência ocupa a série e o mês',()=>{
 const {ctx,db}=boot(fixture([personal('Fixo',90,'∞/∞','10/2026','Assinatura Ativa')]));ler(ctx);const r=db.sheets['Lançamentos'].rows[1].slice(),substituta=r.slice();substituta[11]='substituta-001';const evento={id:'exclusao-antiga',reversivel:true,alteracoes:[{id:r[11],aba:'Lançamentos',antes:r,depois:null}]},mapa=new Map([[substituta[11],{aba:'Lançamentos',registro:substituta,linha:2}]]);assert.match(ctx.motivoBloqueioDesfazerGestor_(evento,mapa,new Set()),/Já existe uma ocorrência/);
});
test('fixo legado com data nativa conserva dia 30 sem inferir um dia desconhecido',()=>{
 const r=personal('Assinatura',90,'∞/∞','09/2026','Assinatura Ativa','Cartao');r[0]=new Date(2026,8,30);const {ctx,db}=boot(fixture([r]));ler(ctx);const outubro=db.sheets['Lançamentos'].rows.find(r=>String(r[8]).replace(/^'/,'')==='10/2026');assert.equal(String(outubro[0]).replace(/^'/,''),'30/10/2026');
});
test('condições futuras de fixo permitem cartão novo sem mover pagamento histórico',()=>{
 const r=personal('Assinatura',20,'∞/∞','10/2026','Assinatura Ativa');
 const {ctx,db}=boot(fixture([r]));ler(ctx);const f=ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});ctx.registrarPagamentoFaturaWeb({...f,valor:20,requestId:'rotina-pagar-fixo-001'});
 ctx.salvarFormaPagamentoWeb({nome:'Novo',banco:'Teste',tipo:'cartao',limite:1000,fechamento:5,vencimento:10,versaoConfiguracao:ctx.versaoConfiguracaoGestor_(db,'formas'),requestId:'rotina-forma-001'});
 const antigo=db.sheets['Lançamentos'].rows[1];ctx.editarAssinaturaWeb({...alvo(antigo),linhaBase:2,novaDesc:'Assinatura',novaForma:'Novo',novaCat:'Teste',novaValor:25,aPartirMes:'11/2026',requestId:'rotina-condicoes-001'});
 const rows=db.sheets['Lançamentos'].rows.slice(1);assert.equal(rows.find(r=>String(r[8]).includes('10/2026'))[2],'Cartao');assert.equal(rows.find(r=>String(r[8]).includes('10/2026'))[17],20);assert.equal(rows.find(r=>String(r[8]).includes('11/2026'))[2],'Novo');assert.equal(rows.find(r=>String(r[8]).includes('11/2026'))[7],25);
});
test('antecipação recusa deslocar uma parcela parcialmente paga e não modifica os dados',()=>{
 const {ctx,db}=boot(fixture());ctx.salvarLancamentoWeb({...launch,requestId:'rotina-compra-001'});const f=ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'11/2026'});ctx.registrarPagamentoFaturaWeb({...f,valor:10,requestId:'rotina-pagamento-001'});
 const r=db.sheets['Lançamentos'].rows.find(r=>String(r[8]).includes('10/2026')),antes=JSON.stringify(db.sheets['Lançamentos'].rows);
 assert.throws(()=>ctx.previaAntecipacaoWeb({...alvo(r),mesDestino:'10/2026'}),/já possui pagamento/);assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
});
for(const coluna of [0,6,8])test('backup exportado com Date na coluna '+coluna+' é aceito sem alterar a planilha',()=>{
 const {ctx,db}=boot(fixture([personal('Compra',100)]));ler(ctx);const formatar=ctx.Utilities.formatDate;ctx.Utilities.formatDate=(d,t,f)=>f==="yyyy-MM-dd'T'HH:mm:ss"?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T00:00:00`:formatar(d,t,f);
 db.sheets['Lançamentos'].rows[1][coluna]=coluna===6?new Date(2026,0,1):new Date(2026,9,16);const antes=JSON.stringify(db.sheets['Lançamentos'].rows),b=ctx.exportarBackupDadosWeb();assert.doesNotThrow(()=>ctx.validarBackupRestauracaoGestor_(b));assert.equal(JSON.stringify(db.sheets['Lançamentos'].rows),antes);
});
test('editar categoria após remover outra mantém o alvo e o histórico correto',async()=>{
 const a=ambiente();a.c.renderizarListaCategorias();a.c.editarCategoriaUi(1);a.c.removerCategoriaUi(0);a.el('inpNovaCat').value='Lazer atualizado';a.c.adicionarCategoriaUi();a.c.salvarCategorias();await esperar();const rows=a.db.sheets['Lançamentos'].rows;assert.equal(rows.find(r=>r[1]==='Cinema')[3],'Lazer atualizado');assert.equal(rows.find(r=>r[1]==='Ônibus')[3],'Transporte');
});
test('Outros é reservado na interface e no servidor, mas a meta permanece editável',async()=>{
 const a=ambiente();a.c.renderizarListaCategorias();a.c.removerCategoriaUi(3);assert.equal(a.c.categoriasGlobaisEdit.length,4);a.c.editarCategoriaUi(3);assert.equal(a.el('inpNovaCat').disabled,true);a.el('inpNovaMeta').value='200';a.c.adicionarCategoriaUi();a.c.salvarCategorias();await esperar();
 const dados=ler(a.ctx);assert.equal(dados.configCategorias.at(-1).nome,'Outros 📦');assert.equal(dados.configCategorias.at(-1).meta,200);
 assert.throws(()=>a.ctx.salvarCategoriasWeb({categorias:[{nome:'Lazer',meta:0}],versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'categorias'),requestId:'rotina-remover-outros-001'}),/reservada/);
});
test('arquivar informa o resultado correto e reativar conserva os limites e o histórico',async()=>{
 const a=ambiente();ler(a.ctx);a.c.versoesConfigGestor.formas=a.ctx.versaoConfiguracaoGestor_(a.db,'formas');a.c.excluirFormaLocal('Cartao');a.confirmacoes[0].fn();await esperar();assert.match(a.avisos.at(-1)[1],/histórico/);
 const antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);a.ctx.salvarFormaPagamentoWeb({nomeOriginal:'Cartao',nome:'Cartao',reativar:true,versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'rotina-reativar-001'});assert.equal(a.db.sheets['Formas de Pagamento'].rows.find(r=>r[1]==='Cartao')[6],'');assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(a.db.sheets['Formas de Pagamento'].rows.find(r=>r[1]==='Cartao')[3],1000);
});
test('aviso de terceiro com mês Date preserva saldo e independência do recebimento',()=>{
 const {ctx,db}=boot(fixture([],[loan('Ana','Recebido',70,'Cartao')]));ler(ctx);db.sheets['Empréstimos'].rows[1][8]=new Date(2026,9,1);exibirMesesNativos(db.sheets['Empréstimos']);const d=ler(ctx);assert.equal(d.alertasVencimento.length,1);assert.equal(d.alertasVencimento[0].valorRaw,70);assert.equal(ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'}).restante,70);
});
test('Pix automático fica separado da mensagem editável e desmarcar o exclui da cópia',()=>{
 const a=ambiente();a.local.set('gestorPixCobrancaV1','teste@exemplo.com');a.local.set('gestorPixPadraoV1','true');a.c.abrirPreviaCobrancaWhats('Resumo','Copiado');a.el('textoModalPixCobranca').value='Resumo editado';a.el('chkIncluirPixCobranca').checked=false;a.el('chkIncluirPixCobranca').onchange();a.el('btnCopiarPixCobranca').onclick();assert.equal(a.copias[0][0],'Resumo editado');
});
test('data combinada se mantém mensal, é validada e não registra recebimento',()=>{
 const {ctx,db}=boot(fixture());ctx.salvarEmprestimoWeb({dataCompra:'01/10/2026',pessoa:'Ana',descricao:'Ajuda',formaPagto:'Pix',valorTotal:100,numParcelas:2,parcelaInicial:1,pixParcelado:true,mesPrimeiraFatura:'10/2026',dataCombinada:'31/01/2027',requestId:'rotina-combinada-001'});
 const d=ler(ctx);assert.deepEqual(Array.from(d.emprestimos.itens,i=>i.dataCombinada),['31/01/2027','28/02/2027']);assert(d.emprestimos.itens.every(i=>i.status==='A Receber'));const antes=JSON.stringify(db.sheets['Empréstimos'].rows);assert.throws(()=>ctx.salvarEmprestimoWeb({dataCompra:'01/10/2026',pessoa:'Ana',descricao:'Ajuda',formaPagto:'Pix',valorTotal:50,mesPrimeiraFatura:'10/2026',dataCombinada:'31/02/2027',requestId:'rotina-combinada-002'}),/inválida|não existe/);assert.equal(JSON.stringify(db.sheets['Empréstimos'].rows),antes);
});

// Exercita os auxiliares reais do armazenamento, sem carregar a aplicação inteira.
const rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8');
function armazenamento(){const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function contextoRascunho(local=armazenamento(),sessao=armazenamento()){
 const c=vm.createContext({console,Date,localStorage:local,sessionStorage:sessao,novoRequestIdGestor:()=>crypto.randomUUID(),formatBRL:n=>'R$ '+Number(n).toFixed(2),gravarArmazenamentoGestor:(k,v,o={})=>{(o.sessao?sessao:local).setItem(k,v);return true;},lerJSONLocalGestor:(k,p)=>{try{return JSON.parse(local.getItem(k))||p;}catch(_){return p;}},lerCacheLeituraGestor:k=>local.getItem(k),mostrarAviso(){}});
 vm.runInContext(rotina.slice(rotina.indexOf('const paginaRascunhoGestor='),rotina.indexOf('const guardarRascunhoAnteriorRotinaGestor=')),c);return {c,local,sessao};
}
test('rascunhos duráveis sobrevivem à sessão e páginas não sobrescrevem umas às outras',()=>{
 const a=contextoRascunho();a.c.guardarRascunhoRotinaGestor('novo',{desc:'Primeiro'});const b=contextoRascunho(a.local);b.c.guardarRascunhoRotinaGestor('novo',{desc:'Segundo'});assert.notEqual(a.c.chaveRascunhoRotinaGestor('novo'),b.c.chaveRascunhoRotinaGestor('novo'));assert.equal(JSON.parse(a.local.getItem(a.c.chaveRascunhoRotinaGestor('novo'))).dados.desc,'Primeiro');
 const novaSessao=contextoRascunho(a.local);assert.equal(a.local.m.size,2);assert.equal(novaSessao.c.lerJSONLocalGestor(a.c.chaveRascunhoRotinaGestor('novo'),null).dados.desc,'Primeiro');
});
test('duplicação de aba lê a cópia anterior e grava em outra chave, preservando o requestId',()=>{
 const a=contextoRascunho();a.c.guardarRascunhoRotinaGestor('racha',{versao:1,envio:{payload:{requestId:'racha-id-existente'}}});const sessao=armazenamento();for(const [k,v]of a.sessao.m)sessao.setItem(k,v);const b=contextoRascunho(a.local,sessao);const dados=JSON.parse(b.c.lerRascunhoRotinaGestor('racha'));b.c.guardarRascunhoRotinaGestor('racha',dados);assert.equal(dados.envio.payload.requestId,'racha-id-existente');assert.notEqual(a.c.chaveRascunhoRotinaGestor('racha'),b.c.chaveRascunhoRotinaGestor('racha'));
});
test('sugestões respeitam preenchimento manual e a prévia distribui todos os centavos',()=>{
 const {c}=contextoRascunho();assert.equal(c.podeSugerirCampoGestor({value:'Pix',dataset:{}}),false);assert.equal(c.podeSugerirCampoGestor({value:'Pix',dataset:{valorSugerido:'Pix',escolhaManual:'true'}}),false);assert.equal(c.podeSugerirCampoGestor({value:'',dataset:{}}),true);assert.equal(c.resumoParcelasExatasGestor(100,3),'1x de R$ 33.34 + 2x de R$ 33.33');
});
test('recuperar outra cópia arquiva o preenchimento atual antes de substituí-lo',()=>{
 const {c,local}=contextoRascunho(),campo={id:'inpDesc',value:'Atual',dataset:{}},form={elements:[campo]},confirmacoes=[];c.document={getElementById:id=>id==='formLancamento'?form:id==='inpDesc'?campo:null};c.haRascunhoFormularioGestor=()=>true;c.bloqueioFormularioRotinaGestor=()=>false;c.mostrarConfirmacao=(...args)=>confirmacoes.push(args);c.atualizarLayoutParcelas=()=>{};c.atualizarPreviewParcelas=()=>{};c.salvarRascunho=()=>c.guardarRascunhoRotinaGestor('novo',{campos:{inpDesc:campo.value}});
 const copia={versao:3,tipo:'novo',atualizadoEm:1,dados:{campos:{inpDesc:'Recuperado'}}},chave='gestorRascunhoV3:novo:antigo';local.setItem(chave,JSON.stringify(copia));const i=rotina.indexOf('function recuperarRascunhoRotinaGestor('),f=rotina.indexOf('function restaurarBotoesEditorEmpGestor(',i);vm.runInContext(rotina.slice(i,f),c);c.recuperarRascunhoRotinaGestor('novo',chave,copia);confirmacoes[0][2]();assert.equal(campo.value,'Recuperado');const textos=Array.from(local.m.values(),s=>JSON.parse(s).dados?.campos?.inpDesc);assert(textos.includes('Atual'));assert(textos.includes('Recuperado'));
});
test('resumo de atividade antiga é formatado sem reescrever seu conteúdo original',()=>{
 const {ctx,db}=boot(fixture([personal('Compra',100)]));ler(ctx);const r=db.sheets['Lançamentos'].rows[1].slice();r[0]=new Date(2026,9,16);r[8]=new Date(2026,9,1);r[6]=new Date(2026,0,1);const evento={id:'evento-antigo',titulo:'Antes',acao:'editarLancamentoLinhaWeb',data:'2026-10-16',resumo:{mes:String(r[8]),parcela:String(r[6])},quantidade:1,reversivel:false,alteracoes:[{aba:'Lançamentos',id:r[11],antes:r,depois:r}]},antes=JSON.stringify(evento);ctx.lerEventosAtividadeGestor_=()=>[evento];const h=ctx.obterAtividadeWeb({});assert.equal(h.itens[0].resumo.mes,'10/2026');assert.equal(h.itens[0].resumo.parcela,'1/1');assert.equal(JSON.stringify(evento),antes);
});
