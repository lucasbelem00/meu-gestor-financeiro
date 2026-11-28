const {test}=require('node:test'),assert=require('node:assert/strict');const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');const {boot,launch}=require('./fixtures/gestor-mocks.cjs');const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p);
test('Histórico mensal preserva parcelas do outro ano, status, totais e paginação',()=>{
 const a=anual();
 api(a,'salvarLancamentoWeb',{...launch,descricao:'Entre anos',numParcelas:2,mesPrimeiraFatura:'12/2026',requestId:'historico-mes-cruza-anos'});
 api(a,'salvarLancamentoWeb',{...launch,descricao:'À vista',numParcelas:1,mesPrimeiraFatura:'12/2026',requestId:'historico-mes-avista'});
 const ler=a.ctx.lerLancamentosParaRelatorio;
 const param={filtros:{mes:'12/2026'},limite:1};
 const semVersao=({versaoConsulta,...resposta})=>JSON.stringify(resposta);
 a.ctx.lerLancamentosParaRelatorio=(anos,preparo,compraId)=>ler(anos,preparo,compraId);
 const antes=api(a,'filtrarLancamentosWeb',{...param,limite:50});
 a.ctx.lerLancamentosParaRelatorio=ler;
 const depois=api(a,'filtrarLancamentosWeb',{...param,limite:50});
 assert.equal(semVersao(depois),semVersao(antes));
 assert.equal(depois.qtdTotal,2);
 assert.equal(depois.itens.find(l=>l[6]==='1/2')[12].fimMes,'01/27');
 const primeira=api(a,'filtrarLancamentosWeb',param);
 const segunda=api(a,'filtrarLancamentosWeb',{...param,offset:1,filtros:{...param.filtros,versaoConsulta:primeira.versaoConsulta}});
 assert.deepEqual([...primeira.itens,...segunda.itens],[...depois.itens]);
});
function anual(){const a=ambienteProtecao(fixture([personal('Original',40)]));a.ativar();a.ctx.ativarOrganizacaoAnualWeb();return a;}
for(const [acao,param]of [['filtrarLancamentosWeb',{filtros:{},offset:0,limite:50}],['obterRecorrenciasWeb',null]])test(acao+' preserva resultado e usa projeção somente em anos abertos',()=>{const a=anual(),matriz=a.ctx.matrizFinanceiraAnualGestor_,ler=a.ctx.dadosAnoGestor_;a.ctx.matrizFinanceiraAnualGestor_=(ss,n,l)=>{if(l)l.somenteAba=null;return matriz(ss,n,l);};const completo=JSON.stringify(api(a,acao,param));a.ctx.matrizFinanceiraAnualGestor_=matriz;const chamadas=[];a.ctx.dadosAnoGestor_=(e,n)=>{chamadas.push({estado:e.estado,n});return ler(e,n);};assert.equal(JSON.stringify(api(a,acao,param)),completo);assert(chamadas.some(x=>x.estado==='ABERTO'&&x.n==='Lançamentos'));assert(!chamadas.some(x=>x.estado==='FECHADO'&&x.n));});
test('retrato financeiro dispensa notas/estatísticas e preserva todos os campos financeiros',()=>{const a=boot(fixture());api(a,'getDadosCompletos');let notas=0,stats=0;const n=a.ctx.lerNotasGestor_,t=a.ctx.estatisticasHistoricoTecnicoGestor_;a.ctx.lerNotasGestor_=(...p)=>{notas++;return n(...p);};a.ctx.estatisticasHistoricoTecnicoGestor_=(...p)=>{stats++;return t(...p);};const r=api(a,'salvarLancamentoWeb',{...launch,numParcelas:1,requestId:'snapshot-enxuto-001',incluirAtualizacaoDados:true,atualizacaoFinanceiraEnxuta:true});const d=r.atualizacaoDados?.dados;assert(d);assert.equal(notas,0);assert.equal(stats,0);assert.equal(d.atualizacaoFinanceiraEnxuta,true);assert.equal(d.anotacoes,undefined);const atual=api(a,'getDadosCompletos');for(const k of Object.keys(atual).filter(k=>!['historicoTecnico','anotacoes','notasRevision','erroNotas','atualizacaoFinanceiraEnxuta'].includes(k)))assert.equal(JSON.stringify(d[k]),JSON.stringify(atual[k]),k);assert.equal(notas,1);assert.equal(stats,1);assert(!JSON.stringify(a.db.sheets['_Gestor_Operacoes'].rows).includes('atualizacaoDados'));});

test('consulta direcionada ainda recusa fórmulas na aba de terceiros',()=>{const a=anual(),e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026);a.planilhas.get(e.id).sheets['Empréstimos'].getRange(1,1).setValue('=1');assert.throws(()=>api(a,'obterRelatorioMes','10/2026'),/fórmulas/);});
test('consulta pessoal reconfere ano fechado integral e detecta alteração em terceiros',()=>{const a=anual(),e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026),dados=a.ctx.dadosAnoGestor_(e),linha=a.db.sheets['_Gestor_Anos'].rows.find(r=>r[0]===2026);linha[2]='FECHADO';linha[3]=a.ctx.hashGestor_(dados);a.planilhas.get(e.id).sheets['Empréstimos'].rows[0][0]='Alteração externa';assert.throws(()=>api(a,'obterRelatorioAnual','2026'),/fechado.*alterado/);});
test('abertura posterior de terceiros não reutiliza matriz pessoal parcial',()=>{const {loan}=require('./fixtures/gestor-mocks.cjs'),a=ambienteProtecao(fixture([personal('Original',40)],[loan('Pessoa','A Receber',70,'Cartao')]));a.ativar();a.ctx.ativarOrganizacaoAnualWeb();const r=a.ctx.executarOperacaoGestor_('obterRelatorioMes',null,()=>{const ss=a.ctx.obterPlanilhaGestor_();ss.getSheetByName('Lançamentos').getDataRange().getValues();return ss.getSheetByName('Empréstimos').getDataRange().getValues();},true);assert(r.some(l=>l[1]==='Pessoa'&&l[7]===70));});
