const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {contexto,armazenamento}=require('./fixtures/usabilidade-ui.cjs');
const {boot,fixture}=require('./fixtures/gestor-mocks.cjs');
function real(p){p.c.GESTOR_NOTAS_OP_PREFIXO='gestorNotasOpV2:';const fonte=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),i=fonte.indexOf('    function registrarOperacaoNotaGestor('),f=fonte.indexOf('    function inicializarNotasLocaisGestor(',i);vm.runInContext(fonte.slice(i,f),p.c);return p;}
function criar(){const a=real(contexto());a.el('inpNovaNotaTexto').value='Lembrete compartilhado';a.c.guardarTextoNotaGestor();const b=real(contexto(a.local,armazenamento(Object.fromEntries(a.sessao.m))));b.c.restaurarRascunhoNotaGestor();return {a,b};}
const operacoes=p=>[...p.local.m].filter(([k])=>k.startsWith('gestorNotasOpV2:')).map(([,v])=>JSON.parse(v));
test('mesma nota enviada por duas páginas em paralelo cria uma operação e uma nota no servidor',async()=>{
 const {a,b}=criar();await Promise.all([a.c.adicionarNotaRapida(),b.c.adicionarNotaRapida()]);const ops=operacoes(a);assert.equal(ops.length,1);const servidor=boot(fixture()),r=servidor.ctx.executarAcaoApi_('salvarNotasWeb',{operacoes:ops,revision:0,requestId:'nota-concorrente-confirmar-001'});assert.equal(r.anotacoes.length,1);assert.equal(r.anotacoes[0].texto,'Lembrete compartilhado');await b.c.adicionarNotaRapida();assert.equal(operacoes(a).length,1);
});
test('identificação determinística conserva uma operação mesmo com reserva concorrente sem trava',async()=>{
 const {a,b}=criar();a.c.comTravaAbasGestor=b.c.comTravaAbasGestor=async(_nome,fn)=>fn();await Promise.all([a.c.adicionarNotaRapida(),b.c.adicionarNotaRapida()]);assert.equal(operacoes(a).length,1);assert.equal(operacoes(a)[0].nota.texto,'Lembrete compartilhado');
});
test('notas independentes iguais e edição posterior de uma cópia continuam permitidas',async()=>{
 const {a,b}=criar();const c=real(contexto(a.local));c.el('inpNovaNotaTexto').value='Lembrete compartilhado';c.c.guardarTextoNotaGestor();await a.c.adicionarNotaRapida();b.el('inpNovaNotaTexto').value='Lembrete alterado';b.c.guardarTextoNotaGestor();await b.c.adicionarNotaRapida();await c.c.adicionarNotaRapida();assert.equal(operacoes(a).length,3);assert.equal(new Set(operacoes(a).map(o=>o.id)).size,3);
});
test('alteração de texto durante a preparação preserva o campo e não envia fotografia antiga',async()=>{
 const {a}=criar();let resolver;a.c.hashTextoRestauracaoGestor=()=>new Promise(r=>resolver=r);const p=a.c.adicionarNotaRapida();a.el('inpNovaNotaTexto').value='Texto digitado depois';resolver('a'.repeat(64));await p;assert.equal(operacoes(a).length,0);assert.equal(a.el('inpNovaNotaTexto').value,'Texto digitado depois');assert.equal(a.el('btnAdicionarNotaGestor').disabled,false);
});
test('falha ao reservar a nota não apaga o texto nem cria operação parcial',async()=>{
 const {a}=criar(),gravar=a.local.setItem;a.local.setItem=(k,v)=>{if(k.startsWith('gestorNotaReservaV1:'))throw Error('Sem espaço');gravar(k,v);};await a.c.adicionarNotaRapida();assert.equal(operacoes(a).length,0);assert.equal(a.el('inpNovaNotaTexto').value,'Lembrete compartilhado');assert.equal(a.el('btnAdicionarNotaGestor').disabled,false);
});
