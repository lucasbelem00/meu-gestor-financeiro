const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {ambienteProtecao,fixture,personal,loan,clone}=require('./fixtures/protecao-mocks.cjs');
function ambiente(dados=fixture()){
 const a=ambienteProtecao(dados);a.ativar();
 a.conversoes=[];const blob=(texto,mime='text/plain',nome='')=>({texto,mime,nome,getBytes(){return Array.from(Buffer.from(this.texto));},getDataAsString(){return this.texto;},getName(){return this.nome;},getContentType(){return this.mime;},setName(n){this.nome=n;return this;},getAs(tipo){if(a.falhaConversao)throw Error('Conversão indisponível');assert.equal(this.mime,'text/html');assert.equal(tipo,'application/pdf');a.conversoes.push(this.texto);return blob('%PDF-1.4\n'+this.texto,tipo,this.nome);}});
 const digest=a.ctx.Utilities.computeDigest;a.ctx.Utilities.newBlob=(s,m,n)=>blob(String(s),m,n);a.ctx.Utilities.computeDigest=(alg,s,cs)=>Array.isArray(s)?Array.from(crypto.createHash('sha256').update(Buffer.from(s.map(n=>n<0?n+256:n))).digest()).map(n=>n>127?n-256:n):digest(alg,s,cs);
 const criar=a.pasta.createFile;a.pasta.createFile=function(...args){if(args[0]&&typeof args[0]==='object'){const b=args[0],f=criar.call(this,b.getName(),b.getDataAsString(),b.getContentType());f.getBlob=()=>blob(f.texto,f.mime,f.nome);return f;}return criar.apply(this,args);};
 const c=a.ctx.configProtecaoGestor_();c.pdfAutomatico=true;a.ctx.salvarConfigProtecaoGestor_(c);return a;
}
const pdfs=a=>[...a.arquivos.values()].filter(f=>f.mime==='application/pdf');

test('resumo altera somente blocos necessários e repara fórmulas mesmo fora do bloco do valor editado',()=>{
 const a=ambiente(fixture(Array.from({length:10},(_,i)=>personal('Compra '+i,10,'1/1',String(i+1).padStart(2,'0')+'/2026','Em Aberto'))));
 a.ctx.atualizarResumoNativoGestor_(a.db);const sh=a.db.sheets['_Gestor_Resumo'],ler=sh.getRange;let celulas=0;
 sh.getRange=function(...args){const r=ler.apply(this,args),gravar=r.setValues;r.setValues=function(v){celulas+=v.reduce((s,r)=>s+r.length,0);return gravar.call(this,v);};return r;};
 a.db.sheets['Lançamentos'].rows[1][7]=15;a.ctx.atualizarResumoNativoGestor_(a.db);assert(celulas<sh.rows.length*13);assert.equal(sh.rows.slice(4).reduce((s,r)=>s+r[5],0),105);
 sh.getRange(6,6).setValue('=999');a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(sh.getRange(6,6).getFormulas()[0][0],'');assert.equal(sh.rows.slice(4).reduce((s,r)=>s+r[5],0),105);
});

test('resumo reutiliza categorias na mesma execução, mas relê no próximo resumo',()=>{
 const a=ambiente(),dash=a.db.sheets['Dashboard & Resumo'],ler=dash.getRange;let leituras=0;
 dash.getRange=function(...args){const r=ler.apply(this,args);if(args[0]==='B17:B41'||args[0]===17&&args[1]===2){const valores=r.getValues;r.getValues=function(){leituras++;return valores.call(this);};}return r;};
 a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(leituras,1);
 a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(leituras,2);
});

test('resumo igual não regrava nem reformata; edição só de descrição preserva o resultado',()=>{
 const a=ambiente(fixture([personal('Original',30)]));a.ctx.atualizarResumoNativoGestor_(a.db);
 const sh=a.db.sheets['_Gestor_Resumo'],data=sh.rows[2][1],original=sh.getRange;let escritas=0,formatos=0;
 sh.getRange=function(...args){const r=original.apply(this,args),gravar=r.setValues;r.setValues=function(v){escritas++;return gravar.call(this,v);};r.setNumberFormat=function(){formatos++;return r;};return r;};
 a.db.sheets['Lançamentos'].rows[1][1]='Descrição corrigida';
 const tempos={};a.ctx.atualizarResumoNativoGestor_(a.db,tempos);
 assert.equal(escritas,0);assert.equal(formatos,0);assert.equal(sh.rows[2][1],data);
 for(const campo of ['resumoControleMs','resumoLeituraMs','resumoCalculoMs','resumoDashboardMs','resumoEscritaMs','resumoFormulasMs'])assert.equal(typeof tempos[campo],'number');
 a.db.sheets['Lançamentos'].rows[1][7]=40;a.ctx.atualizarResumoNativoGestor_(a.db);assert(escritas>0);assert.equal(sh.rows.slice(4).reduce((s,r)=>s+r[5],0),40);
});
test('resumo corrompido não é aceito só pelo hash e fórmula com valor igual é reparada',()=>{
 const a=ambiente(fixture([personal('Teste',30)]));a.ctx.atualizarResumoNativoGestor_(a.db);const sh=a.db.sheets['_Gestor_Resumo'];
 sh.rows[4][5]=999;a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(sh.rows[4][5],30);
 sh.getRange(5,6).setValue('=30');a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(sh.getRange(5,6).getFormulas()[0][0],'');assert.equal(sh.rows[4][5],30);
 sh.rows.push(['linha indevida']);a.ctx.atualizarResumoNativoGestor_(a.db);assert(!sh.rows.some(r=>r[0]==='linha indevida'));
});
test('resumo limita leitura de Dashboard às posições gerenciáveis e preserva conteúdo fora delas',()=>{
 const a=ambiente(fixture([personal()])),dash=a.db.sheets['Dashboard & Resumo'];dash.getRange(80,20).setValue('=1+2');
 const dataRange=dash.getDataRange;dash.getDataRange=()=>{throw Error('não ler Dashboard inteiro');};
 assert.doesNotThrow(()=>a.ctx.atualizarResumoNativoGestor_(a.db));dash.getDataRange=dataRange;
 assert.equal(dash.getRange(80,20).getFormulas()[0][0],'=1+2');
});

test('resumo confere ano uma vez para as duas origens e revalida alteração externa na próxima consulta',()=>{
 const a=ambiente(fixture([personal('Pessoal',30)], [loan('Ana','A Receber',20,'Cartao')]));
 const e=a.ctx.garantirAnoGestor_(a.db,2026),destino=a.planilhas.get(e.id);
 for(const nome of ['Lançamentos','Empréstimos']){destino.sheets[nome].rows=clone(a.db.sheets[nome].rows);a.db.sheets[nome].rows=[clone(a.db.sheets[nome].rows[0])];}
 const c=a.ctx.configProtecaoGestor_();c.organizacaoAnual=true;a.ctx.salvarConfigProtecaoGestor_(c);
 const dados=a.ctx.dadosAnoGestor_(e),r=a.db.sheets['_Gestor_Anos'].rows.find(r=>r[0]===2026);r[2]='FECHADO';r[3]=a.ctx.hashGestor_(dados);
 const abrir=a.ctx.SpreadsheetApp.openById;let leituras=0;a.ctx.SpreadsheetApp.openById=id=>{if(id===e.id)leituras++;return abrir(id);};
 const resumo=a.ctx.registrosResumoNativoGestor_(a.db);assert.equal(leituras,1);assert.equal(resumo.length,2);assert.equal(resumo.reduce((s,r)=>s+r.total,0),5000);
 destino.sheets['Lançamentos'].rows[1][7]=99;
 assert.throws(()=>a.ctx.registrosResumoNativoGestor_(a.db),/ano fechado.*alterado/);assert.equal(leituras,2);
});

test('resumo resolve todas as formas com uma leitura local e observa renomeação na próxima chamada',()=>{
 const a=ambiente(fixture(Array.from({length:12},(_,i)=>personal('Compra '+i,10+i)),[loan('Ana','A Receber',20,'Cartao')]));
 const folha=a.db.sheets['Formas de Pagamento'],original=folha.getDataRange;let leituras=0;
 folha.getDataRange=function(){leituras++;return original.call(this);};
 const antes=a.ctx.registrosResumoNativoGestor_(a.db);
 assert.equal(antes.length,13);assert.equal(leituras,1);assert(antes.every(r=>r.forma==='Cartao'));
 // Localizar a coluna pelo resultado do validador mantém o teste independente
 // da posição técnica reservada no cadastro.
 const col=a.ctx.validarIdentidadesFormasGestor_(folha.rows).coluna-1;
 const linha=folha.rows.slice(6).find(r=>r[1]==='Cartao'),identidade=JSON.parse(linha[col]);
 identidade.aliases=Array.from(new Set(identidade.aliases.concat('Cartao','Novo nome')));linha[col]=JSON.stringify(identidade);linha[1]='Novo nome';
 leituras=0;const depois=a.ctx.registrosResumoNativoGestor_(a.db);
 assert.equal(leituras,1);assert(depois.every(r=>r.forma==='Novo nome'));
 assert.equal(depois.reduce((s,r)=>s+r.total,0),antes.reduce((s,r)=>s+r.total,0));
});

test('resumo lê fórmulas em lote e não regrava fórmulas já atualizadas',()=>{
 const a=ambiente(fixture([personal()])),dash=a.db.sheets['Dashboard & Resumo'];
 formulaIndicador(a,'C17',"=SUMIFS('Lançamentos'!H:H;'Lançamentos'!D:D;B17;'Lançamentos'!I:I;TEXT(TODAY();\"mm/yyyy\");'Lançamentos'!J:J;\"<>Assinatura Cancelada\")");
 a.ctx.atualizarResumoNativoGestor_(a.db);
 const getRange=dash.getRange;let escritas=0,leiturasIndividuais=0;const alteradas=[];
 dash.getRange=function(...args){const r=getRange.apply(this,args),set=r.setValue,formulas=r.getFormulas;r.setValue=function(...v){escritas++;alteradas.push({args,v});return set.apply(this,v);};r.getFormulas=function(){leiturasIndividuais++;return formulas.apply(this,arguments);};return r;};
 a.ctx.atualizarResumoNativoGestor_(a.db);
 // O mock implementa getDataRange via getRange: duas leituras de matriz,
 // independentemente de quantas fórmulas já foram migradas.
 assert.equal(escritas,0,JSON.stringify(alteradas));assert.equal(leiturasIndividuais,2);
 dash.getRange=getRange;
 dash.getRange('C17').setValue('=1+2');a.ctx.atualizarResumoNativoGestor_(a.db);
 assert.equal(dash.getRange('C17').getFormulas()[0][0],'=1+2');
});
test('classificação gera nova revisão mensal e anual sem substituir PDFs anteriores',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')]));assert.equal(a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2).gerados.length,2);const ids=pdfs(a).map(f=>f.id);
 const r=a.db.sheets['Lançamentos'].rows[1];a.ctx.definirPerfilGastoGestor_(r,{tipo:'fixo',prioridade:'essencial'});r[16]=a.ctx.hashRegistroGestor_(r);
 const resultado=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(resultado.sucesso,true);assert.equal(resultado.gerados.length,2);assert.equal(pdfs(a).length,4);assert(ids.every(id=>a.arquivos.has(id)));assert(a.conversoes.at(-1).includes('Perfil dos gastos pessoais'));assert(a.conversoes.at(-1).includes('Essencial'));assert.equal(a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2).gerados.length,0);
});
function formulaIndicador(a,endereco,formula){a.db.sheets['Dashboard & Resumo'].getRange(endereco).setValue(formula);}

test('resumo inclui arquivo anual e separa banco de recebimentos sem alterar cadastros',()=>{
 const atual=personal('Atual',50),recebido=loan('Ana','Recebido',80,'Cartao'),banco=loan('Bruno','A Receber',100,'Cartao');
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),atual],[recebido,banco])),r=a.db.sheets['Lançamentos'].rows.find(r=>r[1]==='Atual'),b=a.db.sheets['Empréstimos'].rows.find(r=>r[1]==='Bruno');r[17]=20;r[16]=a.ctx.hashRegistroGestor_(r);b[14]='Pago';b[17]=100;b[16]=a.ctx.hashRegistroGestor_(b);a.manter();const cat=JSON.stringify(a.db.sheets['Dashboard & Resumo'].getRange('B17:D41').getValues()),formas=JSON.stringify(a.db.sheets['Formas de Pagamento'].rows);a.ctx.atualizarResumoNativoGestor_(a.db);const linhas=a.db.sheets['_Gestor_Resumo'].rows.slice(4),somar=(c,origem)=>linhas.filter(r=>!origem||r[4]===origem).reduce((s,r)=>s+r[c],0);assert.equal(somar(5,'Pessoal'),150);assert.equal(somar(6,'Pessoal'),120);assert.equal(somar(5,'Terceiros'),180);assert.equal(somar(6,'Terceiros'),100);assert.equal(somar(7,'Terceiros'),80);assert.equal(somar(8,'Terceiros'),80);assert.equal(somar(9,'Terceiros'),100);assert.equal(JSON.stringify(a.db.sheets['Dashboard & Resumo'].getRange('B17:D41').getValues()),cat);assert.equal(JSON.stringify(a.db.sheets['Formas de Pagamento'].rows),formas);
});
test('migra apenas templates conhecidos e arquivamento continua seguro para referências personalizadas',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),personal('Atual',30)]));formulaIndicador(a,'B3',"=SUMIFS('Lançamentos'!H:H; 'Lançamentos'!J:J; \"<>Pago\"; 'Lançamentos'!J:J; \"<>Assinatura Cancelada\")");formulaIndicador(a,'C7',"=SUMIFS('Lançamentos'!$H:$H; 'Lançamentos'!$C:$C; $B7; 'Lançamentos'!$I:$I; \"10/2026\")");formulaIndicador(a,'C17',"=SUMIFS('Lançamentos'!H:H; 'Lançamentos'!D:D; B17; 'Lançamentos'!I:I; TEXT(TODAY(); \"mm/yyyy\"); 'Lançamentos'!J:J; \"<>Assinatura Cancelada\")");formulaIndicador(a,'G7','=SUM(C7:F7)');formulaIndicador(a,'A43',"=INDEX('Lançamentos'!H:H;3)");a.ctx.atualizarResumoNativoGestor_(a.db);const sh=a.db.sheets['Dashboard & Resumo'];assert.match(sh.getRange('B3').getFormulas()[0][0],/_Gestor_Resumo/);assert.match(sh.getRange('C7').getFormulas()[0][0],/_Gestor_Resumo/);assert.match(sh.getRange('C17').getFormulas()[0][0],/_Gestor_Resumo/);assert.equal(sh.getRange('G7').getFormulas()[0][0],'=SUM(C7:F7)');assert.throws(()=>a.ctx.conferirFormulasOutrasAbasProtecaoGestor_(a.db),/referências/);sh.getRange('A43').setValue('');a.manter();a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(a.db.sheets['_Gestor_Resumo'].rows.slice(4).reduce((s,r)=>s+r[5],0),130);
});
test('SUMIFS particular permanece intacta e ainda bloqueia manutenção insegura',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')])),f="=SUMIFS('Lançamentos'!H:H;'Lançamentos'!J:J;\"Meu status\")";formulaIndicador(a,'B3',f);a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(a.db.sheets['Dashboard & Resumo'].getRange('B3').getFormulas()[0][0],f);assert.throws(()=>a.ctx.conferirFormulasOutrasAbasProtecaoGestor_(a.db),/referências/);
});
test('retoma migração após interrupção e preserva fórmula particular posterior',()=>{
 const a=ambiente(fixture([personal()])),sh=a.db.sheets['Dashboard & Resumo'];formulaIndicador(a,'C17',"=SUMIFS('Lançamentos'!H:H;'Lançamentos'!D:D;B17;'Lançamentos'!I:I;TEXT(TODAY();\"mm/yyyy\");'Lançamentos'!J:J;\"<>Assinatura Cancelada\")");a.ctx.atualizarResumoNativoGestor_(a.db);const velha=sh.getRange('C17').getFormulas()[0][0];sh.getRange('B17').setValue('Outra categoria');a.db.failure={name:'Dashboard & Resumo',stage:'before',row:17,col:3};assert.throws(()=>a.ctx.atualizarResumoNativoGestor_(a.db),/FALHA/);assert.equal(sh.getRange('C17').getFormulas()[0][0],velha);a.ctx.atualizarResumoNativoGestor_(a.db);assert.match(sh.getRange('C17').getFormulas()[0][0],/Outra categoria/);sh.getRange('C17').setValue('=1+2');a.ctx.atualizarResumoNativoGestor_(a.db);assert.equal(sh.getRange('C17').getFormulas()[0][0],'=1+2');
});
test('aba resumo não gerenciada é preservada integralmente',()=>{
 const a=ambiente(fixture([personal()]));(a.db.getSheetByName('_Gestor_Resumo')||a.db.insertSheet('_Gestor_Resumo')).getRange(1,1).setValue('Minha planilha');const antes=JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows);assert.throws(()=>a.ctx.atualizarResumoNativoGestor_(a.db),/não gerenciados/);assert.equal(JSON.stringify(a.db.sheets['_Gestor_Resumo'].rows),antes);
});
test('categoria com aspas gera literal válido de planilha e metadado adulterado é preservado para revisão',()=>{
 const a=ambiente(fixture([personal()])),sh=a.db.sheets['Dashboard & Resumo'];sh.getRange('B17').setValue('Casa "A"');formulaIndicador(a,'C17',"=SUMIFS('Lançamentos'!H:H;'Lançamentos'!D:D;B17;'Lançamentos'!I:I;TEXT(TODAY();\"mm/yyyy\");'Lançamentos'!J:J;\"<>Assinatura Cancelada\")");a.ctx.atualizarResumoNativoGestor_(a.db);assert.match(sh.getRange('C17').getFormulas()[0][0],/"Casa ""A"""/);const resumo=a.db.sheets['_Gestor_Resumo'],m=JSON.parse(resumo.rows[0][2]);m.migracoes[0].gerada='=IMPORTXML("https://example.invalid";"x")';resumo.rows[0][2]=JSON.stringify(m);const antes=JSON.stringify(resumo.rows);assert.throws(()=>a.ctx.atualizarResumoNativoGestor_(a.db),/Controle de fórmulas/);assert.equal(JSON.stringify(resumo.rows),antes);
});
test('resumo lê ano fechado com ajuste posterior e ano futuro aberto sem tocar no retrato',()=>{
 const emp=loan('Ana','A Receber',80,'Cartao');emp[8]='12/2025';const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago'),personal('Atual',20),personal('Futura',40,'1/1','01/2027')],[emp]));
 const lanc=a.db.sheets['Lançamentos'],emprestimos=a.db.sheets['Empréstimos'],ano=2025,dados={ano,abas:[{nome:'Lançamentos',valores:[lanc.rows[0],lanc.rows.find(r=>r[1]==='Antiga')]},{nome:'Empréstimos',valores:[emprestimos.rows[0],emprestimos.rows[1]]}]},e=a.ctx.novaPlanilhaAnoGestor_(a.db,a.pasta,ano,'resumo-fechado',dados),snapshot=a.ctx.dadosAnoGestor_(e);e.estado='FECHADO';e.hash=a.ctx.hashGestor_(snapshot);a.db.insertSheet('_Gestor_Anos').getRange(1,1,2,6).setValues([['Ano','Planilha ID','Estado','SHA256 fechamento','Fechado em','Origem'],a.ctx.linhaCatalogoAnoGestor_(e)]);const futura={ano:2027,abas:[{nome:'Lançamentos',valores:[lanc.rows[0],lanc.rows.find(r=>r[1]==='Futura')]},{nome:'Empréstimos',valores:[emprestimos.rows[0]]}]},f=a.ctx.novaPlanilhaAnoGestor_(a.db,a.pasta,2027,'resumo-futuro',futura);a.db.sheets['_Gestor_Anos'].getRange(3,1,1,6).setValues([a.ctx.linhaCatalogoAnoGestor_(f)]);lanc.rows=[lanc.rows[0],lanc.rows.find(r=>r[1]==='Atual')];emprestimos.rows=[emprestimos.rows[0]];
 const original=snapshot.abas.find(x=>x.nome==='Empréstimos').valores[1],ajuste=clone(original);ajuste[9]='Recebido';ajuste[14]='Pago';ajuste[17]=80;ajuste[13]++;ajuste[16]=a.ctx.hashRegistroGestor_(ajuste);a.db.insertSheet('_Gestor_AjustesAnuais').getRange(1,1,2,6).setValues([['Aba','Registro ID','Ano original','SHA256 original','Estado','Registro JSON'],['Empréstimos',original[11],2025,a.ctx.hashGestor_(original),'ATUALIZADO',JSON.stringify(a.ctx.serializarGestor_(ajuste))]]);a.ctx.atualizarResumoNativoGestor_(a.db);const linhas=a.db.sheets['_Gestor_Resumo'].rows.slice(4),terceiros=linhas.find(r=>r[4]==='Terceiros');assert.equal(linhas.filter(r=>r[4]==='Pessoal').reduce((s,r)=>s+r[5],0),160);assert.equal(terceiros[6],80);assert.equal(terceiros[8],80);assert.equal(terceiros[9],0);assert(linhas.some(r=>r[1]==='01/2027'));assert.equal(a.ctx.hashGestor_(a.ctx.dadosAnoGestor_(e)),e.hash);assert.equal(a.ctx.dadosAnoGestor_(e).abas.find(x=>x.nome==='Empréstimos').valores[1][9],'A Receber');
});
test('PDFs automáticos geram até dois períodos completos por rodada, com revisão e HTML seguro',()=>{
 const a=ambiente(fixture([personal('Uma',30,'1/1','08/2026'),personal('Duas',40,'1/1','09/2026'),personal('Três',50,'1/1','10/2026'),personal('Futura',99,'1/1','12/2026')]));a.ctx.getHojeSeguro=()=>new Date(2026,10,1);let r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,100);assert.equal(r.sucesso,true);assert.equal(r.gerados.length,2);assert.equal(r.pendentes,1);assert.equal(pdfs(a).length,2);r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.gerados.length,1);assert.equal(pdfs(a).length,3);r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.gerados.length,0);assert.equal(a.conversoes.length,3);assert(pdfs(a).every(f=>!f.nome.includes('12-2026')));const seguro=a.ctx.htmlRelatorioPDFGestor_({periodo:'2026',hash:'x',quantidade:1,grupos:[{mes:'10/2026',forma:'<script>alert(1)</script>',categoria:'A & B',origem:'Pessoal',total:100,pago:0,saldo:100,recebido:0,aReceber:0}]},'agora');assert(!seguro.includes('<script>'));assert(seguro.includes('&lt;script&gt;'));assert(seguro.includes('A &amp; B'));
});
test('recebimento tardio reemite mês e ano, preservando os PDFs anteriores',()=>{
 const emp=loan('Ana','A Receber',80,'Cartao');emp[8]='12/2025';const a=ambiente(fixture([],[emp]));let r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.gerados.length,2);const antigos=pdfs(a).map(f=>f.id),hashes=r.gerados.map(x=>x.hashDados);a.db.sheets['Empréstimos'].rows[1][9]='Recebido';a.db.sheets['Empréstimos'].rows[1][16]=a.ctx.hashRegistroGestor_(a.db.sheets['Empréstimos'].rows[1]);r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.gerados.length,2);assert.equal(pdfs(a).length,4);assert(antigos.every(id=>a.arquivos.has(id)));assert(r.gerados.every(x=>!hashes.includes(x.hashDados)));assert(a.conversoes.at(-1).includes('Recebido de pessoas'));
});
test('interrupção após criar PDF retoma com o mesmo arquivo sem conversão duplicada',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')])),dados=a.ctx.dadosPeriodoPDFGestor_(a.ctx.registrosResumoNativoGestor_(a.db),'12/2025'),criar=a.pasta.createFile;a.pasta.createFile=function(...args){const f=criar.apply(this,args);if(args[0]&&typeof args[0]==='object')a.db.failure={name:'_Gestor_RelatoriosPDF',stage:'before',col:1};return f;};assert.throws(()=>a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados),/FALHA/);a.pasta.createFile=criar;assert.equal(pdfs(a).length,1);const r=a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados);assert.equal(r.repetido,false);assert.equal(pdfs(a).length,1);assert.equal(a.conversoes.length,1);assert.equal(a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados).repetido,true);
});
test('PDF corrompido não é confirmado nem sobrescrito',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')])),dados=a.ctx.dadosPeriodoPDFGestor_(a.ctx.registrosResumoNativoGestor_(a.db),'12/2025'),criar=a.pasta.createFile;a.pasta.createFile=function(...args){const f=criar.apply(this,args);if(args[0]&&typeof args[0]==='object')f.texto+='Alterado';return f;};assert.throws(()=>a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados),/conferência/);a.pasta.createFile=criar;assert.throws(()=>a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados),/conferência/);assert.equal(pdfs(a).length,1);assert.equal(a.db.sheets['_Gestor_RelatoriosPDF'].rows[1][3],'PREPARANDO');
});
test('retoma PDF interrompido mesmo se os dados já mudaram para uma revisão posterior',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')])),dados=a.ctx.dadosPeriodoPDFGestor_(a.ctx.registrosResumoNativoGestor_(a.db),'12/2025'),criar=a.pasta.createFile;a.pasta.createFile=function(...args){const f=criar.apply(this,args);if(args[0]&&typeof args[0]==='object')a.db.failure={name:'_Gestor_RelatoriosPDF',stage:'before',col:1};return f;};assert.throws(()=>a.ctx.emitirRelatorioPDFGestor_(a.db,a.pasta,dados),/FALHA/);a.pasta.createFile=criar;a.db.sheets['Lançamentos'].rows[1][7]=130;const r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.sucesso,true);assert.equal(r.gerados.length,2);assert(r.gerados.some(g=>g.retomado&&g.hashDados===dados.hash));assert.equal(a.db.sheets['_Gestor_RelatoriosPDF'].rows[1][3],'CONFIRMADO');assert.equal(pdfs(a).length,2);
});
test('falha de conversão é independente do backup financeiro já confirmado',()=>{
 const a=ambiente(fixture([personal('Antiga',100,'1/1','12/2025','Pago')]));const backup=a.ctx.executarBackupProtegidoWeb({requestId:'backup-antes-pdf-falhar-001'});a.falhaConversao=true;const r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.sucesso,false);assert.match(r.erro,/Conversão indisponível/);assert.equal(a.ctx.obterStatusProtecaoWeb().ultimoBackup.arquivoId,backup.arquivoId);assert.equal(a.db.sheets['_Gestor_Backups'].rows.at(-1)[2],'CONFIRMADO');assert.equal(pdfs(a).length,0);
});
test('excluir último gasto de um período já emitido cria revisão zerada de mês e ano',()=>{
 const a=ambiente(fixture([personal('Única',100,'1/1','12/2025','Pago')]));assert.equal(a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2).gerados.length,2);const antigos=pdfs(a).map(f=>f.id);a.db.sheets['Lançamentos'].rows.splice(1);const r=a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2);assert.equal(r.sucesso,true);assert.equal(r.gerados.length,2);assert.equal(pdfs(a).length,4);assert(antigos.every(id=>a.arquivos.has(id)));assert(a.conversoes.at(-1).includes('0 registro(s)'));assert.equal(a.ctx.gerarRelatoriosPDFProgramadosGestor_(a.db,a.pasta,2).gerados.length,0);
});
