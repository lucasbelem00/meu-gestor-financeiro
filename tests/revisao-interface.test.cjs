const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function carregarCatalogo(ctx){vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/acoes.js'),'utf8'),ctx);}
function trecho(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
const helpers=trecho('    function lerCacheLeituraGestor(','    function lerJSONLocalGestor(');
function armazenamento(quota=false){const m=new Map();return {getItem:k=>m.get(k)??null,setItem(k,v){if(quota)throw Error('QuotaExceededError');m.set(k,v);},removeItem:k=>m.delete(k)};}
test('cache cheio não impede exibir resposta válida nem vira erro de conexão',async()=>{
 let renders=0;const avisos=[];
 const ctx=vm.createContext({localStorage:armazenamento(true),requisicaoCarregarDadosAtual:0,inicializarNotasLocaisGestor(){},dadosCarregadosIniciais:true,notasGlobais:[],apiCall:async()=>({teste:true}),renderizarDados(){renders++;},sincronizarNotasNuvem(){},mostrarAviso:(t)=>avisos.push(t)});
 require('./fixtures/aviso-leitura-ui.cjs')(ctx);vm.runInContext(helpers+trecho('    function carregarDados() {','function limparFormularioEmprestimo()'),ctx);
 assert.equal(await ctx.carregarDados(),true);assert.equal(renders,1);assert.equal(avisos.length,0);
});
test('cache inacessível também permite leitura online',async()=>{
 let renders=0;const local=armazenamento();local.getItem=()=>{throw Error('SecurityError');};
 const ctx=vm.createContext({localStorage:local,requisicaoCarregarDadosAtual:0,inicializarNotasLocaisGestor(){},dadosCarregadosIniciais:true,notasGlobais:[],apiCall:async()=>({}),renderizarDados(){renders++;},sincronizarNotasNuvem(){},mostrarAviso(){}});
 require('./fixtures/aviso-leitura-ui.cjs')(ctx);vm.runInContext(helpers+trecho('    function carregarDados() {','function limparFormularioEmprestimo()'),ctx);assert.equal(await ctx.carregarDados(),true);assert.equal(renders,1);
});
test('mutação de configuração usa a versão capturada no início da edição',()=>{
 const ctx=vm.createContext({versoesConfigGestor:{formas:'nova',categorias:'nova'},versaoModalFormaGestor:'modal-antiga',versaoCategoriasEdicaoGestor:'categorias-antiga',versaoFormasEdicaoGestor:'ordem-antiga',detalhesReferenciaGestor:()=>null});
 vm.runInContext(trecho('    function prepararMutacaoGestor(','    async function comTravaAbasGestor('),ctx);
 assert.equal(ctx.prepararMutacaoGestor('salvarFormaPagamentoWeb',{}).versaoConfiguracao,'modal-antiga');
 assert.equal(ctx.prepararMutacaoGestor('salvarCategoriasWeb',{}).versaoConfiguracao,'categorias-antiga');
 assert.equal(ctx.prepararMutacaoGestor('reordenarFormasPagamentoWeb',{}).versaoConfiguracao,'ordem-antiga');
 assert.equal(ctx.prepararMutacaoGestor('excluirFormaPagamentoWeb',{versaoConfiguracao:'confirmacao-antiga'}).versaoConfiguracao,'confirmacao-antiga');
});
function contextoCompartilhamento(api,local=armazenamento()){
 const ctx=vm.createContext({localStorage:local,leiturasAtividadeGestor:new Set(['getDadosCompletos','obterRelatorioMes','obterRelatorioAnual']),limparCachesAposRestauracaoGestor(){},integridadeServidorGestor:{bloqueada:false},atualizarIntegridadeServidorGestor(){},conferirPendenciasGestor:async()=>({confirmadas:0}),apiCall:api});ctx.window=ctx;
 carregarCatalogo(ctx);vm.runInContext(helpers+trecho('const apiAntesDesempenhoGestor = window.apiCall;','// A restauração é gerada a partir de interface/restauracao.js.'),ctx);return ctx;
}

test('ingestão compartilhada de dados confirmados atualiza identidades, época, integridade e pendências',async()=>{
 const local=armazenamento(),ctx=contextoCompartilhamento(async()=>({}),local),identidades=[],integridades=[];let limpezas=0,conferencias=0;
 ctx.registrarIdentidadesGestor=(...args)=>identidades.push(args);ctx.atualizarIntegridadeServidorGestor=i=>integridades.push(i);ctx.limparCachesAposRestauracaoGestor=()=>limpezas++;ctx.conferirPendenciasGestor=async()=>conferencias++;
 local.setItem('gestorRestauracaoEmAndamentoV1','epoca-atual');
 const dados={protocoloGestor:18,epocaRestauracao:'epoca-atual',integridade:{bloqueada:false}};
 assert.equal(ctx.receberEstadoDadosCompletosGestor(dados),dados);await new Promise(r=>setImmediate(r));
 assert.equal(identidades[0][0],'getDadosCompletos');assert.equal(identidades[0][1],dados);assert.equal(identidades[0][2],true);
 assert.equal(local.getItem('gestorEpocaRestauracaoV1'),'epoca-atual');assert.equal(local.getItem('gestorRestauracaoEmAndamentoV1'),null);assert.equal(limpezas,1);assert.equal(integridades[0],dados.integridade);assert.equal(conferencias,1);
});
test('consultas mensais iguais compartilham envio sem reutilizar outro mês ou leitura anterior à gravação',async()=>{
 const chamadas=[];const ctx=contextoCompartilhamento((a,p)=>new Promise(resolve=>chamadas.push({a,p,resolve})));
 const p1=ctx.apiCall('obterRelatorioMes','10/2026'),p2=ctx.apiCall('obterRelatorioMes','10/2026'),p3=ctx.apiCall('obterRelatorioMes','11/2026');
 assert.equal(p1,p2);await new Promise(r=>setImmediate(r));assert.equal(chamadas.length,2);
 const gravacao=ctx.apiCall('salvarLancamentoWeb',{requestId:'fake-001'});await new Promise(r=>setImmediate(r));
 const p4=ctx.apiCall('obterRelatorioMes','10/2026');await new Promise(r=>setImmediate(r));assert.equal(chamadas.length,4);assert.notEqual(p4,p1);
 chamadas.forEach(c=>c.resolve({}));await Promise.all([p1,p2,p3,p4,gravacao]);
});
test('falha ao persistir versão da restauração permite consulta e bloqueia gravações',async()=>{
 let chamadas=0;const ctx=contextoCompartilhamento(async()=>{chamadas++;return {epocaRestauracao:''};},armazenamento(true));
 await ctx.apiCall('getDadosCompletos');await assert.rejects(ctx.apiCall('salvarLancamentoWeb',{}),/armazenamento/);assert.equal(chamadas,1);
});
test('timeout de leitura não dispara outra consulta automática e espera mais que o proxy',async()=>{
 let chamadas=0,limite;
 const ctx=vm.createContext({AbortController,protocoloServidorGestor:2,seguro:(n,f)=>f(),setTimeout(fn,ms){limite=ms;return setImmediate(fn);},clearTimeout(id){clearImmediate(id);},estaNoAppsScript:()=>false,API_URL:'/fake',fetch:async(url,op)=>{chamadas++;return new Promise((resolve,reject)=>op.signal.addEventListener('abort',()=>{const e=Error('abort');e.name='AbortError';reject(e);}));},registrarIdentidadesGestor(){}});ctx.window=ctx;
 carregarCatalogo(ctx);vm.runInContext(trecho("  seguro('apiCall'",'  /* ------------------------------------------------------------------ 2 */'),ctx);
 await assert.rejects(ctx.apiCall('obterRelatorioMes','10/2026'),/demorou/);assert.equal(chamadas,1);assert.equal(limite,60000);
});


test('timeout informado pelo proxy também não dispara uma segunda espera',async()=>{
 let chamadas=0;
 const ctx=vm.createContext({AbortController,protocoloServidorGestor:2,seguro:(n,f)=>f(),setTimeout,clearTimeout,estaNoAppsScript:()=>false,API_URL:'/fake',fetch:async()=>{chamadas++;return {ok:false,status:504};},registrarIdentidadesGestor(){}});ctx.window=ctx;
 carregarCatalogo(ctx);vm.runInContext(trecho("  seguro('apiCall'",'  /* ------------------------------------------------------------------ 2 */'),ctx);
 await assert.rejects(ctx.apiCall('obterRelatorioMes','10/2026'),/504/);assert.equal(chamadas,1);
});

test('recorrência integrada recusa servidor anterior em gasto, empréstimo e fila; protocolo novo permite',()=>{
 const ctx=vm.createContext({protocoloServidorGestor:18,detalhesReferenciaGestor:()=>null});vm.runInContext(trecho('    function prepararMutacaoGestor(','    async function comTravaAbasGestor('),ctx);
 for(const acao of ['salvarLancamentoWeb','salvarEmprestimoWeb'])assert.throws(()=>ctx.prepararMutacaoGestor(acao,{recorrenciaModo:'revisao'}),/Atualize o Apps Script/);
 assert.throws(()=>ctx.prepararMutacaoGestor('sincronizarLoteWeb',[{recorrenciaModo:'revisao'}]),/Atualize o Apps Script/);
 ctx.protocoloServidorGestor=19;assert.equal(ctx.prepararMutacaoGestor('salvarLancamentoWeb',{recorrenciaModo:'revisao'}).recorrenciaModo,'revisao');
 const fila=[{recorrenciaModo:'automatico'}];assert.equal(ctx.prepararMutacaoGestor('sincronizarLoteWeb',fila),fila);
});
