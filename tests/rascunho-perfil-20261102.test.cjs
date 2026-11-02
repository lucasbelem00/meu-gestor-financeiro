const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),rotina=fs.readFileSync('interface/rotina.js','utf8');
function trecho(s,a,b){const i=s.indexOf(a),f=s.indexOf(b,i+a.length);assert(i>=0&&f>i);return s.slice(i,f);}
function pagina(sessao,duravel){
 const campos=new Map();const el=id=>{if(!campos.has(id))campos.set(id,{id,type:id.startsWith('chk')||id.startsWith('check')?'checkbox':'text',value:'',checked:false,dataset:{}});return campos.get(id);};
 const c=vm.createContext({document:{getElementById:el},console,sessionStorage:{getItem:k=>sessao.get(k)||null},rascunhosRestauradosGestor:false,padroesDatasRascunhoGestor:{novo:'02/11/2026'},guardarRascunhoGestor:(k,v)=>{sessao.set(k,v);return true;},gravarArmazenamentoGestor:(k,v)=>{sessao.set(k,v);return true;},guardarRascunhoRotinaGestor:(tipo,dados)=>{duravel.set(tipo,JSON.stringify(dados));return true;},buscarFormaPagamentoGestor:v=>v,restaurarOpcaoParcelamentoRascunhoGestor(){},atualizarLayoutParcelas(){},atualizarLayoutParcelasEmprestimo(){},atualizarPreviewParcEmp(){},sincronizarChipsTags(){},atualizarVisorMetaCategoria(){}});
 vm.runInContext(trecho(rotina,'function dadosFormularioRascunhoGestor(','function datasEscolhidasRascunhoGestor('),c);
 vm.runInContext(trecho(rotina,'const guardarRascunhoAnteriorRotinaGestor=','const restaurarRascunhoAnteriorRotinaGestor='),c);
 vm.runInContext(trecho(html,'    function salvarRascunho()','    function salvarRascunhoEmp()'),c);
 vm.runInContext(trecho(html,'    function restaurarRascunhosCompletosGestor()','    // A restauração completa é coordenada'),c);
 el('perfil-novo-tipo').value='padrao';el('perfil-novo-prioridade').value='padrao';return {c,el};
}
for(const [tipo,prioridade]of [['fixo','essencial'],['variavel','ajustavel'],['','padrao']])test('rascunho conserva classificação após recarga: '+JSON.stringify([tipo,prioridade]),()=>{
 const sessao=new Map(),duravel=new Map(),a=pagina(sessao,duravel);a.el('inpDesc').value='Compra ainda não enviada';a.el('perfil-novo-tipo').value=tipo;a.el('perfil-novo-prioridade').value=prioridade;a.el('perfil-novo-tipo').dataset.escolhaManual='true';a.c.salvarRascunho();
 for(const texto of [sessao.get('rascunhoLancamento'),duravel.get('novo')]){const d=JSON.parse(texto);assert.equal(d.campos['perfil-novo-tipo'],tipo);assert.equal(d.campos['perfil-novo-prioridade'],prioridade);}
 // Simula nova página e a ponte da cópia durável para a sessão, usada pelo app.
 sessao.set('rascunhoLancamento',duravel.get('novo'));const b=pagina(sessao,duravel);b.c.restaurarRascunhosCompletosGestor();assert.equal(b.el('perfil-novo-tipo').value,tipo);assert.equal(b.el('perfil-novo-prioridade').value,prioridade);assert.equal(b.el('inpDesc').value,'Compra ainda não enviada');
});
