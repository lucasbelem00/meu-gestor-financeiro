const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot,fixture,personal,loan}=require('./fixtures/gestor-mocks.cjs');
function ambiente(){
 const a=boot(fixture([personal('Sem classificação',25),personal('Fixo essencial',100,'1/1','10/2026','Pago'),personal('Variável ajustável',75,'1/1','11/2026'),personal('Pulada',90,'∞/∞','10/2026','Ocorrência Pulada')],[loan('Terceiro','A Receber',500)]));
 a.ctx.executarAcaoApi_('getDadosCompletos',null);
 for(const [nome,p]of [['Fixo essencial',{tipo:'fixo',prioridade:'essencial'}],['Variável ajustável',{tipo:'variavel',prioridade:'ajustavel'}]]){const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]===nome);a.ctx.definirPerfilGastoGestor_(r,p);r[16]=a.ctx.hashRegistroGestor_(r);}
 return a;
}
test('mensal, anual e PDF automático compartilham classificação registrada e não incluem terceiros',()=>{
 const a=ambiente(),m=a.ctx.obterRelatorioMes('10/2026'),an=a.ctx.obterRelatorioAnual(2026),rs=a.ctx.registrosResumoNativoGestor_(a.db),p=a.ctx.dadosPeriodoPDFGestor_(rs,'10/2026'),ano=a.ctx.dadosPeriodoPDFGestor_(rs,'2026');
 assert.equal(m.perfilGastos.total,12500);assert.equal(m.perfilGastos.tipo.fixo,10000);assert.equal(m.perfilGastos.tipo.naoClassificado,2500);assert.equal(an.perfilGastos.total,20000);assert.equal(an.perfilGastos.tipo.variavel,7500);
 assert.equal(JSON.stringify(p.perfilGastos),JSON.stringify(m.perfilGastos));assert.equal(JSON.stringify(ano.perfilGastos),JSON.stringify(an.perfilGastos));
 const h=a.ctx.htmlRelatorioPDFGestor_(ano,'hoje');for(const t of ['Perfil dos gastos pessoais','Essencial','Ajustável','Não classificado','<th>Tipo</th>','<th>Prioridade</th>'])assert(h.includes(t));
});
test('resumo nativo mantém as colunas financeiras e separa grupos com classificação diferente',()=>{
 const a=ambiente();a.ctx.atualizarResumoNativoGestor_(a.db);const r=a.db.sheets['_Gestor_Resumo'].rows;
 assert.equal(r[3][5],'Registrado');assert.equal(r[3][10],'Quantidade');assert.equal(r[3][11],'Tipo de gasto');assert.equal(r[3][12],'Prioridade');
 const pessoal=r.slice(4).filter(r=>r[4]==='Pessoal');assert.equal(pessoal.reduce((s,r)=>s+r[5],0),200);assert(pessoal.some(r=>r[11]==='Fixo'&&r[12]==='Essencial'));assert(pessoal.some(r=>r[11]==='Não classificado'));
});
test('reclassificar muda revisão do PDF, mas trocar apenas o padrão da categoria não muda o retrato',()=>{
 const a=ambiente(),dados=()=>a.ctx.dadosPeriodoPDFGestor_(a.ctx.registrosResumoNativoGestor_(a.db),'2026');const antes=dados();
 a.db.insertSheet('Perfil de Categorias').rows=[['Categoria','Tipo de gasto','Prioridade'],['Teste','fixo','essencial']];assert.equal(dados().hash,antes.hash);
 const r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Sem classificação');a.ctx.definirPerfilGastoGestor_(r,{tipo:'variavel',prioridade:'ajustavel'});r[16]=a.ctx.hashRegistroGestor_(r);assert.notEqual(dados().hash,antes.hash);
});
test('PDF executivo inclui tabelas de perfil em ambos os períodos e classificação no extrato mensal',()=>{
 const a=ambiente(),html=fs.readFileSync('index.html','utf8'),fonte=html.slice(html.indexOf('    function montarDocumentoPDF('),html.indexOf('    async function gerarPDFExecutivo('));
 const tabelas=[],textos=[];class PDF{constructor(){this.internal={getNumberOfPages:()=>1};}splitTextToSize(t){return [t];}getTextWidth(t){return t.length;}text(t){textos.push(t);}autoTable(t){tabelas.push(t);this.lastAutoTable={finalY:t.startY+25};}}
 for(const n of ['addPage','setFont','setFontSize','setTextColor','setFillColor','setDrawColor','roundedRect','setProperties','line','setPage'])PDF.prototype[n]=()=>{};
 const ctx=vm.createContext({window:{jspdf:{jsPDF:PDF}},formatBRL:a.ctx.formatBRL,chaveFormaPagamentoGestor:s=>s,formaEhPixGestor:()=>false,formaEhCartaoGestor:()=>true});vm.runInContext(fonte,ctx);
 for(const tipo of ['mensal','anual']){tabelas.length=0;textos.length=0;const d=tipo==='mensal'?a.ctx.obterRelatorioMes('10/2026'):a.ctx.obterRelatorioAnual(2026);ctx.montarDocumentoPDF(tipo,d,{mes:'10',ano:'2026',nomeMes:'Outubro'});
 assert(textos.flat().includes('Perfil dos gastos pessoais'));const ts=tabelas.filter(t=>t.head[0][0]==='Classificação');assert.equal(ts.length,2);assert(ts[0].body.some(r=>r[0]==='Não classificado'));assert(ts[1].body.some(r=>r[0]==='Essencial'));
 if(tipo==='mensal')assert(tabelas.find(t=>t.head[0][0]==='Data / parcela').body.some(r=>r[1].includes('Tipo: Fixo | Prioridade: Essencial')));
 }
});
