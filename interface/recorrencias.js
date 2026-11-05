// Modelos novos convivem com as séries pessoais existentes, sem convertê-las.
let modelosRecorrenciaGestor=[],recorrenciasOcupadasGestor=false,editorRecorrenciaGestor=null;
const epocaModeloRecorrenciaGestor=()=>{try{return localStorage.getItem('gestorEpocaRestauracaoV1')||'';}catch(_){return '';}};
function elementoRecorrenciaGestor(tag,texto,classe=''){const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;}
function estadoRecorrenciaGestor(texto){const e=document.getElementById('estadoModelosRecorrenciaGestor');if(e)e.textContent=texto;}
function bloquearRecorrenciasGestor(){document.querySelectorAll('#modelosRecorrenciaGestor button,#modelosRecorrenciaGestor input,#modelosRecorrenciaGestor select').forEach(e=>e.disabled=recorrenciasOcupadasGestor);const b=document.getElementById('btnAtualizarRecorrenciasGestor');if(b){b.textContent=recorrenciasOcupadasGestor?'Atualizando…':'↻ Atualizar';b.setAttribute('aria-busy',String(recorrenciasOcupadasGestor));}}
async function carregarModelosRecorrenciaGestor(){
  if(recorrenciasOcupadasGestor)return;recorrenciasOcupadasGestor=true;bloquearRecorrenciasGestor();
  const epoca=epocaModeloRecorrenciaGestor();estadoRecorrenciaGestor('Consultando recorrências…');
  try{const r=await apiCall('obterRecorrenciasWeb',{},1);if(epoca!==epocaModeloRecorrenciaGestor())throw Error('A base foi restaurada. Consulte novamente.');if(!Array.isArray(r.itens)||!Array.isArray(r.assinaturas))throw Error('Atualize o Apps Script para consultar todas as recorrências juntas.');modelosRecorrenciaGestor=r.itens;seriesRecorrenciasGestor=r.assinaturas;mesSeriesRecorrenciasGestor=r.mesAtual||mesSeriesRecorrenciasGestor;renderizarModelosRecorrenciaGestor();estadoRecorrenciaGestor(r.erroAutomatico?'Registro automático a conferir: '+r.erroAutomatico:'Recorrências atualizadas.');}
  catch(e){estadoRecorrenciaGestor(e.message);}finally{recorrenciasOcupadasGestor=false;bloquearRecorrenciasGestor();restaurarEditorModeloRecorrenciaGestor();}
}
function renderizarModelosRecorrenciaGestor(){
  const lista=document.getElementById('listaModelosRecorrenciaGestor');if(!lista)return;lista.replaceChildren();
  const inativas=document.getElementById('lista-assinaturas-inativas');if(inativas)inativas.replaceChildren();
  const antigas=montarCartoesSeriesRecorrenciasGestor({assinaturas:seriesRecorrenciasGestor,faturas:{mesAtual:mesSeriesRecorrenciasGestor}});if(antigas.ativas)lista.innerHTML=antigas.ativas;if(inativas&&antigas.inativas)inativas.innerHTML=antigas.inativas;
  for(const m of modelosRecorrenciaGestor){
    const c=elementoRecorrenciaGestor('article','','card-glass p-4 space-y-3 min-w-0 flex flex-col');
    c.append(elementoRecorrenciaGestor('p',m.origem==='terceiros'?'🤝 Terceiros · '+m.pessoa:'📌 Pessoal',m.origem==='terceiros'?'text-sm font-bold text-amber-300':'text-sm font-bold text-violet-300'));
    const topo=elementoRecorrenciaGestor('div','','flex items-start justify-between gap-3');topo.append(elementoRecorrenciaGestor('h3',m.descricao,'font-bold text-white break-words min-w-0'),elementoRecorrenciaGestor('p',formatBRL(m.valorCentavos/100),'font-bold text-lg text-white whitespace-nowrap'));c.append(topo);c.append(elementoRecorrenciaGestor('p',m.forma,'text-xs text-slate-300'));
    c.append(elementoRecorrenciaGestor('p',!m.ativo?'Desativada':(m.modo==='revisao'?'Aguardando revisão':'Automática')+' · Próxima cobrança: '+dataProximaRecorrenciaVisualGestor(m),'text-xs text-slate-200'));
    const botoes=elementoRecorrenciaGestor('div','','flex flex-wrap gap-2');
    const botao=(texto,fn)=>{const b=elementoRecorrenciaGestor('button',texto,'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white font-bold');b.type='button';b.onclick=fn;botoes.append(b);};
    if(m.ativo){
      const p=interpretarCompetenciaGestor(m.proximoMes),hoje=hojeCivilGestor(),data=new Date(p.a,p.m-1,Math.min(m.dia,new Date(p.a,p.m,0).getDate()));
      if(data<=hoje){const l=elementoRecorrenciaGestor('label','Valor deste mês (R$)','block text-xs text-slate-200'),valor=elementoRecorrenciaGestor('input','','block mt-1 rounded-xl border border-slate-600 bg-slate-900 p-3 w-full');valor.value=formatBRL(m.valorCentavos/100);valor.inputMode='numeric';valor.oninput=()=>mascaraMoedaTeclado(valor);l.append(valor);c.append(l);botao('✅ Revisar e registrar mês',()=>revisarMesRecorrenciaGestor(m,valor.value,false));}
      botao('⏸️ Pular mês',()=>revisarMesRecorrenciaGestor(m,'',true));botao('✏️ Editar',()=>abrirEditorRecorrenciaGestor(m));
      botao('⏹️ Desativar',()=>confirmarModeloRecorrenciaGestor('Desativar recorrência?','Os meses já registrados serão preservados.',()=>enviarModeloRecorrenciaGestor('salvarRecorrenciaWeb',{id:m.id,versao:m.versao,desativar:true})));
    }else botao('▶️ Retomar',()=>abrirEditorRecorrenciaGestor({...m,id:null,versao:null,proximoMes:mesInicialModeloRecorrenciaGestor()}));
    c.append(botoes);(m.ativo||!inativas?lista:inativas).append(c);
  }
  if(!antigas.ativas&&!modelosRecorrenciaGestor.some(m=>m.ativo))lista.append(elementoRecorrenciaGestor('p','Nenhuma recorrência ativa.','text-sm text-slate-300'));
  if(inativas&&!antigas.inativas&&!modelosRecorrenciaGestor.some(m=>!m.ativo))inativas.append(elementoRecorrenciaGestor('p','Nenhuma recorrência desativada.','text-sm text-slate-300'));
}
function mesInicialModeloRecorrenciaGestor(){const h=hojeCivilGestor();return String(h.getMonth()+1).padStart(2,'0')+'/'+h.getFullYear();}
function assinaturaEditorRecorrenciaGestor(){return JSON.stringify([epocaModeloRecorrenciaGestor(),editorRecorrenciaGestor,modelosRecorrenciaGestor,Array.from(document.querySelectorAll('#modelosRecorrenciaGestor input,#modelosRecorrenciaGestor select')).map(e=>[e.id,e.value])]);}
function confirmarModeloRecorrenciaGestor(titulo,texto,fn){const assinatura=assinaturaEditorRecorrenciaGestor();mostrarConfirmacao(titulo,texto,()=>{if(recorrenciasOcupadasGestor||assinatura!==assinaturaEditorRecorrenciaGestor()){mostrarAviso('Os dados mudaram','Confira os campos e abra a confirmação novamente.');return;}fn();},false,'Confirmar','neutral');}
function revisarMesRecorrenciaGestor(m,texto,pular){
  try{const valor=pular?0:centavosPlanejamentoGestor(texto)/100;if(!pular&&valor<=0)throw Error('Informe um valor maior que zero.');
    confirmarModeloRecorrenciaGestor(pular?'Pular '+m.proximoMes+'?':'Registrar '+m.proximoMes+'?',m.descricao+' · '+(pular?'Não cria lançamento neste mês.':formatBRL(valor)+' · '+m.forma+(m.origem==='terceiros'?' · A receber de '+m.pessoa:'. Não altera meses anteriores.')),()=>enviarModeloRecorrenciaGestor('confirmarMesRecorrenciaWeb',{id:m.id,versao:m.versao,mes:m.proximoMes,pular,valor}));
  }catch(e){mostrarAviso('Confira o valor',e.message);}
}
async function enviarModeloRecorrenciaGestor(acao,p){
  if(recorrenciasOcupadasGestor)return;recorrenciasOcupadasGestor=true;bloquearRecorrenciasGestor();let confirmado=false,erroEnvio='';const epoca=epocaModeloRecorrenciaGestor();
  try{await apiCall(acao,{...p,requestId:novoRequestIdGestor()},1);confirmado=true;if(epoca!==epocaModeloRecorrenciaGestor())throw Error('A base foi restaurada durante o envio. Consulte novamente.');estadoRecorrenciaGestor('Alteração confirmada.');if(acao==='salvarRecorrenciaWeb'&&!p.desativar){editorRecorrenciaGestor=null;document.getElementById('editorModeloRecorrenciaGestor').replaceChildren();try{localStorage.removeItem('gestorModeloRecorrenciaRascunhoV1');}catch(_){}}
    if(acao==='confirmarMesRecorrenciaWeb')await carregarDados();
  }catch(e){erroEnvio=confirmado?'Registro confirmado. Consulte o estado atual para visualizar.':e.message+' Consulte novamente antes de repetir um envio sem confirmação.';estadoRecorrenciaGestor(erroEnvio);}
  finally{recorrenciasOcupadasGestor=false;bloquearRecorrenciasGestor();}
  await carregarModelosRecorrenciaGestor();
  if(erroEnvio)estadoRecorrenciaGestor(erroEnvio);
}
function abrirEditorRecorrenciaGestor(modelo={},confirmado=false){
  if(recorrenciasOcupadasGestor)return;
  if(editorRecorrenciaGestor&&!confirmado){confirmarModeloRecorrenciaGestor('Abrir outra recorrência?','O rascunho atual será substituído.',()=>abrirEditorRecorrenciaGestor(modelo,true));return;}
  editorRecorrenciaGestor={...modelo,epoca:epocaModeloRecorrenciaGestor()};
  const f=document.getElementById('editorModeloRecorrenciaGestor');f.replaceChildren();f.append(elementoRecorrenciaGestor('h3',modelo.id?'✏️ Editar recorrência':'➕ Nova recorrência','col-span-full font-bold text-white'));
  const campos=[['origem','Gasto de','select',modelo.origem||'pessoal',[['pessoal','Pessoal'],['terceiros','🤝 Terceiros']]],['modo','Valor mensal','select',modelo.modo||'revisao',[['revisao','Variável · revisar cada mês'],['automatico','Fixo · registrar automaticamente']]],['descricao','Descrição','text',modelo.descricao||''],['pessoa','Pessoa','text',modelo.pessoa||''],['forma','Forma de pagamento','select',modelo.forma||'',formasGlobais.filter(x=>!x.arquivado&&tipoFormaPagamentoGestor(x)!=='resumo').map(x=>[typeof x==='string'?x:x.nome,typeof x==='string'?x:x.nome])],['categoria','Categoria','select',modelo.categoria||'',categoriasGlobaisEdit.map(x=>[x.nome,getCategoriaExibicao(x.nome)])],['valor','Valor mensal sugerido (R$)','text',modelo.valorCentavos?formatBRL(modelo.valorCentavos/100):''],['dia','Dia da cobrança','number',modelo.dia||1],['proximoMes','Começar / continuar em (MM/AAAA)','text',modelo.proximoMes||mesInicialModeloRecorrenciaGestor()],['defasagem','Mês da fatura','select',String(modelo.defasagem||0),[['0','Mesmo mês'],['1','Mês seguinte'],['2','Dois meses depois']]]];
  for(const [id,titulo,tipo,valor,opcoes]of campos){const label=elementoRecorrenciaGestor('label',titulo,'text-xs text-slate-200 min-w-0'),e=document.createElement(tipo==='select'?'select':'input');e.id='modelo-rec-'+id;label.id='rotulo-modelo-rec-'+id;e.className='block w-full mt-1 rounded-xl border border-slate-600 bg-slate-900 p-3 text-white';if(tipo==='select'){e.append(new Option('Selecione…',''));for(const [v,t]of opcoes)e.append(new Option(t,v));}else e.type=tipo;e.value=valor;if(id==='valor'){e.inputMode='numeric';e.addEventListener('input',()=>mascaraMoedaTeclado(e));e.addEventListener('paste',evento=>{if(!evento.clipboardData)return;evento.preventDefault();try{e.value=formatBRL(centavosPlanejamentoGestor(evento.clipboardData.getData('text'))/100);guardarModeloRecorrenciaRascunhoGestor();}catch(erro){estadoRecorrenciaGestor(erro.message);}});}if(id==='proximoMes'&&modelo.id)e.readOnly=true;e.addEventListener('input',guardarModeloRecorrenciaRascunhoGestor);label.append(e);if(id==='defasagem'){const detalhes=elementoRecorrenciaGestor('details','','col-span-full rounded-xl border border-slate-600 p-3');detalhes.append(elementoRecorrenciaGestor('summary','Mês da fatura','text-sm text-sky-200 cursor-pointer'),label);f.append(detalhes);}else f.append(label);if(id==='defasagem')e.addEventListener('change',()=>{if(e.dataset)e.dataset.escolhaManual='true';});if(['origem','forma','dia','proximoMes'].includes(id))e.addEventListener('change',atualizarOrigemEditorRecorrenciaGestor);}
  f.append(elementoRecorrenciaGestor('p','Esta recorrência prepara os próximos meses. Um valor variável só é lançado após sua confirmação.','col-span-full text-xs text-slate-300'));
  for(const [texto,fn]of [['💾 Salvar recorrência',salvarEditorRecorrenciaGestor],['✕ Cancelar',()=>confirmarModeloRecorrenciaGestor('Descartar edição?','Descartar apenas os campos deste modelo?',()=>{editorRecorrenciaGestor=null;f.replaceChildren();try{localStorage.removeItem('gestorModeloRecorrenciaRascunhoV1');}catch(_){}})]]){const b=elementoRecorrenciaGestor('button',texto,'rounded-xl bg-slate-700 p-3 text-white font-bold');b.type='button';b.onclick=fn;f.append(b);}
  atualizarOrigemEditorRecorrenciaGestor();f.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function guardarModeloRecorrenciaRascunhoGestor(){if(!editorRecorrenciaGestor)return;const campos=Object.fromEntries(Array.from(document.querySelectorAll('#editorModeloRecorrenciaGestor input,#editorModeloRecorrenciaGestor select')).map(e=>[e.id,e.value]));try{gravarArmazenamentoGestor('gestorModeloRecorrenciaRascunhoV1',JSON.stringify({modelo:editorRecorrenciaGestor,campos}));}catch(e){estadoRecorrenciaGestor('Rascunho não guardado: '+e.message);}}
function salvarEditorRecorrenciaGestor(){
  try{const v=id=>document.getElementById('modelo-rec-'+id).value,p={...editorRecorrenciaGestor,origem:v('origem'),modo:v('modo'),descricao:v('descricao'),pessoa:v('pessoa'),forma:v('forma'),categoria:v('categoria'),valor:centavosPlanejamentoGestor(v('valor'))/100,dia:Number(v('dia')),proximoMes:v('proximoMes').trim(),defasagem:Number(v('defasagem'))};
    if(editorRecorrenciaGestor.epoca!==epocaModeloRecorrenciaGestor())throw Error('A base foi restaurada. Consulte novamente.');
    if(!p.descricao.trim()||!p.forma||p.valor<=0||!Number.isInteger(p.dia)||p.dia<1||p.dia>31||!interpretarCompetenciaGestor(p.proximoMes).m||p.origem==='terceiros'&&!p.pessoa.trim()||p.origem==='pessoal'&&!p.categoria)throw Error('Confira descrição, forma, pessoa/categoria, valor e datas.');
    confirmarModeloRecorrenciaGestor('Salvar recorrência?',p.descricao+' · '+(p.modo==='revisao'?'Pedir revisão antes de registrar cada mês.':'Registrar automaticamente '+formatBRL(p.valor)+' a partir de '+p.proximoMes+'.'),()=>enviarModeloRecorrenciaGestor('salvarRecorrenciaWeb',p));
  }catch(e){mostrarAviso('Confira a recorrência',e.message);}
}
function restaurarEditorModeloRecorrenciaGestor(){
  if(recorrenciasOcupadasGestor)return;
  if(editorRecorrenciaGestor)return;
  const salvo=lerJSONLocalGestor('gestorModeloRecorrenciaRascunhoV1',null);
  if(salvo?.modelo?.epoca===epocaModeloRecorrenciaGestor()&&salvo.campos){abrirEditorRecorrenciaGestor(salvo.modelo);for(const [id,v]of Object.entries(salvo.campos)){const e=document.getElementById(id);if(e&&id.startsWith('modelo-rec-')&&typeof v==='string')e.value=v;}}
}
const abaAntesModelosRecorrenciaGestor=window.setAba;
window.setAba=function(aba,...args){const r=abaAntesModelosRecorrenciaGestor(aba,...args);if(aba==='assinaturas')carregarModelosRecorrenciaGestor();return r;};

function atualizarOrigemEditorRecorrenciaGestor(){
  const origem=document.getElementById('modelo-rec-origem')?.value;
  for(const [id,mostrar]of [['pessoa',origem==='terceiros'],['categoria',origem!=='terceiros']]){const l=document.getElementById('rotulo-modelo-rec-'+id);if(l){l.hidden=!mostrar;l.classList?.toggle('hidden',!mostrar);}}
  const def=document.getElementById('modelo-rec-defasagem');
  if(!editorRecorrenciaGestor?.id&&!editorRecorrenciaGestor?.registroOrigem&&def?.dataset?.escolhaManual!=='true'&&typeof calcularMesFaturaCartao==='function'){
    const forma=buscarFormaPagamentoGestor(document.getElementById('modelo-rec-forma').value),p=interpretarCompetenciaGestor(document.getElementById('modelo-rec-proximoMes').value),dia=Number(document.getElementById('modelo-rec-dia').value);
    if(forma&&p.m&&Number.isInteger(dia)&&dia>=1&&dia<=31){const d=Math.min(dia,new Date(p.a,p.m,0).getDate()),fat=interpretarCompetenciaGestor(calcularMesFaturaCartao(forma,String(d).padStart(2,'0')+'/'+String(p.m).padStart(2,'0')+'/'+p.a).mesFat);if(fat.m)def.value=String(Math.max(0,Math.min(2,(fat.a-p.a)*12+fat.m-p.m)));}
  }
}
function instalarAtalhoRecorrenciaEdicaoGestor(nome,modalId,tipo){
  const abrir=window[nome];window[nome]=function(...args){
    const r=abrir(...args),m=document.getElementById(modalId);if(!m?.querySelector)return r;
    let area=m.querySelector('[data-secao-recorrencia-editor]'),botao;
    if(!area){
      area=elementoRecorrenciaGestor('div','','pt-2 border-t border-slate-700');area.setAttribute('data-secao-recorrencia-editor','true');
      const titulo=elementoRecorrenciaGestor('button','','w-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-300 font-bold py-2.5 px-3 rounded-xl text-xs botao-expansivel-gestor transition');titulo.type='button';titulo.setAttribute('aria-expanded','false');
      const rotulo=elementoRecorrenciaGestor('span','📌 Criar recorrência','rotulo-expansivel-gestor'),seta=elementoRecorrenciaGestor('span','▼','seta-expansivel-gestor');seta.setAttribute('aria-hidden','true');titulo.append(rotulo,seta);
      const painel=elementoRecorrenciaGestor('div','','hidden mt-2.5 p-3.5 rounded-xl bg-slate-900/80 border border-violet-400/40 space-y-2.5');painel.id=modalId+'RecorrenciaCampos';titulo.setAttribute('aria-controls',painel.id);
      const label=elementoRecorrenciaGestor('label','Valor mensal','block text-xs text-slate-300');const modo=elementoRecorrenciaGestor('select','','block w-full h-[52px] mt-1 rounded-xl bg-slate-900 border border-violet-400/40 px-3 text-white');
      for(const [v,t]of [['revisao','Variável — revisar a cada mês'],['automatico','Fixo — repetir automaticamente']]){const o=elementoRecorrenciaGestor('option',t);o.value=v;modo.append(o);}modo.value='revisao';label.append(modo);painel.append(label);area._modo=modo;area._previa=elementoRecorrenciaGestor('p','','text-xs text-violet-200 whitespace-pre-line');painel.append(area._previa);
      botao=elementoRecorrenciaGestor('button','📌 Criar recorrência','w-full rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-300 py-2.5 px-3 text-xs font-bold');botao.type='button';botao.setAttribute('data-criar-recorrencia-editor','true');painel.append(botao);
      titulo.onclick=()=>{const aberto=titulo.getAttribute('aria-expanded')==='true';titulo.setAttribute('aria-expanded',String(!aberto));painel.classList.toggle('hidden',aberto);seta.textContent=aberto?'▼':'▲';};
      area.append(titulo,painel);const form=m.querySelector('form'),rodape=form.querySelector('button[type="submit"]')?.closest('div');form.insertBefore(area,rodape||null);
    }else{
      botao=area.querySelector('[data-criar-recorrencia-editor]');const titulo=area.querySelector('[aria-expanded]'),painel=document.getElementById(modalId+'RecorrenciaCampos');titulo.setAttribute('aria-expanded','false');painel.classList.add('hidden');titulo.querySelector('.seta-expansivel-gestor').textContent='▼';
    }
    const parcela=args[tipo==='pessoal'?9:8],ref=detalhesReferenciaGestor(args[0]);area.hidden=String(parcela).replace(/^'/,'')!=='1/1'||!ref;
    area._modo.value='revisao';
    const terceiros=tipo==='terceiros',form=m.querySelector('form'),epoca=epocaModeloRecorrenciaGestor();let plano=null;
    try{plano=planoRecorrenciaCadastroGestor(args[1],args[6],hojeCivilGestor());area._previa.textContent='Repetição mensal no dia '+plano.dia+'\nPróxima ocorrência: '+plano.dataProxima+' · referência: '+formatBRL(lerValorMoeda(args[5]))+(plano.omitidos?'\nMeses anteriores não serão gerados.':'');}catch(e){area._previa.textContent=e.message;}
    botao.disabled=!plano;const sessao=m._sessaoEdicao;
    botao.onclick=()=>{
      if(m.getAttribute?.('aria-busy')==='true'||area._enviando){mostrarAviso('Aguarde','Conclua o envio antes de criar a recorrência.');return;}
      const intacto=()=>epoca===epocaModeloRecorrenciaGestor()&&m._sessaoEdicao===sessao&&(!m._assinaturaInicial||m._assinaturaInicial===assinaturaFormularioRotinaGestor(form));
      if(!intacto()){mostrarAviso('Salve a edição primeiro','Salve ou descarte a edição antes de criar a recorrência com os dados salvos.');return;}
      if(!plano)return;const modo=area._modo.value;
      const p={origem:tipo,modo,descricao:args[terceiros?3:2],pessoa:terceiros?args[2]:'',forma:args[terceiros?4:3],categoria:terceiros?'':args[4],valor:lerValorMoeda(args[5]),dia:plano.dia,proximoMes:plano.proximoMes,defasagem:plano.defasagem,tags:terceiros?'':args[8]||'',perfilGasto:terceiros?null:args[10]||null,registroOrigem:ref.registroId,versaoOrigem:ref.versao};
      mostrarConfirmacao('Criar recorrência?',p.descricao+' · próxima ocorrência: '+plano.dataProxima+'. O lançamento atual será preservado.',async()=>{
        if(!intacto()||modo!==area._modo.value||area._enviando){mostrarAviso('Os dados mudaram','Confira os campos e tente novamente.');return;}
        const chave=JSON.stringify([epoca,p]);if(area._pedido?.chave!==chave)area._pedido={chave,param:{...p,requestId:novoRequestIdGestor()}};
        area._enviando=true;botao.disabled=true;area._modo.disabled=true;
        try{await apiCall('salvarRecorrenciaWeb',area._pedido.param,1);if(m._sessaoEdicao===sessao&&epoca===epocaModeloRecorrenciaGestor()){area.hidden=true;mostrarAviso('Recorrência criada','Os próximos meses estão preparados. O lançamento original foi preservado.');}}
        catch(e){mostrarAviso('Confira a recorrência',e.message+' Consulte Atividade antes de repetir um envio sem confirmação.');}
        finally{area._enviando=false;if(m._sessaoEdicao===sessao){botao.disabled=false;area._modo.disabled=false;}}
      },false,'Criar recorrência','neutral');
    };return r;
  };
}
instalarAtalhoRecorrenciaEdicaoGestor('abrirModalEdicaoLanc','modalEdicaoLanc','pessoal');
instalarAtalhoRecorrenciaEdicaoGestor('abrirModalEdicaoEmp','modalEdicaoEmp','terceiros');

// Criação acontece nos formulários financeiros; a lista permanece para gestão.
function atualizarCadastroRecorrenteGestor(emp){
 const sufixo=emp?'Emp':'Novo',chk=document.getElementById(emp?'checkRecorrenciaEmpGestor':'checkAssinatura'),box=document.getElementById('boxRecorrencia'+sufixo+'Gestor');
 if(!chk||!box)return;box.classList.toggle('hidden',!chk.checked);
 const btn=document.getElementById(emp?'btnRecorrenteEmpGestor':'btnGastoFixo');if(btn){btn.setAttribute('aria-pressed',String(chk.checked));btn.className='text-[10px] font-bold h-6 leading-none px-2.5 rounded-lg border transition inline-flex items-center justify-center '+(chk.checked?'bg-violet-500/20 border-violet-400 text-violet-200':'bg-slate-800 border-slate-700 text-slate-300');if(emp)btn.className+=' h-6 leading-none';}
 if(!chk.checked)return;
 const parc=document.getElementById(emp?'inpEmpParc':'inpParc'),ini=document.getElementById(emp?'inpEmpParcIni':'inpParcIni'),pix=document.getElementById(emp?'chkPixRecebimento':'chkPixParcelado');
 if(parc)parc.value='1';if(ini)ini.value='1';if(pix)pix.checked=false;
 const previa=document.getElementById('previaRecorrencia'+sufixo+'Gestor');
 try{const p=planoRecorrenciaCadastroGestor(document.getElementById(emp?'inpEmpData':'inpData').value,document.getElementById(emp?'inpEmpMesFat':'inpMesFat').value,hojeCivilGestor());
 previa.textContent='Repetição mensal no dia '+p.dia+'\nPróxima ocorrência: '+p.dataProxima+(document.getElementById('modoRecorrencia'+sufixo+'Gestor').value==='revisao'?' · revisar valor':' · automática')+(p.omitidos?'\nMeses anteriores não serão gerados.':'');
 }catch(e){previa.textContent=e.message;}
}
function abrirCadastroRecorrenteGestor(emp){
 if(bloqueioFormularioRotinaGestor(emp)){mostrarAviso('Confira o envio pendente','Conclua o envio antes de iniciar outra recorrência.');return;}
 const assinatura=JSON.stringify(dadosFormularioRascunhoGestor(emp)),epoca=epocaModeloRecorrenciaGestor();
 const abrir=()=>{
 if(epoca!==epocaModeloRecorrenciaGestor()||bloqueioFormularioRotinaGestor(emp)||assinatura!==JSON.stringify(dadosFormularioRascunhoGestor(emp))){mostrarAviso('Confira o formulário','Os dados mudaram. Abra novamente pela aba Recorrências.');return;}
 if(emp)limparFormularioEmprestimo();else limparFormularioNovoGasto();
 document.getElementById(emp?'checkRecorrenciaEmpGestor':'checkAssinatura').checked=true;
 if(emp){abrirFerramenta('emprestimos','novo');atualizarLayoutParcelasEmprestimo();}else{setAba('novo');atualizarLayoutParcelas();}
 atualizarCadastroRecorrenteGestor(emp);if(emp)salvarRascunhoEmp();else salvarRascunho();
 };
 if(haRascunhoFormularioGestor(emp))mostrarConfirmacao('Iniciar recorrência?','O rascunho deste cadastro será substituído. Deseja continuar?',abrir,false,'Iniciar recorrência','neutral');else abrir();
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
 organizarCamposDataEditorEmpGestor();
 for(const emp of [false,true]){
 const layout=emp?'atualizarLayoutParcelasEmprestimo':'atualizarLayoutParcelas',original=window[layout];
 window[layout]=function(...args){atualizarCadastroRecorrenteGestor(emp);const r=original.apply(this,args);atualizarCadastroRecorrenteGestor(emp);return r;};
 const sufixo=emp?'Emp':'Novo',chk=document.getElementById(emp?'checkRecorrenciaEmpGestor':'checkAssinatura'),modo=document.getElementById('modoRecorrencia'+sufixo+'Gestor');
 const mudar=()=>{window[layout]();if(emp)salvarRascunhoEmp();else salvarRascunho();};
 chk?.addEventListener('change',mudar);modo?.addEventListener('change',mudar);
 for(const id of emp?['inpEmpData','inpEmpDataDia','inpEmpDataMes','inpEmpDataAno','inpEmpMesFat']:['inpData','inpDataDia','inpDataMes','inpDataAno','inpMesFat'])document.getElementById(id)?.addEventListener('input',()=>atualizarCadastroRecorrenteGestor(emp));
 atualizarCadastroRecorrenteGestor(emp);
 }
});

function alternarRecorrenciaEmpGestor(){const c=document.getElementById('checkRecorrenciaEmpGestor');c.checked=!c.checked;atualizarLayoutParcelasEmprestimo();salvarRascunhoEmp();}

function organizarCamposDataEditorEmpGestor(){
 const form=document.getElementById('modalEdicaoEmp')?.querySelector('form'),antes=form?.querySelector('[onclick="togglePainelDividirEmp()"]')?.parentElement;
 if(antes)for(const e of [document.getElementById('inpEdEmpCombinada')?.closest('label'),document.getElementById('escopoDataCombinadaEmpGestor')?.closest('label'),document.getElementById('ajudaEscopoDataEmpGestor')])if(e)form.insertBefore(e,antes);
}

let seriesRecorrenciasGestor=[],mesSeriesRecorrenciasGestor='';
function atualizarSeriesRecorrenciasGestor(series,mes){seriesRecorrenciasGestor=series;mesSeriesRecorrenciasGestor=mes;renderizarModelosRecorrenciaGestor();}
function montarCartoesSeriesRecorrenciasGestor(dados){
      let htmlAtivas = '', htmlInativas = '';
      if (dados.assinaturas && dados.assinaturas.length > 0) {
        const ativas = dados.assinaturas.filter(a => a.controleInvalido || (!a.encerrada && (a.status === 'Assinatura Ativa' || a.status === 'Assinatura Paga')));
        const inativas = dados.assinaturas.filter(a => !a.controleInvalido && (a.encerrada || (a.status !== 'Assinatura Ativa' && a.status !== 'Assinatura Paga')));
        ativas.forEach(a => {
          if (a.controleInvalido) {
            htmlAtivas += `<div class="card-glass p-4 border-amber-400/40"><h3 class="text-white font-bold text-base">${escaparHTML(a.descricao)}</h3><p class="text-sm text-slate-200 mt-1">${escaparHTML(a.forma)} • ${escaparHTML(a.valor)}</p><p class="text-xs text-amber-200 mt-2">Controle da recorrência a conferir. Valores registrados estão preservados; a projeção desta série está suspensa.</p><button type="button" ${acaoHTML('abrirAtividadeGestor', [])} class="mt-3 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white">🔎 Conferir em Atividade</button></div>`;
            return;
          }
          const exibida=a.vigente||a;

          const catVisor = getCategoriaExibicao(exibida.categoria);
          const jaPaga = (exibida.status === 'Assinatura Paga');
          const badgeCor = obterClasseBadgeStatus(jaPaga?'Assinatura Paga':'Assinatura Ativa');
          htmlAtivas += `<div class="card-glass p-4 flex flex-col gap-3 min-w-0"><p class="text-sm font-bold text-violet-300">📌 Pessoal · Automática</p><div class="flex justify-between items-start gap-3"><div class="min-w-0"><h3 class="text-white font-bold text-base">${escaparHTML(exibida.descricao)}</h3><p class="text-slate-400 text-xs mt-1 bg-slate-900/50 inline-block px-2 py-1 rounded border border-slate-700/50">${iconeFormaPagamentoVisualGestor(exibida.forma)} ${escaparHTML(exibida.forma)} • 🏷 ${escaparHTML(catVisor)}</p></div><div class="text-right"><div class="text-white font-bold text-lg whitespace-nowrap">${escaparHTML(exibida.valor)}</div><span class="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeCor}">${!a.vigente&&a.programadas?.length?'Programada':exibida.mes&&exibida.mes!==dados.faturas?.mesAtual?'Condição vigente':exibida.pulada?'Pulado neste mês':jaPaga?'Paga no Mês':'Ativa / A Pagar'}</span></div></div>${textosProgramacoesFixasGestor(a).map(texto=>'<p class="text-xs text-sky-200">'+escaparHTML(texto)+'</p>').join('')}<div class="flex gap-2 mt-1 pt-3 border-t border-slate-700/50"><button type="button" ${acaoHTML('abrirModalEdicaoAss', [exibida.descricao, exibida.forma, exibida.categoria, exibida.valor, { registroId: exibida.registroId, compraId: exibida.compraId, versao: exibida.versao }])} class="flex-1 text-indigo-400 bg-indigo-900/20 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white text-xs font-bold py-2.5 rounded-xl transition">✏️ Editar</button><button type="button" ${acaoHTML('pularMesFixoLocalGestor', [exibida.descricao, exibida.forma, {registroId:exibida.registroId,compraId:exibida.compraId,versao:exibida.versao}])} class="flex-1 text-amber-200 bg-amber-900/20 border border-amber-500/20 hover:bg-amber-700 hover:text-white text-xs font-bold py-2.5 px-2 rounded-xl transition">⏸️ Pular mês</button><button type="button" ${acaoHTML('cancelarAssinaturaLocal', [a.descricao, a.forma, { registroId: a.registroId, compraId: a.compraId, versao: a.versao }])} class="flex-1 text-rose-400 bg-rose-900/20 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-xs font-bold py-2.5 rounded-xl transition">⏹️ Desativar</button></div></div>`;
        });
        inativas.forEach(a => {
          htmlInativas += `<div class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex justify-between items-center gap-3"><div class="min-w-0 flex-1 break-words"><h3 class="text-slate-300 font-bold text-sm">${escaparHTML(a.descricao)}</h3><p class="text-slate-400 text-[10px] uppercase font-bold mt-0.5">${escaparHTML(a.forma)} • ${escaparHTML(a.valor)}</p></div><div class="shrink-0 flex flex-col items-end gap-2"><span class="px-2 py-1 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-500">Desativada</span><button type="button" ${acaoHTML('abrirRetomadaAssinaturaGestor', [a])} class="rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2">▶️ Retomar</button></div></div>`;
        });
      }
      return {ativas:htmlAtivas,inativas:htmlInativas};

}

function dataProximaRecorrenciaVisualGestor(m){const p=interpretarCompetenciaGestor(m.proximoMes);if(!p.m)return m.proximoMes;const dia=Math.min(m.dia,new Date(p.a,p.m,0).getDate());return String(dia).padStart(2,'0')+'/'+m.proximoMes;}
