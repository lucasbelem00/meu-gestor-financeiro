const {test}=require('node:test'),assert=require('node:assert/strict');
const {boot,fixture,personal,loan,launch}=require('./fixtures/gestor-mocks.cjs');
function base(linhas=[personal('Antigo',50)],emp=[]){const a=boot(fixture(linhas,emp));a.ctx.console={log(){},warn(){}};a.n=0;a.dados=()=>a.ctx.executarAcaoApi_('getDadosCompletos',null);a.dados();return a;}
function categorias(a,tipo='variavel',prioridade='essencial'){
 a.ctx.salvarCategoriasWeb({categorias:[{nome:'Teste',meta:500,tipoGasto:tipo,prioridadeGasto:prioridade},{nome:'Outros',meta:0}],versaoConfiguracao:a.dados().versoesConfiguracao.categorias,requestId:'categorias-perfil-'+(++a.n)});
}
function compra(a,over={}){return a.ctx.salvarLancamentoWeb({...launch,numParcelas:1,...over,requestId:'compra-perfil-'+(++a.n)});}
const rows=a=>a.db.sheets['Lançamentos'].rows.slice(1),perfil=(a,r)=>a.ctx.lerPerfilGastoGestor_(r);
test('padrão vale para novos gastos; mudar categoria não reclassifica o passado',()=>{
 const a=base();categorias(a);assert.equal(a.dados().perfilGastos.tipo.naoClassificado,5000);
 compra(a,{descricao:'Primeira'});const primeira=rows(a).find(r=>r[1]==='Primeira');assert.equal(perfil(a,primeira).tipo,'variavel');
 categorias(a,'fixo','ajustavel');assert.equal(perfil(a,rows(a).find(r=>r[11]===primeira[11])).tipo,'variavel');
 compra(a,{descricao:'Segunda'});const res=a.dados().perfilGastos;assert.equal(res.tipo.variavel,10000);assert.equal(res.tipo.fixo,10000);assert.equal(res.tipo.naoClassificado,5000);assert.equal(res.prioridade.essencial,10000);assert.equal(res.prioridade.ajustavel,10000);assert.equal(res.total,25000);
});
test('escolha individual substitui só uma dimensão e permite não classificar explicitamente',()=>{
 const a=base([]);categorias(a);compra(a,{descricao:'Exceção',perfilGasto:{tipo:'fixo'}});compra(a,{descricao:'Sem classificação',perfilGasto:{tipo:'',prioridade:''}});
 const r=rows(a).find(r=>r[1]==='Exceção');assert.equal(perfil(a,r).tipo,'fixo');assert.equal(perfil(a,r).prioridade,'essencial');assert.equal(perfil(a,rows(a).find(r=>r[1]==='Sem Classificação')).tipo,'');assert.equal(a.dados().perfilGastos.tipo.naoClassificado,10000);
});
test('editar classificação preserva pagamento parcial e não altera outras parcelas',()=>{
 const a=base([]);categorias(a);compra(a,{numParcelas:2,descricao:'Parcelada'});
 let r=rows(a).find(r=>String(r[8]).includes('10/2026'));const f=a.ctx.obterFaturaPagamentoWeb({forma:'Cartao',mesFatura:'10/2026'});a.ctx.registrarPagamentoFaturaWeb({...f,valor:20,requestId:'pagamento-perfil-001'});r=rows(a).find(x=>x[11]===r[11]);
 const versaoAntes=r[13];a.ctx.editarLancamentoLinhaWeb({registroId:r[11],compraId:r[12],versao:r[13],dataCompra:r[0],descricao:r[1],descOriginal:r[1],formaPagto:r[2],categoria:r[3],valorParcela:r[7],mesFatura:r[8],mesOriginal:r[8],parcelaOriginal:r[6],status:r[9],tags:r[10],perfilGasto:{tipo:'fixo',prioridade:'ajustavel'},requestId:'editar-perfil-001'});
 const alterada=rows(a).find(x=>x[11]===r[11]),outra=rows(a).find(x=>x[11]!==r[11]);assert.equal(alterada[17],20);assert.equal(perfil(a,alterada).tipo,'fixo');assert.equal(perfil(a,outra).tipo,'variavel');assert.equal(perfil(a,outra).prioridade,'essencial');assert(alterada[13]>versaoAntes);
});
test('Painel inclui pagos, exclui cancelados, terceiros, outros meses e previsões',()=>{
 const a=base([personal('Pago',30,'1/1','10/2026','Pago'),personal('Pendente',20),personal('Cancelado',99,'∞/∞','10/2026','Ocorrência Pulada'),personal('Futuro',70,'1/1','11/2026')],[loan('Ana','A Receber',999)]);
 const p=a.dados().perfilGastos;assert.equal(p.total,5000);assert.equal(p.tipo.naoClassificado,5000);assert.equal(Object.values(p.tipo).reduce((s,v)=>s+v,0),p.total);assert.equal(Object.values(p.prioridade).reduce((s,v)=>s+v,0),p.total);
});
test('geração mensal herda o perfil registrado; padrão da categoria só preenche modelo legado sem perfil',()=>{
 const a=base([personal('Mensal',90,'∞/∞','10/2026','Assinatura Paga')]);categorias(a);a.ctx.getHojeSeguro=()=>new Date(2026,10,16);a.dados();
 const outubro=rows(a).find(r=>String(r[8]).includes('10/2026')),novembro=rows(a).find(r=>String(r[8]).includes('11/2026'));assert.equal(perfil(a,outubro).tipo,'');assert.equal(perfil(a,novembro).tipo,'variavel');
 categorias(a,'fixo','ajustavel');a.ctx.getHojeSeguro=()=>new Date(2026,11,16);a.dados();assert.equal(perfil(a,rows(a).find(r=>String(r[8]).includes('11/2026'))).tipo,'variavel');assert.equal(perfil(a,rows(a).find(r=>String(r[8]).includes('12/2026'))).tipo,'variavel');
});
test('filtro do Histórico corresponde ao resumo e devolve a classificação sem deslocar identidades',()=>{
 const a=base();categorias(a);compra(a,{descricao:'Classificada'});const res=a.ctx.executarAcaoApi_('filtrarLancamentosWeb',{filtros:{mes:'10/2026',perfilCampo:'tipo',perfilValor:'variavel'},offset:0,limite:50});assert.equal(res.qtdTotal,1);assert.equal(res.itens[0][1],'Classificada');assert.equal(res.itens[0][20].tipo,'variavel');assert.ok(res.itens[0][13]);
 const pendentes=a.ctx.executarAcaoApi_('filtrarLancamentosWeb',{filtros:{mes:'10/2026',perfilCampo:'pendentes'},offset:0,limite:50});assert.equal(pendentes.qtdTotal,1);assert.equal(pendentes.itens[0][1],'Antigo');
});
test('backup e restauração conservam padrões e snapshots; cópia antiga não inventa classificação',()=>{
 const a=base();categorias(a);compra(a);const b=a.ctx.exportarBackupDadosWeb({restauravel:true});assert(b.abas.some(x=>x.nome==='Perfil de Categorias'));categorias(a,'fixo','ajustavel');const p=a.ctx.previaRestauracaoBackupWeb({backup:b});a.ctx.restaurarBackupDadosWeb({backup:b,...p,confirmacao:'RESTAURAR',requestId:'restaurar-perfil-001'});
 assert.equal(a.ctx.perfilPadraoCategoriaGestor_(a.db,'Teste').tipo,'variavel');assert.equal(a.dados().perfilGastos.tipo.variavel,10000);assert.equal(a.dados().perfilGastos.tipo.naoClassificado,5000);
 const legado={...b,abas:b.abas.filter(x=>x.nome!=='Perfil de Categorias')};const plano=a.ctx.validarBackupRestauracaoGestor_(legado);assert(plano.preservadas.includes('Perfil de Categorias'));
});
test('configuração concorrente e opções inválidas não fazem gravação parcial',()=>{
 const a=base(),versao=a.dados().versoesConfiguracao.categorias;categorias(a);const antes=JSON.stringify(a.db.sheets['Perfil de Categorias'].rows);
 assert.throws(()=>a.ctx.salvarCategoriasWeb({categorias:[{nome:'Teste',meta:0,tipoGasto:'fixo',prioridadeGasto:'essencial'}],versaoConfiguracao:versao,requestId:'concorrente-perfil-001'}),/configuração mudou/);
 assert.throws(()=>compra(a,{perfilGasto:{tipo:'inventado',prioridade:''}}),/tipo e a prioridade/);assert.equal(JSON.stringify(a.db.sheets['Perfil de Categorias'].rows),antes);
});
test('renomear categoria preserva seu padrão quando um cliente não envia campos novos',()=>{
 const a=base();categorias(a);const antes=a.dados();a.ctx.salvarCategoriasWeb({categorias:[{nome:'Nova',meta:500},{nome:'Outros',meta:0}],renomeacoes:[{de:'Teste',para:'Nova'}],versaoConfiguracao:antes.versoesConfiguracao.categorias,requestId:'renomear-perfil-001'});assert.equal(a.ctx.perfilPadraoCategoriaGestor_(a.db,'Nova').tipo,'variavel');assert.equal(perfil(a,rows(a)[0]).tipo,'');
});
test('prévia identifica mudanças de prioridade por categoria mesmo com tipos iguais e ordem diferente',()=>{
 const a=base(),cab=['Categoria','Tipo de gasto','Prioridade'],antes=[cab,['Teste','fixo','essencial'],['Outros','fixo','ajustavel']],depois=[cab,['Outros','fixo','ajustavel'],['Teste','fixo','ajustavel']];
 const d=a.ctx.diferencasAbaRestauracaoGestor_('Perfil de Categorias',antes,depois);assert.equal(d.alterados,1);assert.equal(d.mantidos,1);assert.equal(d.incluidos,0);assert.equal(d.removidos,0);assert.equal(d.amostras[0].descricao,'Teste');
});
test('backup com fórmula no perfil é recusado sem alterar os padrões existentes',()=>{
 const a=base();categorias(a);const b=a.ctx.exportarBackupDadosWeb({restauravel:true}),aba=b.abas.find(x=>x.nome==='Perfil de Categorias'),antes=JSON.stringify(a.db.sheets['Perfil de Categorias'].rows);aba.formulas=aba.valores.map(r=>r.map(()=>''));aba.formulas[1][2]='="essencial"';
 assert.throws(()=>a.ctx.previaRestauracaoBackupWeb({backup:b}),/Perfil de Categorias não aceita fórmulas/);assert.equal(JSON.stringify(a.db.sheets['Perfil de Categorias'].rows),antes);
});
test('organização anual preserva classificação no destino e padrões na base de controle',()=>{
 const {ambienteProtecao}=require('./fixtures/protecao-mocks.cjs');
 const a=ambienteProtecao(fixture([personal('Legado',50)]));a.ativar();a.n=0;a.dados=()=>a.ctx.executarAcaoApi_('getDadosCompletos',null);categorias(a);compra(a,{descricao:'Classificada anual'});
 a.ctx.ativarOrganizacaoAnualWeb();
 const entrada=a.ctx.catalogoAnosGestor_(a.db).find(e=>e.ano===2026),anual=a.planilhas.get(entrada.id);
 const rs=anual.sheets['Lançamentos'].rows.slice(1);assert.equal(perfil(a,rs.find(r=>r[1]==='Legado')).tipo,'');assert.equal(perfil(a,rs.find(r=>r[1]==='Classificada Anual')).tipo,'variavel');
 assert.equal(a.ctx.perfilPadraoCategoriaGestor_(a.db,'Teste').prioridade,'essencial');assert.equal(a.dados().perfilGastos.total,15000);
});
