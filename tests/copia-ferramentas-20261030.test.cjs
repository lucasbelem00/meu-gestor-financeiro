const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function tela(){const copias=[],avisos=[],c=vm.createContext({document:{addEventListener(){}},calcExprStr:'',notasGlobais:[],copiarTextoAreaTransferencia:(...v)=>copias.push(v),mostrarAviso:(...v)=>avisos.push(v)});vm.runInContext(fs.readFileSync('interface/usabilidade.js','utf8'),c);return {c,copias,avisos};}
test('cópia do resultado aceita zero e negativo, usa decimal brasileiro e não troca a expressão',()=>{
 const {c,copias}=tela();for(const [expr,esperado]of [['0','0'],['2-5','-3'],['1000+0.25','1000,25']]){vm.runInContext('calcExprStr='+JSON.stringify(expr),c);c.copiarResultadoCalculadoraGestor();assert.equal(copias.at(-1)[0],esperado);assert.equal(vm.runInContext('calcExprStr',c),expr);}
});
test('conta inválida não copia resultado antigo ou não finito',()=>{
 const {c,copias,avisos}=tela();for(const expr of ['','1/0','1+']){vm.runInContext('calcExprStr='+JSON.stringify(expr),c);c.copiarResultadoCalculadoraGestor();}assert.equal(copias.length,0);assert.equal(avisos.length,3);
});
test('cópia da nota preserva linhas e lê o conteúdo atual; nota removida não é copiada',()=>{
 const {c,copias,avisos}=tela();c.notasGlobais=[{id:'nota-1',texto:'Almoço: R$ 25,50\nDevolver para Ana na sexta.'}];c.copiarNotaGestor('nota-1');assert.equal(copias[0][0],c.notasGlobais[0].texto);c.notasGlobais[0].texto='Texto revisado';c.copiarNotaGestor('nota-1');assert.equal(copias[1][0],'Texto revisado');c.notasGlobais=[];c.copiarNotaGestor('nota-1');assert.equal(copias.length,2);assert.equal(avisos.length,1);
});
