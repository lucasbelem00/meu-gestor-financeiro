const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,clone}=require('./fixtures/protecao-mocks.cjs');

function planoAnual(){
 const a=ambienteProtecao(fixture([personal('Original',30)]));a.ativar();
 const e=a.ctx.garantirAnoGestor_(a.db,2026),sh=a.planilhas.get(e.id).sheets['Lançamentos'];
 sh.rows=clone(a.db.sheets['Lançamentos'].rows);a.db.sheets['Lançamentos'].rows=[clone(sh.rows[0])];
 const depois=clone(sh.rows);depois[1][1]='Editado';
 const m=a.ctx.mudancaMatrizAnualGestor_(a.db,'Lançamentos',depois,e);
 return {...a,e,sh,plano:{mudancas:[m]}};
}

test('validar cabeçalho de notas lê valores uma vez mantendo fórmulas e validação integral',()=>{
 const a=ambienteProtecao(),sh=a.db.insertSheet('Anotações');sh.rows=[['ID','Texto','Concluída','Data','Versão','Excluída'],['nota-1','Teste',false,'16/10/2026',1,false]];let leituras=0;const ler=sh.getRange;
 sh.getRange=function(...p){const r=ler.apply(this,p),valores=r.getValues;r.getValues=function(){leituras++;return valores.call(this);};return r;};
 a.ctx.garantirCabecalhoNotasGestor_(sh);assert.equal(leituras,1);sh.getRange(2,2).setValue('=1');assert.throws(()=>a.ctx.garantirCabecalhoNotasGestor_(sh),/fórmulas|conteúdo/);
});

test('gravação anual normal dispensa varredura preventiva de datas, mantendo resultado e releitura final',()=>{
 function executar(preventiva){const a=planoAnual();let consultas=0,recuperacoes=0;const abrir=a.ctx.SpreadsheetApp.openById,ler=a.sh.getRange,reparar=a.ctx.recuperarDatasTextoPlanoGestor_;
  a.ctx.SpreadsheetApp.openById=function(...p){consultas++;return abrir.apply(this,p);};
  a.sh.getRange=function(...p){const r=ler.apply(this,p);for(const k of ['getValues','getFormulas']){const f=r[k];r[k]=function(){consultas++;return f.call(this);};}return r;};
  a.ctx.recuperarDatasTextoPlanoGestor_=function(...p){recuperacoes++;return reparar(...p);};
  if(preventiva)a.ctx.recuperarDatasTextoPlanoGestor_(a.db,a.plano);
  a.ctx.aplicarPlanoGestor_(a.db,a.plano);const apos=JSON.stringify(a.sh.rows);
  assert.equal(a.sh.rows[1][1],'Editado');assert.equal(a.ctx.hashEstadoGestor_(a.ctx.lerEstadoAbaGestor_(a.sh)),a.plano.mudancas[0].depois);
  return {consultas,recuperacoes,apos};
 }
 const antiga=executar(true),nova=executar(false);assert(nova.consultas<antiga.consultas);assert.equal(nova.recuperacoes,0);assert.equal(antiga.recuperacoes,1);
 // IDs são gerados em bases isoladas: a igualdade financeira é conferida pelo hash do próprio plano.
});

test('estado divergente ainda chama recuperação específica e não encobre alteração financeira',()=>{
 const a=planoAnual(),original=a.ctx.recuperarDatasTextoPlanoGestor_;let chamadas=0;
 a.ctx.recuperarDatasTextoPlanoGestor_=function(ss,plano,selecionadas){chamadas++;assert.equal(selecionadas.length,1);assert.equal(selecionadas[0],a.plano.mudancas[0]);return original(ss,plano,selecionadas);};
 a.sh.rows[1][7]=99;assert.throws(()=>a.ctx.aplicarPlanoGestor_(a.db,a.plano),/não corresponde/);assert.equal(chamadas,1);assert.equal(a.sh.rows[1][7],99);
});

test('planejamento de inclusão e edição usa a fotografia conferida com plano idêntico e bloqueia conflito posterior',()=>{
 for(const incluir of [false,true]){
  const a=planoAnual(),conferidos=a.ctx.dadosAnoGestor_(a.e).abas.find(x=>x.nome==='Lançamentos').valores,depois=clone(conferidos);
  if(incluir){const nova=clone(depois[1]);nova[11]='novo-registro-teste';nova[12]='nova-compra-teste';depois.push(nova);}else depois[1][1]='Descrição editada';
  const ler=a.sh.getDataRange;let leituras=0;a.sh.getDataRange=function(){leituras++;return ler.call(this);};
  const anterior=a.ctx.mudancaMatrizAnualGestor_(a.db,'Lançamentos',depois,a.e);assert.equal(leituras,1);
  const novo=a.ctx.mudancaMatrizAnualGestor_(a.db,'Lançamentos',depois,a.e,conferidos);assert.equal(leituras,1);assert.equal(JSON.stringify(novo),JSON.stringify(anterior));
  a.sh.rows[1][1]='Alteração externa';assert.throws(()=>a.ctx.aplicarPlanoGestor_(a.db,{mudancas:[novo]}),/não corresponde/);assert.equal(a.sh.rows[1][1],'Alteração externa');
 }
});

test('aplicação anual reusa leitura recém-conferida e mantém leitura de verificação final',()=>{
 const executar=reusar=>{
  const a=planoAnual(),ler=a.sh.getDataRange,contagem={valores:0,formulas:0};
  a.sh.getDataRange=function(){const r=ler.call(this),v=r.getValues,f=r.getFormulas;r.getValues=function(){contagem.valores++;return v.call(this);};r.getFormulas=function(){contagem.formulas++;return f.call(this);};return r;};
  if(!reusar){const destino=a.ctx.destinoMudancaAnualGestor_;a.ctx.destinoMudancaAnualGestor_=(ss,m,p)=>destino(ss,m,p);}
  a.ctx.aplicarPlanoGestor_(a.db,a.plano);assert.equal(a.sh.rows[1][1],'Editado');return contagem;
 };
 const antiga=executar(false),nova=executar(true);
 assert.equal(antiga.valores-nova.valores,1);assert.equal(antiga.formulas-nova.formulas,1);assert(nova.valores>=2);
});

test('fotografia anual não dispensa rejeição de fórmulas e é renovada entre chamadas',()=>{
 const a=planoAnual(),leitura={},m=a.plano.mudancas[0];
 a.ctx.destinoMudancaAnualGestor_(a.db,m,a.plano,leitura);assert.equal(leitura.valores[1][1],'Original');
 a.sh.rows[1][1]='Outra edição';a.ctx.destinoMudancaAnualGestor_(a.db,m,a.plano,leitura);assert.equal(leitura.valores[1][1],'Outra edição');
 a.sh.getRange(2,2).setValue('=1+2');assert.throws(()=>a.ctx.aplicarPlanoGestor_(a.db,a.plano),/fórmulas/);
});

test('alteração após escrever continua impedindo confirmação do plano anual',()=>{
 const a=planoAnual(),ler=a.sh.getRange;
 a.sh.getRange=function(...args){const r=ler.apply(this,args),gravar=r.setValues;r.setValues=function(v){const x=gravar.call(this,v);a.sh.rows[1][1]='Divergente';return x;};return r;};
 assert.throws(()=>a.ctx.aplicarPlanoGestor_(a.db,a.plano),/ainda não corresponde/);
});

test('matriz anual lê cabeçalho e dados locais uma vez e observa a próxima alteração',()=>{
 const a=ambienteProtecao(fixture([personal('Teste',30)]));a.ativar();
 const sh=a.db.sheets['Lançamentos'],ler=sh.getDataRange;let leituras=0;
 sh.getDataRange=function(){leituras++;return ler.call(this);};
 const antes=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos');assert.equal(leituras,1);
 sh.rows[1][7]=45;const depois=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos');
 assert.equal(leituras,2);assert.equal(antes[1][7],30);assert.equal(depois[1][7],45);
});

test('identidade anual é lida em bloco e continua recusando origem ou ano divergente',()=>{
 const a=ambienteProtecao();a.ativar();const e=a.ctx.garantirAnoGestor_(a.db,2026),sh=a.planilhas.get(e.id).sheets['Leia-me'],ler=sh.getRange;let leituras=0;
 sh.getRange=function(...args){leituras++;assert.deepEqual(args,[2,2,2,1]);return ler.apply(this,args);};
 assert.equal(a.ctx.dadosAnoGestor_(e).ano,2026);assert.equal(leituras,1);
 sh.rows[1][1]='outra-origem';assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);
 sh.rows[1][1]='fixture';sh.rows[2][1]=2025;assert.throws(()=>a.ctx.dadosAnoGestor_(e),/não pertence/);
});

test('formatação monetária em lote usa as mesmas três colunas, com fallback e propagação de erro',()=>{
 const a=ambienteProtecao(),chamadas=[];
 const sh={getRangeList(r){chamadas.push(Array.from(r));return {setNumberFormat(f){chamadas.push(f);}};}};
 a.ctx.formatarMoedasPlanoGestor_(sh,1);assert.equal(chamadas.length,0);
 a.ctx.formatarMoedasPlanoGestor_(sh,4);assert.deepEqual(chamadas[0],['E2:E4','H2:H4','R2:R4']);
 const antigas=[];a.ctx.formatarMoedasPlanoGestor_({getRange(...r){antigas.push(r);return {setNumberFormat(f){assert.equal(f,chamadas[1]);}};}},4);
 assert.deepEqual(antigas,[[2,5,3,1],[2,8,3,1],[2,18,3,1]]);
 assert.throws(()=>a.ctx.formatarMoedasPlanoGestor_({getRangeList(){throw Error('falha Sheets');}},4),/falha Sheets/);
});

test('resumo divergente dispensa leitura de fórmulas; resumo igual só é preservado sem fórmulas',()=>{
 const a=ambienteProtecao(),esperado=[['controle'],['hash'],['Atualizado em','2026-11-04T00:00:00.000Z'],['dados']],sh=a.db.insertSheet('Resumo teste');
 a.ctx.gravarResumoConferidoGestor_(sh,esperado);
 const ler=sh.getDataRange;let consultas=0;
 sh.getDataRange=function(){const r=ler.call(this),f=r.getFormulas;r.getFormulas=function(){consultas++;return f.call(this);};return r;};
 const novo=esperado.map(r=>r.slice());novo[3][0]='novo';
 assert.equal(a.ctx.gravarResumoConferidoGestor_(sh,novo),true);assert.equal(consultas,0);
 assert.equal(a.ctx.gravarResumoConferidoGestor_(sh,novo),false);assert.equal(consultas,1);
});
