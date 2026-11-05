const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambienteConferencia}=require('./fixtures/conferencia-ui.cjs');
function ambiente(opcoes){
 const a=ambienteConferencia(),c=a.ctx,el=id=>a.document.getElementById(id),copias=[],abas=[];let salvos=0,limpezas=0;
 c.copiarTextoAreaTransferencia=t=>{copias.push(t);};c.bloqueioFormularioRotinaGestor=()=>false;
 c.assinaturaFormularioRotinaGestor=()=>JSON.stringify([el('inpDesc').value,el('inpValor').value]);c.haRascunhoFormularioGestor=()=>Boolean(el('inpDesc').value||el('inpValor').value);
 c.limparFormularioNovoGasto=()=>{limpezas++;el('inpDesc').value='';el('inpValor').value='';};c.definirValorMoeda=(id,v)=>el(id).value=String(v);c.atualizarLayoutParcelas=()=>{};c.salvarRascunho=()=>salvos++;c.setAba=aba=>abas.push(aba);
 for(const o of opcoes){c.adicionarPrecoGestor();const card=el('precos-opcoes').children.at(-1);for(const [k,v]of Object.entries(o))card.querySelector('[data-preco="'+k+'"]').value=v;}
 c.calcularPrecosGestor();const cards=el('precos-resultado').children.filter(e=>e.tag==='article'),acoes=card=>card.children.find(e=>e.tag==='div')?.children||[];
 return {...a,el,cards,acoes,copias,abas,get salvos(){return salvos;},get limpezas(){return limpezas;}};
}
const opcoes=[{nome:'Produto A',preco:'12',quantidade:'500',pacotes:'3',unidade:'g'},{nome:'Produto B',preco:'10',quantidade:'1',pacotes:'1',unidade:'kg'}];
test('melhor opção copia preço total e preço normalizado, sem chamar API',()=>{
 const a=ambiente(opcoes);assert.equal(a.acoes(a.cards[0]).length,2);assert.equal(a.acoes(a.cards[1]).length,0);a.acoes(a.cards[0])[0].onclick();
 assert.match(a.copias[0],/Produto A/);assert.match(a.copias[0],/Preço do conjunto: R\$ 12\.00/);assert.match(a.copias[0],/Preço por kg: R\$ 8\.00/);assert.equal(a.chamadas.length,0);
});
test('Preencher Novo usa total do conjunto, preserva comparação e só preenche para revisão',()=>{
 const a=ambiente(opcoes);a.acoes(a.cards[0])[1].onclick();assert.equal(a.el('inpDesc').value,'Produto A');assert.equal(a.el('inpValor').value,'12');assert.equal(a.salvos,1);assert.deepEqual(a.abas,['novo']);assert.equal(a.chamadas.length,0);assert.equal(a.el('precos-opcoes').children.length,2);
});
test('rascunho existente exige confirmação e campos alterados depois não são apagados',()=>{
 const a=ambiente(opcoes);a.el('inpDesc').value='Meu rascunho';a.acoes(a.cards[0])[1].onclick();assert.equal(a.limpezas,0);assert.equal(a.confirmacoes.length,1);
 a.el('inpValor').value='99';a.confirmacoes[0][2]();assert.equal(a.limpezas,0);assert.equal(a.el('inpDesc').value,'Meu rascunho');assert.equal(a.el('inpValor').value,'99');
});
test('resultado antigo ou envio pendente impedem preencher/limpar; origem é reconferida na confirmação',()=>{
 const a=ambiente(opcoes),botao=a.acoes(a.cards[0])[1];a.ctx.bloqueioFormularioRotinaGestor=()=>true;botao.onclick();assert.equal(a.limpezas,0);a.ctx.bloqueioFormularioRotinaGestor=()=>false;
 a.el('inpDesc').value='Rascunho';botao.onclick();a.el('precos-opcoes').children[0].querySelector('[data-preco="preco"]').value='13';a.confirmacoes.at(-1)[2]();assert.equal(a.limpezas,0);a.acoes(a.cards[0])[0].onclick();assert.equal(a.copias.length,0);
});
test('empate permite escolher cada vencedor pelo seu próprio preço, sem arbitrariamente transferir o primeiro',()=>{
 const a=ambiente([{...opcoes[0],preco:'10',quantidade:'1',pacotes:'1',unidade:'kg'},{...opcoes[1],preco:'5',quantidade:'500',unidade:'g'}]);assert(a.cards.every(c=>a.acoes(c).length===2));
 a.acoes(a.cards[1])[0].onclick();assert.match(a.copias[0],/Empate/);a.acoes(a.cards[1])[1].onclick();assert.equal(a.el('inpDesc').value,'Produto B');assert.equal(a.el('inpValor').value,'5');
});
