const {test}=require('node:test'),assert=require('node:assert/strict');
const {ambiente}=require('./fixtures/pacote-rotina-ui.cjs');

function tela(){
 const a=ambiente(),rolagens=[],focos=[];a.el('boxNovaCat').focus=op=>focos.push(op);a.el('boxNovaCat').scrollIntoView=op=>rolagens.push(op);a.c.matchMedia=()=>({matches:true});a.c.renderizarListaCategorias();return {...a,rolagens,focos};
}
test('editar categoria ao fim da lista leva ao formulário e identifica o alvo sem abrir teclado',()=>{
 const a=tela();a.c.editarCategoriaUi(2);assert.equal(a.el('inpNovaCat').value,'Transporte');assert.equal(a.rolagens.length,1);assert.equal(a.rolagens[0].block,'start');assert.equal(a.rolagens[0].behavior,'instant');assert.equal(a.focos[0].preventScroll,true);assert.equal(a.el('estadoEditorCategoriaGestor').hidden,false);assert(a.el('estadoEditorCategoriaGestor').textContent.includes('Transporte'));assert.equal(a.confirmacoes.length,0);
});
test('aviso de edição fica abaixo do cabeçalho fixo, mesmo quando ele muda de altura',()=>{
 const a=tela();let destino;a.el('estadoEditorCategoriaGestor').style={};a.el('estadoEditorCategoriaGestor').scrollIntoView=op=>destino=op;a.c.document.querySelector=()=>({getBoundingClientRect:()=>({height:99.2})});a.c.editarCategoriaUi(2);assert.equal(a.el('estadoEditorCategoriaGestor').style.scrollMarginTop,'116px');assert.equal(destino.block,'start');assert.equal(a.rolagens.length,0);assert.equal(a.focos.length,1);
});
test('trocar categoria preserva preenchimento até confirmar; edição intacta não pergunta',()=>{
 const a=tela();a.c.editarCategoriaUi(0);a.c.editarCategoriaUi(1);assert.equal(a.confirmacoes.length,0);a.el('inpNovaMeta').value='90';a.c.editarCategoriaUi(2);assert.equal(a.el('inpNovaCat').value,'Lazer');assert.equal(a.el('inpNovaMeta').value,'90');assert.equal(a.confirmacoes.length,1);a.confirmacoes[0].fn();assert.equal(a.el('inpNovaCat').value,'Transporte');assert.equal(a.el('inpNovaMeta').value,'0');
});
test('categoria nova não adicionada é protegida, inclusive quando só há meta',()=>{
 for(const campo of ['inpNovaCat','inpNovaMeta']){const a=tela();a.el(campo).value=campo==='inpNovaCat'?'Nova categoria':'150';a.c.editarCategoriaUi(0);assert.equal(a.confirmacoes.length,1);assert.equal(a.rolagens.length,0);assert.equal(a.el(campo).value,campo==='inpNovaCat'?'Nova categoria':'150');}
});
test('confirmação antiga não substitui preenchimento novo nem alvo removido',()=>{
 for(const alterarLista of [false,true]){const a=tela();a.el('inpNovaCat').value='Ainda escrevendo';a.c.editarCategoriaUi(1);if(alterarLista)a.c.categoriasGlobaisEdit.splice(1,1);else a.el('inpNovaCat').value='Texto mais recente';a.confirmacoes[0].fn();assert.equal(a.el('inpNovaCat').value,alterarLista?'Ainda escrevendo':'Texto mais recente');assert.equal(a.rolagens.length,0);assert.equal(a.avisos.at(-1)[0],'Os dados mudaram');}
});
test('atualizar e remover categoria encerram o estado visual sem deixar meta de outra categoria',()=>{
 const a=tela();a.c.editarCategoriaUi(1);a.el('inpNovaMeta').value='120';a.c.adicionarCategoriaUi();assert.equal(a.el('estadoEditorCategoriaGestor').hidden,true);a.c.editarCategoriaUi(1);a.c.removerCategoriaUi(1);assert.equal(a.el('inpNovaCat').value,'');assert.equal(a.el('inpNovaMeta').value,'');assert.equal(a.el('estadoEditorCategoriaGestor').hidden,true);
});
test('envio em andamento bloqueia abrir outro editor e Outros mantém nome protegido',()=>{
 const a=tela();a.c.categoriasEmEnvioGestor=true;a.c.editarCategoriaUi(0);assert.equal(a.rolagens.length,0);a.c.categoriasEmEnvioGestor=false;a.c.editarCategoriaUi(3);assert.equal(a.el('inpNovaCat').disabled,true);assert(a.el('estadoEditorCategoriaGestor').textContent.includes('Outros'));
});
