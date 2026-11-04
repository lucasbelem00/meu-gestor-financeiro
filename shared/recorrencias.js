// Modelos permanentes. O próximo mês avança no MESMO plano do lançamento.
const ABA_MODELOS_RECORRENCIA_GESTOR_='Recorrências';
const CAB_MODELOS_RECORRENCIA_GESTOR_=['ID','Modelo JSON','Versão'];
function validarModelosRecorrenciaGestor_(linhas){
  if(!Array.isArray(linhas)||linhas.length>501||JSON.stringify(linhas[0])!==JSON.stringify(CAB_MODELOS_RECORRENCIA_GESTOR_))throw Error('Estrutura de recorrências inválida.');
  const ids=new Set();
  for(const r of linhas.slice(1)){
    if(r.length!==3||typeof r[0]!=='string'||!/^[A-Za-z0-9_.:-]{8,160}$/.test(r[0])||ids.has(r[0])||typeof r[1]!=='string'||r[1].length>10000||!Number.isSafeInteger(r[2])||r[2]<1)throw Error('Identificação de recorrência inválida.');
    ids.add(r[0]);let m;try{m=JSON.parse(r[1]);}catch(_){throw Error('Modelo de recorrência inválido.');}
    if(!m||!['pessoal','terceiros'].includes(m.origem)||!['revisao','automatico'].includes(m.modo)||typeof m.ativo!=='boolean'||typeof m.descricao!=='string'||!m.descricao.trim()||m.descricao.length>150||typeof m.forma!=='string'||!m.forma.trim()||m.forma.length>150||typeof m.categoria!=='string'||m.categoria.length>150||typeof m.pessoa!=='string'||m.pessoa.length>150||m.origem==='terceiros'&&!m.pessoa.trim()||!Number.isSafeInteger(m.valorCentavos)||m.valorCentavos<=0||!Number.isInteger(m.dia)||m.dia<1||m.dia>31||!Number.isInteger(m.defasagem)||m.defasagem<0||m.defasagem>2||typeof m.proximoMes!=='string'||!/^\d{2}\/\d{4}$/.test(m.proximoMes)||!parseMesFat(m.proximoMes).m||parseMesFat(m.proximoMes).a<2000||parseMesFat(m.proximoMes).a>2199||typeof m.tags!=='string'||m.tags.length>500||m.perfilGasto!=null&&(!['fixo','variavel',''].includes(m.perfilGasto.tipo||'')||!['essencial','ajustavel',''].includes(m.perfilGasto.prioridade||'')))throw Error('Confira os dados do modelo de recorrência.');
    if(m.perfilGasto!=null)validarPerfilGastoGestor_(m.perfilGasto);
  }
  return linhas;
}
function lerModelosRecorrenciaGestor_(){
  const sh=obterPlanilhaGestor_().getSheetByName(ABA_MODELOS_RECORRENCIA_GESTOR_);
  if(!sh||!sh.getLastRow())return [CAB_MODELOS_RECORRENCIA_GESTOR_];
  const range=sh.getDataRange();if(range.getFormulas().some(r=>r.some(Boolean)))throw Error('Recorrências não aceita fórmulas nos dados.');
  return validarModelosRecorrenciaGestor_(range.getValues());
}
function gravarModelosRecorrenciaGestor_(linhas){
  validarModelosRecorrenciaGestor_(linhas);
  const ss=obterPlanilhaGestor_(),sh=ss.getSheetByName(ABA_MODELOS_RECORRENCIA_GESTOR_)||ss.insertSheet(ABA_MODELOS_RECORRENCIA_GESTOR_);
  sh.getRange(1,1,linhas.length,3).setValues(linhas);sh.setFrozenRows(1);
}
function listarModelosRecorrenciaGestor_(linhas){return linhas.slice(1).map(r=>({id:r[0],...JSON.parse(r[1]),versao:r[2]}));}
function conferirModeloPessoalDuplicadoGestor_(descricao,forma){
  if(listarModelosRecorrenciaGestor_(lerModelosRecorrenciaGestor_()).some(m=>m.ativo&&m.origem==='pessoal'&&normalizarTexto(m.descricao)===normalizarTexto(descricao)&&chaveFormaGestor_(m.forma)===chaveFormaGestor_(forma)))throw Error('Já existe um modelo ativo desta recorrência. Edite o modelo em Recorrências antes de criar outra série.');
}
function obterRecorrenciasWeb(){return executarOperacaoGestor_('obterRecorrenciasWeb',{},()=>({itens:listarModelosRecorrenciaGestor_(lerModelosRecorrenciaGestor_()),erroAutomatico:configProtecaoGestor_().erroRecorrencias||''}),true);}
function dataModeloRecorrenciaGestor_(m){const p=parseMesFat(m.proximoMes);return new Date(p.a,p.m-1,Math.min(m.dia,new Date(p.a,p.m,0).getDate()));}
function competenciaModeloRecorrenciaGestor_(m){const p=parseMesFat(m.proximoMes),d=new Date(p.a,p.m-1+m.defasagem,1);return pad2(d.getMonth()+1)+'/'+d.getFullYear();}
function avancarModeloRecorrenciaGestor_(m){const p=parseMesFat(m.proximoMes),d=new Date(p.a,p.m,1);m.proximoMes=pad2(d.getMonth()+1)+'/'+d.getFullYear();}
function salvarRecorrenciaWeb(p){return executarOperacaoGestor_('salvarRecorrenciaWeb',p,()=>{
  const linhas=lerModelosRecorrenciaGestor_();let idx=p.id?linhas.findIndex(r=>r[0]===p.id):-1;
  if(p.id&&(idx<1||linhas[idx][2]!==p.versao))throw Error('A recorrência mudou. Consulte novamente.');
  const anterior=idx>0?JSON.parse(linhas[idx][1]):null;
  if(p.desativar===true){if(!anterior)throw Error('Recorrência não localizada.');anterior.ativo=false;linhas[idx]=[p.id,JSON.stringify(anterior),p.versao+1];gravarModelosRecorrenciaGestor_(linhas);return {sucesso:true};}
  const m={origem:p.origem,modo:p.modo,ativo:true,descricao:formatarTituloInteligente(p.descricao),forma:validarFormaAtualGestor_(p.forma,{novaCompra:true}),categoria:p.origem==='pessoal'?validarCategoriaAtualGestor_(p.categoria):'',pessoa:p.origem==='terceiros'?formatarTituloInteligente(p.pessoa):'',valorCentavos:centavosGestor_(p.valor),dia:Number(p.dia),defasagem:Number(p.defasagem),proximoMes:p.proximoMes,tags:String(p.tags||''),perfilGasto:p.perfilGasto||null};
  if(m.modo==='automatico'){const c=configProtecaoGestor_();if(!c.ativo||c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor'))throw Error('Ative a proteção automática em Exportar dados e backup antes de usar o registro automático. Você pode usar revisão mensal por enquanto.');}
  if(p.registroOrigem){
    const sh=obterPlanilhaGestor_().getSheetByName('Lançamentos'),r=sh&&lerAbaCompleta(sh,COLUNAS_GESTOR_).raw.find(r=>r[11]===p.registroOrigem);
    if(!r||r[13]!==p.versaoOrigem)throw Error('O lançamento de origem mudou. Abra novamente pelo Histórico.');
    if(limparApostrofo(r[6])!=='1/1')throw Error('Crie o modelo a partir de um gasto à vista, sem alterar uma série parcelada ou recorrente existente.');
    const periodo=parseMesFat(formatarCelulaRegistroGestor_(r[0],'dd/MM/yyyy').slice(3));
    if(parseMesFat(m.proximoMes).time<=periodo.time)throw Error('Inicie após o mês do gasto original, que será preservado.');
  }
  if(anterior&&m.proximoMes!==anterior.proximoMes)throw Error('Edite o valor ou pule o mês antes de alterar o próximo período.');
  if(!anterior){const hoje=getHojeSeguro(),mes=parseMesFat(m.proximoMes);if(!mes.m||mes.time<new Date(hoje.getFullYear(),hoje.getMonth(),1).getTime())throw Error('Inicie a recorrência no mês atual ou em um próximo mês.');}
  const id=p.id||gerarIdGestor_(),r=[id,JSON.stringify(m),idx>0?p.versao+1:1];
  // Uma série ativa com a mesma conta não deve ser criada por outro aparelho.
  if(listarModelosRecorrenciaGestor_(linhas).some(x=>x.id!==id&&x.ativo&&x.origem===m.origem&&normalizarTexto(x.descricao)===normalizarTexto(m.descricao)&&chaveFormaGestor_(x.forma)===chaveFormaGestor_(m.forma)&&normalizarTexto(x.pessoa)===normalizarTexto(m.pessoa)))throw Error('Já existe uma recorrência ativa para esta conta.');
  if(m.origem==='pessoal'){
    const sh=obterPlanilhaGestor_().getSheetByName('Lançamentos');
    if(sh&&lerAbaCompleta(sh,COLUNAS_GESTOR_).raw.some(r=>limparApostrofo(r[6])==='∞/∞'&&!serieRecorrenteGestor_(r).encerrada&&!['Assinatura Cancelada','Pago (Cancelada)'].includes(r[9])&&normalizarTexto(r[1])===normalizarTexto(m.descricao)&&chaveFormaGestor_(r[2])===chaveFormaGestor_(m.forma)))throw Error('Essa conta já possui recorrência automática. Edite ou desative a série existente antes de criar outro modelo.');
  }
  if(idx>0)linhas[idx]=r;else linhas.push(r);gravarModelosRecorrenciaGestor_(linhas);return {sucesso:true,id};
},false);}
function aplicarMesRecorrenciaGestor_(linhas,idx,pular,valor){
  const r=linhas[idx],m=JSON.parse(r[1]);if(!m.ativo)throw Error('Recorrência desativada.');
  if(!pular){
    const centavos=valor===undefined?m.valorCentavos:centavosGestor_(valor);if(centavos<=0)throw Error('Informe um valor maior que zero.');
    const d=dataModeloRecorrenciaGestor_(m),data=pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear(),mes=competenciaModeloRecorrenciaGestor_(m);
    if(d.getTime()>getHojeSeguro().getTime())throw Error('Aguarde a data da cobrança para registrar o mês.');
    const dados={dataCompra:data,descricao:m.descricao,formaPagto:m.forma,valorTotal:centavos/100,numParcelas:1,parcelaInicial:1,mesPrimeiraFatura:mes};
    if(m.origem==='terceiros')salvarEmprestimoWebInterno_({...dados,pessoa:m.pessoa});
    else sincronizarLoteWebInterno_([{...dados,categoria:m.categoria,tags:m.tags,...(m.perfilGasto?{perfilGasto:m.perfilGasto}:{})}]);
    m.valorCentavos=centavos;
  }
  avancarModeloRecorrenciaGestor_(m);linhas[idx]=[r[0],JSON.stringify(m),r[2]+1];
}
function confirmarMesRecorrenciaWeb(p){return executarOperacaoGestor_('confirmarMesRecorrenciaWeb',p,()=>{
  const linhas=lerModelosRecorrenciaGestor_(),idx=linhas.findIndex(r=>r[0]===p.id);
  if(idx<1||linhas[idx][2]!==p.versao||JSON.parse(linhas[idx][1]).proximoMes!==p.mes)throw Error('O mês já foi tratado ou o modelo mudou. Consulte novamente.');
  aplicarMesRecorrenciaGestor_(linhas,idx,p.pular===true,p.valor);gravarModelosRecorrenciaGestor_(linhas);return {sucesso:true};
},false);}
function processarModelosAutomaticosGestor_(){
  if(!CONTEXTO_GESTOR_||CONTEXTO_GESTOR_.somenteLeitura)return;
  const linhas=lerModelosRecorrenciaGestor_(),hoje=getHojeSeguro();let criados=0;
  for(let i=1;i<linhas.length&&criados<12;i++){
    let m=JSON.parse(linhas[i][1]);
    while(m.ativo&&m.modo==='automatico'&&dataModeloRecorrenciaGestor_(m).getTime()<=hoje.getTime()&&criados<12){aplicarMesRecorrenciaGestor_(linhas,i,false);criados++;m=JSON.parse(linhas[i][1]);}
  }
  if(criados)gravarModelosRecorrenciaGestor_(linhas);
  return criados;
}
function rotinaModelosRecorrenciaGestor(){
  // Sem modelos, não abrir diário nem disputar trava com novos lançamentos.
  const c=configProtecaoGestor_();if(!c.ativo||c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))return {criados:0};
  if(!listarModelosRecorrenciaGestor_(lerModelosRecorrenciaGestor_()).some(m=>m.ativo&&m.modo==='automatico'&&dataModeloRecorrenciaGestor_(m).getTime()<=getHojeSeguro().getTime()))return {criados:0};
  return executarOperacaoGestor_('processarModelosRecorrenciaGestor',{requestId:gerarIdGestor_(),baseRestauracao:epocaRestauracaoGestor_()},()=>({criados:processarModelosAutomaticosGestor_()}),false);
}
