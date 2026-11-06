const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('levar simulação ao planejamento exige confirmação e recusa dados alterados enquanto ela está aberta',()=>{
 const s=fs.readFileSync('interface/usabilidade.js','utf8');
 for(const alterar of [false,true]){
 let valor=500,confirmacao,transferido,avisos=[];const c=vm.createContext({document:{getElementById:()=>({value:'Geladeira'})},lerSimulacaoGestor:()=>({valor,n:5,data:'20/12/2026'}),estadoTransferenciaPlanejamentoGestor:()=>({assinatura:'atual',epoca:'',rascunho:true,ocupado:false}),formatBRL:String,centavosInterfaceGestor:v=>Math.round(v*100),mostrarConfirmacao:(...a)=>confirmacao=a,receberSimulacaoPlanejamentoGestor:d=>transferido=d,mostrarAviso:(...a)=>avisos.push(a)});
 vm.runInContext(s.slice(s.indexOf('function levarSimulacaoAoPlanejamentoGestor'),s.indexOf('function numeroExpressaoCalcGestor')),c);
 c.levarSimulacaoAoPlanejamentoGestor();assert.equal(transferido,undefined);assert.match(confirmacao[1],/rascunho atual/);if(alterar)valor=600;confirmacao[2]();
 if(alterar){assert.equal(transferido,undefined);assert.match(avisos[0][0],/Não foi transferido/);}else{assert.equal(transferido.centavos,50000);assert.equal(transferido.data,'2026-12-20');assert.equal(transferido.nome,'Geladeira');}
 }
});
test('Histórico reaproveita lista recente somente com mesmos filtros e geração, sem impedir atualização vencida',()=>{
 const s=fs.readFileSync('interface/desempenho.js','utf8');let agora=1000,consultas=0;const lista={inert:false};
 const c=vm.createContext({Date:{now:()=>agora},document:{getElementById:()=>lista},geracaoLeituraGestor:1,filtrosAtuais:{termo:'x'},retomarFiltroHistoricoGestor:true,estadoIntegracaoInterfaceGestor:{pxPaginaHistoricoEmAndamento:false},chamarFiltroBackend:(append,preservar)=>{assert.equal(append,false);assert.equal(preservar,true);consultas++;}});
 vm.runInContext(s.slice(s.indexOf('let consultaHistoricoAplicadaGestor'),s.indexOf('function consultarHistoricoVisivelGestor')),c);
 c.registrarConsultaHistoricoAplicadaGestor({termo:'x',versaoConsulta:'v1'});c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,0);assert.equal(c.retomarFiltroHistoricoGestor,false);
 c.geracaoLeituraGestor++;c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,1);
 c.registrarConsultaHistoricoAplicadaGestor(c.filtrosAtuais);agora+=15001;c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,2);
 c.registrarConsultaHistoricoAplicadaGestor(c.filtrosAtuais);c.filtrosAtuais.termo='y';c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,3);
 c.registrarConsultaHistoricoAplicadaGestor(c.filtrosAtuais);lista.inert=true;c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,4);
 c.estadoIntegracaoInterfaceGestor.pxPaginaHistoricoEmAndamento=true;c.atualizarHistoricoAoEntrarGestor();assert.equal(consultas,4);
});
test('parcelas do simulador mostram À vista sem alterar o valor numérico',()=>{
 const s=fs.readFileSync('interface/usabilidade.js','utf8'),campo={value:'1',style:{}},rotulo={hidden:false,classList:{toggle(){}}};
 const c=vm.createContext({document:{activeElement:null,getElementById:id=>id==='simParcelas'?campo:rotulo},rodarSimuladorCompra(){c.atualizarRotuloParcelasSimuladorGestor();}});
 vm.runInContext(s.slice(s.indexOf('function atualizarRotuloParcelasSimuladorGestor'),s.indexOf('function rodarSimuladorCompra')),c);
 c.atualizarRotuloParcelasSimuladorGestor();assert.equal(rotulo.hidden,false);assert.equal(campo.value,'1');
 c.document.activeElement=campo;c.iniciarEdicaoParcelasSimuladorGestor();assert.equal(campo.value,'');assert.equal(rotulo.hidden,true);
 c.document.activeElement=null;c.concluirEdicaoParcelasSimuladorGestor();assert.equal(campo.value,'1');assert.equal(rotulo.hidden,false);
 campo.value='6';c.atualizarRotuloParcelasSimuladorGestor();assert.equal(rotulo.hidden,true);
});
test('recebimento exige concordância e distingue parte da parcela e quitação integral',async()=>{
 const s=fs.readFileSync('interface/rotina.js','utf8');
 for(const valor of [25,100]){
 let confirmacao,parciais=0,integrais=0;const modal={_dadosOriginaisEdicao:{status:'A Receber',valorParcela:100},_assinaturaEditorRecebimento:'igual',_sessaoEdicao:'s1',querySelector:()=>({})};
 const campos={inpEdEmpPessoa:{value:'Pessoa'},inpEdEmpDescOrig:{value:'Compra'},inpEdEmpLinha:{value:'2'},inpEdEmpParcelaStr:{value:'1/3'}};
 const c=vm.createContext({document:{getElementById:id=>id==='modalEdicaoEmp'?modal:campos[id]},executarDividirParcelaEmp:()=>parciais++,assinaturaEditorRecebimentoRotinaGestor:()=> 'igual',assinaturaFormularioRotinaGestor:()=> 'igual',lerValorMoeda:()=>valor,formatBRL:n=>'R$ '+n,mostrarAviso(){throw Error('Aviso inesperado');},mostrarConfirmacao:(...args)=>confirmacao=args,salvarStatusEmprestimoComAtualizacao:async()=>{integrais++;return true;},fecharModalEdicaoEmp(){}});
 vm.runInContext(s.slice(s.indexOf('const parcialAnteriorRotinaGestor'),s.indexOf('function mostrarRecebidosEmpGestor')),c);
 c.executarDividirParcelaEmp();assert.equal(parciais+integrais,0);assert.match(confirmacao[0],valor<100?/parcial/:/integral/);assert.match(confirmacao[1],new RegExp('Restarão R\\$ '+(100-valor)));assert.match(confirmacao[4],valor<100?/parcial/:/integral/);
 confirmacao[2]();await Promise.resolve();assert.equal(parciais,valor<100?1:0);assert.equal(integrais,valor===100?1:0);
 }
});
