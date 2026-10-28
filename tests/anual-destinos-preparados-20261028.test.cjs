const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal,loan,clone}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function iniciar(lanc=[],emp=[]){const a=ambienteProtecao(fixture(lanc,emp));a.ativar();a.ctx.ativarOrganizacaoAnualWeb();return a;}
function preparar(a,id){const backup=api(a,'exportarBackupDadosWeb',{restauravel:true}),p=api(a,'previaRestauracaoBackupWeb',{backup});return {backup,versaoAtual:p.versaoAtual,hashBackup:p.hashBackup,confirmacao:'RESTAURAR',requestId:id};}
function intruso(a){const r=personal('Não estava no backup',99);while(r.length<18)r.push('');r[11]='intruso-registro-preparado-001';r[12]='intruso-compra-preparada-001';r[13]=1;r[14]='Em Aberto';r[15]='';r[17]=0;r[16]=a.ctx.hashRegistroGestor_(r);return r;}

for(const preenchido of [false,true])test('restauração anual confere destino aberto '+(preenchido?'com':'sem')+' mudanças antes de trocar a origem',()=>{
  const a=iniciar(preenchido?[personal('Original',25)]:[]),p=preparar(a,'restaurar-destino-preparado-'+preenchido),catalogo=clone(a.db.sheets['_Gestor_Anos'].rows),originais=JSON.stringify(a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos')),finalizar=a.ctx.finalizarPlanoGestor_;let alvo,external;
  a.ctx.finalizarPlanoGestor_=function(ctx){const ret=finalizar(ctx);if(ctx.action==='restaurarBackupDadosWeb'){const e=ctx.anosRestaurados.find(e=>e.ano===2026);alvo=e.id;external=ret.filter(m=>m.destinoAnual);a.planilhas.get(alvo).sheets['Lançamentos'].rows.push(intruso(a));}return ret;};
  assert.throws(()=>api(a,'restaurarBackupDadosWeb',p),/diverg|prepar|confer|incompat|alterado/i);
  assert(alvo);assert.equal(external.length>0,preenchido);assert.deepEqual(a.db.sheets['_Gestor_Anos'].rows,catalogo);
  assert.equal(JSON.stringify(a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos')),originais);
});

test('restauração anual retoma plano entre abas em estados antes/depois sem repetir registros',()=>{
  const a=iniciar([personal('Original',25)],[loan('Ana','A Receber',40,'Cartao')]),p=preparar(a,'restaurar-destino-multiplas-abas-001'),ids=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos').slice(1).concat(a.ctx.matrizFinanceiraAnualGestor_(a.db,'Empréstimos').slice(1)).map(r=>r[11]).sort(),finalizar=a.ctx.finalizarPlanoGestor_;let injetou=false,alvo;
  a.ctx.finalizarPlanoGestor_=function(ctx){const ret=finalizar(ctx);if(ctx.action==='restaurarBackupDadosWeb'&&!injetou){injetou=true;alvo=ctx.anosRestaurados.find(e=>e.ano===2026).id;a.planilhas.get(alvo).failure={name:'Empréstimos',stage:'before',row:2};}return ret;};
  assert.throws(()=>api(a,'restaurarBackupDadosWeb',p),/FALHA SIMULADA/);assert(alvo);
  api(a,'restaurarBackupDadosWeb',p);api(a,'restaurarBackupDadosWeb',p);
  const lanc=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Lançamentos').slice(1),emp=a.ctx.matrizFinanceiraAnualGestor_(a.db,'Empréstimos').slice(1);
  assert.equal(lanc.length,1);assert.equal(emp.length,1);assert.equal(lanc[0][7],25);assert.equal(emp[0][7],40);assert.equal(emp[0][9],'A Receber');
  assert.deepEqual(Array.from(lanc.concat(emp).map(r=>r[11]).sort()),Array.from(ids));
});
