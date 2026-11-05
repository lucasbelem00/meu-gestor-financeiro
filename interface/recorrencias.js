// Modelos novos convivem com as séries pessoais existentes, sem convertê-las.
let modelosRecorrenciaGestor=[],recorrenciasOcupadasGestor=false,editorRecorrenciaGestor=null,modeloHistoricoPendenteGestor=null;
const epocaModeloRecorrenciaGestor=()=>{try{return localStorage.getItem('gestorEpocaRestauracaoV1')||'';}catch(_){return '';}};
function elementoRecorrenciaGestor(tag,texto,classe=''){const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;}
function estadoRecorrenciaGestor(texto){const e=document.getElementById('estadoModelosRecorrenciaGestor');if(e)e.textContent=texto;}
function bloquearRecorrenciasGestor(){document.querySelectorAll('#modelosRecorrenciaGestor button,#modelosRecorrenciaGestor input,#modelosRecorrenciaGestor select').forEach(e=>e.disabled=recorrenciasOcupadasGestor);}
async function carregarModelosRecorrenciaGestor(){
  if(recorrenciasOcupadasGestor)return;recorrenciasOcupadasGestor=true;bloquearRecorrenciasGestor();
  const epoca=epocaModeloRecorrenciaGestor();estadoRecorrenciaGestor('Consultando recorrências…');
  try{const r=await apiCall('obterRecorrenciasWeb',{},1);if(epoca!==epocaModeloRecorrenciaGestor())throw Error('A base foi restaurada. Consulte novamente.');modelosRecorrenciaGestor=r.itens;renderizarModelosRecorrenciaGestor();estadoRecorrenciaGestor(r.erroAutomatico?'Registro automático a conferir: '+r.erroAutomatico:'Revisão mensal: confirme o valor antes de registrar. Automático: a rotina diária registra na data da cobrança.');}
  catch(e){estadoRecorrenciaGestor(e.message);}finally{recorrenciasOcupadasGestor=false;bloquearRecorrenciasGestor();restaurarEditorModeloRecorrenciaGestor();}
}
function renderizarModelosRecorrenciaGestor(){
  const lista=document.getElementById('listaModelosRecorrenciaGestor');if(!lista)return;lista.replaceChildren();
  for(const m of modelosRecorrenciaGestor){
    const c=elementoRecorrenciaGestor('article','','card-glass p-4 space-y-3 min-w-0');
    c.append(elementoRecorrenciaGestor('p',m.origem==='terceiros'?'🤝 Terceiros · '+m.pessoa:'📌 Pessoal',m.origem==='terceiros'?'text-sm font-bold text-amber-300':'text-sm font-bold text-sky-300'));
    c.append(elementoRecorrenciaGestor('h3',m.descricao,'font-bold text-white break-words'));
    c.append(elementoRecorrenciaGestor('p',formatBRL(m.valorCentavos/100)+' · '+m.forma,'text-sm text-slate-200'));
    c.append(elementoRecorrenciaGestor('p',!m.ativo?'Desativada':(m.modo==='revisao'?'Aguardando revisão':'Registro automático')+' · Próximo mês: '+m.proximoMes+' · Dia '+m.dia,'text-xs text-slate-200'));
    if(m.origem==='terceiros')c.append(elementoRecorrenciaGestor('p','Confirmar o mês cria um valor a receber em Empréstimos. Não registra recebimento da pessoa.','text-xs text-slate-300'));
    const botoes=elementoRecorrenciaGestor('div','','flex flex-wrap gap-2');
    const botao=(texto,fn)=>{const b=elementoRecorrenciaGestor('button',texto,'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white font-bold');b.type='button';b.onclick=fn;botoes.append(b);};
    if(m.ativo){
      const p=interpretarCompetenciaGestor(m.proximoMes),hoje=hojeCivilGestor(),data=new Date(p.a,p.m-1,Math.min(m.dia,new Date(p.a,p.m,0).getDate()));
      if(data<=hoje){const l=elementoRecorrenciaGestor('label','Valor deste mês (R$)','block text-xs text-slate-200'),valor=elementoRecorrenciaGestor('input','','block mt-1 rounded-xl border border-slate-600 bg-slate-900 p-3 w-full');valor.value=formatBRL(m.valorCentavos/100);valor.inputMode='numeric';valor.oninput=()=>mascaraMoedaTeclado(valor);l.append(valor);c.append(l);botao('✅ Revisar e registrar mês',()=>revisarMesRecorrenciaGestor(m,valor.value,false));}
      botao('⏸️ Pular mês',()=>revisarMesRecorrenciaGestor(m,'',true));botao('✏️ Editar',()=>abrirEditorRecorrenciaGestor(m));
      botao('⏹️ Desativar',()=>confirmarModeloRecorrenciaGestor('Desativar recorrência?','Os meses já registrados serão preservados.',()=>enviarModeloRecorrenciaGestor('salvarRecorrenciaWeb',{id:m.id,versao:m.versao,desativar:true})));
    }else botao('▶️ Retomar',()=>abrirEditorRecorrenciaGestor({...m,id:null,versao:null,proximoMes:mesInicialModeloRecorrenciaGestor()}));
    c.append(botoes);lista.append(c);
  }
  if(!modelosRecorrenciaGestor.length)lista.append(elementoRecorrenciaGestor('p','Nenhuma recorrência adicional cadastrada. As recorrências automáticas existentes continuam abaixo.','text-sm text-slate-300'));
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
  if(modeloHistoricoPendenteGestor){const m=modeloHistoricoPendenteGestor;modeloHistoricoPendenteGestor=null;abrirEditorRecorrenciaGestor(m);return;}
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
      painel.append(elementoRecorrenciaGestor('p','Prepara os próximos meses usando os dados salvos. Você revisará o valor e a repetição; este lançamento permanece como está.','text-xs text-slate-300 leading-relaxed'));
      botao=elementoRecorrenciaGestor('button','📌 Configurar recorrência','w-full rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-300 py-2.5 px-3 text-xs font-bold');botao.type='button';botao.setAttribute('data-criar-recorrencia-editor','true');painel.append(botao);
      titulo.onclick=()=>{const aberto=titulo.getAttribute('aria-expanded')==='true';titulo.setAttribute('aria-expanded',String(!aberto));painel.classList.toggle('hidden',aberto);seta.textContent=aberto?'▼':'▲';};
      area.append(titulo,painel);const form=m.querySelector('form'),rodape=form.querySelector('button[type="submit"]')?.closest('div');form.insertBefore(area,rodape||null);
    }else{
      botao=area.querySelector('[data-criar-recorrencia-editor]');const titulo=area.querySelector('[aria-expanded]'),painel=document.getElementById(modalId+'RecorrenciaCampos');titulo.setAttribute('aria-expanded','false');painel.classList.add('hidden');titulo.querySelector('.seta-expansivel-gestor').textContent='▼';
    }
    const parcela=args[tipo==='pessoal'?9:8],ref=detalhesReferenciaGestor(args[0]);area.hidden=String(parcela).replace(/^'/,'')!=='1/1'||!ref;
    botao.onclick=()=>{
      if(m.getAttribute?.('aria-busy')==='true'){mostrarAviso('Aguarde','Conclua o envio antes de criar a recorrência.');return;}
      if(m._assinaturaInicial&&m._assinaturaInicial!==assinaturaFormularioRotinaGestor(m.querySelector('form'))){mostrarAviso('Salve a edição primeiro','Crie a recorrência a partir dos dados salvos. Salve ou descarte a edição antes de continuar.');return;}
      const terceiros=tipo==='terceiros',data=args[1].split('/'),h=hojeCivilGestor(),d=new Date(Math.max(new Date(Number(data[2]),Number(data[1]),1).getTime(),new Date(h.getFullYear(),h.getMonth(),1).getTime())),mes=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
      const compra=interpretarCompetenciaGestor(data[1]+'/'+data[2]),fat=interpretarCompetenciaGestor(args[6]);
      modeloHistoricoPendenteGestor={origem:tipo,modo:'revisao',descricao:args[terceiros?3:2],pessoa:terceiros?args[2]:'',forma:args[terceiros?4:3],categoria:terceiros?'':args[4],valorCentavos:Math.round(lerValorMoeda(args[5])*100),dia:Number(data[0]),proximoMes:mes,defasagem:Math.max(0,Math.min(2,(fat.a-compra.a)*12+fat.m-compra.m)),tags:terceiros?'':args[8]||'',perfilGasto:terceiros?null:args[10]||null,registroOrigem:ref.registroId,versaoOrigem:ref.versao};
      window[terceiros?'fecharModalEdicaoEmp':'fecharModalEdicaoLanc'](true);setAba('assinaturas');
    };return r;
  };
}
instalarAtalhoRecorrenciaEdicaoGestor('abrirModalEdicaoLanc','modalEdicaoLanc','pessoal');
instalarAtalhoRecorrenciaEdicaoGestor('abrirModalEdicaoEmp','modalEdicaoEmp','terceiros');

// Criação acontece nos formulários financeiros; a lista permanece para gestão.
function atualizarCadastroRecorrenteGestor(emp){
 const sufixo=emp?'Emp':'Novo',chk=document.getElementById(emp?'checkRecorrenciaEmpGestor':'checkAssinatura'),box=document.getElementById('boxRecorrencia'+sufixo+'Gestor');
 if(!chk||!box)return;box.classList.toggle('hidden',!chk.checked);
 const btn=!emp&&document.getElementById('btnGastoFixo');if(btn)btn.className='text-[10px] font-bold px-2.5 py-1 rounded-lg border transition inline-flex items-center justify-center '+(chk.checked?'bg-violet-500/20 border-violet-400 text-violet-200':'bg-slate-800 border-slate-700 text-slate-300');
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
