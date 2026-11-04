// Classificação visual e preferências por lançamento; não altera pagamentos.
// Meta de categoria é teto de gasto: atingir e ultrapassar são estados distintos.
function estadoMetaCategoriaGestor(total,meta){
  const centavos=v=>Math.round((Number(v)+Math.sign(Number(v))*Number.EPSILON)*100),gasto=centavos(total),limite=centavos(meta);
  if(!Number.isSafeInteger(gasto)||gasto<0||!Number.isSafeInteger(limite)||limite<=0)return null;
  const percentual=gasto/limite*100,estado=gasto>limite?'excedida':gasto===limite?'atingida':percentual>=80?'alerta':'normal';
  const cores=estado==='excedida'?['bg-rose-500','text-rose-400']:estado==='normal'?['bg-emerald-500','text-emerald-400']:['bg-amber-400','text-amber-400'];
  return {estado,restante:(limite-gasto)/100,percentual,percentualExibido:Math.round(percentual),largura:Math.max(0,Math.min(100,percentual)),corBg:cores[0],corTexto:cores[1],rotulo:{normal:'Dentro da meta',alerta:'Próximo do limite',atingida:'No limite da categoria',excedida:'Meta excedida'}[estado]};
}
function rotuloPerfilGastoGestor(valor){return {fixo:'Fixo',variavel:'Variável',essencial:'Essencial',ajustavel:'Ajustável',naoClassificado:'Não classificado'}[valor]||'Não definido';}
function lerPerfilCategoriaEditorGestor(){return {tipoGasto:document.getElementById('inpCatTipoGasto')?.value||'',prioridadeGasto:document.getElementById('inpCatPrioridadeGasto')?.value||''};}
function definirPerfilCategoriaEditorGestor(c){for(const [id,v]of [['inpCatTipoGasto',c.tipoGasto],['inpCatPrioridadeGasto',c.prioridadeGasto]]){const e=document.getElementById(id);if(e)e.value=v||'';}}
function htmlPerfilCategoriaGestor(c){return '<div class="flex flex-wrap gap-1.5 text-xs text-slate-300"><span class="bg-slate-900 rounded-md px-2 py-1">'+escaparHTML(rotuloPerfilGastoGestor(c.tipoGasto))+'</span><span class="bg-slate-900 rounded-md px-2 py-1">'+escaparHTML(c.prioridadeGasto?rotuloPerfilGastoGestor(c.prioridadeGasto):'Prioridade não definida')+'</span></div>';}
function lerPerfilLancamentoGestor(modo){
  const tipo=document.getElementById('perfil-'+modo+'-tipo'),prioridade=document.getElementById('perfil-'+modo+'-prioridade');if(!tipo||!prioridade||tipo.dataset?.perfilGastoCampo!=='tipo'||prioridade.dataset?.perfilGastoCampo!=='prioridade')return undefined;
  if(modo==='edicao'&&tipo.dataset.perfilGastoDisponivel==='false'&&![tipo,prioridade].some(e=>e.dataset.escolhaManual==='true'))return undefined;
  const p={};if(tipo.value!=='padrao')p.tipo=tipo.value;if(prioridade.value!=='padrao')p.prioridade=prioridade.value;
  return Object.keys(p).length?p:undefined;
}
function preencherPerfilLancamentoGestor(modo,p){
  const valido=p&&['','fixo','variavel'].includes(p.tipo)&&['','essencial','ajustavel'].includes(p.prioridade);
  for(const campo of ['tipo','prioridade']){const e=document.getElementById('perfil-'+modo+'-'+campo);if(e){e.value=valido?p[campo]:'';e.dataset.perfilGastoDisponivel=valido?'true':'false';delete e.dataset.escolhaManual;}}
}
function criarCamposPerfilLancamentoGestor(modo){
  const d=document.createElement('details');d.id='perfil-'+modo;d.className='rounded-xl border border-slate-700 p-3 space-y-3';
  const titulo=document.createElement('summary');titulo.textContent='Classificação do gasto';titulo.className='text-sm text-slate-200 cursor-pointer';d.append(titulo);
  const grade=document.createElement('div');grade.className='grid grid-cols-1 sm:grid-cols-2 gap-3';
  for(const [campo,nome,opcoes]of [['tipo','Tipo de gasto',[['fixo','Fixo'],['variavel','Variável']]],['prioridade','Prioridade',[['essencial','Essencial'],['ajustavel','Ajustável']]]]){
    const label=document.createElement('label');label.className='text-xs text-slate-300 min-w-0';label.textContent=nome;const select=document.createElement('select');select.id='perfil-'+modo+'-'+campo;select.dataset.perfilGastoCampo=campo;select.className='block w-full min-w-0 rounded-xl bg-slate-900 border border-slate-600 p-3 text-white mt-1';
    if(modo==='novo')select.add(new Option('Padrão da categoria','padrao'));select.add(new Option('Não classificado',''));opcoes.forEach(o=>select.add(new Option(o[1],o[0])));select.onchange=()=>{select.dataset.escolhaManual='true';if(modo==='novo'&&typeof salvarRascunho==='function')salvarRascunho();};label.append(select);grade.append(label);
  }
  d.append(grade);const ajuda=document.createElement('p');ajuda.className='text-xs text-slate-300';ajuda.textContent=modo==='novo'?'O padrão da categoria será salvo junto do novo gasto. Você pode escolher uma classificação diferente.':'Altera somente este lançamento. As outras parcelas e os padrões da categoria serão preservados.';d.append(ajuda);return d;
}
function abrirPerfilHistoricoGestor(campo,valor,mes){
  setAba('lancamentos');filtrosAtuais={termo:'',mes,ano:mes.split('/')[1],forma:'',categoria:'',status:'',tag:'',tipoRapido:'',perfilCampo:campo,perfilValor:valor};
  for(const [id,v]of [['inpBusca',''],['filtMes',mes],['filtAno',mes.split('/')[1]],['filtForma',''],['filtCat',''],['filtTag',''],['filtStatus','']]){const e=document.getElementById(id);if(e){if(e.tagName==='SELECT'&&v&&!Array.from(e.options).some(o=>o.value===v))e.add(new Option(v,v));e.value=v;}}
  offsetAtual=0;chamarFiltroBackend(false);
}
function atualizarContextoPerfilHistoricoGestor(){
  let box=document.getElementById('contextoPerfilHistoricoGestor');if(!filtrosAtuais.perfilCampo){if(box)box.hidden=true;return;}
  if(!box){box=document.createElement('div');box.id='contextoPerfilHistoricoGestor';box.className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/40 bg-sky-900/20 text-sm text-sky-100 p-3';document.getElementById('lista-lancamentos').before(box);}
  box.hidden=false;box.replaceChildren();const texto=document.createElement('span');texto.textContent=(filtrosAtuais.perfilCampo==='pendentes'?'Gastos sem classificação completa':(filtrosAtuais.perfilCampo==='tipo'?'Tipo: ':'Prioridade: ')+rotuloPerfilGastoGestor(filtrosAtuais.perfilValor))+' · '+filtrosAtuais.mes;const limpar=document.createElement('button');limpar.type='button';limpar.className='px-2 py-1 text-rose-300';limpar.textContent='✕ Limpar classificação';limpar.onclick=()=>{delete filtrosAtuais.perfilCampo;delete filtrosAtuais.perfilValor;offsetAtual=0;chamarFiltroBackend(false);};box.append(texto,limpar);
}
function renderizarPerfilGastosPainelGestor(dados){
  const perfil=dados?.perfilGastos;let box=document.getElementById('perfilGastosPainelGestor');if(!perfil){if(box)box.hidden=true;return;}
  if(!box){box=document.createElement('section');box.id='perfilGastosPainelGestor';box.className='card-glass p-4 space-y-4';}
  const limite=document.getElementById('limitePessoalPainelGestor');if(!limite)return;limite.after(box);box.hidden=false;box.replaceChildren();
  const criar=(tag,texto,classe)=>{const e=document.createElement(tag);if(texto!==null)e.textContent=texto;if(classe)e.className=classe;return e;};
  box.append(criar('h3','Perfil dos gastos','font-bold text-white'),criar('p',perfil.mes+' · Pessoais registrados, pagos e em aberto. Não inclui terceiros nem previsões.','text-xs text-slate-300'));
  if(!perfil.total){box.append(criar('p','Nenhum gasto pessoal registrado neste mês.','text-sm text-slate-300'));return;}
  box.append(criar('p','Toque nas opções com valor para filtrar no Histórico.','text-xs text-sky-300'));
  const cores=['bg-sky-500','bg-violet-500','bg-slate-500'];
  const grade=criar('div',null,'grid grid-cols-1 sm:grid-cols-2 gap-5');
  for(const [campo,titulo,chaves]of [['tipo','Comportamento do valor',['fixo','variavel','naoClassificado']],['prioridade','Prioridade dos gastos',['essencial','ajustavel','naoClassificado']]]){
    const grupo=criar('section',null,'min-w-0 space-y-3');grupo.append(criar('h4',titulo,'text-sm font-bold text-white min-h-[2.5rem] flex items-end'));
    const barra=criar('div',null,'h-2.5 flex overflow-hidden rounded-full bg-slate-900');barra.setAttribute('role','img');barra.setAttribute('aria-label',chaves.map(k=>rotuloPerfilGastoGestor(k)+': '+formatBRL(perfil[campo][k]/100)).join('; '));
    let temTrecho=false;
    chaves.forEach((k,i)=>{const trecho=criar('span',null,cores[i]);trecho.style.width=perfil[campo][k]*100/perfil.total+'%';if(perfil[campo][k]>0){if(temTrecho)trecho.style.boxShadow='inset 2px 0 0 #0f172a';temTrecho=true;}barra.append(trecho);});grupo.append(barra);
    chaves.forEach((k,i)=>{const b=criar('button',null,'block w-full rounded-lg bg-slate-900/50 hover:bg-slate-700 text-left p-2 space-y-1');b.type='button';b.disabled=perfil[campo][k]<=0;if(b.disabled){b.className=b.className.replace('hover:bg-slate-700','')+' opacity-50 cursor-default';b.title='Nenhum gasto nesta classificação no período';}const nome=criar('span',null,'flex items-center gap-2 text-xs text-slate-300'),marcador=criar('span',null,'inline-block h-2.5 w-2.5 shrink-0 rounded-full '+cores[i]);marcador.setAttribute('aria-hidden','true');nome.append(marcador,criar('span',rotuloPerfilGastoGestor(k)));b.append(nome,criar('strong',formatBRL(perfil[campo][k]/100)+' · '+(perfil[campo][k]*100/perfil.total).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%','block text-sm text-white font-bold break-words'));b.onclick=()=>{if(!b.disabled)abrirPerfilHistoricoGestor(campo,k,perfil.mes);};grupo.append(b);});grade.append(grupo);
  }
  box.append(grade);
}
document.addEventListener('DOMContentLoaded',()=>{
  for(const [modo,id]of [['novo','selCat'],['edicao','selEdCat']]){const select=document.getElementById(id);if(select&&!document.getElementById('perfil-'+modo))select.parentElement.parentElement.after(criarCamposPerfilLancamentoGestor(modo));}
});
