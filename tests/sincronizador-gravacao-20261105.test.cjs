const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const arquivo=path.resolve(__dirname,'../scripts/sincronizar-rachadinha.cjs');
function executar(corromper=false){
 const arquivos=new Map(),gravacoes=[];
 const falso={...fs,readFileSync(p,enc){const chave=path.resolve(p);if(arquivos.has(chave))return arquivos.get(chave);let valor=fs.readFileSync(p,enc);if(corromper&&chave===path.resolve(__dirname,'../index.html'))valor=valor.replace('// INICIO DICIONARIO PT GERADO','// AUSENTE');return valor;},writeFileSync(p,s){gravacoes.push(path.resolve(p));arquivos.set(path.resolve(p),s);}};
 const contexto={require:n=>n==='node:fs'?falso:require(n),__dirname:path.dirname(arquivo),module:{exports:{}},Atomics,Int32Array,SharedArrayBuffer};
 vm.runInNewContext(fs.readFileSync(arquivo,'utf8'),contexto);
 return {sincronizar:contexto.module.exports.sincronizarMotor,gravacoes,arquivos};
}
test('geração grava uma vez por destino e produz os mesmos blocos ao repetir',()=>{
 const x=executar();x.sincronizar();assert.equal(x.gravacoes.length,new Set(x.gravacoes).size);
 const primeira=new Map(x.arquivos);x.gravacoes.length=0;x.sincronizar();assert.equal(x.gravacoes.length,new Set(x.gravacoes).size);assert.deepEqual(x.arquivos,primeira);
 const html=x.arquivos.get(path.resolve(__dirname,'../index.html'));assert.ok(html.includes(x.arquivos.get(path.resolve(__dirname,'../interface/situacoes.js')).trim()));
});
test('marcador inválido impede gravar arquivos parcialmente gerados',()=>{const x=executar(true);assert.throws(()=>x.sincronizar(),/Dicionário compartilhado/);assert.equal(x.gravacoes.length,0);});
