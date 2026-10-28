const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');
function comResumo(){const d=fixture([personal('Compra fictícia',25)]);d['Formas de Pagamento'].push(['','Total Carteira','-',1000,'-','-']);return ambienteProtecao(d);}
test('resumo com traços em dias permite backup, restauração e ativação anual sem editar cadastros',()=>{
 const a=comResumo();a.ativar();const ref=a.ctx.executarBackupProtegidoWeb({requestId:'backup-resumo-tracos-001'});assert.equal(ref.restauravel,true);
 const backup=JSON.parse(a.arquivos.get(ref.arquivoId).texto),linha=backup.abas.find(x=>x.nome==='Formas de Pagamento').valores.find(r=>r[1]==='Total Carteira');assert.equal(linha[4],'-');assert.equal(linha[5],'-');
 assert(a.ctx.previaRestauracaoBackupWeb({backup}).hashBackup);assert.equal(a.ctx.ativarOrganizacaoAnualWeb().sucesso,true);assert.equal(a.ctx.configProtecaoGestor_().pdfAutomatico,true);assert.equal(a.ctx.obterStatusProtecaoWeb().organizacaoAnual,true);
 assert.equal(a.db.sheets['Formas de Pagamento'].rows.find(r=>r[1]==='Total Carteira')[4],'-');
});
for(const campo of [4,5])test('cartão com dia inválido continua bloqueado e erro identifica o cadastro '+campo,()=>{
 const a=comResumo();a.ativar();a.db.sheets['Formas de Pagamento'].rows.find(r=>r[1]==='Cartao')[campo]='-';
 assert.throws(()=>a.ctx.executarBackupProtegidoWeb({requestId:'backup-cartao-invalido-'+campo}),/Cartao.*linha/);assert.equal(a.ctx.configProtecaoGestor_().organizacaoAnual,undefined);
});
test('reativar PDFs com organização anual já ativa não recria os anos',()=>{
 const a=comResumo();a.ativar();a.ctx.ativarOrganizacaoAnualWeb();const antes=a.planilhas.size,c=a.ctx.configProtecaoGestor_();c.pdfAutomatico=false;a.ctx.salvarConfigProtecaoGestor_(c);a.ctx.ativarOrganizacaoAnualWeb();assert.equal(a.ctx.configProtecaoGestor_().pdfAutomatico,true);assert.equal(a.planilhas.size,antes);
});
test('estados legíveis distinguem agendamento ausente, organização anual e PDFs',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../interface/protecao.js'),'utf8'),f=s.slice(s.indexOf('function situacaoProtecaoLegivelGestor'),s.indexOf('function detalheFechamentoAnualGestor')),c=vm.createContext({});vm.runInContext(f,c);
 const ok=c.situacaoProtecaoLegivelGestor({ativo:true,rotinaInstalada:true,organizacaoAnual:true,pdfAutomatico:true});assert.equal(ok.protecao,'Proteção automática: ativada');assert.equal(ok.pdf,'PDFs automáticos: ativados');
 const parcial=c.situacaoProtecaoLegivelGestor({ativo:true,rotinaInstalada:false,organizacaoAnual:true,pdfAutomatico:false});assert.match(parcial.protecao,/reativar/);assert.match(parcial.anual,/ativada$/);assert.match(parcial.pdf,/desativados$/);
});
