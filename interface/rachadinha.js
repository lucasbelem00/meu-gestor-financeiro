let rachaDetAjustes=Object.create(null),rachaEu='Eu',rachaItemEmEdicao=null,rachaEnvioGuardado=null,rachaRestaurando=false,rachaAvisouArmazenamento=false,rachaRegistroId=null;
const CAMPOS_RASCUNHO_RACHA=['rachaLocal','rachaValorTotal','rachaValorBebida','rachaQtdPessoas','rachaQtdBebeu','rachaTaxa10','rachaServicoPercentual','rachaDesconto','rachaAcrescimo','inpNovoNomeRacha','inpItemDescRacha','inpItemValRacha'];
function guardarRascunhoRachaGestor(obrigatorio=false) {
  if(rachaRestaurando){if(obrigatorio)throw Error('Confira o rascunho guardado antes de registrar esta divisão.');return false;}
  try{
    if(!rachaRegistroId&&rachaDetItens.length)rachaRegistroId='racha-'+String(rachaDetItens[0].id);
    const campos=Object.fromEntries(CAMPOS_RASCUNHO_RACHA.map(id=>{const e=document.getElementById(id);return [id,e?.type==='checkbox'?e.checked:e?.value || ''];}));
    gravarArmazenamentoGestor('gestorRachadinhaRascunhoV1',JSON.stringify({versao:1,registroId:rachaRegistroId,nomesEmEdicao:Array.from(document.querySelectorAll('[data-racha-nome]')).map(e=>e.value),modo:modoRachadinhaAtual,pessoas:rachaDetPessoas,itens:rachaDetItens,ajustes:rachaDetAjustes,eu:rachaEu,editando:rachaItemEmEdicao,consumidoresEdicao:Array.from(document.querySelectorAll('.chk-pessoa-item-racha:checked')).map(e=>rachaDetPessoas[Number(e.value)]),envio:rachaEnvioGuardado,campos}));return true;
  }catch(e){if(obrigatorio)throw e;if(!rachaAvisouArmazenamento){rachaAvisouArmazenamento=true;mostrarAviso('Rascunho não guardado','Mantenha esta página aberta e libere espaço no aparelho antes de registrar a divisão.');}return false;}
}
function opcoesContaRachaGestor() {
  return {servicoPercentual:document.getElementById('rachaTaxa10')?.checked?Number(document.getElementById('rachaServicoPercentual')?.value || 10):0,descontoCentavos:Math.round(lerValorMoeda('rachaDesconto')*100),acrescimoCentavos:Math.round(lerValorMoeda('rachaAcrescimo')*100)};
}
function dadosContaDetalhadaRachaGestor() {
  return {...opcoesContaRachaGestor(),pessoas:rachaDetPessoas.map(nome=>({id:nome,nome,peso:Number(rachaDetAjustes[nome]?.peso ?? 1),pagoCentavos:Number(rachaDetAjustes[nome]?.pagoCentavos || 0)})),itens:rachaDetItens.map(it=>({id:String(it.id),descricao:it.desc,valorCentavos:it.valorCentavos ?? Math.round(it.valor*100),consumidores:it.consumidores.slice()}))};
}
function estadoRachaGestor(erro) { const el=document.getElementById('estadoCalculoRacha');if(el){el.textContent=erro?.message || '';el.classList.toggle('hidden',!erro);} }
function alternarModoRachadinha(modo) {
  modoRachadinhaAtual=modo==='detalhado'?'detalhado':'rapido';
  for(const [id,m] of [['boxRachaModoRapido','rapido'],['boxRachaModoDetalhado','detalhado']])document.getElementById(id)?.classList.toggle('hidden',modoRachadinhaAtual!==m);
  for(const [id,m] of [['btnModoRachaRapido','rapido'],['btnModoRachaDetalhado','detalhado']]){const b=document.getElementById(id);if(b){b.setAttribute('aria-pressed',String(modoRachadinhaAtual===m));b.className='px-3 py-2 rounded-lg text-xs font-bold '+(modoRachadinhaAtual===m?'bg-emerald-700 text-white':'text-slate-300');}}
  const consumidores=Array.from(document.querySelectorAll('.chk-pessoa-item-racha:checked')).map(e=>rachaDetPessoas[Number(e.value)]);
  renderizarPessoasRachaDet();if(rachaItemEmEdicao)document.querySelectorAll('.chk-pessoa-item-racha').forEach(e=>e.checked=consumidores.includes(rachaDetPessoas[Number(e.value)]));
  if(modoRachadinhaAtual==='rapido')calcularRachadinha();else calcularRachadinhaDetalhada();guardarRascunhoRachaGestor();
}
function setPessoasRachaRapido(n){document.getElementById('rachaQtdPessoas').value=n;calcularRachadinha();}
function ajustarPessoasRacha(delta){setPessoasRachaRapido(Math.max(1,Math.min(100,Number(document.getElementById('rachaQtdPessoas').value || 2)+delta)));}
function ajustarBebeuRacha(delta){document.getElementById('rachaQtdBebeu').value=Math.max(1,Math.min(Number(document.getElementById('rachaQtdPessoas').value || 2),Number(document.getElementById('rachaQtdBebeu').value || 1)+delta));calcularRachadinha();}
function resumoGruposCentavos(partes){const grupos=new Map();partes.forEach(v=>grupos.set(v,(grupos.get(v)||0)+1));return Array.from(grupos).map(([valor,qtd])=>qtd+' pessoa(s): '+formatBRL(valor/100)+' cada').join(' • ');}
function contaRapidaRachaGestor(){
  const qtd=Number(document.getElementById('rachaQtdPessoas').value),bebeu=Number(document.getElementById('rachaQtdBebeu').value);
  if(!Number.isInteger(qtd)||qtd<1||qtd>100||!Number.isInteger(bebeu)||bebeu<1||bebeu>qtd)throw Error('Confira a quantidade de pessoas e de quem bebeu (até 100 pessoas).');
  const pessoas=Array.from({length:qtd},(_,i)=>({id:'pessoa-'+i,nome:'Pessoa '+(i+1),peso:1,pagoCentavos:0})),itens=[];
  const geral=Math.round(lerValorMoeda('rachaValorTotal')*100),bebida=Math.round(lerValorMoeda('rachaValorBebida')*100);
  if(geral>0)itens.push({id:'geral',descricao:'Comida / geral',valorCentavos:geral,consumidores:pessoas.map(p=>p.id)});
  if(bebida>0)itens.push({id:'bebida',descricao:'Bebida / extras',valorCentavos:bebida,consumidores:pessoas.slice(qtd-bebeu).map(p=>p.id)});
  return {...opcoesContaRachaGestor(),pessoas,itens};
}
function calcularRachadinha(){
  guardarRascunhoRachaGestor();
  try{
    const conta=contaRapidaRachaGestor();if(!conta.itens.length){document.getElementById('rachaTotalFinal').textContent=formatBRL(0);document.getElementById('rachaValorPorPessoa').textContent=formatBRL(0);document.getElementById('rachaResumoCentavos').textContent='Informe os valores para dividir.';document.getElementById('boxResultadoComBebida').classList.add('hidden');document.getElementById('btnLancarParteBebeu').classList.add('hidden');document.getElementById('btnLancarMinhaParteNormal').classList.remove('hidden');estadoRachaGestor(null);return null;}
    const d=calcularDivisaoContaGestor(conta),bebida=conta.itens.some(i=>i.id==='bebida'),qtdBebeu=Number(document.getElementById('rachaQtdBebeu').value),sem=conta.pessoas.length-qtdBebeu;
    document.getElementById('rachaTotalFinal').textContent=formatBRL(d.totalCentavos/100);
    document.getElementById('rachaValorPorPessoa').textContent=bebida&&sem===0?'Todos com bebida':formatBRL(d.pessoas[0].finalCentavos/100);
    document.getElementById('boxResultadoComBebida').classList.toggle('hidden',!bebida);
    document.getElementById('btnLancarParteBebeu').classList.toggle('hidden',!bebida);
    document.getElementById('btnLancarMinhaParteNormal').classList.toggle('hidden',bebida&&sem===0);
    document.getElementById('rachaValorComBebida').textContent=formatBRL(d.pessoas[sem].finalCentavos/100);
    document.getElementById('lblRachaSemBebida').textContent=bebida?'Sua parte sem bebida':'Sua parte';
    document.getElementById('rachaResumoCentavos').textContent=(bebida?(sem?'Sem bebida: '+resumoGruposCentavos(d.pessoas.slice(0,sem).map(p=>p.finalCentavos))+'. ':'')+'Com bebida: '+resumoGruposCentavos(d.pessoas.slice(sem).map(p=>p.finalCentavos)):resumoGruposCentavos(d.pessoas.map(p=>p.finalCentavos)))+'. Centavos distribuídos na ordem exibida; o atalho usa a primeira cota do grupo.';
    estadoRachaGestor(null);return {conta,divisao:d,sem,bebida};
  }catch(e){estadoRachaGestor(e);return null;}
}
function mensagemDivisaoRachaGestor(d){
  const nomes=new Map(d.pessoas.map(p=>[p.id,p.nome]));
  const linhas=['*Divisão da conta — '+(document.getElementById('rachaLocal').value.trim() || 'Encontro')+'*',''];
  d.pessoas.forEach(p=>linhas.push(p.nome+': *'+formatBRL(p.finalCentavos/100)+'*'+(p.pagoCentavos?' • Já pagou ao estabelecimento: '+formatBRL(p.pagoCentavos/100):'')));
  linhas.push('','Consumo: '+formatBRL(d.baseCentavos/100),'Desconto: '+formatBRL(d.descontoCentavos/100),'Serviço: '+formatBRL(d.taxaCentavos/100),'Acréscimos: '+formatBRL(d.acrescimoCentavos/100),'*Total: '+formatBRL(d.totalCentavos/100)+'*');
  if(d.transferencias.length){linhas.push('','*Acertos entre pessoas:*');d.transferencias.forEach(t=>linhas.push(nomes.get(t.de)+' → '+nomes.get(t.para)+': '+formatBRL(t.valorCentavos/100)));}
  if(d.pendenteEstabelecimentoCentavos)linhas.push('Ainda falta pagar ao estabelecimento: '+formatBRL(d.pendenteEstabelecimentoCentavos/100));return linhas.join('\n');
}
function copiarRachadinhaWhats(){const r=calcularRachadinha();if(r)abrirPreviaCobrancaWhats(mensagemDivisaoRachaGestor(r.divisao),'Divisão copiada.');}
function preencherParteRachaGestor(nome,centavos){
  if(!centavos)return;limparFormularioNovoGasto();document.getElementById('inpDesc').value=formatarTituloInteligente(document.getElementById('rachaLocal').value.trim() || 'Conta ('+nome+')');definirValorMoeda('inpValor',centavos/100);document.getElementById('inpTags').value='#dividido';checarAutopreenchimento();sincronizarChipsTags('novo');salvarRascunho();setAba('novo');mostrarAviso('Parte preenchida','Confira os campos e salve o lançamento.');
}
function lancarMinhaParteRachadinha(tipo='normal'){const r=calcularRachadinha();if(r)preencherParteRachaGestor('Minha parte',r.divisao.pessoas[tipo==='bebeu'&&r.bebida?r.sem:0].finalCentavos);}
function lancarParteIndividualDet(nome,valor){preencherParteRachaGestor(nome,valor);}
function renderizarPessoasRachaDet(){
  const lista=document.getElementById('listaPessoasRachaDet'),checks=document.getElementById('boxCheckPessoasItemRacha');if(!lista||!checks)return;
  if(!rachaDetPessoas.includes(rachaEu))rachaEu=rachaDetPessoas[0];
  lista.innerHTML=rachaDetPessoas.map((nome,i)=>{const a=rachaDetAjustes[nome] || {};return '<div class="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-700"><div class="space-y-2"><label class="text-xs text-white flex gap-2 items-center"><input type="radio" name="rachaMinhaPessoa" data-racha-eu="'+i+'" '+(nome===rachaEu?'checked':'')+'><span>'+escaparHTML(nome)+(nome===rachaEu?' (você)':'')+'</span></label><input type="text" data-racha-nome="'+i+'" aria-label="Nome da pessoa '+(i+1)+'" maxlength="80" value="'+escaparHTML(nome)+'" class="w-full text-xs bg-slate-900 border border-slate-600 p-2 rounded-lg text-white"></div><label class="text-xs text-slate-300">Cota<input aria-label="Cota de '+escaparHTML(nome)+'" data-racha-peso="'+i+'" type="number" min="0.01" max="100" step="0.01" value="'+Number(a.peso ?? 1)+'" class="w-full rounded-lg bg-slate-900 border border-slate-600 p-2 text-white mt-1"></label><label class="text-xs text-slate-300">Pago ao estabelecimento<input data-racha-pago="'+i+'" inputmode="numeric" value="'+escaparHTML(a.pagoCentavos?formatBRL(a.pagoCentavos/100):'')+'" placeholder="R$ 0,00" class="w-full rounded-lg bg-slate-900 border border-slate-600 p-2 text-white mt-1"></label><button type="button" '+acaoHTML('removerPessoaRachaDet',[i])+' class="text-xs text-rose-200 px-3 py-2 rounded-lg border border-slate-600 self-end">Remover pessoa</button></div>';}).join('');
  checks.innerHTML=rachaDetPessoas.map((nome,i)=>'<label class="p-2 rounded-lg border border-slate-600 bg-slate-900 text-xs text-slate-200 flex items-center gap-2"><input type="checkbox" class="chk-pessoa-item-racha" value="'+i+'" checked>'+escaparHTML(nome)+'</label>').join('');
}
function adicionarPessoaRachaDet(){const campo=document.getElementById('inpNovoNomeRacha'),nome=formatarTituloInteligente(campo.value.trim());if(!nome)return;if(rachaDetPessoas.length>=100||rachaDetPessoas.some(p=>normalizarTexto(p)===normalizarTexto(nome))){mostrarAviso('Confira a pessoa','Use nomes distintos e até 100 pessoas.');return;}rachaDetPessoas.push(nome);campo.value='';renderizarPessoasRachaDet();calcularRachadinhaDetalhada();}
function renomearPessoaRachaGestor(indice,texto){
  const antigo=rachaDetPessoas[indice],nome=formatarTituloInteligente(String(texto).trim()),campo=document.querySelector('[data-racha-nome="'+indice+'"]');
  if(!nome||nome.length>80||rachaDetPessoas.some((p,i)=>i!==indice&&normalizarTexto(p)===normalizarTexto(nome))){if(campo)campo.value=antigo;mostrarAviso('Confira o nome','Use nomes distintos, com até 80 caracteres.');return;}
  if(campo)campo.value=nome;if(antigo===nome)return;
  rachaDetPessoas[indice]=nome;rachaDetItens.forEach(it=>it.consumidores=it.consumidores.map(p=>p===antigo?nome:p));
  rachaDetAjustes[nome]=rachaDetAjustes[antigo] || {};delete rachaDetAjustes[antigo];if(rachaEu===antigo)rachaEu=nome;
  const radio=document.querySelector('[data-racha-eu="'+indice+'"]'),span=radio?.parentElement.querySelector('span');if(span)span.textContent=nome+(nome===rachaEu?' (você)':'');
  const peso=document.querySelector('[data-racha-peso="'+indice+'"]');peso?.setAttribute('aria-label','Cota de '+nome);
  const check=Array.from(document.querySelectorAll('.chk-pessoa-item-racha')).find(e=>Number(e.value)===indice);if(check?.parentElement.lastChild?.nodeType===3)check.parentElement.lastChild.textContent=nome;
  calcularRachadinhaDetalhada();
}
function removerPessoaRachaDet(i){
  if(rachaDetPessoas.length<2){mostrarAviso('Mantenha uma pessoa','Adicione outra pessoa antes de remover esta.');return;}
  const nome=rachaDetPessoas[i],exclusivos=rachaDetItens.filter(it=>it.consumidores.length===1&&it.consumidores[0]===nome);
  if(exclusivos.length){mostrarAviso('Redistribua os itens primeiro',nome+' é a única pessoa em: '+exclusivos.map(it=>it.desc).join(', ')+'. Edite os consumidores desses itens antes de remover a pessoa. O total foi preservado.');return;}
  mostrarConfirmacao('Remover pessoa?',nome+' será retirada da divisão. Os itens compartilhados serão redistribuídos entre os consumidores restantes; os pagamentos informados para ela sairão do cálculo.',()=>{rachaDetPessoas.splice(i,1);rachaDetItens.forEach(it=>{it.consumidores=it.consumidores.filter(n=>n!==nome);});delete rachaDetAjustes[nome];renderizarPessoasRachaDet();calcularRachadinhaDetalhada();},false,'Remover e recalcular','neutral');
}
function marcarTodosNoItemRacha(){document.querySelectorAll('.chk-pessoa-item-racha').forEach(e=>e.checked=true);}
function adicionarItemRachaDet(){
  const valor=Math.round(lerValorMoeda('inpItemValRacha')*100),consumidores=Array.from(document.querySelectorAll('.chk-pessoa-item-racha:checked')).map(e=>rachaDetPessoas[Number(e.value)]).filter(Boolean),desc=formatarTituloInteligente(document.getElementById('inpItemDescRacha').value.trim() || 'Item');
  if(!valor||!consumidores.length){mostrarAviso('Confira o item','Informe o valor e pelo menos uma pessoa.');return;}
  if(!rachaItemEmEdicao&&rachaDetItens.length>=500){mostrarAviso('Limite da divisão','Use até 500 itens por conta.');return;}
  const item={id:rachaItemEmEdicao || novoRequestIdGestor(),desc,valor:valor/100,valorCentavos:valor,consumidores};
  if(rachaItemEmEdicao){const i=rachaDetItens.findIndex(it=>it.id===rachaItemEmEdicao);if(i<0)return;rachaDetItens[i]=item;}else rachaDetItens.push(item);
  cancelarEdicaoItemRachaGestor();calcularRachadinhaDetalhada();
}
function editarItemRachaGestor(id){const it=rachaDetItens.find(x=>String(x.id)===String(id));if(!it)return;rachaItemEmEdicao=it.id;document.getElementById('inpItemDescRacha').value=it.desc;definirValorMoeda('inpItemValRacha',it.valorCentavos/100);document.querySelectorAll('.chk-pessoa-item-racha').forEach(e=>e.checked=it.consumidores.includes(rachaDetPessoas[Number(e.value)]));document.getElementById('btnIncluirItemRacha').textContent='Salvar item';document.getElementById('btnCancelarItemRacha').classList.remove('hidden');document.getElementById('inpItemDescRacha').focus();guardarRascunhoRachaGestor();}
function cancelarEdicaoItemRachaGestor(){rachaItemEmEdicao=null;document.getElementById('inpItemDescRacha').value='';document.getElementById('inpItemValRacha').value='';document.getElementById('btnIncluirItemRacha').textContent='+ Incluir item';document.getElementById('btnCancelarItemRacha').classList.add('hidden');guardarRascunhoRachaGestor();}
function removerItemRachaDet(id){const it=rachaDetItens.find(x=>String(x.id)===String(id));if(!it)return;mostrarConfirmacao('Remover item?',it.desc+' sairá da conta e o total será recalculado.',()=>{rachaDetItens=rachaDetItens.filter(x=>x.id!==it.id);if(rachaItemEmEdicao===it.id)cancelarEdicaoItemRachaGestor();calcularRachadinhaDetalhada();},false,'Remover item','neutral');}
function limparRachadinhaDetalhada(){rachaDetItens=[];calcularRachadinhaDetalhada();}
function calcularRachadinhaDetalhada(){
  guardarRascunhoRachaGestor();const itens=document.getElementById('listaItensRachaDet'),resumo=document.getElementById('listaResumoIndividualRachaDet');
  if(itens)itens.innerHTML=rachaDetItens.map(it=>'<article class="p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2"><div class="text-xs text-white break-words">'+escaparHTML(it.desc)+' • '+formatBRL((it.valorCentavos ?? Math.round(it.valor*100))/100)+'</div><p class="text-xs text-slate-300 break-words">'+escaparHTML(it.consumidores.join(', '))+'</p><div class="flex gap-2"><button type="button" '+acaoHTML('editarItemRachaGestor',[it.id])+' class="text-xs text-sky-200 border border-slate-600 p-2 rounded-lg">Editar item</button><button type="button" '+acaoHTML('removerItemRachaDet',[it.id])+' class="text-xs text-rose-200 border border-slate-600 p-2 rounded-lg">Remover item</button></div></article>').join('');
  if(!rachaDetItens.length){if(resumo)resumo.textContent='Adicione os itens para conferir as partes e os acertos.';estadoRachaGestor(null);return null;}
  try{const d=calcularDivisaoContaGestor(dadosContaDetalhadaRachaGestor());
    if(resumo)resumo.innerHTML=d.pessoas.map(p=>'<div class="p-3 rounded-xl border border-slate-700 bg-slate-950 flex flex-wrap justify-between gap-2"><div><strong class="text-white">'+escaparHTML(p.nome)+'</strong><p class="text-slate-300 text-xs mt-1">Consumo '+formatBRL(p.baseCentavos/100)+' • Parte final '+formatBRL(p.finalCentavos/100)+'</p><p class="text-xs mt-1 '+(p.saldoCentavos<0?'text-amber-200':'text-slate-200')+'">'+(p.saldoCentavos<0?'A receber '+formatBRL(-p.saldoCentavos/100):'Saldo da sua parte '+formatBRL(p.saldoCentavos/100))+'</p></div><button type="button" '+acaoHTML('lancarParteIndividualDet',[p.nome,p.finalCentavos])+' class="text-xs text-sky-200 border border-slate-600 p-2 rounded-lg">Preencher parte</button></div>').join('')+'<p class="font-bold text-white py-2">Total da conta: '+formatBRL(d.totalCentavos/100)+'</p><p class="text-slate-300 text-xs">'+(d.pendenteEstabelecimentoCentavos?'Ainda falta pagar ao estabelecimento: '+formatBRL(d.pendenteEstabelecimentoCentavos/100):'Conta paga ao estabelecimento. Confira os acertos entre as pessoas abaixo.')+'</p>'+d.transferencias.map(t=>'<p class="text-xs text-amber-200 py-1">'+escaparHTML(t.de)+' → '+escaparHTML(t.para)+': '+formatBRL(t.valorCentavos/100)+'</p>').join('');
    estadoRachaGestor(null);return d;
  }catch(e){estadoRachaGestor(e);if(resumo)resumo.textContent='Confira os campos destacados pela mensagem antes de copiar ou registrar.';return null;}
}
function copiarRachadinhaDetalhadaWhats(){const d=calcularRachadinhaDetalhada();if(d)abrirPreviaCobrancaWhats(mensagemDivisaoRachaGestor(d),'Divisão detalhada copiada.');}
function prepararDetalhamentoRachaGestor(){
  if(rachaEnvioGuardado){mostrarAviso('Esta divisão já tem um envio','Confira Atividade. Para preparar uma nova conta, use Limpar depois de confirmar o envio anterior.');return;}
  const r=calcularRachadinha();if(!r)return;
  if(rachaDetItens.length){mostrarConfirmacao('Substituir divisão detalhada?','A divisão rápida substituirá os itens da divisão detalhada atual.',()=>converterRapidaRachaGestor(r),false,'Usar divisão rápida','neutral');return;}converterRapidaRachaGestor(r);
}
function converterRapidaRachaGestor(r){
  const nomes=r.conta.pessoas.map((p,i)=>i===0?'Eu':'Pessoa '+(i+1)),mapa=new Map(r.conta.pessoas.map((p,i)=>[p.id,nomes[i]]));
  rachaDetPessoas=nomes;rachaDetAjustes=Object.create(null);rachaEu=nomes[0];rachaDetItens=r.conta.itens.map(it=>({id:novoRequestIdGestor(),desc:it.descricao,valor:it.valorCentavos/100,valorCentavos:it.valorCentavos,consumidores:it.consumidores.map(id=>mapa.get(id))}));alternarModoRachadinha('detalhado');mostrarAviso('Confira as pessoas','A divisão foi mantida. Identifique as pessoas antes de registrar os adiantamentos.');
}
function registrarPagamentoRestanteRachaGestor(){
  const conta=dadosContaDetalhadaRachaGestor();conta.pessoas.forEach(p=>p.pagoCentavos=0);const d=calcularDivisaoContaGestor(conta),outros=rachaDetPessoas.filter(p=>p!==rachaEu).reduce((s,p)=>s+Number(rachaDetAjustes[p]?.pagoCentavos || 0),0);
  if(outros>d.totalCentavos)throw Error('Confira os pagamentos das outras pessoas.');rachaDetAjustes[rachaEu]={...rachaDetAjustes[rachaEu],pagoCentavos:d.totalCentavos-outros};renderizarPessoasRachaDet();calcularRachadinhaDetalhada();
}
function abrirRegistroRachadinhaGestor(){
  if(rachaEnvioGuardado?.estado==='pendente'){mostrarAviso('Divisão aguardando confirmação','Consulte este envio em Atividade antes de registrar outra divisão.');abrirAtividadeGestor();return;}
  const d=calcularRachadinhaDetalhada();if(!d)return;
  try{if(d.pendenteEstabelecimentoCentavos)registrarPagamentoRestanteRachaGestor();}catch(e){mostrarAviso('Confira os pagamentos',e.message);return;}
  const atual=calcularRachadinhaDetalhada();if(!atual)return;
  const modal=document.getElementById('modalRegistroRachaGestor');modal._focoAnterior=document.activeElement;
  const forma=document.getElementById('rachaRegistroForma');forma.replaceChildren();formasGlobais.forEach(f=>{const n=typeof f==='string'?f:f.nome;if(n)forma.add(new Option(n,n));});
  const cat=document.getElementById('rachaRegistroCategoria');cat.replaceChildren();Array.from(document.getElementById('selCat').options).forEach(o=>{if(o.value)cat.add(new Option(o.textContent,o.value));});
  const hoje=new Date(),data=String(hoje.getDate()).padStart(2,'0')+'/'+String(hoje.getMonth()+1).padStart(2,'0')+'/'+hoje.getFullYear();
  document.getElementById('rachaRegistroData').value=data;document.getElementById('rachaRegistroMes').value=data.slice(3);document.getElementById('rachaRegistroParcelas').value=1;
  const recebidos=document.getElementById('rachaRegistroRecebidos');recebidos.replaceChildren();
  atual.transferencias.filter(t=>t.para===rachaEu).forEach(t=>{const label=document.createElement('label');label.className='flex items-center gap-2 text-xs text-slate-200 py-2';const check=document.createElement('input');check.type='checkbox';check.dataset.rachaRecebido=t.de;label.append(check,document.createTextNode(t.de+' já devolveu '+formatBRL(t.valorCentavos/100)+' para mim'));recebidos.append(label);});
  document.getElementById('rachaRegistroEstado').textContent='Você ('+rachaEu+') pagou '+formatBRL(atual.pessoas.find(p=>p.id===rachaEu).pagoCentavos/100)+' ao estabelecimento. Confira a forma usada e o mês da fatura.';
  modal.classList.remove('hidden');forma.focus();atualizarParcelasRegistroRachaGestor();
}
function atualizarParcelasRegistroRachaGestor(){const nome=document.getElementById('rachaRegistroForma').value,cartao=formaEhCartaoGestor(nome);document.getElementById('rachaRegistroBoxParcelas').classList.toggle('hidden',!cartao);if(!cartao)document.getElementById('rachaRegistroParcelas').value=1;const data=document.getElementById('rachaRegistroData').value,forma=buscarFormaPagamentoGestor(nome);if(/^\d{2}\/\d{2}\/\d{4}$/.test(data)&&forma){const calculo=calcularMesFaturaCartao(forma,data);if(calculo.mesFat)document.getElementById('rachaRegistroMes').value=calculo.mesFat;}}
function fecharRegistroRachaGestor(){const m=document.getElementById('modalRegistroRachaGestor');m.classList.add('hidden');m._focoAnterior?.focus();}
async function conferirRegistroRachadinhaGestor(){
  const botao=document.getElementById('btnPreviaRegistroRacha');if(botao.disabled)return;botao.disabled=true;
  try{
    if(!navigator.onLine)throw Error('Conecte-se para conferir e registrar a divisão. O rascunho continua guardado.');
    const dados={conta:dadosContaDetalhadaRachaGestor(),euId:rachaEu,formaPagto:document.getElementById('rachaRegistroForma').value,dataCompra:document.getElementById('rachaRegistroData').value,mesPrimeiraFatura:document.getElementById('rachaRegistroMes').value,numParcelas:Number(document.getElementById('rachaRegistroParcelas').value),pixParcelado:false,categoria:document.getElementById('rachaRegistroCategoria').value,incluirMinhaParte:document.getElementById('rachaRegistroMinhaParte').checked,recebidos:Array.from(document.querySelectorAll('[data-racha-recebido]:checked')).map(e=>e.dataset.rachaRecebido),descricao:document.getElementById('rachaLocal').value.trim() || 'Divisão de conta'};
    const previa=await apiCall('previaRachadinhaWeb',dados,1);
    if(rachaEnvioGuardado?.estado==='confirmado')throw Error('Esta divisão já foi registrada neste aparelho. Confira o Histórico e os Empréstimos antes de lançar novamente.');
    const texto='Sua parte: '+formatBRL(previa.minhaParteCentavos/100)+(dados.incluirMinhaParte?' (Novo Registro)':' (não será registrada)')+'\n'+previa.emprestimos.map(e=>e.pessoa+': '+formatBRL(e.valorCentavos/100)+(e.recebido?' — já recebido':' — a receber')).join('\n')+'\nTotal desta gravação: '+formatBRL(previa.totalCentavos/100)+'\n\nForma: '+dados.formaPagto+' • Fatura: '+dados.mesPrimeiraFatura+'\nPagar a fatura e receber da pessoa são controles separados.';
    mostrarConfirmacao('Registrar esta divisão?',texto,async()=>{
      if(rachaEnvioGuardado?.estado==='pendente')return;
      const payload={...previa.dados,assinatura:previa.assinatura,requestId:rachaRegistroId || ('racha-'+String(rachaDetItens[0].id))};rachaEnvioGuardado={estado:'pendente',assinatura:previa.assinatura,payload};
      try{guardarRascunhoRachaGestor(true);await apiCall('registrarRachadinhaWeb',payload,1);rachaEnvioGuardado.estado='confirmado';guardarRascunhoRachaGestor(true);fecharRegistroRachaGestor();await carregarDados();mostrarAviso('Divisão registrada','Sua parte e os adiantamentos selecionados foram gravados juntos.');}
      catch(e){if(!e.resultadoIncerto&&!localStorage.getItem('gestorMutacaoV3:'+payload.requestId))rachaEnvioGuardado=null;guardarRascunhoRachaGestor();mostrarAviso('Confira a divisão',e.message);}
    },false,'Registrar divisão','success');
  }catch(e){mostrarAviso('Prévia indisponível',e.message);}finally{botao.disabled=false;}
}
function concluirRegistroRachadinhaLocalGestor(p,cancelado=false){if(rachaEnvioGuardado?.payload?.requestId===p.requestId){rachaEnvioGuardado=cancelado?null:{...rachaEnvioGuardado,estado:'confirmado'};guardarRascunhoRachaGestor();}}
function limparRachadinhaTudo(){
  if(rachaEnvioGuardado?.estado==='pendente'){mostrarAviso('Confirme o envio primeiro','A divisão continua guardada. Abra Atividade para conferir o envio antes de limpar.');return;}
  mostrarConfirmacao('Limpar esta divisão?','Pessoas, itens e pagamentos desta ferramenta serão apagados. Os lançamentos já gravados no Histórico e em Empréstimos serão preservados.',()=>{
    rachaRestaurando=true;rachaDetPessoas=['Eu','Amigo 2'];rachaDetItens=[];rachaDetAjustes=Object.create(null);rachaEu='Eu';rachaItemEmEdicao=null;rachaEnvioGuardado=null;rachaRegistroId=null;
    CAMPOS_RASCUNHO_RACHA.forEach(id=>{const e=document.getElementById(id);if(e){if(e.type==='checkbox')e.checked=false;else e.value=id==='rachaQtdPessoas'?2:id==='rachaQtdBebeu'?1:id==='rachaServicoPercentual'?10:'';}});
    rachaRestaurando=false;renderizarPessoasRachaDet();calcularRachadinha();calcularRachadinhaDetalhada();guardarRascunhoRachaGestor();mostrarAviso('Divisão limpa','Os registros já gravados continuam preservados.');
  },false,'Limpar divisão','neutral');
}
document.addEventListener('DOMContentLoaded',()=>{
  const sub=document.getElementById('subview-rachadinha');
  const opcoes=document.createElement('details');opcoes.className='rounded-xl border border-slate-600 p-3 text-xs text-slate-200';
  opcoes.innerHTML='<summary class="cursor-pointer font-bold py-1">Mais opções — serviço, desconto e acréscimos</summary><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3"><label>Serviço (%)<input id="rachaServicoPercentual" type="number" min="0" max="100" step="0.01" value="10" class="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 mt-1 text-white"></label><label>Desconto da conta<input id="rachaDesconto" inputmode="numeric" placeholder="R$ 0,00" class="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 mt-1 text-white"></label><label>Acréscimos (entrega, couvert…)<input id="rachaAcrescimo" inputmode="numeric" placeholder="R$ 0,00" class="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 mt-1 text-white"></label></div><p class="mt-3 leading-relaxed">Ative a opção de serviço para aplicar o percentual escolhido. O desconto é rateado pelo consumo; o serviço incide sobre o consumo após desconto. Acréscimos são rateados pelo consumo, sem nova taxa de serviço.</p>';
  sub.insertBefore(opcoes,document.getElementById('boxRachaModoRapido'));
  const taxa=document.querySelector('label:has(#rachaTaxa10) span');if(taxa)taxa.textContent='Incluir serviço (%)';
  const erro=document.createElement('p');erro.id='estadoCalculoRacha';erro.setAttribute('role','status');erro.className='hidden text-sm text-amber-200 border border-amber-400/40 rounded-xl p-3';opcoes.after(erro);
  const incluir=sub.querySelector('[onclick="adicionarItemRachaDet()"]');incluir.id='btnIncluirItemRacha';
  const cancelar=document.createElement('button');cancelar.id='btnCancelarItemRacha';cancelar.type='button';cancelar.className='hidden text-xs text-slate-200 border border-slate-600 p-2 rounded-lg';cancelar.textContent='Cancelar edição do item';cancelar.addEventListener('click',cancelarEdicaoItemRachaGestor);incluir.after(cancelar);
  const identificar=document.createElement('button');identificar.type='button';identificar.className='w-full rounded-xl border border-amber-400/40 text-amber-200 px-3 py-3 text-xs font-bold';identificar.textContent='Identificar pessoas e registrar partes que adiantei';identificar.addEventListener('click',prepararDetalhamentoRachaGestor);document.getElementById('boxRachaModoRapido').append(identificar);
  const detalhe=document.getElementById('boxRachaModoDetalhado');
  const ajuda=document.createElement('p');ajuda.className='text-xs text-slate-300 leading-relaxed';ajuda.textContent='Marque quem é você. Cota 1 divide igualmente; 0,5 vale meia parte. Informe em “Pago ao estabelecimento” o que cada pessoa adiantou à loja. Devoluções entre pessoas serão conferidas na prévia do registro.';detalhe.prepend(ajuda);
  const pagar=document.createElement('button');pagar.type='button';pagar.className='rounded-xl border border-slate-500 text-slate-200 px-3 py-3 text-xs font-bold';pagar.textContent='Eu paguei o restante ao estabelecimento';pagar.addEventListener('click',()=>{try{registrarPagamentoRestanteRachaGestor();}catch(e){mostrarAviso('Confira a conta',e.message);}});
  const registrar=document.createElement('button');registrar.type='button';registrar.className='rounded-xl bg-amber-500 text-slate-950 px-3 py-3 text-xs font-bold';registrar.textContent='Eu paguei — registrar minha parte e empréstimos';registrar.addEventListener('click',abrirRegistroRachadinhaGestor);
  const acoes=document.createElement('div');acoes.className='grid grid-cols-1 sm:grid-cols-2 gap-2';acoes.append(pagar,registrar);detalhe.append(acoes);
  const modal=document.createElement('div');modal.id='modalRegistroRachaGestor';modal.className='hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','tituloRegistroRacha');
  modal.innerHTML='<div class="bg-slate-800 border border-slate-600 rounded-2xl p-5 w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-4"><div class="flex justify-between gap-3"><h2 id="tituloRegistroRacha" class="text-white font-bold">Registrar divisão e adiantamentos</h2><button type="button" id="fecharRegistroRacha" aria-label="Fechar registro da divisão" class="p-2 text-white">✕</button></div><p id="rachaRegistroEstado" class="text-sm text-slate-200"></p><form id="formRegistroRacha" class="space-y-3"><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><label class="text-xs text-slate-300">Como paguei<select id="rachaRegistroForma" class="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white"></select></label><label class="text-xs text-slate-300">Data (DD/MM/AAAA)<input id="rachaRegistroData" required inputmode="numeric" maxlength="10" class="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white"></label><label class="text-xs text-slate-300">Mês da fatura / recebimento (MM/AAAA)<input id="rachaRegistroMes" required inputmode="numeric" maxlength="7" class="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white"></label><label id="rachaRegistroBoxParcelas" class="text-xs text-slate-300">Parcelas do cartão<input id="rachaRegistroParcelas" type="number" min="1" max="600" step="1" value="1" class="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white"></label></div><label class="text-xs text-slate-200 flex items-center gap-2"><input id="rachaRegistroMinhaParte" type="checkbox" checked>Registrar também minha parte como gasto pessoal</label><label class="text-xs text-slate-300 block">Categoria da minha parte<select id="rachaRegistroCategoria" class="w-full mt-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white"></select></label><fieldset class="border border-slate-600 rounded-xl p-3"><legend class="text-xs text-slate-200 px-1">Devoluções que já recebi</legend><div id="rachaRegistroRecebidos"></div><p class="text-xs text-slate-300">Marque apenas quem já devolveu o valor para você. Isso não quita o cartão.</p></fieldset><p class="text-xs text-slate-200">A prévia separa seu gasto dos empréstimos por pessoa. Se sua parte já estiver no Histórico, desmarque a opção acima.</p><button type="submit" id="btnPreviaRegistroRacha" class="w-full rounded-xl bg-amber-500 text-slate-950 px-3 py-3 font-bold text-sm disabled:opacity-50">Conferir prévia antes de gravar</button></form></div>';
  document.body.append(modal);document.getElementById('fecharRegistroRacha').addEventListener('click',fecharRegistroRachaGestor);document.getElementById('formRegistroRacha').addEventListener('submit',e=>{e.preventDefault();conferirRegistroRachadinhaGestor();});document.getElementById('rachaRegistroForma').addEventListener('change',atualizarParcelasRegistroRachaGestor);
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fecharRegistroRachaGestor();}if(e.key==='Tab'){const f=Array.from(modal.querySelectorAll('button,input,select')).filter(el=>!el.disabled&&el.getClientRects().length);if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0]?.focus();}}});
  sub.addEventListener('input',e=>{const t=e.target;
    if(t.dataset.rachaPeso!==undefined){const nome=rachaDetPessoas[Number(t.dataset.rachaPeso)];rachaDetAjustes[nome]={...rachaDetAjustes[nome],peso:t.value};calcularRachadinhaDetalhada();}
    else if(t.dataset.rachaPago!==undefined){mascaraMoedaTeclado(t);const nome=rachaDetPessoas[Number(t.dataset.rachaPago)];rachaDetAjustes[nome]={...rachaDetAjustes[nome],pagoCentavos:Math.round(lerValorMoeda(t)*100)};calcularRachadinhaDetalhada();}
    else if(t.dataset.rachaEu!==undefined){rachaEu=rachaDetPessoas[Number(t.dataset.rachaEu)];renderizarPessoasRachaDet();calcularRachadinhaDetalhada();}
    else if(['rachaDesconto','rachaAcrescimo','rachaServicoPercentual'].includes(t.id)){if(t.id!=='rachaServicoPercentual')mascaraMoedaTeclado(t);if(modoRachadinhaAtual==='rapido')calcularRachadinha();else calcularRachadinhaDetalhada();}
    else guardarRascunhoRachaGestor();
  });
  sub.addEventListener('focusout',e=>{if(e.target.dataset.rachaNome!==undefined)renomearPessoaRachaGestor(Number(e.target.dataset.rachaNome),e.target.value);});
  document.getElementById('rachaRegistroData').addEventListener('input',e=>{let v=e.target.value.replace(/\D/g,'').slice(0,8);if(v.length>4)v=v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);else if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2);e.target.value=v;if(v.length===10)atualizarParcelasRegistroRachaGestor();});
  document.getElementById('rachaRegistroMes').addEventListener('input',e=>mascaraMesFaturaAPI(e.target));
  rachaRestaurando=true;let consumidoresRestaurados=null,nomesRestaurados=null;
  try{
    const texto=localStorage.getItem('gestorRachadinhaRascunhoV1');
    if(texto){const r=JSON.parse(texto);if(r.versao!==1||!Array.isArray(r.pessoas)||!r.pessoas.length||r.pessoas.length>100||!Array.isArray(r.itens)||r.itens.length>500)throw Error('Rascunho incompatível');
      rachaDetPessoas=r.pessoas;rachaDetItens=r.itens;rachaDetAjustes=Object.assign(Object.create(null),r.ajustes || {});rachaEu=r.eu || r.pessoas[0];rachaItemEmEdicao=r.editando || null;rachaEnvioGuardado=r.envio || null;rachaRegistroId=r.registroId || null;consumidoresRestaurados=r.consumidoresEdicao || null;nomesRestaurados=r.nomesEmEdicao || null;
      CAMPOS_RASCUNHO_RACHA.forEach(id=>{const e=document.getElementById(id);if(e&&r.campos?.[id]!==undefined){if(e.type==='checkbox')e.checked=Boolean(r.campos[id]);else e.value=r.campos[id];}});
      modoRachadinhaAtual=r.modo==='detalhado'?'detalhado':'rapido';
    }
    alternarModoRachadinha(modoRachadinhaAtual);
    if(rachaItemEmEdicao){document.getElementById('btnIncluirItemRacha').textContent='Salvar item';document.getElementById('btnCancelarItemRacha').classList.remove('hidden');const item=rachaDetItens.find(it=>it.id===rachaItemEmEdicao),rascunho={consumidoresEdicao:consumidoresRestaurados};document.querySelectorAll('.chk-pessoa-item-racha').forEach(e=>e.checked=Boolean((rascunho?.consumidoresEdicao || item?.consumidores || []).includes(rachaDetPessoas[Number(e.value)])));}
    if(nomesRestaurados)document.querySelectorAll('[data-racha-nome]').forEach(e=>{const i=Number(e.dataset.rachaNome);if(typeof nomesRestaurados[i]==='string')e.value=nomesRestaurados[i];});
    rachaRestaurando=false;guardarRascunhoRachaGestor();
  }catch(e){estadoRachaGestor(Error('O rascunho não pôde ser restaurado. Ele permanece guardado; copie os dados para revisão antes de usar Limpar.'));}
});
