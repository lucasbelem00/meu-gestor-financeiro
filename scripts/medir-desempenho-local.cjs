// Ensaio isolado: usa dados fictícios e mocks; não acessa Google, Drive ou Vercel.
const {performance}=require('node:perf_hooks');
const {boot,fixture,personal,loan}=require('../tests/fixtures/gestor-mocks.cjs');
const resultados=[];
for(const quantidade of [300,1500]){
 const entradas=Array.from({length:quantidade},(_,i)=>personal('Compra fictícia '+i,10+i%50,'1/1',(String(1+i%12).padStart(2,'0'))+'/2026',i%3?'Em Aberto':'Pago','Cartao'));
 const a=boot(fixture(entradas,Array.from({length:50},(_,i)=>loan('Pessoa fictícia '+i,'A Receber',20,'Cartao'))));a.ctx.console={log(){},warn(){}};
 a.ctx.executarAcaoApi_('getDadosCompletos',null);
 const contagens={};for(const nome of ['parseMesFat','normalizarTexto','hashGestor_','hashRegistroGestor_','mapaRegistrosAtividadeGestor_']){const original=a.ctx[nome];a.ctx[nome]=function(...p){contagens[nome]=(contagens[nome]||0)+1;return original(...p);};}
 const rodadas=[];let esperado;
 for(let i=0;i<3;i++){const inicio=performance.now(),d=a.ctx.executarAcaoApi_('getDadosCompletos',null);rodadas.push(Math.round(performance.now()-inicio));const soma=d.kpis.comprometimentoMes;if(esperado===undefined)esperado=soma;else if(soma!==esperado)throw Error('Totais divergentes no ensaio');}
 resultados.push({registrosPessoais:quantidade,registrosTerceiros:50,rodadasMs:rodadas,medianaMs:[...rodadas].sort((a,b)=>a-b)[1],chamadas:contagens});
}
console.log(JSON.stringify({ambiente:'Node + planilha simulada, sem latência real de Sheets',resultados},null,2));
