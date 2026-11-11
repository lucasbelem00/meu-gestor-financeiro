const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fonte=fs.readFileSync(path.join(__dirname,'../interface/usabilidade.js'),'utf8');
function ambiente(total=6,largura=390){
  const elementos=new Map();
  const el=id=>{if(!elementos.has(id))elementos.set(id,{innerHTML:'',textContent:'',disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v}});return elementos.get(id);};
  const c=vm.createContext({window:{innerWidth:largura},document:{addEventListener(){},querySelectorAll:()=>[],getElementById:el},
    evolucaoMeses:Array.from({length:total},(_,i)=>String(i+1).padStart(2,'0')+'/2026'),evolucaoIdx:0,evolucaoPivot:{},evolucaoChaveResumoGestor:'__TOTAL_CARTEIRA__',compararHorizonteCompleto:false,
    formatBRL:n=>'R$ '+n.toFixed(2),escaparHTML:String,acaoHTML:()=>'',tipoFormaPagamentoGestor:()=> 'cartao',formaEhCartaoGestor:()=>true,formaEhPixGestor:()=>false});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../interface/situacoes.js'),'utf8'),c);vm.runInContext(fonte,c);
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

test('comparação no celular reserva espaço e fixa a primeira coluna; sair restaura a janela compacta',()=>{const {c,el}=ambiente();c.evolucaoPivot={Cartao:{'01/2026':100}};c.renderTabelaEvolucao();assert.equal(el('tabelaHorizonte').attrs.style,'');assert.equal(el('dicaRolagemHorizonteGestor').hidden,true);c.compararHorizonteCompleto=true;c.renderTabelaEvolucao();assert.match(el('tabelaHorizonte').attrs.style,/min-width: 840px/);assert.equal(el('dicaRolagemHorizonteGestor').hidden,false);assert.match(el('faturas-header').innerHTML,/sticky left-0/);assert.match(el('faturas-body').innerHTML,/sticky left-0/);c.compararHorizonteCompleto=false;c.renderTabelaEvolucao();assert.equal(el('tabelaHorizonte').attrs.style,'');assert.doesNotMatch(el('faturas-header').innerHTML,/sticky left-0/);c.window.innerWidth=1024;c.compararHorizonteCompleto=true;c.renderTabelaEvolucao();assert.equal(el('tabelaHorizonte').attrs.style,'');assert.equal(el('dicaRolagemHorizonteGestor').hidden,true);});

test('Horizonte distingue terceiros nos cartões e fora deles sem alterar composição das faturas',()=>{
 const {c,el}=ambiente(1,1024);c.formaEhCartaoGestor=f=>f==='Cartao';c.formaEhPixGestor=f=>f==='Pix';
 vm.runInContext("horizonteDetalhadoGestor={totalPessoal:{Cartao:{'01/2026':100}},pagoPessoal:{},saldoPessoal:{Cartao:{'01/2026':100}},totalBanco:{Cartao:{'01/2026':150}},pagoBanco:{},saldoBanco:{Cartao:{'01/2026':150}},totalTerceiros:{Cartao:{'01/2026':50},Pix:{'01/2026':20}},recebidoTerceiros:{},previstoPessoal:{}}",c);
 c.renderTabelaEvolucao();const h=el('faturas-body').innerHTML;
 assert(h.indexOf('Total Carteira')<h.indexOf('Nos cartões'));assert(h.indexOf('Nos cartões')<h.indexOf('Total Faturas'));assert(h.indexOf('Total Faturas')<h.indexOf('Fora dos cartões'));
 assert.match(h,/bg-purple-500\/5/);assert.match(h,/aria-hidden="true"/);assert.match(h,/Terceiros — Fora dos cartões/);assert(!h.includes('Terceiros fora dos cartões'));assert(h.includes('R$ 150.00'));
 vm.runInContext('horizonteDetalhadoGestor.totalTerceiros.Pix={}',c);c.renderTabelaEvolucao();assert(!el('faturas-body').innerHTML.includes('Fora dos cartões'));
});

test('Pix pessoal vem após Total Faturas e antes de terceiros fora dos cartões',()=>{
 const {c,el}=ambiente(1,1024);c.formaEhCartaoGestor=f=>f==='Cartao';c.formaEhPixGestor=f=>f==='Pix';
 vm.runInContext("horizonteDetalhadoGestor={totalPessoal:{Cartao:{'01/2026':100},Pix:{'01/2026':10}},pagoPessoal:{},saldoPessoal:{Cartao:{'01/2026':100},Pix:{'01/2026':10}},totalBanco:{Cartao:{'01/2026':150}},pagoBanco:{},saldoBanco:{Cartao:{'01/2026':150}},totalTerceiros:{Cartao:{'01/2026':50},Pix:{'01/2026':20}},recebidoTerceiros:{},previstoPessoal:{}}",c);
 for(const modo of ['total','saldo']){vm.runInContext('modoHorizonteGestor='+JSON.stringify(modo),c);c.renderTabelaEvolucao();const h=el('faturas-body').innerHTML;assert(h.indexOf('Total Faturas')<h.indexOf('>Pix<'));assert(h.indexOf('>Pix<')<h.indexOf('Fora dos cartões'));assert(h.includes('R$ 150.00'));}
});

test('débito aparece depois do Pix somente com valores registrados',()=>{const {c,el}=ambiente(1,1024);c.tipoFormaPagamentoGestor=f=>f==='Pix'?'pix':f.startsWith('Debito')?'avista':'cartao';c.formaEhCartaoGestor=f=>f==='Cartao';c.formaEhPixGestor=f=>f==='Pix';vm.runInContext("horizonteDetalhadoGestor={totalPessoal:{Debito:{'01/2026':25},DebitoVazio:{},Pix:{'01/2026':10},Cartao:{'01/2026':100}},pagoPessoal:{},saldoPessoal:{},totalBanco:{},pagoBanco:{},saldoBanco:{},totalTerceiros:{},recebidoTerceiros:{},previstoPessoal:{}}",c);for(const modo of ['total','saldo']){vm.runInContext('modoHorizonteGestor='+JSON.stringify(modo),c);c.renderTabelaEvolucao();const h=el('faturas-body').innerHTML;assert(h.includes('>Debito<'));assert(!h.includes('DebitoVazio'));assert(h.indexOf('>Pix<')<h.indexOf('>Debito<'));assert(h.indexOf('Total Faturas')<h.indexOf('>Pix<'));}});
