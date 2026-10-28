const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,loan,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
const ler=a=>api(a,'getDadosCompletos');
const renomear=(a,de,para,id)=>api(a,'salvarFormaPagamentoWeb',{nomeOriginal:de,nome:para,banco:'Banco',limite:1000,fechamento:5,vencimento:10,versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:id});
const editar=(r,extras={})=>({registroId:r[11],compraId:r[12],versao:r[13],dataCompra:r[0],pessoa:r[1],descricao:r[2],descOriginal:r[2],formaPagto:'Cartao',valorParcela:r[7],mesFatura:r[8],mesOriginal:r[8],status:r[9],parcelaOriginal:r[6],observacoes:r[10],...extras});

for(const [valor,mes]of [[130,'10/2026'],[100,'10/2026'],[120,'11/2026'],[130,'11/2026'],[100,'11/2026']])test('correção Pix conferida retira pagamento ao mudar valor/competência: '+valor+' '+mes,()=>{
 const a=ambienteProtecao(fixture([],[loan('Ana','A Receber',120,'Pix')]));ler(a);const r=a.db.sheets['Empréstimos'].rows[1],p=editar(r,{valorParcela:valor,mesFatura:mes}),pre=api(a,'previaEdicaoEmprestimoWeb',p);
 const envio={...p,assinaturaCorrecaoPix:pre.correcaoPix.assinatura,confirmarCorrecaoPix:true,requestId:'corrigir-pix-'+valor+'-'+mes.replace('/','-')};api(a,'editarEmprestimoLinhaWeb',envio);api(a,'editarEmprestimoLinhaWeb',envio);
 const novo=a.db.sheets['Empréstimos'].rows.find(n=>n[11]===r[11]);assert.equal(novo[17],0);assert.equal(novo[14],'Em Aberto');assert.equal(novo[9],'A Receber');assert.equal(novo[12],r[12]);assert.equal(novo[7],valor);
 const fatura=api(a,'obterFaturaPagamentoWeb',{forma:'Cartao',mesFatura:mes});assert.equal(fatura.pago,0);assert.equal(fatura.restante,valor);
});

test('correção Pix não altera valor já recebido da pessoa e não limpa pagamento de outra parcela',()=>{
 const a=ambienteProtecao(fixture([],[loan('Ana','Recebido',120,'Pix'),loan('Bia','A Receber',50,'Cartao')]));ler(a);const r=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Ana'),outra=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Bia');outra[14]='Pago';outra[17]=50;ler(a);
 const p=editar(r,{valorParcela:130}),pre=api(a,'previaEdicaoEmprestimoWeb',p);assert.throws(()=>api(a,'editarEmprestimoLinhaWeb',{...p,assinaturaCorrecaoPix:pre.correcaoPix.assinatura,confirmarCorrecaoPix:true,requestId:'correcao-pix-protecao-recebido'}),/já foi recebido/);
 assert.equal(a.db.sheets['Empréstimos'].rows.find(n=>n[11]===r[11])[3],'Pix');assert.equal(a.db.sheets['Empréstimos'].rows.find(n=>n[11]===outra[11])[17],50);
});

test('forma arquivada conserva identidade, tipo Pix e filtros após duas renomeações',()=>{
 const a=ambienteProtecao(fixture([personal('Antiga',100,'1/1','12/2025','Pago','Pix')]));a.ativar();const id=a.ctx.identidadeFormaLeituraGestor_('Pix',a.db);renomear(a,'Pix','Conta antiga','rename-pix-identidade-001');a.manter();const entrada=a.ctx.catalogoAnualProtecaoGestor_(a.db)[0],antes=JSON.stringify(a.planilhas.get(entrada.id).sheets['Lançamentos'].rows);
 renomear(a,'Conta antiga','Conta atual','rename-pix-identidade-002');assert.equal(a.ctx.identidadeFormaLeituraGestor_('Conta atual',a.db),id);assert.equal(a.ctx.identidadeFormaLeituraGestor_('Pix',a.db),id);assert.equal(a.ctx.tipoFormaGestor_('Conta antiga',a.db),'pix');
 for(const forma of ['Conta atual','Conta antiga','Pix'])assert.equal(api(a,'filtrarLancamentosWeb',{filtros:{ano:'2025',forma},limite:50}).qtdTotal,1);
 assert.equal(api(a,'filtrarLancamentosWeb',{filtros:{ano:'2025',tipoRapido:'pix'},limite:50}).qtdTotal,1);const anual=api(a,'obterRelatorioAnual','2025');assert.equal(anual.total,'R$ 100,00');assert.equal(anual.formas[0].tipo,'pix');assert.equal(anual.formas[0].nome,'Conta atual');assert.equal(JSON.stringify(a.planilhas.get(entrada.id).sheets['Lançamentos'].rows),antes);
 assert.equal(api(a,'excluirFormaPagamentoWeb',{nome:'Conta atual',versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'delete-pix-archive-only'}).arquivado,true);assert.equal(a.ctx.tipoFormaGestor_('Conta antiga',a.db),'pix');
});

test('nomes anteriores não podem ser reutilizados por outro cartão e metadados acompanham ordem',()=>{
 const a=ambienteProtecao();ler(a);const id=a.ctx.identidadeFormaLeituraGestor_('Cartao',a.db);renomear(a,'Cartao','Nome novo','rename-preserve-alias-001');const antes=JSON.stringify(a.db.sheets['Formas de Pagamento'].rows);
 assert.throws(()=>api(a,'salvarFormaPagamentoWeb',{nome:'Cartao',tipo:'cartao',limite:100,fechamento:1,vencimento:5,versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'create-ambiguous-alias-001'}),/histórico/);assert.equal(JSON.stringify(a.db.sheets['Formas de Pagamento'].rows),antes);
 api(a,'reordenarFormasPagamentoWeb',{ordem:['Pix','Nome novo'],versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'reorder-stable-identities-001'});assert.equal(a.ctx.identidadeFormaLeituraGestor_('Nome novo',a.db),id);assert.equal(a.ctx.tipoFormaGestor_('Cartao',a.db),'cartao');assert.equal(a.ctx.tipoFormaGestor_('Pix',a.db),'pix');assert.equal(ler(a).formasPagamento.find(f=>f.nome==='Nome novo').formaId,id);
});

test('backup restaura identidades/aliases e recusa colisão de nomes históricos',()=>{
 const a=ambienteProtecao();ler(a);renomear(a,'Pix','Conta renomeada','rename-backup-stable-id-001');const id=a.ctx.identidadeFormaLeituraGestor_('Pix',a.db),backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),p=api(a,'previaRestauracaoBackupWeb',{backup});
 api(a,'restaurarBackupDadosWeb',{backup,versaoAtual:p.versaoAtual,hashBackup:p.hashBackup,confirmacao:'RESTAURAR',requestId:'restore-stable-id-001'});assert.equal(a.ctx.identidadeFormaLeituraGestor_('Conta renomeada',a.db),id);assert.equal(a.ctx.tipoFormaGestor_('Pix',a.db),'pix');
 const b=clone(backup),formas=b.abas.find(s=>s.nome==='Formas de Pagamento'),col=formas.valores[5].indexOf('_Gestor_Identidade_Forma_v1'),r=formas.valores.find(s=>s[1]==='Cartao'),d=JSON.parse(r[col]);d.aliases.push('Pix');r[col]=JSON.stringify(d);assert.throws(()=>api(a,'previaRestauracaoBackupWeb',{backup:b}),/dois cadastros/);
});

test('salvar categorias unifica Outros legado e rótulo canônico sem mudar valor ou ID',()=>{
 const f=fixture([personal('Doação',5)]);f['Lançamentos'][1][3]='Outros';f['Dashboard & Resumo'][16]=['','Outros','',500];const a=ambienteProtecao(f);ler(a);const r=a.db.sheets['Lançamentos'].rows[1],antes=r[11];
 api(a,'salvarCategoriasWeb',{categorias:[{nome:'Outros',meta:500}],renomeacoes:[],versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'categorias'),requestId:'categorias-outros-canonico-001'});const atual=a.db.sheets['Lançamentos'].rows[1];assert.equal(atual[3],'Outros 📦');assert.equal(a.db.sheets['Dashboard & Resumo'].rows[16][1],atual[3]);assert.equal(atual[11],antes);assert.equal(atual[7],5);assert.equal(api(a,'obterRelatorioMes','10/2026').kpis.total,'R$ 5,00');
});

test('identidade renomeada preserva dependência de exclusão reversível e desfazer usa nome atual',()=>{
 const a=ambienteProtecao(fixture([personal('Restaurável',55)]));ler(a);const r=a.db.sheets['Lançamentos'].rows[1];api(a,'excluirLancamentoWeb',{registroId:r[11],compraId:r[12],versao:r[13],requestId:'delete-before-card-renaming-001'});const evento=api(a,'obterAtividadeWeb',{}).itens[0];renomear(a,'Cartao','Nome novo','rename-after-deletion-001');
 const removido=api(a,'excluirFormaPagamentoWeb',{nome:'Nome novo',versaoConfiguracao:a.ctx.versaoConfiguracaoGestor_(a.db,'formas'),requestId:'preserve-form-undo-dependency-001'});assert.equal(removido.arquivado,true);
 assert.equal(api(a,'obterAtividadeWeb',{}).itens.find(e=>e.id===evento.id).podeDesfazer,true);api(a,'desfazerAtividadeWeb',{eventoId:evento.id,requestId:'restore-item-with-renamed-form-001'});const novo=a.db.sheets['Lançamentos'].rows.find(n=>n[11]===r[11]);assert.equal(novo[2],'Nome novo');assert.equal(api(a,'obterFaturaPagamentoWeb',{forma:'Nome novo',mesFatura:'10/2026'}).restante,55);
});
