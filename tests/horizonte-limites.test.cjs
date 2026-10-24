const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fonte=fs.readFileSync(path.join(__dirname,'../interface/usabilidade.js'),'utf8');
function ambiente(total=6,largura=390){
  const elementos=new Map();
  const el=id=>{if(!elementos.has(id))elementos.set(id,{innerHTML:'',textContent:'',disabled:false});return elementos.get(id);};
  const c=vm.createContext({window:{innerWidth:largura},document:{addEventListener(){},querySelectorAll:()=>[],getElementById:el},
    evolucaoMeses:Array.from({length:total},(_,i)=>String(i+1).padStart(2,'0')+'/2026'),evolucaoIdx:0,evolucaoPivot:{},evolucaoChaveResumoGestor:'__TOTAL_CARTEIRA__',compararHorizonteCompleto:false,
    formatBRL:n=>'R$ '+n.toFixed(2),escaparHTML:String,acaoHTML:()=>'',tipoFormaPagamentoGestor:()=> 'cartao',formaEhCartaoGestor:()=>true,formaEhPixGestor:()=>false});
  vm.runInContext(fonte,c);
  return {c,el};
}
test('Horizonte sem meses ou com uma janela só mantém ambas as setas desativadas',()=>{
  for(const largura of [390,1024])for(const total of [0,1,2]){
    const {c,el}=ambiente(total,largura);c.renderTabelaEvolucao();
    assert.equal(el('btnEvolPrev').disabled,true);assert.equal(el('btnEvolNext').disabled,true);
    assert.equal(c.evolucaoIdx,0);
  }
});
test('Horizonte atravessa meses sem ultrapassar os limites, inclusive em cliques repetidos',()=>{
  const {c,el}=ambiente();c.renderTabelaEvolucao();assert.equal(el('btnEvolPrev').disabled,true);
  c.mudarMesEvolucao('1');assert.equal(c.evolucaoIdx,1);assert.equal(el('btnEvolPrev').disabled,false);
  for(let i=0;i<10;i++)c.mudarMesEvolucao(1);
  assert.equal(c.evolucaoIdx,4);assert.equal(el('btnEvolNext').disabled,true);assert.match(el('btnEvolNext').title,/Não há meses/);
  for(let i=0;i<10;i++)c.mudarMesEvolucao(-1);
  assert.equal(c.evolucaoIdx,0);assert.equal(el('btnEvolPrev').disabled,true);
});
test('Ao ampliar a janela no último mês, Horizonte volta o início para exibir quatro meses',()=>{
  for(const comparar of [false,true]){
    const {c,el}=ambiente();c.evolucaoIdx=4;c.renderTabelaEvolucao();
    if(comparar)c.compararHorizonteCompleto=true;else c.window.innerWidth=1024;
    c.renderTabelaEvolucao();assert.equal(c.evolucaoIdx,2);
    assert.equal(el('btnEvolNext').disabled,true);
    assert.equal((el('faturas-header').innerHTML.match(/Abrir mês/g)||[]).length,4);
  }
});
test('Atualização com menos meses corrige uma posição antiga fora da lista',()=>{
  const {c,el}=ambiente();c.evolucaoIdx=4;c.evolucaoMeses=c.evolucaoMeses.slice(0,2);c.renderTabelaEvolucao();
  assert.equal(c.evolucaoIdx,0);assert.equal(el('btnEvolPrev').disabled,true);assert.equal(el('btnEvolNext').disabled,true);
});
test('Horizonte ignora direção inválida e normaliza um índice corrompido sem criar meses',()=>{
  const {c}=ambiente();const meses=c.evolucaoMeses.slice();
  for(const indice of [NaN,Infinity,-8,99,1.7]){c.evolucaoIdx=indice;c.renderTabelaEvolucao();assert(Number.isInteger(c.evolucaoIdx));assert(c.evolucaoIdx>=0&&c.evolucaoIdx<=4);}
  c.evolucaoIdx=1;for(const step of ['',0,2,'inválido',NaN])c.mudarMesEvolucao(step);
  assert.equal(c.evolucaoIdx,1);assert.deepEqual(c.evolucaoMeses,meses);
});
