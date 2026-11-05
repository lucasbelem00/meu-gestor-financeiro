const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const {ambienteProtecao,fixture,personal,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p={})=>a.ctx.executarAcaoApi_(n,p);
test('consulta enxuta reúne modelos e séries com a mesma condição vigente/programações, sem chamar Painel',()=>{
 const a=ambienteProtecao(fixture([personal('Recorrência',40,'∞/∞','10/2026','Assinatura Ativa'),personal('Cancelada',20,'∞/∞','10/2026','Assinatura Cancelada')]));a.carregar();
 api(a,'salvarRecorrenciaWeb',{requestId:'unificada-modelo-001',origem:'terceiros',modo:'revisao',pessoa:'Ana',descricao:'Outra conta',forma:'Cartao',valor:60,dia:20,defasagem:0,proximoMes:'10/2026'});
 const completa=api(a,'getDadosCompletos'),antes=JSON.stringify(a.db.sheets['Lançamentos'].rows);a.ctx.getDadosCompletos=()=>{throw Error('Consulta pesada proibida');};const r=api(a,'obterRecorrenciasWeb');
 assert.equal(r.itens.length,1);assert.equal(r.itens[0].origem,'terceiros');assert.deepEqual(JSON.parse(JSON.stringify(r.assinaturas)),JSON.parse(JSON.stringify(completa.assinaturas)));assert.equal(r.mesAtual,'10/2026');assert.equal(JSON.stringify(a.db.sheets['Lançamentos'].rows),antes);
});
test('consulta enxuta reconfere fórmulas/anos fechados e lê as séries após alteração de outro aparelho',()=>{
 const a=ambienteProtecao(fixture([personal('Fixa',40,'∞/∞','10/2026','Assinatura Ativa')]));a.carregar();const primeiro=api(a,'obterRecorrenciasWeb');a.db.sheets['Lançamentos'].getRange(2,8).setValue(50);const r=api(a,'obterRecorrenciasWeb');assert.notEqual(r.assinaturas[0].valor,primeiro.assinaturas[0].valor);
 a.ativar();const e=a.ctx.garantirAnoGestor_(a.db,2026),banco=a.planilhas.get(e.id);banco.sheets['Lançamentos'].rows=clone(a.db.sheets['Lançamentos'].rows);a.db.sheets['Lançamentos'].rows=[clone(banco.sheets['Lançamentos'].rows[0])];api(a,'obterRecorrenciasWeb');banco.sheets['Lançamentos'].getRange(2,8).setValue('=1+2');assert.throws(()=>api(a,'obterRecorrenciasWeb'),/fórmulas/);
});
test('metadados de recorrência são interpretados uma vez por texto na execução, com cópia e invalidação por conteúdo',()=>{
 const html=fs.readFileSync('Backend/Code.gs','utf8'),fonte=html.slice(html.indexOf('function serieRecorrenteGestor_'),html.indexOf('function definirSerieRecorrenteGestor_'));let parses=0;const ctx=vm.createContext({CONTEXTO_GESTOR_:{},Map,JSON:{parse:t=>{parses++;return JSON.parse(t);}},copiarGestor_:x=>JSON.parse(JSON.stringify(x)),validarMesFaturaWeb_(){}});vm.runInContext(fonte,ctx);const r=Array(16).fill('');r[15]='gestor-serie-v1:'+JSON.stringify({diaReferencia:20,perfilGasto:{tipo:'fixo'}});
 const v=ctx.serieRecorrenteGestor_(r);v.perfilGasto.tipo='alterado';assert.equal(ctx.serieRecorrenteGestor_(r).perfilGasto.tipo,'fixo');assert.equal(parses,1);r[15]='gestor-serie-v1:'+JSON.stringify({diaReferencia:21});assert.equal(ctx.serieRecorrenteGestor_(r).diaReferencia,21);assert.equal(parses,2);ctx.CONTEXTO_GESTOR_={};ctx.serieRecorrenteGestor_(r);assert.equal(parses,3);
});

test('datas de leitura reaproveitam formato por instante/fuso na execução, sem alterar Date ou atravessar requisições',()=>{
 const a=ambienteProtecao(),original=a.ctx.Utilities.formatDate;let leituras=0;a.ctx.Utilities.formatDate=(...args)=>{leituras++;return original(...args);};vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);const d=new Date(2026,9,1),tempo=d.getTime();
 for(let i=0;i<20;i++){assert.equal(a.ctx.parseMesFat(new Date(tempo)).m,10);assert.equal(a.ctx.formatarCelulaRegistroGestor_(d,'MM/yyyy'),'10/2026');}assert.equal(leituras,1);assert.equal(d.getTime(),tempo);
 a.ctx.formatarCelulaRegistroGestor_(d,'dd/MM/yyyy');assert.equal(leituras,2);d.setMonth(10);assert.equal(a.ctx.formatarCelulaRegistroGestor_(d,'MM/yyyy'),'11/2026');assert.equal(leituras,3);
 vm.runInContext('HASHES_EXECUCAO_GESTOR_=new Map()',a.ctx);a.ctx.formatarCelulaRegistroGestor_(d,'MM/yyyy');assert.equal(leituras,4);assert.throws(()=>a.ctx.formatarCelulaRegistroGestor_(new Date(NaN),'MM/yyyy'),/data inválida/i);
});
