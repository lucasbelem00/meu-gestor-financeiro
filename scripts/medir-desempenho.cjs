// Medição reproduzível com planilhas fictícias. Não acessa Google ou credenciais.
const {performance}=require('node:perf_hooks');
const {boot,fixture,personal}=require('../tests/fixtures/gestor-mocks.cjs');
const tamanhos=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
for(const n of tamanhos.length?tamanhos:[100,1000]){
 const {ctx,db}=boot(fixture(Array.from({length:n},(_,i)=>personal('Compra '+i,10))));ctx.console={log(){}};
 const contadores={};
 for(const nome of ['migrarIdentidadesGestor_','hashRegistroGestor_','calcularHashRegistroGestor_']){const anterior=ctx[nome];ctx[nome]=function(...args){contadores[nome]=(contadores[nome]||0)+1;return anterior(...args);};}
 const digest=ctx.Utilities.computeDigest;ctx.Utilities.computeDigest=(...args)=>{contadores.digests=(contadores.digests||0)+1;return digest(...args);};
 function medir(acao,param,rotulo=acao){for(const k of Object.keys(contadores))contadores[k]=0;const antes=db.sheets._Gestor_Operacoes?.getLastRow()||0,inicio=performance.now();const r=ctx.executarAcaoApi_(acao,param);console.log(JSON.stringify({registros:n,acao:rotulo,tempoMs:Math.round(performance.now()-inicio),...contadores,linhasDiarioAcrescentadas:(db.sheets._Gestor_Operacoes?.getLastRow()||0)-antes}));return r;}
 medir('getDadosCompletos',null,'primeira_carga');medir('getDadosCompletos',null,'carga_repetida');medir('obterRelatorioMes','10/2026');
 const p=ctx.executarAcaoApi_('previaPagamentoFaturaWeb',{forma:'Cartao',mesFatura:'10/2026',valor:n*10});medir('registrarPagamentoFaturaWeb',{...p,requestId:'medicao-fatura-'+n});
 const evento=ctx.executarAcaoApi_('obterAtividadeWeb',{}).itens[0];medir('desfazerAtividadeWeb',{eventoId:evento.id,requestId:'medicao-desfazer-'+n});
}
