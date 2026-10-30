const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot,fixture,personal,loan,clone}=require('./fixtures/gestor-mocks.cjs');
const alvo={forma:'Cartao',mesFatura:'10/2026'};
function preparar(){const emp=loan('Pessoa','A Receber',208,'Cartao');emp[0]='02/10/2026';const a=boot(fixture([personal('Pessoal',100)],[emp]));a.ctx.executarAcaoApi_('getDadosCompletos',null);return a;}
test('resumo inclui terceiros ainda que recebidos; dispensa descrições e hashes por lançamento',()=>{
 const {ctx,db}=preparar();db.sheets['Empréstimos'].rows[1][9]='Recebido';db.sheets['Empréstimos'].rows[1][8]=new Date(2026,9,1);
 let hashes=0;const antes=ctx.hashRegistroGestor_;ctx.hashRegistroGestor_=(...a)=>{hashes++;return antes(...a);};const copia=JSON.stringify(db.sheets['Empréstimos'].rows);
 const r=ctx.obterFaturaPagamentoWeb({...alvo,resumo:true});assert.equal(r.total,308);assert.equal(r.restante,308);assert.equal(r.pessoal,100);assert.equal(r.terceiros,208);assert.equal(r.quantidade,2);assert.equal(r.itens,undefined);assert.equal(hashes,0);assert.equal(JSON.stringify(db.sheets['Empréstimos'].rows),copia);
});
test('prévia compacta distribui no servidor e pagamento conserva recebimentos e idempotência',()=>{
 const {ctx,db}=preparar();const p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{...alvo,resumo:true,valor:150});
 assert.equal(p.distribuicao.pessoal,100);assert.equal(p.distribuicao.terceiros,50);assert.equal(p.distribuicao.quantidade,2);assert.equal(p.aplicacoes,undefined);assert(p.versaoFatura);
 const pedido={...p,resumo:true,requestId:'resumo-pagamento-001'};ctx.registrarPagamentoFaturaWeb(pedido);ctx.registrarPagamentoFaturaWeb(pedido);
 const f=ctx.obterFaturaPagamentoWeb({...alvo,resumo:true});assert.equal(f.pago,150);assert.equal(f.restante,158);assert.equal(db.sheets['Empréstimos'].rows[1][9],'A Receber');
});
test('alterar fatura depois da prévia compacta impede pagamento com versão antiga',()=>{
 const {ctx,db}=preparar();const p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{...alvo,resumo:true,valor:150});db.sheets['Lançamentos'].rows[1][7]=101;
 assert.throws(()=>ctx.registrarPagamentoFaturaWeb({...p,requestId:'resumo-mudou-001'}),/fatura mudou/);assert.equal(ctx.obterFaturaPagamentoWeb({...alvo,resumo:true}).pago,0);
});
function painel(){const c=vm.createContext({Date,window:{renderizarDados(){}},addEventListener(){},lerValorMoeda:Number});c.window=c;c.renderizarDados=()=>{};c.addEventListener=()=>{};vm.runInContext(fs.readFileSync('interface/painel.js','utf8'),c);return c;}
test('lembretes respeitam data combinada válida e não confundem mês da fatura com atraso',()=>{
 const c=painel(),base={status:'A Receber',pessoa:'Pessoa',mesFatura:'01/2020'};
 const itens=[{...base,dataCombinada:''},{...base,dataCombinada:'31/02/2026'},{...base,dataCombinada:'30/10/2026'},{...base,dataCombinada:'28/10/2026'},{...base,dataCombinada:'06/11/2026'},{...base,dataCombinada:'29/10/2026',status:'Recebido'}],antes=JSON.stringify(itens);
 assert.deepEqual(Array.from(c.listarDevolucoesPainelGestor(itens,new Date(2026,9,29)),i=>i.dias),[-1,1]);assert.equal(JSON.stringify(itens),antes);
});
test('limite inclui gastos já pagos e previsões apenas por escolha; não soma terceiros',()=>{
 const c=painel(),dados={faturas:{mesAtual:'10/2026',horizonte:{totalPessoal:{Pix:{'10/2026':40},Cartao:{'10/2026':60,'11/2026':500}},totalTerceiros:{Cartao:{'10/2026':900}},previstoPessoal:{Cartao:{'10/2026':25}}}}};
 const r=c.calcularLimitePessoalPainelGestor(dados,{centavos:12000,incluirPrevistos:true});assert.equal(r.total,12500);assert.equal(r.margem,-500);assert.equal(r.previsto,2500);
 assert.equal(c.calcularLimitePessoalPainelGestor(dados,{centavos:12000,incluirPrevistos:false}).margem,2000);
});
test('atualizar o Painel preserva a configuração do limite que ainda está sendo editada',()=>{
 const c=painel(),campos=new Map();const el=id=>{if(!campos.has(id))campos.set(id,{value:'',textContent:'',checked:false});return campos.get(id);};
 c.document={getElementById:id=>['devolucoesPainelGestor','listaDevolucoesPainelGestor'].includes(id)?null:el(id),activeElement:null};c.lerJSONLocalGestor=()=>({centavos:12000,incluirPrevistos:false});c.formatBRL=n=>'R$ '+n;
 c.renderizarDados({faturas:{mesAtual:'10/2026',horizonte:{totalPessoal:{Cartao:{'10/2026':150}}}}});
 el('valorLimitePessoalGestor').value='200';el('previsoesLimitePessoalGestor').checked=true;vm.runInContext('limitePessoalEmEdicaoGestor=true',c);c.renderizarRotinaPainelGestor();
 assert.equal(el('valorLimitePessoalGestor').value,'200');assert.equal(el('previsoesLimitePessoalGestor').checked,true);
 c.lerValorMoeda=id=>Number(el(id).value);let tentouGuardar=false;c.gravarArmazenamentoGestor=()=>{tentouGuardar=true;throw Error('Sem espaço');};let avisou=false;c.mostrarAviso=()=>avisou=true;c.salvarLimitePessoalPainelGestor();assert(tentouGuardar);assert(avisou);assert.equal(el('valorLimitePessoalGestor').value,'200');
});
function tela(){
 const campos=new Map(),chamadas=[],confirmacoes=[];function el(id){if(!campos.has(id))campos.set(id,{value:'',textContent:'',disabled:false,children:[],classList:{add(){},remove(){}},replaceChildren(){this.children=[];},append(...x){this.children.push(...x);}});return campos.get(id);}
 const c=vm.createContext({Date,Map,window:{},renderizarDados(){},geracaoLeituraGestor:1,requisicaoPagamentoGestor:0,faturaConferidaGestor:null,pagamentoFaturaEmCursoGestor:false,navigator:{onLine:true},document:{getElementById:el},formatBRL:n=>'R$ '+n,lerValorMoeda:v=>Number(campos.has(v)?el(v).value:v),elementoAtividadeGestor:()=>({append(){}}),mostrarConfirmacao:(...a)=>confirmacoes.push(a),mostrarAviso(){},apiCall:(a,p)=>new Promise((resolve,reject)=>chamadas.push({a,p,resolve,reject}))});c.window=c;vm.runInContext(fs.readFileSync('interface/faturas.js','utf8'),c);el('cartaoPagamentoFaturaGestor').value='Cartao';el('mesPagamentoFaturaGestor').value='10/2026';return {c,el,chamadas,confirmacoes};
}
const resumo={...alvo,total:308,pago:0,restante:308,pessoal:100,terceiros:208,quantidade:2};
test('reabrir usa resumo recente; atualização forçada e mudança de dados consultam novamente',async()=>{
 const a=tela();let p=a.c.conferirPagamentoFaturaGestor();assert.equal(a.chamadas[0].p.resumo,true);assert(a.el('salvarPagamentoFaturaGestor').disabled);a.chamadas[0].resolve(clone(resumo));await p;
 await a.c.conferirPagamentoFaturaGestor();assert.equal(a.chamadas.length,1);
 p=a.c.conferirPagamentoFaturaGestor(true);assert.equal(a.chamadas.length,2);a.chamadas[1].resolve(clone(resumo));await p;
 a.c.geracaoLeituraGestor++;p=a.c.conferirPagamentoFaturaGestor();assert.equal(a.chamadas.length,3);a.chamadas[2].reject(Error('Sem conexão'));await p;assert(a.el('salvarPagamentoFaturaGestor').disabled);assert.equal(a.c.faturaConferidaGestor,null);
});
test('resposta de outro mês não substitui a consulta atual; comparar não registra pagamento',async()=>{
 const a=tela(),p=a.c.conferirPagamentoFaturaGestor();a.el('mesPagamentoFaturaGestor').value='11/2026';const q=a.c.conferirPagamentoFaturaGestor();a.chamadas[1].resolve({...resumo,mesFatura:'11/2026',total:400});await q;a.chamadas[0].resolve(resumo);await p;assert.equal(a.c.faturaConferidaGestor.total,400);
 a.el('totalBancoConferenciaGestor').value='400';a.c.atualizarComparacaoFaturaGestor();assert.match(a.el('resultadoComparacaoFaturaGestor').textContent,/totais conferem/);assert.equal(a.chamadas.length,2);assert.equal(a.confirmacoes.length,0);
});
test('alterar valor enquanto a prévia carrega não oferece confirmação de um valor anterior',async()=>{
 const a=tela();a.c.faturaConferidaGestor=clone(resumo);a.el('valorPagamentoFaturaGestor').value='100';const p=a.c.confirmarPagamentoFaturaGestor();a.el('valorPagamentoFaturaGestor').value='150';a.chamadas[0].resolve({...alvo,valor:100,distribuicao:{pessoal:100,terceiros:0,quantidade:1}});await p;assert.equal(a.confirmacoes.length,0);assert.equal(a.chamadas.length,1);
});
test('mudar mês ou valor depois da prévia impede confirmar o contexto antigo',async()=>{
 for(const campo of ['mesPagamentoFaturaGestor','valorPagamentoFaturaGestor']){const a=tela();a.c.faturaConferidaGestor=clone(resumo);a.el('valorPagamentoFaturaGestor').value='100';const p=a.c.confirmarPagamentoFaturaGestor();a.chamadas[0].resolve({...alvo,valor:100,distribuicao:{pessoal:100,terceiros:0,quantidade:1}});await p;assert.equal(a.confirmacoes.length,1);a.el(campo).value=campo.startsWith('mes')?'11/2026':'150';await a.confirmacoes[0][2]();assert.equal(a.chamadas.length,1);}
});
async function outraFaturaDuranteEnvio(){
 const a=tela(),classes=new Set(),avisos=[];
 a.el('modalPagamentoFaturaGestor').classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};
 a.el('formPagamentoFaturaGestor').elements=['cartaoPagamentoFaturaGestor','mesPagamentoFaturaGestor','valorPagamentoFaturaGestor','salvarPagamentoFaturaGestor'].map(a.el);
 Object.assign(a.c,{formasGlobais:[{nome:'Cartao'}],formaEhCartaoGestor:()=>true,fecharMenuMobile(){},Option:function(t,v){this.value=v;},carregarDados:async()=>{},atualizarBadgeAtividadeGestor(){},mostrarAviso:(...v)=>avisos.push(v)});
 a.el('cartaoPagamentoFaturaGestor').add=()=>{};a.el('cartaoPagamentoFaturaGestor').focus=()=>{};
 a.c.faturaConferidaGestor=clone(resumo);a.el('valorPagamentoFaturaGestor').value='100';const previa=a.c.confirmarPagamentoFaturaGestor();a.chamadas[0].resolve({...alvo,valor:100,versaoFatura:'versao-1',regra:'regra',distribuicao:{pessoal:100,terceiros:0,quantidade:1}});await previa;
 const envio=a.confirmacoes[0][2]();a.c.fecharPagamentoFaturaGestor();const nova=a.c.abrirConferenciaFaturaGestor('Cartao','11/2026');
 return {...a,classes,avisos,envio,nova};
}
test('resposta de pagamento anterior não fecha nem habilita a janela reaberta enquanto a consulta carrega',async()=>{
 const a=await outraFaturaDuranteEnvio();assert.equal(a.chamadas[1].p.mesFatura,'10/2026');assert(a.el('salvarPagamentoFaturaGestor').disabled);a.chamadas[1].resolve({restante:208});await a.envio;
 assert(!a.classes.has('hidden'));assert.equal(a.el('mesPagamentoFaturaGestor').value,'11/2026');assert(a.el('salvarPagamentoFaturaGestor').disabled);assert.equal(a.c.faturaConferidaGestor,null);assert.match(a.avisos[0][0],/Cartao.*10\/2026/);
 a.chamadas[2].resolve({...resumo,mesFatura:'11/2026'});await a.nova;assert.equal(a.el('salvarPagamentoFaturaGestor').disabled,false);
});
test('erro tardio do pagamento antigo não dispara consulta nem substitui os campos da nova fatura',async()=>{
 const a=await outraFaturaDuranteEnvio();a.chamadas[1].reject(Error('Rejeição do pagamento antigo'));await a.envio;assert.equal(a.chamadas.length,3);assert(!a.classes.has('hidden'));assert(a.el('salvarPagamentoFaturaGestor').disabled);assert.equal(a.el('mesPagamentoFaturaGestor').value,'11/2026');
 a.chamadas[2].resolve({...resumo,mesFatura:'11/2026'});await a.nova;assert.equal(a.c.faturaConferidaGestor.mesFatura,'11/2026');
});
