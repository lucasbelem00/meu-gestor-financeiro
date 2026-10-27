const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8'),rotina=fs.readFileSync(root+'/interface/rotina.js','utf8'),desempenho=fs.readFileSync(root+'/interface/desempenho.js','utf8');
function trecho(s,a,b){const i=s.indexOf(a),f=s.indexOf(b,i+a.length);assert(i>=0&&f>i,a);return s.slice(i,f);}
function storage(){const m=new Map();return {m,getItem:k=>m.get(k)??null,removeItem:k=>m.delete(k),setItem:(k,v)=>m.set(k,String(v))};}
async function enviar(online,resultado='ok'){
 const a=require('./fixtures/envio-rascunho-ui.cjs').ambienteEnvio(),p=a.pagina(online),c=p.c,el=p.el,local=a.local,sessao=p.sessao;
 el('inpDesc').value='Almoço';p.guardar();
 const original=c.apiCall;c.apiCall=async(acao,pedido)=>{if(['erro','incerto'].includes(resultado)){const e=Error('Falha fictícia');e.resultadoIncerto=resultado==='incerto';throw e;}if(resultado==='novo'){el('inpDesc').value='Outro rascunho';p.guardar();}return original(acao,pedido);};
 local.setItem('gestorRascunhoV3:novo:outra-pagina','outra cópia');
 if(resultado==='origem'){const chave='gestorRascunhoV3:novo:origem-reaberta',valor={versao:3,atualizadoEm:1,dados:{campos:c.capturarFormularioMutacaoGestor('salvarLancamentoWeb')}};local.setItem(chave,JSON.stringify(valor));c.adotarOrigemRascunhoFinanceiroGestor('novo',chave,valor);}
 await p.enviar();return {c,el,local,sessao,fila:a.fila(),enviados:a.envios.length};
}
for(const online of [false,true])test('envio '+(online?'confirmado':'guardado offline')+' conclui só seu rascunho e conserva a identificação da fila',async()=>{
 const a=await enviar(online);assert.equal(a.el('inpDesc').value,'');assert.equal(a.local.getItem(a.c.chaveRascunhoRotinaGestor('novo')),null);assert.equal(a.sessao.getItem('gestorRascunhoAnterior:novo'),null);assert.equal(a.local.getItem('gestorRascunhoV3:novo:outra-pagina'),'outra cópia');if(!online)assert.match(a.fila[0].requestId,/^rascunho-[a-f0-9]{64}$/);
});
test('resposta de um envio não limpa campos modificados durante a espera',async()=>{const a=await enviar(true,'novo');assert.equal(a.el('inpDesc').value,'Outro rascunho');assert.match(a.local.getItem(a.c.chaveRascunhoRotinaGestor('novo')),/Outro rascunho/);});
for(const resultado of ['erro','incerto'])test('envio com '+resultado+' conserva campos e rascunho',async()=>{const a=await enviar(true,resultado);assert.equal(a.el('inpDesc').value,'Almoço');assert(a.local.getItem(a.c.chaveRascunhoRotinaGestor('novo')));});
test('cópia herdada já enviada deixa de ser recuperável; edição posterior em outra aba continua preservada',async()=>{
 const a=await enviar(true,'origem'),chave='gestorRascunhoV3:novo:origem-reaberta',valor=JSON.parse(a.local.getItem(chave));assert.equal(a.c.rascunhoConcluidoRotinaGestor(chave,valor),true);
 const alterada={...valor,atualizadoEm:2,dados:{campos:{desc:'Outra aba modificou',valor:'50'}}};a.local.setItem(chave,JSON.stringify(alterada));assert.equal(a.c.rascunhoConcluidoRotinaGestor(chave,alterada),false);assert.equal(JSON.parse(a.local.getItem(chave)).dados.campos.desc,'Outra aba modificou');
});
test('envio incerto só conclui o rascunho quando a central confirma a mesma identificação',async()=>{
 const a=await enviar(true,'incerto'),c=a.c;c.pxGastoPendenteId='envio-em-conferencia-001';c.pxLiberandoLimpezaIncerta=false;c.pxDefinirEstadoIncerto=ativo=>ativo?a.sessao.setItem('lancamentoResultadoIncerto','true'):a.sessao.removeItem('lancamentoResultadoIncerto');
 vm.runInContext(trecho(html,'  window.pxConcluirConfirmacaoGestor=function','  seguro(\'avisoResultadoIncerto\''),c);
 c.pxConcluirConfirmacaoGestor({action:'salvarLancamentoWeb',requestId:'outro-envio'},true);assert.equal(a.el('inpDesc').value,'Almoço');
 c.pxConcluirConfirmacaoGestor({action:'salvarLancamentoWeb',requestId:'envio-em-conferencia-001'},true);assert.equal(a.el('inpDesc').value,'');assert.equal(a.local.getItem(c.chaveRascunhoRotinaGestor('novo')),null);
});
test('gráfico vazio destrói a instância e a configuração adiada; novos dados podem voltar',()=>{
 const canvas={hidden:false,getContext:()=>({})},estado={hidden:true},c=vm.createContext({Map,Set,document:{getElementById:id=>id==='chartCategorias'?canvas:estado},getCategoriaExibicao:v=>v,chartGlobal:null,atualizarGraficoGestor:(_a,_c,config)=>({config,destroy(){this.destruido=true;}})});
 vm.runInContext(trecho(desempenho,'const graficosPendentesDesempenhoGestor =','const leiturasDesempenhoGestor ='),c);
 const render=trecho(html,'      const temCategorias=','      if (!modoEdicaoFormas) renderListaFormas();');
 c.dados={categorias:[{nome:'Teste',total:100}]};vm.runInContext('(function(){'+render+'})()',c);const antigo=c.chartGlobal;
 vm.runInContext("graficosPendentesDesempenhoGestor.set('chartCategorias',{anterior:chartGlobal,configuracao:{antiga:true}})",c);
 c.dados={categorias:[]};vm.runInContext('(function(){'+render+'})()',c);assert.equal(c.chartGlobal,null);assert.equal(antigo.destruido,true);assert.equal(canvas.hidden,true);assert.equal(estado.hidden,false);assert.equal(vm.runInContext('graficosPendentesDesempenhoGestor.size',c),0);
 c.dados={categorias:[{nome:'Novo',total:20}]};vm.runInContext('(function(){'+render+'})()',c);assert.equal(c.chartGlobal.config.data.datasets[0].data[0],20);assert.equal(canvas.hidden,false);assert.equal(estado.hidden,true);
});
test('só uma data combinada já exige confirmação antes de o simulador substituir o formulário',()=>{
 const els=new Map(),get=id=>els.get(id)||null,el=(id,v='')=>{const e={id,value:v,checked:false,focus(){}};els.set(id,e);return e;};
 const data=el('inpEmpCombinada','2026-11-14');for(const id of ['selEmpForma','inpEmpParc','inpEmpParcIni','inpEmpPessoa','inpEmpValor'])el(id,id.includes('Parc')?'1':'');els.set('formEmprestimo',{elements:[...els.values()]});let confirmacoes=0,aplicar;
 const c=vm.createContext({document:{getElementById:get},sessionStorage:{getItem:()=>null},salvandoEmprestimoTrava:false,salvandoGastoTrava:false,emprestimoPendenteGestor:()=>null,lerValorMoeda:()=>0,lerSimulacaoGestor:()=>({data:'25/10/2026',forma:'Cartao',n:2,valor:100}),limparFormularioEmprestimo(){data.value='';},preencherDataTripla(){},definirValorMoeda(id,v){el(id).value=String(v);},atualizarFaturaEmprestimo(){},atualizarPreviewParcEmp(){},salvarRascunhoEmp(){},abrirFerramenta(){},mostrarAviso(){},mostrarConfirmacao(t,m,fn){confirmacoes++;aplicar=fn;}});
 require('./fixtures/rascunho-datas-ui.cjs')(c);vm.runInContext(trecho(html,'function transferirSimulacaoGestor(emp)','function numeroExpressaoCalcGestor('),c);assert.equal(c.haRascunhoFormularioGestor(true),true);c.transferirSimulacaoGestor(true);assert.equal(confirmacoes,1);assert.equal(data.value,'2026-11-14');data.value='2026-12-20';aplicar();assert.equal(data.value,'2026-12-20');
});
test('Tab alcança links e summary finais; volta ao primeiro só no último controle visível',()=>{
 const c=vm.createContext({document:{activeElement:null},destino:null}),el=id=>({id,disabled:false,tabIndex:0,getClientRects:()=>[{}],closest:()=>null,focus(){c.destino=id;}}),lista=['fechar','manutencao','pasta','ano','ajuda'].map(el),escondido=el('escondido');escondido.closest=()=>({});lista.push(escondido);
 vm.runInContext(trecho(html,'    function conterFocoExportacao(event)','    function fecharExportacaoDados()'),c);let prev=false,seletor='';const evento={key:'Tab',shiftKey:false,preventDefault(){prev=true;},currentTarget:{querySelectorAll(s){seletor=s;return lista;}}};c.document.activeElement=lista[1];c.conterFocoExportacao(evento);assert.equal(prev,false);assert(seletor.includes('a[href]')&&seletor.includes('select')&&seletor.includes('summary'));
 c.document.activeElement=lista[4];c.conterFocoExportacao(evento);assert.equal(prev,true);assert.equal(c.destino,'fechar');evento.shiftKey=true;c.document.activeElement=lista[0];c.conterFocoExportacao(evento);assert.equal(c.destino,'ajuda');
});
test('acréscimos iguais ou por consumo conservam os centavos e explicam a regra na mensagem',()=>{
 const c=vm.createContext({document:{getElementById:()=>({value:'Jantar'})},formatBRL:v=>'R$ '+Number(v).toFixed(2)});vm.runInContext(fs.readFileSync(root+'/shared/rachadinha.js','utf8'),c);vm.runInContext(trecho(fs.readFileSync(root+'/interface/rachadinha.js','utf8'),'function mensagemDivisaoRachaGestor(','function copiarRachadinhaWhats('),c);
 const conta={pessoas:[{id:'eu',nome:'Eu',peso:2},{id:'ana',nome:'Ana',peso:1}],itens:[{id:'a',valorCentavos:10000,consumidores:['eu']},{id:'b',valorCentavos:5000,consumidores:['ana']}],acrescimoCentavos:3001};
 const porConsumo=c.calcularDivisaoContaGestor(conta),igual=c.calcularDivisaoContaGestor({...conta,rateioAcrescimos:'igual'});assert.deepEqual(Array.from(porConsumo.pessoas,p=>p.acrescimoCentavos),[2001,1000]);assert.deepEqual(Array.from(igual.pessoas,p=>p.acrescimoCentavos),[1501,1500]);assert.equal(igual.pessoas.reduce((s,p)=>s+p.finalCentavos,0),18001);assert.match(c.mensagemDivisaoRachaGestor(igual),/iguais por pessoa/);
 const sem=c.mensagemDivisaoRachaGestor(c.calcularDivisaoContaGestor({...conta,acrescimoCentavos:0}));assert(!/Acréscimos|Desconto|Serviço/.test(sem));assert.throws(()=>c.calcularDivisaoContaGestor({...conta,rateioAcrescimos:'desconhecido'}),/Escolha como/);
});
