const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function ambiente(){
 const els=new Map(),controles=[{disabled:false},{disabled:true}],modal={_sessaoEdicao:'primeira',classList:{contains:()=>false},closest:()=>null,querySelectorAll:()=>controles,setAttribute(){},removeAttribute(){}};
 const get=id=>{if(!els.has(id))els.set(id,{value:'1',style:{},className:'',hidden:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){}});return els.get(id);};
 const c=vm.createContext({Date,Set,Map,CATALOGO_ACOES_GESTOR:{salvar:{tipo:'financeira'},ler:{tipo:'leitura'}},apiCall:async()=>{},document:{querySelectorAll:()=>[modal],getElementById:get,activeElement:null},salvarRascunhoEmp(){},atualizarLayoutParcelasEmprestimo(){},pagamentoFaturaEmCursoGestor:false,mostrarAviso(){},mostrarConfirmacao(){},conferirPagamentoFaturaGestor:async()=>{}});c.window=c;
 vm.runInContext(fs.readFileSync('shared/competencias.js','utf8'),c);vm.runInContext(fs.readFileSync('interface/envios.js','utf8'),c);return {c,get,els,modal,controles};
}
test('envio bloqueia controles imediatamente, recusa segundo envio e restaura estados após erro',async()=>{
 let rejeitar,chamadas=0;const a=ambiente();a.c.executarTeste=()=>{chamadas++;return new Promise((_,r)=>rejeitar=r);};vm.runInContext('apiAntesBloqueioVisualGestorTeste=executarTeste',a.c);
 // Recriar a integração usando o transporte controlado, sem simular sua regra.
 const b=vm.createContext({...a.c,apiCall:a.c.executarTeste});b.window=b;vm.runInContext(fs.readFileSync('interface/envios.js','utf8'),b);
 const p=b.apiCall('salvar',{});assert.equal(a.controles[0].disabled,true);await assert.rejects(b.apiCall('salvar',{}),/Aguarde/);assert.equal(chamadas,1);rejeitar(Error('Sem conexão'));await assert.rejects(p,/Sem conexão/);assert.equal(a.controles[0].disabled,false);assert.equal(a.controles[1].disabled,true);
});
test('À vista visual preserva número e ao terminar edição vazia restaura uma parcela',()=>{
 const a=ambiente(),campo=a.get('inpEmpParc'),rotulo=a.get('rotuloAVistaEmpGestor');campo.value='1';a.c.atualizarRotuloParcelasEmpGestor();assert.equal(rotulo.hidden,false);assert.equal(campo.value,'1');
 a.c.document.activeElement=campo;a.c.iniciarEdicaoParcelasEmpGestor();assert.equal(campo.value,'');assert.equal(rotulo.hidden,true);a.c.document.activeElement=null;a.c.concluirEdicaoParcelasEmpGestor();assert.equal(campo.value,'1');
 campo.value='12';a.get('inpEmpParcIni').value='3';a.c.voltarPagamentoAVistaEmpGestor();assert.equal(campo.value,'1');assert.equal(a.get('inpEmpParcIni').value,'1');
});
test('Conferir fatura navega entre anos e não troca mês durante pagamento',async()=>{
 const a=ambiente(),campo=a.get('mesPagamentoFaturaGestor');a.get('valorPagamentoFaturaGestor').value='';campo.value='12/2026';let consultas=0;a.c.conferirPagamentoFaturaGestor=async()=>{consultas++;};await a.c.mudarMesConferenciaFaturaGestor(1);assert.equal(campo.value,'01/2027');assert.equal(consultas,1);a.c.pagamentoFaturaEmCursoGestor=true;await a.c.mudarMesConferenciaFaturaGestor(-1);assert.equal(campo.value,'01/2027');
});

test('empréstimo mantém Valor, Parcelas e Início na mesma grade, com observação separada e retorno à vista',()=>{
 const a=ambiente(),html=fs.readFileSync('index.html','utf8'),ini=html.indexOf('    function atualizarLayoutParcelasEmprestimo()'),fim=html.indexOf('    function atualizarFaturaEmprestimo()',ini);
 a.c.formaEhPixGestor=()=>false;a.c.permiteParcelamentoFormaGestor=()=>true;a.c.atualizarPreviewParcEmp=()=>{};
 for(const id of ['boxEmpParc','boxEmpParcIni']){const conjunto=new Set();a.get(id).classList={add:k=>conjunto.add(k),remove:k=>conjunto.delete(k),contains:k=>conjunto.has(k)};}
 vm.runInContext(html.slice(ini,fim),a.c);a.get('selEmpForma').value='Cartao';a.get('inpEmpParc').value='3';a.c.atualizarLayoutParcelasEmprestimo();
 assert.match(a.get('gridEmpValorParcelas').className,/1\.92fr/);assert.equal(a.get('boxEmpObs').className,'col-span-full');assert.equal(a.get('boxEmpParcIni').classList.contains('hidden'),false);
 a.c.voltarPagamentoAVistaEmpGestor();assert.equal(a.get('boxEmpParcIni').classList.contains('hidden'),true);assert.equal(a.get('rotuloAVistaEmpGestor').hidden,false);
});

test('diagnóstico copiado prioriza situação nova do servidor e mantém estado anterior se a consulta falhar',async()=>{
 const html=fs.readFileSync('index.html','utf8'),fonte=html.match(/async function copiarDiagnosticoGestor\(\) \{[\s\S]*?\n\}/)[0];
 for(const falhar of [false,true]){let copiado;const c=vm.createContext({navigator:{onLine:true},montarDiagnosticoGestor:()=>({resumoPlanilha:{pendente:true}}),apiCall:async()=>{if(falhar)throw Error('offline');return {resumoPlanilha:{pendente:false,atualizadoEm:'atual'}};},copiarTextoAreaTransferencia:t=>copiado=JSON.parse(t)});vm.runInContext(fonte,c);await c.copiarDiagnosticoGestor();assert.equal(copiado.resumoPlanilha.pendente,falhar);if(!falhar)assert.equal(copiado.resumoPlanilha.atualizadoEm,'atual');}
});
