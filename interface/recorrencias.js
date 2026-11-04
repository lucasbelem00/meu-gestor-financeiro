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
      const p=parseMesFat(m.proximoMes),hoje=hojeCivilGestor(),data=new Date(p.a,p.m-1,Math.min(m.dia,new Date(p.a,p.m,0).getDate()));
      if(data<=hoje){const l=elementoRecorrenciaGestor('label','Valor deste mês (R$)','block text-xs text-slate-200'),valor=elementoRecorrenciaGestor('input','','block mt-1 rounded-xl border border-slate-600 bg-slate-900 p-3 w-full');valor.value=formatBRL(m.valorCentavos/100);valor.inputMode='numeric';valor.oninput=()=>mascaraMoedaTeclado(valor);l.append(valor);c.append(l);botao('✅ Revisar e registrar mês',()=>revisarMesRecorrenciaGestor(m,valor.value,false));}
      botao('⏸️ Pular mês',()=>revisarMesRecorrenciaGestor(m,'',true));botao('✏️ Editar',()=>abrirEditorRecorrenciaGestor(m));
      botao('⏹️ Desativar',()=>confirmarModeloRecorrenciaGestor('Desativar recorrência?','Os meses já registrados serão preservados.',()=>enviarModeloRecorrenciaGestor('salvarRecorrenciaWeb',{id:m.id,versao:m.versao,desativar:true})));
    }else botao('▶️ Retomar',()=>abrirEditorRecorrenciaGestor({...m,id:null,versao:null,proximoMes:mesInicialModeloRecorrenciaGestor()}));
    c.append(botoes);lista.append(c);
  }
  if(!modelosRecorrenciaGestor.length)lista.append(elementoRecorrenciaGestor('p','Nenhum modelo adicional cadastrado. As recorrências automáticas existentes continuam abaixo.','text-sm text-slate-300'));
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
  if(editorRecorrenciaGestor&&!confirmado){confirmarModeloRecorrenciaGestor('Abrir outro modelo?','O rascunho atual será substituído.',()=>abrirEditorRecorrenciaGestor(modelo,true));return;}
  editorRecorrenciaGestor={...modelo,epoca:epocaModeloRecorrenciaGestor()};
  const f=document.getElementById('editorModeloRecorrenciaGestor');f.replaceChildren();f.append(elementoRecorrenciaGestor('h3',modelo.id?'✏️ Editar modelo':'➕ Nova recorrência','col-span-full font-bold text-white'));
  const campos=[['origem','Conta de','select',modelo.origem||'pessoal',[['pessoal','Pessoal'],['terceiros','🤝 Terceiros']]],['modo','Valor mensal','select',modelo.modo||'revisao',[['revisao','Variável · revisar cada mês'],['automatico','Fixo · registrar automaticamente']]],['descricao','Descrição','text',modelo.descricao||''],['pessoa','Pessoa (somente terceiros)','text',modelo.pessoa||''],['forma','Forma de pagamento','select',modelo.forma||'',formasGlobais.filter(x=>!x.arquivado&&tipoFormaPagamentoGestor(x)!=='resumo').map(x=>[typeof x==='string'?x:x.nome,typeof x==='string'?x:x.nome])],['categoria','Categoria (somente pessoal)','select',modelo.categoria||'',categoriasGlobaisEdit.map(x=>[x.nome,getCategoriaExibicao(x.nome)])],['valor','Último valor / valor fixo (R$)','text',modelo.valorCentavos?formatBRL(modelo.valorCentavos/100):''],['dia','Dia da cobrança (1 a 31)','number',modelo.dia||1],['proximoMes','Primeiro / próximo mês (MM/AAAA)','text',modelo.proximoMes||mesInicialModeloRecorrenciaGestor()],['defasagem','Fatura em relação à cobrança','select',String(modelo.defasagem||0),[['0','Mesmo mês'],['1','Mês seguinte'],['2','Dois meses depois']]]];
  for(const [id,titulo,tipo,valor,opcoes]of campos){const label=elementoRecorrenciaGestor('label',titulo,'text-xs text-slate-200 min-w-0'),e=document.createElement(tipo==='select'?'select':'input');e.id='modelo-rec-'+id;e.className='block w-full mt-1 rounded-xl border border-slate-600 bg-slate-900 p-3 text-white';if(tipo==='select'){e.append(new Option('Selecione…',''));for(const [v,t]of opcoes)e.append(new Option(t,v));}else e.type=tipo;e.value=valor;if(id==='valor'){e.inputMode='numeric';e.addEventListener('input',()=>mascaraMoedaTeclado(e));e.addEventListener('paste',evento=>{if(!evento.clipboardData)return;evento.preventDefault();try{e.value=formatBRL(centavosPlanejamentoGestor(evento.clipboardData.getData('text'))/100);guardarModeloRecorrenciaRascunhoGestor();}catch(erro){estadoRecorrenciaGestor(erro.message);}});}if(id==='proximoMes'&&modelo.id)e.readOnly=true;e.addEventListener('input',guardarModeloRecorrenciaRascunhoGestor);label.append(e);f.append(label);}
  f.append(elementoRecorrenciaGestor('p','O mês da cobrança define a revisão. O mês da fatura é calculado separadamente. O registro automático usa a rotina diária da proteção; valor variável exige sua confirmação.','col-span-full text-xs text-slate-300'));
  for(const [texto,fn]of [['💾 Salvar modelo',salvarEditorRecorrenciaGestor],['✕ Cancelar',()=>confirmarModeloRecorrenciaGestor('Descartar edição?','Descartar apenas os campos deste modelo?',()=>{editorRecorrenciaGestor=null;f.replaceChildren();try{localStorage.removeItem('gestorModeloRecorrenciaRascunhoV1');}catch(_){}})]]){const b=elementoRecorrenciaGestor('button',texto,'rounded-xl bg-slate-700 p-3 text-white font-bold');b.type='button';b.onclick=fn;f.append(b);}
  f.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function guardarModeloRecorrenciaRascunhoGestor(){if(!editorRecorrenciaGestor)return;const campos=Object.fromEntries(Array.from(document.querySelectorAll('#editorModeloRecorrenciaGestor input,#editorModeloRecorrenciaGestor select')).map(e=>[e.id,e.value]));try{gravarArmazenamentoGestor('gestorModeloRecorrenciaRascunhoV1',JSON.stringify({modelo:editorRecorrenciaGestor,campos}));}catch(e){estadoRecorrenciaGestor('Rascunho não guardado: '+e.message);}}
function salvarEditorRecorrenciaGestor(){
  try{const v=id=>document.getElementById('modelo-rec-'+id).value,p={...editorRecorrenciaGestor,origem:v('origem'),modo:v('modo'),descricao:v('descricao'),pessoa:v('pessoa'),forma:v('forma'),categoria:v('categoria'),valor:centavosPlanejamentoGestor(v('valor'))/100,dia:Number(v('dia')),proximoMes:v('proximoMes').trim(),defasagem:Number(v('defasagem'))};
    if(editorRecorrenciaGestor.epoca!==epocaModeloRecorrenciaGestor())throw Error('A base foi restaurada. Consulte novamente.');
    if(!p.descricao.trim()||!p.forma||p.valor<=0||!Number.isInteger(p.dia)||p.dia<1||p.dia>31||!parseMesFat(p.proximoMes).m||p.origem==='terceiros'&&!p.pessoa.trim()||p.origem==='pessoal'&&!p.categoria)throw Error('Confira descrição, forma, pessoa/categoria, valor e datas.');
    confirmarModeloRecorrenciaGestor('Salvar recorrência?',p.descricao+' · '+(p.modo==='revisao'?'Pedir revisão antes de registrar cada mês.':'Registrar automaticamente '+formatBRL(p.valor)+' a partir de '+p.proximoMes+'.'),()=>enviarModeloRecorrenciaGestor('salvarRecorrenciaWeb',p));
  }catch(e){mostrarAviso('Confira o modelo',e.message);}
}
function criarRecorrenciaDoHistoricoGestor(l){
  if(String(l[6]).replace(/^'/,'')!=='1/1'){mostrarAviso('Série existente','Use um lançamento à vista para criar outro modelo. Séries recorrentes existentes continuam com seu próprio editor.');return;}
  const partes=l[0].split('/'),h=hojeCivilGestor(),d=new Date(Math.max(new Date(Number(partes[2]),Number(partes[1]),1).getTime(),new Date(h.getFullYear(),h.getMonth(),1).getTime())),mes=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(),fat=parseMesFat(l[8]),data=parseMesFat(partes[1]+'/'+partes[2]),defasagem=Math.max(0,Math.min(2,(fat.a-data.a)*12+fat.m-data.m));
  modeloHistoricoPendenteGestor={origem:'pessoal',modo:'revisao',descricao:l[1],forma:l[2],categoria:l[3],valorCentavos:Math.round(lerValorMoeda(l[7])*100),dia:Number(partes[0]),proximoMes:mes,defasagem,tags:l[11]||'',perfilGasto:l[20]||null,registroOrigem:l[13],versaoOrigem:l[15]};setAba('assinaturas');
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
