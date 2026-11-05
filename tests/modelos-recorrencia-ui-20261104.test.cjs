const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function tela(editores=false){
 const campos=new Map(),salvos=new Map(),confirmacoes=[],avisos=[];let n=0;
 function el(tag='div'){
  const attrs=new Map(),e={tag,children:[],value:'',className:'',listeners:{},append(...v){for(const c of v){c.parentElement=this;this.children.push(c);}},replaceChildren(){this.children=[];},insertBefore(c,antes){const anterior=this.children.indexOf(c);if(anterior>=0)this.children.splice(anterior,1);c.parentElement=this;const i=this.children.indexOf(antes);if(i<0)this.children.push(c);else this.children.splice(i,0,c);},addEventListener(k,f){(this.listeners[k]??=[]).push(f);},setAttribute(k,v){attrs.set(k,String(v));},getAttribute:k=>attrs.get(k)??null,scrollIntoView(){},closest(t){return this.tag===t?this:this.parentElement?.closest(t);},querySelector(seletor){const todos=[];function visitar(n){for(const f of n.children){todos.push(f);visitar(f);}}visitar(this);return todos.find(n=>seletor==='form'?n.tag==='form':seletor==='button[type="submit"]'?n.tag==='button'&&n.type==='submit':seletor.startsWith('.')?n.className.split(' ').includes(seletor.slice(1)):n.getAttribute(seletor.slice(1,-1))!==null)||null;}};
  e.classList={contains:k=>e.className.split(' ').includes(k),add:k=>{if(!e.classList.contains(k))e.className+=' '+k;},remove:k=>{e.className=e.className.split(' ').filter(x=>x!==k).join(' ');},toggle(k,v){const tem=v===undefined?!e.classList.contains(k):v;tem?this.add(k):this.remove(k);}};
  Object.defineProperty(e,'id',{get(){return this._id;},set(v){this._id=v;campos.set(v,this);}});return e;
 }
 const ids=['modelosRecorrenciaGestor','editorModeloRecorrenciaGestor','estadoModelosRecorrenciaGestor','listaModelosRecorrenciaGestor'];ids.forEach(id=>{const e=el();e.id=id;});
 const ctx=vm.createContext({console,Date,Promise,Option:function(t,v){this.textContent=t;this.value=v;},document:{addEventListener(){},createElement:el,getElementById:id=>campos.get(id),querySelectorAll:()=>Array.from(campos.values()).filter(e=>e.id?.startsWith('modelo-rec-'))},localStorage:{getItem:k=>salvos.get(k)||null,removeItem:k=>salvos.delete(k)},gravarArmazenamentoGestor:(k,v)=>salvos.set(k,v),lerJSONLocalGestor:(k,d)=>salvos.has(k)?JSON.parse(salvos.get(k)):d,novoRequestIdGestor:()=> 'modelo-ui-'+(++n),hojeCivilGestor:()=>new Date(2026,9,16),formatBRL:n=>'R$ '+n,formasGlobais:[{nome:'Cartao'}],categoriasGlobaisEdit:[{nome:'Teste'}],tipoFormaPagamentoGestor:()=> 'cartao',getCategoriaExibicao:s=>s,mascaraMoedaTeclado:e=>{e.value='R$ '+e.value;},centavosPlanejamentoGestor:s=>Number(String(s).replace('R$ ',''))*100,mostrarAviso:(...v)=>avisos.push(v),mostrarConfirmacao:(...v)=>confirmacoes.push(v),carregarDados:async()=>{},setAba(){}});ctx.window=ctx;if(editores){for(const [id,nome]of [['modalEdicaoLanc','abrirModalEdicaoLanc'],['modalEdicaoEmp','abrirModalEdicaoEmp']]){const modal=el(),form=el('form'),rodape=el(),salvar=el('button');modal.id=id;salvar.type='submit';rodape.append(salvar);form.append(rodape);modal.append(form);ctx[nome]=()=>{};}}vm.runInContext(fs.readFileSync('shared/competencias.js','utf8'),ctx);vm.runInContext(fs.readFileSync('interface/recorrencias.js','utf8'),ctx);return {ctx,campos,salvos,confirmacoes,avisos};
}
const modelo={id:'modelo-ui-001',versao:1,origem:'terceiros',modo:'revisao',ativo:true,descricao:'Internet',pessoa:'Ana',forma:'Cartao',categoria:'',valorCentavos:10000,dia:10,defasagem:1,proximoMes:'10/2026'};
test('recorrência expansível fica antes do rodapé dos dois editores e reabre recolhida sem duplicar',()=>{
 const a=tela(true);a.ctx.detalhesReferenciaGestor=()=>({registroId:'origem-001',versao:1});
 for(const [id,nome,args]of [['modalEdicaoLanc','abrirModalEdicaoLanc',['ref','01/10/2026','Conta','Cartao','Teste',10,'10/2026','Pago','','1/1']],['modalEdicaoEmp','abrirModalEdicaoEmp',['ref','01/10/2026','Ana','Conta','Cartao',10,'10/2026','A Receber','1/1','']]]){
  a.ctx[nome](...args);const form=a.campos.get(id).querySelector('form'),area=form.children[0],titulo=area.children[0],painel=area.children[1];
  assert.equal(form.children.length,2);assert.equal(form.children[1].children[0].type,'submit');assert.equal(titulo.getAttribute('aria-expanded'),'false');
  titulo.onclick();assert.equal(titulo.getAttribute('aria-expanded'),'true');assert.equal(painel.classList.contains('hidden'),false);
  a.ctx[nome](...args);assert.equal(form.children.length,2);assert.equal(painel.classList.contains('hidden'),true);assert.equal(area.hidden,false);
  args[id==='modalEdicaoLanc'?9:8]='1/3';a.ctx[nome](...args);assert.equal(area.hidden,true);
 }
});
test('revisão abre confirmação antes de qualquer envio e mudanças posteriores invalidam a confirmação',()=>{
 const a=tela();let envios=0;a.ctx.apiCall=async()=>{envios++;};a.ctx.abrirEditorRecorrenciaGestor(modelo);a.ctx.revisarMesRecorrenciaGestor(modelo,'120',false);assert.equal(envios,0);assert.match(a.confirmacoes[0][1],/Ana/);a.campos.get('modelo-rec-valor').value='130';a.confirmacoes[0][2]();assert.equal(envios,0);assert.equal(a.avisos.length,1);
});
test('editor guarda e restaura rascunho, incluindo digitação incompleta; restauração da base bloqueia salvamento',()=>{
 const a=tela();a.ctx.abrirEditorRecorrenciaGestor(modelo);a.campos.get('modelo-rec-valor').value='1,';a.ctx.guardarModeloRecorrenciaRascunhoGestor();vm.runInContext('editorRecorrenciaGestor=null',a.ctx);a.ctx.restaurarEditorModeloRecorrenciaGestor();assert.equal(a.campos.get('modelo-rec-valor').value,'1,');a.salvos.set('gestorEpocaRestauracaoV1','nova');a.ctx.salvarEditorRecorrenciaGestor();assert.match(a.avisos.at(-1)[1],/restaurada/);
});
test('consulta descarta resposta anterior a restauração e não substitui lista atual',async()=>{
 const a=tela();let responder;a.ctx.apiCall=()=>new Promise(r=>responder=r);const p=a.ctx.carregarModelosRecorrenciaGestor();a.salvos.set('gestorEpocaRestauracaoV1','nova');responder({itens:[modelo],assinaturas:[]});await p;assert.equal(vm.runInContext('modelosRecorrenciaGestor.length',a.ctx),0);assert.match(a.campos.get('estadoModelosRecorrenciaGestor').textContent,/restaurada/);
});
test('cards de terceiros usam identidade âmbar, sem HTML vindo dos nomes',async()=>{
 const a=tela();a.ctx.apiCall=async()=>({itens:[{...modelo,pessoa:'<script>teste</script>'}],assinaturas:[]});await a.ctx.carregarModelosRecorrenciaGestor();const card=a.campos.get('listaModelosRecorrenciaGestor').children[0];assert.match(card.children[0].className,/amber/);assert.match(card.children[0].textContent,/<script>/);assert(card.children.every(e=>e.innerHTML===undefined));assert.equal(card.children.at(-1).children[0].textContent,'✅ Revisar e registrar mês');
});

test('cadastro válido abre revisão e salva sem depender de função exclusiva do backend',async()=>{
 const a=tela(),envios=[];assert.equal(a.ctx.parseMesFat,undefined);
 a.ctx.apiCall=async(acao,p)=>{envios.push([acao,p]);return acao==='obterRecorrenciasWeb'?{itens:[],assinaturas:[]}:{sucesso:true};};
 a.ctx.abrirEditorRecorrenciaGestor({...modelo,id:null,versao:null});a.ctx.salvarEditorRecorrenciaGestor();
 assert.equal(a.avisos.length,0);assert.equal(a.confirmacoes.length,1);assert.equal(envios.length,0);
 a.confirmacoes[0][2]();await new Promise(r=>setImmediate(r));
 assert.equal(envios[0][0],'salvarRecorrenciaWeb');assert.equal(envios[0][1].proximoMes,'10/2026');assert.equal(envios[0][1].valor,100);
});

test('leitor real compartilhado rejeita competência impossível e texto incompleto',()=>{
 const a=tela();for(const t of ['13/2026','00/2026','11/26','11/2026resto','11/2201'])assert.equal(a.ctx.interpretarCompetenciaGestor(t).m,0);
 assert.equal(a.ctx.interpretarCompetenciaGestor('11/2026').m,11);
 a.ctx.abrirEditorRecorrenciaGestor(modelo);a.campos.get('modelo-rec-proximoMes').value='13/2026';a.ctx.salvarEditorRecorrenciaGestor();
 assert.equal(a.confirmacoes.length,0);assert.match(a.avisos.at(-1)[1],/datas/);
});

function cadastroTela(a,emp){
 const criar=(id,value='',type='text')=>{const e=a.ctx.document.createElement('input');e.id=id;e.value=value;e.type=type;return e;};
 const s=emp?'Emp':'Novo';for(const id of ['boxRecorrencia'+s+'Gestor','previaRecorrencia'+s+'Gestor'])criar(id);
 criar('modoRecorrencia'+s+'Gestor','revisao');criar(emp?'inpEmpData':'inpData','16/10/2026');criar(emp?'inpEmpMesFat':'inpMesFat','11/2026');
 const check=criar(emp?'checkRecorrenciaEmpGestor':'checkAssinatura','','checkbox');check.checked=true;
 criar(emp?'inpEmpParc':'inpParc','3');criar(emp?'inpEmpParcIni':'inpParcIni','2');criar(emp?'chkPixRecebimento':'chkPixParcelado','','checkbox').checked=true;return check;
}
test('cadastros mostram prévia da próxima data, forçam 1x e recolhem sem apagar a escolha de modo',()=>{
 for(const emp of [false,true]){const a=tela(),check=cadastroTela(a,emp),s=emp?'Emp':'Novo';a.ctx.atualizarCadastroRecorrenteGestor(emp);
 assert.match(a.campos.get('previaRecorrencia'+s+'Gestor').textContent,/16\/11\/2026.*revisar valor/);assert.equal(a.campos.get(emp?'inpEmpParc':'inpParc').value,'1');assert.equal(a.campos.get(emp?'chkPixRecebimento':'chkPixParcelado').checked,false);
 a.campos.get('modoRecorrencia'+s+'Gestor').value='automatico';a.ctx.atualizarCadastroRecorrenteGestor(emp);assert.match(a.campos.get('previaRecorrencia'+s+'Gestor').textContent,/automática/);
 check.checked=false;a.ctx.atualizarCadastroRecorrenteGestor(emp);assert(a.campos.get('boxRecorrencia'+s+'Gestor').classList.contains('hidden'));
 }
});
test('atalhos de criação protegem rascunho, alterações durante confirmação e envio pendente',()=>{
 const a=tela();cadastroTela(a,false);let estado='original',limpezas=0;a.ctx.bloqueioFormularioRotinaGestor=()=>false;a.ctx.dadosFormularioRascunhoGestor=()=>({estado});a.ctx.haRascunhoFormularioGestor=()=>true;
 a.ctx.limparFormularioNovoGasto=()=>limpezas++;a.ctx.atualizarLayoutParcelas=()=>{};a.ctx.salvarRascunho=()=>{};
 a.ctx.abrirCadastroRecorrenteGestor(false);assert.equal(limpezas,0);assert.equal(a.confirmacoes.length,1);estado='alterado';a.confirmacoes[0][2]();assert.equal(limpezas,0);
 a.ctx.abrirCadastroRecorrenteGestor(false);a.confirmacoes[1][2]();assert.equal(limpezas,1);assert.equal(a.campos.get('checkAssinatura').checked,true);
 a.ctx.bloqueioFormularioRotinaGestor=()=>true;a.ctx.abrirCadastroRecorrenteGestor(false);assert.equal(limpezas,1);
});

test('Histórico e Empréstimos criam recorrência no próprio editor com modo e prévia, sem navegar',async()=>{
 for(const terceiros of [false,true]){const a=tela(true),id=terceiros?'modalEdicaoEmp':'modalEdicaoLanc',nome=terceiros?'abrirModalEdicaoEmp':'abrirModalEdicaoLanc';let chamadas=[],navegacoes=0;
 a.ctx.detalhesReferenciaGestor=()=>({registroId:'origem-001',versao:1});a.ctx.lerValorMoeda=Number;a.ctx.setAba=()=>navegacoes++;a.ctx.apiCall=async(acao,p)=>{chamadas.push({acao,p});return {sucesso:true};};
 a.ctx[nome](...(terceiros?['ref','01/10/2026','Ana','Conta','Cartao',10,'10/2026','A Receber','1/1','']:['ref','01/10/2026','Conta','Cartao','Teste',10,'10/2026','Pago','','1/1']));
 const area=a.campos.get(id).querySelector('form').children[0],painel=area.children[1],b=painel.children.at(-1);assert.match(area._previa.textContent,/01\/11\/2026/);assert.equal(b.disabled,false);
 b.onclick();assert.equal(chamadas.length,0);await a.confirmacoes.at(-1)[2]();assert.equal(chamadas.length,1);assert.equal(chamadas[0].acao,'salvarRecorrenciaWeb');assert.equal(chamadas[0].p.origem,terceiros?'terceiros':'pessoal');assert.equal(chamadas[0].p.registroOrigem,'origem-001');assert.equal(chamadas[0].p.proximoMes,'11/2026');assert.equal(navegacoes,0);assert.equal(area.hidden,true);
 }
});
test('criação no editor recusa edição não salva e confirmação antiga após troca de modo/base',async()=>{
 const a=tela(true);a.ctx.detalhesReferenciaGestor=()=>({registroId:'origem-001',versao:1});a.ctx.lerValorMoeda=Number;let envios=0;a.ctx.apiCall=async()=>{envios++;};a.ctx.assinaturaFormularioRotinaGestor=()=> 'alterado';
 a.ctx.abrirModalEdicaoLanc('ref','01/10/2026','Conta','Cartao','Teste',10,'10/2026','Pago','','1/1');
 const modal=a.campos.get('modalEdicaoLanc'),area=modal.querySelector('form').children[0],b=area.children[1].children.at(-1);modal._assinaturaInicial='salvo';b.onclick();assert.equal(a.confirmacoes.length,0);
 modal._assinaturaInicial='alterado';b.onclick();area._modo.value='automatico';await a.confirmacoes.at(-1)[2]();assert.equal(envios,0);
 b.onclick();a.salvos.set('gestorEpocaRestauracaoV1','outra');await a.confirmacoes.at(-1)[2]();assert.equal(envios,0);
});

test('datas combinadas ficam após aplicar valor e antes das três ações expansíveis',()=>{
 const a=tela(true),form=a.campos.get('modalEdicaoEmp').querySelector('form'),el=a.ctx.document.createElement;const valor=el('div'),parcial=el('div'),mover=el('div'),rec=el('div'),footer=el('div'),botao=el('button');parcial.append(botao);
 const ldata=el('label'),data=el('input');data.id='inpEdEmpCombinada';ldata.append(data);const lescopo=el('label'),escopo=el('select');escopo.id='escopoDataCombinadaEmpGestor';lescopo.append(escopo);const ajuda=el('p');ajuda.id='ajudaEscopoDataEmpGestor';
 form.replaceChildren();form.append(valor,parcial,mover,ldata,lescopo,ajuda,rec,footer);const query=form.querySelector;form.querySelector=function(s){return s==='[onclick="togglePainelDividirEmp()"]'?botao:query.call(this,s);};
 a.ctx.organizarCamposDataEditorEmpGestor();assert.deepEqual(form.children,[valor,ldata,lescopo,ajuda,parcial,mover,rec,footer]);a.ctx.organizarCamposDataEditorEmpGestor();assert.equal(form.children.length,8);
});

test('lista unificada separa desativadas e preserva identidade âmbar e violeta no mesmo grid',async()=>{
 const a=tela(),inativas=a.ctx.document.createElement('div');inativas.id='lista-assinaturas-inativas';a.ctx.apiCall=async()=>({assinaturas:[],itens:[modelo,{...modelo,id:'pessoal-001',origem:'pessoal',pessoa:''},{...modelo,id:'inativa-001',ativo:false}]});await a.ctx.carregarModelosRecorrenciaGestor();
 const cards=a.campos.get('listaModelosRecorrenciaGestor').children;assert.equal(cards.length,2);assert.match(cards[0].children[0].className,/amber/);assert.match(cards[1].children[0].className,/violet/);assert.equal(inativas.children.length,1);assert.equal(inativas.children[0].children.at(-1).children[0].textContent,'▶️ Retomar');
});
test('Atualizar bloqueia cliques concorrentes, atualiza os dois tipos e preserva lista se consulta falhar',async()=>{
 const a=tela(),btn=a.ctx.document.createElement('button');btn.id='btnAtualizarRecorrenciasGestor';let responder,chamadas=0;a.ctx.apiCall=()=>{chamadas++;return new Promise(r=>responder=r);};const p=a.ctx.carregarModelosRecorrenciaGestor();a.ctx.carregarModelosRecorrenciaGestor();assert.equal(chamadas,1);assert.equal(btn.textContent,'Atualizando…');responder({itens:[modelo],assinaturas:[]});await p;assert.equal(btn.textContent,'↻ Atualizar');assert.equal(a.campos.get('listaModelosRecorrenciaGestor').children.length,1);
 a.ctx.apiCall=async()=>{throw Error('Falha de consulta');};await a.ctx.carregarModelosRecorrenciaGestor();assert.equal(a.campos.get('listaModelosRecorrenciaGestor').children.length,1);assert.match(a.campos.get('estadoModelosRecorrenciaGestor').textContent,/Falha/);
});
