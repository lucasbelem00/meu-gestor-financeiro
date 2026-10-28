const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,loan,launch,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
const rows=(a,n)=>a.ctx.matrizFinanceiraAnualGestor_(a.db,n).slice(1);
function iniciar(dados=fixture()){
 const a=ambienteProtecao(dados);a.ctx.getHojeSeguro=()=>new Date(2026,9,28);a.ativar();a.ctx.ativarOrganizacaoAnualWeb();return a;
}
function antigo(){const e=loan('Ana','A Receber',120,'Cartao');e[0]='15/12/2025';e[8]='12/2025';return iniciar(fixture([personal('Pessoal antigo',80,'1/1','12/2025','Em Aberto')],[e]));}
function fechar(a){a.ctx.cicloAnualGestor_(a.db,a.pasta);return a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2025);}
function pagar(a,valor=200,id='pagar-ano-antigo-integridade-001'){
 const f=api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'});return api(a,'registrarPagamentoFaturaWeb',{...f,valor,requestId:id});
}
function receber(a,id='receber-ano-antigo-integridade-001'){
 const r=rows(a,'Empréstimos')[0];return api(a,'alternarStatusEmprestimoWeb',{registroId:r[11],compraId:r[12],versao:r[13],statusDesejado:'Recebido',requestId:id});
}
function restaurar(a,backup,id){const p=api(a,'previaRestauracaoBackupWeb',{backup});return api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:p.versaoAtual,hashBackup:p.hashBackup,confirmacao:'RESTAURAR',requestId:id});}

test('organização anual roteia parcelas futuras antes de janeiro e reconhece reenvio após a virada',()=>{
 const a=iniciar(),p={...launch,dataCompra:'20/11/2026',mesPrimeiraFatura:'11/2026',valorTotal:30,numParcelas:3,requestId:'parcelas-cruzam-ano-continuidade-001'};api(a,'salvarLancamentoWeb',p);
 assert.deepEqual(Array.from(a.ctx.catalogoAnosGestor_(a.db).map(e=>e.ano)),[2026,2027]);for(const mes of ['11/2026','12/2026','01/2027'])assert.equal(api(a,'obterRelatorioMes',mes).kpis.total,'R$ 10,00');
 const ids=rows(a,'Lançamentos').map(r=>r[11]);assert.equal(new Set(ids).size,3);a.ctx.getHojeSeguro=()=>new Date(2027,0,2);api(a,'salvarLancamentoWeb',p);assert.equal(rows(a,'Lançamentos').length,3);assert.deepEqual(Array.from(rows(a,'Lançamentos').map(r=>r[11])),Array.from(ids));
 a.ctx.cicloAnualGestor_(a.db,a.pasta);assert.equal(a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026).estado,'FECHADO');assert.equal(api(a,'obterRelatorioMes','01/2027').kpis.total,'R$ 10,00');
});

test('banco e pessoa do ano fechado recebem baixa separada sem reescrever o retrato',()=>{
 const a=antigo(),e=fechar(a),snapshot=JSON.stringify(a.ctx.dadosAnoGestor_(e));assert.equal(e.estado,'FECHADO');pagar(a);
 assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'}).restante,0);assert.equal(rows(a,'Empréstimos')[0][9],'A Receber');receber(a);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');
 assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),snapshot);assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 80,00');assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.aberto,'R$ 0,00');
});

test('renomear cartão com fatura antiga conserva identidade e permite conferir e receber depois',()=>{
 const a=antigo(),e=fechar(a),snapshot=JSON.stringify(a.ctx.dadosAnoGestor_(e)),id=a.ctx.identidadeFormaLeituraGestor_('Cartao',a.db);api(a,'salvarFormaPagamentoWeb',{nomeOriginal:'Cartao',nome:'Cartão atual',banco:'Banco',limite:1000,fechamento:5,vencimento:10,versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'rename-card-open-old-year-001'});
 assert.equal(a.ctx.identidadeFormaLeituraGestor_('Cartão atual',a.db),id);const f=api(a,'obterFaturaPagamentoWeb',{forma:'Cartão atual',mesFatura:'12/2025'});assert.equal(f.total,200);api(a,'registrarPagamentoFaturaWeb',{...f,valor:200,requestId:'pay-renamed-old-invoice-001'});receber(a,'receive-renamed-old-year-001');
 assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartão atual',mesFatura:'12/2025'}).restante,0);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),snapshot);
});

test('backup v3 do agendamento restaura ajustes tardios sem depender dos destinos antigos',()=>{
 const a=antigo();fechar(a);pagar(a);receber(a);const antigos=a.ctx.catalogoAnosGestor_(a.db).map(e=>e.id),b=a.ctx.executarBackupProtegidoWeb({requestId:'scheduled-like-closed-adjustments-001'}),arquivo=a.arquivos.get(b.arquivoId||b.id);
 const backup=JSON.parse(arquivo?arquivo.texto:[...a.arquivos.values()].filter(f=>f.nome.includes('scheduled-like-closed-adjustments-001')&&f.mime==='application/json').at(-1).texto);assert.equal(backup.formato,'gestor-financeiro-backup-v3');
 restaurar(a,backup,'restore-v3-late-adjustments-001');for(const id of antigos)a.planilhas.delete(id);assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'}).restante,0);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 80,00');
});

test('Pix atravessa ano preservando pagamento imediato e dívida da pessoa',()=>{
 const a=iniciar(),p={dataCompra:'31/12/2026',pessoa:'Ana',descricao:'Ajuda no ano novo',formaPagto:'Pix',valorTotal:45,numParcelas:1,parcelaInicial:1,mesPrimeiraFatura:'12/2026',requestId:'pix-december-annual-001'};api(a,'salvarEmprestimoWeb',p);a.ctx.getHojeSeguro=()=>new Date(2027,0,2);a.ctx.cicloAnualGestor_(a.db,a.pasta);const antes=rows(a,'Empréstimos')[0];assert.equal(antes[17],45);assert.equal(antes[9],'A Receber');receber(a,'pix-year-late-receipt-001');assert.equal(rows(a,'Empréstimos')[0][17],45);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');
});

test('destino anual de outra base e alteração de ano fechado são recusados sem misturar dados',()=>{
 const a=antigo(),e=fechar(a),anual=a.planilhas.get(e.id),valor=clone(anual.sheets['Lançamentos'].rows[1]);anual.sheets['Lançamentos'].rows[1][7]=1;assert.throws(()=>api(a,'obterRelatorioMes','12/2025'),/alterado/);anual.sheets['Lançamentos'].rows[1]=valor;
 anual.sheets['Leia-me'].rows[1][1]='outra-base-sem-autorizacao';assert.throws(()=>api(a,'obterRelatorioMes','12/2025'),/não pertence/);assert.equal(a.db.sheets['Lançamentos'].getLastRow(),1);
});

test('interrupção ao gravar destino anual é retomada uma vez com o mesmo envio',()=>{
 const a=iniciar(),e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026),destino=a.planilhas.get(e.id),p={...launch,valorTotal:30,numParcelas:1,requestId:'annual-interrupted-writing-001'};destino.failure={name:'Lançamentos',stage:'after',row:2};
 assert.throws(()=>api(a,'salvarLancamentoWeb',p),/FALHA SIMULADA/);api(a,'salvarLancamentoWeb',p);api(a,'salvarLancamentoWeb',p);const efetivos=rows(a,'Lançamentos');assert.equal(efetivos.length,1);assert.equal(efetivos[0][7],30);assert.equal(new Set(efetivos.map(r=>r[11])).size,1);assert.equal(destino.sheets['Lançamentos'].getLastRow(),2);
});

test('v3 preserva exclusão e lançamento atrasado no ano fechado e reconhece reenvio de restauração',()=>{
 const a=antigo(),e=fechar(a),antes=JSON.stringify(a.ctx.dadosAnoGestor_(e)),r=rows(a,'Lançamentos')[0];api(a,'excluirLancamentoWeb',{registroId:r[11],compraId:r[12],versao:r[13],requestId:'annual-delete-closed-item-001'});
 api(a,'salvarLancamentoWeb',{...launch,dataCompra:'10/12/2025',mesPrimeiraFatura:'12/2025',valorTotal:25,numParcelas:1,requestId:'annual-late-backdated-item-001'});assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 25,00');assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),antes);
 const backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),previa=api(a,'previaRestauracaoBackupWeb',{backup}),p={backup,versaoAtual:previa.versaoAtual,hashBackup:previa.hashBackup,confirmacao:'RESTAURAR',requestId:'annual-restore-deletion-late-entry-001'};api(a,'restaurarBackupDadosWeb',p);api(a,'restaurarBackupDadosWeb',p);
 a.planilhas.delete(e.id);assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 25,00');assert.equal(rows(a,'Lançamentos').length,1);assert.notEqual(rows(a,'Lançamentos')[0][11],r[11]);assert.equal(a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2025).estado,'FECHADO');
});

test('backup v3 recusa ID repetido entre snapshots mesmo com assinatura recalculada',()=>{
 const a=antigo();fechar(a);const backup=clone(api(a,'exportarBackupDadosWeb',{restauravel:true})),orig=backup.anos.find(e=>e.ano===2025).dados.abas.find(x=>x.nome==='Lançamentos').valores[1],outro=backup.anos.find(e=>e.ano===2026).dados.abas.find(x=>x.nome==='Lançamentos');outro.valores.push(clone(orig));outro.valores[1][8]='12/2026';
 backup.hashOrganizacao=a.ctx.assinaturaBackupAnualGestor_(backup);assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup}),/duplicad|incompat|fora do ano/i);
});

test('restauração confere novamente destino fechado preparado antes de substituir origem',()=>{
 const a=antigo(),e=fechar(a),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),previa=api(a,'previaRestauracaoBackupWeb',{backup}),antes=JSON.stringify(a.ctx.dadosAnoGestor_(e)),ids=new Set(a.planilhas.keys()),preparar=a.ctx.prepararRestauracaoAnosGestor_;
 a.ctx.prepararRestauracaoAnosGestor_=function(...args){const retorno=preparar(...args);for(const [id,db]of a.planilhas)if(!ids.has(id)&&db.sheets['Lançamentos']?.rows[1])db.sheets['Lançamentos'].rows[1][7]=1;return retorno;};
 assert.throws(()=>api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:previa.versaoAtual,hashBackup:previa.hashBackup,confirmacao:'RESTAURAR',requestId:'annual-restore-tampered-prepared-destination-001'}),/alterado|incompatível|diverg|confer/i);assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(e)),antes);
});

for(const problema of ['ausente','corrompido'])test('v3 completo reconstrói ano atual '+problema+' somente com confirmação especial',()=>{
 const a=antigo(),e=fechar(a);pagar(a);receber(a);const backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),ids=rows(a,'Lançamentos').concat(rows(a,'Empréstimos')).map(r=>r[11]);
 if(problema==='ausente')a.planilhas.delete(e.id);else a.planilhas.get(e.id).sheets['Lançamentos'].rows[1][7]=1;
 const previa=api(a,'previaRestauracaoBackupWeb',{backup});assert.equal(previa.recuperacaoAnual.necessaria,true);assert(previa.recuperacaoAnual.indisponiveis.some(x=>x.ano===2025));
 const p={backup,versaoAtual:previa.versaoAtual,hashBackup:previa.hashBackup,confirmacao:'RESTAURAR',requestId:'v3-rebuild-unavailable-year-'+problema,assinaturaAnuais:previa.recuperacaoAnual.assinatura};
 assert.throws(()=>api(a,'restaurarBackupDadosWeb',p),/Confirme especificamente/);api(a,'restaurarBackupDadosWeb',{...p,confirmarRecuperacaoAnual:true});const novo=a.ctx.catalogoAnosGestor_(a.db).find(x=>x.ano===2025);assert.notEqual(novo.id,e.id);assert.equal(novo.estado,'FECHADO');
 assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:'12/2025'}).restante,0);assert.equal(rows(a,'Empréstimos')[0][9],'Recebido');assert.deepEqual(Array.from(rows(a,'Lançamentos').concat(rows(a,'Empréstimos')).map(r=>r[11]).sort()),Array.from(ids.sort()));
 const copia=api(a,'obterBackupAnteriorWeb',{copiaId:p.requestId});assert(copia.backup?.recuperacaoAnos||copia.recuperacaoAnos||JSON.stringify(copia).includes('recuperacaoAnos'));
 const protegido=a.ctx.executarBackupProtegidoWeb({requestId:'v3-after-repair-'+problema}),conferido=JSON.parse(a.arquivos.get(protegido.arquivoId).texto);assert.equal(conferido.formato,'gestor-financeiro-backup-v3');assert.equal(conferido.recuperacaoAnos,undefined);assert.equal(api(a,'previaRestauracaoBackupWeb',{backup:conferido}).recuperacaoAnual.necessaria,false);
});

test('ativação anual incorpora catálogo legado sem duplicar IDs e preserva ambos os retratos',()=>{
 const a=ambienteProtecao(fixture([personal('Legado',100,'1/1','12/2025','Pago'),personal('Atual',50)]));a.ativar();const idsAntes=api(a,'filtrarLancamentosWeb',{filtros:{},limite:50}).itens.map(r=>r[13]);a.manter();const legado=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0],retratoLegado=JSON.stringify(a.ctx.dadosArquivoAnualProtecaoGestor_(legado));
 a.ctx.ativarOrganizacaoAnualWeb();assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 50,00');const depois=api(a,'filtrarLancamentosWeb',{filtros:{},limite:50}).itens.map(r=>r[13]);assert.equal(depois.length,2);assert.equal(new Set(depois).size,2);assert.deepEqual(Array.from(depois.sort()),Array.from(idsAntes.sort()));
 a.ctx.getHojeSeguro=()=>new Date(2027,0,2);a.ctx.cicloAnualGestor_(a.db,a.pasta);const anual=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026);assert.equal(anual.estado,'FECHADO');const retratoNovo=JSON.stringify(a.ctx.dadosAnoGestor_(anual));
 assert.equal(JSON.stringify(a.ctx.dadosArquivoAnualProtecaoGestor_(legado)),retratoLegado);assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');assert.equal(api(a,'obterRelatorioAnual','2026').total,'R$ 50,00');assert.equal(JSON.stringify(a.ctx.dadosAnoGestor_(anual)),retratoNovo);
});
test('backup identifica fechamento mesmo sem alteração dos valores efetivos',()=>{
 const a=iniciar(fixture([personal('Dezembro',20,'1/1','12/2026')]));a.ctx.getHojeSeguro=()=>new Date(2027,0,2);
 const antes=a.ctx.executarBackupProtegidoWeb({}),e=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026);assert.equal(e.estado,'ABERTO');
 a.ctx.cicloAnualGestor_(a.db,a.pasta);const depois=a.ctx.executarBackupProtegidoWeb({});assert.notEqual(antes.id,depois.id);
 const b=JSON.parse(a.arquivos.get(depois.arquivoId).texto);assert.equal(b.anos.find(e=>e.ano===2026).estado,'FECHADO');assert.equal(api(a,'obterRelatorioMes','12/2026').kpis.total,'R$ 20,00');
});
test('consulta mostra situação preservada e atualização posterior sem alterar o gasto',()=>{
 const a=antigo();fechar(a);const antes=api(a,'obterRelatorioMes','12/2025').lancamentos[0][20];assert.equal(antes.ano,2025);assert.equal(antes.alteradoDepois,false);assert.equal(antes.pagoBancoNoFechamento,0);
 pagar(a);const depois=api(a,'obterRelatorioMes','12/2025').lancamentos[0][20];assert.equal(depois.alteradoDepois,true);assert.equal(depois.pagoBancoNoFechamento,0);assert.equal(api(a,'obterRelatorioMes','12/2025').kpis.total,'R$ 80,00');
 const emprestimo=api(a,'getDadosCompletos').emprestimos.itens[0];assert.equal(emprestimo.estadoAno.recebidoNoFechamento,false);assert.equal(emprestimo.estadoAno.alteradoDepois,true);
});
