const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ambiente}=require('./fixtures/pacote-rotina-ui.cjs');
test('edição de categoria preserva os dois padrões e considera mudanças como preenchimento pendente',()=>{
 const a=ambiente();a.c.categoriasGlobaisEdit[2].tipoGasto='variavel';a.c.categoriasGlobaisEdit[2].prioridadeGasto='essencial';a.c.editarCategoriaUi(2);
 assert.equal(a.el('inpCatTipoGasto').value,'variavel');assert.equal(a.el('inpCatPrioridadeGasto').value,'essencial');assert.equal(a.c.categoriaTemPreenchimentoPendenteGestor(),false);
 a.el('inpCatPrioridadeGasto').value='ajustavel';a.c.editarCategoriaUi(1);assert.equal(a.confirmacoes.length,1);assert.equal(a.el('inpNovaCat').value,'Transporte');
});
test('atualizar categoria guarda os campos novos e limpa o editor sem reutilizar a escolha anterior',()=>{
 const a=ambiente();a.c.editarCategoriaUi(2);a.el('inpCatTipoGasto').value='variavel';a.el('inpCatPrioridadeGasto').value='essencial';a.c.adicionarCategoriaUi();
 const c=a.c.categoriasGlobaisEdit.find(c=>c.nome==='Transporte');assert.equal(c.tipoGasto,'variavel');assert.equal(c.prioridadeGasto,'essencial');assert.equal(a.el('inpCatTipoGasto').value,'');assert.equal(a.el('inpCatPrioridadeGasto').value,'');
});
function tela(){
 const mapa=new Map(),pedidos=[];function el(tag='div'){const e={tagName:tag.toUpperCase(),children:[],dataset:{},style:{},attrs:{},options:[],value:'',append(...itens){for(const x of itens){this.children.push(x);if(x&&typeof x==='object')x.parentElement=this;}},replaceChildren(...itens){this.children=[];this.append(...itens);},setAttribute(k,v){this.attrs[k]=v;},add(o){this.options.push(o);if(this.options.length===1)this.value=o.value;},after(x){const p=this.parentElement;if(x.parentElement){const i=x.parentElement.children.indexOf(x);if(i>=0)x.parentElement.children.splice(i,1);}p.children.splice(p.children.indexOf(this)+1,0,x);x.parentElement=p;}};Object.defineProperty(e,'id',{get:()=>e._id,set:v=>{e._id=v;mapa.set(v,e);}});return e;}
 const doc={createElement:el,getElementById:id=>mapa.get(id)||null,addEventListener(){}},c=vm.createContext({document:doc,Option:function(t,v){this.text=t;this.value=v;},formatBRL:n=>'R$ '+Number(n).toFixed(2),setAba:aba=>pedidos.push({aba}),chamarFiltroBackend:()=>pedidos.push({...c.filtrosAtuais}),filtrosAtuais:{},offsetAtual:0});
 c.window=c;vm.runInContext(fs.readFileSync('interface/perfil.js','utf8'),c);const pai=el(),limite=el();limite.id='limitePessoalPainelGestor';pai.append(limite);return {c,doc,el,mapa,pedidos,pai,limite};
}
test('campos do Novo usam o padrão sem forçar valores e permitem exceção por dimensão',()=>{
 const a=tela();a.c.criarCamposPerfilLancamentoGestor('novo');assert.equal(a.c.lerPerfilLancamentoGestor('novo'),undefined);
 a.mapa.get('perfil-novo-tipo').value='fixo';const p=a.c.lerPerfilLancamentoGestor('novo');assert.equal(p.tipo,'fixo');assert.equal(p.prioridade,undefined);
 a.mapa.get('perfil-novo-tipo').value='';assert.equal(a.c.lerPerfilLancamentoGestor('novo').tipo,'');
});
test('edição de lançamento preenche a classificação registrada, sem consultar o novo padrão',()=>{
 const a=tela();a.c.criarCamposPerfilLancamentoGestor('edicao');a.c.preencherPerfilLancamentoGestor('edicao',{tipo:'variavel',prioridade:'ajustavel'});assert.equal(a.c.lerPerfilLancamentoGestor('edicao').tipo,'variavel');assert.equal(a.c.lerPerfilLancamentoGestor('edicao').prioridade,'ajustavel');
});
const resumo={mes:'10/2026',total:10000,tipo:{fixo:5000,variavel:3000,naoClassificado:2000},prioridade:{essencial:6000,ajustavel:2000,naoClassificado:2000},naoClassificados:2000};
test('resumo fica após limite, não duplica ao atualizar e cada valor abre seu filtro correto',()=>{
 const a=tela();a.c.renderizarPerfilGastosPainelGestor({perfilGastos:resumo});a.c.renderizarPerfilGastosPainelGestor({perfilGastos:resumo});assert.equal(a.pai.children.length,2);const box=a.mapa.get('perfilGastosPainelGestor');assert.equal(a.pai.children[1],box);
 const grade=box.children[2],tipo=grade.children[0];for(const grupo of grade.children)grupo.children.slice(2).forEach((b,i)=>{const marcador=b.children[0].children[0];assert.equal(marcador.className.split(' ').at(-1),grupo.children[1].children[i].className);assert.equal(marcador.attrs['aria-hidden'],'true');});tipo.children[2].onclick();assert.equal(a.pedidos[0].aba,'lancamentos');assert.equal(a.pedidos[1].perfilCampo,'tipo');assert.equal(a.pedidos[1].perfilValor,'fixo');assert.equal(a.pedidos[1].mes,'10/2026');assert.equal(tipo.children[2].children.length,2,'nome e valor em linhas separadas');
 box.children[3].onclick();assert.equal(a.pedidos.at(-1).perfilCampo,'pendentes');
});
test('resumo vazio informa ausência de gastos; versão antiga não deixa indicadores obsoletos',()=>{
 const a=tela();a.c.renderizarPerfilGastosPainelGestor({perfilGastos:{...resumo,total:0}});const box=a.mapa.get('perfilGastosPainelGestor');assert.match(box.children[2].textContent,/Nenhum gasto/);a.c.renderizarPerfilGastosPainelGestor({});assert.equal(box.hidden,true);
});
