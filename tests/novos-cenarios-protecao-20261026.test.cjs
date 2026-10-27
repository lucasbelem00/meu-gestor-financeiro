const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,launch}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function criar(){const a=ambienteProtecao(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),personal('Atual',30),personal('Outra atual',70)]));a.ativar();return a;}
const temAntiga=a=>a.db.sheets['Lançamentos'].rows.some(r=>r[1]==='Antiga');
for(const modo of ['removido','alterado'])test('retomada anual com destino '+modo+' preserva a origem e não confirma o plano',()=>{
 const a=criar();a.db.failure={name:'Lançamentos',stage:'before',row:1};assert.throws(()=>a.manter(),/FALHA/);const id=a.db.sheets['_Gestor_ArquivosAnuais'].rows[1][1],destino=a.planilhas.get(id),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);
 if(modo==='removido')a.planilhas.delete(id);else destino.sheets['Lançamentos'].rows[1][7]=1;
 assert.throws(()=>a.carregar(),/destino da manutenção/);assert(temAntiga(a));assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);assert.equal(a.db.sheets['_Gestor_Manutencao'].rows[1][1],'PRONTO');
});
test('destino anual íntegro permite retomar e mantém totais sem duplicar',()=>{
 const a=criar();a.db.failure={name:'Lançamentos',stage:'before',row:1};assert.throws(()=>a.manter(),/FALHA/);assert.equal(a.carregar().kpis.totalGeral,'R$ 200,00');assert.equal(api(a,'obterRelatorioAnual','2025').total,'R$ 100,00');assert.equal(a.db.sheets['_Gestor_Manutencao'].rows[1][1],'CONFIRMADO');assert.equal(a.carregar().kpis.totalGeral,'R$ 200,00');
});
for(const integro of [false,true])test('plano antigo v1 '+(integro?'retoma com destino íntegro':'também bloqueia destino removido'),()=>{
 const a=criar();a.db.failure={name:'Lançamentos',stage:'before',row:1};assert.throws(()=>a.manter(),/FALHA/);
 const linha=a.db.sheets['_Gestor_Manutencao'].rows[1],arquivo=a.arquivos.get(linha[2]),plano=JSON.parse(arquivo.texto);plano.versao=1;delete plano.destinos;arquivo.texto=JSON.stringify(plano);linha[3]=a.ctx.hashTextoBackupGestor_(arquivo.texto);
 if(!integro){a.planilhas.delete(a.db.sheets['_Gestor_ArquivosAnuais'].rows[1][1]);assert.throws(()=>a.carregar(),/destino da manutenção/);assert(temAntiga(a));assert.equal(linha[1],'PRONTO');}
 else{assert.equal(a.carregar().kpis.totalGeral,'R$ 200,00');assert.equal(linha[1],'CONFIRMADO');assert(!temAntiga(a));}
});
for(const integro of [false,true])test('retomada técnica '+(integro?'íntegra mantém consulta':'sem bundle conserva as partes do diário'),()=>{
 const a=ambienteProtecao();a.ativar();const p={...launch,numParcelas:1,requestId:'regressao-retomada-tecnica-001'};api(a,'salvarLancamentoWeb',p);const diario=a.db.sheets['_Gestor_Operacoes'];diario.rows.filter(r=>r[2]==='CONFIRMADO').forEach(r=>r[5]=new Date(2025,0,1));a.db.sheets['_Gestor_Atividade'].rows.filter(r=>r[4]==='EVENTO').forEach(r=>r[1]='2025-01-01T12:00:00Z');
 a.db.failure={name:'_Gestor_Operacoes',stage:'before',row:1};assert.throws(()=>a.ctx.comLockProtecaoGestor_(ss=>a.ctx.compactarHistoricoProtecaoGestor_(ss,a.pasta)),/FALHA/);const bundle=[...a.arquivos.values()].find(f=>f.nome.startsWith('Gestor_HistoricoTecnico_'));assert(bundle);
 if(!integro){a.arquivos.delete(bundle.id);const antes=JSON.stringify(diario.rows);assert.throws(()=>a.ctx.comLockProtecaoGestor_(()=>{}),/destino da manutenção/);assert.equal(JSON.stringify(diario.rows),antes);assert.equal(diario.rows[1][2],'CONFIRMADO');assert.equal(a.db.sheets['_Gestor_Manutencao'].rows[1][1],'PRONTO');}
 else{a.ctx.comLockProtecaoGestor_(()=>{});assert.equal(diario.rows[1][2],'ARQUIVADO');assert.equal(a.ctx.consultarOperacaoWeb({action:'salvarLancamentoWeb',requestId:p.requestId}).estado,'confirmado');}
});
for(const formula of ['=H3','=INDEX(H:H,3)','=SUM(3:3)','=MinhaFaixa','=INDIRECT("H3")','=SUM(H:H)'])test('prévia bloqueia fórmula personalizada '+formula+' antes do arquivamento',()=>{
 const a=criar(),sh=a.db.sheets['Lançamentos'];sh.getRange(3,19).setValue(formula);const antes=JSON.stringify(sh.rows),arquivos=a.planilhas.size;assert.throws(()=>a.ctx.previaManutencaoProtegidaWeb(),/fórmulas personalizadas/);assert.equal(JSON.stringify(sh.rows),antes);assert(temAntiga(a));assert.equal(a.planilhas.size,arquivos);
});
test('expressões demonstravelmente constantes podem continuar na linha retida',()=>{
 const a=criar(),sh=a.db.sheets['Lançamentos'];sh.getRange(3,19).setValue('=1000+1000');a.manter();assert.equal(sh.getRange(2,19).getFormulas()[0][0],'=1000+1000');assert.equal(a.carregar().kpis.totalGeral,'R$ 200,00');
});
