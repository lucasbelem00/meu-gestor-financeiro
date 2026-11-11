const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('paleta separa fatias vizinhas e fechamento, sem duplicar cores até 25 categorias',()=>{
 const h=fs.readFileSync('index.html','utf8'),c=vm.createContext({});vm.runInContext(h.slice(h.indexOf('function coresCategoriasGraficoGestor'),h.indexOf('function atualizarGraficoGestor(')),c);
 for(let n=2;n<=25;n++){const cores=c.coresCategoriasGraficoGestor(n);assert.equal(cores.length,n);assert.equal(new Set(cores).size,n);const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));for(let i=0;i<n;i++){const a=rgb(cores[i]),b=rgb(cores[(i+1)%n]);assert(Math.hypot(...a.map((v,j)=>v-b[j]))>80,'fatias '+n+':'+i);}}
 assert.equal(c.coresCategoriasGraficoGestor(30).length,30);assert.equal(c.coresCategoriasGraficoGestor(Infinity).length,0);
});