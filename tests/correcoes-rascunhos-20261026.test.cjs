const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const {contexto,armazenamento}=require('./fixtures/usabilidade-ui.cjs');
function herdar(a){const b=contexto(a.local,armazenamento(Object.fromEntries(a.sessao.m)));b.c.restaurarRascunhoNotaGestor();return b;}

test('nota herdada e adicionada não reaparece ao reabrir nem pode ser duplicada pela aba original',()=>{
 const a=contexto();a.el('inpNovaNotaTexto').value='Lembrete herdado';a.c.guardarTextoNotaGestor();const b=herdar(a),c=herdar(b);c.c.adicionarNotaRapida();assert.equal(c.gravadas.length,1);
 const d=herdar(c);assert.equal(d.c.listarRascunhosNotasGestor().length,0);assert.equal(d.el('inpNovaNotaTexto').value,'');a.c.adicionarNotaRapida();assert.equal(a.gravadas.length,0);assert.equal(a.el('inpNovaNotaTexto').value,'');
});

test('conclusão de nota preserva edição posterior feita em outra aba e os comprovantes anteriores',()=>{
 const a=contexto();a.el('inpNovaNotaTexto').value='Versão original';a.c.guardarTextoNotaGestor();const b=herdar(a);a.el('inpNovaNotaTexto').value='Edição posterior';a.c.guardarTextoNotaGestor();b.c.adicionarNotaRapida();
 const c=contexto(a.local),copias=c.c.listarRascunhosNotasGestor();assert.equal(copias.length,1);assert.equal(copias[0].valor.texto,'Edição posterior');c.c.recuperarRascunhoNotaGestor(copias[0].chave);c.c.adicionarNotaRapida();assert.equal(c.gravadas[0].n.texto,'Edição posterior');assert.equal(herdar(c).c.listarRascunhosNotasGestor().length,0);
 const antigo=herdar(b);assert.equal(antigo.c.listarRascunhosNotasGestor().length,0);
});

test('rascunhos independentes com texto igual não são descartados como se fossem a mesma nota',()=>{
 const a=contexto();a.el('inpNovaNotaTexto').value='Mesmo texto';a.c.guardarTextoNotaGestor();const b=contexto(a.local);b.el('inpNovaNotaTexto').value='Mesmo texto';b.c.guardarTextoNotaGestor();b.c.adicionarNotaRapida();const c=contexto(a.local);assert.equal(c.c.listarRascunhosNotasGestor().length,1);
});

test('falha ao guardar operação de nota conserva texto e cópias recuperáveis',()=>{
 const a=contexto();a.el('inpNovaNotaTexto').value='Nota sem envio';a.c.guardarTextoNotaGestor();const b=herdar(a);b.c.registrarOperacaoNotaGestor=()=>{throw Error('Sem espaço');};b.c.adicionarNotaRapida();assert.equal(b.el('inpNovaNotaTexto').value,'Nota sem envio');assert.equal(contexto(a.local).c.listarRascunhosNotasGestor().length,1);assert(![...a.local.m.keys()].some(k=>k.startsWith('gestorNotaRascunhoConcluidoV1:')));
});

function datas(){
 const rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8'),local=armazenamento(),sessao=armazenamento(),campos=new Map();
 const el=id=>{if(!campos.has(id))campos.set(id,{id,value:'',checked:false,type:'text',dataset:{}});return campos.get(id);};
 const c=vm.createContext({Date,Map,Set,JSON,novoRequestIdGestor:()=>crypto.randomUUID(),localStorage:local,sessionStorage:sessao,gravarArmazenamentoGestor:(k,v,o={})=>{(o.sessao?sessao:local).setItem(k,v);return true;},lerJSONLocalGestor:(k,p)=>{try{return JSON.parse(local.getItem(k))||p;}catch(_){return p;}},mostrarAviso(){},document:{getElementById:el}});
 vm.runInContext(rotina.slice(rotina.indexOf('const paginaRascunhoGestor='),rotina.indexOf('const guardarRascunhoAnteriorRotinaGestor=')),c);
 const d=c.dataPadraoRascunhoGestor(),[dia,mes,ano]=d.split('/');for(const p of ['inp','inpEmp'])for(const [k,v]of Object.entries({Data:d,DataDia:dia,DataMes:mes,DataAno:ano,MesFat:mes+'/'+ano,Parc:'1',ParcIni:'1'}))el(p+k).value=v;
 return {c,local,sessao,el};
}
for(const emp of [false,true])test((emp?'Empréstimo':'Lançamento')+': somente data ou competência manual é preservada; valores automáticos não geram rascunho',()=>{
 const a=datas(),tipo=emp?'emp':'novo',p=emp?'inpEmp':'inp',guardar=()=>{const dados=a.c.dadosFormularioRascunhoGestor(emp);a.c.guardarRascunhoRotinaGestor(tipo,dados);return a.local.getItem(a.c.chaveRascunhoRotinaGestor(tipo));};
 assert.equal(guardar(),null);a.el(p+'MesFat').value='12/2027';assert.equal(guardar(),null);a.el(p+'MesFat').dataset.escolhaManual='true';assert.match(guardar(),/12\/2027/);
 delete a.el(p+'MesFat').dataset.escolhaManual;a.el(p+'DataDia').value=a.el(p+'DataDia').value==='01'?'02':'01';assert(guardar());const salvo=JSON.parse(guardar());assert.equal(a.c.rascunhoFormularioVazioRotinaGestor(tipo,salvo.dados),false);
});

test('metadados inválidos não quebram recuperação e campo vazio marcado manualmente não cria rascunho',()=>{
 const a=datas(),dados=a.c.dadosFormularioRascunhoGestor(false);dados.camposManuais={};assert.equal(a.c.rascunhoFormularioVazioRotinaGestor('novo',dados),true);dados.campos.inpMesFat='';dados.camposManuais=['inpMesFat','inpValor'];dados.campos.inpValor='0';assert.equal(a.c.rascunhoFormularioVazioRotinaGestor('novo',dados),true);
});

test('data automática de cópia antiga não reaparece como rascunho vazio em outro dia',()=>{
 const a=datas();assert.equal(a.c.rascunhoFormularioVazioRotinaGestor('emp',{campos:{inpEmpData:'01/10/2026',inpEmpDataDia:'01',inpEmpParc:'1'}}),true);
 assert.equal(a.c.rascunhoFormularioVazioRotinaGestor('emp',{dataAutomatica:'01/10/2026',campos:{inpEmpData:'01/10/2026',inpEmpDataDia:'01',inpEmpParc:'1'}}),true);
 assert.equal(a.c.rascunhoFormularioVazioRotinaGestor('emp',{dataAutomatica:'01/10/2026',campos:{inpEmpData:'02/10/2026',inpEmpDataDia:'02',inpEmpParc:'1'}}),false);
});

test('setas dos meses salvam a escolha manual nos dois formulários',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),a=datas();a.c.atualizarVisorMetaCategoria=()=>{};
 for(const [emp,id,fn]of [[false,'inpMesFat','salvarRascunho'],[true,'inpEmpMesFat','salvarRascunhoEmp']])a.c[fn]=()=>a.c.guardarRascunhoRotinaGestor(emp?'emp':'novo',a.c.dadosFormularioRascunhoGestor(emp));
 const i=html.indexOf('    function ajustarMesFatura('),f=html.indexOf('    // Função Caça-PIX',i);vm.runInContext(html.slice(i,f),a.c);
 for(const [emp,id]of [[false,'inpMesFat'],[true,'inpEmpMesFat']]){a.el(id).value='12/2026';a.c.ajustarMesFatura(1,id);assert.equal(a.el(id).value,'01/2027');assert.equal(a.el(id).dataset.escolhaManual,'true');assert.match(a.local.getItem(a.c.chaveRascunhoRotinaGestor(emp?'emp':'novo')),/01\/2027/);}
});

test('competência manual recuperada em empréstimos resiste ao recálculo automático',()=>{
 const a=datas(),rotina=fs.readFileSync(path.resolve(__dirname,'../interface/rotina.js'),'utf8'),html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 a.el('selEmpForma').value='Cartao';a.el('inpEmpMesFat').value='02/2027';a.el('inpEmpMesFat').dataset.escolhaManual='true';a.c.guardarRascunhoRotinaGestor('emp',a.c.dadosFormularioRascunhoGestor(true));delete a.el('inpEmpMesFat').dataset.escolhaManual;
 a.c.rascunhosRestauradosGestor=false;a.c.restaurarRascunhosCompletosGestor=()=>a.c.rascunhosRestauradosGestor=true;a.c.renderizarRecuperacaoRascunhosGestor=()=>{};
 vm.runInContext(rotina.slice(rotina.indexOf('const restaurarRascunhoAnteriorRotinaGestor='),rotina.indexOf('function limparCopiaRascunhoRotinaGestor(')),a.c);a.c.restaurarRascunhosCompletosGestor();
 a.c.sincronizarDataTripla=()=>{};a.c.atualizarLayoutParcelasEmprestimo=()=>{};a.c.formaEhCartaoGestor=()=>true;a.c.buscarFormaPagamentoGestor=()=>({});a.c.calcularMesFaturaCartao=()=>({mesFat:'10/2026'});
 vm.runInContext(html.slice(html.indexOf('    function atualizarFaturaEmprestimo()'),html.indexOf('    function selecionarPessoaChipEmp(')),a.c);a.c.atualizarFaturaEmprestimo();assert.equal(a.el('inpEmpMesFat').value,'02/2027');
});
