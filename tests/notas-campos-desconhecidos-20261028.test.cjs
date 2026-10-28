const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteProtecao,fixture,personal}=require('./fixtures/protecao-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
for(const coluna of [4,5])test('campo desconhecido de Notas '+coluna+' preserva financeiro disponível e bloqueia sobrescrita de notas',()=>{
 const d=fixture([personal('Despesa válida',35)]);d['Anotações']=[['ID','Texto','Concluída','Data','',''],['nota-original','Conteúdo preservado',false,'28/10/2026',1,false]];d['Anotações'][0][coluna]='Campo particular';d['Anotações'][1][coluna]='Valor particular';const a=ambienteProtecao(d),antes=JSON.stringify(a.db.sheets['Anotações'].rows);
 const dados=api(a,'getDadosCompletos');assert.equal(dados.kpis.comprometimentoMes,'R$ 35,00');assert.match(dados.erroNotas,/não reconhecido|conferência/i);assert.equal(dados.anotacoes,undefined);assert.equal(JSON.stringify(a.db.sheets['Anotações'].rows),antes);
 assert.throws(()=>api(a,'salvarNotasWeb',{operacoes:[{opId:'nova-op-sobre-esquema-invalido',tipo:'upsert',id:'nota-nova',nota:{texto:'Não deve sobrescrever',done:false}}],requestId:'notes-invalid-schema-'+coluna}),/não reconhecido|conferência|estrutura/i);assert.equal(JSON.stringify(a.db.sheets['Anotações'].rows),antes);
});
