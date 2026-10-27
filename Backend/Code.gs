// ============================================================================
// GESTOR FINANCEIRO - BACKEND COMPLETO (APPS SCRIPT)
// ============================================================================
// UTILITÁRIOS GLOBAIS UNIFICADOS (Fuso Horário, Moeda, Datas e Português BR)
// ============================================================================

// O ID fica nas propriedades de cada projeto Apps Script. Assim, o projeto de
// teste pode apontar para a planilha de teste e o projeto de produção para a real.
const CHAVE_ID_PLANILHA_GESTOR = 'GESTOR_PLANILHA_ID';

function obterPlanilhaGestor_() {
  if (CONTEXTO_GESTOR_) return CONTEXTO_GESTOR_.ss;
  const id = PropertiesService.getScriptProperties()
    .getProperty(CHAVE_ID_PLANILHA_GESTOR);
  if (!id || !String(id).trim()) {
    throw new Error('Planilha não configurada. Defina a propriedade de script GESTOR_PLANILHA_ID com o ID da planilha correta.');
  }
  return SpreadsheetApp.openById(String(id).trim());
}

function getTimezone() {
  return Session.getScriptTimeZone() || 'America/Sao_Paulo';
}

function getHojeSeguro() {
  const agoraStr = Utilities.formatDate(new Date(), getTimezone(), 'yyyy-MM-dd');
  const [a, m, d] = agoraStr.split('-').map(Number);
  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

function extractNum(val) {
  if (typeof val === 'number') return val;
  let str = String(val || '0').trim();
  let isNeg = str.includes('-');
  str = str.replace(/[^\d,\.]/g, '');
  if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '');
  str = str.replace(',', '.');
  let num = parseFloat(str) || 0;
  return isNeg ? -num : num;
}

// CORRIGIDO: formatação manual (o toLocaleString do Apps Script nem sempre respeita pt-BR)
function formatBRL(val) {
  const n = Number(val || 0);
  const partes = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '-' : '') + 'R$ ' + partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + partes[1];
}

function normalizarTexto(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseDataBR(str) {
  const limpa = String(str || '').replace(/^'/, '').trim();
  const p = limpa.split('/');
  if (p.length === 3) {
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10), a = parseInt(p[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(a)) return new Date(a, m - 1, d, 0, 0, 0, 0);
  }
  return null;
}

function parseMesFat(str) {
  const limpa = String(str || '').replace(/^'/, '').trim();
  const p = limpa.split('/');
  if (p.length === 2) {
    const m = parseInt(p[0], 10), a = parseInt(p[1], 10);
    if (!isNaN(m) && !isNaN(a)) return { m, a, time: new Date(a, m - 1, 1).getTime() };
  }
  return { m: 0, a: 0, time: 0 };
}

function validarDataCalendarioWeb_(valor, rotulo) {
  const texto = String(valor || '').replace(/^'/, '').trim();
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) throw new Error(rotulo + ' inválida. Use o formato DD/MM/AAAA.');

  const dia = Number(partes[1]), mes = Number(partes[2]), ano = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 ||
      data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new Error(rotulo + ' não existe no calendário. Confira o dia e o mês.');
  }
  return texto;
}

function validarMesFaturaWeb_(valor) {
  const texto = String(valor || '').replace(/^'/, '').trim();
  const partes = texto.match(/^(\d{2})\/(\d{4})$/);
  if (!partes) throw new Error('Mês da fatura inválido. Use o formato MM/AAAA.');

  const mes = Number(partes[1]), ano = Number(partes[2]);
  if (ano < 1900 || mes < 1 || mes > 12) {
    throw new Error('Mês da fatura inválido. Confira o mês e o ano.');
  }
  return texto;
}

function validarLancamentoWeb_(dados, indice) {
  const contexto = indice ? 'Lançamento ' + indice + ': ' : '';
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error(contexto + 'dados inválidos.');
  }
  if (!String(dados.descricao || '').trim()) throw new Error(contexto + 'informe a descrição.');
  if (!String(dados.formaPagto || '').trim()) throw new Error(contexto + 'selecione o cartão ou forma de pagamento.');
  if (!String(dados.categoria || '').trim()) throw new Error(contexto + 'selecione uma categoria.');
  validarDataCalendarioWeb_(dados.dataCompra, contexto + 'data da compra');
  validarMesFaturaWeb_(dados.mesPrimeiraFatura);

  const valor = extractNum(dados.valorTotal);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error(contexto + 'o valor deve ser maior que zero.');

  const isAssinatura = Boolean(dados.isAssinatura);
  const parcelas = (isAssinatura || !permiteParcelamentoFormaGestor_(dados.formaPagto,dados.pixParcelado)) ? 1 : Number(dados.numParcelas || 1);
  const parcelaInicial = (parcelas <= 1) ? 1 : Number(dados.parcelaInicial || 1);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 600) throw new Error(contexto + 'o número de parcelas deve ser um inteiro positivo.');
  if (!Number.isInteger(parcelaInicial) || parcelaInicial < 1 || parcelaInicial > parcelas) {
    throw new Error(contexto + 'a parcela inicial deve estar entre 1 e o total de parcelas.');
  }
}

function parseNumParcela(parcStr) {
  const limpa = String(parcStr || '').replace(/^'/, '').trim();
  if (limpa.includes('/') && limpa !== '∞/∞') {
    const p = limpa.split('/');
    return { atual: parseInt(p[0], 10) || 1, total: parseInt(p[1], 10) || 1 };
  }
  return { atual: 1, total: 1 };
}

function isStatusPago(statusStr) {
  const s = String(statusStr || '').trim().toLowerCase();
  return s === 'pago' || s === 'assinatura paga' || s === 'pago (cancelada)' || s === 'recebido';
}

function isStatusCancelado(statusStr) {
  return ['assinatura cancelada','ocorrência pulada'].includes(String(statusStr || '').trim().toLowerCase());
}

const DICIONARIO_ACENTOS_PT = {
  'acai': 'açaí', 'almoco': 'almoço', 'cafe': 'café', 'pao': 'pão', 'agua': 'água',
  'farmacia': 'farmácia', 'remedio': 'remédio', 'remedios': 'remédios', 'racao': 'ração',
  'veterinario': 'veterinário', 'combustivel': 'combustível', 'oleo': 'óleo',
  'mecanico': 'mecânico', 'hamburguer': 'hambúrguer', 'aniversario': 'aniversário',
  'condominio': 'condomínio', 'informatica': 'informática', 'eletronicos': 'eletrônicos',
  'eletronico': 'eletrônico', 'servicos': 'serviços', 'servico': 'serviço',
  'alimentacao': 'alimentação', 'saude': 'saúde', 'educacao': 'educação',
  'vestuario': 'vestuário', 'cartao': 'cartão', 'salao': 'salão', 'acougue': 'açougue',
  'sacolao': 'sacolão', 'pedagio': 'pedágio', 'taxi': 'táxi', 'clinica': 'clínica',
  'estetica': 'estética', 'inscricao': 'inscrição', 'lampada': 'lâmpada',
  'sache': 'sachê', 'atacadao': 'atacadão', 'assai': 'assaí', 'bistro': 'bistrô',
  'cosmetico': 'cosmético', 'cosmeticos': 'cosméticos', 'oculos': 'óculos',
  'mae': 'mãe', 'irmao': 'irmão', 'irma': 'irmã', 'vo': 'vó', 'tenis': 'tênis',
  'relogio': 'relógio', 'rodizio': 'rodízio', 'porcao': 'porção', 'onibus': 'ônibus',
  'gas': 'gás', 'ipva': 'ipva', 'iptu': 'iptu', 'cartorio': 'cartório'
};

function formatarTituloInteligente(texto) {
  if (!texto) return '';
  const conectivos = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'com', 'por', 'para', 'e', 'ou', 'a', 'o', 'as', 'os', 'ao', 'aos', 'à', 'às']);
  const palavras = String(texto).trim().replace(/\s+/g, ' ').split(' ');

  return palavras.map((palavra, index) => {
    if (!palavra) return '';
    if (palavra === '-' || palavra === '–') return '-';
    if (palavra.length > 1 && palavra === palavra.toUpperCase() && /[A-Z]/.test(palavra)) {
      return palavra;
    }
    let limpa = palavra.toLowerCase();
    const semAcento = normalizarTexto(limpa);
    if (Object.prototype.hasOwnProperty.call(DICIONARIO_ACENTOS_PT, semAcento)) {
      limpa = DICIONARIO_ACENTOS_PT[semAcento];
    }
    const anterior = index > 0 ? palavras[index - 1] : '';
    if (index > 0 && anterior !== '-' && anterior !== '–' && conectivos.has(limpa)) {
      return limpa;
    }
    return limpa.charAt(0).toUpperCase() + limpa.slice(1);
  }).join(' ');
}

// ============================================================================
// MOTOR UNIFICADO: RENOVAÇÃO DE FIXOS + STATUS AUTOMÁTICO + ORDEM CRONOLÓGICA
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💳 Controle Financeiro')
    .addItem('💾 Gravar Lançamento', 'gravarLancamentoDoFormulario')
    .addItem('🧹 Limpar Formulário', 'limparFormulario')
    .addSeparator()
    .addItem('🔄 Atualizar despesas fixas e organização', 'atualizarStatusAutomatico')
    .addSeparator()
    .addItem('Ativar backups e arquivos anuais', 'ativarProtecaoPeloMenuGestor')
    .addItem('Fazer backup no Drive agora', 'backupPeloMenuGestor')
    .addToUi();
}

// CORRIGIDO: o app fica no Vercel; esta página só confirma que a API está no ar
function doGet(e) {
  // A interface hospedada no Apps Script é apenas uma prévia explícita.
  // O /exec de produção continua respondendo como API/health check.
  if (e && e.parameter && e.parameter.preview === '1' && propriedade_("GESTOR_API_BRIDGE_ENABLED") === "true") {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Gestor Financeiro - Teste');
  }
  return ContentService.createTextOutput('API do Gestor Financeiro ativa.');
}

function atualizarStatusAutomaticoInterno_() {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const empSheet = ss.getSheetByName('Empréstimos');
    if (lancSheet) organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    if (empSheet) organizarAbaEmprestimos(empSheet);
  } catch (e) {
    console.error("Erro atualizarStatusAutomatico: " + e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

// Controle da série na coluna técnica existente, separado do pagamento.
function serieRecorrenteGestor_(linha) {
  const texto = String((linha || [])[15] || ''), prefixo = 'gestor-serie-v1:';
  if (texto.indexOf(prefixo) !== 0) return { legado: texto };
  try {
    const info = JSON.parse(texto.substring(prefixo.length));
    if (!info || typeof info !== 'object' || Array.isArray(info) || (info.diaReferencia !== undefined && (!Number.isInteger(info.diaReferencia) || info.diaReferencia < 1 || info.diaReferencia > 31)) || (info.encerrada !== undefined && typeof info.encerrada !== 'boolean')) throw new Error('Controle inválido');
    if (info.encerramentoMes !== undefined) validarMesFaturaWeb_(info.encerramentoMes);
    return info;
  } catch (_) { return { invalida: true }; }
}

function definirSerieRecorrenteGestor_(linha, alteracoes) {
  if (serieRecorrenteGestor_(linha).invalida) throw new Error('O controle desta despesa fixa precisa de conferência. O conteúdo original foi preservado.');
  const info = Object.assign({}, serieRecorrenteGestor_(linha), alteracoes);
  if (!info.legado) delete info.legado;
  linha[15] = 'gestor-serie-v1:' + JSON.stringify(info);
  return linha;
}

function diaReferenciaSerieGestor_(linhas) {
  if (linhas.some(function (r) { return serieRecorrenteGestor_(r).invalida; })) throw new Error('Esta série de despesa fixa precisa de conferência antes de gerar ou alterar parcelas.');
  const comReferencia = linhas.map(serieRecorrenteGestor_).find(function (s) { return Number.isInteger(s.diaReferencia) && s.diaReferencia >= 1 && s.diaReferencia <= 31; });
  if (comReferencia) return comReferencia.diaReferencia;
  const datas = linhas.map(function (r) { return r[0] instanceof Date ? new Date(r[0].getTime()) : parseDataBR(limparApostrofo(r[0])); }).filter(function(d){return d && Number.isFinite(d.getTime());}).sort(function (a, b) { return a.getTime() - b.getTime(); });
  // Não adivinhar que um registro legado no dia 28 começou no dia 31.
  return datas.length ? datas[0].getDate() : 1;
}

function validarTrocaFormaComPagamentoGestor_(linhas, formaNova, emprestimo) {
  if (linhas.some(function (r) { return chaveFormaGestor_(r[emprestimo ? 3 : 2]) !== chaveFormaGestor_(formaNova) && centavosGestor_(valorPagoBancoGestor_(r, emprestimo)) > 0; })) {
    throw new Error('Esta compra já tem pagamento registrado na forma atual. A troca de forma não pode transferir esse pagamento. Confira ou desfaça o pagamento antes de trocar.');
  }
}

function atualizarTotalCompraEmprestimoGestor_(sheet, compraId) {
  if (!compraId || sheet.getLastRow() < 2) return;
  const linhas = sheet.getRange(2, 1, sheet.getLastRow() - 1, COLUNAS_GESTOR_).getValues();
  const grupo = linhas.map(function (r, i) { return { r: r, i: i }; }).filter(function (item) { return String(item.r[12]) === String(compraId); });
  const total = grupo.reduce(function (soma, item) { return soma + centavosGestor_(item.r[7]); }, 0) / 100;
  grupo.forEach(function (item) { sheet.getRange(item.i + 2, 5).setValue(total); });
}

function dataCombinadaEmprestimoGestor_(r){
  const texto=String((r || [])[15] || ''),prefixo='gestor-devolucao-v1:';
  if(!texto.startsWith(prefixo))return '';
  try{return JSON.parse(texto.slice(prefixo.length)).data || '';}catch(_){return '';}
}
function definirDataCombinadaGestor_(r,data){
  if(data)validarDataCalendarioWeb_(data,'Data combinada');
  const texto=String(r[15] || ''),prefixo='gestor-devolucao-v1:';let anterior={legado:texto};
  if(texto.startsWith(prefixo)){try{anterior=JSON.parse(texto.slice(prefixo.length));}catch(_){throw new Error('O controle da devolução precisa de conferência. O conteúdo foi preservado.');}}
  r[15]=prefixo+JSON.stringify({legado:anterior.legado || '',data:data || ''});return r;
}
function planoDatasDevolucaoGestor_(dados,lido,idx){
  const escopo=dados.escopoDataCombinada||'parcela',data=String(dados.dataCombinada||'');
  if(!['parcela','proximas'].includes(escopo))throw Error('Escolha somente esta parcela ou as próximas a receber.');
  if(data)validarDataCalendarioWeb_(data,'Data combinada');
  const alvo=lido.raw[idx],parcelaBase=parseNumParcela(limparApostrofo(lido.disp[idx][6]));
  if(escopo==='proximas'&&alvo[9]!=='A Receber')throw Error('Datas em conjunto só podem ser aplicadas a parcelas a receber.');
  const indices=escopo==='proximas'?indicesMesmaCompra(lido.disp,idx).filter(function(i){const p=parseNumParcela(limparApostrofo(lido.disp[i][6]));return lido.raw[i][9]==='A Receber'&&p.total===parcelaBase.total&&p.atual>=parcelaBase.atual;}):[idx];
  const base=data?parseDataBR(data):null;
  const itens=indices.map(function(i){const p=parseNumParcela(limparApostrofo(lido.disp[i][6])),salto=p.atual-parcelaBase.atual;let nova='';if(base){const dt=new Date(base.getFullYear(),base.getMonth()+salto,1);dt.setDate(Math.min(base.getDate(),new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));nova=Utilities.formatDate(dt,getTimezone(),'dd/MM/yyyy');}return {indice:i,id:String(lido.raw[i][11]),versao:Number(lido.raw[i][13]),mes:lido.disp[i][8],parcela:lido.disp[i][6],antes:dataCombinadaEmprestimoGestor_(lido.raw[i]),depois:nova};}).sort(function(a,b){return parseNumParcela(a.parcela).atual-parseNumParcela(b.parcela).atual||a.id.localeCompare(b.id);});
  return {itens:itens,assinatura:hashGestor_({alvo:String(alvo[11]),escopo:escopo,data:data,itens:itens.map(function(i){return [i.id,i.versao,i.mes,i.parcela,i.antes,i.depois];})})};
}
function previaDatasDevolucaoWeb(param){
  const lido=lerAbaCompleta(obterPlanilhaGestor_().getSheetByName('Empréstimos'),COLUNAS_GESTOR_),idx=localizarIndiceSeguro(lido.disp,param.linha,param.descOriginal,param.mesOriginal,param.parcelaOriginal);
  if(idx<0)throw Error('Parcela não encontrada. Atualize a lista.');
  const p=planoDatasDevolucaoGestor_(param,lido,idx);return {assinatura:p.assinatura,itens:p.itens.map(function(i){return {id:i.id,versao:i.versao,mes:i.mes,parcela:i.parcela,antes:i.antes,depois:i.depois};})};
}
function indicesEdicaoEmprestimoGestor_(lido,idx){
  const parcelas=parseNumParcela(limparApostrofo(lido.disp[idx][6]));
  return indicesMesmaCompra(lido.disp,idx).filter(function(i){return i===idx||(parcelas.total>1&&lido.raw[i][9]!=='Recebido');});
}
function planoPagamentoPixEdicaoGestor_(dados,lido,idx){
  if(formaEmprestimoConsomeLimite_(dados.formaPagto))return null;
  const alvo=lido.raw[idx],indices=indicesEdicaoEmprestimoGestor_(lido,idx);
  if(!indices.some(function(i){return chaveFormaGestor_(lido.disp[i][3])!==chaveFormaGestor_(dados.formaPagto);}))return null;
  validarTrocaFormaComPagamentoGestor_(indices.map(function(i){return lido.raw[i];}),dados.formaPagto,true);
  const itens=indices.map(function(i){return {indice:i,id:String(lido.raw[i][11]),versao:Number(lido.raw[i][13]),forma:lido.disp[i][3],parcela:lido.disp[i][6],mes:lido.disp[i][8],valor:(i===idx||dados.propagarValorParcelas)?centavosGestor_(dados.valorParcela):centavosGestor_(lido.raw[i][7]),pago:centavosGestor_(valorPagoBancoGestor_(lido.raw[i],true))};}).sort(function(a,b){return a.id.localeCompare(b.id);});
  return {itens:itens,total:itens.reduce(function(s,i){return s+i.valor;},0)/100,assinatura:hashGestor_({alvo:String(alvo[11]),forma:dados.formaPagto,itens:itens.map(function(i){return [i.id,i.versao,i.forma,i.parcela,i.mes,i.valor,i.pago];})})};
}
function previaEdicaoEmprestimoWeb(param){
  validarEdicaoGestor_(param,true);
  const lido=lerAbaCompleta(obterPlanilhaGestor_().getSheetByName('Empréstimos'),COLUNAS_GESTOR_),idx=localizarIndiceSeguro(lido.disp,param.linha,param.descOriginal,param.mesOriginal,param.parcelaOriginal);
  if(idx<0)throw Error('Parcela não encontrada. Atualize a lista.');
  const forma=validarFormaAtualGestor_(param.formaPagto,{formaAnterior:lido.disp[idx][3]}),pix=planoPagamentoPixEdicaoGestor_(Object.assign({},param,{formaPagto:forma}),lido,idx);
  return {datas:param.escopoDataCombinada==='proximas'?previaDatasDevolucaoWeb(param):null,pagamentoPix:pix?{assinatura:pix.assinatura,total:pix.total,quantidade:pix.itens.length}:null};
}

function referenciaRecorrenteNoMesGestor_(linhas, mes) {
  const tempo = parseMesFat(mes).time;
  let escolhida = null, referencia = -Infinity;
  linhas.forEach(function(r) {
    const t = parseMesFat(formatarCelulaRegistroGestor_(r[8], 'MM/yyyy')).time;
    if (t > 0 && t <= tempo && t >= referencia) { escolhida = r; referencia = t; }
  });
  return escolhida;
}

function processarAssinaturasAutomaticas(lancSheet) {
  if (!lancSheet || lancSheet.getLastRow() < 2) return;
  const ultimaLinha = lancSheet.getLastRow();
  const data = lancSheet.getRange(2, 1, ultimaLinha - 1, COLUNAS_GESTOR_).getValues();
  const displayData = lancSheet.getRange(2, 1, ultimaLinha - 1, COLUNAS_GESTOR_).getDisplayValues().map(function(d,i) { return valoresExibidosRegistroGestor_(data[i],d); });

  const assinaturas = Object.create(null), linhasPorSerie = Object.create(null), encerradas = new Set(), invalidas = new Set();
  data.forEach(function (r, i) {
    if (limparApostrofo(displayData[i][6]) !== '∞/∞') return;
    const chave = String(r[12] || (normalizarTexto(displayData[i][1]) + '_' + normalizarTexto(displayData[i][2])));
    (linhasPorSerie[chave] || (linhasPorSerie[chave] = [])).push(r);
    if (serieRecorrenteGestor_(r).invalida) invalidas.add(chave);
    if (serieRecorrenteGestor_(r).encerrada || displayData[i][9] === 'Assinatura Cancelada' || displayData[i][9] === 'Pago (Cancelada)') encerradas.add(chave);
  });

  data.forEach((r, idx) => {
    const descStr = String(displayData[idx][1] || '').trim();
    if (!descStr) return;

    const parcela = String(displayData[idx][6] || '').trim();
    const status = String(displayData[idx][9] || '').trim();

    if (parcela === '∞/∞' && status !== 'Assinatura Cancelada' && status !== 'Pago (Cancelada)') {
      const forma = String(displayData[idx][2] || '').trim();
      const chave = String(r[12] || `${normalizarTexto(descStr)}_${normalizarTexto(forma)}`);
      if (encerradas.has(chave) || invalidas.has(chave)) return;
      const dtCompraStr = String(displayData[idx][0] || '').trim();
      const mesFat = String(displayData[idx][8] || '').trim();
      const infoFat = parseMesFat(mesFat);

    if (infoFat.time > 0) {
        // Começar na primeira ocorrência permite preencher lacunas anteriores a
        // uma condição futura. Cada mês escolhe depois a condição vigente nele.
        if (!assinaturas[chave] || infoFat.time < assinaturas[chave].timeReferencia) {
          assinaturas[chave] = {
            linhaBase: r,
            dispBase: displayData[idx],
            dtCompraOriginal: dtCompraStr,
            mesFatAtual: mesFat,
            infoFat: infoFat,
            timeReferencia: infoFat.time
          };
        }
      }
    }
  });

  const hoje = getHojeSeguro();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth() + 1;
  const novasLinhas = [];

  Object.keys(assinaturas).forEach(chave => {
    const ass = assinaturas[chave];
    const mesesParaLancar = (anoHoje - ass.infoFat.a) * 12 + (mesHoje - ass.infoFat.m);

    if (mesesParaLancar > 0) {
      const diaOrig = diaReferenciaSerieGestor_(linhasPorSerie[chave] || [ass.linhaBase]);
      const linhasSerie = linhasPorSerie[chave] || [ass.linhaBase];
      const existentes = new Set(linhasSerie.map(function(r){return formatarCelulaRegistroGestor_(r[8], 'MM/yyyy');}));

      for (let i = 1; i <= mesesParaLancar; i++) {
        const baseFat = new Date(ass.infoFat.a, (ass.infoFat.m - 1) + i, 1);
        const mes = pad2(baseFat.getMonth()+1)+'/'+baseFat.getFullYear();
        if (existentes.has(mes)) continue;
        const ref = referenciaRecorrenteNoMesGestor_(linhasSerie, mes);
        if (!ref) continue;
        const infoRef = parseMesFat(formatarCelulaRegistroGestor_(ref[8], 'MM/yyyy'));
        const dtOrig = parseDataBR(formatarCelulaRegistroGestor_(ref[0], 'dd/MM/yyyy'));
        const diff = (baseFat.getFullYear()-infoRef.a)*12+baseFat.getMonth()+1-infoRef.m;
        const baseCompra = new Date(dtOrig?dtOrig.getFullYear():infoRef.a, (dtOrig?dtOrig.getMonth():infoRef.m-1)+diff, 1);
        const ultimoDiaMesCompra = new Date(baseCompra.getFullYear(), baseCompra.getMonth() + 1, 0).getDate();
        const diaSeguro = Math.min(diaOrig, ultimoDiaMesCompra);
        const nDataStr = "'" + String(diaSeguro).padStart(2, '0') + '/' + String(baseCompra.getMonth() + 1).padStart(2, '0') + '/' + baseCompra.getFullYear();

        const nFatStr = "'" + mes;

        const valParcela = extractNum(ref[7]);
        const novaLinha = [
          nDataStr,
          ref[1],
          ref[2],
          ref[3],
          '',
          '',
          '∞/∞',
          valParcela,
          nFatStr,
          'Assinatura Ativa',
          ref[10] || ''
        ].concat([gerarIdGestor_(), ref[12] || gerarIdGestor_(), 1, 'Em Aberto', ref[15] || '', '', 0]);
        definirSerieRecorrenteGestor_(novaLinha, { diaReferencia: diaOrig, encerrada: false });
        novasLinhas.push(novaLinha);
        existentes.add(mes);
      }
    }
  });

  if (novasLinhas.length > 0) {
    const prox = Math.max(2, lancSheet.getLastRow() + 1);
    lancSheet.getRange(prox, 1, novasLinhas.length, COLUNAS_GESTOR_).setValues(novasLinhas);
    lancSheet.getRange(prox, 5, novasLinhas.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    lancSheet.getRange(prox, 8, novasLinhas.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

function organizarEAtualizarPlanilha(lancSheet, pagtoSheet) {
  if (!lancSheet) return;
  const ultimaLinha = lancSheet.getLastRow();
  if (ultimaLinha < 2) return;

  const diasVencimento = Object.create(null);
  if (pagtoSheet && pagtoSheet.getLastRow() >= 7) {
    const uLP = pagtoSheet.getLastRow();
    const dadosPagto = pagtoSheet.getRange(7, 2, uLP - 6, 5).getValues();
    dadosPagto.forEach(linha => {
      const nome = chaveFormaGestor_(linha[0]);
      const dia = parseInt(linha[4], 10);
      if (nome && !isNaN(dia)) diasVencimento[nome] = dia;
    });
  }

  const numRows = ultimaLinha - 1;
  const range = lancSheet.getRange(2, 1, numRows, COLUNAS_GESTOR_);
  const rawVals = range.getValues();
  const dispVals = range.getDisplayValues();

  const hoje = getHojeSeguro();
  const timeHoje = hoje.getTime();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth() + 1;

  let alterouStatus = false;
  let linhas = [];

  for (let i = 0; i < numRows; i++) {
    const d = valoresExibidosRegistroGestor_(rawVals[i], dispVals[i]);
    const r = rawVals[i];
    const desc = String(d[1] || '').trim();
    const vazia = !desc;

    if (!vazia) {
      const formaLower = chaveFormaGestor_(d[2]);
      const parcela = String(d[6] || '').trim();
      const mesFat = String(d[8] || '').trim();
      let statusAtual = String(d[9] || '').trim();

      const isAssinatura = (parcela === '∞/∞');
      const isPix = ehPixGestor_(d[2]);
      const dtCompra = parseDataBR(d[0]);
      const infoFat = parseMesFat(mesFat);

      if (statusAtual !== 'Assinatura Cancelada' && statusAtual !== 'Pago (Cancelada)') {
        let jaVenceuOuPagou = false;

        // A data de um Pix agendado gera uma pendência, não comprova envio.
        if (!isPix && infoFat.m > 0 && infoFat.a > 0) {
          const diaOrig = diasVencimento[formaLower];
          if (diaOrig) {
            let dataVenc = new Date(infoFat.a, infoFat.m - 1, diaOrig, 0, 0, 0, 0);
            if (dataVenc.getDay() === 0) dataVenc.setDate(dataVenc.getDate() + 1);
            if (dataVenc.getDay() === 6) dataVenc.setDate(dataVenc.getDate() + 2);
            // A data de vencimento só alimenta avisos. O pagamento do cartão
            // depende da confirmação explícita do usuário.
          }
        }

        let novoStatus = statusAtual;
        if (isAssinatura) {
          const isMesPassado = (infoFat.a > 0) && (infoFat.a < anoHoje || (infoFat.a === anoHoje && infoFat.m < mesHoje));
          if (jaVenceuOuPagou || isStatusPago(statusAtual)) {
            novoStatus = isMesPassado ? 'Pago' : 'Assinatura Paga';
          }
        } else {
          if (jaVenceuOuPagou && statusAtual !== 'Pago') {
            novoStatus = 'Pago';
          }
        }

        if (novoStatus !== statusAtual) {
          d[9] = novoStatus;
          r[9] = novoStatus;
          alterouStatus = true;
        }
      }
    }

    const dtObj = parseDataBR(d[0]);
    const fatObj = parseMesFat(d[8]);
    const parcObj = parseNumParcela(d[6]);

    linhas.push({
      raw: r,
      disp: d,
      idxOriginal: i,
      vazia: vazia,
      chaveCompra: `${normalizarTexto(desc)}_${normalizarTexto(d[2])}`,
      timeData: dtObj ? dtObj.getTime() : 0,
      timeFatura: fatObj.time,
      numParcela: parcObj.atual
    });
  }

  const linhasOrdenadas = [...linhas].sort((a, b) => {
    if (a.vazia && b.vazia) return 0;
    if (a.vazia) return 1;
    if (b.vazia) return -1;
    if (a.timeData !== b.timeData) return a.timeData - b.timeData;
    if (a.chaveCompra === b.chaveCompra) {
      if (a.timeFatura !== b.timeFatura) return a.timeFatura - b.timeFatura;
      if (a.numParcela !== b.numParcela) return a.numParcela - b.numParcela;
    }
    return a.idxOriginal - b.idxOriginal;
  });

  let mudouOrdem = false;
  for (let i = 0; i < numRows; i++) {
    if (linhasOrdenadas[i].idxOriginal !== i) {
      mudouOrdem = true;
      break;
    }
  }

  if (mudouOrdem || alterouStatus) {
    const novosValores = linhasOrdenadas.map(item => {
      if (item.vazia) return Array(COLUNAS_GESTOR_).fill('');
      const r = item.raw;
      const d = item.disp;

      const dataStr = String(d[0] || '').replace(/^'/, '').trim();
      const dataProtegida = dataStr ? "'" + dataStr : '';
      const parcStr = String(d[6] || '').replace(/^'/, '').trim();
      const parcProtegida = (parcStr === '∞/∞' || !parcStr) ? parcStr : "'" + parcStr;
      const fatStr = String(d[8] || '').replace(/^'/, '').trim();
      const fatProtegida = fatStr ? "'" + fatStr : '';

      return [
        dataProtegida,
        d[1],
        d[2],
        d[3],
        r[4],
        r[5],
        parcProtegida,
        r[7],
        fatProtegida,
        d[9],
        d[10]
      ].concat(r.slice(11, COLUNAS_GESTOR_));
    });

    range.setValues(novosValores);
    lancSheet.getRange(2, 5, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    lancSheet.getRange(2, 8, Math.max(1, numRows), 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

// CORRIGIDO: agora reordena 6 colunas (B..G) para a coluna "Arquivado" acompanhar o cartão
function organizarFormasPagamento(pagtoSheet) {
  const colunaTipo=garantirTiposFormasGestor_(pagtoSheet);
  const ultimaLinha = pagtoSheet.getLastRow();
  if (ultimaLinha < 7) return;

  const numRows = ultimaLinha - 6;
  const staticRange = pagtoSheet.getRange(7, 2, numRows, 6);
  const staticValues = staticRange.getValues();
  const staticFormulas = staticRange.getFormulas();
  const staticData = staticValues.map(function (r, i) { return r.map(function (v, j) { return staticFormulas[i][j] || v; }); });
  const tipos=pagtoSheet.getRange(7,colunaTipo,numRows,1).getValues();
  const cadastros=staticData.map(function(r,i) { return {valores:r,tipo:tipos[i][0],nome:staticValues[i][0]}; });

  cadastros.sort((a, b) => {
    const nomeA = chaveFormaGestor_(a.nome);
    const nomeB = chaveFormaGestor_(b.nome);
    if (!nomeA && !nomeB) return 0;
    if (!nomeA) return 1;
    if (!nomeB) return -1;
    const isTotalA = a.tipo==='resumo';
    const isTotalB = b.tipo==='resumo';
    const isPixA = a.tipo==='pix';
    const isPixB = b.tipo==='pix';
    if (isTotalA && !isTotalB) return 1;
    if (!isTotalA && isTotalB) return -1;
    if (isPixA && !isPixB) return 1;
    if (!isPixA && isPixB) return -1;
    return 0;
  });
  staticRange.setValues(cadastros.map(function(cadastro) { return cadastro.valores; }));
  pagtoSheet.getRange(7,colunaTipo,numRows,1).setValues(cadastros.map(function(cadastro) { return [cadastro.tipo]; }));
}

// ============================================================================
// MÓDULO DE EMPRÉSTIMOS PARA TERCEIROS - SEPARADO DOS GASTOS PESSOAIS
// ============================================================================

function garantirAbaEmprestimos(ss) {
  let empSheet = ss.getSheetByName('Empréstimos');
  if (!empSheet) {
    empSheet = ss.insertSheet('Empréstimos');
    const headers = [['Data Compra', 'Pessoa / Devedor', 'Descrição da Compra', 'Forma de Pagamento', 'Valor Total', 'Qtd Parcelas', 'Parcela', 'Valor Parcela', 'Mês Fatura', 'Status Recebimento', 'Observações']];
    empSheet.getRange(1, 1, 1, 11).setValues(headers).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    empSheet.setFrozenRows(1);
  }
  return empSheet;
}

function organizarAbaEmprestimos(empSheet) {
  if (!empSheet || empSheet.getLastRow() < 2) return;
  const numRows = empSheet.getLastRow() - 1;
  const range = empSheet.getRange(2, 1, numRows, COLUNAS_GESTOR_);
  const rawVals = range.getValues();
  const dispVals = range.getDisplayValues();

  let linhas = [];
  for (let i = 0; i < numRows; i++) {
    const d = valoresExibidosRegistroGestor_(rawVals[i], dispVals[i]);
    const r = rawVals[i];
    const pessoa = String(d[1] || '').trim();
    const desc = String(d[2] || '').trim();
    const vazia = (!pessoa && !desc);

    const dtObj = parseDataBR(d[0]);
    const fatObj = parseMesFat(d[8]);
    const parcObj = parseNumParcela(d[6]);

    linhas.push({
      raw: r,
      disp: d,
      idxOriginal: i,
      vazia: vazia,
      chaveCompra: `${normalizarTexto(pessoa)}_${normalizarTexto(desc)}_${normalizarTexto(d[3])}`,
      timeData: dtObj ? dtObj.getTime() : 0,
      timeFatura: fatObj.time,
      numParcela: parcObj.atual
    });
  }

  const linhasOrdenadas = [...linhas].sort((a, b) => {
    if (a.vazia && b.vazia) return 0;
    if (a.vazia) return 1;
    if (b.vazia) return -1;
    if (a.timeData !== b.timeData) return a.timeData - b.timeData;
    if (a.chaveCompra === b.chaveCompra) {
      if (a.timeFatura !== b.timeFatura) return a.timeFatura - b.timeFatura;
      if (a.numParcela !== b.numParcela) return a.numParcela - b.numParcela;
    }
    return a.idxOriginal - b.idxOriginal;
  });

  let mudouOrdem = false;
  for (let i = 0; i < numRows; i++) {
    if (linhasOrdenadas[i].idxOriginal !== i) {
      mudouOrdem = true;
      break;
    }
  }

  if (mudouOrdem) {
    const novosValores = linhasOrdenadas.map(item => {
      if (item.vazia) return Array(COLUNAS_GESTOR_).fill('');
      const r = item.raw, d = item.disp;
      const dataStr = String(d[0] || '').replace(/^'/, '').trim();
      const parcStr = String(d[6] || '').replace(/^'/, '').trim();
      const fatStr = String(d[8] || '').replace(/^'/, '').trim();
      return [
        dataStr ? "'" + dataStr : '',
        d[1],
        d[2],
        d[3],
        r[4],
        r[5],
        parcStr ? "'" + parcStr : '',
        r[7],
        fatStr ? "'" + fatStr : '',
        d[9] || 'A Receber',
        d[10] || ''
      ].concat(r.slice(11, COLUNAS_GESTOR_));
    });
    range.setValues(novosValores);
    empSheet.getRange(2, 5, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    empSheet.getRange(2, 8, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

// Dividir Parcela de Empréstimo (Amigo pagou só a metade)
function dividirParcelaEmprestimoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error('Empréstimo não encontrado. Atualize a lista.');

    const lido = lerAbaCompleta(empSheet, COLUNAS_GESTOR_);
    const dispAll = lido.disp, rawAll = lido.raw;

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Parcela não localizada.');

    if (String(rawAll[idxAlvo][9]) === 'Recebido') throw new Error('Esta parcela já foi recebida. Atualize a lista.');
    const valorOriginalParc = centavosGestor_(rawAll[idxAlvo][7]);
    const recebidoCentavos = centavosGestor_(dados.valorRecebido);
    const valorRecebido = recebidoCentavos / 100;
    const valorRestante = (valorOriginalParc - recebidoCentavos) / 100;

    if (valorRecebido <= 0 || valorRestante <= 0) {
      throw new Error("O valor recebido deve ser menor que o total da parcela e maior que zero.");
    }

    const pagoBancoOriginal = centavosGestor_(valorPagoBancoGestor_(rawAll[idxAlvo], true));
    const pagoBancoRecebido = Math.floor(pagoBancoOriginal * centavosGestor_(valorRecebido) / valorOriginalParc) / 100;
    if (rawAll[idxAlvo][14] !== 'Pago') empSheet.getRange(idxAlvo + 2, 18).setValue((pagoBancoOriginal - centavosGestor_(pagoBancoRecebido)) / 100);
    empSheet.getRange(idxAlvo + 2, 8).setValue(valorRestante);

    const d = dispAll[idxAlvo];
    const r = rawAll[idxAlvo];
    const dtStr = String(d[0] || '').replace(/^'/, '').trim();
    const pStr = String(d[6] || '').replace(/^'/, '').trim();
    const mStr = String(d[8] || '').replace(/^'/, '').trim();

    const novaLinhaPago = [
      dtStr ? "'" + dtStr : '',
      d[1],
      d[2],
      d[3],
      r[4],
      r[5],
      pStr ? "'" + pStr : '',
      valorRecebido,
      mStr ? "'" + mStr : '',
      'Recebido',
      String(d[10] || '') + ' (Pagamento Parcial)'
    ].concat([gerarIdGestor_(), r[12], 1, r[14], r[15], '', pagoBancoRecebido]);

    const prox = empSheet.getLastRow() + 1;
    empSheet.getRange(prox, 1, 1, COLUNAS_GESTOR_).setValues([novaLinhaPago]);
    empSheet.getRange(prox, 5).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    empSheet.getRange(prox, 8).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');

    organizarAbaEmprestimos(empSheet);
    return { sucesso: true, recebido: valorRecebido, restante: valorRestante };
  } catch (e) {
    throw new Error('Erro ao dividir parcela: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function alternarStatusEmprestimoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error('Empréstimo não encontrado. Atualize a lista.');

    const dispAll = lerAbaCompleta(empSheet, COLUNAS_GESTOR_).disp;

    if (dados.quitarMesPessoa) {
      const pessoaAlvo = normalizarTexto(dados.pessoa);
      const mesAlvo = String(dados.mesFatura || '').replace(/^'/, '').trim();
      const itens=dados.itensConferidos;
      if(!pessoaAlvo || !Array.isArray(itens) || !itens.length || itens.length>6000) throw new Error('Confira os itens e o total antes de receber em lote.');
      const ids=new Set(), alvos=[],indicesPorId=new Map(dispAll.map(function(r,i){return [String(r[11]),i];})); let total=0;
      itens.forEach(function(item) {
        const id=String(item.id || '');
        if(!id || ids.has(id)) throw new Error('Conjunto de parcelas inválido. Atualize a lista.');
        ids.add(id);
        const i=indicesPorId.get(id);
        if(!Number.isInteger(i) || Number(dispAll[i][13])!==Number(item.versao) || !Number.isInteger(Number(item.versao)) || normalizarTexto(dispAll[i][1])!==pessoaAlvo || (mesAlvo && limparApostrofo(dispAll[i][8])!==mesAlvo) || dispAll[i][9]!=='A Receber') throw new Error('Uma parcela mudou depois da conferência. Atualize a lista antes de receber.');
        total+=centavosGestor_(dispAll[i][7]); alvos.push(i);
      });
      if(total<=0 || total!==centavosGestor_(dados.totalConferido)) throw new Error('O total das parcelas mudou. Confira novamente antes de receber.');
      const estados=empSheet.getRange(2,10,uL-1,1).getValues();
      alvos.forEach(function(i) { estados[i][0]='Recebido'; });
      empSheet.getRange(2,10,uL-1,1).setValues(estados);
      return { sucesso: true, qtd: alvos.length, totalRecebido:total/100 };
    }

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0) throw new Error('Parcela de empréstimo não localizada.');

    const stAtual = String(dispAll[idxAlvo][9] || '').trim();
    const novoStatus = String(dados.statusDesejado || '');
    if (['Recebido', 'A Receber'].indexOf(novoStatus) < 0) throw new Error('Informe a situação desejada. Atualize o app.');
    empSheet.getRange(idxAlvo + 2, 10).setValue(novoStatus);

    return { sucesso: true, novoStatus: novoStatus };
  } catch (e) {
    throw new Error('Erro ao atualizar empréstimo: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function excluirEmprestimoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error('Empréstimo não encontrado. Atualize a lista.');

    const dispAll = lerAbaCompleta(empSheet, COLUNAS_GESTOR_).disp;
    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0) throw new Error('Registro não encontrado.');

    const linhaInt = idxAlvo + 2;
    const compraId=dispAll[idxAlvo][12];
    if (!dados.excluirTodasParcelas) {
      empSheet.deleteRow(linhaInt);
    } else {
      const linhasApagar = indicesMesmaCompra(dispAll, idxAlvo).filter(function (i) { return i === idxAlvo || String(dispAll[i][9] || '').trim() !== 'Recebido'; }).map(function (i) { return i + 2; });
      linhasApagar.sort((a, b) => b - a).forEach(l => empSheet.deleteRow(l));
    }
    atualizarTotalCompraEmprestimoGestor_(empSheet,compraId);
    organizarAbaEmprestimos(empSheet);
    return { sucesso: true };
  } catch (e) {
    throw new Error('Erro ao excluir empréstimo: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function editarEmprestimoLinhaWebInterno_(dados) {
  validarEdicaoGestor_(dados, true);
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);

    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error("Aba de empréstimos vazia.");
    const rangeAll = empSheet.getRange(2, 1, uL - 1, COLUNAS_GESTOR_);
    const rawAll = rangeAll.getValues();
    const dispAll = rangeAll.getDisplayValues().map(function(d,i){return valoresExibidosRegistroGestor_(rawAll[i],d);});

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= rawAll.length) throw new Error("Parcela do empréstimo não encontrada.");
    const planoDatas=dados.escopoDataCombinada==='proximas'?planoDatasDevolucaoGestor_(dados,{raw:rawAll,disp:dispAll},idxAlvo):null;
    if(planoDatas&&(!dados.assinaturaDatas||dados.assinaturaDatas!==planoDatas.assinatura))throw Error('As datas ou parcelas mudaram desde a prévia. Confira novamente antes de salvar.');
    dados = Object.assign({}, dados, { formaPagto: validarFormaAtualGestor_(dados.formaPagto, { formaAnterior: dispAll[idxAlvo][3] }) });
    const planoPix=planoPagamentoPixEdicaoGestor_(dados,{raw:rawAll,disp:dispAll},idxAlvo);
    if(planoPix&&(dados.confirmarPagamentoPix!==true||dados.assinaturaPix!==planoPix.assinatura))throw Error('Confira a prévia e confirme o pagamento realizado via Pix antes de salvar.');

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origPessoa = String(dispAll[idxAlvo][1] || '').trim();
    const origDesc = String(dispAll[idxAlvo][2] || '').trim();
    const origForma = String(dispAll[idxAlvo][3] || '').trim();
    const origMesFat = String(dispAll[idxAlvo][8] || '').replace(/^'/, '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();

    const pessoaFmt = formatarTituloInteligente(dados.pessoa);
    const descFmt = formatarTituloInteligente(dados.descricao);
    const valorFloat = centavosGestor_(dados.valorParcela) / 100;
    const novaDataFmt = "'" + String(dados.dataCompra || '').replace(/^'/, '').trim();
    const novoMesFatLimpo = String(dados.mesFatura || '').replace(/^'/, '').trim();
    const novoMesFatFmt = "'" + novoMesFatLimpo;

    const infoParcAlvo = parseNumParcela(parcStr);
    const totalParcelas = infoParcAlvo.total;
    const propagarValor = Boolean(dados.propagarValorParcelas);
    const mudouMesFat = (novoMesFatLimpo !== origMesFat);
    const infoNovoMes = parseMesFat(novoMesFatLimpo);
    const grupoCompra = indicesMesmaCompra(dispAll, idxAlvo);
    validarTrocaFormaComPagamentoGestor_(indicesEdicaoEmprestimoGestor_({raw:rawAll,disp:dispAll},idxAlvo).map(function (i) { return rawAll[i]; }), dados.formaPagto, true);

    rawAll[idxAlvo][0] = novaDataFmt;
    rawAll[idxAlvo][1] = pessoaFmt;
    rawAll[idxAlvo][2] = descFmt;
    rawAll[idxAlvo][3] = dados.formaPagto;
    rawAll[idxAlvo][6] = "'" + parcStr;
    rawAll[idxAlvo][7] = valorFloat;
    rawAll[idxAlvo][8] = novoMesFatFmt;
    rawAll[idxAlvo][9] = dados.status;
    rawAll[idxAlvo][10] = dados.observacoes || '';
    if(dados.dataCombinada!==undefined)definirDataCombinadaGestor_(rawAll[idxAlvo],dados.dataCombinada);

    if (totalParcelas > 1) {
      indicesMesmaCompra(dispAll, idxAlvo); // Bloqueia grupos legados ambíguos.
      const sufixoParc = '/' + totalParcelas;
      let indicesMesmaCompraEmp = [idxAlvo];

      for (let i = 0; i < rawAll.length; i++) {
        if (i === idxAlvo) continue;
        const d = dispAll[i];
        const pAtual = String(d[6] || '').replace(/^'/, '').trim();
        const stAtual = String(d[9] || '').trim();

        if (
          String(d[12] || '') === String(dispAll[idxAlvo][12] || '')
        ) {
          indicesMesmaCompraEmp.push(i);
          if (stAtual !== 'Recebido') {
            rawAll[i][0] = novaDataFmt;
            rawAll[i][1] = pessoaFmt;
            rawAll[i][2] = descFmt;
            rawAll[i][3] = dados.formaPagto;
            rawAll[i][6] = "'" + pAtual;

            if (propagarValor) {
              rawAll[i][7] = valorFloat;
            }

            if (mudouMesFat && infoNovoMes.time > 0) {
              const infoP = parseNumParcela(pAtual);
              const diffParc = infoP.atual - infoParcAlvo.atual;
              if (diffParc > 0) {
                const dtCascata = new Date(infoNovoMes.a, (infoNovoMes.m - 1) + diffParc, 1);
                rawAll[i][8] = "'" + String(dtCascata.getMonth() + 1).padStart(2, '0') + '/' + dtCascata.getFullYear();
              } else {
                rawAll[i][8] = "'" + String(d[8] || '').replace(/^'/, '').trim();
              }
            } else {
              rawAll[i][8] = "'" + String(d[8] || '').replace(/^'/, '').trim();
            }
          }
        }
      }

    }
    // Partes de recebimentos sucessivos continuam pertencendo à mesma compra,
    // mesmo quando a parcela é 1/1.
    const somaRealTotal = grupoCompra.reduce(function (soma, i) { return soma + centavosGestor_(rawAll[i][7]); }, 0) / 100;
    grupoCompra.forEach(function (i) { rawAll[i][4] = somaRealTotal; });

    for (let i = 0; i < rawAll.length; i++) {
      if (i === idxAlvo) continue;
      const d = dispAll[i];
      if (!String(d[1] || '').trim()) continue;
      if (!String(rawAll[i][0]).startsWith("'")) rawAll[i][0] = "'" + String(d[0] || '').replace(/^'/, '').trim();
      const p = String(d[6] || '').replace(/^'/, '').trim();
      if (p && p !== '∞/∞' && !String(rawAll[i][6]).startsWith("'")) rawAll[i][6] = "'" + p;
      if (!String(rawAll[i][8]).startsWith("'")) rawAll[i][8] = "'" + String(d[8] || '').replace(/^'/, '').trim();
    }

    if(planoDatas)planoDatas.itens.forEach(function(i){definirDataCombinadaGestor_(rawAll[i.indice],i.depois);});
    if(planoPix)planoPix.itens.forEach(function(i){rawAll[i.indice][14]='Pago';rawAll[i.indice][17]=i.valor/100;});
    rangeAll.setValues(rawAll);
    empSheet.getRange(2, 5, uL - 1, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    empSheet.getRange(2, 8, uL - 1, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');

    organizarAbaEmprestimos(empSheet);
    return { sucesso: true };
  } catch (e) {
    throw new Error('Falha ao editar empréstimo: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// MOVER COMPRA INTEIRA (TODAS AS PARCELAS) DE "LANÇAMENTOS" PARA "EMPRÉSTIMOS"
function moverParaEmprestimosWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(12000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const empSheet = garantirAbaEmprestimos(ss);

    const pessoaFmt = formatarTituloInteligente(dados.pessoa || '');
    if (!pessoaFmt) throw new Error('Informe o nome da pessoa para mover o lançamento.');

    const uL = lancSheet.getLastRow();
    if (uL < 2) throw new Error('Planilha de lançamentos vazia.');
    const lido = lerAbaCompleta(lancSheet, COLUNAS_GESTOR_);
    const rawAll = lido.raw, dispAll = lido.disp;

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Lançamento original não encontrado.');
    validarFormaAtualGestor_(dispAll[idxAlvo][2], { formaAnterior: dispAll[idxAlvo][2] });

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origDesc = String(dispAll[idxAlvo][1] || '').trim();
    const origForma = String(dispAll[idxAlvo][2] || '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();
    if (parcStr === '∞/∞') throw new Error('Despesas fixas não podem ser movidas como uma compra parcelada. Encerre a recorrência e registre o empréstimo avulso separadamente.');
    const infoParc = parseNumParcela(parcStr);
    const sufixo = '/' + infoParc.total;

    const indicesParaMover = indicesMesmaCompra(dispAll, idxAlvo);

    indicesParaMover.sort((a, b) => a - b);
    const novasLinhasEmp = indicesParaMover.map(idx => {
      const r = rawAll[idx], d = dispAll[idx];
      const dtClean = String(d[0] || '').replace(/^'/, '').trim();
      const pClean = String(d[6] || '').replace(/^'/, '').trim() || '1/1';
      const fatClean = String(d[8] || '').replace(/^'/, '').trim();
      const valParc = extractNum(r[7]);
      const valTot = extractNum(r[4]) || (valParc * infoParc.total);
      const jaPago = isStatusPago(d[9]);

      return [
        "'" + dtClean,
        pessoaFmt,
        d[1],
        d[2],
        valTot,
        infoParc.total,
        "'" + pClean,
        valParc,
        "'" + fatClean,
        'A Receber',
        d[10] || ''
      ].concat([r[11], r[12], r[13], jaPago ? 'Pago' : 'Em Aberto', r[15], r[16], r[17] || 0]);
    });

    const proxEmp = Math.max(2, empSheet.getLastRow() + 1);
    empSheet.getRange(proxEmp, 1, novasLinhasEmp.length, COLUNAS_GESTOR_).setValues(novasLinhasEmp);
    empSheet.getRange(proxEmp, 5, novasLinhasEmp.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    empSheet.getRange(proxEmp, 8, novasLinhasEmp.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');

    const linhasPlanilha = indicesParaMover.map(i => i + 2).sort((a, b) => b - a);
    linhasPlanilha.forEach(numLinha => lancSheet.deleteRow(numLinha));

    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    organizarAbaEmprestimos(empSheet);

    return { sucesso: true, qtdMovida: novasLinhasEmp.length, pessoa: pessoaFmt };
  } catch (e) {
    throw new Error('Falha ao mover para empréstimos: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// MOVER COMPRA (TODAS AS PARCELAS) DE VOLTA PARA "LANÇAMENTOS" PESSOAIS
function moverParaGastosPessoaisWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(12000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const empSheet = garantirAbaEmprestimos(ss);

    const catFmt = validarCategoriaAtualGestor_(dados.categoria);
    const tagsFmt = normalizarTagsGestor_(dados.tags);

    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error('Planilha de empréstimos vazia.');
    const lido = lerAbaCompleta(empSheet, COLUNAS_GESTOR_);
    const rawAll = lido.raw, dispAll = lido.disp;

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Empréstimo original não encontrado.');
    validarFormaAtualGestor_(dispAll[idxAlvo][3], { formaAnterior: dispAll[idxAlvo][3] });

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origPessoa = String(dispAll[idxAlvo][1] || '').trim();
    const origDesc = String(dispAll[idxAlvo][2] || '').trim();
    const origForma = String(dispAll[idxAlvo][3] || '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();
    const infoParc = parseNumParcela(parcStr);
    const sufixo = '/' + infoParc.total;

    const indicesParaMover = indicesMesmaCompra(dispAll, idxAlvo);

    indicesParaMover.sort((a, b) => a - b);
    const novasLinhasLanc = indicesParaMover.map(idx => {
      const r = rawAll[idx], d = dispAll[idx];
      const dtClean = String(d[0] || '').replace(/^'/, '').trim();
      const pClean = String(d[6] || '').replace(/^'/, '').trim() || '1/1';
      const fatClean = String(d[8] || '').replace(/^'/, '').trim();
      const valParc = extractNum(r[7]);
      const valTot = extractNum(r[4]) || (valParc * infoParc.total);
      const pagoBanco = valorPagoBancoGestor_(r, true);
      if (String(d[9] || '').trim() === 'Recebido') throw new Error('Esta compra possui valores já recebidos. A transferência foi interrompida para preservar esses recebimentos. Confira o histórico e, se o recebimento foi um engano, use a ação explícita de desfazer antes de mover.');

      return [
        "'" + dtClean,
        d[2],
        d[3],
        catFmt,
        valTot,
        infoParc.total,
        "'" + pClean,
        valParc,
        "'" + fatClean,
        (r[14] === 'Pago' || centavosGestor_(pagoBanco) >= centavosGestor_(valParc)) ? 'Pago' : 'Em Aberto',
        tagsFmt
      ].concat([r[11], r[12], r[13], r[14] || 'Em Aberto', r[15], r[16], pagoBanco]);
    });

    const proxLanc = Math.max(2, lancSheet.getLastRow() + 1);
    lancSheet.getRange(proxLanc, 1, novasLinhasLanc.length, COLUNAS_GESTOR_).setValues(novasLinhasLanc);
    lancSheet.getRange(proxLanc, 5, novasLinhasLanc.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    lancSheet.getRange(proxLanc, 8, novasLinhasLanc.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');

    const linhasPlanilha = indicesParaMover.map(i => i + 2).sort((a, b) => b - a);
    linhasPlanilha.forEach(numLinha => empSheet.deleteRow(numLinha));

    organizarAbaEmprestimos(empSheet);
    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);

    return { sucesso: true, qtdMovida: novasLinhasLanc.length };
  } catch (e) {
    throw new Error('Falha ao mover para gastos pessoais: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// FORMULÁRIO INTERNO DA PLANILHA E SINCRONIZAÇÃO EM LOTE OFFLINE
// ============================================================================

function gravarLancamentoDoFormulario() {
  const ss = obterPlanilhaGestor_();
  const formSheet = ss.getSheetByName('Formulário de Lançamento');
  if (!formSheet) return;

  try {
    const displayVals = formSheet.getRange('D6:D14').getDisplayValues();
    const rawVals = formSheet.getRange('D6:D14').getValues();

    const descricao = formatarTituloInteligente(String(rawVals[1][0] || '').trim());
    const formaPagto = String(rawVals[2][0] || '').trim();
    const valorTotal = extractNum(rawVals[4][0]);

    if (!descricao || !formaPagto || valorTotal <= 0) {
      SpreadsheetApp.getUi().alert('Preencha Descrição, Forma de Pagamento e Valor.');
      return;
    }

    sincronizarLoteWeb([{
      dataCompra: displayVals[0][0],
      descricao: descricao,
      formaPagto: formaPagto,
      categoria: String(rawVals[3][0] || '').trim(),
      valorTotal: valorTotal,
      numParcelas: parseInt(rawVals[5][0], 10) || 1,
      parcelaInicial: parseInt(rawVals[6][0], 10) || 1,
      mesPrimeiraFatura: displayVals[7][0],
      statusInicial: String(rawVals[8][0] || 'Em Aberto').trim(),
      isAssinatura: false,
      tags: '',
      requestId: gerarIdGestor_()
    }]);

    limparFormulario();
    ss.toast('Lançamento gravado e organizado com sucesso!', 'Sucesso', 3);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Erro: ' + err.message);
  }
}

function limparFormulario() {
  const ss = obterPlanilhaGestor_();
  const formSheet = ss.getSheetByName('Formulário de Lançamento');
  if (!formSheet) return;

  const hoje = Utilities.formatDate(getHojeSeguro(), getTimezone(), 'dd/MM/yyyy');
  formSheet.getRange('D6').setValue(hoje);
  formSheet.getRange('D7').setValue('');
  formSheet.getRange('D10').setValue(0);
  formSheet.getRange('D11').setValue(1);
  formSheet.getRange('D12').setValue(1);
}

function sincronizarLoteWebInterno_(loteOffline) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    if (!Array.isArray(loteOffline) || loteOffline.length === 0) {
      throw new Error('A fila de sincronização está vazia ou inválida.');
    }
    // Validar o lote inteiro antes de escrever qualquer linha evita sincronização parcial
    // causada por um item com data, valor ou parcelas inválidos.
    loteOffline.forEach((dados, i) => validarLancamentoWeb_(dados, i + 1));

    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const hoje = getHojeSeguro();
    let novasLinhasGerais = [];

    loteOffline.forEach(dados => {
      const formaAtual = validarFormaAtualGestor_(dados.formaPagto, { novaCompra: true });
      const categoriaAtual = validarCategoriaAtualGestor_(dados.categoria);
      const descFormatada = formatarTituloInteligente(dados.descricao);
      const valorTotal = centavosGestor_(dados.valorTotal) / 100;
      const isPix = ehPixGestor_(formaAtual);
      const isAssinatura = Boolean(dados.isAssinatura);

      let numParcelas = 1, parcelaInicial = 1;
      if (!isAssinatura && permiteParcelamentoFormaGestor_(formaAtual,dados.pixParcelado)) {
        numParcelas = Math.max(1, parseInt(dados.numParcelas, 10) || 1);
        parcelaInicial = Math.max(1, parseInt(dados.parcelaInicial, 10) || 1);
        if (parcelaInicial > numParcelas) parcelaInicial = 1;
      }

      const valoresParcelas = parcelasCentavosGestor_(valorTotal, numParcelas);
      if (valoresParcelas.some(function (v) { return v <= 0; })) throw new Error('Cada parcela deve ter pelo menos um centavo.');
      if (isAssinatura) { const existentes = lerAbaCompleta(lancSheet, COLUNAS_GESTOR_).disp; if (existentes.some(function (r) { return limparApostrofo(r[6]) === '∞/∞' && !serieRecorrenteGestor_(r).encerrada && r[9] !== 'Assinatura Cancelada' && r[9] !== 'Pago (Cancelada)' && normalizarTexto(r[1]) === normalizarTexto(descFormatada) && chaveFormaGestor_(r[2]) === chaveFormaGestor_(formaAtual); })) throw new Error('Já existe uma assinatura ativa com esta descrição e forma de pagamento. Edite a assinatura existente.'); }
      let mesFat = hoje.getMonth() + 1, anoFat = hoje.getFullYear();
      if (dados.mesPrimeiraFatura && dados.mesPrimeiraFatura.includes('/')) {
        const p = String(dados.mesPrimeiraFatura).replace(/^'/, '').split('/');
        mesFat = parseInt(p[0], 10);
        anoFat = parseInt(p[1], 10);
      }

      const dtCompra = parseDataBR(dados.dataCompra);
      const dtCompraStr = String(dados.dataCompra || '').replace(/^'/, '').trim();
      let statusPadrao = 'Em Aberto';
      if (isAssinatura) {
        statusPadrao = ehPagamentoImediatoGestor_(formaAtual) && dtCompra && dtCompra.getTime() <= hoje.getTime() ? 'Assinatura Paga' : 'Assinatura Ativa';
      } else if (ehPagamentoImediatoGestor_(formaAtual)) {
        statusPadrao = (dtCompra && dtCompra.getTime() > hoje.getTime()) ? 'Agendado' : 'Pago';
      }

      const parcelasLoop = isAssinatura ? 1 : numParcelas;
      for (let p = parcelaInicial; p <= parcelasLoop; p++) {
        const idx = p - parcelaInicial;
        const dRef = new Date(anoFat, (mesFat - 1) + idx, 1);
        const mFmt = String(dRef.getMonth() + 1).padStart(2, '0');
        const aFmt = dRef.getFullYear();
        const pTxt = isAssinatura ? '∞/∞' : "'" + p + "/" + numParcelas;

        novasLinhasGerais.push([
          "'" + dtCompraStr,
          descFormatada,
          formaAtual,
          categoriaAtual,
          isAssinatura ? '' : valorTotal,
          isAssinatura ? '' : numParcelas,
          pTxt,
          valoresParcelas[p - 1],
          "'" + mFmt + '/' + aFmt,
          isPix && numParcelas > 1 && (idx > 0 || dRef.getFullYear() > hoje.getFullYear() || (dRef.getFullYear() === hoje.getFullYear() && dRef.getMonth() > hoje.getMonth())) ? 'Em Aberto' : statusPadrao,
          normalizarTagsGestor_(dados.tags)
        ]);
      }
    });

    if (novasLinhasGerais.length > 0) {
      const prox = Math.max(2, lancSheet.getLastRow() + 1);
      lancSheet.getRange(prox, 1, novasLinhasGerais.length, 11).setValues(novasLinhasGerais);
      lancSheet.getRange(prox, 5, novasLinhasGerais.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
      lancSheet.getRange(prox, 8, novasLinhasGerais.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
      organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    }
    return { sucesso: true, qtd: loteOffline.length };
  } catch (e) {
    throw new Error('Falha ao sincronizar lote: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function sincronizarLoteWeb(loteOffline) {
  if (!Array.isArray(loteOffline) || !loteOffline.length) throw new Error('Fila inválida.');
  loteOffline.forEach(function (d, i) { validarLancamentoWeb_(d, i + 1); if (!/^[A-Za-z0-9_.:-]{8,160}$/.test(String(d.requestId || ''))) throw new Error('Atualize o app: lançamento sem identificação segura.'); });
  const ids = [];
  for (let i = 0; i < loteOffline.length; i++) {
    const item = loteOffline[i];
    try { executarOperacaoGestor_('salvarLancamentoWeb', item, function () { return sincronizarLoteWebInterno_([item]); }, false); ids.push(item.requestId); }
    catch (e) { return { sucesso: false, completo: false, qtd: ids.length, requestIds: ids, erro: e.message, resultadoIncerto: e.resultadoIncerto === true }; }
  }
  return { sucesso: true, completo: true, qtd: ids.length, requestIds: ids };
}
function salvarLancamentoWeb(dados) {
  return executarOperacaoGestor_('salvarLancamentoWeb', dados, function () { return sincronizarLoteWebInterno_([dados]); }, false);
}

// ============================================================================
// LEITURA GERAL DO SISTEMA (DASHBOARD, LIMITES, EMPRÉSTIMOS, TAGS E METAS)
// ============================================================================

function calcularAlertasVencimento_(formas, lancamentos, hoje) {
  const cartoes = Object.create(null);
  formas.forEach(function (f) {
    const nome = chaveFormaGestor_(f.nome);
    const dia = parseInt(f.vencimento, 10);
    if (tipoFormaGestor_(f.nome) === 'cartao' && dia >= 1 && dia <= 31) {
      cartoes[nome] = { nome: f.nome, dia: dia };
    }
  });
  const faturas = Object.create(null);
  const hojeUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  lancamentos.forEach(function (item) {
    const d = item.disp;
    if (isStatusPago(d[9]) || isStatusCancelado(d[9])) return;
    const cartao = cartoes[chaveFormaGestor_(d[2])];
    const mes = limparApostrofo(d[8]);
    if (!cartao || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(mes)) return;
    const partes = mes.split('/').map(Number);
    const ultimoDia = new Date(partes[1], partes[0], 0).getDate();
    const dia = Math.min(cartao.dia, ultimoDia);
    const dias = Math.round((Date.UTC(partes[1], partes[0] - 1, dia) - hojeUTC) / 86400000);
    const valor = extractNum(item.raw[7]) - valorPagoBancoGestor_(item.raw, false);
    if (dias > 7 || valor <= 0) return;
    const chave = chaveFormaGestor_(cartao.nome) + '|' + mes;
    if (!faturas[chave]) faturas[chave] = { forma: cartao.nome, mes: mes, data: pad2(dia) + '/' + mes, dias: dias, valorRaw: 0 };
    faturas[chave].valorRaw += valor;
  });
  return Object.values(faturas).map(function (f) {
    f.valorRaw = arred2(f.valorRaw);
    f.valor = formatBRL(f.valorRaw);
    return f;
  }).sort(function (a, b) { return a.dias - b.dias || a.forma.localeCompare(b.forma); });
}

function getDadosCompletos() {
  const obterMaisFrequente = (mapaContagem, ultimoUsado) => {
    let melhorChave = ultimoUsado || '';
    let maiorQtd = -1;
    for (const k of Object.keys(mapaContagem)) {
      if (mapaContagem[k] > maiorQtd || (mapaContagem[k] === maiorQtd && k === ultimoUsado)) {
        maiorQtd = mapaContagem[k];
        melhorChave = k;
      }
    }
    return melhorChave;
  };

  try {
    const ss = obterPlanilhaGestor_();
    const dashSheet = ss.getSheetByName('Dashboard & Resumo');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lancSheet = ss.getSheetByName('Lançamentos');
    const notasSheet = ss.getSheetByName('Anotações');
    // Cria a aba uma única vez, inclusive antes do primeiro empréstimo. O lock
    // evita que duas primeiras cargas tentem criá-la ao mesmo tempo.
    let empSheet = ss.getSheetByName('Empréstimos');
    if (!empSheet) {
      const lockCriacaoEmprestimos = obterLockGestor_();
      lockCriacaoEmprestimos.waitLock(10000);
      try { empSheet = garantirAbaEmprestimos(ss); }
      finally { lockCriacaoEmprestimos.releaseLock(); }
    }
    const nomesConfigCat = listarNomesCategoriasConfig(dashSheet);

    // CORRIGIDO: manutenção da planilha agora protegida por lock (evita conflito com gravações)
    const lockMant = obterLockGestor_();
    const temLock = precisaManutencaoLeituraGestor_() && lockMant.tryLock(20000);
    if (temLock) {
      try {
        if (pagtoSheet) organizarFormasPagamento(pagtoSheet);
        if (lancSheet) {
          processarAssinaturasAutomaticas(lancSheet);
          organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
        }
        if (empSheet) organizarAbaEmprestimos(empSheet);
      } finally {
        lockMant.releaseLock();
      }
    }

    let listaFormasPagto = [];
    let mapLowerToOriginal = Object.create(null);
    if (pagtoSheet && pagtoSheet.getLastRow() >= 7) {
      const uL = pagtoSheet.getLastRow();
      const rawP = pagtoSheet.getRange(7, 2, uL - 6, 8).getValues();
      const dispP = pagtoSheet.getRange(7, 2, uL - 6, 8).getDisplayValues();
      rawP.forEach((r, idx) => {
        if (r[0] && String(r[0]).trim() !== '') {
          let n = String(r[0]).trim();
          let isArq = String(r[5] || '').trim().toLowerCase() === 'arquivado';
          listaFormasPagto.push({
            nome: n,
            tipo: tipoFormaGestor_(n,ss),
            banco: String(r[1] || '').trim(),
            limiteTotal: formatBRL(extractNum(r[2])),
            fechamento: String(r[3] || '').trim(),
            vencimento: String(r[4] || '').trim(),
            arquivado: isArq,
            utilizado: 'R$ 0,00',
            disponivel: formatBRL(extractNum(r[6])),
            pctUso: '0%',
            terceirosMes: 'R$ 0,00',
            terceirosMesRaw: 0,
            terceirosFuturoRaw: 0
          });
          mapLowerToOriginal[chaveFormaGestor_(n)] = n;
        }
      });
    }

    const hoje = getHojeSeguro();
    const anoAt = hoje.getFullYear();
    const mesAt = hoje.getMonth() + 1;
    const mesAtualStr = String(mesAt).padStart(2, '0') + '/' + anoAt;
    const timeMesAtual = new Date(anoAt, mesAt - 1, 1).getTime();

    let ultimosLancamentos = [];
    let mesesUnicos = [];
    let pivotFaturas = Object.create(null);
    const horizonte = {totalPessoal:Object.create(null),pagoPessoal:Object.create(null),saldoPessoal:Object.create(null),totalBanco:Object.create(null),pagoBanco:Object.create(null),saldoBanco:Object.create(null),totalTerceiros:Object.create(null),recebidoTerceiros:Object.create(null),previstoPessoal:Object.create(null)};
    function somarHorizonte(mapa,forma,mes,valor) { if(!mapa[forma]) mapa[forma]=Object.create(null); mapa[forma][mes]=arred2((mapa[forma][mes]||0)+valor); }
    let gastoMesPorForma = Object.create(null);
    let abertoMesPorForma = Object.create(null);
    const vencidoPorForma = Object.create(null);
    const terceirosVencidoPorForma = Object.create(null);
    let somaVencidoCartoes = 0;
    let futuroParcelasPorForma = Object.create(null);
    let freqCartoesCompras = Object.create(null);

    listaFormasPagto.forEach(f => {
      const n = f.nome.trim();
      pivotFaturas[n] = Object.create(null);
      gastoMesPorForma[n] = 0;
      abertoMesPorForma[n] = 0;
      futuroParcelasPorForma[n] = 0;
    });

    let setMeses = new Set([mesAtualStr]);
    let mapAutofill = Object.create(null);
    let mapPrefixosAutofill = Object.create(null);
    let statsDesc = Object.create(null);
    let statsPrefixos = Object.create(null);
    const comprasMemoria = new Set();
    let listaAssinaturas = Object.create(null);
    let lancamentosValidos = [];
    let freqTagsCompras = Object.create(null);
    let consumoCatPorMes = Object.create(null);
    let resumoParcelasCompra = Object.create(null);

    let calcAberto = 0, calcPago = 0, calcCompromisso = 0, calcGeral = 0;
    let mapCatTotal = Object.create(null);

    if (lancSheet && lancSheet.getLastRow() > 1) {
      const uL_Lanc = lancSheet.getLastRow();
      const lancData = lancSheet.getRange(2, 1, uL_Lanc - 1, COLUNAS_GESTOR_).getValues();
      const dispLancData = lancSheet.getRange(2, 1, uL_Lanc - 1, COLUNAS_GESTOR_).getDisplayValues();
      const seriesInvalidas = new Set(lancData.filter(function(r) { return limparApostrofo(r[6])==='∞/∞' && serieRecorrenteGestor_(r).invalida; }).map(function(r) { return String(r[12] || (normalizarTexto(r[1])+'_'+normalizarTexto(r[2]))); }));

      lancData.forEach((r, idx) => {
        const dVals = valoresExibidosRegistroGestor_(r, dispLancData[idx]);
        const descStr = String(dVals[1] || '').trim();
        if (!descStr) return;

        const dtLimpa = String(dVals[0] || '').replace(/^'/, '').trim();
        const forma = String(dVals[2] || '').trim();
        const formaLower = forma.toLowerCase();
        const chaveForma = mapLowerToOriginal[chaveFormaGestor_(forma)] || forma;
        const isPix = ehPagamentoImediatoGestor_(forma);
        const isTotal = tipoFormaGestor_(forma) === 'resumo';

        const catStr = String(dVals[3] || '').trim();
        const catRes = resolverCategoria(catStr, nomesConfigCat);
        const parcela = String(dVals[6] || '').replace(/^'/, '').trim();
        const statusRaw = String(dVals[9] || '').trim();
        const mesFat = String(dVals[8] || '').replace(/^'/, '').trim();
        const valor = extractNum(r[7]);
        const pagoBanco = valorPagoBancoGestor_(r, false), saldoBanco = Math.max(0, arred2(valor - pagoBanco));
        const valorFmt = formatBRL(valor);
        const tagsDaLinha = String(dVals[10] || '').trim();

        const cancelado = isStatusCancelado(statusRaw);
        const pago = isStatusPago(statusRaw);
        const infoFat = parseMesFat(mesFat);
        const infoParc = parseNumParcela(parcela);

        const chaveCompraUnica = String(r[12] || r[11] || ('linha-' + idx));

        if (!cancelado && !isPix && !isTotal && chaveForma) {
          if (!freqCartoesCompras[chaveForma]) freqCartoesCompras[chaveForma] = new Set();
          freqCartoesCompras[chaveForma].add(chaveCompraUnica);
        }

        if (!cancelado && tagsDaLinha) {
          tagsDaLinha.split(',').forEach(t => {
            let tagLimpa = t.trim().toLowerCase().replace(/^#/, '');
            if (tagLimpa) {
              if (!freqTagsCompras[tagLimpa]) freqTagsCompras[tagLimpa] = new Set();
              freqTagsCompras[tagLimpa].add(chaveCompraUnica);
            }
          });
        }

        if (!cancelado && infoParc.total > 1 && parcela !== '∞/∞') {
          if (!resumoParcelasCompra[chaveCompraUnica]) {
            resumoParcelasCompra[chaveCompraUnica] = { faltam: 0, maxTime: 0, fimMes: '' };
          }
          if (!pago) {
            resumoParcelasCompra[chaveCompraUnica].faltam += 1;
            if (infoFat.time >= resumoParcelasCompra[chaveCompraUnica].maxTime) {
              resumoParcelasCompra[chaveCompraUnica].maxTime = infoFat.time;
              resumoParcelasCompra[chaveCompraUnica].fimMes = mesFat.length === 7 ? `${mesFat.substring(0, 3)}${mesFat.substring(5, 7)}` : mesFat;
            }
          }
        }

        const descNorm = normalizarTexto(descStr);
        // Cancelamentos não devem contaminar sugestões de compras recorrentes.
        const valorCompraMemoria = extractNum(r[4]) || valor;
        const chaveMemoria = chaveCompraUnica + '_' + valorCompraMemoria;
        if (!cancelado && valor > 0 && !comprasMemoria.has(chaveMemoria)) {
          comprasMemoria.add(chaveMemoria);
          const dataMemoria = parseDataBR(dtLimpa);
          const tempoMemoria = dataMemoria ? dataMemoria.getTime() : 0;
          if (!statsDesc[descNorm]) {
            statsDesc[descNorm] = { original: descStr, formas: Object.create(null), cats: Object.create(null), ultForma: chaveForma, ultCat: catStr, ultValor: valorCompraMemoria, ultTags: tagsDaLinha, tempo: -1 };
          }
          if (tempoMemoria >= statsDesc[descNorm].tempo) {
            statsDesc[descNorm].original = descStr;
            statsDesc[descNorm].ultValor = valorCompraMemoria;
            statsDesc[descNorm].ultTags = tagsDaLinha;
            statsDesc[descNorm].ultForma = chaveForma;
            statsDesc[descNorm].ultCat = catStr;
            statsDesc[descNorm].tempo = tempoMemoria;
          }
          if (chaveForma) {
            statsDesc[descNorm].formas[chaveForma] = (statsDesc[descNorm].formas[chaveForma] || 0) + 1;
          }
          if (catStr) {
            statsDesc[descNorm].cats[catStr] = (statsDesc[descNorm].cats[catStr] || 0) + 1;
          }

          const partesTraco = descNorm.split(/\s*[-–]\s*/);
          const prefixoItem = partesTraco[0].trim();
          if (prefixoItem && prefixoItem.length >= 3) {
            if (!statsPrefixos[prefixoItem]) {
              statsPrefixos[prefixoItem] = { formas: Object.create(null), cats: Object.create(null), ultForma: chaveForma, ultCat: catStr, tempo: -1 };
            }
            if (tempoMemoria >= statsPrefixos[prefixoItem].tempo) {
              statsPrefixos[prefixoItem].ultForma = chaveForma;
              statsPrefixos[prefixoItem].ultCat = catStr;
              statsPrefixos[prefixoItem].tempo = tempoMemoria;
            }
            if (chaveForma) {
              statsPrefixos[prefixoItem].formas[chaveForma] = (statsPrefixos[prefixoItem].formas[chaveForma] || 0) + 1;
            }
            if (catStr) {
              statsPrefixos[prefixoItem].cats[catStr] = (statsPrefixos[prefixoItem].cats[catStr] || 0) + 1;
            }
          }
        }

        if (parcela === '∞/∞') {
          const chaveAss = String(r[12] || `${descNorm}_${normalizarTexto(chaveForma)}`);
          if (!listaAssinaturas[chaveAss] || infoFat.time >= listaAssinaturas[chaveAss].timeRef) {
            listaAssinaturas[chaveAss] = {
              linhaBase: idx + 2,
              registroId: r[11], compraId: r[12], versao: Number(r[13] || 1),
              descricao: descStr,
              forma: chaveForma,
              categoria: catStr,
              valor: valorFmt,
              valorRaw: valor,
              status: statusRaw==='Ocorrência Pulada'?'Assinatura Ativa':statusRaw,
              pulada: statusRaw==='Ocorrência Pulada',
              controleInvalido: seriesInvalidas.has(chaveAss),
              encerrada: serieRecorrenteGestor_(r).encerrada === true,
              mesEncerramento: serieRecorrenteGestor_(r).encerramentoMes || '',
              mesUltimaFat: mesFat,
              timeRef: infoFat.time
            };
          }
        }

        if (!cancelado && valor > 0) {
          calcGeral += valor;

          if (mesFat) {
            if (!consumoCatPorMes[mesFat]) consumoCatPorMes[mesFat] = Object.create(null);
            consumoCatPorMes[mesFat][catRes] = (consumoCatPorMes[mesFat][catRes] || 0) + valor;
          }

          if (mesFat === mesAtualStr) {
            calcCompromisso += valor;
            calcPago += pagoBanco;
            calcAberto += saldoBanco;

            mapCatTotal[catRes] = (mapCatTotal[catRes] || 0) + valor;
            gastoMesPorForma[chaveForma] = (gastoMesPorForma[chaveForma] || 0) + valor;
            if (!pago) {
              abertoMesPorForma[chaveForma] = (abertoMesPorForma[chaveForma] || 0) + saldoBanco;
            }
          }

          if (infoFat.time > 0) {
            mesesUnicos.push(mesFat);
            setMeses.add(mesFat);
            somarHorizonte(horizonte.totalPessoal,chaveForma,mesFat,valor);
            somarHorizonte(horizonte.pagoPessoal,chaveForma,mesFat,pagoBanco);
            somarHorizonte(horizonte.saldoPessoal,chaveForma,mesFat,saldoBanco);
            if(!isPix&&!isTotal){somarHorizonte(horizonte.totalBanco,chaveForma,mesFat,valor);somarHorizonte(horizonte.pagoBanco,chaveForma,mesFat,pagoBanco);somarHorizonte(horizonte.saldoBanco,chaveForma,mesFat,saldoBanco);}
            const isFuturo = (infoFat.a > anoAt) || (infoFat.a === anoAt && infoFat.m > mesAt);

            if (!isFuturo && mesFat !== mesAtualStr && !pago && !isPix) vencidoPorForma[chaveForma] = (vencidoPorForma[chaveForma] || 0) + saldoBanco;
            // Pix dividido/agendado também tem valores futuros a desembolsar.
            // Para cartões, a projeção dos fixos continua separada do parcelado.
            if (isFuturo && !pago && (parcela !== '∞/∞' || isPix)) {
              futuroParcelasPorForma[chaveForma] = (futuroParcelasPorForma[chaveForma] || 0) + saldoBanco;
            }

            if (!pago || isPix) {
              setMeses.add(mesFat);
              if (!pivotFaturas[chaveForma]) pivotFaturas[chaveForma] = Object.create(null);
              pivotFaturas[chaveForma][mesFat] = (pivotFaturas[chaveForma][mesFat] || 0) + (isPix ? valor : saldoBanco);
            }
          }
        }

        lancamentosValidos.push({ raw: r, disp: dVals, idx: idx, chaveCompraUnica: chaveCompraUnica });
      });

      Object.keys(statsDesc).forEach(k => {
        const st = statsDesc[k];
        mapAutofill[k] = {
          original: st.original,
          forma: obterMaisFrequente(st.formas, st.ultForma),
          categoria: obterMaisFrequente(st.cats, st.ultCat),
          ultimoValor: st.ultValor || 0,
          ultimoValorFmt: st.ultValor > 0 ? formatBRL(st.ultValor) : '',
          ultimasTags: st.ultTags || ''
        };
      });

      Object.keys(statsPrefixos).forEach(k => {
        const st = statsPrefixos[k];
        mapPrefixosAutofill[k] = {
          forma: obterMaisFrequente(st.formas, st.ultForma),
          categoria: obterMaisFrequente(st.cats, st.ultCat)
        };
      });

      mesesUnicos = [...new Set(mesesUnicos)].sort((a, b) => parseMesFat(b).time - parseMesFat(a).time);

      const limitPaginaInicial = 50;
      const inicio = Math.max(0, lancamentosValidos.length - limitPaginaInicial);
      const ultimosBrutos = lancamentosValidos.slice(inicio);

      ultimosLancamentos = ultimosBrutos.map(item => {
        let r = item.raw, d = item.disp;
        if (!String(d[1] || '').trim()) return null;
        let dt = r[0] instanceof Date ? Utilities.formatDate(r[0], getTimezone(), 'dd/MM/yyyy') : String(d[0]).replace(/^'/, '');
        let val = formatBRL(extractNum(r[7]));
        let resParc = resumoParcelasCompra[item.chaveCompraUnica] || null;
        return [dt, d[1], d[2], d[3], d[4], d[5], String(d[6]).replace(/^'/, ''), val, String(d[8]).replace(/^'/, ''), d[9], item.idx + 2, d[10], resParc, r[11], r[12], Number(r[13] || 1), r[14]];
      }).filter(Boolean).reverse();
    }

    let cartaoMaisFrequente = '';
    let maxComprasCartao = -1;
    Object.keys(freqCartoesCompras).forEach(nomeC => {
      const qtd = freqCartoesCompras[nomeC].size;
      if (qtd > maxComprasCartao) {
        maxComprasCartao = qtd;
        cartaoMaisFrequente = nomeC;
      }
    });

    // LEITURA DA ABA "EMPRÉSTIMOS"
    let listaEmprestimos = [];
    let terceirosAbertoMesPorForma = Object.create(null);
    let terceirosFuturoPorForma = Object.create(null);
    let terceirosTotalMesPorForma = Object.create(null);
    let terceirosAReceberPorMes = Object.create(null);
    let terceirosCartaoPorFormaMes = Object.create(null);
    let empKpiAReceberMes = 0, empKpiRecebidoMes = 0, empKpiTotalAReceberGeral = 0, empKpiLimiteOcupado = 0;
    let empKpiAtrasados = 0;
    let freqPessoasEmp = Object.create(null);

    if (empSheet && empSheet.getLastRow() > 1) {
      const uLEmp = empSheet.getLastRow();
      const rawEmp = empSheet.getRange(2, 1, uLEmp - 1, COLUNAS_GESTOR_).getValues();
      const dispEmp = empSheet.getRange(2, 1, uLEmp - 1, COLUNAS_GESTOR_).getDisplayValues();

      rawEmp.forEach((r, idx) => {
        const d = valoresExibidosRegistroGestor_(r, dispEmp[idx]);
        const pessoa = String(d[1] || '').trim();
        const desc = String(d[2] || '').trim();
        if (!pessoa && !desc) return;

        const dtLimpa = String(d[0] || '').replace(/^'/, '').trim();
        const formaRaw = String(d[3] || '').trim();
        const chaveForma = mapLowerToOriginal[chaveFormaGestor_(formaRaw)] || formaRaw;
        const consomeLimiteCartao = formaEmprestimoConsomeLimite_(chaveForma);
        const parcLimpa = String(d[6] || '').replace(/^'/, '').trim();
        const valParc = extractNum(r[7]);
        const saldoBancoEmp = Math.max(0, arred2(valParc - valorPagoBancoGestor_(r, true)));
        const mesFat = String(d[8] || '').replace(/^'/, '').trim();
        const status = String(d[9] || 'A Receber').trim();
        const obs = String(d[10] || '').trim();
        const recebido = (status === 'Recebido');
        const infoFat = parseMesFat(mesFat);

        if (pessoa) {
          freqPessoasEmp[pessoa] = (freqPessoasEmp[pessoa] || 0) + 1;
        }

        if (valParc > 0) {
          if (infoFat.time > 0) {
            mesesUnicos.push(mesFat);
            setMeses.add(mesFat);
            somarHorizonte(horizonte.totalTerceiros,chaveForma,mesFat,valParc);
            if(recebido)somarHorizonte(horizonte.recebidoTerceiros,chaveForma,mesFat,valParc);
            if(consomeLimiteCartao){somarHorizonte(horizonte.totalBanco,chaveForma,mesFat,valParc);somarHorizonte(horizonte.pagoBanco,chaveForma,mesFat,arred2(valParc-saldoBancoEmp));somarHorizonte(horizonte.saldoBanco,chaveForma,mesFat,saldoBancoEmp);}
          }

          if (mesFat === mesAtualStr) {
            if (consomeLimiteCartao) {
              terceirosTotalMesPorForma[chaveForma] = (terceirosTotalMesPorForma[chaveForma] || 0) + valParc;
            }
            if (recebido) empKpiRecebidoMes += valParc;
            else empKpiAReceberMes += valParc;
          }

          if (!recebido) {
            empKpiTotalAReceberGeral += valParc;
            if (infoFat.time > 0) {
              terceirosAReceberPorMes[mesFat] = (terceirosAReceberPorMes[mesFat] || 0) + valParc;
            }

            if (infoFat.time > 0 && infoFat.time < timeMesAtual) {
              empKpiAtrasados += valParc;
            }
          }

          if (consomeLimiteCartao && r[14] !== 'Pago') {
            if (!terceirosCartaoPorFormaMes[chaveForma]) terceirosCartaoPorFormaMes[chaveForma] = Object.create(null);
            terceirosCartaoPorFormaMes[chaveForma][mesFat] = (terceirosCartaoPorFormaMes[chaveForma][mesFat] || 0) + saldoBancoEmp;

            // A devolução da pessoa não quita a fatura do banco. Por isso o limite
            // continua ocupado pela parcela do cartão, mesmo com status Recebido.
            empKpiLimiteOcupado += saldoBancoEmp;
            if (mesFat === mesAtualStr) {
              terceirosAbertoMesPorForma[chaveForma] = (terceirosAbertoMesPorForma[chaveForma] || 0) + saldoBancoEmp;
            } else if (infoFat.time > timeMesAtual) {
              terceirosFuturoPorForma[chaveForma] = (terceirosFuturoPorForma[chaveForma] || 0) + saldoBancoEmp;
            } else if (infoFat.time > 0) {
              terceirosVencidoPorForma[chaveForma] = (terceirosVencidoPorForma[chaveForma] || 0) + saldoBancoEmp;
            }
          }
        }

        listaEmprestimos.push({
          dataCombinada:dataCombinadaEmprestimoGestor_(r),
          linha: idx + 2,
          registroId: r[11], compraId: r[12], versao: Number(r[13] || 1), estadoBanco: r[14] || 'Em Aberto',
          pagoBancoRaw:arred2(valParc-saldoBancoEmp),saldoBancoRaw:saldoBancoEmp,
          data: dtLimpa,
          pessoa: pessoa,
          descricao: desc,
          forma: chaveForma,
          parcela: parcLimpa,
          valorRaw: valParc,
          valorTotalRaw: extractNum(r[4]),
          valorFmt: formatBRL(valParc),
          mesFatura: mesFat,
          status: status,
          observacoes: obs,
          timeFat: infoFat.time
        });
      });
    }

    const pessoasFrequentes = Object.keys(freqPessoasEmp).sort((a, b) => freqPessoasEmp[b] - freqPessoasEmp[a]);

    const tagsOrdenadasPorFreq = Object.keys(freqTagsCompras).sort((a, b) => {
      const diff = freqTagsCompras[b].size - freqTagsCompras[a].size;
      return diff !== 0 ? diff : a.localeCompare(b);
    }).map(t => '#' + t);

    let mesesComGasto = Array.from(setMeses).filter(m => {
      if (m === mesAtualStr) return true;
      let somaMes = 0;
      for (let f in pivotFaturas) somaMes += (pivotFaturas[f][m] || 0);
      const somaTerceirosAReceber = terceirosAReceberPorMes[m] || 0;
      const somaTerceirosCartao = Object.keys(terceirosCartaoPorFormaMes).reduce(function (acc, forma) {
        return acc + ((terceirosCartaoPorFormaMes[forma] || {})[m] || 0);
      }, 0);
      const totalRegistrado = Object.keys(horizonte.totalPessoal).reduce(function(s,f){return s+(horizonte.totalPessoal[f][m]||0);},0)+Object.keys(horizonte.totalTerceiros).reduce(function(s,f){return s+(horizonte.totalTerceiros[f][m]||0);},0);
      return totalRegistrado > 0 || somaMes > 0 || somaTerceirosAReceber > 0 || somaTerceirosCartao > 0;
    }).sort((a, b) => parseMesFat(a).time - parseMesFat(b).time);

    let mesesContinuos = mesesComGasto.length > 0 ? mesesComGasto : [mesAtualStr];

    const linhasSeriesProjecao = new Map();
    lancamentosValidos.forEach(function(l){const r=l.raw;if(limparApostrofo(r[6])==='∞/∞'){const id=String(r[12]);if(!linhasSeriesProjecao.has(id))linhasSeriesProjecao.set(id,[]);linhasSeriesProjecao.get(id).push(r);}});
    Object.values(listaAssinaturas).forEach(ass => {
      const stLower = String(ass.status || '').toLowerCase();
      const isAtiva = !ass.controleInvalido && !ass.encerrada && (stLower === 'assinatura ativa' || stLower === 'assinatura paga');
      if (isAtiva && ass.valorRaw > 0) {
        mesesContinuos.forEach(mHoriz => {
          const infoH = parseMesFat(mHoriz);
          const serie = linhasSeriesProjecao.get(String(ass.compraId)) || [];
          const jaRegistrada = serie.some(function(r){return formatarCelulaRegistroGestor_(r[8],'MM/yyyy')===mHoriz;});
          const vigente = referenciaRecorrenteNoMesGestor_(serie, mHoriz);
          if (!jaRegistrada && vigente && infoH.time > 0) {
            const forma=String(vigente[2]),valor=extractNum(vigente[7]);
            if (!pivotFaturas[forma]) pivotFaturas[forma] = Object.create(null);
            pivotFaturas[forma][mHoriz] = (pivotFaturas[forma][mHoriz] || 0) + valor;
            somarHorizonte(horizonte.previstoPessoal,forma,mHoriz,valor);
          }
        });
      }
    });

    let somaFuturoCartoes = 0;
    let somaAbertoMesCartoes = 0;
    let somaTerceirosMesCartoes = 0;
    let pivotTotalCarteira = Object.create(null);
    let pivotTotalBanco = Object.create(null);
    mesesContinuos.forEach(m => { pivotTotalCarteira[m] = 0; pivotTotalBanco[m] = 0; });

    listaFormasPagto.forEach(f => {
      const fNomeTrim = f.nome.trim();
      const nomeLower = fNomeTrim.toLowerCase();
      const isPagamentoAVista = !formaEmprestimoConsomeLimite_(nomeLower);
      const isTotal = tipoFormaGestor_(fNomeTrim) === 'resumo';
      const limRaw = extractNum(f.limiteTotal);

      const gastoMesPessoal = gastoMesPorForma[fNomeTrim] || 0;
      const abertoMesPessoal = abertoMesPorForma[fNomeTrim] || 0;
      const futuroParcPessoal = futuroParcelasPorForma[fNomeTrim] || 0;

      const tercAbertoMes = terceirosAbertoMesPorForma[fNomeTrim] || 0;
      const tercFuturo = terceirosFuturoPorForma[fNomeTrim] || 0;
      const tercTotalMes = terceirosTotalMesPorForma[fNomeTrim] || 0;

      const vencidoCard = (vencidoPorForma[fNomeTrim] || 0) + (terceirosVencidoPorForma[fNomeTrim] || 0);
      f.atrasadoRaw = vencidoCard;
      f.limiteRaw = limRaw;
      f.gastoMesRaw = gastoMesPessoal;
      f.abertoMesRaw = abertoMesPessoal + tercAbertoMes;
      f.terceirosMesRaw = tercTotalMes;
      f.terceirosMes = formatBRL(tercTotalMes);
      f.terceirosFuturoRaw = tercFuturo;
      f.futuroPessoalRaw = arred2(futuroParcPessoal);
      f.totalBancoMes = formatBRL(gastoMesPessoal + tercTotalMes);

      if (isPagamentoAVista) {
        f.utilizado = formatBRL(gastoMesPessoal);
        // Valores a pagar por Pix são compromissos próprios, sem consumir
        // limite de crédito nem misturar o reembolso que terceiros devem.
        f.totalFuturo = formatBRL(futuroParcPessoal);
        f.disponivelRaw = limRaw > 0 ? (limRaw - gastoMesPessoal) : 0;
        if (limRaw > 0) {
          f.pctUso = Math.round((gastoMesPessoal / limRaw) * 100) + '%';
          f.disponivel = formatBRL(limRaw - gastoMesPessoal);
        } else {
          f.pctUso = '0%';
          f.disponivel = '-';
        }
      } else if (!isTotal) {
        const meses = pivotFaturas[fNomeTrim] || {};
        mesesContinuos.forEach(m => {
          if (meses[m] > 0) pivotTotalCarteira[m] += meses[m];
          const tercMesGeral = (terceirosCartaoPorFormaMes[fNomeTrim] || {})[m] || 0;
          pivotTotalBanco[m] += (meses[m] || 0) + tercMesGeral;
        });

        const abertoTotalCard = abertoMesPessoal + tercAbertoMes;
        const futuroTotalCard = futuroParcPessoal + tercFuturo;

        somaVencidoCartoes += vencidoCard;
        somaFuturoCartoes += futuroTotalCard;
        somaAbertoMesCartoes += abertoTotalCard;
        somaTerceirosMesCartoes += tercTotalMes;

        f.utilizado = formatBRL(gastoMesPessoal);
        f.totalFuturo = futuroTotalCard > 0 ? formatBRL(futuroTotalCard) : 'R$ 0,00';

        const comprometidoCard = abertoTotalCard + futuroTotalCard + vencidoCard;
        f.disponivelRaw = limRaw > 0 ? (limRaw - comprometidoCard) : 0;
        if (limRaw > 0) {
          f.pctUso = Math.round((comprometidoCard / limRaw) * 100) + '%';
          f.disponivel = formatBRL(limRaw - comprometidoCard);
        } else {
          f.pctUso = '0%';
          f.disponivel = '-';
        }
      }
    });

    const itensAvisoFatura = lancamentosValidos.slice();
    if (empSheet && empSheet.getLastRow() > 1) empSheet.getRange(2, 1, empSheet.getLastRow() - 1, COLUNAS_GESTOR_).getValues().forEach(function (r) {
      if (!r[11] || isStatusCancelado(r[9])) return;
      const raw = r.slice(); raw[2] = r[3]; raw[8]=formatarCelulaRegistroGestor_(r[8],'MM/yyyy'); raw[9] = r[14] === 'Pago' ? 'Pago' : 'Em Aberto';
      itensAvisoFatura.push({ raw: raw, disp: raw.map(function (v) { return String(v == null ? '' : v); }) });
    });
    const diasAteVencimento = calcularAlertasVencimento_(listaFormasPagto, itensAvisoFatura, getHojeSeguro());

    const formaResumo = listaFormasPagto.find(f => f.tipo === 'resumo');
    let chaveTotalCarteira = formaResumo ? formaResumo.nome : '__TOTAL_CARTEIRA__';
    if (!formaResumo) while (Object.prototype.hasOwnProperty.call(pivotFaturas, chaveTotalCarteira) || listaFormasPagto.some(function (f) { return f.nome === chaveTotalCarteira; })) chaveTotalCarteira += '_';
    const pivotTerceirosAReceber = Object.create(null);
    mesesContinuos.forEach(function (m) { pivotTerceirosAReceber[m] = terceirosAReceberPorMes[m] || 0; });
    pivotFaturas[chaveTotalCarteira] = pivotTotalCarteira;
    pivotFaturas['__TERCEIROS_A_RECEBER__'] = pivotTerceirosAReceber;
    pivotFaturas['__BANCO_TOTAL__'] = pivotTotalBanco;

    listaFormasPagto.forEach(f => {
      const nomeLower = f.nome.toLowerCase();
      if (f.tipo === 'resumo') {
        const gastoMesCartoes = pivotTotalCarteira[mesAtualStr] || 0;
        const comprometidoTotal = somaAbertoMesCartoes + somaFuturoCartoes + somaVencidoCartoes;
        f.atrasadoRaw = somaVencidoCartoes;
        const limRaw = extractNum(f.limiteTotal);

        f.utilizado = formatBRL(gastoMesCartoes);
        f.terceirosMesRaw = somaTerceirosMesCartoes;
        f.terceirosMes = formatBRL(somaTerceirosMesCartoes);
        f.totalBancoMes = formatBRL(gastoMesCartoes + somaTerceirosMesCartoes);
        f.totalFuturo = somaFuturoCartoes > 0 ? formatBRL(somaFuturoCartoes) : 'R$ 0,00';
        f.disponivelRaw = limRaw > 0 ? (limRaw - comprometidoTotal) : 0;

        if (limRaw > 0) {
          f.pctUso = Math.round((comprometidoTotal / limRaw) * 100) + '%';
          f.disponivel = formatBRL(limRaw - comprometidoTotal);
        } else {
          f.pctUso = '0%';
          f.disponivel = '-';
        }
      }
    });

    const arquivosAnuais=catalogoAnualProtecaoGestor_(ss);
    arquivosAnuais.forEach(function(e){
      calcGeral+=e.resumo.pessoalCentavos/100;Array.prototype.push.apply(mesesUnicos,e.resumo.meses);
      const resumo=e.resumo.categoriasCentavos?e.resumo:resumoArquivoAnualProtecaoGestor_(dadosArquivoAnualProtecaoGestor_(e));
      // O gráfico do Painel acompanha o mês atual; não somar anos antigos nele.
      const categoriasDoMes=resumo.consumoCatMesCentavos[mesAtualStr]||{};
      Object.keys(categoriasDoMes).forEach(function(c){mapCatTotal[c]=(mapCatTotal[c]||0)+categoriasDoMes[c]/100;});
      Object.keys(resumo.consumoCatMesCentavos).forEach(function(m){consumoCatPorMes[m]=consumoCatPorMes[m]||Object.create(null);Object.keys(resumo.consumoCatMesCentavos[m]).forEach(function(c){consumoCatPorMes[m][c]=(consumoCatPorMes[m][c]||0)+resumo.consumoCatMesCentavos[m][c]/100;});});
    });
    let categorias = [], configCategorias = [], opcoesCategorias = [];
    if (dashSheet) {
      const catNamesRange = dashSheet.getRange('B17:B41').getValues();
      const catMetasRange = dashSheet.getRange('D17:D41').getValues();
      for (let i = 0; i < 25; i++) {
        const nome = String(catNamesRange[i][0] || '').trim();
        const meta = extractNum(catMetasRange[i][0]);
        if (nome) {
          configCategorias.push({ nome: nome, meta: meta });
          opcoesCategorias.push(nome);
          if (mapCatTotal[nome] > 0) {
            categorias.push({ nome: nome, total: mapCatTotal[nome] });
            delete mapCatTotal[nome];
          }
        }
      }
    }

    if (opcoesCategorias.length === 0) {
      const def = ['Supermercado', 'Eletrônicos', 'Serviços', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Vestuário', 'Compras', 'Viagem', 'Outros'];
      opcoesCategorias = def;
      configCategorias = def.map(c => ({ nome: c, meta: 0 }));
    }

    // Categorias que não existem mais na configuração aparecem com o nome antigo + "(Antigo)"
    for (let c in mapCatTotal) {
      if (mapCatTotal[c] > 0) categorias.push({ nome: c, total: mapCatTotal[c] });
    }
    categorias.sort((a, b) => b.total - a.total);

    // Empréstimos e arquivos também acrescentam meses depois da primeira deduplicação.
    // Consolidar só após reunir gastos pessoais e de terceiros.
    mesesUnicos = [...new Set(mesesUnicos)].sort((a, b) => parseMesFat(b).time - parseMesFat(a).time);
    let anosUnicos = [...new Set(mesesUnicos.map(m => m.split('/')[1]))].sort((a, b) => b - a);
    let estruturaMesesPorAno = Object.create(null);
    mesesUnicos.forEach(mFat => {
      let [m, a] = mFat.split('/');
      if (!estruturaMesesPorAno[a]) estruturaMesesPorAno[a] = [];
      estruturaMesesPorAno[a].push(mFat);
    });

    const opcoesFormasFiltradas = listaFormasPagto
      .filter(f => !f.arquivado && f.tipo !== 'resumo')
      .map(f => f.nome);

    const estadoNotas = lerNotasGestor_(notasSheet);
    const listaNotas = estadoNotas.anotacoes;

    return {
      protocoloGestor:13,
      arquivosAnuais:arquivosAnuais.map(function(e){return {ano:e.ano,assinatura:e.hash,quantidade:e.resumo.quantidade,meses:e.resumo.meses};}),
      historicoTecnico: estatisticasHistoricoTecnicoGestor_(),
      kpis: {
        totalAberto: formatBRL(calcAberto),
        totalPago: formatBRL(calcPago),
        comprometimentoMes: formatBRL(calcCompromisso),
        totalGeral: formatBRL(calcGeral)
      },
      faturas: { mesesGlobais: mesesContinuos, pivot: pivotFaturas, mesAtual: mesAtualStr, chaveResumo: chaveTotalCarteira, horizonte: horizonte },
      categorias: categorias,
      configCategorias: configCategorias,
      consumoCategoriasPorMes: consumoCatPorMes,
      formasPagamento: listaFormasPagto,
      versoesConfiguracao: {formas:versaoConfiguracaoGestor_(ss,'formas'),categorias:versaoConfiguracaoGestor_(ss,'categorias')},
      alertasVencimento: diasAteVencimento,
      cartaoMaisFrequente: cartaoMaisFrequente,
      lancamentos: ultimosLancamentos,
      temMaisLancamentos: lancamentosValidos.length > 50 || arquivosAnuais.length>0,
      mesesDisponiveis: mesesUnicos,
      anosDisponiveis: anosUnicos,
      estruturaMesesAno: estruturaMesesPorAno,
      opcoesFormas: opcoesFormasFiltradas,
      opcoesCategorias: opcoesCategorias,
      opcoesTags: tagsOrdenadasPorFreq,
      autofill: mapAutofill,
      autofillPrefixos: mapPrefixosAutofill,
      assinaturas: Object.values(listaAssinaturas),
      anotacoes: listaNotas,
      notasRevision: estadoNotas.revision,
      epocaRestauracao: epocaRestauracaoGestor_(),
      emprestimos: {
        kpis: {
          aReceberMes: formatBRL(empKpiAReceberMes),
          aReceberMesRaw: empKpiAReceberMes,
          recebidoMes: formatBRL(empKpiRecebidoMes),
          totalAReceberGeral: formatBRL(empKpiTotalAReceberGeral),
          limiteOcupado: formatBRL(empKpiLimiteOcupado),
          atrasadosRaw: empKpiAtrasados,
          atrasadosFmt: formatBRL(empKpiAtrasados)
        },
        pessoasFrequentes: pessoasFrequentes,
        itens: listaEmprestimos.sort(function(a,b){return parseMesFat(a.mesFatura).time-parseMesFat(b.mesFatura).time || String(a.pessoa).localeCompare(String(b.pessoa),'pt-BR') || String(a.compraId).localeCompare(String(b.compraId)) || parseNumParcela(a.parcela).atual-parseNumParcela(b.parcela).atual || String(a.registroId).localeCompare(String(b.registroId));})
      }
    };
  } catch (e) {
    throw new Error('Erro ao obter dados: ' + e.message);
  }
}

// ============================================================================
// ROTEADOR DA API WEB (BACKEND)
// ============================================================================

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const payload = JSON.parse(e.postData.contents);
    const tokenEsperado = propriedade_("GESTOR_API_TOKEN");
    if (!tokenEsperado || payload.apiToken !== tokenEsperado) {
      return output.setContent(JSON.stringify({ sucesso: false, erro: 'Acesso não autorizado.' }));
    }
    const result = executarAcaoApi_(payload.action, payload.param);
    return output.setContent(JSON.stringify({ sucesso: true, dados: result }));
  } catch (err) {
    return output.setContent(JSON.stringify({ sucesso: false, erro: err.message, resultadoIncerto: err.resultadoIncerto === true, codigo: err.codigo || 'FALHA_OPERACAO' }));
  }
}

// Função chamada pela interface hospedada no Apps Script.
// Retorna texto JSON para converter datas e objetos complexos com segurança.
function apiCallServidor(action, param) {
  try {
    if (propriedade_("GESTOR_API_BRIDGE_ENABLED") !== "true") {
      throw new Error('A prévia direta do Apps Script está desativada. Use o endereço protegido do app.');
    }
    return JSON.stringify({ sucesso: true, dados: executarAcaoApi_(action, param) });
  } catch (err) {
    return JSON.stringify({ sucesso: false, erro: err && err.message ? err.message : String(err), resultadoIncerto: !!(err && err.resultadoIncerto), codigo: err && err.codigo || 'FALHA_OPERACAO' });
  }
}

// Exportação para arquivo local. Inclui valores, fórmulas e valores exibidos
// das abas usadas pelo app; não inclui Script Properties nem tokens secretos.
function exportarBackupDadosWeb(param) {
  const lock = obterLockGestor_();
  lock.waitLock(15000);
  try {
    const ss = CONTEXTO_GESTOR_ ? CONTEXTO_GESTOR_.ssReal : obterPlanilhaGestor_();
    return montarBackupDadosGestor_(ss,param);
  } finally { lock.releaseLock(); }
}
function montarBackupDadosGestor_(ss,param,recuperacao) {
    const restauravel=Boolean(param && param.restauravel);
    const nomes = ['Dashboard & Resumo', 'Formas de Pagamento', 'Lançamentos', 'Empréstimos', 'Anotações'].concat(restauravel?[]:['_Gestor_Atividade']);
    const fuso = ss.getSpreadsheetTimeZone() || getTimezone();
    const abas = nomes.map(function (nome) {
      const sh = ss.getSheetByName(nome);
      if (!sh) return null;
      const range = sh.getDataRange();
      const valores = range.getValues().map(function (linha) {
        return linha.map(function (valor) {
          if (valor instanceof Date) return { tipo: 'data', valor: Utilities.formatDate(valor, fuso, "yyyy-MM-dd'T'HH:mm:ss") };
          return valor;
        });
      });
      if(restauravel)return {nome:nome,valores:valores,formulas:range.getFormulas()};
      return { nome: nome, valores: valores, exibidos: range.getDisplayValues(), formulas: range.getFormulas(), formatosNumericos: range.getNumberFormats() };
    }).filter(function (aba) { return !!aba; });

    return backupComArquivosProtecaoGestor_({
      formato: 'gestor-financeiro-backup-v1',
      geradoEm: Utilities.formatDate(new Date(), fuso, 'yyyy-MM-dd HH:mm:ss'),
      fusoHorario: fuso,
      planilha: ss.getName(),
      observacao: 'Cópia de segurança dos dados do app. Não inclui código, tokens, permissões nem preferências locais. O histórico técnico atual é preservado na planilha ao restaurar.',
      abas: abas
    },ss,recuperacao);
}

function propriedade_(nome) {
  return PropertiesService.getScriptProperties().getProperty(nome) || '';
}

function executarAcaoApiInterna_(action, param) {
  switch (action) {
    case 'ativarProtecaoAutomaticaWeb': return configurarProtecaoAutomaticaGestor(param&&param.pastaUrl);
    case 'obterStatusProtecaoWeb': return obterStatusProtecaoWeb();
    case 'executarBackupProtegidoWeb': return executarBackupProtegidoWeb(param);
    case 'previaManutencaoProtegidaWeb': return previaManutencaoProtegidaWeb();
    case 'executarManutencaoProtegidaWeb': return executarManutencaoProtegidaWeb(param);
    case 'obterEmprestimosArquivadosWeb': return obterEmprestimosArquivadosWeb(param);
    case 'previaRachadinhaWeb': return previaRachadinhaWeb(param);
    case 'registrarRachadinhaWeb': return registrarRachadinhaWeb(param);
    case 'cancelarOperacaoWeb': return cancelarOperacaoWeb(param);
    case 'consultarOperacaoWeb': return consultarOperacaoWeb(param);
    case 'diagnosticarPendenciasWeb': return diagnosticarPendenciasWeb();
    case 'previaAntecipacaoWeb': return previaAntecipacaoWeb(param);
    case 'getDadosCompletos': return getDadosCompletos();
    case 'obterAtividadeWeb': return obterAtividadeWeb(param);
    case 'desfazerAtividadeWeb': return desfazerAtividadeWeb(param);
    case 'obterFaturaPagamentoWeb': return obterFaturaPagamentoWeb(param);
    case 'previaPagamentoFaturaWeb': return previaPagamentoFaturaWeb(param);
    case 'previaDatasDevolucaoWeb': return previaDatasDevolucaoWeb(param);
    case 'previaEdicaoEmprestimoWeb': return previaEdicaoEmprestimoWeb(param);
    case 'registrarPagamentoFaturaWeb': return registrarPagamentoFaturaWeb(param);
    case 'previaRestauracaoBackupWeb': return previaRestauracaoBackupWeb(param);
    case 'restaurarBackupDadosWeb': return restaurarBackupDadosWeb(param);
    case 'obterBackupAnteriorWeb': return obterBackupAnteriorWeb(param);
    case 'listarCopiasRestauracaoWeb': return listarCopiasRestauracaoWeb(param);
    case 'obterParteCopiaRestauracaoWeb': return obterParteCopiaRestauracaoWeb(param);
    case 'iniciarImportacaoBackupWeb': return iniciarImportacaoBackupWeb(param);
    case 'enviarPartesBackupWeb': return enviarPartesBackupWeb(param);
    case 'concluirImportacaoBackupWeb': return concluirImportacaoBackupWeb(param);
    case 'descartarImportacaoBackupWeb': return descartarImportacaoBackupWeb(param);
    case 'exportarBackupDadosWeb': return exportarBackupDadosWeb(param);
    case 'prepararExportacaoBackupWeb': return prepararExportacaoBackupWeb(param);
    case 'obterPartesImportacaoBackupWeb': return obterPartesImportacaoBackupWeb(param);
    case 'salvarLancamentoWeb': return salvarLancamentoWeb(param);
    case 'sincronizarLoteWeb': return sincronizarLoteWeb(param);
    case 'editarLancamentoLinhaWeb': return editarLancamentoLinhaWeb(param);
    case 'excluirLancamentoWeb': return excluirLancamentoWeb(param);
    case 'adiantarParcelasWeb': return adiantarParcelasWeb(param);
    case 'quitarFaturaWeb': return quitarFaturaWeb(param);
    case 'salvarNotasWeb': return salvarNotasWeb(param);
    case 'salvarEmprestimoWeb': return salvarEmprestimoWeb(param);
    case 'alternarStatusEmprestimoWeb': return alternarStatusEmprestimoWeb(param);
    case 'excluirEmprestimoWeb': return excluirEmprestimoWeb(param);
    case 'editarEmprestimoLinhaWeb': return editarEmprestimoLinhaWeb(param);
    case 'dividirParcelaEmprestimoWeb': return dividirParcelaEmprestimoWeb(param);
    case 'moverParaEmprestimosWeb': return moverParaEmprestimosWeb(param);
    case 'moverParaGastosPessoaisWeb': return moverParaGastosPessoaisWeb(param);
    case 'editarAssinaturaWeb': return editarAssinaturaWeb(param);
    case 'cancelarAssinaturaWeb': return cancelarAssinaturaWeb(param);
    case 'salvarFormaPagamentoWeb': return salvarFormaPagamentoWeb(param);
    case 'reordenarFormasPagamentoWeb': return reordenarFormasPagamentoWeb(param);
    case 'excluirFormaPagamentoWeb': return excluirFormaPagamentoWeb(param);
    case 'salvarCategoriasWeb': return salvarCategoriasWeb(param);
    case 'obterRelatorioMes': return obterRelatorioMes(param);
    case 'obterRelatorioAnual': return obterRelatorioAnual(param);
    case 'filtrarLancamentosWeb': return filtrarLancamentosWeb(param.filtros, param.offset, param.limite);
    default: throw new Error('Comando desconhecido: ' + action);
  }
}

// ============================================================================
// PARTE ADICIONADA: AS 16 FUNÇÕES QUE FALTAVAM
// ============================================================================

const FORMATO_MOEDA_PLANILHA = 'R$#,##0.00;$(R$#,##0.00);"-"';
const NOMES_MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function pad2(n) { return String(n).padStart(2, '0'); }
function limparApostrofo(v) { return String(v == null ? '' : v).replace(/^'/, '').trim(); }
function arred2(n) { return Math.round(Number(n || 0) * 100) / 100; }

function lerAbaCompleta(sheet, numCols) {
  if (sheet && ehAbaRegistrosGestor_(sheet.getName())) numCols = COLUNAS_GESTOR_;
  if (!sheet || sheet.getLastRow() < 2) return { raw: [], disp: [] };
  const rng = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols);
  const raw=rng.getValues(),disp=rng.getDisplayValues();
  return { raw:raw, disp:ehAbaRegistrosGestor_(sheet.getName())?disp.map(function(d,i){return valoresExibidosRegistroGestor_(raw[i],d);}):disp };
}

// ----------------------------------------------------------------------------
// LOCALIZAÇÃO SEGURA DA LINHA (serve para Lançamentos e Empréstimos)
// Lançamentos: desc na coluna B (idx 1). Empréstimos: desc na coluna C (idx 2).
// ----------------------------------------------------------------------------
function localizarIndiceSeguro(dispAll, linha, descricao, mesFatura, parcela) {
  const ctx = CONTEXTO_GESTOR_, p = ctx ? ctx.param : {};
  if (p.registroId) {
    const idx = dispAll.findIndex(function (r) { return String(r[11]) === String(p.registroId); });
    if (idx < 0) throw new Error('Este registro foi removido ou movido. Atualize a tela.');
    if (!Number.isInteger(Number(p.versao)) || Number(p.versao) !== Number(dispAll[idx][13])) throw new Error('Este registro mudou em outra tela. Atualize antes de gravar.');
    if (p.compraId && String(p.compraId) !== String(dispAll[idx][12])) throw new Error('A compra mudou. Atualize a tela.');
    return idx;
  }
  const descN = normalizarTexto(descricao), mes = limparApostrofo(mesFatura), parc = limparApostrofo(parcela);
  const ehEmp = ctx && /Emprestimo|GastosPessoais/.test(ctx.action) && ctx.action !== 'moverParaEmprestimosWeb';
  const candidatos = [];
  dispAll.forEach(function (d, i) { const desc = ehEmp ? d[2] : d[1]; if (normalizarTexto(desc) === descN && (!mes || limparApostrofo(d[8]) === mes) && (!parc || limparApostrofo(d[6]) === parc)) candidatos.push(i); });
  if (candidatos.length > 1) throw new Error('Há registros semelhantes. Atualize o app para selecionar pelo identificador seguro.');
  if (ctx && !p.registroId) throw new Error('Atualize o app antes de editar este registro: falta a identificação segura.');
  return candidatos.length === 1 ? candidatos[0] : -1;
}

// Índices de todas as parcelas da mesma compra (Lançamentos)
function indicesMesmaCompra(dispAll, idxAlvo) {
  const alvo = dispAll[idxAlvo];
  if (!alvo) return [];
  if (String(alvo[15] || '').indexOf('ambíguo') >= 0) throw new Error('Esta compra antiga possui parcelas ambíguas. Revise os registros individualmente antes de usar uma ação em lote.');
  const id = String(alvo[12] || '');
  if (!id) return [idxAlvo];
  const indices = [];
  dispAll.forEach(function (r, i) { if (String(r[12] || '') === id) indices.push(i); });
  return indices;
}

// Monta uma linha de 11 colunas de "Lançamentos" aplicando alterações (over)
function montarLinhaLanc(d, r, over) {
  const o = over || {};
  const parc = limparApostrofo(d[6]);
  const linha = [
    "'" + (o.data !== undefined ? o.data : limparApostrofo(d[0])),
    o.desc !== undefined ? o.desc : d[1],
    o.forma !== undefined ? o.forma : d[2],
    o.cat !== undefined ? o.cat : d[3],
    o.total !== undefined ? o.total : r[4],
    r[5],
    (parc === '∞/∞' || !parc) ? parc : "'" + parc,
    o.valor !== undefined ? o.valor : r[7],
    "'" + (o.mes !== undefined ? o.mes : limparApostrofo(d[8])),
    o.status !== undefined ? o.status : d[9],
    o.tags !== undefined ? o.tags : d[10]
  ].concat(r.slice(11, COLUNAS_GESTOR_));
  if (o.status !== undefined && isStatusPago(d[9]) && !isStatusPago(o.status)) linha[17] = 0;
  if (isStatusPago(linha[9])) linha[17] = extractNum(linha[7]);
  return linha;
}

function escreverLinhaPlanilha(sheet, numLinha, linha) {
  sheet.getRange(numLinha, 1, 1, linha.length).setValues([linha]);
  sheet.getRange(numLinha, 5).setNumberFormat(FORMATO_MOEDA_PLANILHA);
  sheet.getRange(numLinha, 8).setNumberFormat(FORMATO_MOEDA_PLANILHA);
}

// ============================================================================
// LANÇAMENTOS: EDITAR / EXCLUIR / ADIANTAR / QUITAR FATURA
// ============================================================================

function editarLancamentoLinhaWebInterno_(dados) {
  validarEdicaoGestor_(dados, false);
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const raw = lido.raw, disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idx < 0) throw new Error('Lançamento não localizado. Atualize a página e tente novamente.');
    dados = Object.assign({}, dados, { formaPagto: validarFormaAtualGestor_(dados.formaPagto, { formaAnterior: disp[idx][2] }), categoria: validarCategoriaAtualGestor_(dados.categoria) });

    const alvo = disp[idx];
    const parcAlvo = limparApostrofo(alvo[6]);
    const infoAlvo = parseNumParcela(parcAlvo);
    const ehParcelado = infoAlvo.total > 1 && parcAlvo !== '∞/∞';

    const descFmt = formatarTituloInteligente(dados.descricao);
    const valor = centavosGestor_(dados.valorParcela) / 100;
    const novaData = limparApostrofo(dados.dataCompra);
    const novoMes = limparApostrofo(dados.mesFatura);
    const mudouMes = novoMes !== limparApostrofo(alvo[8]);
    const infoNovoMes = parseMesFat(novoMes);
    const tags = normalizarTagsGestor_(dados.tags);

    const grupo = ehParcelado ? indicesMesmaCompra(disp, idx) : [idx];
    validarTrocaFormaComPagamentoGestor_(grupo.map(function (i) { return raw[i]; }), dados.formaPagto, false);
    const novas = Object.create(null);

    grupo.forEach(function (i) {
      const d = disp[i], r = raw[i];
      if (i === idx) {
        novas[i] = montarLinhaLanc(d, r, { data: novaData, desc: descFmt, forma: dados.formaPagto, cat: dados.categoria, valor: valor, mes: novoMes, status: dados.status, tags: tags });
        return;
      }
      const over = { data: novaData, desc: descFmt, forma: dados.formaPagto, cat: dados.categoria, tags: tags };
      if (!isStatusPago(d[9])) {
        if (dados.propagarValorParcelas) over.valor = valor;
        if (mudouMes && infoNovoMes.time > 0) {
          const dif = parseNumParcela(limparApostrofo(d[6])).atual - infoAlvo.atual;
          if (dif > 0) {
            const dt = new Date(infoNovoMes.a, (infoNovoMes.m - 1) + dif, 1);
            over.mes = pad2(dt.getMonth() + 1) + '/' + dt.getFullYear();
          }
        }
      }
      novas[i] = montarLinhaLanc(d, r, over);
    });

    if (ehParcelado) {
      const soma = arred2(grupo.reduce(function (acc, i) { return acc + extractNum(novas[i][7]); }, 0));
      grupo.forEach(function (i) { novas[i][4] = soma; });
    } else if (parcAlvo !== '∞/∞') {
      novas[idx][4] = valor;
    }

    Object.keys(novas).forEach(function (k) {
      escreverLinhaPlanilha(lancSheet, parseInt(k, 10) + 2, novas[k]);
    });
    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    return { sucesso: true };
  } catch (e) {
    throw new Error('Falha ao editar lançamento: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function excluirLancamentoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idx < 0) throw new Error('Lançamento não encontrado. Atualize a página.');

    if (limparApostrofo(disp[idx][6]) === '∞/∞') {
      const r = lido.raw[idx].slice();
      if (centavosGestor_(valorPagoBancoGestor_(r,false)) > 0) throw new Error('Esta ocorrência tem pagamento registrado. Confira ou desfaça o pagamento antes de pular o período.');
      r[9] = 'Ocorrência Pulada'; r[14] = 'Em Aberto'; r[17] = 0;
      escreverLinhaPlanilha(lancSheet,idx+2,r);
      organizarEAtualizarPlanilha(lancSheet,pagtoSheet);
      return {sucesso:true,qtd:1,pulada:true};
    }

    let alvos = [idx];
    if (dados.excluirTodasParcelas) {
      alvos = indicesMesmaCompra(disp, idx).filter(function (i) {
        return i === idx || (!isStatusPago(disp[i][9]) && !isStatusCancelado(disp[i][9]));
      });
    }
    alvos.map(function (i) { return i + 2; }).sort(function (a, b) { return b - a; }).forEach(function (n) {
      lancSheet.deleteRow(n);
    });
    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    return { sucesso: true, qtd: alvos.length };
  } catch (e) {
    throw new Error('Falha ao excluir: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// Antecipação estilo Nubank: puxa as últimas parcelas futuras em aberto para a fatura destino
function previaAntecipacaoWeb(dados) {
  if(!CONTEXTO_GESTOR_) return executarOperacaoGestor_('previaAntecipacaoWeb',dados,function() { return previaAntecipacaoWeb(dados); },true);
  const sh=obterPlanilhaGestor_().getSheetByName('Lançamentos'), lido=lerAbaCompleta(sh,COLUNAS_GESTOR_), raw=lido.raw, disp=lido.disp;
  const idx=localizarIndiceSeguro(disp,dados.linha,dados.descOriginal,dados.mesOriginal,dados.parcelaOriginal);
  if(idx<0 || limparApostrofo(disp[idx][6])==='∞/∞' || parseNumParcela(disp[idx][6]).total<=1) throw new Error('Selecione uma compra parcelada para antecipar.');
  const mes=validarMesFaturaWeb_(dados.mesDestino), destino=parseMesFat(mes), grupo=indicesMesmaCompra(disp,idx);
  const textoQtd=String(dados.qtdAdiantar==null?'':dados.qtdAdiantar).trim();
  if(textoQtd!=='' && (!/^\d+$/.test(textoQtd) || !Number.isSafeInteger(Number(textoQtd)) || Number(textoQtd)<=0)) throw new Error('Informe uma quantidade inteira maior que zero, ou deixe vazio para todas.');
  let alvos=grupo.filter(function(i) { return !isStatusPago(disp[i][9]) && !isStatusCancelado(disp[i][9]) && parseMesFat(disp[i][8]).time>destino.time; });
  alvos.sort(function(a,b) { return parseNumParcela(disp[b][6]).atual-parseNumParcela(disp[a][6]).atual; });
  if(textoQtd!=='') alvos=alvos.slice(0,Number(textoQtd));
  if(!alvos.length) throw new Error('Não há parcelas futuras em aberto depois de '+mes+'.');
  let soma=alvos.reduce(function(s,i) { return s+centavosGestor_(raw[i][7]); },0);
  const descontoNumero=Number(dados.descontoTotal || 0);
  if(!Number.isFinite(descontoNumero) || descontoNumero<0) throw new Error('Informe um desconto válido, maior ou igual a zero.');
  let desconto=centavosGestor_(descontoNumero);
  if(desconto>soma) throw new Error('O desconto não pode ultrapassar o total das parcelas escolhidas.');
  const totalAntes=soma, descontoTotal=desconto;
  const itens=alvos.map(function(i,pos) {
    const valor=centavosGestor_(raw[i][7]), abatimento=pos===alvos.length-1?desconto:Math.min(valor,Math.floor(desconto*valor/soma));
    desconto-=abatimento; soma-=valor;
    const pago=centavosGestor_(valorPagoBancoGestor_(raw[i],false));
    if (pago>0) throw new Error('A parcela '+limparApostrofo(disp[i][6])+' já possui pagamento de '+formatBRL(pago/100)+' na fatura '+limparApostrofo(disp[i][8])+'. Antecipe somente parcelas sem pagamento registrado. Confira ou desfaça o pagamento original antes de alterar esse período.');
    if(valor-abatimento<pago) throw new Error('O desconto deixaria uma parcela abaixo do pagamento já registrado. Confira o pagamento antes de antecipar.');
    return {id:raw[i][11],versao:Number(raw[i][13]),parcela:limparApostrofo(disp[i][6]),mesOrigem:limparApostrofo(disp[i][8]),valorAntes:valor/100,valorDepois:(valor-abatimento)/100,pagoBanco:pago/100};
  });
  const previa={sucesso:true,mesDestino:mes,qtd:itens.length,descontoTotal:descontoTotal/100,totalAntes:totalAntes/100,totalDepois:(totalAntes-descontoTotal)/100,marcarComoPago:dados.marcarComoPago===true,itens:itens};
  previa.previaHash=hashGestor_([previa,grupo.map(function(i) { return [raw[i][11],raw[i][13],hashRegistroGestor_(raw[i])]; })]);
  return previa;
}
function adiantarParcelasWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    const previa=previaAntecipacaoWeb(dados);
    if(!dados.previaHash || dados.previaHash!==previa.previaHash) throw new Error('As parcelas mudaram ou ainda não foram conferidas. Abra uma nova prévia antes de antecipar.');
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const raw = lido.raw, disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idx < 0) throw new Error('Compra não localizada.');

    const mesDestino = validarMesFaturaWeb_(dados.mesDestino);
    const infoDest = parseMesFat(mesDestino);
    if (infoDest.time === 0) throw new Error('Fatura destino inválida. Use o formato MM/AAAA.');

    const grupo = indicesMesmaCompra(disp, idx);
    let candidatas = grupo.filter(function (i) {
      return !isStatusPago(disp[i][9]) && !isStatusCancelado(disp[i][9]) && parseMesFat(disp[i][8]).time > infoDest.time;
    });
    candidatas.sort(function (a, b) {
      return parseNumParcela(limparApostrofo(disp[b][6])).atual - parseNumParcela(limparApostrofo(disp[a][6])).atual;
    });
    const qtd = parseInt(dados.qtdAdiantar, 10);
    if (!isNaN(qtd) && qtd > 0) candidatas = candidatas.slice(0, qtd);
    if (candidatas.length === 0) throw new Error('Não há parcelas futuras em aberto depois de ' + mesDestino + '.');

    const somaOrig = candidatas.reduce(function (acc, i) { return acc + extractNum(raw[i][7]); }, 0);
    const desconto = Math.min(Math.max(extractNum(dados.descontoTotal), 0), somaOrig);

    const novas = Object.create(null);
    let descontoRestante = centavosGestor_(desconto), somaRestante = candidatas.reduce(function (a, i) { return a + centavosGestor_(raw[i][7]); }, 0);
    candidatas.forEach(function (i, pos) {
      const vCentavos = centavosGestor_(raw[i][7]);
      const abatimento = pos === candidatas.length - 1 ? descontoRestante : Math.min(vCentavos, Math.floor(descontoRestante * vCentavos / somaRestante));
      descontoRestante -= abatimento; somaRestante -= vCentavos;
      const novoV = (vCentavos - abatimento) / 100;
      novas[i] = montarLinhaLanc(disp[i], raw[i], {
        valor: novoV,
        mes: mesDestino,
        status: previa.marcarComoPago ? 'Pago' : disp[i][9]
      });
    });

    const soma = arred2(grupo.reduce(function (acc, i) {
      return acc + extractNum(novas[i] ? novas[i][7] : raw[i][7]);
    }, 0));
    grupo.forEach(function (i) {
      const linha = novas[i] || montarLinhaLanc(disp[i], raw[i], {});
      linha[4] = soma;
      novas[i] = linha;
    });

    Object.keys(novas).forEach(function (k) {
      escreverLinhaPlanilha(lancSheet, parseInt(k, 10) + 2, novas[k]);
    });
    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    return { sucesso: true, qtdAdiantada: candidatas.length };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function quitarFaturaWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const lido = lerAbaCompleta(lancSheet, 11);
    const disp = lido.disp;
    const forma = chaveFormaGestor_(dados.forma);
    const mes = validarMesFaturaWeb_(dados.mesFatura);
    const info = parseMesFat(mes);
    const hoje = getHojeSeguro();
    const mesPassado = info.a < hoje.getFullYear() || (info.a === hoje.getFullYear() && info.m < (hoje.getMonth() + 1));

    const colStatus = disp.map(function (d) { return [d[9]]; });
    let qtd = 0;
    disp.forEach(function (d, i) {
      if (!String(d[1] || '').trim()) return;
      if (chaveFormaGestor_(d[2]) !== forma || limparApostrofo(d[8]) !== mes) return;
      const st = String(d[9] || '').trim();
      if (isStatusPago(st) || isStatusCancelado(st)) return;
      colStatus[i][0] = (st === 'Assinatura Ativa') ? (mesPassado ? 'Pago' : 'Assinatura Paga') : 'Pago';
      qtd++;
    });
    if (qtd > 0) lancSheet.getRange(2, 10, colStatus.length, 1).setValues(colStatus);
    const emp = ss.getSheetByName('Empréstimos');
    let qtdTerceiros = 0;
    if (emp && emp.getLastRow() > 1) {
      const e = lerAbaCompleta(emp, COLUNAS_GESTOR_);
      e.raw.forEach(function (r, i) {
        if (chaveFormaGestor_(e.disp[i][3]) === forma && limparApostrofo(e.disp[i][8]) === mes && r[14] !== 'Pago') { emp.getRange(i + 2, 15).setValue('Pago'); qtdTerceiros++; }
      });
    }
    return { sucesso: true, qtd: qtd, qtdTerceiros: qtdTerceiros };
  } catch (e) {
    throw new Error('Falha ao quitar fatura: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// ASSINATURAS (DESPESAS FIXAS)
// ============================================================================

function editarAssinaturaWebInterno_(dados) {
  const ss = obterPlanilhaGestor_(), lancSheet = ss.getSheetByName('Lançamentos'), pagtoSheet = ss.getSheetByName('Formas de Pagamento');
  const lido = lerAbaCompleta(lancSheet, COLUNAS_GESTOR_), raw = lido.raw, disp = lido.disp;
  const idx = localizarIndiceSeguro(disp, dados.linhaBase, dados.descOriginal, '', '∞/∞');
  if (idx < 0 || limparApostrofo(disp[idx][6]) !== '∞/∞') throw new Error('Assinatura não localizada. Atualize a tela.');
  const grupo = indicesMesmaCompra(disp, idx), descNova = formatarTituloInteligente(dados.novaDesc), formaNova = validarFormaAtualGestor_(dados.novaForma, { formaAnterior: disp[idx][2] }), catNova = validarCategoriaAtualGestor_(dados.novaCat);
  const valorNovo = centavosGestor_(dados.novaValor) / 100;
  if (!descNova || !formaNova || !catNova || valorNovo <= 0) throw new Error('Informe descrição, forma de pagamento, categoria e valor válido.');
  if (grupo.some(function (i) { return serieRecorrenteGestor_(raw[i]).encerrada; })) throw new Error('Esta recorrência já foi encerrada. Crie uma nova despesa fixa para recomeçar.');
  const hojeInicio=getHojeSeguro(), mesHoje=pad2(hojeInicio.getMonth()+1)+'/'+hojeInicio.getFullYear();
  const inicio=validarMesFaturaWeb_(dados.aPartirMes || mesHoje), tempoInicio=parseMesFat(inicio).time;
  if (tempoInicio<parseMesFat(mesHoje).time) throw new Error('As novas condições devem começar no mês atual ou em um mês futuro. Edite um registro histórico separadamente.');
  const afetadas=grupo.filter(function(i){return parseMesFat(disp[i][8]).time>=tempoInicio && !isStatusPago(disp[i][9]) && !isStatusCancelado(disp[i][9]);});
  validarTrocaFormaComPagamentoGestor_(afetadas.map(function (i) { return raw[i]; }), formaNova, false);
  if (disp.some(function (r) { return r[12] !== disp[idx][12] && limparApostrofo(r[6]) === '∞/∞' && !serieRecorrenteGestor_(r).encerrada && r[9] !== 'Assinatura Cancelada' && r[9] !== 'Pago (Cancelada)' && normalizarTexto(r[1]) === normalizarTexto(descNova) && chaveFormaGestor_(r[2]) === chaveFormaGestor_(formaNova); })) throw new Error('Já existe outra assinatura ativa com esta descrição e forma de pagamento.');
  const diaReferencia = diaReferenciaSerieGestor_(grupo.map(function (i) { return raw[i]; }));
  let qtd = 0;
  grupo.forEach(function (i) {
    const st = String(disp[i][9]);
    if (isStatusCancelado(st) || st === 'Pago (Cancelada)') return;
    if (parseMesFat(disp[i][8]).time >= tempoInicio && !isStatusPago(st)) {
      const nova = montarLinhaLanc(disp[i], raw[i], { desc: descNova, forma: formaNova, cat: catNova, valor: valorNovo });
      definirSerieRecorrenteGestor_(nova, { diaReferencia: diaReferencia, encerrada: false });
      escreverLinhaPlanilha(lancSheet, i + 2, nova); qtd++;
    }
  });
  // Uma condição precisa existir no primeiro período alterável solicitado,
  // mesmo que já tenham sido atualizadas outras ocorrências mais à frente.
  const ref = new Date(tempoInicio);
  while(grupo.some(function(i){return parseMesFat(disp[i][8]).time===ref.getTime()&&(isStatusPago(disp[i][9])||isStatusCancelado(disp[i][9]));}))ref.setMonth(ref.getMonth()+1);
  if (!grupo.some(function(i){return parseMesFat(disp[i][8]).time===ref.getTime();})) {
    const mes = pad2(ref.getMonth() + 1) + '/' + ref.getFullYear();
    const nova = montarLinhaLanc(disp[idx], raw[idx], { desc: descNova, forma: formaNova, cat: catNova, valor: valorNovo, mes: mes, status: 'Assinatura Ativa' });
    const dia = Math.min(diaReferencia, new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate());
    nova[0] = "'" + pad2(dia) + '/' + mes; nova[11] = gerarIdGestor_(); nova[13] = 1; nova[14] = 'Em Aberto'; nova[17] = 0;
    definirSerieRecorrenteGestor_(nova, { diaReferencia: diaReferencia, encerrada: false });
    escreverLinhaPlanilha(lancSheet, Math.max(2, lancSheet.getLastRow() + 1), nova); qtd++;
  }
  organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
  return { sucesso: true, qtd: qtd, aPartirMes:pad2(ref.getMonth()+1)+'/'+ref.getFullYear() };
}

function cancelarAssinaturaWebInterno_(dados) {
  const ss = obterPlanilhaGestor_(), sheet = ss.getSheetByName('Lançamentos'), lido = lerAbaCompleta(sheet, COLUNAS_GESTOR_);
  const idx = localizarIndiceSeguro(lido.disp, dados.linhaBase, dados.descricao, '', '∞/∞');
  if (idx < 0 || limparApostrofo(lido.disp[idx][6]) !== '∞/∞') throw new Error('Assinatura não localizada. Atualize a tela.');
  const grupo = indicesMesmaCompra(lido.disp, idx); let qtd = 0;
  const hoje = getHojeSeguro(), mesEncerramento = dados.mesEncerramento ? validarMesFaturaWeb_(dados.mesEncerramento) : pad2(hoje.getMonth() + 1) + '/' + hoje.getFullYear();
  const diaReferencia = diaReferenciaSerieGestor_(grupo.map(function (i) { return lido.raw[i]; }));
  grupo.forEach(function (i) {
    const linha = lido.raw[i].slice();
    if (serieRecorrenteGestor_(linha).encerrada) return;
    definirSerieRecorrenteGestor_(linha, { diaReferencia: diaReferencia, encerrada: true, encerramentoMes: mesEncerramento });
    // Encerrar novas ocorrências não estorna uma cobrança existente.
    escreverLinhaPlanilha(sheet, i + 2, linha); qtd++;
  });
  return { sucesso: true, qtd: qtd, mesEncerramento: mesEncerramento, cobrancasPreservadas: true };
}

// ============================================================================
// NOTAS
// ============================================================================

function lerNotasGestor_(sh) {
  if (!sh || sh.getLastRow() < 2) return { anotacoes: [], revision: 0 };
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const notas = v.filter(function (r) { return r[0] && r[5] !== true; }).map(function (r) { return { id: limparApostrofo(r[0]), texto: limparTextoLiteralGestor_(r[1]), concluida: r[2] === true || String(r[2]).toLowerCase() === 'true', data: limparApostrofo(r[3]), revision: Number(r[4] || 1) }; });
  return { anotacoes: notas, revision: v.reduce(function (soma, r) { return soma + (r[0] ? Number(r[4] || 1) : 0); }, 0) };
}
function salvarNotasWebInterno_(param) {
  if (!param || !Array.isArray(param.operacoes) || param.operacoes.length > 500) throw new Error('Atualize o app para sincronizar as alterações das notas.');
  const ss = obterPlanilhaGestor_(); let sh = ss.getSheetByName('Anotações');
  if (!sh) { sh = ss.insertSheet('Anotações'); sh.getRange(1, 1, 1, 6).setValues([['ID','Texto','Concluída','Data','Versão','Excluída']]); sh.setFrozenRows(1); }
  const linhas = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues() : [];
  const vistos = new Set();
  param.operacoes.forEach(function (op) {
    const id = String(op.id || '');
    if (!id || id.length > 160 || vistos.has(id)) throw new Error('Identificação de nota inválida ou repetida.'); vistos.add(id);
    const i = linhas.findIndex(function (r) { return limparApostrofo(r[0]) === id; }), atual = i >= 0 ? linhas[i] : null;
    if (atual && Number(op.revision) !== Number(atual[4] || 1)) throw new Error('Esta nota mudou em outro dispositivo. Atualize as notas antes de gravar.');
    if (op.tipo === 'delete') { if (atual) { atual[4] = Number(atual[4] || 1) + 1; atual[5] = true; } return; }
    if (op.tipo !== 'upsert' || !op.nota || !String(op.nota.texto || '').trim()) throw new Error('Nota inválida.');
    if (atual && atual[5] === true) throw new Error('Esta nota foi excluída em outro dispositivo.');
    const n = op.nota;
    const linha = ["'" + id, textoLiteralGestor_(n.texto), n.concluida === true, "'" + String(n.data || ''), atual ? Number(atual[4] || 1) + 1 : 1, false];
    if (i >= 0) linhas[i] = linha; else linhas.push(linha);
  });
  if (linhas.length) sh.getRange(2, 1, linhas.length, 6).setValues(linhas);
  const estado = lerNotasGestor_(sh);
  return { sucesso: true, anotacoes: estado.anotacoes, revision: estado.revision, operacoesConfirmadas: param.operacoes.map(function (op) { return op.id; }) };
}

// ============================================================================
// Pagamentos à vista não comprometem limite de cartão; continuam com parcelas
// próprias de recebimento no controle de empréstimos.
function formaEmprestimoConsomeLimite_(forma) {
  return tipoFormaGestor_(forma) === 'cartao';
}

// EMPRÉSTIMOS: NOVO REGISTRO
// ============================================================================

function salvarEmprestimoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Dados do empréstimo inválidos.');
    validarDataCalendarioWeb_(dados.dataCompra, 'Data da compra');
    if (!String(dados.formaPagto || '').trim()) throw new Error('Selecione como o empréstimo foi pago.');
    const formaPagto = validarFormaAtualGestor_(dados.formaPagto, { novaCompra: true });
    let mesPrimeiraFatura = limparApostrofo(dados.mesPrimeiraFatura);
    if (ehPagamentoImediatoGestor_(formaPagto)) {
      if (mesPrimeiraFatura) {
        mesPrimeiraFatura = validarMesFaturaWeb_(mesPrimeiraFatura);
      } else {
        const partesData = limparApostrofo(dados.dataCompra).split('/');
        mesPrimeiraFatura = partesData.length === 3 ? partesData[1] + '/' + partesData[2] : '';
      }
    } else {
      mesPrimeiraFatura = validarMesFaturaWeb_(mesPrimeiraFatura);
    }

    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);

    const valorTotal = centavosGestor_(dados.valorTotal) / 100;
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) throw new Error('Informe um valor maior que zero.');
    const numParcelas = permiteParcelamentoFormaGestor_(formaPagto,dados.pixParcelado) ? Number(dados.numParcelas || 1) : 1;
    const parcelaInicial = permiteParcelamentoFormaGestor_(formaPagto,dados.pixParcelado) ? Number(dados.parcelaInicial || 1) : 1;
    if (!Number.isInteger(numParcelas) || numParcelas < 1 || numParcelas > 600) throw new Error('O número de parcelas deve ser um inteiro positivo.');
    if (!Number.isInteger(parcelaInicial) || parcelaInicial < 1 || parcelaInicial > numParcelas) {
      throw new Error('A parcela inicial deve estar entre 1 e o total de parcelas.');
    }
    const totalCentavos = Math.round(valorTotal * 100);
    if (totalCentavos < numParcelas) throw new Error('Cada parcela deve ter pelo menos um centavo.');
    const centavosBase = Math.floor(totalCentavos / numParcelas);
    const sobraCentavos = totalCentavos % numParcelas;

    const hoje = getHojeSeguro();
    const pm = mesPrimeiraFatura.split('/');
    const mesFat = Number(pm[0]);
    const anoFat = Number(pm[1]);

    const pessoa = formatarTituloInteligente(dados.pessoa);
    const desc = formatarTituloInteligente(dados.descricao);
    if (!pessoa || !desc) throw new Error('Informe a pessoa e a descrição.');
    const dtStr = limparApostrofo(dados.dataCompra);
    if(dados.dataCombinada)validarDataCalendarioWeb_(dados.dataCombinada,'Data combinada');

    const linhas = [];
    for (let p = parcelaInicial; p <= numParcelas; p++) {
      const dRef = new Date(anoFat, (mesFat - 1) + (p - parcelaInicial), 1);
      const valorParcela = (centavosBase + (p <= sobraCentavos ? 1 : 0)) / 100;
      linhas.push([
        "'" + dtStr, pessoa, desc, formaPagto, valorTotal, numParcelas,
        "'" + p + '/' + numParcelas, valorParcela,
        "'" + pad2(dRef.getMonth() + 1) + '/' + dRef.getFullYear(),
        dados.recebidoInicial === true ? 'Recebido' : 'A Receber', dados.observacoes || ''
      ]);
    }

    const prox = Math.max(2, empSheet.getLastRow() + 1);
    empSheet.getRange(prox, 1, linhas.length, 11).setValues(linhas);
    if(dados.dataCombinada){const base=parseDataBR(dados.dataCombinada);const controles=linhas.map(function(_,i){const dt=new Date(base.getFullYear(),base.getMonth()+i,1);dt.setDate(Math.min(base.getDate(),new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));const r=[];definirDataCombinadaGestor_(r,Utilities.formatDate(dt,getTimezone(),'dd/MM/yyyy'));return [r[15]];});empSheet.getRange(prox,16,controles.length,1).setValues(controles);}
    empSheet.getRange(prox, 5, linhas.length, 1).setNumberFormat(FORMATO_MOEDA_PLANILHA);
    empSheet.getRange(prox, 8, linhas.length, 1).setNumberFormat(FORMATO_MOEDA_PLANILHA);
    organizarAbaEmprestimos(empSheet);
    return { sucesso: true, qtd: linhas.length };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// CARTÕES / FORMAS DE PAGAMENTO (aba "Formas de Pagamento", dados a partir da linha 7, colunas B..G)
// ============================================================================

function encontrarLinhaForma(pagtoSheet, nome) {
  const alvo = chaveFormaGestor_(nome);
  if (!alvo || !pagtoSheet || pagtoSheet.getLastRow() < 7) return -1;
  validarNomesFormasGestor_(pagtoSheet.getDataRange().getValues());
  const nomes = pagtoSheet.getRange(7, 2, pagtoSheet.getLastRow() - 6, 1).getValues();
  for (let i = 0; i < nomes.length; i++) {
    if (chaveFormaGestor_(nomes[i][0]) === alvo) return i + 7;
  }
  return -1;
}

function renomearFormaNasAbas(ss, de, para) {
  [['Lançamentos', 3], ['Empréstimos', 4]].forEach(function (par) {
    const sh = ss.getSheetByName(par[0]);
    if (!sh || sh.getLastRow() < 2) return;
    const rng = sh.getRange(2, par[1], sh.getLastRow() - 1, 1);
    const vals = rng.getValues();
    let mudou = false;
    vals.forEach(function (l) {
      if (chaveFormaGestor_(l[0]) === chaveFormaGestor_(de)) { l[0] = para; mudou = true; }
    });
    if (mudou) rng.setValues(vals);
  });
}

function versaoConfiguracaoGestor_(ss, grupo) {
  const sh = ss.getSheetByName(grupo === 'formas' ? 'Formas de Pagamento' : 'Dashboard & Resumo');
  if (!sh) return hashEstadoGestor_([]);
  function ler(rng) { const v=rng.getValues(), f=rng.getFormulas(); return v.map(function(r,i){return r.map(function(x,j){return f[i][j] || x;});}); }
  if (grupo === 'formas') {
    const linhas = sh.getLastRow() < 7 ? [] : ler(sh.getRange(7,2,sh.getLastRow()-6,6));
    const colunaTipo = colunaTipoFormaGestor_(sh, false);
    return hashEstadoGestor_([linhas, colunaTipo && sh.getLastRow() >= 7 ? ler(sh.getRange(7,colunaTipo,sh.getLastRow()-6,1)) : []]);
  }
  return hashEstadoGestor_([ler(sh.getRange('B17:B41')).map(function(r){return r[0];}),ler(sh.getRange('D17:D41')).map(function(r){return r[0];})]);
}
function validarVersaoConfiguracaoGestor_(ss, grupo, param) {
  if (!param || typeof param.versaoConfiguracao !== 'string' || param.versaoConfiguracao !== versaoConfiguracaoGestor_(ss, grupo)) throw new Error('A configuração mudou ou esta tela está desatualizada. Seu rascunho foi mantido. Atualize os dados e confira as alterações antes de salvar novamente.');
}
function numeroConfiguracaoGestor_(valor, campo) {
  if (valor === '' || valor == null) return 0;
  const n = typeof valor === 'number' ? valor : (/^-?\d+(?:[.,]\d+)?$/.test(String(valor).trim()) ? Number(String(valor).trim().replace(',','.')) : NaN);
  if (!Number.isFinite(n) || n < 0 || n > Number.MAX_SAFE_INTEGER/100) throw new Error(campo + ' deve ser um número válido, maior ou igual a zero.');
  return Math.round(n*100)/100;
}
function diaConfiguracaoGestor_(valor, campo) {
  if (valor === '' || valor == null) return '';
  const n=Number(valor);
  if (!Number.isInteger(n) || n<1 || n>31) throw new Error(campo + ' deve ser um dia inteiro entre 1 e 31.');
  return n;
}

function salvarFormaPagamentoWebInterno_(dados) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    if (!sh) throw new Error('Aba "Formas de Pagamento" não encontrada.');

    const orig = String(dados.nomeOriginal || '').trim();
    const nome = String(dados.nome || '').trim();
    if (!nome) throw new Error('Informe o nome do cartão.');
    const banco = String(dados.banco || '').trim();
    validarVersaoConfiguracaoGestor_(ss, 'formas', dados);
    const limite = numeroConfiguracaoGestor_(dados.limite, 'Limite');
    const fech = diaConfiguracaoGestor_(dados.fechamento, 'Fechamento');
    const venc = diaConfiguracaoGestor_(dados.vencimento, 'Vencimento');

    let linha = -1;
    if (orig) {
      linha = encontrarLinhaForma(sh, orig);
      if (linha < 0) throw new Error('Cartão original não encontrado.');
      const conflito = encontrarLinhaForma(sh, nome);
      if (conflito > 0 && conflito !== linha) throw new Error('Já existe um cartão com esse nome.');
    } else {
      if (encontrarLinhaForma(sh, nome) > 0) throw new Error('Já existe um cartão com esse nome.');
      linha = sh.getLastRow() + 1;
      if (linha < 7) linha = 7;
      const uL = sh.getLastRow();
      if (uL >= 7) {
        const nomes = sh.getRange(7, 2, uL - 6, 1).getValues();
        for (let i = 0; i < nomes.length; i++) {
          if (!String(nomes[i][0]).trim()) { linha = i + 7; break; }
        }
      }
    }

    // O tipo acompanha o cadastro, não o texto escolhido para seu nome.
    const tipo = orig ? tipoFormaGestor_(orig, ss) : (dados.tipo || tipoLegadoFormaGestor_(nome));
    if(orig===nome && dados.reativar===true){sh.getRange(linha,7).setValue('');return {sucesso:true,reativado:true};}
    if (!['cartao', 'pix', 'avista'].includes(tipo)) throw new Error('Esta linha de resumo não pode ser alterada como forma de pagamento.');
    if (orig && dados.tipo && dados.tipo !== tipo) throw new Error('Alterar o nome não altera o tipo da forma. Uma troca de tipo exige conferir os pagamentos vinculados.');
    const colunaTipo = garantirTiposFormasGestor_(sh);
    sh.getRange(linha, 2, 1, 5).setValues([[textoLiteralGestor_(nome), textoLiteralGestor_(banco), limite, isNaN(fech) ? '' : fech, isNaN(venc) ? '' : venc]]);
    sh.getRange(linha, colunaTipo).setValue(tipo);
    if (dados.reativar === true) sh.getRange(linha, 7).setValue('');
    if (orig && orig !== nome) renomearFormaNasAbas(ss, orig, nome);
    if (CONTEXTO_GESTOR_) { CONTEXTO_GESTOR_.tiposFormas = null; CONTEXTO_GESTOR_.nomesFormas = null; }
    organizarFormasPagamento(sh);
    return { sucesso: true };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function reordenarFormasPagamentoWebInterno_(param) {
  const nomes = param.ordem || [];
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    if (!sh || sh.getLastRow() < 7) return { sucesso: true };

    validarVersaoConfiguracaoGestor_(ss, 'formas', param);
    const colunaTipo = garantirTiposFormasGestor_(sh);
    const rng = sh.getRange(7, 2, sh.getLastRow() - 6, 6);
    const v = rng.getValues();
    const tipos = sh.getRange(7, colunaTipo, v.length, 1).getValues();
    const cadastros = v.map(function (r,i) { return {valores:r,tipo:tipos[i][0]}; });
    const usados = new Set();
    const novo = [];
    (nomes || []).forEach(function (n) {
      const alvo = chaveFormaGestor_(n);
      for (let ix = 0; ix < v.length; ix++) {
        if (!usados.has(ix) && chaveFormaGestor_(v[ix][0]) === alvo) {
          usados.add(ix);
          novo.push(cadastros[ix]);
          break;
        }
      }
    });
    cadastros.forEach(function (cadastro, ix) { if (!usados.has(ix)) novo.push(cadastro); });
    rng.setValues(novo.map(function (cadastro) { return cadastro.valores; }));
    sh.getRange(7, colunaTipo, novo.length, 1).setValues(novo.map(function (cadastro) { return [cadastro.tipo]; }));
    return { sucesso: true };
  } catch (e) {
    throw new Error('Falha ao reordenar: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function excluirFormaPagamentoWebInterno_(param) {
  const nome = param.nome;
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    validarVersaoConfiguracaoGestor_(ss, 'formas', param);
    const linha = encontrarLinhaForma(sh, nome);
    if (linha < 0) throw new Error('Cartão não encontrado.');

    // Se já existem lançamentos/empréstimos com esse cartão, apenas ARQUIVA (preserva o histórico)
    const alvo = chaveFormaGestor_(nome);
    let emUso = false;
    [['Lançamentos', 3], ['Empréstimos', 4]].forEach(function (par) {
      const aba = ss.getSheetByName(par[0]);
      if (!aba || aba.getLastRow() < 2 || emUso) return;
      const vals = aba.getRange(2, par[1], aba.getLastRow() - 1, 1).getValues();
      if (vals.some(function (l) { return chaveFormaGestor_(l[0]) === alvo; })) emUso = true;
    });

    // Uma exclusão ainda reversível também depende deste cadastro.
    if (!emUso) emUso = formaReferidaNoHistoricoGestor_(nome);
    if (emUso) {
      garantirTiposFormasGestor_(sh);
      sh.getRange(linha, 7).setValue('Arquivado');
      return { sucesso: true, arquivado: true };
    }
    sh.deleteRow(linha);
    return { sucesso: true, arquivado: false };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// CATEGORIAS E METAS (Dashboard & Resumo: nomes B17:B41, metas D17:D41)
// ============================================================================

function salvarCategoriasWebInterno_(param) {
  const lock = obterLockGestor_();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const dash = ss.getSheetByName('Dashboard & Resumo');
    if (!dash) throw new Error('Aba "Dashboard & Resumo" não encontrada.');

    // aceita o formato antigo (lista) e o novo ({ categorias, renomeacoes })
    const lista = Array.isArray(param) ? param : (param && param.categorias);
    const renomeacoes = (!Array.isArray(param) && param && param.renomeacoes) ? param.renomeacoes : [];

    validarVersaoConfiguracaoGestor_(ss, 'categorias', param);
    if (!Array.isArray(lista) || lista.length > 25) throw new Error('Informe no máximo 25 categorias; nenhum item foi descartado.');
    if (!Array.isArray(renomeacoes)) throw new Error('Renomeações de categorias inválidas.');
    const vistos = new Set();
    const cats = lista.map(function(c) {
      const nome=c && typeof c.nome === 'string' ? c.nome.trim() : '';
      const chave=chaveCategoria(nome);
      if (!nome || nome.length>150 || !chave || vistos.has(chave)) throw new Error('Cada categoria deve ter um nome válido e único.');
      vistos.add(chave);
      return {nome:nome, meta:numeroConfiguracaoGestor_(c.meta,'Meta')};
    });
    const temOutros=cats.some(function(c){return chaveCategoria(c.nome)==='outros';});
    if (!temOutros && listarNomesCategoriasConfig(dash).some(function(n){return chaveCategoria(n)==='outros';})) throw new Error('Outros é uma categoria reservada e não pode ser removida. Você pode ajustar sua meta.');
    if(!temOutros) { if(cats.length>=25) throw new Error('Reserve um dos 25 espaços para Outros. Nenhuma categoria foi descartada.');cats.push({nome:'Outros 📦',meta:0});vistos.add('outros'); }
    if(renomeacoes.some(function(r){return r && chaveCategoria(r.de)==='outros' && chaveCategoria(r.para)!=='outros';})) throw new Error('O nome da categoria Outros é fixo.');
    cats.forEach(function(c){if(chaveCategoria(c.nome)==='outros')c.nome='Outros 📦';});
    cats.sort(function(a,b){return chaveCategoria(a.nome)==='outros'?1:chaveCategoria(b.nome)==='outros'?-1:a.nome.localeCompare(b.nome,'pt-BR');});
    renomeacoes.forEach(function(r){ if (!r || typeof r.de !== 'string' || !chaveCategoria(r.de) || typeof r.para !== 'string' || !vistos.has(chaveCategoria(r.para))) throw new Error('Confira os nomes das categorias renomeadas.'); });
    const nomes = [], metas = [];
    for (let i = 0; i < 25; i++) {
      const c = cats[i];
      const nome = c ? String(c.nome || '').trim() : '';
      const meta = c ? extractNum(c.meta) : 0;
      nomes.push([textoLiteralGestor_(nome)]);
      metas.push([nome && meta > 0 ? meta : '']);
    }
    dash.getRange('B17:B41').setValues(nomes);
    dash.getRange('D17:D41').setValues(metas);

    // Renomear categoria = atualizar o nome em TODOS os lançamentos (a categoria não vira "antiga")
    let qtdRenomeadas = 0;
    if (renomeacoes.length > 0) {
      const lanc = ss.getSheetByName('Lançamentos');
      if (lanc && lanc.getLastRow() >= 2) {
        const rng = lanc.getRange(2, 4, lanc.getLastRow() - 1, 1);
        const vals = rng.getValues();
        const mapa = Object.create(null);
        renomeacoes.forEach(function (r) {
          // Use a mesma chave tolerante dos relatórios para incluir registros
          // antigos que diferem apenas por acento, emoji ou pontuação.
          if (r && r.de && r.para) mapa[chaveCategoria(r.de)] = String(r.para).trim();
        });
        vals.forEach(function (l) {
          const k = chaveCategoria(l[0]);
          if (mapa[k] !== undefined) { l[0] = mapa[k]; qtdRenomeadas++; }
        });
        if (qtdRenomeadas > 0) rng.setValues(vals);
      }
    }
    return { sucesso: true, qtdRenomeadas: qtdRenomeadas };
  } catch (e) {
    throw new Error('Falha ao salvar categorias: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------------------------------
// CATEGORIAS: comparação tolerante (ignora emoji, acento, espaço e pontuação)
// ----------------------------------------------------------------------------
function chaveCategoria(s) {
  return normalizarTexto(s).replace(/[^a-z0-9]/g, '');
}

function listarNomesCategoriasConfig(dashSheet) {
  const nomes = [];
  if (!dashSheet) return nomes;
  const v = dashSheet.getRange('B17:B41').getValues();
  v.forEach(function (r) {
    const n = String(r[0] || '').trim();
    if (n) nomes.push(n);
  });
  return nomes;
}

// nome igual/parecido com uma categoria atual -> usa o nome atual; senão -> "Nome (Antigo)"
function resolverCategoria(raw, nomesConfig) {
  const nome = String(raw || '').trim();
  if (!nome) return 'Sem Categoria';
  if (!nomesConfig || nomesConfig.length === 0) return nome;
  if (nomesConfig.indexOf(nome) >= 0) return nome;
  const chave = chaveCategoria(nome);
  for (let i = 0; i < nomesConfig.length; i++) {
    if (chaveCategoria(nomesConfig[i]) === chave) return nomesConfig[i];
  }
  if (nome === 'Sem Categoria') return nome;
  return nome + ' (Antigo)';
}

// Mostra, sem alterar a planilha, quais nomes serão reunidos pela unificação.
function previsualizarUnificacaoCategoriasNaPlanilha() {
  const ss = obterPlanilhaGestor_();
  const lanc = ss.getSheetByName('Lançamentos');
  const nomesConfig = listarNomesCategoriasConfig(ss.getSheetByName('Dashboard & Resumo'));
  if (!lanc || lanc.getLastRow() < 2 || nomesConfig.length === 0) {
    const vazio = { total: 0, alteracoes: [] };
    console.log(JSON.stringify(vazio));
    return vazio;
  }
  const rng = lanc.getRange(2, 4, lanc.getLastRow() - 1, 1);
  const vals = rng.getValues();
  const porCategoria = Object.create(null);
  vals.forEach(function (l) {
    const atual = String(l[0] || '').trim();
    if (!atual || nomesConfig.indexOf(atual) >= 0) return;
    const chave = chaveCategoria(atual);
    for (let i = 0; i < nomesConfig.length; i++) {
      if (chaveCategoria(nomesConfig[i]) === chave) {
        const destino = nomesConfig[i];
        porCategoria[atual + '\u0000' + destino] = (porCategoria[atual + '\u0000' + destino] || 0) + 1;
        break;
      }
    }
  });
  const alteracoes = Object.keys(porCategoria).map(function (chave) {
    const partes = chave.split('\u0000');
    return { de: partes[0], para: partes[1], quantidade: porCategoria[chave] };
  });
  const resultado = {
    total: alteracoes.reduce(function (soma, item) { return soma + item.quantidade; }, 0),
    alteracoes: alteracoes
  };
  console.log(JSON.stringify(resultado));
  return resultado;
}

// Depois de conferir a prévia, rode esta função para gravar as unificações.
function unificarCategoriasNaPlanilhaInterno_() {
  const lock = obterLockGestor_();
  let lockObtido = false;
  try {
    lock.waitLock(10000);
    lockObtido = true;
    const ss = obterPlanilhaGestor_();
    const lanc = ss.getSheetByName('Lançamentos');
    const nomesConfig = listarNomesCategoriasConfig(ss.getSheetByName('Dashboard & Resumo'));
    if (!lanc || lanc.getLastRow() < 2 || nomesConfig.length === 0) return 0;
    const rng = lanc.getRange(2, 4, lanc.getLastRow() - 1, 1);
    const vals = rng.getValues();
    let qtd = 0;
    vals.forEach(function (l) {
      const atual = String(l[0] || '').trim();
      if (!atual || nomesConfig.indexOf(atual) >= 0) return;
      const chave = chaveCategoria(atual);
      for (let i = 0; i < nomesConfig.length; i++) {
        if (chaveCategoria(nomesConfig[i]) === chave) { l[0] = nomesConfig[i]; qtd++; break; }
      }
    });
    if (qtd > 0) rng.setValues(vals);
    console.log('Linhas unificadas: ' + qtd);
    return qtd;
  } finally {
    if (lockObtido) lock.releaseLock();
  }
}

// ============================================================================
// AUXILIARES DE RELATÓRIO
// ============================================================================

function lerLancamentosParaRelatorio(anosArquivo) {
  const ss = obterPlanilhaGestor_();
  const lido = lerRegistrosConsultaProtecaoGestor_('Lançamentos',anosArquivo);
  const nomesCfg = listarNomesCategoriasConfig(ss.getSheetByName('Dashboard & Resumo'));
  const linhas = [];
  lido.raw.forEach(function (r, i) {
    const d = lido.disp[i].slice();
    // Datas do Sheets podem estar com máscaras diferentes. O período e a
    // parcela do relatório seguem o valor da célula, sem regravar o original.
    [[0,'dd/MM/yyyy'],[6,'d/M'],[8,'MM/yyyy']].forEach(function (campo) {
      if (r[campo[0]] instanceof Date) d[campo[0]] = formatarCelulaRegistroGestor_(r[campo[0]],campo[1]);
    });
    const desc = String(d[1] || '').trim();
    if (!desc) return;
    const parc = limparApostrofo(d[6]);
    const infoParc = parseNumParcela(parc);
    linhas.push({
      idx: lido.refs[i].linha-2, arquivado:lido.refs[i].arquivado, d: d, r: r, desc: desc,
      forma: nomeFormaLeituraGestor_(d[2], ss), tipoForma: tipoFormaGestor_(d[2], ss),
      cat: String(d[3] || '').trim() || 'Sem Categoria',
      catRes: resolverCategoria(d[3], nomesCfg),
      parc: parc, infoParc: infoParc,
      valor: extractNum(r[7]),
      mes: limparApostrofo(d[8]),
      infoMes: parseMesFat(d[8]),
      status: String(d[9] || '').trim(),
      tags: String(d[10] || '').trim(),
      data: limparApostrofo(d[0]),
      chave: String(r[12] || r[11] || ('linha-' + i))
    });
  });
  return linhas.sort(function(a,b){return (parseDataBR(a.data)?.getTime()||0)-(parseDataBR(b.data)?.getTime()||0) || a.infoMes.time-b.infoMes.time || a.infoParc.atual-b.infoParc.atual;});
}

function calcularResumoParcelas(linhas) {
  const mapa = Object.create(null);
  linhas.forEach(function (l) {
    if (isStatusCancelado(l.status) || l.infoParc.total <= 1 || l.parc === '∞/∞') return;
    if (!mapa[l.chave]) mapa[l.chave] = { faltam: 0, maxTime: 0, fimMes: '' };
    if (!isStatusPago(l.status)) {
      const m = mapa[l.chave];
      m.faltam += 1;
      if (l.infoMes.time >= m.maxTime) {
        m.maxTime = l.infoMes.time;
        m.fimMes = l.mes.length === 7 ? l.mes.substring(0, 3) + l.mes.substring(5, 7) : l.mes;
      }
    }
  });
  return mapa;
}

// modo 'historico': [..., linha(10), tags(11), resParc(12)]  |  modo 'relatorio': [..., tags(10), linha(11), resParc(12)]
function itemLancamento(l, resumo, modo) {
  const base = [l.data, l.d[1], l.d[2], l.d[3], l.d[4], l.d[5], l.parc, formatBRL(l.valor), l.mes, l.d[9]];
  const res = resumo[l.chave] || null;
  const item=(modo === 'relatorio' ? base.concat([l.tags, l.idx + 2, res]) : base.concat([l.idx + 2, l.tags, res])).concat([l.r[11], l.r[12], Number(l.r[13] || 1), l.r[14]]);
  const resultado=modo==='relatorio'?item.concat([valorPagoBancoGestor_(l.r,false),arred2(l.valor-valorPagoBancoGestor_(l.r,false))]):item;
  return l.arquivado?resultado.concat([true]):resultado;
}

function lerMetasCategorias() {
  const ss = obterPlanilhaGestor_();
  const dash = ss.getSheetByName('Dashboard & Resumo');
  const mapa = Object.create(null);
  if (!dash) return mapa;
  const nomes = dash.getRange('B17:B41').getValues();
  const metas = dash.getRange('D17:D41').getValues();
  nomes.forEach(function (r, i) {
    const n = String(r[0] || '').trim();
    if (n) mapa[n] = extractNum(metas[i][0]);
  });
  return mapa;
}

function lerEmprestimosRelatorio_(periodo) {
  const ss = obterPlanilhaGestor_();
  const itens = [];
  const ano=String(periodo).includes('/')?Number(String(periodo).split('/')[1]):Number(periodo);
  const lido = lerRegistrosConsultaProtecaoGestor_('Empréstimos',[ano]);
  lido.raw.forEach(function (r, i) {
    const d = lido.disp[i].slice();
    [[0,'dd/MM/yyyy'],[6,'d/M'],[8,'MM/yyyy']].forEach(function (campo) {
      if (r[campo[0]] instanceof Date) d[campo[0]] = formatarCelulaRegistroGestor_(r[campo[0]],campo[1]);
    });
    const mes = limparApostrofo(d[8]);
    const status = String(d[9] || 'A Receber').trim();
    const corresponde = String(periodo).includes('/') ? mes === periodo : mes.slice(3) === String(periodo);
    const valor = extractNum(r[7]);
    if (!corresponde || isStatusCancelado(status) || valor <= 0) return;
    itens.push({ data: limparApostrofo(d[0]), pessoa: String(d[1] || ''), descricao: String(d[2] || ''),
      forma: nomeFormaLeituraGestor_(d[3], ss), tipoForma: tipoFormaGestor_(d[3], ss), parcela: limparApostrofo(d[6]), mes: mes,
      valorRaw: valor, valor: formatBRL(valor), status: status, observacoes: String(d[10] || ''), pagoBancoRaw: valorPagoBancoGestor_(r, true) });
  });
  return itens;
}

function resumirTerceirosRelatorio_(itens) {
  let total = 0, recebido = 0;
  itens.forEach(function (item) { total += item.valorRaw; if (item.status === 'Recebido') recebido += item.valorRaw; });
  return { totalRaw: arred2(total), recebidoRaw: arred2(recebido), aReceberRaw: arred2(total - recebido), itens: itens };
}

function lerTerceirosDoMes(mes) {
  const mapa = Object.create(null);
  lerEmprestimosRelatorio_(mes).forEach(function (item) {
    const k = chaveFormaGestor_(item.forma);
    if (!mapa[k]) mapa[k] = { nome: item.forma, total: 0, pagoBanco: 0, itens: [] };
    mapa[k].total += item.valorRaw;
    mapa[k].pagoBanco += item.pagoBancoRaw || 0;
    mapa[k].itens.push(item);
  });
  return mapa;
}

function somarTags(linhas) {
  const mapa = Object.create(null);
  linhas.forEach(function (l) {
    if (!l.tags) return;
    Array.from(new Set(l.tags.split(',').map(function(t) { return t.trim().toLowerCase().replace(/^#+/, ''); }))).forEach(function (tag) {
      if (!tag) return;
      if (!mapa[tag]) mapa[tag] = { nome: '#' + tag, total: 0, qtd: 0 };
      mapa[tag].total += l.valor;
      mapa[tag].qtd += 1;
    });
  });
  return Object.values(mapa).sort(function (a, b) { return b.total - a.total; });
}

function somarPor(linhas, campo) {
  const mapa = Object.create(null);
  linhas.forEach(function (l) { mapa[l[campo]] = (mapa[l[campo]] || 0) + l.valor; });
  return Object.keys(mapa).map(function (k) { return { nome: k, total: mapa[k] }; })
    .filter(function (x) { return x.total > 0; })
    .sort(function (a, b) { return b.total - a.total; });
}

function composicaoAVistaRigido(linhas) {
  let aVista = 0, rigido = 0;
  linhas.forEach(function (l) {
    if (l.infoParc.total > 1 || l.parc === '∞/∞') rigido += l.valor; else aVista += l.valor;
  });
  const total = aVista + rigido;
  const aVistaPct = total > 0 ? Math.round((aVista / total) * 100) : 0;
  const rigidoPct = total > 0 ? 100 - aVistaPct : 0;
  return { aVistaValor: formatBRL(aVista), aVistaPct: aVistaPct, rigidoValor: formatBRL(rigido), rigidoPct: rigidoPct };
}

// ============================================================================
// RELATÓRIO MENSAL
// ============================================================================

function obterRelatorioMes(mesFiltro) {
  const mes = limparApostrofo(mesFiltro);
  const info = parseMesFat(mes);
  if (!info.time) throw new Error('Mês inválido: ' + mes);

  const todas = lerLancamentosParaRelatorio([info.a,info.m===1?info.a-1:info.a]);
  const resumo = calcularResumoParcelas(todas);
  const doMes = todas.filter(function (l) { return l.mes === mes && !isStatusCancelado(l.status); });

  const dtAnt = new Date(info.a, info.m - 2, 1);
  const mesAnt = pad2(dtAnt.getMonth() + 1) + '/' + dtAnt.getFullYear();
  const totalAnt = todas
    .filter(function (l) { return l.mes === mesAnt && !isStatusCancelado(l.status); })
    .reduce(function (acc, l) { return acc + l.valor; }, 0);

  let total = 0, pago = 0, aberto = 0, maior = null;
  doMes.forEach(function (l) {
    total += l.valor;
    const valorPago = valorPagoBancoGestor_(l.r, false); pago += valorPago; aberto += arred2(l.valor - valorPago);
    if (!maior || l.valor > maior.valor) maior = l;
  });

  const qtd = doMes.length;
  const comp = composicaoAVistaRigido(doMes);

  let ritmoVariacao = null, ritmoTexto = 'Sem base ant.';
  if (totalAnt > 0) {
    ritmoVariacao = Math.round(((total - totalAnt) / totalAnt) * 1000) / 10;
    ritmoTexto = Math.abs(ritmoVariacao).toFixed(1).replace('.', ',') + '% ' + (ritmoVariacao <= 0 ? 'abaixo' : 'acima') + ' de ' + mesAnt;
  }

  const metas = lerMetasCategorias();
  const metasPorChave=new Map(Object.keys(metas).map(function(nome){return [chaveCategoria(nome),metas[nome]];}));
  const categorias = somarPor(doMes, 'catRes').map(function (c) {
    return { nome: c.nome, total: c.total, meta: metasPorChave.get(chaveCategoria(c.nome)) || 0 };
  });
  const metasCategorias=Object.keys(metas).filter(function(nome){return metas[nome]>0;}).map(function(nome){return {nome:nome,meta:metas[nome],total:arred2(categorias.filter(function(c){return chaveCategoria(c.nome)===chaveCategoria(nome);}).reduce(function(s,c){return s+c.total;},0))};}).sort(function(a,b){return Number(chaveCategoria(a.nome)==='outros')-Number(chaveCategoria(b.nome)==='outros') || a.nome.localeCompare(b.nome,'pt-BR');});

  const terceiros = lerTerceirosDoMes(mes);
  const mapaForma = Object.create(null);
  doMes.forEach(function (l) {
    const k = chaveFormaGestor_(l.forma);
    if (!mapaForma[k]) mapaForma[k] = { nome: l.forma, tipo: tipoFormaGestor_(l.forma), total: 0, aberto: 0, terceiros: 0, totalBanco: 0 };
    mapaForma[k].total += l.valor;
    mapaForma[k].aberto += arred2(l.valor - valorPagoBancoGestor_(l.r, false));
  });
  Object.keys(terceiros).forEach(function (k) {
    if (!mapaForma[k]) mapaForma[k] = { nome: terceiros[k].nome, tipo: tipoFormaGestor_(terceiros[k].nome), total: 0, aberto: 0, terceiros: 0, totalBanco: 0 };
    mapaForma[k].terceiros = terceiros[k].total;
  });
  const formas = Object.values(mapaForma).map(function (f) {
    f.totalBanco = f.total + f.terceiros;
    const grupo = terceiros[chaveFormaGestor_(f.nome)];
    f.pagoBanco = arred2(f.total - f.aberto + (grupo ? grupo.pagoBanco : 0));
    f.abertoBanco = arred2(f.totalBanco - f.pagoBanco);
    return f;
  }).sort(function (a, b) { return b.total - a.total; });

  return {
    kpis: { aberto: formatBRL(aberto), pago: formatBRL(pago), total: formatBRL(total) },
    totalRaw: total,
    estatisticas: {
      qtdLancamentos: qtd,
      ticketMedio: formatBRL(qtd > 0 ? total / qtd : 0),
      pctQuitado: (total > 0 ? Math.round((pago / total) * 100) : 0) + '%',
      maiorGasto: maior ? (maior.desc + ' (' + formatBRL(maior.valor) + ')') : '-',
      ritmoVariacao: ritmoVariacao,
      ritmoTexto: ritmoTexto,
      aVistaPct: comp.aVistaPct, rigidoPct: comp.rigidoPct,
      aVistaValor: comp.aVistaValor, rigidoValor: comp.rigidoValor
    },
    categorias: categorias,
    metasCategorias: metasCategorias,
    formas: formas,
    terceiros: resumirTerceirosRelatorio_(Object.values(terceiros).reduce(function (itens, grupo) { return itens.concat(grupo.itens); }, [])),
    tags: somarTags(doMes),
    lancamentos: doMes.map(function (l) { return itemLancamento(l, resumo, 'relatorio'); })
  };
}

// ============================================================================
// RELATÓRIO ANUAL
// ============================================================================

function obterRelatorioAnual(ano) {
  const anoNum = parseInt(ano, 10);
  const todas = lerLancamentosParaRelatorio([Number(ano)]);
  const doAno = todas.filter(function (l) {
    return l.infoMes.a === anoNum && !isStatusCancelado(l.status) && l.valor > 0;
  });

  const grafico = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  doAno.forEach(function (l) {
    total += l.valor;
    if (l.infoMes.m >= 1 && l.infoMes.m <= 12) grafico[l.infoMes.m - 1] += l.valor;
  });

  let idxMaior = -1, idxMenor = -1, mesesComGasto = 0;
  grafico.forEach(function (v, i) {
    if (v > 0) {
      mesesComGasto++;
      if (idxMaior < 0 || v > grafico[idxMaior]) idxMaior = i;
      if (idxMenor < 0 || v < grafico[idxMenor]) idxMenor = i;
    }
  });

  const comp = composicaoAVistaRigido(doAno);
  return {
    total: formatBRL(total),
    totalRaw: total,
    media: formatBRL(mesesComGasto > 0 ? total / mesesComGasto : 0),
    maiorMes: idxMaior >= 0 ? NOMES_MESES_PT[idxMaior] + ' • ' + formatBRL(grafico[idxMaior]) : '-',
    menorMes: idxMenor >= 0 ? NOMES_MESES_PT[idxMenor] + ' • ' + formatBRL(grafico[idxMenor]) : '-',
    qtdTransacoes: doAno.length,
    composicao: { aVistaValor: comp.aVistaValor, aVistaPct: comp.aVistaPct, rigidoValor: comp.rigidoValor, rigidoPct: comp.rigidoPct },
    graficoMeses: grafico.map(arred2),
    categorias: somarPor(doAno, 'catRes'),
    formas: somarPor(doAno, 'forma').map(function (forma) { return Object.assign({}, forma, { tipo: tipoFormaGestor_(forma.nome) }); }),
    terceiros: resumirTerceirosRelatorio_(lerEmprestimosRelatorio_(String(anoNum))),
    tags: somarTags(doAno)
  };
}

// ============================================================================
// HISTÓRICO: BUSCA + FILTROS + SOMA
// ============================================================================

function filtrarLancamentosWeb(filtros, offset, limite) {
  const f = filtros || {};
  const off = Math.max(0, parseInt(offset, 10) || 0);
  const lim = Math.min(500, Math.max(1, parseInt(limite, 10) || 50));

  const todas = lerLancamentosParaRelatorio(f.ano?[Number(f.ano)]:f.mes?[Number(String(f.mes).split('/')[1])]:undefined);
  const filtrosBase = Object.keys(f).filter(function(k) { return k !== 'versaoConsulta'; }).sort().map(function(k) { return [k,f[k]]; });
  const versaoConsulta = hashGestor_([filtrosBase, todas.map(function(l) { return l.r; })]);
  if (off > 0 && f.versaoConsulta !== versaoConsulta) {
    const conflito = new Error('O Histórico mudou durante a consulta. Atualize a lista antes de continuar ou copiar o resumo.');
    conflito.codigo = 'CONSULTA_ALTERADA'; throw conflito;
  }
  const resumo = calcularResumoParcelas(todas);
  const hoje = getHojeSeguro();
  const mesAtual = pad2(hoje.getMonth() + 1) + '/' + hoje.getFullYear();

  // vírgula = "OU" entre grupos; espaço = "E" entre palavras do grupo
  const grupos = normalizarTexto(f.termo).split(',')
    .map(function (g) { return g.split(/\s+/).filter(Boolean); })
    .filter(function (g) { return g.length > 0; });
  const tagsExigidas = String(f.tag || '').split(',')
    .map(function (t) { return normalizarTexto(t).replace(/^#/, ''); })
    .filter(Boolean);

  const filtrados = todas.filter(function (l) {
    if (f.mes && l.mes !== f.mes) return false;
    if (f.ano && String(l.infoMes.a) !== String(f.ano)) return false;
    if (f.forma && chaveFormaGestor_(l.forma) !== chaveFormaGestor_(f.forma)) return false;
    if (f.categoria && normalizarTexto(l.cat) !== normalizarTexto(f.categoria) && normalizarTexto(l.catRes) !== normalizarTexto(f.categoria)) return false;

    if (f.status) {
      if (f.status === 'Pago') { if (!isStatusPago(l.status)) return false; }
      else if (f.status === 'Em Aberto') {
        if (isStatusPago(l.status) || isStatusCancelado(l.status) || l.status === 'Agendado') return false;
      } else if (l.status !== f.status) return false;
    }

    switch (f.tipoRapido) {
      case 'mesatual': if (l.mes !== mesAtual) return false; break;
      case 'apagar': if (isStatusPago(l.status) || isStatusCancelado(l.status)) return false; break;
      case 'parcelados': if (!(l.infoParc.total > 1 && l.parc !== '∞/∞')) return false; break;
      case 'fixos': if (l.parc !== '∞/∞') return false; break;
      case 'pix': if (!ehPixGestor_(l.forma)) return false; break;
    }

    if (tagsExigidas.length > 0) {
      const set = l.tags.split(',').map(function (t) { return normalizarTexto(t).replace(/^#/, ''); });
      if (!tagsExigidas.every(function (t) { return set.indexOf(t) >= 0; })) return false;
    }

    if (grupos.length > 0) {
      const palheiro = normalizarTexto([l.desc, l.forma, l.cat, l.tags, l.status].join(' '));
      if (!grupos.some(function (g) { return g.every(function (p) { return palheiro.indexOf(p) >= 0; }); })) return false;
    }
    return true;
  });

  const maisRecentesPrimeiro = filtrados.slice().reverse();
  const soma = filtrados.reduce(function (acc, l) { return acc + (isStatusCancelado(l.status) ? 0 : l.valor); }, 0);
  const pagina = maisRecentesPrimeiro.slice(off, off + lim);

  return {
    versaoConsulta: versaoConsulta,
    itens: pagina.map(function (l) { return itemLancamento(l, resumo, 'historico'); }),
    temMais: (off + lim) < maisRecentesPrimeiro.length,
    qtdTotal: filtrados.length,
    somaTotal: formatBRL(soma),
    somaMetade: formatBRL(soma / 2)
  };
}

function executarAcaoApi_(action, param) {
  if(['ativarProtecaoAutomaticaWeb','obterStatusProtecaoWeb','executarBackupProtegidoWeb','previaManutencaoProtegidaWeb','executarManutencaoProtegidaWeb'].includes(action))return executarAcaoApiInterna_(action,param);
  if (['iniciarImportacaoBackupWeb','enviarPartesBackupWeb','concluirImportacaoBackupWeb','descartarImportacaoBackupWeb','prepararExportacaoBackupWeb','obterPartesImportacaoBackupWeb'].includes(action)) return executarAcaoApiInterna_(action,param);
  if (action === 'previaRachadinhaWeb') return executarOperacaoGestor_(action,param,function(){return previaRachadinhaWeb(param);},true);
  if (action === 'previaRecuperacaoOperacaoWeb') return previaRecuperacaoOperacaoWeb(param);
  if (action === 'concluirRecuperacaoOperacaoWeb') return concluirRecuperacaoOperacaoWeb(param);
  if (action === 'cancelarOperacaoWeb') return cancelarOperacaoWeb(param);
  if (action === 'consultarOperacaoWeb') return consultarOperacaoWeb(param);
  if (action === 'diagnosticarPendenciasWeb') return diagnosticarPendenciasWeb();
  const leituras = ['previaEdicaoEmprestimoWeb', 'previaDatasDevolucaoWeb','obterEmprestimosArquivadosWeb','getDadosCompletos','obterRelatorioMes','obterRelatorioAnual','filtrarLancamentosWeb','exportarBackupDadosWeb','previaRestauracaoBackupWeb','obterBackupAnteriorWeb','obterAtividadeWeb','obterFaturaPagamentoWeb','previaAntecipacaoWeb','previaPagamentoFaturaWeb'];
  if (leituras.indexOf(action) >= 0) return executarOperacaoGestor_(action, param, function () { return executarAcaoApiInterna_(action, param); }, true);
  return executarAcaoApiInterna_(action, param);
}

function editarLancamentoLinhaWeb(param) { return executarOperacaoGestor_('editarLancamentoLinhaWeb', param, function () { return editarLancamentoLinhaWebInterno_(param); }, false); }

function excluirLancamentoWeb(param) { return executarOperacaoGestor_('excluirLancamentoWeb', param, function () { return excluirLancamentoWebInterno_(param); }, false); }

function adiantarParcelasWeb(param) { return executarOperacaoGestor_('adiantarParcelasWeb', param, function () { return adiantarParcelasWebInterno_(param); }, false); }

function quitarFaturaWeb(param) { return executarOperacaoGestor_('quitarFaturaWeb', param, function () { return quitarFaturaWebInterno_(param); }, false); }

function salvarNotasWeb(param) { return executarOperacaoGestor_('salvarNotasWeb', param, function () { return salvarNotasWebInterno_(param); }, false); }

function salvarEmprestimoWeb(param) { return executarOperacaoGestor_('salvarEmprestimoWeb', param, function () { return salvarEmprestimoWebInterno_(param); }, false); }

function alternarStatusEmprestimoWeb(param) { return executarOperacaoGestor_('alternarStatusEmprestimoWeb', param, function () { return alternarStatusEmprestimoWebInterno_(param); }, false); }

function excluirEmprestimoWeb(param) { return executarOperacaoGestor_('excluirEmprestimoWeb', param, function () { return excluirEmprestimoWebInterno_(param); }, false); }

function editarEmprestimoLinhaWeb(param) { return executarOperacaoGestor_('editarEmprestimoLinhaWeb', param, function () { return editarEmprestimoLinhaWebInterno_(param); }, false); }

function dividirParcelaEmprestimoWeb(param) { return executarOperacaoGestor_('dividirParcelaEmprestimoWeb', param, function () { return dividirParcelaEmprestimoWebInterno_(param); }, false); }

function moverParaEmprestimosWeb(param) { return executarOperacaoGestor_('moverParaEmprestimosWeb', param, function () { return moverParaEmprestimosWebInterno_(param); }, false); }

function moverParaGastosPessoaisWeb(param) { return executarOperacaoGestor_('moverParaGastosPessoaisWeb', param, function () { return moverParaGastosPessoaisWebInterno_(param); }, false); }

function editarAssinaturaWeb(param) { return executarOperacaoGestor_('editarAssinaturaWeb', param, function () { return editarAssinaturaWebInterno_(param); }, false); }

function cancelarAssinaturaWeb(param) { return executarOperacaoGestor_('cancelarAssinaturaWeb', param, function () { return cancelarAssinaturaWebInterno_(param); }, false); }

function salvarFormaPagamentoWeb(param) { return executarOperacaoGestor_('salvarFormaPagamentoWeb', param, function () { return salvarFormaPagamentoWebInterno_(param); }, false); }

function reordenarFormasPagamentoWeb(param) { return executarOperacaoGestor_('reordenarFormasPagamentoWeb', param, function () { return reordenarFormasPagamentoWebInterno_(param); }, false); }

function excluirFormaPagamentoWeb(param) { return executarOperacaoGestor_('excluirFormaPagamentoWeb', param, function () { return excluirFormaPagamentoWebInterno_(param); }, false); }

function salvarCategoriasWeb(param) { return executarOperacaoGestor_('salvarCategoriasWeb', param, function () { return salvarCategoriasWebInterno_(param); }, false); }


// ============================================================================
// INTEGRIDADE: IDENTIDADES, VERSÕES E DIÁRIO RECUPERÁVEL DE OPERAÇÕES
// As colunas L:R pertencem ao app; as onze primeiras colunas continuam legíveis.
// As escritas são planejadas em memória. O diário é persistido e confirmado antes
// de aplicar os dados; um reenvio ou reinício reaplica o mesmo resultado.
// ============================================================================
const COLUNAS_GESTOR_ = 18;
const ABA_DIARIO_GESTOR_ = '_Gestor_Operacoes';
let CONTEXTO_GESTOR_ = null;
let HASHES_EXECUCAO_GESTOR_ = null;

function obterLockGestor_() {
  if (CONTEXTO_GESTOR_) return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} };
  return LockService.getScriptLock();
}

function gerarIdGestor_() { return Utilities.getUuid(); }
function serializarGestor_(valor) {
  if (valor instanceof Date) return { __gestorData: valor.toISOString() };
  if (Array.isArray(valor)) return valor.map(serializarGestor_);
  if (valor && typeof valor === 'object') {
    const saida = Object.create(null);
    Object.keys(valor).sort().forEach(function (k) { if (valor[k] !== undefined) saida[k] = serializarGestor_(valor[k]); });
    return saida;
  }
  return valor;
}
function desserializarGestor_(valor) {
  if (Array.isArray(valor)) return valor.map(desserializarGestor_);
  if (valor && typeof valor === 'object') {
    if (valor.__gestorData) return new Date(valor.__gestorData);
    const saida = Object.create(null); Object.keys(valor).forEach(function (k) { saida[k] = desserializarGestor_(valor[k]); }); return saida;
  }
  return valor;
}
function copiarGestor_(valor) {
  // O snapshot não precisa converter cada célula em JSON para copiá-la.
  // Datas e objetos continuam independentes do original.
  if (valor instanceof Date) return new Date(valor.getTime());
  if (Array.isArray(valor)) return Array.from(valor, function(v) { return v === undefined ? null : copiarGestor_(v); });
  if (valor && typeof valor === 'object') {
    const copia = Object.create(null);
    Object.keys(valor).forEach(function(k) { if (valor[k] !== undefined) copia[k] = copiarGestor_(valor[k]); });
    return copia;
  }
  return typeof valor === 'number' && !Number.isFinite(valor) ? null : valor;
}
function hashGestor_(valor) {
  const texto = JSON.stringify(serializarGestor_(valor));
  const memo = HASHES_EXECUCAO_GESTOR_;
  if (memo && memo.has(texto)) return memo.get(texto);
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  // Só durante esta operação: nenhuma gravação ou edição direta na planilha
  // pode reutilizar o hash de uma execução anterior.
  if (memo && texto.length <= 4096 && memo.size < 5000) memo.set(texto,hash);
  return hash;
}
function centavosGestor_(valor) {
  const n = extractNum(valor);
  if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER / 100) throw new Error('Valor monetário inválido.');
  return Math.round((n + Math.sign(n) * Number.EPSILON) * 100);
}
function parcelasCentavosGestor_(valor, quantidade) {
  const total = centavosGestor_(valor);
  const base = Math.floor(total / quantidade), sobra = total % quantidade;
  return Array.from({ length: quantidade }, function (_, i) { return (base + (i < sobra ? 1 : 0)) / 100; });
}
function validarEdicaoGestor_(dados, emprestimo) {
  validarDataCalendarioWeb_(dados.dataCompra, 'Data da compra');
  validarMesFaturaWeb_(dados.mesFatura);
  if (!String(dados.descricao || '').trim() || !String(dados.formaPagto || '').trim()) throw new Error('Informe a descrição e a forma de pagamento.');
  if (centavosGestor_(dados.valorParcela) <= 0) throw new Error('Informe um valor maior que zero.');
  const estados = emprestimo ? ['A Receber', 'Recebido'] : ['Pago', 'Em Aberto', 'Agendado', 'Assinatura Ativa', 'Assinatura Paga', 'Assinatura Cancelada', 'Pago (Cancelada)'];
  if (estados.indexOf(String(dados.status)) < 0) throw new Error('Situação inválida. Atualize o app.');
  if (emprestimo && !String(dados.pessoa || '').trim()) throw new Error('Informe a pessoa.');
  if (!emprestimo && !String(dados.categoria || '').trim()) throw new Error('Selecione uma categoria.');
}

function ehAbaRegistrosGestor_(nome) { return nome === 'Lançamentos' || nome === 'Empréstimos'; }
function chaveLegadoGestor_(r, emprestimo) {
  if (!emprestimo && limparApostrofo(r[6]) === '∞/∞') return ['assinatura', normalizarTexto(r[1]), normalizarTexto(r[2])].join('|');
  return [limparApostrofo(r[0]), normalizarTexto(r[emprestimo ? 1 : 1]), emprestimo ? normalizarTexto(r[2]) : '', normalizarTexto(r[emprestimo ? 3 : 2]), centavosGestor_(r[4]), parseNumParcela(r[6]).total].join('|');
}
function migrarIdentidadesGestor_(aba, contexto) {
  if (!ehAbaRegistrosGestor_(aba.nome)) return;
  const emp = aba.nome === 'Empréstimos';
  const titulos = ['Registro ID', 'Compra ID', 'Versão', 'Estado Banco', 'Migração', 'Conteúdo SHA256', 'Pago ao banco'];
  if (aba.antes.some(function (r) { return r[17] !== '' && r[17] != null; }) && String((aba.antes[0] || [])[17] || '') !== titulos[6]) throw new Error('A coluna R já possui dados particulares. Preserve-a antes de atualizar o app.');
  if (aba.antes && aba.antes.some(function (r) { return r.slice(11, 17).some(function (v) { return v !== '' && v !== null; }); })) {
    if (!titulos.every(function (v, i) { return String((aba.antes[0] || [])[11 + i] || '') === v || (i >= 5 && !aba.antes.some(function (r) { return r[11 + i] !== '' && r[11 + i] != null; })); })) throw new Error('As colunas L:Q de ' + aba.nome + ' já possuem dados. Preserve essas colunas em um backup e libere-as antes de migrar o app.');
  }
  const ids = new Set();
  aba.valores.slice(1).forEach(function (r) { if (!r[11]) return; if (ids.has(String(r[11]))) throw new Error('Há identificadores repetidos em ' + aba.nome + '. Revise linhas copiadas antes de continuar.'); ids.add(String(r[11])); });
  if (!aba.valores.length) aba.valores.push([]);
  titulos.forEach(function (v, i) { aba.valores[0][11 + i] = v; });
  const grupos = Object.create(null);
  aba.valores.slice(1).forEach(function (r) {
    if (!String(r[emp ? 2 : 1] || '').trim()) return;
    while (r.length < COLUNAS_GESTOR_) r.push('');
    if (r[17] === '' || r[17] == null) r[17] = valorPagoBancoGestor_(r, emp);
    if (r[11]) {
      if (!r[12] || !Number.isInteger(Number(r[13])) || Number(r[13]) < 1) throw new Error('Metadados inválidos em ' + aba.nome + '. Preserve a linha e confira as colunas de controle.');
      const fingerprint = hashRegistroGestor_(r);
      if (r[16] && r[16] !== fingerprint) r[13] = Number(r[13]) + 1;
      r[16] = fingerprint;
      return;
    }
    const chave = chaveLegadoGestor_(r, emp);
    (grupos[chave] || (grupos[chave] = [])).push(r);
  });
  Object.keys(grupos).forEach(function (chave) {
    const linhas = grupos[chave], info = parseNumParcela(linhas[0][6]);
    const novos = contexto && linhas.every(function (r) { return !contexto.idsIniciais.has(String(r[11])); });
    const parcelas = linhas.map(function (r) { return limparApostrofo(r[6]); });
    const meses = linhas.map(function (r) { return limparApostrofo(r[8]); });
    const recorrente = limparApostrofo(linhas[0][6]) === '∞/∞';
    const inequivoco = recorrente ? new Set(meses).size === linhas.length : info.total > 1 && linhas.length <= info.total && new Set(parcelas).size === linhas.length;
    const compra = gerarIdGestor_();
    linhas.forEach(function (r) {
      r[11] = gerarIdGestor_();
      // Compras à vista de mesmo nome nunca são fundidas; duplicidade antiga de
      // parcelas também não é resolvida por adivinhação.
      r[12] = inequivoco ? compra : gerarIdGestor_();
      r[13] = 1;
      r[14] = emp ? (formaEmprestimoConsomeLimite_(r[3]) ? 'Em Aberto' : 'Pago') : (isStatusPago(r[9]) ? 'Pago' : 'Em Aberto');
      r[16] = hashRegistroGestor_(r);
      r[15] = (!inequivoco && (info.total > 1 || recorrente)) ? 'Legado ambíguo: revisar compra' : (novos ? '' : 'Migrado');
    });
  });
  aba.colunas = Math.max(aba.colunas, COLUNAS_GESTOR_);
}

function lerEstadoAbaGestor_(sh) {
  if (!sh || sh.getLastRow() === 0) return [];
  const rng = sh.getDataRange(), valores = rng.getValues(), formulas = rng.getFormulas();
  return valores.map(function (r, i) { return r.map(function (v, j) { return formulas[i][j] || v; }); });
}
function criarPlanilhaVirtualGestor_(ss, contexto) {
  const abas = Object.create(null);
  function abrir(nome, criar) {
    if (abas[nome]) return abas[nome];
    const real = ss.getSheetByName(nome);
    if (!real && !criar) return null;
    const rangeReal = real && real.getLastRow() ? real.getDataRange() : null;
    const calculados = rangeReal ? rangeReal.getValues() : [], formulas = rangeReal ? rangeReal.getFormulas() : [];
    const antes = calculados.map(function(r,i){return r.map(function(v,j){return formulas[i][j] || v;});});
    // A maioria das abas técnicas não usa a apresentação das células.
    // Buscar a matriz exibida somente quando alguém pedir getDisplayValues.
    let exibidos = null;
    const aba = { nome: nome, antes: copiarGestor_(antes), valores: copiarGestor_(antes), exibidos: exibidos, alterados: Object.create(null), colunas: antes.reduce(function (n, r) { return Math.max(n, r.length); }, 1), existente: !!real, calculados: calculados };
    aba.getName = function () { return nome; };
    aba.getLastRow = function () { let i = aba.valores.length; while (i > 0 && !aba.valores[i - 1].some(function (v) { return v !== '' && v !== null; })) i--; return i; };
    aba.getDataRange = function () { return aba.getRange(1, 1, Math.max(1, aba.getLastRow()), Math.max(1, aba.colunas)); };
    aba.getRange = function (linha, coluna, qtdLinhas, qtdCols) {
      if (typeof linha === 'string') {
        const a = linha.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
        if (!a) throw new Error('Intervalo não suportado: ' + linha);
        const numero = function (letras) { return letras.toUpperCase().split('').reduce(function (n, l) { return n * 26 + l.charCodeAt(0) - 64; }, 0); };
        linha = Number(a[2]); coluna = numero(a[1]); qtdLinhas = a[4] ? Number(a[4]) - linha + 1 : 1; qtdCols = a[3] ? numero(a[3]) - coluna + 1 : 1;
      }
      qtdLinhas = qtdLinhas || 1; qtdCols = qtdCols || 1;
      if (linha < 1 || coluna < 1 || qtdLinhas < 1 || qtdCols < 1) throw new Error('Intervalo inválido.');
      const range = Object.create(null);
      range.getValues = function () { return Array.from({ length: qtdLinhas }, function (_, i) { return Array.from({ length: qtdCols }, function (_, j) { const rr = linha - 1 + i, cc = coluna - 1 + j; const original = !aba.alterados[rr + ':' + cc] && aba.calculados[rr] && aba.calculados[rr][cc] !== undefined; const valor = original ? aba.calculados[rr][cc] : ((aba.valores[rr] || [])[cc] === undefined ? '' : aba.valores[rr][cc]); if (!original && typeof valor === 'string' && valor.charAt(0) === '=') { const candidatos = []; aba.antes.forEach(function (l, i) { l.forEach(function (v, j) { if (v === valor && aba.calculados[i]) candidatos.push(aba.calculados[i][j]); }); }); if (!candidatos.length || candidatos.some(function (v) { return hashGestor_(v) !== hashGestor_(candidatos[0]); })) throw new Error('Uma fórmula exige recálculo da planilha. Reabra o app antes de continuar.'); return copiarGestor_(candidatos[0]); } return copiarGestor_(valor); }); }); };
      range.getDisplayValues = function () { if (aba.exibidos === null) aba.exibidos = rangeReal ? rangeReal.getDisplayValues() : []; return range.getValues().map(function (r, i) { return r.map(function (v, j) { const key = (linha - 1 + i) + ':' + (coluna - 1 + j); if (!aba.alterados[key] && aba.exibidos[linha - 1 + i] && aba.exibidos[linha - 1 + i][coluna - 1 + j] !== undefined) return aba.exibidos[linha - 1 + i][coluna - 1 + j]; if (v instanceof Date) return Utilities.formatDate(v, getTimezone(), 'dd/MM/yyyy'); return String(v === null ? '' : v).replace(/^'/, ''); }); }); };
      range.setValues = function (valores) { if (valores.some(function (r) { return r.some(function (v) { return typeof v === 'string' && v.length > 49000; }); })) throw new Error('Um campo está longo demais para a planilha. Reduza o texto para menos de 49 mil caracteres.'); if (valores.length !== qtdLinhas || valores.some(function (r) { return r.length !== qtdCols; })) throw new Error('Dimensões de gravação incompatíveis.'); valores.forEach(function (r, i) { aba.valores[linha - 1 + i] = aba.valores[linha - 1 + i] || []; r.forEach(function (v, j) { aba.valores[linha - 1 + i][coluna - 1 + j] = copiarGestor_(v); aba.alterados[(linha - 1 + i) + ':' + (coluna - 1 + j)] = true; }); }); aba.colunas = Math.max(aba.colunas, coluna + qtdCols - 1); if (ehAbaRegistrosGestor_(nome)) { migrarIdentidadesGestor_(aba, contexto); atualizarVersoesGestor_(aba, contexto); aba.valores.forEach(function (_, r) { for (let c = 11; c < COLUNAS_GESTOR_; c++) aba.alterados[r + ':' + c] = true; }); } return range; };
      range.setValue = function (v) { return range.setValues([[v]]); };
      range.clearContent = function () { return range.setValues(Array.from({ length: qtdLinhas }, function () { return Array(qtdCols).fill(''); })); };
      range.getFormulas = function () { return Array.from({ length: qtdLinhas }, function (_, i) { return Array.from({ length: qtdCols }, function (_, j) { const v = (aba.valores[linha - 1 + i] || [])[coluna - 1 + j]; return typeof v === 'string' && v.charAt(0) === '=' ? v : ''; }); }); };
      range.getNumberFormats = function () { return Array.from({ length: qtdLinhas }, function () { return Array(qtdCols).fill('General'); }); };
      ['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor'].forEach(function (m) { range[m] = function () { return range; }; });
      return range;
    };
    aba.deleteRow = function (linha) { if (aba.exibidos === null) aba.exibidos = rangeReal ? rangeReal.getDisplayValues() : []; aba.valores.splice(linha - 1, 1); aba.exibidos.splice(linha - 1, 1); aba.calculados.splice(linha - 1, 1); aba.alterados = Object.create(null); for (let r = linha - 1; r < aba.valores.length; r++) for (let c = 0; c < aba.colunas; c++) aba.alterados[r + ':' + c] = true; };
    aba.setFrozenRows = function () {};
    abas[nome] = aba;
    if (ehAbaRegistrosGestor_(nome)) {
      migrarIdentidadesGestor_(aba, contexto);
      aba.valores.slice(1).forEach(function (r) { if (r[11]) { contexto.idsIniciais.add(String(r[11])); contexto.registrosIniciais[String(r[11])] = copiarGestor_(r); } });
      aba.idsOriginaisAtividade = aba.valores.slice(1).filter(function (r) { return r[11]; }).map(function (r) { return String(r[11]); });
      // Metadados recém-criados devem ser exibidos como valores, não como células
      // vazias do snapshot anterior.
      aba.valores.forEach(function (_, r) { for (let c = 11; c < COLUNAS_GESTOR_; c++) aba.alterados[r + ':' + c] = true; });
    }
    return aba;
  }
  return { abas: abas, getSheetByName: function (n) { return abrir(n, false); }, insertSheet: function (n) { return abrir(n, true); }, getName: function () { return ss.getName(); }, getSpreadsheetTimeZone: function () { return ss.getSpreadsheetTimeZone(); }, toast: function () {} };
}

function preservarPagamentoNaEdicaoGestor_(r, anterior, emprestimo, acao) {
  if(!anterior || !['editarLancamentoLinhaWeb','editarEmprestimoLinhaWeb','editarAssinaturaWeb'].includes(acao)) return;
  const totalAnterior=centavosGestor_(anterior[7]),totalNovo=centavosGestor_(r[7]);
  const pago=centavosGestor_(valorPagoBancoGestor_(anterior,emprestimo));
  // O Sheets pode guardar MM/AAAA como Date. Comparar a competência, não o
  // tipo/formato da célula, para permitir editar dados sem mover o pagamento.
  if(pago>0 && formatarCelulaRegistroGestor_(anterior[8],'MM/yyyy')!==formatarCelulaRegistroGestor_(r[8],'MM/yyyy')) throw new Error('Esta parcela tem pagamento registrado na fatura original. Confira ou desfaça o pagamento antes de mudar o mês.');
  if(totalNovo===totalAnterior) return;
  if(emprestimo && anterior[9]==='Recebido') throw new Error('Este valor já foi recebido da pessoa. Desfaça o recebimento antes de corrigir o valor ou registre a diferença separadamente.');
  if(totalNovo<pago) throw new Error('O valor da parcela não pode ficar abaixo do pagamento já registrado ao banco. Confira ou desfaça o pagamento antes de reduzir o valor.');
  if(!pago) return;
  r[17]=pago/100;
  const quitado=totalNovo===pago;
  if(emprestimo) r[14]=quitado?'Pago':'Em Aberto';
  else if(!isStatusCancelado(r[9])) r[9]=limparApostrofo(r[6])==='∞/∞'?(quitado?'Assinatura Paga':'Assinatura Ativa'):(quitado?'Pago':'Em Aberto');
}

function atualizarVersoesGestor_(aba, ctx) {
  aba.valores.slice(1).forEach(function (r) {
    if (!r[11]) return;
    preservarPagamentoNaEdicaoGestor_(r,ctx.registrosIniciais[String(r[11])],aba.nome==='Empréstimos',ctx.action);
    const integral = aba.nome === 'Lançamentos' ? isStatusPago(r[9]) : r[14] === 'Pago';
    if (!integral && r[17] && (centavosGestor_(r[17]) < 0 || centavosGestor_(r[17]) > centavosGestor_(r[7]))) throw new Error('O valor da parcela não pode ficar abaixo do pagamento já registrado ao banco. Desfaça o pagamento antes de reduzir o valor.');
    if (aba.nome === 'Lançamentos') r[14] = isStatusPago(r[9]) ? 'Pago' : 'Em Aberto';
    r[17] = valorPagoBancoGestor_(r, aba.nome === 'Empréstimos');
    const anterior = ctx.registrosIniciais[String(r[11])];
    if (anterior && hashRegistroGestor_(r) !== hashRegistroGestor_(anterior)) r[13] = Number(anterior[13] || 1) + 1;
    r[16] = hashRegistroGestor_(r);
  });
}

function pendenciasSeriesGestor_(ctx) {
  const mapa = new Map();
  Object.keys(ctx.registrosIniciais).forEach(function (id) {
    const r=ctx.registrosIniciais[id];
    if (limparApostrofo(r[6]) === '∞/∞' && serieRecorrenteGestor_(r).invalida) {
      const chave=String(r[12] || id);
      if(!mapa.has(chave)) mapa.set(chave,{compraId:chave,registroId:id,descricao:String(r[1] || ''),codigo:'SERIE_FIXA_INVALIDA'});
    }
  });
  return Array.from(mapa.values());
}
function validarAlteracoesSeriesGestor_(aba,ctx) {
  const series=new Set(pendenciasSeriesGestor_(ctx).map(function(p){return p.compraId;}));
  if(!series.size) return;
  const atuais=new Map(aba.valores.slice(1).map(function(r){return [String(r[11]),r];}));
  Object.keys(ctx.registrosIniciais).forEach(function(id){
    const antes=ctx.registrosIniciais[id];
    if(series.has(String(antes[12] || id)) && (!atuais.has(id) || hashRegistroGestor_(antes)!==hashRegistroGestor_(atuais.get(id)))) throw new Error('Esta operação altera uma despesa fixa com controle inválido. Confira a série em Atividade; os demais lançamentos continuam disponíveis.');
  });
  aba.valores.slice(1).forEach(function(r){
    if(series.has(String(r[12] || r[11])) && !ctx.registrosIniciais[String(r[11])]) throw new Error('Não é possível gerar ocorrências desta despesa fixa até conferir seu controle.');
  });
}

function finalizarPlanoGestor_(ctx) {
  const mudancas = [];
  Object.keys(ctx.ss.abas).forEach(function (nome) {
    const aba = ctx.ss.abas[nome];
    if (ehAbaRegistrosGestor_(nome)) {
      migrarIdentidadesGestor_(aba, ctx);
      if (nome === 'Lançamentos' && ctx.action !== 'restaurarBackupDadosWeb') validarAlteracoesSeriesGestor_(aba,ctx);
      aba.valores.slice(1).forEach(function (r) {
        if (!r[11]) return;
        if (nome === 'Lançamentos') r[14] = isStatusPago(r[9]) ? 'Pago' : 'Em Aberto';
        const anterior = ctx.registrosIniciais[String(r[11])];
        if (anterior && hashRegistroGestor_(r) !== hashRegistroGestor_(anterior)) r[13] = Number(anterior[13] || 1) + 1;
    r[16] = hashRegistroGestor_(r);
      });
    }
    const linhas = aba.getLastRow(), colunas = Math.max(1, aba.colunas);
    const depois = Array.from({ length: linhas }, function (_, r) { return Array.from({ length: colunas }, function (_, c) { return (aba.valores[r] || [])[c] === undefined ? '' : aba.valores[r][c]; }); });
    if (hashEstadoGestor_(aba.antes) !== hashEstadoGestor_(depois) || aba.formatosRestauracao) {
      const alteracoes = [];
      for (let i = 0; i < Math.max(aba.antes.length, depois.length); i++) if (hashEstadoGestor_([aba.antes[i] || []]) !== hashEstadoGestor_([depois[i] || []])) alteracoes.push([i, depois[i] || []]);
      const mudanca = { formatosRestauracao: aba.formatosRestauracao || null, nome: nome, antes: hashEstadoGestor_(aba.antes), depois: hashEstadoGestor_(depois), linhas: depois.length, colunas: colunas, alteracoes: alteracoes };
      mudanca.recuperacaoBlocos = prepararRecuperacaoBlocosGestor_(aba.antes, depois, mudanca);
      mudancas.push(mudanca);
    }
  });
  return mudancas.concat(ctx.anexosTecnicos || []);
}
function abrirDiarioGestor_(ss) {
  let sh = ss.getSheetByName(ABA_DIARIO_GESTOR_);
  if (!sh) { sh = ss.insertSheet(ABA_DIARIO_GESTOR_); sh.getRange(1, 1, 1, 6).setValues([['Operação', 'Payload SHA256', 'Estado', 'Parte', 'Conteúdo', 'Data']]); sh.setFrozenRows(1); if (typeof sh.hideSheet === 'function') sh.hideSheet(); }
  else if (JSON.stringify(sh.getRange(1,1,1,6).getValues()[0]) !== JSON.stringify(['Operação','Payload SHA256','Estado','Parte','Conteúdo','Data'])) throw new Error('A aba _Gestor_Operacoes possui estrutura incompatível. Preserve os dados para conferência.');
  return sh;
}
function lerPlanoDiarioGestor_(linhas, cabecalho) {
  if (!Array.isArray(linhas) || !linhas[cabecalho]) throw erroDiarioGestor_('DIARIO_INCOMPLETO');
  const id = String(linhas[cabecalho][0]), qtd = Number(linhas[cabecalho][3]);
  const partes = linhas.slice(cabecalho + 1, cabecalho + 1 + qtd);
  if (!Number.isInteger(qtd) || qtd < 1 || partes.length !== qtd || partes.some(function (r, i) { return r[0] !== id || r[2] !== 'PARTE' || Number(r[3]) !== i + 1; })) throw erroDiarioGestor_('DIARIO_INCOMPLETO');
  let plano;
  try {
    const textos = partes.map(function (r) { const texto = JSON.parse(String(r[4])); if (typeof texto !== 'string') throw new Error('Parte inválida.'); return texto; });
    plano = desserializarGestor_(JSON.parse(textos.join('')));
  } catch (_) { throw erroDiarioGestor_('DIARIO_CONTEUDO_INVALIDO'); }
  if (!plano || typeof plano !== 'object' || Array.isArray(plano) || !Array.isArray(plano.mudancas)) throw erroDiarioGestor_('DIARIO_PLANO_INVALIDO');
  return plano;
}

function erroDiarioGestor_(codigo) {
  const erro = new Error('O diário desta operação está incompleto ou incompatível. Preserve os dados e confira o diagnóstico antes de gravar novamente.');
  erro.codigo = codigo;
  return erro;
}

function blocosContiguosPlanoGestor_(indices) {
  const unicos = Array.from(new Set(indices)).sort(function (a,b) { return a-b; }), blocos = [];
  for (let i=0; i<unicos.length;) {
    const inicio=unicos[i]; let fim=inicio; i++;
    while (i<unicos.length && unicos[i]===fim+1) { fim=unicos[i]; i++; }
    blocos.push({inicio:inicio,fim:fim});
  }
  return blocos;
}

function hashLinhasIntactasPlanoGestor_(linhas, indices) {
  const ignoradas = new Set(indices);
  return hashEstadoGestor_(linhas.map(function (r,i) { return ignoradas.has(i) ? [] : r; }));
}

function prepararRecuperacaoBlocosGestor_(antes, depois, mudanca) {
  const indices = mudanca.alteracoes.map(function (a) { return a[0]; });
  const intactos = hashLinhasIntactasPlanoGestor_(antes, indices);
  if (intactos !== hashLinhasIntactasPlanoGestor_(depois, indices)) throw erroDiarioGestor_('PLANO_PRECONDICAO_INVALIDA');
  return {versao:1,linhasAntes:antes.length,linhasDepois:depois.length,colunas:mudanca.colunas,hashIntactos:intactos,
    blocos:blocosContiguosPlanoGestor_(indices).map(function (b) { return {inicio:b.inicio,fim:b.fim,
      antes:hashEstadoGestor_(antes.slice(b.inicio,b.fim+1)),depois:hashEstadoGestor_(depois.slice(b.inicio,b.fim+1))}; })};
}

function estadoRecuperacaoBlocosGestor_(atual, mudanca) {
  // Compatibilidade: planos antigos não ganham permissão para misturas de
  // linhas. Só planos novos com pré-condições persistidas podem retomá-las.
  const r=mudanca.recuperacaoBlocos;
  if (!r || r.versao!==1 || !Array.isArray(mudanca.alteracoes) || !Array.isArray(r.blocos) ||
      !Number.isInteger(r.linhasAntes) || r.linhasAntes<0 || r.linhasDepois!==mudanca.linhas ||
      !Number.isInteger(r.linhasDepois) || r.linhasDepois<0 || r.colunas!==mudanca.colunas ||
      !Number.isInteger(r.colunas) || r.colunas<1 || !/^[a-f0-9]{64}$/.test(String(r.hashIntactos || ''))) return null;
  const limite=Math.max(r.linhasAntes,r.linhasDepois), indices=[], destinos=new Map();
  for (const a of mudanca.alteracoes) {
    if (!Array.isArray(a) || a.length!==2 || !Number.isInteger(a[0]) || a[0]<0 || a[0]>=limite || !Array.isArray(a[1]) || destinos.has(a[0]) || a[1].length>r.colunas) return null;
    indices.push(a[0]); destinos.set(a[0],a[1]);
  }
  const blocos=blocosContiguosPlanoGestor_(indices);
  if (!blocos.length || blocos.length!==r.blocos.length || atual.length>limite || atual.some(function (linha) { return linha.length>r.colunas && linha.slice(r.colunas).some(function (v) { return v!=='' && v!=null; }); })) return null;
  if (hashLinhasIntactasPlanoGestor_(atual,indices)!==r.hashIntactos) return null;
  let anteriores=0, aplicados=0;
  for (let i=0;i<blocos.length;i++) {
    const b=blocos[i], guardado=r.blocos[i];
    if (!guardado || b.inicio!==guardado.inicio || b.fim!==guardado.fim || !/^[a-f0-9]{64}$/.test(String(guardado.antes || '')) || !/^[a-f0-9]{64}$/.test(String(guardado.depois || ''))) return null;
    const alvo=Array.from({length:b.fim-b.inicio+1},function (_,j) { return destinos.get(b.inicio+j) || []; });
    if (hashEstadoGestor_(alvo)!==guardado.depois) return null;
    const hash=hashEstadoGestor_(atual.slice(b.inicio,b.fim+1));
    if (hash===guardado.depois) aplicados++;
    else if (hash===guardado.antes) anteriores++;
    else return null; // Nem uma edição externa nem metade de um bloco é aceita.
  }
  const completo=copiarGestor_(atual);
  mudanca.alteracoes.forEach(function (a) { completo[a[0]]=a[1]; }); completo.length=mudanca.linhas;
  if (hashEstadoGestor_(completo)!==mudanca.depois) return null;
  return {total:blocos.length,antes:anteriores,aplicados:aplicados};
}
function inclusaoIncompletaRecuperavelGestor_(atual, m) {
  // Só completa UMA inclusão ao final. Edições, restaurações, reordenações e
  // divergências em campos preenchidos continuam bloqueadas.
  if (!ehAbaRegistrosGestor_(m.nome) || m.formatosRestauracao || !Array.isArray(m.alteracoes) || m.alteracoes.length !== 1 || atual.length !== m.linhas) return false;
  const alteracao = m.alteracoes[0], indice = alteracao[0], esperado = alteracao[1];
  if (indice < 1 || indice !== m.linhas - 1 || !esperado[11] || !esperado[12] || esperado[13] !== 1 || !esperado[16]) return false;
  if (hashEstadoGestor_(atual.slice(0, indice)) !== m.antes) return false;
  const real = atual[indice] || [];
  let faltamCampos = false;
  for (let c = 0; c < Math.max(real.length, esperado.length); c++) {
    const r = real[c] == null ? '' : real[c], e = esperado[c] == null ? '' : esperado[c];
    if (hashEstadoGestor_([[r]]) === hashEstadoGestor_([[e]])) continue;
    if (r !== '' || (c !== 9 && (c < 11 || c > 17))) return false;
    faltamCampos = true;
  }
  const completo = copiarGestor_(atual); completo[indice] = esperado;
  return faltamCampos && hashEstadoGestor_(completo) === m.depois;
}

function atualizarValidacaoStatusLancamentosGestor_(sh, linhas) {
  if (!sh || sh.getName() !== 'Lançamentos' || linhas < 2) return;
  const regra = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pago', 'Em Aberto', 'Agendado', 'Assinatura Ativa', 'Assinatura Paga', 'Assinatura Cancelada', 'Pago (Cancelada)', 'Ocorrência Pulada'], true)
    .setAllowInvalid(false).build();
  sh.getRange(2, 10, linhas - 1, 1).setDataValidation(regra);
}

function aplicarPlanoGestor_(ss, plano) {
  (plano.mudancas || []).forEach(function (m) {
    if (m.modo === 'anexar') { aplicarAnexoTecnicoGestor_(ss, m); return; }
    let sh = ss.getSheetByName(m.nome);
    const atual = lerEstadoAbaGestor_(sh), hash = hashEstadoGestor_(atual);
    // Aprovação explícita só reconhece linhas já aplicadas. Nunca reescreve
    // outras linhas para fazê-las coincidir com uma fotografia antiga.
    const aprovado=plano.conferenciaAprovada;
    if(aprovado && aprovado.versao===1 && aprovado.hashPlano===hashPlanoConferenciaGestor_(plano) &&
       aprovado.abas && aprovado.abas[m.nome]===hash && linhasPrevistasJaAplicadasGestor_(atual,m)) return;
    if (hash === m.depois) { atualizarValidacaoStatusLancamentosGestor_(sh, m.linhas); aplicarFormatosRestauracaoGestor_(sh, m); return; }
    if (hash !== m.antes && !estadoRecuperacaoBlocosGestor_(atual, m) && !inclusaoIncompletaRecuperavelGestor_(atual, m) && !controlesIncompletosRecuperaveisGestor_(atual, m)) {
      const erro = new Error('A aba ' + m.nome + ' não corresponde à gravação interrompida. A operação foi preservada para conferência, sem sobrescrever dados.');
      erro.codigo = 'RECUPERACAO_DIVERGENTE'; throw erro;
    }
    if (!sh) sh = ss.insertSheet(m.nome);
    const cols = Math.max(1, m.colunas), rows = Math.max(1, m.linhas, atual.length);
    const alvo = copiarGestor_(atual); (m.alteracoes || []).forEach(function (a) { alvo[a[0]] = a[1]; }); alvo.length = m.linhas;
    const valores = Array.from({ length: rows }, function (_, i) { return Array.from({ length: cols }, function (_, j) { let v = (alvo[i] || [])[j]; if (v === undefined) v = ''; if (ehAbaRegistrosGestor_(m.nome) && i > 0 && [0,1,2,3,6,8,9,10,11,12,14,15].indexOf(j) >= 0 && typeof v === 'string') v = textoLiteralGestor_(v); return v; }); });
    if (typeof sh.getMaxRows === 'function' && rows > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
    if (typeof sh.getMaxColumns === 'function' && cols > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
    atualizarValidacaoStatusLancamentosGestor_(sh, Math.max(m.linhas, atual.length));
    // Mantém a conferência integral, mas escreve somente os blocos alterados.
    // Planos antigos continuam compatíveis; a recuperação reenvia os mesmos blocos.
    const indices = Array.from(new Set((m.alteracoes || []).map(function(a) { return a[0]; }).concat(
      Array.from({length:Math.max(0,atual.length-m.linhas)},function(_,i) { return m.linhas+i; })
    ))).filter(function(i) { return i >= 0 && i < rows; }).sort(function(a,b) { return a-b; });
    for (let k=0; k<indices.length;) {
      const inicio=indices[k]; let fim=inicio; k++;
      while (k<indices.length && indices[k]===fim+1) { fim=indices[k]; k++; }
      sh.getRange(inicio+1,1,fim-inicio+1,cols).setValues(valores.slice(inicio,fim+1));
    }
    if (ehAbaRegistrosGestor_(m.nome) && m.linhas > 1) { sh.getRange(2, 5, m.linhas - 1, 1).setNumberFormat(FORMATO_MOEDA_PLANILHA); sh.getRange(2, 8, m.linhas - 1, 1).setNumberFormat(FORMATO_MOEDA_PLANILHA); sh.getRange(2, 18, m.linhas - 1, 1).setNumberFormat(FORMATO_MOEDA_PLANILHA); }
    aplicarFormatosRestauracaoGestor_(sh, m);
    if (m.nome === ABA_RESTAURACOES_GESTOR_ && typeof sh.hideSheet === 'function') sh.hideSheet();
    if (m.nome === ABA_ATIVIDADE_GESTOR_ && typeof sh.hideSheet === 'function') sh.hideSheet();
    SpreadsheetApp.flush();
    if (hashEstadoGestor_(lerEstadoAbaGestor_(sh)) !== m.depois) throw new Error('A gravação na aba ' + m.nome + ' ainda não corresponde à operação preparada. Ela permanece pendente para conferência.');
  });
}
function controlesIncompletosRecuperaveisGestor_(atual, mudanca) {
  // Completar apenas controles vazios de linhas cujo conteúdo financeiro já
  // coincide. O hash final confirma o plano inteiro, inclusive linhas intactas.
  if (!ehAbaRegistrosGestor_(mudanca.nome) || mudanca.formatosRestauracao || atual.length !== mudanca.linhas) return false;
  const alvo=copiarGestor_(atual); let completou=false;
  for (const a of mudanca.alteracoes || []) {
    const indice=a[0], esperado=a[1], real=alvo[indice] || [];
    if (indice<1 || !esperado[11] || !esperado[12] || !esperado[16]) return false;
    for (let c=0;c<Math.max(real.length,esperado.length);c++) {
      const r=real[c]==null?'':real[c], e=esperado[c]==null?'':esperado[c];
      if (hashEstadoGestor_([[r]])===hashEstadoGestor_([[e]])) continue;
      if (r!=='' || (c!==9 && (c<11 || c>17))) return false;
      completou=true;
    }
    alvo[indice]=esperado;
  }
  return completou && hashEstadoGestor_(alvo)===mudanca.depois;
}
function recuperarDiarioGestor_(ss, diario, linhas) {
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i][2] !== 'PRONTO') continue;
    const plano = lerPlanoDiarioGestor_(linhas, i);
    aplicarPlanoGestor_(ss, plano);
    diario.getRange(i + 2, 3).setValue('CONFIRMADO'); SpreadsheetApp.flush(); linhas[i][2] = 'CONFIRMADO';
  }
}
function diagnosticoPlanoGestor_(ss, plano) {
  return (plano.mudancas || []).map(function(m) {
    const sh=ss.getSheetByName(m.nome);
    if (m.modo==='anexar') return {aba:m.nome,modo:'anexar',linhasAtuais:sh?sh.getLastRow():0,linhaInicial:m.inicio};
    const atual=lerEstadoAbaGestor_(sh), hash=hashEstadoGestor_(atual), divergencias=[];
    (m.alteracoes || []).forEach(function(a) {
      const real=atual[a[0]] || [], esperado=a[1] || [];
      for(let c=0;c<Math.max(real.length,esperado.length) && divergencias.length<20;c++) {
        if(hashEstadoGestor_([[real[c]==null?'':real[c]]])!==hashEstadoGestor_([[esperado[c]==null?'':esperado[c]]])) divergencias.push({linha:a[0]+1,coluna:c+1});
      }
    });
    const blocos=estadoRecuperacaoBlocosGestor_(atual,m);
    return {aba:m.nome,estado:hash===m.depois?'aplicado':hash===m.antes?'antes':blocos?'blocos_parciais':
      (inclusaoIncompletaRecuperavelGestor_(atual,m)||controlesIncompletosRecuperaveisGestor_(atual,m))?'controles_incompletos':'divergente',
      linhasAtuais:atual.length,linhasEsperadas:m.linhas,blocos:blocos || undefined,divergencias:divergencias,
      escopoDivergencia:divergencias.length?'linhas_da_operacao':hash!==m.depois&&hash!==m.antes?'fora_das_linhas_da_operacao':'nenhum',
      linhasDaOperacaoConferem:linhasPrevistasJaAplicadasGestor_(atual,m)};
  });
}
function resumirPendenciaDiarioGestor_(ss, entrada) {
  const operacaoId=String(entrada.cabecalho[0]), identificacao=identificacaoOperacaoDiarioGestor_(operacaoId);
  try{return Object.assign({operacaoId:operacaoId,codigo:'RECUPERACAO_PENDENTE',abas:diagnosticoPlanoGestor_(ss,entrada.plano)},identificacao || {});}
  catch(e){return Object.assign({operacaoId:operacaoId,codigo:e.codigo || 'DIARIO_PLANO_INCOMPATIVEL',abas:[]},identificacao || {});}
}
function identificacaoOperacaoDiarioGestor_(operacaoId) {
  const corte=String(operacaoId).indexOf(':'), action=String(operacaoId).slice(0,corte), requestId=String(operacaoId).slice(corte+1);
  if (corte<1 || !/^[A-Za-z][A-Za-z0-9_]{2,80}$/.test(action) || !/^[A-Za-z0-9_.:-]{8,160}$/.test(requestId)) return null;
  return {action:action,requestId:requestId};
}
function diagnosticarPendenciasWeb() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss=obterPlanilhaGestor_(), diario=ss.getSheetByName(ABA_DIARIO_GESTOR_);
    if(!diario) return {pendencias:[]};
    return {pendencias:localizarLinhasTecnicasGestor_(diario,3,'PRONTO').map(function(linha) {
      try { return resumirPendenciaDiarioGestor_(ss,lerOperacaoTecnicaGestor_(diario,linha)); }
      catch(e) { return pendenciaDiarioInvalidoGestor_(diario,linha,e); }
    })};
  } finally {lock.releaseLock();}
}
function cancelarOperacaoWeb(param) {
  const p = param || {}, acao = String(p.action || ''), pedido = String(p.requestId || '');
  if (!Object.prototype.hasOwnProperty.call(ROTULOS_ATIVIDADE_GESTOR_, acao) || ['salvarNotasWeb','restaurarBackupDadosWeb'].includes(acao) || !/^[A-Za-z0-9_.:-]{8,160}$/.test(pedido)) throw new Error('Este envio não pode ser cancelado por esta opção.');
  const id = acao + ':' + pedido, lock = LockService.getScriptLock(); lock.waitLock(30000);
  let gravando = false;
  try {
    const ss=obterPlanilhaGestor_();retomarManutencaoProtecaoGestor_(ss);
    const diario = abrirDiarioGestor_(ss);
    const entradas = localizarCabecalhosOperacaoGestor_(diario,id).map(function (linha) { return {linha:linha,cabecalho:diario.getRange(linha,1,1,6).getValues()[0]}; });
    const confirmada = entradas.find(function (e) { return ['CONFIRMADO','ARQUIVADO'].includes(e.cabecalho[2]); });
    if (confirmada) return {estado:'confirmado',operacaoId:id};
    // PRONTO pode ter sido parcialmente aplicado. Nem mesmo um erro de rede
    // autoriza apagar o plano ou tratar essa gravação como inexistente.
    if (entradas.some(function (e) { return e.cabecalho[2] === 'PRONTO'; })) return {estado:'conferencia',operacaoId:id};
    if (entradas.some(function (e) { return e.cabecalho[2] === 'CANCELADO'; })) return {estado:'cancelado',operacaoId:id};
    // PREPARANDO ainda não escreveu nas abas financeiras. Preservamos suas
    // partes e acrescentamos uma proibição durável, sob a mesma trava do envio.
    gravando = true;
    diario.getRange(diario.getLastRow()+1,1,1,6).setValues([[id,hashGestor_({cancelado:id}),'CANCELADO',0,'',new Date()]]);
    SpreadsheetApp.flush();
    return {estado:'cancelado',operacaoId:id};
  } catch (e) { if (gravando) e.resultadoIncerto = true; throw e; }
  finally { lock.releaseLock(); }
}

function pendenciaDiarioInvalidoGestor_(diario,linha,erro) {
  const id=String(diario.getRange(linha,1).getValue() || '');
  return Object.assign({operacaoId:id,codigo:erro.codigo || 'DIARIO_INCOMPATIVEL',abas:[],orientacao:'O diário não pôde ser lido. Preserve as abas técnicas e copie o diagnóstico para revisão.'},identificacaoOperacaoDiarioGestor_(id) || {});
}
function hashPlanoConferenciaGestor_(plano) {
  const base=Object.assign({},plano);delete base.conferenciaAprovada;return hashGestor_(base);
}
function linhasPrevistasJaAplicadasGestor_(atual,m) {
  const ids=atual.slice(1).map(r=>r[11]).filter(Boolean);
  return ehAbaRegistrosGestor_(m.nome) && !m.formatosRestauracao && atual.length===m.linhas &&
    new Set(ids).size===ids.length &&
    Array.isArray(m.alteracoes) && m.alteracoes.length>0 && m.alteracoes.every(function(a){
      return Number.isInteger(a[0]) && a[0]>0 && a[1] && a[1][11] && hashEstadoGestor_([atual[a[0]] || []])===hashEstadoGestor_([a[1] || []]);
    });
}
function prepararConferenciaRecuperacaoGestor_(ss,diario,p) {
  const id=String(p.action || '')+':'+String(p.requestId || '');
  if(!identificacaoOperacaoDiarioGestor_(id)) throw new Error('Identificação da operação inválida.');
  const pendentes=localizarLinhasTecnicasGestor_(diario,3,'PRONTO');
  if(!pendentes.length) return {estado:'sem_pendencia',operacaoId:id};
  const linha=pendentes[0],entrada=lerOperacaoTecnicaGestor_(diario,linha);
  if(entrada.cabecalho[0]!==id) throw new Error('Confira primeiro a operação anterior exibida em Atividade.');
  if(!['salvarLancamentoWeb','salvarEmprestimoWeb','registrarRachadinhaWeb'].includes(String(p.action))) throw new Error('Esta operação precisa de revisão técnica. A confirmação simplificada atende apenas inclusões já gravadas.');
  const abas=Object.create(null),resumo=[];
  entrada.plano.mudancas.forEach(function(m){
    const sh=ss.getSheetByName(m.nome);
    if(m.modo==='anexar') {
      const fim=m.inicio+m.valores.length-1,aplicado=sh&&sh.getLastRow()>=fim&&hashEstadoGestor_(sh.getRange(m.inicio,1,m.valores.length,6).getValues())===hashEstadoGestor_(m.valores);
      if(!aplicado && (sh?sh.getLastRow():0)!==m.inicio-1) throw new Error('O histórico também apresenta uma diferença. Preserve o diário e copie o diagnóstico para revisão.');
      resumo.push({aba:m.nome,estado:aplicado?'já registrado':'registro técnico será concluído'});return;
    }
    const atual=lerEstadoAbaGestor_(sh);
    if(!linhasPrevistasJaAplicadasGestor_(atual,m)) throw new Error('As linhas desta operação ainda não conferem integralmente. A confirmação permanece bloqueada; copie o diagnóstico para revisão.');
    abas[m.nome]=hashEstadoGestor_(atual);resumo.push({aba:m.nome,linhasConferidas:m.alteracoes.length,estado:'linhas da operação já gravadas; demais linhas preservadas'});
  });
  if(!Object.keys(abas).length) throw new Error('Esta operação precisa de revisão técnica.');
  const hashPlano=hashPlanoConferenciaGestor_(entrada.plano),assinatura=hashGestor_({operacaoId:id,hashPlano:hashPlano,abas:abas});
  return {estado:'conferir',operacaoId:id,assinatura:assinatura,hashPlano:hashPlano,abas:abas,resumo:resumo,linha:linha};
}
function previaRecuperacaoOperacaoWeb(param) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const ss=obterPlanilhaGestor_(),diario=abrirDiarioGestor_(ss);const p=prepararConferenciaRecuperacaoGestor_(ss,diario,param || {});delete p.linha;return p;}
  finally{lock.releaseLock();}
}
function concluirRecuperacaoOperacaoWeb(param) {
  const lock=LockService.getScriptLock();lock.waitLock(30000);let gravando=false;
  try{
    const ss=obterPlanilhaGestor_(),diario=abrirDiarioGestor_(ss),id=String(param.action)+':'+String(param.requestId);
    const existentes=localizarCabecalhosOperacaoGestor_(diario,id);
    if(existentes.some(l=>diario.getRange(l,3).getValue()==='CONFIRMADO'||diario.getRange(l,3).getValue()==='ARQUIVADO')) return {estado:'confirmado',operacaoId:id};
    const previa=prepararConferenciaRecuperacaoGestor_(ss,diario,param || {});
    if(previa.estado!=='conferir'||!param.assinatura||param.assinatura!==previa.assinatura) throw new Error('Os dados mudaram desde a prévia. Confira a recuperação novamente.');
    const aprovacao={versao:1,hashPlano:previa.hashPlano,abas:previa.abas,assinatura:previa.assinatura,aprovadaEm:new Date().toISOString()};
    // Aprovação durável no cabeçalho. As partes originais permanecem intactas;
    // uma queda após esta escrita pode retomar a mesma conferência.
    gravando=true;diario.getRange(previa.linha,5).setValue(JSON.stringify(aprovacao));SpreadsheetApp.flush();
    const entrada=lerOperacaoTecnicaGestor_(diario,previa.linha);aplicarPlanoGestor_(ss,entrada.plano);
    diario.getRange(previa.linha,3).setValue('CONFIRMADO');SpreadsheetApp.flush();
    return {estado:'confirmado',operacaoId:id};
  }catch(e){if(gravando)e.resultadoIncerto=true;throw e;}finally{lock.releaseLock();}
}

function consultarOperacaoWeb(param) {
  const p=param || {}, acao=String(p.action || ''), pedido=String(p.requestId || '');
  if(!/^[A-Za-z][A-Za-z0-9_]{2,80}$/.test(acao)||!/^[A-Za-z0-9_.:-]{8,160}$/.test(pedido)) throw new Error('Identificação da operação inválida.');
  const operacaoId=acao+':'+pedido, lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss=obterPlanilhaGestor_();retomarManutencaoProtecaoGestor_(ss);
    const diario=ss.getSheetByName(ABA_DIARIO_GESTOR_);
    if(!diario) return {estado:'nao_localizado',operacaoId:operacaoId};
    const entradas=localizarCabecalhosOperacaoGestor_(diario,operacaoId);
    if(!entradas.length) return {estado:'nao_localizado',operacaoId:operacaoId};
    const linha=entradas[entradas.length-1], cabecalho=diario.getRange(linha,1,1,6).getValues()[0];
    if(cabecalho[2]==='CANCELADO') return {estado:'cancelado',operacaoId:operacaoId};
    if(['CONFIRMADO','ARQUIVADO'].includes(cabecalho[2])) return {estado:'confirmado',operacaoId:operacaoId,resultado:lerOperacaoTecnicaGestor_(diario,linha).plano.resultado};
    if(cabecalho[2]!=='PRONTO') return {estado:'preparando',operacaoId:operacaoId};
    // Recuperar na ordem do diário. Nunca contornar uma operação anterior ou
    // conferir por descrição/valor, que podem coincidir em compras distintas.
    for(const l of localizarLinhasTecnicasGestor_(diario,3,'PRONTO')) {
      let entrada;
      try {
        entrada=lerOperacaoTecnicaGestor_(diario,l);
        aplicarPlanoGestor_(ss,entrada.plano);
        diario.getRange(l,3).setValue('CONFIRMADO'); SpreadsheetApp.flush();
      } catch(e) {
        // Um diário malformado também bloqueia a recuperação. O diagnóstico
        // transporta códigos/coordenadas, nunca conteúdo financeiro ou tokens.
        const diagnostico=entrada ? resumirPendenciaDiarioGestor_(ss,entrada) : Object.assign({operacaoId:String(diario.getRange(l,1,1,1).getValues()[0][0]),codigo:e.codigo || 'DIARIO_INCOMPATIVEL',abas:[]},identificacaoOperacaoDiarioGestor_(String(diario.getRange(l,1,1,1).getValues()[0][0])) || {});
        return {estado:'conferencia',operacaoId:operacaoId,diagnostico:diagnostico};
      }
      if(l===linha) break;
    }
    // Confirmação é um estado durável do cabeçalho, não a ausência de erro no
    // laço acima. Mantém também o resultado original de operações de leitura.
    const final=lerOperacaoTecnicaGestor_(diario,linha);
    if(String(final.cabecalho[0])!==operacaoId) throw erroDiarioGestor_('DIARIO_IDENTIFICACAO_DIVERGENTE');
    if(!['CONFIRMADO','ARQUIVADO'].includes(final.cabecalho[2])) return {estado:final.cabecalho[2]==='PRONTO'?'conferencia':'preparando',operacaoId:operacaoId};
    return {estado:'confirmado',operacaoId:operacaoId,resultado:final.plano.resultado};
  } finally {lock.releaseLock();}
}
function estatisticasHistoricoTecnicoGestor_() {
  const ss = CONTEXTO_GESTOR_ ? CONTEXTO_GESTOR_.ssReal : obterPlanilhaGestor_();
  const contar = function (nome) { const sh = ss.getSheetByName(nome); return sh ? Math.max(0,sh.getLastRow()-1) : 0; };
  const diario = contar(ABA_DIARIO_GESTOR_), atividade = contar(ABA_ATIVIDADE_GESTOR_), restauracoes = contar(ABA_RESTAURACOES_GESTOR_);
  return {linhasDiario:diario, linhasAtividade:atividade, linhasRestauracoes:restauracoes, revisarCrescimento:diario>50000 || atividade>20000 || restauracoes>10000};
}

function localizarLinhasTecnicasGestor_(sh, coluna, texto) {
  const ultimo = sh.getLastRow();
  if (ultimo < 2) return [];
  const range = sh.getRange(2,coluna,ultimo-1,1);
  if (typeof range.createTextFinder === 'function') return range.createTextFinder(texto).matchEntireCell(true).matchCase(true).findAll().map(function (r) { return r.getRow(); }).sort(function(a,b) { return a-b; });
  // Compatibilidade com ambientes de teste; nunca transfere o conteúdo das partes.
  const linhas = [];
  for (let inicio=2; inicio<=ultimo; inicio+=250) sh.getRange(inicio,coluna,Math.min(250,ultimo-inicio+1),1).getValues().forEach(function(r,i) { if (String(r[0]) === texto) linhas.push(inicio+i); });
  return linhas;
}

function lerOperacaoTecnicaGestor_(sh, linha) {
  const cabecalho = sh.getRange(linha,1,1,6).getValues()[0], qtd = Number(cabecalho[3]);
  validarCabecalhoOperacaoGestor_(cabecalho);
  if(cabecalho[2]==='ARQUIVADO'){
    const entrada=lerReferenciaTecnicaProtecaoGestor_(cabecalho[4],'operacoes',cabecalho[0]);
    if(entrada.cabecalho[0]!==cabecalho[0]||entrada.cabecalho[1]!==cabecalho[1]||entrada.cabecalho[2]!=='CONFIRMADO')throw Error('O comprovante da operação arquivada não confere.');return {cabecalho:cabecalho,plano:entrada.plano};
  }
  if (cabecalho[2] === 'CANCELADO') return {cabecalho:cabecalho,plano:{mudancas:[],resultado:{estado:'cancelado',operacaoId:cabecalho[0]}}};
  if (linha+qtd>sh.getLastRow()) throw erroDiarioGestor_('DIARIO_INCOMPLETO');
  const plano=lerPlanoDiarioGestor_(sh.getRange(linha,1,qtd+1,6).getValues(),0);
  if(cabecalho[4]) {
    let conferencia;try{conferencia=JSON.parse(String(cabecalho[4]));}catch(_){throw erroDiarioGestor_('CONFERENCIA_INVALIDA');}
    if(conferencia.versao!==1 || conferencia.hashPlano!==hashPlanoConferenciaGestor_(plano)) throw erroDiarioGestor_('CONFERENCIA_INVALIDA');
    plano.conferenciaAprovada=conferencia;
  }
  return {cabecalho:cabecalho, plano:plano};
}

function validarCabecalhoOperacaoGestor_(cabecalho) {
  // A API aceita somente action:requestId reconhecido. Já o diário também
  // pode guardar identificações técnicas antigas; elas não viram parâmetros
  // de reenvio e não devem impedir a retomada de um plano estruturalmente válido.
  if (!cabecalho || typeof cabecalho[0]!=='string' || !cabecalho[0].trim() || cabecalho[0].length>500 || /[\u0000-\u001f\u007f]/.test(cabecalho[0]) ||
      !['PREPARANDO','PRONTO','CONFIRMADO','CANCELADO','ARQUIVADO'].includes(cabecalho[2]) ||
      !/^[a-f0-9]{64}$/.test(String(cabecalho[1] || '')) ||
      !Number.isInteger(Number(cabecalho[3])) || (['CANCELADO','ARQUIVADO'].includes(cabecalho[2]) ? Number(cabecalho[3])!==0 : Number(cabecalho[3])<1)) throw erroDiarioGestor_('DIARIO_CABECALHO_INVALIDO');
}

function localizarCabecalhosOperacaoGestor_(sh, operacaoId) {
  const correspondentes=localizarLinhasTecnicasGestor_(sh,1,operacaoId), cabecalhos=[];
  correspondentes.forEach(function (linha) {
    const r=sh.getRange(linha,1,1,6).getValues()[0];
    if (r[2]==='PARTE') return;
    validarCabecalhoOperacaoGestor_(r);
    cabecalhos.push(linha);
  });
  // Partes sem nenhum cabeçalho não equivalem a uma operação inexistente.
  if (correspondentes.length && !cabecalhos.length) throw erroDiarioGestor_('DIARIO_CABECALHO_AUSENTE');
  return cabecalhos;
}

function aplicarAnexoTecnicoGestor_(ss, m) {
  let sh = ss.getSheetByName(m.nome);
  const fim = m.inicio + m.valores.length - 1;
  if (sh && sh.getLastRow() >= fim && hashEstadoGestor_(sh.getRange(m.inicio,1,m.valores.length,6).getValues()) === hashEstadoGestor_(m.valores)) return;
  if ((sh ? sh.getLastRow() : 0) !== m.inicio-1) throw new Error('O histórico mudou durante uma gravação interrompida. Preserve os dados para conferência.');
  if (!sh) sh = ss.insertSheet(m.nome);
  if (typeof sh.getMaxRows === 'function' && fim > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(),fim-sh.getMaxRows());
  if (typeof sh.getMaxColumns === 'function' && sh.getMaxColumns()<6) sh.insertColumnsAfter(sh.getMaxColumns(),6-sh.getMaxColumns());
  sh.getRange(m.inicio,1,m.valores.length,6).setValues(m.valores);
  if (typeof sh.hideSheet === 'function') sh.hideSheet();
  SpreadsheetApp.flush();
}

function executarOperacaoGestor_(acao, param, executar, leitura) {
  if (CONTEXTO_GESTOR_) return executar();
  const inicioTempoGestor = Date.now();
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  const esperaLockMsGestor = Date.now()-inicioTempoGestor;
  HASHES_EXECUCAO_GESTOR_ = new Map();
  let resultadoIncerto = false;
  try {
    const real = obterPlanilhaGestor_();retomarManutencaoProtecaoGestor_(real);
    const diario = abrirDiarioGestor_(real);
    if (!leitura && param && param.requestId) {
      const cancelada = localizarCabecalhosOperacaoGestor_(diario,acao+':'+param.requestId).some(function (linha) { return diario.getRange(linha,3).getValue()==='CANCELADO'; });
      if (cancelada) { const erro=new Error('Este envio foi cancelado com segurança. Confira os campos antes de criar um novo lançamento.'); erro.codigo='OPERACAO_CANCELADA'; throw erro; }
    }
    const pendentes = localizarLinhasTecnicasGestor_(diario, 3, 'PRONTO');
    resultadoIncerto = pendentes.length > 0;
    const pendenciasIntegridade=[];
    for(const linha of pendentes) {
      let entrada;
      try {
        entrada=lerOperacaoTecnicaGestor_(diario,linha);
        aplicarPlanoGestor_(real,entrada.plano);
        diario.getRange(linha,3).setValue('CONFIRMADO'); SpreadsheetApp.flush();
      } catch(e) {
        const permitidas=['getDadosCompletos','obterRelatorioMes','obterRelatorioAnual','filtrarLancamentosWeb','exportarBackupDadosWeb','obterAtividadeWeb','obterFaturaPagamentoWeb'];
        if(!leitura || !permitidas.includes(acao)) throw e;
        pendenciasIntegridade.push(entrada?resumirPendenciaDiarioGestor_(real,entrada):pendenciaDiarioInvalidoGestor_(diario,linha,e)); break;
      }
    }
    resultadoIncerto = false;
    const requestId = !leitura && param && !Array.isArray(param) ? String(param.requestId || '') : '';
    if (!leitura && (!/^[A-Za-z0-9_.:-]{8,160}$/.test(requestId))) throw new Error('Atualize o app antes de gravar: falta o identificador seguro da operação.');
    const id = acao + ':' + (requestId || gerarIdGestor_()), fingerprint = hashGestor_(param || null);
    if (!leitura && acao !== 'restaurarBackupDadosWeb') {
      const epoca = epocaRestauracaoGestor_();
      if (epoca && (!param || param.baseRestauracao !== epoca)) throw new Error('A planilha foi restaurada desde a preparação deste envio. Atualize o app e confira esta pendência antes de tentar novamente.');
    }
    const anteriores = leitura ? [] : localizarCabecalhosOperacaoGestor_(diario, id);
    for (const linha of anteriores) {
      const cabecalho = diario.getRange(linha, 1, 1, 6).getValues()[0];
      if (!['CONFIRMADO','ARQUIVADO'].includes(cabecalho[2])) continue;
      if (cabecalho[1] !== fingerprint) throw new Error('Esta operação já foi usada com outros dados. Atualize a tela antes de tentar novamente.');
      return lerOperacaoTecnicaGestor_(diario, linha).plano.resultado;
    }
    const ctx = { action: acao, param: param || {}, idsIniciais: new Set(), registrosIniciais: Object.create(null), ss: null, ssReal: real, somenteLeitura:pendenciasIntegridade.length>0 };
    ctx.ss = criarPlanilhaVirtualGestor_(real, ctx); CONTEXTO_GESTOR_ = ctx;
    let resultado;
    try {
      resultado = executar();
      if (!leitura) registrarAtividadeGestor_(ctx);
    } finally { CONTEXTO_GESTOR_ = null; }
    if(resultado && typeof resultado==='object' && !Array.isArray(resultado)) {
      resultado.integridade={bloqueada:ctx.somenteLeitura,pendencias:pendenciasIntegridade};
      if(ctx.ss.abas['Lançamentos']) resultado.integridade.series=pendenciasSeriesGestor_(ctx);
    }
    if(ctx.somenteLeitura) return resultado;
    const mudancas = finalizarPlanoGestor_(ctx);
    if (acao === 'restaurarBackupDadosWeb') mudancas.sort(function (a,b) { return (a.nome === ABA_RESTAURACOES_GESTOR_ ? -1 : 0) - (b.nome === ABA_RESTAURACOES_GESTOR_ ? -1 : 0); });
    if (leitura && mudancas.length === 0) { confirmarManutencaoLeituraGestor_(ctx); return resultado; }
    const plano = { mudancas: mudancas, resultado: resultado }, texto = JSON.stringify(serializarGestor_(plano));
    // Cada parte é uma string JSON, com aspas no começo: mesmo se um corte cair
    // em '=...', o conteúdo do diário nunca é interpretado como fórmula.
    const partes = texto.match(/[\s\S]{1,12000}/g) || [''];
    const inicio = diario.getLastRow() + 1;
    diario.getRange(inicio, 1, 1, 6).setValues([[id, fingerprint, 'PREPARANDO', partes.length, '', new Date()]]);
    diario.getRange(inicio + 1, 1, partes.length, 6).setValues(partes.map(function (p, i) { return [id, '', 'PARTE', i + 1, JSON.stringify(p), '']; })); SpreadsheetApp.flush();
    resultadoIncerto = true;
    diario.getRange(inicio, 3).setValue('PRONTO'); SpreadsheetApp.flush();
    aplicarPlanoGestor_(real, plano);
    diario.getRange(inicio, 3).setValue('CONFIRMADO'); SpreadsheetApp.flush();
    confirmarManutencaoLeituraGestor_(ctx);
    return resultado;
  } catch (e) {
    if (resultadoIncerto) e.resultadoIncerto = true;
    throw e;
  } finally { CONTEXTO_GESTOR_ = null; HASHES_EXECUCAO_GESTOR_ = null; lock.releaseLock(); console.log(JSON.stringify({tipo:'gestor_tempo',acao:acao,totalMs:Date.now()-inicioTempoGestor,esperaLockMs:esperaLockMsGestor})); }
}

function assinaturaManutencaoLeituraGestor_(ss) {
  return hashGestor_([Utilities.formatDate(getHojeSeguro(),getTimezone(),'yyyy-MM-dd'),
    ['Dashboard & Resumo','Formas de Pagamento','Lançamentos','Empréstimos'].map(function(nome) {
      const sh=ss.getSheetByName(nome), matriz=sh ? (sh.valores || lerEstadoAbaGestor_(sh)) : null;
      return [nome,matriz ? hashEstadoGestor_(matriz.map(function(r){return Array.from(r,function(v){return v==null?'':v;});})) : null];
    })]);
}

// Transporte de backups grandes: área temporária, separada dos dados e do
// diário financeiro. Cada parte pode ser reenviada sem duplicar a importação.
const ABA_IMPORTACOES_BACKUP_GESTOR_='_Gestor_Importacoes';
function comImportacaoBackupGestor_(param,executar) {
  const id=String(param && param.importacaoId || '');
  if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(id)) throw new Error('Identificação de importação inválida.');
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss=obterPlanilhaGestor_(); let sh=ss.getSheetByName(ABA_IMPORTACOES_BACKUP_GESTOR_);
    const cab=['Importação','Tipo','Parte','Total','Conteúdo','Data'];
    if(!sh) { sh=ss.insertSheet(ABA_IMPORTACOES_BACKUP_GESTOR_); sh.getRange(1,1,1,6).setValues([cab]); if(sh.hideSheet)sh.hideSheet(); }
    else if(JSON.stringify(sh.getRange(1,1,1,6).getValues()[0])!==JSON.stringify(cab)) throw new Error('A área temporária contém dados incompatíveis. Preserve a planilha para conferência.');
    return executar(sh,id);
  } finally { lock.releaseLock(); }
}
function lerImportacaoBackupGestor_(sh,id,permitirExpirada,apenasManifesto) {
  const linhas=localizarLinhasTecnicasGestor_(sh,1,id).sort(function(a,b){return a-b;}), dados=[];
  const escolhidas=apenasManifesto ? localizarLinhasTecnicasGestor_(sh,2,'MANIFESTO').filter(function(l){return linhas.includes(l);}) : linhas;
  // Uma chamada por bloco contíguo, em vez de uma chamada por parte.
  for(let i=0;i<escolhidas.length;){let fim=i+1;while(fim<escolhidas.length&&escolhidas[fim]===escolhidas[fim-1]+1)fim++;
    const valores=sh.getRange(escolhidas[i],1,fim-i,6).getValues();valores.forEach(function(r,n){dados.push({linha:escolhidas[i]+n,r:r});});i=fim;}
  const cabecalhos=dados.filter(function(d){return d.r[1]==='MANIFESTO';});
  if(!linhas.length) return null;
  if(cabecalhos.length!==1) throw new Error('Importação incompleta. Selecione novamente o arquivo.');
  const linha=cabecalhos[0].linha,r=cabecalhos[0].r; let meta;
  try {meta=JSON.parse(r[4]);}catch(_){throw new Error('Controle de importação inválido.');}
  if(meta.versao!==1 || !/^[a-f0-9]{64}$/.test(meta.hash) || !Number.isInteger(meta.partes) || meta.partes<1 || meta.partes>750 || !Number.isInteger(meta.bytes) || meta.bytes<1 || meta.bytes>LIMITE_BACKUP_RESTAURACAO_GESTOR_ || !Number.isFinite(meta.expiraEm)) throw new Error('Controle de importação inválido.');
  if(!permitirExpirada && meta.expiraEm<Date.now()) throw new Error('A preparação deste arquivo expirou. Selecione o arquivo novamente para uma nova prévia.');
  return {linha:linha,meta:meta,linhas:linhas,dados:dados};
}
function anexarPartesImportacaoGestor_(sh,linhas) {
  const inicio=sh.getLastRow()+1,fim=inicio+linhas.length-1;
  if(sh.getMaxRows&&fim>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),fim-sh.getMaxRows());
  sh.getRange(inicio,1,linhas.length,6).setValues(linhas);
}
function limparImportacoesExpiradasGestor_(sh) {
  const expiradas=[];
  localizarLinhasTecnicasGestor_(sh,2,'MANIFESTO').forEach(function(l){
    const r=sh.getRange(l,1,1,6).getValues()[0];let meta;try{meta=JSON.parse(r[4]);}catch(_){return;}
    if(meta.versao===1 && Number.isFinite(meta.expiraEm) && meta.expiraEm<Date.now())Array.prototype.push.apply(expiradas,localizarLinhasTecnicasGestor_(sh,1,String(r[0])));
  });
  // Somente transporte temporário vencido. Um plano financeiro PRONTO já tem
  // seu conteúdo completo no diário e não depende dessas partes.
  blocosContiguosPlanoGestor_(Array.from(new Set(expiradas))).reverse().forEach(function(b){if(sh.deleteRows)sh.deleteRows(b.inicio,b.fim-b.inicio+1);else for(let l=b.fim;l>=b.inicio;l--)sh.deleteRow(l);});
}
function iniciarImportacaoBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    const hash=String(param.hashImportacao || ''),partes=Number(param.totalPartes),bytes=Number(param.bytes);
    if(!/^[a-f0-9]{64}$/.test(hash)||!Number.isInteger(partes)||partes<1||partes>750||!Number.isInteger(bytes)||bytes<1||bytes>LIMITE_BACKUP_RESTAURACAO_GESTOR_) throw new Error('Arquivo acima do limite ou preparação inválida.');
    let estado=lerImportacaoBackupGestor_(sh,id,false);
    if(estado) {if(estado.meta.hash!==hash||estado.meta.partes!==partes||estado.meta.bytes!==bytes)throw new Error('Esta importação já foi usada com outro arquivo.');}
    else {
      limparImportacoesExpiradasGestor_(sh);
      if(localizarLinhasTecnicasGestor_(sh,2,'MANIFESTO').length>=20) throw new Error('Há muitas preparações de backup guardadas. Descarte as preparações antigas antes de continuar.');
      const meta={versao:1,hash:hash,partes:partes,bytes:bytes,pronta:false,expiraEm:Date.now()+86400000};
      anexarPartesImportacaoGestor_(sh,[[id,'MANIFESTO',0,partes,JSON.stringify(meta),new Date()]]); SpreadsheetApp.flush();
      estado=lerImportacaoBackupGestor_(sh,id,false);
    }
    const recebidas=estado.dados.filter(function(d){return d.r[1]==='PARTE';}).map(function(d){return Number(d.r[2]);});
    return {importacaoId:id,hashImportacao:hash,recebidas:recebidas,pronta:estado.meta.pronta,expiraEm:estado.meta.expiraEm};
  });
}
function enviarPartesBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    const estado=lerImportacaoBackupGestor_(sh,id,false);
    if(!estado||param.hashImportacao!==estado.meta.hash) throw new Error('Selecione novamente o arquivo de backup.');
    if(!Array.isArray(param.partes)||!param.partes.length||param.partes.length>24) throw new Error('Lote de importação inválido.');
    const existentes=new Map(); estado.dados.forEach(function(d){const r=d.r;if(r[1]==='PARTE'){if(existentes.has(Number(r[2])))throw new Error('Parte de importação repetida.');existentes.set(Number(r[2]),r[4]);}});
    const novas=[],vistos=new Set();
    param.partes.forEach(function(p){
      if(!p||!Number.isInteger(p.parte)||p.parte<1||p.parte>estado.meta.partes||typeof p.chunk!=='string'||!p.chunk.length||p.chunk.length>12000||vistos.has(p.parte))throw new Error('Parte de importação inválida.');
      vistos.add(p.parte);const conteudo=JSON.stringify(p.chunk);
      if(existentes.has(p.parte)){if(existentes.get(p.parte)!==conteudo)throw new Error('Esta parte já foi enviada com outro conteúdo.');}
      else {if(estado.meta.pronta)throw new Error('Importação já concluída.');novas.push([id,'PARTE',p.parte,estado.meta.partes,conteudo,new Date()]);}
    });
    if(novas.length){anexarPartesImportacaoGestor_(sh,novas);SpreadsheetApp.flush();}
    return {importacaoId:id,recebidas:Array.from(vistos),totalRecebidas:existentes.size+novas.length};
  });
}
function montarImportacaoBackupGestor_(sh,id,estado) {
  const partes=new Map();estado.dados.forEach(function(d){const r=d.r;if(r[1]!=='PARTE')return;const n=Number(r[2]);if(!Number.isInteger(n)||n<1||n>estado.meta.partes||Number(r[3])!==estado.meta.partes||partes.has(n))throw new Error('Importação com partes incompatíveis.');let texto;try{texto=JSON.parse(r[4]);}catch(_){throw new Error('Parte de importação inválida.');}if(typeof texto!=='string'||texto.length>12000)throw new Error('Parte de importação inválida.');partes.set(n,texto);});
  if(partes.size!==estado.meta.partes)throw new Error('O arquivo ainda não foi enviado por completo. Retome a preparação.');
  const texto=Array.from({length:estado.meta.partes},function(_,i){return partes.get(i+1);}).join('');
  if(Utilities.newBlob(texto).getBytes().length!==estado.meta.bytes||hashTextoBackupGestor_(texto)!==estado.meta.hash)throw new Error('A integridade do arquivo não confere. Selecione novamente a cópia original.');
  try{return JSON.parse(texto);}catch(_){throw new Error('Arquivo JSON inválido.');}
}
function concluirImportacaoBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    const estado=lerImportacaoBackupGestor_(sh,id,false);if(!estado||estado.meta.hash!==param.hashImportacao)throw new Error('Importação não localizada.');
    const backup=montarImportacaoBackupGestor_(sh,id,estado);validarBackupRestauracaoGestor_(backup);
    estado.meta.pronta=true;sh.getRange(estado.linha,5).setValue(JSON.stringify(estado.meta));SpreadsheetApp.flush();
    return {importacaoId:id,hashImportacao:estado.meta.hash,pronta:true};
  });
}
function resolverBackupRestauracaoGestor_(param) {
  if(param && param.backup) return param.backup;
  const id=String(param && param.importacaoId || '');
  if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(id))throw new Error('Selecione uma cópia de segurança.');
  const ss=CONTEXTO_GESTOR_ ? CONTEXTO_GESTOR_.ssReal : obterPlanilhaGestor_(),sh=ss.getSheetByName(ABA_IMPORTACOES_BACKUP_GESTOR_);
  const estado=sh&&lerImportacaoBackupGestor_(sh,id,false);
  if(!estado||!estado.meta.pronta||param.hashImportacao!==estado.meta.hash)throw new Error('O arquivo ainda não foi preparado ou expirou. Selecione novamente o backup.');
  return montarImportacaoBackupGestor_(sh,id,estado);
}
function descartarImportacaoBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    const estado=lerImportacaoBackupGestor_(sh,id,true);if(!estado)return {descartada:true};
    if(estado.meta.hash!==param.hashImportacao)throw new Error('Identificação do arquivo não confere.');
    // Só o transporte temporário. Planos financeiros já preparados continuam no diário.
    estado.linhas.sort(function(a,b){return b-a;}).forEach(function(l){sh.deleteRow(l);});
    return {descartada:true};
  });
}
function prepararExportacaoBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    let estado=lerImportacaoBackupGestor_(sh,id,false,true);
    if(estado){if(estado.meta.origem!=='exportacao')throw new Error('Identificação já usada por outra preparação.');}
    else {
      limparImportacoesExpiradasGestor_(sh);
      if(localizarLinhasTecnicasGestor_(sh,2,'MANIFESTO').length>=20)throw new Error('Há muitas preparações guardadas. Descarte as preparações antigas antes de exportar.');
      const texto=JSON.stringify(montarBackupDadosGestor_(obterPlanilhaGestor_(),{restauravel:true})),bytes=Utilities.newBlob(texto).getBytes().length;
      if(bytes>LIMITE_BACKUP_RESTAURACAO_GESTOR_)throw new Error('Os dados ultrapassam 8 MB. Preserve uma cópia da planilha para recuperação assistida.');
      const partes=texto.match(/[\s\S]{1,12000}/g) || [''],meta={versao:1,origem:'exportacao',hash:hashTextoBackupGestor_(texto),bytes:bytes,partes:partes.length,pronta:true,expiraEm:Date.now()+86400000};
      anexarPartesImportacaoGestor_(sh,[[id,'MANIFESTO',0,partes.length,JSON.stringify(meta),new Date()]].concat(partes.map(function(chunk,i){return [id,'PARTE',i+1,partes.length,JSON.stringify(chunk),new Date()];})));SpreadsheetApp.flush();
      estado=lerImportacaoBackupGestor_(sh,id,false,true);
    }
    return {importacaoId:id,hashImportacao:estado.meta.hash,bytes:estado.meta.bytes,totalPartes:estado.meta.partes,expiraEm:estado.meta.expiraEm};
  });
}
function obterPartesImportacaoBackupWeb(param) {
  return comImportacaoBackupGestor_(param,function(sh,id){
    const estado=lerImportacaoBackupGestor_(sh,id,false,true),parte=Number(param.parte),quantidade=Math.min(20,Math.max(1,parseInt(param.quantidade,10)||20));
    if(!estado||estado.meta.origem!=='exportacao'||!estado.meta.pronta||estado.meta.hash!==param.hashImportacao||!Number.isInteger(parte)||parte<1||parte>estado.meta.partes)throw new Error('Preparação de exportação inválida ou expirada.');
    const linhas=sh.getRange(estado.linha+parte,1,Math.min(quantidade,estado.meta.partes-parte+1),6).getValues();
    const chunks=linhas.map(function(r,i){if(r[0]!==id||r[1]!=='PARTE'||Number(r[2])!==parte+i||Number(r[3])!==estado.meta.partes)throw new Error('A cópia preparada está incompleta.');const chunk=JSON.parse(r[4]);if(typeof chunk!=='string'||chunk.length>12000)throw new Error('Parte de exportação inválida.');return {parte:parte+i,chunk:chunk};});
    return {importacaoId:id,hashImportacao:estado.meta.hash,totalPartes:estado.meta.partes,chunks:chunks,proximaParte:parte+chunks.length};
  });
}
function precisaManutencaoLeituraGestor_() {
  if (!CONTEXTO_GESTOR_) return true;
  const ctx=CONTEXTO_GESTOR_;
  if(ctx.somenteLeitura) return false;
  const assinatura=assinaturaManutencaoLeituraGestor_(ctx.ss);
  let anterior=''; try { anterior=PropertiesService.getScriptProperties().getProperty('GESTOR_MANUTENCAO_V1') || ''; } catch (_) {}
  ctx.conferirManutencao=true;
  return anterior!==assinatura;
}
function confirmarManutencaoLeituraGestor_(ctx) {
  if(!ctx || !ctx.conferirManutencao || ctx.somenteLeitura) return;
  // É apenas uma otimização descartável. Falhar ao guardar esta marca não
  // invalida uma gravação financeira já confirmada no diário.
  try { PropertiesService.getScriptProperties().setProperty('GESTOR_MANUTENCAO_V1',assinaturaManutencaoLeituraGestor_(ctx.ss)); } catch (_) {}
}

function limparTextoLiteralGestor_(valor) { return String(valor == null ? '' : valor).replace(/^'(?=[=+@-])/, ''); }
function textoLiteralGestor_(valor) { const texto = String(valor == null ? '' : valor); return /^[=+@-]/.test(texto) ? "'" + texto : texto; }
function hashEstadoGestor_(matriz) {
  const m = matriz.map(function (r) { const linha = r.map(function (v) { return typeof v === 'string' ? v.replace(/^'/, '') : v; }); while (linha.length && (linha[linha.length - 1] === '' || linha[linha.length - 1] == null)) linha.pop(); return linha; });
  while (m.length && !m[m.length - 1].length) m.pop(); return hashGestor_(m);
}

function exportarBackupRealGestor_(ctx) {
  const anterior = CONTEXTO_GESTOR_; CONTEXTO_GESTOR_ = null;
  try { return exportarBackupDadosWeb(); } finally { CONTEXTO_GESTOR_ = anterior; }
}

function atualizarStatusAutomatico() { return executarOperacaoGestor_('manutencao', null, function () { return atualizarStatusAutomaticoInterno_(); }, true); }

function unificarCategoriasNaPlanilha() { return executarOperacaoGestor_('unificarCategorias', null, function () { return unificarCategoriasNaPlanilhaInterno_(); }, true); }

function hashRegistroGestor_(registro) {
  const campos=registro.slice(0,11).concat([registro[14],registro[17] || 0]);
  if(/^gestor-(?:serie|devolucao)-v1:/.test(String(registro[15] || ''))) campos.push(registro[15]);
  return hashEstadoGestor_([campos]);
}

function valorPagoBancoGestor_(r, emprestimo) {
  const total = Math.max(0, centavosGestor_(r[7]));
  if (emprestimo ? r[14] === 'Pago' : isStatusPago(r[9])) return total / 100;
  return Math.min(total, Math.max(0, centavosGestor_(r[17] || 0))) / 100;
}

const REGRA_PAGAMENTO_FATURA_GESTOR_ = 'data-parcela-id-v1';
function compararItensPagamentoGestor_(a,b) {
  const dataA=parseDataBR(a.resumo.data),dataB=parseDataBR(b.resumo.data);
  return (dataA ? dataA.getTime() : 0)-(dataB ? dataB.getTime() : 0) || parseNumParcela(a.resumo.parcela).atual-parseNumParcela(b.resumo.parcela).atual || String(a.registroId).localeCompare(String(b.registroId));
}
function distribuirPagamentoFaturaGestor_(fatura,valor) {
  let restante=centavosGestor_(valor);
  if (restante <= 0 || restante > centavosGestor_(fatura.restante)) throw new Error('Informe um pagamento maior que zero e até o saldo em aberto.');
  const aplicacoes=[];
  fatura.itens.slice().sort(compararItensPagamentoGestor_).forEach(function(item){
    const falta=centavosGestor_(item.valor)-centavosGestor_(item.pago), aplicar=Math.min(falta,restante);
    if(aplicar<=0) return;
    aplicacoes.push(Object.assign({},item,{aplicar:aplicar/100,restante:(falta-aplicar)/100})); restante-=aplicar;
  });
  if(restante!==0) throw new Error('O saldo dos itens mudou. Confira a fatura novamente.');
  return aplicacoes;
}
function previaPagamentoFaturaWeb(param) {
  const fatura=obterFaturaPagamentoWeb(param);
  return {forma:fatura.forma,mesFatura:fatura.mesFatura,versaoFatura:fatura.versaoFatura,regra:fatura.regra,valor:centavosGestor_(param.valor)/100,aplicacoes:distribuirPagamentoFaturaGestor_(fatura,param.valor)};
}
function obterFaturaPagamentoWeb(param) {
  const mes = validarMesFaturaWeb_(param && param.mesFatura), forma = String(param && param.forma || '').trim();
  if (!forma || !formaEmprestimoConsomeLimite_(forma)) throw new Error('Selecione um cartão para conferir a fatura.');
  const itens = [], ss = obterPlanilhaGestor_(); let total = 0, pago = 0;
  ['Lançamentos', 'Empréstimos'].forEach(function (nome) {
    const sh = ss.getSheetByName(nome); if (!sh || sh.getLastRow() < 2) return;
    const emp = nome === 'Empréstimos';
    sh.getRange(2, 1, sh.getLastRow() - 1, COLUNAS_GESTOR_).getValues().forEach(function (r, i) {
      if (!r[11] || isStatusCancelado(r[9]) || chaveFormaGestor_(r[emp ? 3 : 2]) !== chaveFormaGestor_(forma) || formatarCelulaRegistroGestor_(r[8], 'MM/yyyy') !== mes) return;
      const valor = Math.max(0, centavosGestor_(r[7])), recebidoBanco = centavosGestor_(valorPagoBancoGestor_(r, emp));
      total += valor; pago += recebidoBanco;
      itens.push({ aba: nome, linha: i + 2, registroId: r[11], versao: Number(r[13]), valor: valor / 100, pago: recebidoBanco / 100, resumo: resumirRegistroAtividade_(r, nome), hash: hashRegistroGestor_(r) });
    });
  });
  itens.sort(compararItensPagamentoGestor_);
  const versao = hashGestor_({regra:REGRA_PAGAMENTO_FATURA_GESTOR_,itens:itens.map(function (i) { return [i.registroId, i.versao, i.hash]; })});
  return { forma: forma, mesFatura: mes, total: total / 100, pago: pago / 100, restante: (total - pago) / 100, versaoFatura: versao, regra:REGRA_PAGAMENTO_FATURA_GESTOR_, itens: itens };
}

function registrarPagamentoFaturaWeb(param) {
  return executarOperacaoGestor_('registrarPagamentoFaturaWeb', param, function () {
    const fatura = obterFaturaPagamentoWeb(param);
    if(param.regra!==REGRA_PAGAMENTO_FATURA_GESTOR_) throw new Error('Confira a prévia atualizada da distribuição antes de pagar a fatura.');
    if (param.versaoFatura !== fatura.versaoFatura) throw new Error('A fatura mudou. Atualize os valores antes de confirmar o pagamento.');
    const valor = centavosGestor_(param.valor), saldo = centavosGestor_(fatura.restante);
    if (valor <= 0 || valor > saldo) throw new Error('Informe um pagamento maior que zero e até o saldo em aberto.');
    const ss = obterPlanilhaGestor_(), grupos = Object.create(null);
    distribuirPagamentoFaturaGestor_(fatura,param.valor).forEach(function (item) {
      const g = grupos[item.aba] || (grupos[item.aba] = {inicio:item.linha,fim:item.linha,itens:[]});
      g.inicio=Math.min(g.inicio,item.linha);g.fim=Math.max(g.fim,item.linha);g.itens.push(item);
    });
    // A distribuição permanece a mesma. Preparar um bloco por aba evita
    // recalcular os controles de toda a planilha para cada parcela paga.
    Object.keys(grupos).forEach(function (nome) {
      const g=grupos[nome],sh=ss.getSheetByName(nome),range=sh.getRange(g.inicio,1,g.fim-g.inicio+1,COLUNAS_GESTOR_),calculados=range.getValues(),formulas=range.getFormulas();
      const linhas=calculados.map(function(r,i){return r.map(function(v,j){return formulas[i][j] || v;});});
      g.itens.forEach(function (item) {
        const r=linhas[item.linha-g.inicio];
        if(String(r[11])!==String(item.registroId) || Number(r[13])!==item.versao) throw new Error('A fatura mudou. Atualize os valores antes de confirmar o pagamento.');
        r[17]=(centavosGestor_(item.pago)+centavosGestor_(item.aplicar))/100;
        if(centavosGestor_(r[17])===centavosGestor_(calculados[item.linha-g.inicio][7])) {
          if(nome==='Empréstimos') r[14]='Pago';
          else r[9]=String(r[6])==='∞/∞'?'Assinatura Paga':'Pago';
        }
      });
      range.setValues(linhas);
    });
    return { sucesso: true, pago: valor / 100, restante: (saldo - valor) / 100 };
  }, false);
}

// Histórico visível separado do diário técnico. Só desfaz registros específicos,
// com conferência de identidade, conteúdo e versão; nunca restaura uma aba inteira.
const ABA_ATIVIDADE_GESTOR_ = '_Gestor_Atividade';
const ROTULOS_ATIVIDADE_GESTOR_ = {
  registrarRachadinhaWeb: 'Divisão registrada',
  salvarLancamentoWeb: 'Lançamento criado', salvarEmprestimoWeb: 'Empréstimo criado',
  editarLancamentoLinhaWeb: 'Lançamento editado', editarEmprestimoLinhaWeb: 'Empréstimo editado',
  excluirLancamentoWeb: 'Lançamento excluído', excluirEmprestimoWeb: 'Empréstimo excluído',
  alternarStatusEmprestimoWeb: 'Recebimento alterado', dividirParcelaEmprestimoWeb: 'Recebimento parcial',
  quitarFaturaWeb: 'Fatura quitada', registrarPagamentoFaturaWeb: 'Pagamento de fatura',
  moverParaEmprestimosWeb: 'Compra movida para terceiros', moverParaGastosPessoaisWeb: 'Compra movida para pessoal',
  adiantarParcelasWeb: 'Parcelas antecipadas', salvarNotasWeb: 'Notas atualizadas',
  editarAssinaturaWeb: 'Despesa fixa editada', cancelarAssinaturaWeb: 'Despesa fixa cancelada',
  salvarFormaPagamentoWeb: 'Forma de pagamento atualizada', excluirFormaPagamentoWeb: 'Forma de pagamento excluída',
  reordenarFormasPagamentoWeb: 'Formas reorganizadas', salvarCategoriasWeb: 'Categorias atualizadas',
  restaurarBackupDadosWeb: 'Backup restaurado',
  desfazerAtividadeWeb: 'Ação desfeita'
};
const ACOES_DESFAZER_GESTOR_ = ['registrarRachadinhaWeb', 'excluirLancamentoWeb', 'excluirEmprestimoWeb', 'alternarStatusEmprestimoWeb', 'dividirParcelaEmprestimoWeb', 'editarLancamentoLinhaWeb', 'editarEmprestimoLinhaWeb', 'quitarFaturaWeb', 'registrarPagamentoFaturaWeb'];

function formatarCelulaRegistroGestor_(valor, formato) {
  if (!(valor instanceof Date)) return limparApostrofo(valor);
  if (!Number.isFinite(valor.getTime())) throw new Error('Há uma data inválida no registro. Confira a planilha antes de registrar o pagamento.');
  // Formata somente a leitura; o conteúdo original permanece no hash e no diário.
  return Utilities.formatDate(valor, getTimezone(), formato);
}

function valoresExibidosRegistroGestor_(raw, exibidos) {
  const valores = exibidos.slice();
  [[0,'dd/MM/yyyy'],[6,'d/M'],[8,'MM/yyyy']].forEach(function(campo) {
    if (raw[campo[0]] instanceof Date) valores[campo[0]] = formatarCelulaRegistroGestor_(raw[campo[0]], campo[1]);
  });
  return valores;
}

function resumirRegistroAtividade_(r, aba) {
  if (!r) return null;
  const emp = aba === 'Empréstimos';
  return { pessoa: emp ? limparApostrofo(r[1]) : '', descricao: limparApostrofo(r[emp ? 2 : 1]), forma: limparApostrofo(r[emp ? 3 : 2]), data: formatarCelulaRegistroGestor_(r[0], 'dd/MM/yyyy'), mes: formatarCelulaRegistroGestor_(r[8], 'MM/yyyy'), parcela: formatarCelulaRegistroGestor_(r[6], 'd/M'), valor: extractNum(r[7]), situacao: String(r[9] || ''), estadoBanco: r[14] || '', pagoBanco: valorPagoBancoGestor_(r, emp) };
}

function registrarAtividadeGestor_(ctx) {
  const alteracoes = [];
  Object.keys(ctx.ss.abas).filter(ehAbaRegistrosGestor_).forEach(function (nome) {
    const aba = ctx.ss.abas[nome], atuais = new Map();
    aba.valores.slice(1).forEach(function (r) { if (r[11]) atuais.set(String(r[11]), r); });
    const anteriores = new Map();
    // A abertura guarda os IDs migrados por aba, inclusive os excluídos nesta operação.
    (aba.idsOriginaisAtividade || []).forEach(function (id) { anteriores.set(id, ctx.registrosIniciais[id]); });
    const ids = new Set([].concat(Array.from(anteriores.keys()), Array.from(atuais.keys())));
    ids.forEach(function (id) {
      const antes = anteriores.get(id) || null, depois = atuais.get(id) || null;
      if ((!antes && depois) || (antes && !depois) || (antes && depois && hashRegistroGestor_(antes) !== hashRegistroGestor_(depois))) alteracoes.push({ aba: nome, id: id, antes: antes ? copiarGestor_(antes) : null, depois: depois ? copiarGestor_(depois) : null });
    });
  });
  const sh = ctx.ss.abas[ABA_ATIVIDADE_GESTOR_] || null;
  const cabecalhoAtividade = ['Evento', 'Data', 'Ação', 'Resumo', 'Tipo', 'Conteúdo'];
  const real = sh || ctx.ssReal.getSheetByName(ABA_ATIVIDADE_GESTOR_);
  if (real && real.getLastRow() && !real.getRange(1, 1, 1, 6).getValues()[0].every(function (v, i) { return v === cabecalhoAtividade[i]; })) throw new Error('A aba _Gestor_Atividade já contém dados de outro formato. Preserve-a antes de usar o histórico.');
  const id = ctx.action + ':' + ctx.param.requestId;
  const rotulo = ROTULOS_ATIVIDADE_GESTOR_[ctx.action] || 'Dados atualizados';
  const amostra = alteracoes[0], registro = amostra && (amostra.depois || amostra.antes);
  const resumo = registro ? resumirRegistroAtividade_(registro, amostra.aba) : null;
  const evento = { id: id, acao: ctx.action, titulo: rotulo, data: new Date().toISOString(), resumo: resumo, quantidade: alteracoes.length,
    reverte: ctx.action === 'desfazerAtividadeWeb' ? String(ctx.param.eventoId) : '',
    reversivel: ACOES_DESFAZER_GESTOR_.indexOf(ctx.action) >= 0 && alteracoes.length > 0, alteracoes: alteracoes };
  const texto = JSON.stringify(serializarGestor_(evento)), partes = texto.match(/[\s\S]{1,12000}/g) || [''];
  const valores = [[id, evento.data, ctx.action, rotulo, 'EVENTO', partes.length]].concat(partes.map(function (p, i) { return [id, '', '', '', 'PARTE ' + (i + 1), JSON.stringify(p)]; }));
  if (sh) {
    if (!sh.getLastRow()) sh.getRange(1,1,1,6).setValues([cabecalhoAtividade]);
    sh.getRange(sh.getLastRow()+1,1,valores.length,6).setValues(valores);
  } else {
    const inicio = real ? real.getLastRow()+1 : 1;
    const linhas = inicio === 1 ? [cabecalhoAtividade].concat(valores) : valores;
    ctx.anexosTecnicos = ctx.anexosTecnicos || [];
    ctx.anexosTecnicos.push({modo:'anexar', nome:ABA_ATIVIDADE_GESTOR_, inicio:inicio, valores:linhas});
  }
}

function indiceEventosAtividadeGestor_() {
  const ss=CONTEXTO_GESTOR_ ? CONTEXTO_GESTOR_.ssReal : obterPlanilhaGestor_(),sh=ss.getSheetByName(ABA_ATIVIDADE_GESTOR_);
  return {sh:sh,linhas:sh ? localizarLinhasTecnicasGestor_(sh,5,'EVENTO').concat(localizarLinhasTecnicasGestor_(sh,5,'EVENTO_ARQUIVADO')).sort(function(a,b){return a-b;}) : []};
}
function lerEventosAtividadeGestor_(selecionadas,indice) {
  const fonte=indice || indiceEventosAtividadeGestor_(),sh=fonte.sh;
  if (!sh || sh.getLastRow() < 2) return [];
  if(Array.isArray(selecionadas)) {
    const posicoes=new Map(fonte.linhas.map(function(l,i){return [l,i];})),intervalos=[];
    selecionadas.slice().sort(function(a,b){return a-b;}).forEach(function(l){
      const i=posicoes.get(l);if(i===undefined)throw new Error('Evento não encontrado no histórico.');
      const fim=i+1<fonte.linhas.length?fonte.linhas[i+1]-1:sh.getLastRow(),anterior=intervalos[intervalos.length-1];
      if(anterior && anterior.fim+1===l && fim-anterior.inicio<250)anterior.fim=fim;else intervalos.push({inicio:l,fim:fim});
    });
    const eventos=[];
    intervalos.forEach(function(b){
      const linhas=[];for(let inicio=b.inicio;inicio<=b.fim;inicio+=250)Array.prototype.push.apply(linhas,sh.getRange(inicio,1,Math.min(250,b.fim-inicio+1),6).getValues());
      Array.prototype.push.apply(eventos,decodificarEventosAtividadeGestor_(linhas));
    });return eventos;
  }
  const linhas = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues(), eventos = [];
  return decodificarEventosAtividadeGestor_(linhas);
}
function decodificarEventosAtividadeGestor_(linhas) {
  const eventos=[];
  for (let i = 0; i < linhas.length; i++) {
    if(linhas[i][4]==='EVENTO_ARQUIVADO'){
      const evento=lerReferenciaTecnicaProtecaoGestor_(linhas[i][5],'eventos',linhas[i][0]);
      if(evento.id!==linhas[i][0]||evento.acao!==linhas[i][2])throw Error('Identificação do evento arquivado incompatível.');eventos.push(evento);continue;
    }
    if (linhas[i][4] !== 'EVENTO') continue;
    const qtd = Number(linhas[i][5]), partes = linhas.slice(i + 1, i + 1 + qtd);
    if (!Number.isInteger(qtd) || qtd < 1 || partes.length !== qtd || partes.some(function (r, n) { return r[0] !== linhas[i][0] || r[4] !== 'PARTE ' + (n + 1); })) throw new Error('Histórico incompleto. Confira a operação antes de continuar.');
    eventos.push(desserializarGestor_(JSON.parse(partes.map(function (r) { return JSON.parse(String(r[5])); }).join('')))); i += qtd;
  }
  return eventos;
}

function mapaRegistrosAtividadeGestor_() {
  const mapa = new Map(), ss = obterPlanilhaGestor_();
  ['Lançamentos', 'Empréstimos'].forEach(function (nome) {
    const sh = ss.getSheetByName(nome); if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, COLUNAS_GESTOR_).getValues().forEach(function (r, i) { if (r[11]) { if (mapa.has(String(r[11]))) throw new Error('Há registros com identificação repetida. Confira a planilha.'); mapa.set(String(r[11]), { aba: nome, linha: i + 2, registro: r }); } });
  }); return mapa;
}

function motivoBloqueioDesfazerGestor_(evento, mapa, revertidos) {
  if (!evento.reversivel) return 'Esta ação não oferece desfazer.';
  if (revertidos.has(evento.id)) return 'Esta ação já foi desfeita.';
  for (const a of evento.alteracoes) {
    const atual = mapa.get(a.id);
    if (!a.depois) { if (atual) return 'O registro já foi recuperado ou movido. Atualize a lista.'; }
    else if (!atual || atual.aba !== a.aba || Number(atual.registro[13]) !== Number(a.depois[13]) || hashRegistroGestor_(atual.registro) !== hashRegistroGestor_(a.depois)) return 'O registro mudou depois desta ação. Confira a versão mais recente.';
    if (a.antes) {
      if (!atual && a.aba==='Lançamentos' && limparApostrofo(a.antes[6])==='∞/∞') {
        const duplicada=Array.from(mapa.values()).some(function(item){return item.aba===a.aba && String(item.registro[12])===String(a.antes[12]) && formatarCelulaRegistroGestor_(item.registro[8],'MM/yyyy')===formatarCelulaRegistroGestor_(a.antes[8],'MM/yyyy');});
        if(duplicada) return 'Já existe uma ocorrência desta despesa fixa neste mês. Confira a versão atual antes de restaurar o registro antigo.';
      }
      const dependencia = motivoDependenciaDesfazerGestor_(a.antes, a.aba);
      if (dependencia) return dependencia;
    }
  } return '';
}

function obterAtividadeWeb(param) {
  const p = param || {}, indice=indiceEventosAtividadeGestor_(), mapa = mapaRegistrosAtividadeGestor_();
  const termo = normalizarTexto(String(p.termo || '').slice(0, 200)), tipo = String(p.tipo || '');
  const offset = Math.max(0, parseInt(p.offset, 10) || 0), limite = Math.min(50, Math.max(1, parseInt(p.limite, 10) || 20));
  const cabecalhos=new Set(indice.linhas),linhasReversoes=indice.sh ? localizarLinhasTecnicasGestor_(indice.sh,3,'desfazerAtividadeWeb').filter(function(l){return cabecalhos.has(l);}) : [];
  let pagina,total,reversoes;
  if(termo) {
    const eventos=lerEventosAtividadeGestor_(undefined,indice),filtrados=eventos.slice().reverse().filter(function(e){return (!tipo||e.acao===tipo)&&normalizarTexto([e.titulo,JSON.stringify(e.resumo || {})].join(' ')).indexOf(termo)>=0;});
    total=filtrados.length;pagina=filtrados.slice(offset,offset+limite);reversoes=eventos.filter(function(e){return e.reverte;});
  }else {
    const linhas=tipo ? (indice.sh ? localizarLinhasTecnicasGestor_(indice.sh,3,tipo).filter(function(l){return cabecalhos.has(l);}).sort(function(a,b){return b-a;}) : []) : indice.linhas.slice().reverse();
    total=linhas.length;pagina=lerEventosAtividadeGestor_(linhas.slice(offset,offset+limite),indice).reverse();reversoes=lerEventosAtividadeGestor_(linhasReversoes,indice);
  }
  const revertidos=new Set(reversoes.filter(function(e){return e.reverte;}).map(function(e){return e.reverte;}));
  return { total: total, temMais: offset + limite < total, itens: pagina.map(function (e) {
    const motivo = motivoBloqueioDesfazerGestor_(e, mapa, revertidos);
    const principal=e.alteracoes.find(function(a){return a.depois || a.antes;});
    const resumoExibido=principal?resumirRegistroAtividade_(principal.depois || principal.antes,principal.aba):copiarGestor_(e.resumo);
    return { id: e.id, titulo: e.titulo, acao: e.acao, data: e.data, resumo: resumoExibido, quantidade: e.quantidade, podeDesfazer: !motivo, motivo: motivo, desfeita: revertidos.has(e.id),
      detalhes: e.alteracoes.slice(0, 200).map(function (a) { return { antes: resumirRegistroAtividade_(a.antes, a.aba), depois: resumirRegistroAtividade_(a.depois, a.aba) }; }), detalhesTotal: e.alteracoes.length };
  }) };
}

function desfazerAtividadeWeb(param) {
  return executarOperacaoGestor_('desfazerAtividadeWeb', param, function () {
    const indice=indiceEventosAtividadeGestor_(),cabecalhos=new Set(indice.linhas),alvos=indice.sh ? localizarLinhasTecnicasGestor_(indice.sh,1,String(param.eventoId)).filter(function(l){return cabecalhos.has(l);}) : [];
    if(alvos.length>1)throw new Error('O histórico contém eventos repetidos. Preserve os dados para conferência.');
    const reversoes=indice.sh ? localizarLinhasTecnicasGestor_(indice.sh,3,'desfazerAtividadeWeb').filter(function(l){return cabecalhos.has(l);}) : [];
    const eventos = lerEventosAtividadeGestor_(Array.from(new Set(alvos.concat(reversoes))),indice), evento = eventos.find(function (e) { return e.id === String(param.eventoId); });
    if (!evento) throw new Error('Ação não encontrada no histórico.');
    const mapa = mapaRegistrosAtividadeGestor_(), revertidos = new Set(eventos.filter(function (e) { return e.reverte; }).map(function (e) { return e.reverte; }));
    const motivo = motivoBloqueioDesfazerGestor_(evento, mapa, revertidos); if (motivo) throw new Error(motivo);
    const ss = obterPlanilhaGestor_(), grupos=Object.create(null);
    evento.alteracoes.forEach(function (a) {
      let grupo=grupos[a.aba];
      if(!grupo) {
        const sh=ss.getSheetByName(a.aba),range=sh.getRange(1,1,Math.max(1,sh.getLastRow()),COLUNAS_GESTOR_),valores=range.getValues(),formulas=range.getFormulas();
        grupo=grupos[a.aba]={sh:sh,linhasAntes:valores.length,valores:valores.map(function(r,i){return r.map(function(v,j){return formulas[i][j] || v;});})};
      }
      const atual=mapa.get(a.id);
      if(!a.antes){grupo.valores[atual.linha-1]=Array(COLUNAS_GESTOR_).fill('');return;}
      const r = copiarGestor_(a.antes); while (r.length < COLUNAS_GESTOR_) r.push('');
      r[13] = Math.max(Number(a.antes[13] || 1), Number(a.depois && a.depois[13] || 0)) + 1;
      if(atual) grupo.valores[atual.linha-1]=r;
      else {
        while(grupo.valores.length>1 && !grupo.valores[grupo.valores.length-1].some(function(v){return v!=='' && v!==null;})) grupo.valores.pop();
        grupo.valores.push(r);
      }
    });
    Object.keys(grupos).forEach(function(nome){
      const g=grupos[nome],tamanho=Math.max(g.linhasAntes,g.valores.length);
      while(g.valores.length<tamanho)g.valores.push(Array(COLUNAS_GESTOR_).fill(''));
      g.sh.getRange(1,1,tamanho,COLUNAS_GESTOR_).setValues(g.valores);
    });
    return { sucesso: true, quantidade: evento.alteracoes.length };
  }, false);
}

// Restauração com prévia, controle de concorrência e cópia anterior recuperável.
const ABAS_BACKUP_RESTAURAVEL_ = ['Dashboard & Resumo', 'Formas de Pagamento', 'Lançamentos', 'Empréstimos', 'Anotações'];
const ABA_RESTAURACOES_GESTOR_ = '_Gestor_Restauracoes';
const LIMITE_BACKUP_RESTAURACAO_GESTOR_ = 8 * 1024 * 1024;
const CABECALHO_COPIAS_RESTAURACAO_GESTOR_ = ['Operação','Data','Parte','Conteúdo','SHA256','Partes'];

function aplicarFormatosRestauracaoGestor_(sh, mudanca) {
  if (!sh || !mudanca.formatosRestauracao) return;
  // Compatibilidade com planos antigos já persistidos: um detalhe visual não bloqueia a recuperação.
  try { sh.getRange(1,1,mudanca.formatosRestauracao.length,mudanca.formatosRestauracao[0].length).setNumberFormats(mudanca.formatosRestauracao); }
  catch (_) { console.warn('Formatação de restauração ignorada; valores preservados.'); }
}

function validarConteudoAbaBackupGestor_(aba) {
  const linhas = aba.valores, cols = linhas[0].length, nome = aba.nome;
  const texto = function (v) { return typeof v === 'string' && v.trim().length > 0; };
  const numero = function (v) { return typeof v === 'number' && Number.isFinite(v); };
  const vazia = function (r) { return r.every(function (v) { return v === '' || v === null; }); };
  const duplicados = new Set();
  const registrar = function (id) { if (duplicados.has(id)) throw new Error('Identificação repetida em ' + nome); duplicados.add(id); };
  if (nome === 'Anotações') {
    const titulos = ['ID','Texto','Concluída','Data','Versão','Excluída'];
    if (cols < 6 || titulos.some(function (t,i) { return linhas[0][i] !== t; })) throw new Error('Estrutura de Anotações incompleta.');
    linhas.slice(1).filter(function (r) { return !vazia(r); }).forEach(function (r) {
      if (!texto(r[0]) || r[0].length > 160 || (!texto(r[1]) && r[5] !== true) || typeof r[1] !== 'string' || ![true,false,''].includes(r[2]) || ![true,false,''].includes(r[5]) || !Number.isSafeInteger(r[4]) || r[4] < 1) throw new Error('Nota inválida ou incompleta no backup.');
      registrar(r[0]);
    });
  }
  if (nome === 'Formas de Pagamento') {
    if (cols < 6) throw new Error('Estrutura de formas de pagamento incompleta.');
    validarMetadadosTiposFormasGestor_(linhas);
    linhas.slice(6).forEach(function (r) {
      if (!r[1] && !r.slice(2,6).some(function (v) { return v !== '' && v !== null; })) return;
      if (!texto(r[1]) || !numero(r[3]) || r[3] < 0 || !['',null].includes(r[4]) && (!Number.isInteger(r[4]) || r[4]<1 || r[4]>31) || !['',null].includes(r[5]) && (!Number.isInteger(r[5]) || r[5]<1 || r[5]>31)) throw new Error('Cartão ou forma de pagamento inválida no backup.');
      registrar(normalizarTexto(r[1]));
    });
  }
  if (nome === 'Dashboard & Resumo') {
    if (cols < 4) throw new Error('Estrutura de categorias e metas incompleta.');
    linhas.slice(16,41).forEach(function (r) {
      if (!r[1] && (r[3] === '' || r[3] === null)) return;
      if (!texto(r[1]) || !['',null].includes(r[3]) && (!numero(r[3]) || r[3]<0)) throw new Error('Categoria ou meta inválida no backup.');
      registrar(chaveCategoria(r[1]));
    });
  }
  if (ehAbaRegistrosGestor_(nome)) linhas.slice(1).filter(function (r) { return !vazia(r); }).forEach(function (r) {
    const emprestimo = nome === 'Empréstimos', parcela = limparApostrofo(r[6]);
    if (!texto(r[1]) || !texto(r[2]) || !texto(r[3]) || !texto(r[9]) || !numero(r[7]) || r[7] < 0) throw new Error('Registro financeiro incompleto no backup.');
    if (parcela !== '∞/∞') {
      const p = parcela.match(/^(\d+)\/(\d+)$/);
      if (!p || +p[1]<1 || +p[2]<1 || +p[1]>+p[2] || +p[2]>600 || !Number.isInteger(r[5]) || r[5]!==+p[2] || !numero(r[4]) || r[4]<r[7]) throw new Error('Parcelamento inconsistente no backup.');
    } else if (emprestimo) throw new Error('Empréstimo com parcelamento inválido no backup.');
  });
}

function estadoRestauracaoGestor_() {
  const ss = obterPlanilhaGestor_();
  return hashGestor_(ABAS_BACKUP_RESTAURAVEL_.concat([ABA_ARQUIVOS_ANUAIS_GESTOR_]).map(function (nome) { return [nome, lerEstadoAbaGestor_(ss.getSheetByName(nome))]; }));
}

function validarBackupRestauracaoGestor_(backup) {
  if(backup&&backup.formato==='gestor-financeiro-backup-v2')return validarParticoesBackupProtecaoGestor_(backup);
  if (!backup || backup.formato !== 'gestor-financeiro-backup-v1' || !Array.isArray(backup.abas)) throw new Error('Selecione uma cópia JSON exportada pelo Gestor. CSV não permite restauração completa.');
  if (Utilities.newBlob(JSON.stringify(backup)).getBytes().length > LIMITE_BACKUP_RESTAURACAO_GESTOR_) throw new Error('Este backup excede o limite de restauração pelo app (8 MB). Preserve o arquivo para recuperação assistida.');
  const vistos = new Set(), ids = new Set(); let celulas = 0, formulasCriticas = 0;
  const permitidas = ABAS_BACKUP_RESTAURAVEL_.concat(['_Gestor_Atividade']);
  const abas = backup.abas.map(function (aba) {
    if (!aba || !permitidas.includes(aba.nome) || vistos.has(aba.nome)) throw new Error('O backup contém abas desconhecidas ou repetidas.');
    vistos.add(aba.nome);
    if (!Array.isArray(aba.valores) || !aba.valores.length || aba.valores.length > 20000) throw new Error('Aba vazia ou com dimensões inválidas: ' + aba.nome);
    if (!Array.isArray(aba.valores[0])) throw new Error('Linhas incompatíveis na aba ' + aba.nome);
    const cols = aba.valores[0].length;
    if (!cols || cols > 100 || aba.valores.some(function (r) { return !Array.isArray(r) || r.length !== cols; })) throw new Error('Linhas incompatíveis na aba ' + aba.nome);
    celulas += cols * aba.valores.length;
    if (celulas > 500000) throw new Error('Este backup tem células demais para restauração pelo app (500 mil).');
    if (aba.nome === '_Gestor_Atividade') return null; // Histórico atual permanece; o histórico antigo fica no arquivo.
    const registros = ehAbaRegistrosGestor_(aba.nome);
    const atual = obterPlanilhaGestor_().getSheetByName(aba.nome);
    const cabecalho = atual && atual.getLastRow() ? atual.getDataRange().getValues()[0] : null;
    if (registros && (cols < 11 || cols > COLUNAS_GESTOR_)) throw new Error('Estrutura financeira incompatível: ' + aba.nome);
    if (cabecalho && cabecalho.some(function (v, i) { return i < (registros ? 11 : Math.min(cols, cabecalho.length)) && String(v || '').trim() !== String(aba.valores[0][i] || '').trim(); })) throw new Error('Os cabeçalhos de ' + aba.nome + ' não correspondem à planilha atual.');
    const formulas = aba.formulas || [];
    const valores = aba.valores.map(function (r, i) { return r.map(function (v, j) {
      const formula = formulas[i] && formulas[i][j];
      if (formula) {
        if (typeof formula !== 'string' || formula[0] !== '=' || formula.length > 10000 || registros) throw new Error('Fórmula incompatível na aba ' + aba.nome + '. Preserve o arquivo para recuperação assistida.');
        const funcoes = formula.replace(/"(?:[^"]|"")*"/g, '""').match(/[A-Z_][A-Z0-9_.]*(?=\s*\()/gi) || [];
        const seguras = 'SUM SUMIF SUMIFS IF IFERROR COUNT COUNTIF COUNTIFS COUNTA AVERAGE MIN MAX ROUND ROUNDUP ROUNDDOWN TODAY DATE YEAR MONTH DAY TEXT VALUE FILTER SORT UNIQUE VLOOKUP HLOOKUP INDEX MATCH ARRAYFORMULA SUMPRODUCT AND OR NOT ISBLANK LEN LEFT RIGHT MID TRIM SUBSTITUTE LOWER UPPER CONCATENATE';
        if (funcoes.some(function (f) { return !seguras.split(' ').includes(f.toUpperCase()); })) throw new Error('Fórmula não suportada para restauração automática: ' + aba.nome);
        // Nomes, limites, dias, tipos e metas usam exatamente os valores
        // conferidos pela prévia. Fórmulas particulares fora dessas áreas ficam.
        if (celulaCriticaConfiguracaoBackupGestor_(aba, i, j)) {
          formulasCriticas++;
          return typeof v === 'string' ? textoLiteralGestor_(v) : (v === null ? '' : v);
        }
        return formula;
      }
      if (v && typeof v === 'object') {
        if (v.tipo !== 'data' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(v.valor || '')) throw new Error('Valor de célula inválido no backup.');
        return Utilities.parseDate(v.valor, backup.fusoHorario || getTimezone(), "yyyy-MM-dd'T'HH:mm:ss");
      }
      if (v !== null && !['string','number','boolean'].includes(typeof v)) throw new Error('Tipo de célula inválido.');
      if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Número inválido no backup.');
      if (typeof v === 'string' && v.length > 49000) throw new Error('Texto longo demais no backup.');
      return typeof v === 'string' ? textoLiteralGestor_(v) : (v === null ? '' : v);
    }); });
    if (registros) valores.slice(1).forEach(function (r) {
      if (!r.some(function (v) { return v !== ''; })) return;
      [0,6,8].forEach(function(c){if(r[c] instanceof Date) r[c]=formatarCelulaRegistroGestor_(r[c],c===0?'dd/MM/yyyy':c===6?'d/M':'MM/yyyy');});
      if (centavosGestor_(r[7]) < 0 || centavosGestor_(r[17] || 0) < 0 || centavosGestor_(r[17] || 0) > centavosGestor_(r[7])) throw new Error('Valor financeiro inconsistente no backup.');
      validarDataCalendarioWeb_(limparApostrofo(r[0]), 'Data no backup'); validarMesFaturaWeb_(limparApostrofo(r[8]));
      if (r[11] && (typeof r[11] !== 'string' || r[11].length > 160 || typeof r[12] !== 'string' || !r[12] || r[12].length > 160 || !Number.isSafeInteger(Number(r[13])) || Number(r[13]) < 1)) throw new Error('Identidade financeira inválida no backup.');
      const estados = aba.nome === 'Empréstimos' ? ['A Receber','Recebido'] : ['Pago','Em Aberto','Agendado','Assinatura Ativa','Assinatura Paga','Assinatura Cancelada','Pago (Cancelada)','Ocorrência Pulada'];
      if (!estados.includes(limparApostrofo(r[9]))) throw new Error('Situação financeira desconhecida no backup: ' + aba.nome + '.');
      [4,7,17].forEach(function (c) { if (r[c] !== '' && r[c] != null && (typeof r[c] !== 'number' || !Number.isFinite(r[c]) || Math.abs(r[c] - centavosGestor_(r[c])/100) > 0.000001)) throw new Error('Valor monetário inválido ou com fração de centavo no backup.'); });
      if (r[14] && !['Pago','Em Aberto'].includes(limparApostrofo(r[14]))) throw new Error('Estado de pagamento ao banco inválido no backup.');
      // Versões legadas marcaram Pix Pago mantendo zero na coluna técnica.
      // Nesse caso a situação integral continua sendo a fonte de verdade.
      if (centavosGestor_(r[17] || 0)>0 && (aba.nome === 'Empréstimos' ? r[14] === 'Pago' : isStatusPago(r[9])) && centavosGestor_(r[17]) !== centavosGestor_(r[7])) throw new Error('Pagamento ao banco incompatível com a situação de quitação no backup.');
      if (r[11]) { if (ids.has(String(r[11]))) throw new Error('Identificador financeiro repetido no backup.'); ids.add(String(r[11])); }
    });
    validarConteudoAbaBackupGestor_({nome:aba.nome,valores:valores});
    // Máscaras vindas do arquivo não participam da transação financeira.
    return { nome: aba.nome, valores: valores, formatos: null };
  }).filter(Boolean);
  ['Dashboard & Resumo','Formas de Pagamento','Lançamentos'].forEach(function (nome) { if (!vistos.has(nome)) throw new Error('O backup está incompleto: falta ' + nome); });
  // Ausência não significa exclusão: abas que não constam no arquivo ficam intactas.
  abas.preservadas = ABAS_BACKUP_RESTAURAVEL_.filter(function (nome) { return !vistos.has(nome); });
  abas.avisos = abas.preservadas.map(function (nome) { return nome + ': ausente no arquivo; os dados atuais serão preservados.'; });
  validarIdentidadesEstadoRestauradoGestor_(abas);
  if (formulasCriticas) abas.avisos.push(formulasCriticas + ' fórmula(s) de configuração serão restauradas como os valores validados exibidos na prévia, preservando limites, nomes, dias e metas.');
  if (backup.abas.some(function (a) { return a.formatosNumericos; })) abas.avisos.push('A formatação do arquivo não será importada. Os dados usam a apresentação padrão do app.');
  return abas;
}

function resolverFonteBackupRestauracaoGestor_(param) {
  return typeof resolverBackupRestauracaoGestor_ === 'function' ? resolverBackupRestauracaoGestor_(param || {}) : param && param.backup;
}

function registrosResumoBackupGestor_(nome, linhas) {
  const possuiConteudo = function (r) { return r.some(function (v) { return v !== '' && v != null; }); };
  if (nome === 'Dashboard & Resumo') return linhas.slice(16,41).filter(function (r) { return !!r[1]; });
  if (nome === 'Formas de Pagamento') return linhas.slice(6).filter(function (r) { return !!r[1]; });
  return linhas.slice(1).filter(possuiConteudo);
}

function resumirAbaRestauracaoGestor_(nome, linhas) {
  const dados = registrosResumoBackupGestor_(nome, linhas), financeiro = ehAbaRegistrosGestor_(nome), emp = nome === 'Empréstimos';
  const resumo = { registros:dados.length, total:financeiro?0:null };
  if (nome === 'Anotações') { resumo.ativas=dados.filter(function (r) { return r[5] !== true; }).length; resumo.excluidas=dados.length-resumo.ativas; return resumo; }
  if (!financeiro) return resumo;
  let total=0,pago=0,recebido=0,cancelado=0; const meses = new Map();
  resumo.cancelados=0; resumo.identidadesLegadas=0;
  dados.forEach(function (r) {
    if (!r[11]) resumo.identidadesLegadas++;
    const valor=centavosGestor_(r[7] || 0);
    if (isStatusCancelado(r[9])) { resumo.cancelados++; cancelado+=valor; return; }
    total+=valor; pago+=centavosGestor_(valorPagoBancoGestor_(r,emp));
    if (emp && limparApostrofo(r[9]) === 'Recebido') recebido+=valor;
    const mes=formatarCelulaRegistroGestor_(r[8],'MM/yyyy'); meses.set(mes,(meses.get(mes) || 0)+valor);
  });
  resumo.total=total/100; resumo.pagoBanco=pago/100; resumo.saldoBanco=(total-pago)/100; resumo.valorCancelado=cancelado/100;
  if (emp) { resumo.recebido=recebido/100; resumo.aReceber=(total-recebido)/100; }
  resumo.periodos=Array.from(meses).sort(function (a,b) { return parseMesFat(a[0]).time-parseMesFat(b[0]).time; }).map(function (p) { return {mes:p[0],total:p[1]/100}; });
  return resumo;
}

function diferencasAbaRestauracaoGestor_(nome, antes, depois) {
  const construir = function (linhas) {
    const mapa=new Map(), repetidos=new Map();
    registrosResumoBackupGestor_(nome,linhas).forEach(function (r) {
      let chave,conteudo;
      if (ehAbaRegistrosGestor_(nome)) {
        conteudo=copiarGestor_(r.slice(0,13).concat([r[14],r[15],r[17] || 0]));
        [0,6,8].forEach(function (c) { conteudo[c]=formatarCelulaRegistroGestor_(conteudo[c],c===0?'dd/MM/yyyy':c===6?'d/M':'MM/yyyy'); });
        chave=r[11]?'id:'+r[11]:'legado:'+hashGestor_(conteudo);
      } else if (nome === 'Anotações') { chave='nota:'+r[0]; conteudo=[r[0],r[1],r[2],r[3],r[5]]; }
      else if (nome === 'Formas de Pagamento') { chave='forma:'+chaveFormaGestor_(r[1]); conteudo=r; }
      else { chave='categoria:'+chaveCategoria(r[1]); conteudo=[r[1],r[3]]; }
      const repeticao=repetidos.get(chave) || 0; repetidos.set(chave,repeticao+1);
      mapa.set(chave+':'+repeticao,{hash:hashEstadoGestor_([conteudo]),rotulo:String(r[ehAbaRegistrosGestor_(nome) && nome==='Empréstimos'?2:1] || r[0] || '').slice(0,160)});
    }); return mapa;
  };
  const atuais=construir(antes), novos=construir(depois), resumo={incluidos:0,alterados:0,removidos:0,mantidos:0,amostras:[]};
  const registrar = function (tipo, item) { resumo[tipo]++; if (resumo.amostras.length<6) resumo.amostras.push({tipo:tipo,descricao:item.rotulo}); };
  atuais.forEach(function (a,id) { if (!novos.has(id)) registrar('removidos',a); else if (novos.get(id).hash!==a.hash) registrar('alterados',novos.get(id)); else resumo.mantidos++; });
  novos.forEach(function (a,id) { if (!atuais.has(id)) registrar('incluidos',a); });
  return resumo;
}

function avisosDependenciasBackupGestor_(abas, ss) {
  const mapa=new Map(abas.map(function (a) { return [a.nome,a.valores]; }));
  const linhas=function (nome) { const sh=ss.getSheetByName(nome); return mapa.has(nome)?mapa.get(nome):(sh?sh.getDataRange().getValues():[]); };
  const formas=new Set(registrosResumoBackupGestor_('Formas de Pagamento',linhas('Formas de Pagamento')).map(function (r) { return chaveFormaGestor_(r[1]); }));
  const categorias=new Set(registrosResumoBackupGestor_('Dashboard & Resumo',linhas('Dashboard & Resumo')).map(function (r) { return chaveCategoria(r[1]); }));
  let formasAusentes=0,categoriasAusentes=0,seriesInvalidas=0;
  ['Lançamentos','Empréstimos'].forEach(function (nome) {
    registrosResumoBackupGestor_(nome,linhas(nome)).forEach(function (r) {
      if (!formas.has(chaveFormaGestor_(r[nome==='Empréstimos'?3:2]))) formasAusentes++;
      if (nome==='Lançamentos' && !categorias.has(chaveCategoria(r[3]))) categoriasAusentes++;
      if (nome==='Lançamentos' && limparApostrofo(r[6])==='∞/∞' && serieRecorrenteGestor_(r).invalida) seriesInvalidas++;
    });
  });
  const avisos=[];
  if (formasAusentes) avisos.push(formasAusentes+' registro(s) históricos usam formas ausentes no cadastro restaurado. Eles serão preservados; confira os cadastros antes de editar ou registrar pagamentos.');
  if (categoriasAusentes) avisos.push(categoriasAusentes+' registro(s) históricos usam categorias ausentes no cadastro restaurado. Nenhuma categoria será inventada para substituir o histórico.');
  if (seriesInvalidas) avisos.push(seriesInvalidas+' ocorrência(s) de despesas fixas têm controle inválido. O conteúdo será preservado e a geração dessas séries continuará bloqueada até conferência.');
  if (!categorias.has('outros')) avisos.push('O arquivo é anterior à reserva de Outros. O app manterá sua regra atual de categoria reservada sem descartar categorias existentes.');
  return avisos;
}

function previaRestauracaoBackupWeb(param) {
  return executarOperacaoGestor_('previaRestauracaoBackupWeb', param, function () {
    const backup=resolverFonteBackupRestauracaoGestor_(param), abas=validarBackupRestauracaoGestor_(backup), ss=obterPlanilhaGestor_();
    const anuais=planejarAnuaisRestauracaoProtecaoGestor_(abas,backup,ss),avisos=abas.avisos.concat(avisosDependenciasBackupGestor_(abas,ss));
    if(anuais.preservadas.length&&anuais.legiveis.length)avisos.push('Os registros anuais de '+anuais.preservadas.join(', ')+' também serão preservados.');
    if(anuais.necessaria)avisos.push('Recuperação de arquivos ou catálogo anual: a cópia anterior guardará o conteúdo legível, a matriz original do catálogo e o diagnóstico. O JSON selecionado reconstruirá os anos conferidos.');
    if(backup.recuperacaoOrigem)avisos.push('Esta cópia anterior foi gerada durante uma recuperação: pode não conter todos os anos originais. Consulte o diagnóstico preservado no arquivo antes de prosseguir.');
    return { protocoloGestor:13, recuperacaoAnual:{necessaria:anuais.necessaria,catalogoDanificado:anuais.catalogoDanificado,erroCatalogo:anuais.erroCatalogo,assinatura:anuais.assinatura,indisponiveis:anuais.indisponiveis}, preservadasAnuais:anuais.preservadas, arquivosAtuais:anuais.catalogo.length, arquivosAnuais:(abas.arquivosAnuais||[]).map(function(d){return {ano:d.ano,resumo:resumoArquivoAnualProtecaoGestor_(d)};}), versaoAtual:estadoRestauracaoGestor_(), hashBackup:hashGestor_(backup), planilha:ss.getName(), origem:String(backup.planilha || ''), avisos:avisos, preservadas:abas.preservadas, geradoEm:String(backup.geradoEm || ''), modo:'substituicao', historicoPreservado:true, abas:abas.map(function (aba) {
      const sh=ss.getSheetByName(aba.nome), atual=sh && sh.getLastRow()?sh.getDataRange().getValues():[];
      return {nome:aba.nome,atual:resumirAbaRestauracaoGestor_(aba.nome,atual),backup:resumirAbaRestauracaoGestor_(aba.nome,aba.valores),diferencas:diferencasAbaRestauracaoGestor_(aba.nome,atual,aba.valores)};
    }) };
  }, true);
}

function restaurarBackupDadosWeb(param) {
  return executarOperacaoGestor_('restaurarBackupDadosWeb', param, function () {
    if (!param || param.confirmacao !== 'RESTAURAR') throw new Error('Confirme a restauração antes de continuar.');
    const backup=resolverFonteBackupRestauracaoGestor_(param), abas = validarBackupRestauracaoGestor_(backup), ss = obterPlanilhaGestor_();
    if (hashGestor_(backup) !== param.hashBackup || estadoRestauracaoGestor_() !== param.versaoAtual) throw new Error('Os dados mudaram desde a prévia. Abra uma nova prévia antes de restaurar.');
    const anuais=planejarAnuaisRestauracaoProtecaoGestor_(abas,backup,ss);
    if((param.assinaturaAnuais||anuais.necessaria)&&param.assinaturaAnuais!==anuais.assinatura)throw Error('A situação dos arquivos anuais mudou. Abra uma nova prévia antes de restaurar.');
    if(anuais.necessaria&&param.confirmarRecuperacaoAnual!==true)throw Error('Confirme especificamente a recuperação dos arquivos anuais ou do catálogo indisponível.');
    const originalAnterior = anuais.necessaria?montarBackupDadosGestor_(CONTEXTO_GESTOR_.ssReal,{restauravel:true},anuais):exportarBackupDadosWeb();
    const copiaAnterior = { ...originalAnterior, abas: originalAnterior.abas.filter(function (a) { return a.nome !== '_Gestor_Atividade'; }).map(function (a) { const dados = Object.assign({}, a); delete dados.exibidos; return dados; }) };
    const copia=prepararCopiaAnteriorRestauracaoGestor_(copiaAnterior,param.requestId);
    abas.forEach(function (dados) {
      const sh = ss.getSheetByName(dados.nome) || ss.insertSheet(dados.nome);
      // Manipulação do plano em memória: a gravação real fica sob o diário recuperável.
      sh.valores = copiarGestor_(dados.valores); sh.colunas = Math.max(sh.colunas, dados.valores[0].length);
      if (ehAbaRegistrosGestor_(dados.nome)) sh.valores.slice(1).forEach(function (r) { if (r[11]) { const antes = CONTEXTO_GESTOR_.registrosIniciais[String(r[11])]; r[13] = Math.max(Number(r[13]) || 1, antes ? Number(antes[13]) || 1 : 1) + 1; } });
      sh.alterados = Object.create(null); sh.valores.forEach(function (r,i) { r.forEach(function (_,j) { sh.alterados[i+':'+j] = true; }); });
      if (dados.nome === 'Anotações') { const revisoes = new Map(sh.antes.slice(1).map(function (r) { return [String(r[0]), Number(r[4]) || 1]; })); sh.valores.slice(1).forEach(function (r) { if (r[0]) r[4] = Math.max(Number(r[4]) || 1, revisoes.get(String(r[0])) || 1) + 1; }); }
      if (dados.formatos) sh.formatosRestauracao = dados.formatos;
    });
    prepararArquivosRestauracaoProtecaoGestor_(abas,ss);
    return { sucesso: true, copiaAnteriorDisponivel: true, copiaAnteriorId:param.requestId, hashCopiaAnterior:copia.hash, mensagem: 'Dados restaurados. A cópia anterior foi preservada com comprovante de integridade.' };
  }, false);
}

function hashTextoBackupGestor_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,texto,Utilities.Charset.UTF_8).map(function (b) { return ('0'+((b+256)%256).toString(16)).slice(-2); }).join('');
}

function planilhaRealCopiasRestauracaoGestor_() { return CONTEXTO_GESTOR_?CONTEXTO_GESTOR_.ssReal:obterPlanilhaGestor_(); }

function prepararCopiaAnteriorRestauracaoGestor_(backup,id) {
  const texto=JSON.stringify(backup), bytes=Utilities.newBlob(texto).getBytes().length;
  if (bytes>LIMITE_BACKUP_RESTAURACAO_GESTOR_) throw new Error('A cópia dos dados atuais excede 8 MB. Exporte os dados para recuperação assistida antes de continuar.');
  const real=planilhaRealCopiasRestauracaoGestor_(), sh=real.getSheetByName(ABA_RESTAURACOES_GESTOR_);
  if (sh && sh.getLastRow() && JSON.stringify(sh.getRange(1,1,1,4).getValues()[0])!==JSON.stringify(CABECALHO_COPIAS_RESTAURACAO_GESTOR_.slice(0,4))) throw new Error('A aba de segurança já contém dados incompatíveis.');
  const hash=hashTextoBackupGestor_(texto), partes=texto.match(/[\s\S]{1,12000}/g) || [''];
  const valores=partes.map(function (p,i) { return [id,backup.geradoEm,i+1,JSON.stringify(p),hash,partes.length]; });
  const inicio=sh?sh.getLastRow()+1:1;
  if (inicio===1) valores.unshift(CABECALHO_COPIAS_RESTAURACAO_GESTOR_.slice());
  // Anexo técnico: o histórico de cópias anteriores não é carregado e regravado
  // a cada restauração. O diário confirma este anexo ANTES dos dados financeiros.
  if (!CONTEXTO_GESTOR_) throw new Error('A cópia de segurança precisa do diário protegido da restauração.');
  (CONTEXTO_GESTOR_.anexosTecnicos || (CONTEXTO_GESTOR_.anexosTecnicos=[])).push({nome:ABA_RESTAURACOES_GESTOR_,modo:'anexar',inicio:inicio,valores:valores});
  return {hash:hash,bytes:bytes,partes:partes.length};
}

function indiceCopiasRestauracaoGestor_() {
  const sh=planilhaRealCopiasRestauracaoGestor_().getSheetByName(ABA_RESTAURACOES_GESTOR_);
  if (!sh || sh.getLastRow()<2) return {sh:sh,itens:[]};
  if (JSON.stringify(sh.getRange(1,1,1,4).getValues()[0])!==JSON.stringify(CABECALHO_COPIAS_RESTAURACAO_GESTOR_.slice(0,4))) throw new Error('A aba de segurança possui estrutura incompatível. Preserve a planilha para conferência.');
  // Conteúdo das cópias não participa da listagem: apenas metadados pequenos.
  const n=sh.getLastRow()-1, ids=sh.getRange(2,1,n,3).getValues(), hashes=sh.getRange(2,5,n,2).getValues(), mapa=new Map();
  ids.forEach(function (r,i) {
    const id=String(r[0] || '');
    if (!mapa.has(id)) mapa.set(id,{id:id,data:String(r[1] || ''),linhas:[],partes:0,hashCopia:'',integridade:'legado',disponivel:true,motivo:''});
    const item=mapa.get(id), h=hashes[i] || [];
    item.linhas.push(i+2);item.partes++;
    if (!id || !Number.isInteger(Number(r[2])) || Number(r[2])!==item.partes || String(r[1] || '')!==item.data) {item.disponivel=false;item.motivo='Sequência de partes incompatível.';}
    if (h[0] || h[1]) {
      if (!/^[a-f0-9]{64}$/.test(String(h[0])) || !Number.isInteger(Number(h[1])) || Number(h[1])<1 || (item.hashCopia && item.hashCopia!==h[0]) || (item.totalEsperado && item.totalEsperado!==Number(h[1]))) {item.disponivel=false;item.motivo='Comprovante de integridade incompatível.';}
      item.hashCopia=String(h[0]);item.totalEsperado=Number(h[1]);item.integridade='com_comprovante';
    } else if (item.hashCopia) {item.disponivel=false;item.motivo='Comprovante ausente em uma das partes.';}
  });
  const itens=Array.from(mapa.values()).map(function (item) {
    if (item.totalEsperado && item.totalEsperado!==item.partes) {item.disponivel=false;item.motivo='Cópia anterior incompleta.';}
    if (item.hashCopia && item.linhas.some(function (l) { return !(hashes[l-2] || [])[0]; })) {item.disponivel=false;item.motivo='Comprovante ausente em uma das partes.';}
    return item;
  }).reverse();
  return {sh:sh,itens:itens};
}

function selecionarCopiaRestauracaoGestor_(param) {
  const indice=indiceCopiasRestauracaoGestor_(), id=String(param && param.copiaId || '');
  const item=id?indice.itens.find(function (c) { return c.id===id; }):indice.itens[0];
  if (!item) throw new Error(id?'A cópia selecionada não foi encontrada.':'Ainda não existe uma cópia anterior à restauração.');
  if (!item.disponivel) throw new Error(item.motivo+' Preserve a planilha para conferência.');
  return {sh:indice.sh,item:item};
}

function lerLinhasCopiaRestauracaoGestor_(sh,linhas) {
  const valores=[];
  blocosContiguosPlanoGestor_(linhas).forEach(function (b) { Array.prototype.push.apply(valores,sh.getRange(b.inicio,1,b.fim-b.inicio+1,6).getValues()); });
  return valores;
}

function listarCopiasRestauracaoWeb(param) {
  return executarOperacaoGestor_('listarCopiasRestauracaoWeb',param,function () {
    const indice=indiceCopiasRestauracaoGestor_(), offset=Math.max(0,parseInt(param && param.offset,10)||0), limite=Math.min(20,Math.max(1,parseInt(param && param.limite,10)||10));
    return {total:indice.itens.length,temMais:offset+limite<indice.itens.length,itens:indice.itens.slice(offset,offset+limite).map(function (c) {return {id:c.id,data:c.data,partes:c.partes,hashCopia:c.hashCopia,integridade:c.integridade,disponivel:c.disponivel,motivo:c.motivo};})};
  },true);
}

function obterParteCopiaRestauracaoWeb(param) {
  return executarOperacaoGestor_('obterParteCopiaRestauracaoWeb',param,function () {
    const selecionada=selecionarCopiaRestauracaoGestor_(param), item=selecionada.item, parte=Number(param && param.parte);
    if (!Number.isInteger(parte) || parte<1 || parte>item.partes) throw new Error('Parte da cópia inválida.');
    const quantidade=Math.min(20,Math.max(1,parseInt(param && param.quantidade,10)||1));
    const chunks=lerLinhasCopiaRestauracaoGestor_(selecionada.sh,item.linhas.slice(parte-1,parte-1+quantidade)).map(function (r,i) {
      let chunk;try {chunk=JSON.parse(String(r[3]));}catch (_) {throw new Error('Conteúdo da cópia anterior incompatível. Preserve a planilha para conferência.');}
      if (typeof chunk!=='string' || chunk.length>12000 || String(r[0])!==item.id || Number(r[2])!==parte+i || (item.hashCopia && r[4]!==item.hashCopia)) throw new Error('Parte da cópia anterior incompatível.');
      return {parte:parte+i,chunk:chunk};
    });
    return {copiaId:item.id,data:item.data,parte:parte,chunk:chunks[0].chunk,chunks:chunks,proximaParte:parte+chunks.length,totalPartes:item.partes,hashCopia:item.hashCopia,integridade:item.integridade};
  },true);
}

function obterBackupAnteriorWeb(param) {
  return executarOperacaoGestor_('obterBackupAnteriorWeb',param,function () {
    const selecionada=selecionarCopiaRestauracaoGestor_(param), item=selecionada.item, chunks=[];
    lerLinhasCopiaRestauracaoGestor_(selecionada.sh,item.linhas).forEach(function (r,i) {
      let chunk;
      try {chunk=JSON.parse(String(r[3]));}catch (_) {throw new Error('Conteúdo da cópia anterior incompatível. Preserve a planilha para conferência.');}
      if (typeof chunk!=='string' || chunk.length>12000 || String(r[0])!==item.id || Number(r[2])!==i+1 || (item.hashCopia && r[4]!==item.hashCopia)) throw new Error('Parte da cópia anterior incompatível.');
      chunks.push(chunk);
    });
    const texto=chunks.join('');
    if (Utilities.newBlob(texto).getBytes().length>LIMITE_BACKUP_RESTAURACAO_GESTOR_) throw new Error('A cópia excede o limite de 8 MB. Preserve o arquivo para recuperação assistida.');
    if (item.hashCopia && hashTextoBackupGestor_(texto)!==item.hashCopia) throw new Error('A cópia anterior foi alterada ou está incompleta. O comprovante de integridade não confere; nenhum dado foi restaurado.');
    let backup;try {backup=JSON.parse(texto);}catch (_) {throw new Error('Cópia anterior incompleta ou incompatível. Preserve a planilha para conferência.');}
    return backup;
  },true);
}

function epocaRestauracaoGestor_() {
  const ss = CONTEXTO_GESTOR_ ? CONTEXTO_GESTOR_.ssReal : obterPlanilhaGestor_();
  const sh = ss.getSheetByName(ABA_RESTAURACOES_GESTOR_);
  return sh && sh.getLastRow() > 1 ? String(sh.getRange(sh.getLastRow(),1).getValue() || '') : '';
}

// O metadado fica depois das áreas B:G e H:I da planilha original. Uma coluna
// particular nunca é reutilizada: a migração acrescenta sua própria coluna.
const CABECALHO_TIPO_FORMA_GESTOR_ = '_Gestor_Tipo_Forma_v1';
const TIPOS_FORMA_GESTOR_ = ['cartao', 'pix', 'avista', 'resumo'];

function chaveFormaGestor_(nome) {
  return normalizarTexto(limparApostrofo(nome)).replace(/\s+/g, ' ');
}

function validarNomesFormasGestor_(linhas) {
  const vistos = new Set();
  linhas.slice(6).forEach(function (r) {
    const chave = chaveFormaGestor_(r[1]);
    if (!chave) return;
    if (vistos.has(chave)) throw new Error('Há formas de pagamento com nomes equivalentes após normalizar acentos e espaços. Preserve os cadastros e escolha nomes distintos antes de continuar.');
    vistos.add(chave);
  });
}

// Só o cadastro atual pode autorizar uma nova compra. O fallback usado para
// leitura de históricos antigos nunca serve como cadastro para uma gravação.
function validarFormaAtualGestor_(nome, opcoes) {
  const ss = obterPlanilhaGestor_(), sh = ss.getSheetByName('Formas de Pagamento');
  if (!sh) throw new Error('O cadastro de formas de pagamento não foi encontrado. Seu rascunho foi preservado.');
  const linha = encontrarLinhaForma(sh, nome);
  if (linha < 0) throw new Error('A forma selecionada foi removida ou renomeada. Atualize os dados e selecione a forma atual; seu rascunho foi preservado.');
  const cadastro = sh.getRange(linha, 2, 1, 6).getValues()[0];
  const canonico = limparApostrofo(cadastro[0]), tipo = tipoFormaGestor_(canonico, ss), opts = opcoes || {};
  if (tipo === 'resumo') throw new Error('A linha de total é um resumo. Selecione uma forma de pagamento para a compra.');
  const mantemHistorico = !opts.novaCompra && opts.formaAnterior && chaveFormaGestor_(opts.formaAnterior) === chaveFormaGestor_(canonico);
  if (normalizarTexto(cadastro[5]) === 'arquivado' && !mantemHistorico) throw new Error('Esta forma está arquivada. Selecione uma forma ativa para o novo lançamento; seu rascunho foi preservado.');
  return canonico;
}

function validarCategoriaAtualGestor_(nome) {
  const ss = obterPlanilhaGestor_(), sh = ss.getSheetByName('Dashboard & Resumo');
  const chave = chaveCategoria(nome), cadastradas = listarNomesCategoriasConfig(sh);
  const correspondentes = cadastradas.filter(function (categoria) { return chaveCategoria(categoria) === chave; });
  if (!chave || correspondentes.length !== 1) throw new Error('A categoria selecionada não está mais disponível ou seu cadastro está ambíguo. Atualize as categorias e confira o rascunho antes de gravar.');
  return correspondentes[0];
}

function validarMetadadosTiposFormasGestor_(linhas) {
  validarNomesFormasGestor_(linhas);
  const cabecalho = linhas[5] || [], colunas = [];
  cabecalho.forEach(function (v,i) { if (v === CABECALHO_TIPO_FORMA_GESTOR_) colunas.push(i); });
  if (colunas.length > 1 || colunas.some(function (i) { return i < 9; })) throw new Error('A coluna de tipo das formas está repetida ou em uma área reservada. Preserve os dados e confira o cadastro.');
  if (!colunas.length) return 0;
  const i = colunas[0];
  linhas.slice(6).forEach(function (r) {
    const tipo = r[i];
    if (tipo !== '' && tipo != null && (!TIPOS_FORMA_GESTOR_.includes(tipo) || !String(r[1] || '').trim())) throw new Error('Tipo de forma inválido ou sem cadastro correspondente. Confira a coluna técnica de tipos.');
  });
  return i + 1;
}

function colunaTipoFormaGestor_(sh, criar) {
  if (!sh) return 0;
  const range = sh.getDataRange(), linhas = range.getValues();
  const existente = validarMetadadosTiposFormasGestor_(linhas);
  if (existente && range.getFormulas().slice(5).some(function (r) { return !!r[existente - 1]; })) throw new Error('O tipo das formas deve ser um valor fixo, sem fórmulas. Confira a coluna técnica antes de continuar.');
  if (existente || !criar) return existente;
  const largura = linhas.reduce(function (n,r) { return Math.max(n,r.length); }, 0);
  const coluna = Math.max(10, largura + 1);
  if (coluna > 100) throw new Error('Não há coluna técnica livre para o tipo das formas. Preserve as colunas particulares e confira o cadastro.');
  sh.getRange(6, coluna).setValue(CABECALHO_TIPO_FORMA_GESTOR_);
  return coluna;
}

function tipoLegadoFormaGestor_(forma) {
  const nome = chaveFormaGestor_(forma);
  if (nome === 'pix') return 'pix';
  if (['debito', 'transferencia', 'dinheiro', 'ted', 'doc'].includes(nome)) return 'avista';
  if (['total', 'carteira', 'total carteira', 'total da carteira', 'carteira total'].includes(nome)) return 'resumo';
  // Nome ambíguo permanece cartão; a palavra "Pix" no nome não prova pagamento.
  return 'cartao';
}

function garantirTiposFormasGestor_(sh) {
  const coluna = colunaTipoFormaGestor_(sh, true);
  if (sh.getLastRow() < 7) return coluna;
  const quantidade = sh.getLastRow() - 6;
  const nomes = sh.getRange(7, 2, quantidade, 1).getValues();
  const tipos = sh.getRange(7, coluna, quantidade, 1).getValues();
  let mudou = false;
  nomes.forEach(function (r,i) {
    if (String(r[0] || '').trim() && !tipos[i][0]) { tipos[i][0] = tipoLegadoFormaGestor_(r[0]); mudou = true; }
  });
  if (mudou) sh.getRange(7, coluna, quantidade, 1).setValues(tipos);
  return coluna;
}

function tipoFormaGestor_(forma, ss) {
  const planilha=ss || obterPlanilhaGestor_(), ctx=CONTEXTO_GESTOR_;
  if(ctx && ctx.tiposFormas) return ctx.tiposFormas.get(chaveFormaGestor_(forma)) || tipoLegadoFormaGestor_(forma);
  const sh=planilha.getSheetByName('Formas de Pagamento'), mapa=new Map(), nomes=new Map();
  if(sh && sh.getLastRow()>=7) {
    const coluna=colunaTipoFormaGestor_(sh,false), linhas=sh.getDataRange().getValues();
    for(let i=6;i<linhas.length;i++) if(linhas[i][1]) {
      const chave=chaveFormaGestor_(linhas[i][1]);
      mapa.set(chave,coluna && linhas[i][coluna-1] || tipoLegadoFormaGestor_(linhas[i][1]));
      nomes.set(chave,limparApostrofo(linhas[i][1]));
    }
  }
  if(ctx) { ctx.tiposFormas=mapa; ctx.nomesFormas=nomes; }
  return mapa.get(chaveFormaGestor_(forma)) || tipoLegadoFormaGestor_(forma);
}

function nomeFormaLeituraGestor_(forma, ss) {
  const ctx=CONTEXTO_GESTOR_;
  if(ctx) {
    tipoFormaGestor_(forma,ss);
    return ctx.nomesFormas.get(chaveFormaGestor_(forma)) || limparApostrofo(forma);
  }
  const sh=(ss || obterPlanilhaGestor_()).getSheetByName('Formas de Pagamento'), linha=encontrarLinhaForma(sh,forma);
  return linha>0 ? limparApostrofo(sh.getRange(linha,2).getValue()) : limparApostrofo(forma);
}

function ehPixGestor_(forma, ss) { return tipoFormaGestor_(forma, ss) === 'pix'; }
function ehPagamentoImediatoGestor_(forma) { return ['pix','avista'].includes(tipoFormaGestor_(forma)); }
function permiteParcelamentoFormaGestor_(forma, pixParcelado) { const tipo=tipoFormaGestor_(forma); return tipo==='cartao' || (tipo==='pix' && pixParcelado===true); }

function formaReferidaNoHistoricoGestor_(nome) {
  const alvo = chaveFormaGestor_(nome);
  return lerEventosAtividadeGestor_().some(function (evento) {
    return evento.reversivel && (evento.alteracoes || []).some(function (a) {
      return [a.antes,a.depois].some(function (r) { return r && chaveFormaGestor_(r[a.aba === 'Empréstimos' ? 3 : 2]) === alvo; });
    });
  });
}

function motivoDependenciaDesfazerGestor_(registro, aba) {
  const ss = obterPlanilhaGestor_(), sh = ss.getSheetByName('Formas de Pagamento');
  const forma = limparApostrofo(registro[aba === 'Empréstimos' ? 3 : 2]);
  if (!sh || encontrarLinhaForma(sh, forma) < 0) return 'A forma de pagamento "' + forma + '" não está mais cadastrada. Recupere o cadastro correto em Gestão antes de desfazer; limite e vencimento não serão inventados.';
  if (aba === 'Lançamentos') {
    const dash = ss.getSheetByName('Dashboard & Resumo'), categoria = chaveCategoria(registro[3]);
    const cadastradas = dash ? dash.getRange('B17:B41').getValues().map(function (r) { return chaveCategoria(r[0]); }) : [];
    if (!cadastradas.includes(categoria)) return 'A categoria deste registro não está mais cadastrada. Recupere ou confira a categoria em Gestão antes de desfazer.';
  }
  return '';
}

function celulaCriticaConfiguracaoBackupGestor_(aba, linha, coluna) {
  if (aba.nome === 'Dashboard & Resumo') return linha >= 16 && linha <= 40 && (coluna === 1 || coluna === 3);
  if (aba.nome !== 'Formas de Pagamento') return false;
  const tecnica = (aba.valores[5] || []).indexOf(CABECALHO_TIPO_FORMA_GESTOR_);
  return linha >= 6 && ((coluna >= 1 && coluna <= 6) || coluna === tecnica) || linha === 5 && coluna === tecnica;
}

function validarIdentidadesEstadoRestauradoGestor_(abas) {
  const ss = obterPlanilhaGestor_(), restauradas = new Map(abas.map(function (a) { return [a.nome,a.valores]; })), ids = new Map();
  ['Lançamentos', 'Empréstimos'].forEach(function (nome) {
    const sh = ss.getSheetByName(nome);
    const linhas = restauradas.has(nome) ? restauradas.get(nome) : (sh && sh.getLastRow() ? sh.getDataRange().getValues() : []);
    linhas.slice(1).forEach(function (r,i) {
      if (!r[11]) return;
      const id = String(limparApostrofo(r[11]));
      if (ids.has(id)) throw new Error('A restauração repetiria uma identificação financeira entre ' + ids.get(id) + ' e ' + nome + ' (linha ' + (i+2) + '). Confira as abas preservadas e o backup; nenhum identificador será recriado para ocultar a duplicação.');
      ids.set(id, nome + ' (linha ' + (i+2) + ')');
    });
  });
}

function normalizarTagsGestor_(texto) {
  return Array.from(new Set(String(texto || '').split(',').map(function(t) { return t.trim().toLowerCase().replace(/^#+/,''); }).filter(Boolean))).map(function(t) { return '#'+t; }).join(', ');
}

// INICIO MOTOR RACHADINHA GERADO
// Fonte única do cálculo, incorporada no navegador e no Apps Script pelo build.
function calcularDivisaoContaGestor(dados) {
  const d=dados || {}, pessoas=d.pessoas || [], itens=d.itens || [];
  const inteiro=(v,rotulo)=>{if(!Number.isSafeInteger(v)||v<0||v>100000000000) throw new Error(rotulo+' inválido.');return v;};
  if(!Array.isArray(pessoas)||!pessoas.length||pessoas.length>100||!Array.isArray(itens)||!itens.length||itens.length>500) throw new Error('Informe de 1 a 100 pessoas e de 1 a 500 itens.');
  const ids=new Set(), nomes=new Set();
  const partes=pessoas.map(p=>{
    const id=String(p.id || ''), nome=String(p.nome || '').trim(), peso=Number(p.peso==null?1:p.peso);
    const chave=nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(!id||id.length>160||!nome||nome.length>80||ids.has(id)||nomes.has(chave)||!Number.isFinite(peso)||peso<0.01||peso>100) throw new Error('Confira nomes distintos e cotas entre 0,01 e 100.');
    ids.add(id);nomes.add(chave);
    return {id:id,nome:nome,peso:peso,pagoCentavos:inteiro(p.pagoCentavos==null?0:p.pagoCentavos,'Pagamento'),baseCentavos:0,itens:[]};
  });
  function repartir(total,pesos) {
    const soma=pesos.reduce((s,p)=>s+p,0);
    if(!soma) {if(total) throw new Error('Não há pessoas para dividir o valor.');return pesos.map(()=>0);}
    const cotas=pesos.map((peso,i)=>{const c=total*peso/soma;return {i:i,valor:Math.floor(c),resto:c-Math.floor(c)};});
    let sobra=total-cotas.reduce((s,c)=>s+c.valor,0);
    cotas.slice().sort((a,b)=>b.resto-a.resto||a.i-b.i).forEach(c=>{if(sobra>0){cotas[c.i].valor++;sobra--;}});
    if(sobra) throw new Error('Não foi possível distribuir os centavos.');
    return cotas.map(c=>c.valor);
  }
  const idsItens=new Set();let base=0;
  itens.forEach(it=>{
    const valor=inteiro(it.valorCentavos,'Valor do item'), id=String(it.id || '');
    if(!id||idsItens.has(id)||!valor||!Array.isArray(it.consumidores)||!it.consumidores.length||new Set(it.consumidores).size!==it.consumidores.length||it.consumidores.some(c=>!ids.has(c))) throw new Error('Confira o valor e os consumidores de cada item.');
    idsItens.add(id);base+=valor;inteiro(base,'Total da conta');
    const consumidores=partes.filter(p=>it.consumidores.includes(p.id));
    const valores=repartir(valor,consumidores.map(p=>p.peso));
    consumidores.forEach((p,i)=>{p.baseCentavos+=valores[i];p.itens.push(String(it.descricao || 'Item'));});
  });
  const desconto=inteiro(d.descontoCentavos==null?0:d.descontoCentavos,'Desconto'), acrescimo=inteiro(d.acrescimoCentavos==null?0:d.acrescimoCentavos,'Acréscimo'), percentual=Number(d.servicoPercentual==null?0:d.servicoPercentual);
  if(desconto>base||!Number.isFinite(percentual)||percentual<0||percentual>100) throw new Error('Confira o desconto e a taxa de serviço (0 a 100%).');
  const descontos=repartir(desconto,partes.map(p=>p.baseCentavos));
  const bases=partes.map((p,i)=>p.baseCentavos-descontos[i]);
  const taxa=Math.round((base-desconto)*percentual/100);
  const rateioAcrescimos=d.rateioAcrescimos||'consumo';
  if(!['consumo','igual'].includes(rateioAcrescimos))throw new Error('Escolha como dividir os acréscimos: pelo consumo ou igualmente por pessoa.');
  const taxas=repartir(taxa,bases), extras=repartir(acrescimo,partes.map(p=>rateioAcrescimos==='igual'?1:p.baseCentavos));
  partes.forEach((p,i)=>{p.descontoCentavos=descontos[i];p.taxaCentavos=taxas[i];p.acrescimoCentavos=extras[i];p.finalCentavos=bases[i]+taxas[i]+extras[i];p.saldoCentavos=p.finalCentavos-p.pagoCentavos;});
  const total=inteiro(base-desconto+taxa+acrescimo,'Total final'), pago=partes.reduce((s,p)=>s+p.pagoCentavos,0);
  if(pago>total) throw new Error('Os pagamentos ao estabelecimento ultrapassam o total da conta.');
  const devedores=partes.filter(p=>p.saldoCentavos>0).map(p=>({id:p.id,valor:p.saldoCentavos}));
  const credores=partes.filter(p=>p.saldoCentavos<0).map(p=>({id:p.id,valor:-p.saldoCentavos}));
  const transferencias=[];
  credores.forEach(c=>{devedores.forEach(p=>{const valor=Math.min(c.valor,p.valor);if(valor>0){transferencias.push({de:p.id,para:c.id,valorCentavos:valor});c.valor-=valor;p.valor-=valor;}});});
  return {pessoas:partes,rateioAcrescimos:rateioAcrescimos,baseCentavos:base,descontoCentavos:desconto,taxaCentavos:taxa,acrescimoCentavos:acrescimo,totalCentavos:total,pagoCentavos:pago,pendenteEstabelecimentoCentavos:total-pago,transferencias:transferencias};
}
// FIM MOTOR RACHADINHA GERADO

function previaRachadinhaWeb(param) {
  const p=param || {}, divisao=calcularDivisaoContaGestor(p.conta);
  const eu=divisao.pessoas.find(x=>x.id===p.euId);
  if(!eu) throw new Error('Selecione quem é você na divisão.');
  if(divisao.pendenteEstabelecimentoCentavos) throw new Error('Informe quem pagou a conta ao estabelecimento antes de registrar os adiantamentos.');
  if(eu.pagoCentavos<eu.finalCentavos) throw new Error('Sua parte foi coberta por outra pessoa. Esta opção registra somente valores que você adiantou.');
  const forma=validarFormaAtualGestor_(p.formaPagto,{novaCompra:true});
  validarDataCalendarioWeb_(p.dataCompra,'Data do pagamento');validarMesFaturaWeb_(p.mesPrimeiraFatura);
  const parcelas=permiteParcelamentoFormaGestor_(forma,p.pixParcelado)?Number(p.numParcelas || 1):1;
  if(!Number.isInteger(parcelas)||parcelas<1||parcelas>600) throw new Error('Confira a quantidade de parcelas.');
  const incluirMinhaParte=p.incluirMinhaParte===true;
  if(incluirMinhaParte) validarCategoriaAtualGestor_(p.categoria);
  const recebidos=Array.isArray(p.recebidos)?p.recebidos:[];
  if(new Set(recebidos).size!==recebidos.length || recebidos.some(id=>!divisao.pessoas.some(x=>x.id===id))) throw new Error('Confira as pessoas que já devolveram o dinheiro.');
  const emprestimos=divisao.transferencias.filter(t=>t.para===eu.id).map(t=>({pessoa:divisao.pessoas.find(x=>x.id===t.de).nome,pessoaId:t.de,valorCentavos:t.valorCentavos,recebido:recebidos.includes(t.de)}));
  const minhaParte=incluirMinhaParte?eu.finalCentavos:0;
  if(!minhaParte&&!emprestimos.length) throw new Error('Não há valores para registrar nesta divisão.');
  if((minhaParte>0&&minhaParte<parcelas)||emprestimos.some(e=>e.valorCentavos<parcelas)) throw new Error('Cada parcela precisa ter pelo menos um centavo. Reduza as parcelas.');
  const total=minhaParte+emprestimos.reduce((s,e)=>s+e.valorCentavos,0);
  const base={conta:p.conta,euId:p.euId,formaPagto:forma,dataCompra:p.dataCompra,mesPrimeiraFatura:p.mesPrimeiraFatura,numParcelas:parcelas,pixParcelado:p.pixParcelado===true,categoria:incluirMinhaParte?p.categoria:'',incluirMinhaParte:incluirMinhaParte,recebidos:recebidos,descricao:String(p.descricao || 'Divisão de conta').trim()};
  if(!base.descricao||base.descricao.length>300) throw new Error('Confira a descrição da conta.');
  const ss=obterPlanilhaGestor_();
  const assinatura=hashGestor_({dados:base,formas:versaoConfiguracaoGestor_(ss,'formas'),categorias:incluirMinhaParte?versaoConfiguracaoGestor_(ss,'categorias'):''});
  return {assinatura:assinatura,minhaParteCentavos:minhaParte,emprestimos:emprestimos,totalCentavos:total,dados:base};
}
function registrarRachadinhaWeb(param) {
  return executarOperacaoGestor_('registrarRachadinhaWeb',param,function(){
    const previa=previaRachadinhaWeb(param);
    if(!param.assinatura||previa.assinatura!==param.assinatura) throw new Error('Confira novamente a prévia: a divisão ou os cadastros mudaram.');
    const d=previa.dados,base={dataCompra:d.dataCompra,formaPagto:d.formaPagto,mesPrimeiraFatura:d.mesPrimeiraFatura,numParcelas:d.numParcelas,parcelaInicial:1,pixParcelado:d.pixParcelado,descricao:d.descricao};
    if(previa.minhaParteCentavos) sincronizarLoteWebInterno_([Object.assign({},base,{categoria:d.categoria,valorTotal:previa.minhaParteCentavos/100,tags:'#dividido',isAssinatura:false})]);
    previa.emprestimos.forEach(e=>salvarEmprestimoWebInterno_(Object.assign({},base,{pessoa:e.pessoa,valorTotal:e.valorCentavos/100,recebidoInicial:e.recebido,observacoes:'Divisão de conta; recebimento independente da fatura.'})));
    return {sucesso:true,minhaParteCentavos:previa.minhaParteCentavos,emprestimos:previa.emprestimos.length,totalCentavos:previa.totalCentavos};
  },false);
}

// INICIO PROTECAO GERADA
// Fonte da proteção de longo prazo. Incorporada em Backend/Code.gs pelo build.
// Nenhuma cópia é removida automaticamente. Jobs só substituem um estado que
// ainda coincide integralmente com o estado conferido antes ou depois.
const CONFIG_PROTECAO_GESTOR_='GESTOR_PROTECAO_V1';
const ABA_ARQUIVOS_ANUAIS_GESTOR_='_Gestor_ArquivosAnuais';
const ABA_MANUTENCAO_PROTECAO_GESTOR_='_Gestor_Manutencao';
const CAB_ARQUIVOS_ANUAIS_GESTOR_=['Ano','Arquivo ID','SHA256','Resumo JSON','Gerado em','Lote'];
const CAB_MANUTENCAO_PROTECAO_GESTOR_=['Operação','Estado','Arquivo do plano','SHA256','Data','Detalhe'];
const NOME_PASTA_BACKUPS_GESTOR_='Backups do Gestor de Gastos';
function realProtecaoGestor_(){return CONTEXTO_GESTOR_?CONTEXTO_GESTOR_.ssReal:obterPlanilhaGestor_();}
function configProtecaoGestor_(){
  const texto=propriedade_(CONFIG_PROTECAO_GESTOR_);if(!texto)return {versao:1,ativo:false};
  let c;try{c=JSON.parse(texto);}catch(_){throw Error('A configuração de backups está inválida. Preserve a propriedade para conferência.');}
  if(c.versao!==1)throw Error('Configuração de backups incompatível.');return c;
}
function salvarConfigProtecaoGestor_(c){PropertiesService.getScriptProperties().setProperty(CONFIG_PROTECAO_GESTOR_,JSON.stringify(c));}
function comLockProtecaoGestor_(fn){
  if(CONTEXTO_GESTOR_)throw Error('A manutenção precisa de uma execução separada das gravações financeiras.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const ss=obterPlanilhaGestor_();retomarManutencaoProtecaoGestor_(ss);return fn(ss);}finally{lock.releaseLock();}
}
function normalizarMatrizProtecaoGestor_(linhas,colunas){return linhas.map(function(r){return Array.from({length:colunas},function(_,i){return r[i]==null?'':r[i];});});}
function abaTecnicaProtecaoGestor_(ss,nome,cab,criar){
  let sh=ss.getSheetByName(nome);
  if(!sh&&criar){sh=ss.insertSheet(nome);gravarMatrizProtecaoGestor_(sh,[cab]);if(sh.hideSheet)sh.hideSheet();}
  if(sh&&hashGestor_(sh.getRange(1,1,1,cab.length).getValues()[0])!==hashGestor_(cab))throw Error('Estrutura incompatível em '+nome+'. Preserve a aba para conferência.');return sh;
}
function gravarMatrizProtecaoGestor_(sh,linhas,formulas){
  const colunas=Math.max(1,...linhas.map(function(r){return r.length;})),n=Math.max(1,linhas.length),anterior=sh.getLastRow();
  if(sh.getMaxRows&&n>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),n-sh.getMaxRows());
  if(sh.getMaxColumns&&colunas>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),colunas-sh.getMaxColumns());
  // Uma gravação única inclui a cauda vazia: a recuperação não aceita um
  // prefixo parcialmente escrito nem sobrescreve divergências externas.
  const dados=normalizarMatrizProtecaoGestor_(linhas,colunas);
  while(dados.length<anterior)dados.push(Array(colunas).fill(''));
  if(dados.length)sh.getRange(1,1,dados.length,colunas).setValues(dados.map(function(r,i){return r.map(function(v,j){
    const formula=formulas?.[i]?.[j];
    if(formula){if(typeof formula!=='string'||formula[0]!=='='||formula!==v)throw Error('Fórmula original incompatível com o plano de manutenção.');return formula;}
    return typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v;
  });}));
  SpreadsheetApp.flush();
}
function pastaProtecaoGestor_(pastaId,criar){
  const c=configProtecaoGestor_();let id=String(pastaId||c.pastaId||'').trim();
  if(id.includes('/folders/'))id=id.split('/folders/')[1].split(/[?#/]/)[0];
  let pasta;
  if(id){if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw Error('Informe o endereço da pasta de backups.');pasta=DriveApp.getFolderById(id);}
  else {
    const encontrados=DriveApp.getFoldersByName(NOME_PASTA_BACKUPS_GESTOR_);
    if(encontrados.hasNext()){pasta=encontrados.next();if(encontrados.hasNext())throw Error('Há mais de uma pasta de backups com esse nome. Informe o endereço da pasta desejada.');}
    else if(criar)pasta=DriveApp.createFolder(NOME_PASTA_BACKUPS_GESTOR_);
    else throw Error('Configure a pasta de backups no Apps Script.');
  }
  if(!pasta||pasta.isTrashed&&pasta.isTrashed())throw Error('A pasta de backups não está disponível.');
  if(pasta.getSharingAccess&&pasta.getSharingAccess()!==DriveApp.Access.PRIVATE)throw Error('Use uma pasta de backups privada, sem compartilhamento por link.');
  if(pasta.getEditors&&pasta.getEditors().length||pasta.getViewers&&pasta.getViewers().length)throw Error('A pasta de backups deve ser particular, sem outros editores ou leitores.');
  if(pasta.getOwner&&Session.getEffectiveUser){const dono=pasta.getOwner()?.getEmail(),conta=Session.getEffectiveUser()?.getEmail();if(dono&&conta&&dono!==conta)throw Error('Use uma pasta da própria conta que executa o Apps Script.');}
  return pasta;
}
function salvarJsonProtecaoGestor_(pasta,nome,dados){
  const texto=JSON.stringify(serializarGestor_(dados)),hash=hashTextoBackupGestor_(texto);
  const arquivo=pasta.createFile(nome,texto,'application/json');
  const lido=arquivo.getBlob().getDataAsString('UTF-8');
  if(hashTextoBackupGestor_(lido)!==hash)throw Error('A cópia no Drive não passou na conferência. A origem foi preservada.');
  return {id:arquivo.getId(),hash:hash,url:arquivo.getUrl(),bytes:Utilities.newBlob(texto).getBytes().length};
}
function lerJsonProtecaoGestor_(ref){
  if(!ref||!/^[A-Za-z0-9_-]{8,160}$/.test(String(ref.id||''))||!/^[a-f0-9]{64}$/.test(String(ref.hash||'')))throw Error('Referência de arquivo inválida.');
  const texto=DriveApp.getFileById(ref.id).getBlob().getDataAsString('UTF-8');
  if(hashTextoBackupGestor_(texto)!==ref.hash)throw Error('O arquivo de segurança mudou ou está incompleto. Preserve a origem para conferência.');
  return desserializarGestor_(JSON.parse(texto));
}
function destinosPlanoProtecaoGestor_(plano){
  const destinos=[];
  (plano.mudancas||[]).forEach(function(m){
    if(m.nome===ABA_ARQUIVOS_ANUAIS_GESTOR_)(m.valores||[]).slice(1).forEach(function(r){destinos.push({tipo:'anual',ano:Number(r[0]),id:String(r[1]),hash:String(r[2])});});
    if(m.nome===ABA_DIARIO_GESTOR_||m.nome===ABA_ATIVIDADE_GESTOR_)(m.valores||[]).slice(1).forEach(function(r){
      const tecnico=m.nome===ABA_DIARIO_GESTOR_&&r[2]==='ARQUIVADO'||m.nome===ABA_ATIVIDADE_GESTOR_&&r[4]==='EVENTO_ARQUIVADO';if(!tecnico)return;
      const ref=JSON.parse(String(r[m.nome===ABA_DIARIO_GESTOR_?4:5]));
      if(ref.versao!==1||ref.chave!==String(r[0])||!['operacoes','eventos'].includes(ref.tipo))throw Error('Referência técnica incompatível no plano de manutenção.');
      destinos.push({tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:ref.tipo,chave:ref.chave});
    });
  });return destinos;
}
function conferirDestinosPlanoProtecaoGestor_(plano){
  const referencias=destinosPlanoProtecaoGestor_(plano),destinos=plano.versao===1?referencias:plano.destinos,conferidos=new Map();
  if(!Array.isArray(destinos)||destinos.some(function(d){return !referencias.some(function(r){return hashGestor_(r)===hashGestor_(d);});}))throw Error('Destinos incompatíveis no plano de manutenção.');
  destinos.forEach(function(d){try{
    if(d.tipo==='anual'){
      if(!Number.isInteger(d.ano)||d.ano<2000||d.ano>2200)throw Error('Ano incompatível.');
      const chave='anual:'+d.id+':'+d.hash;if(!conferidos.has(chave))conferidos.set(chave,dadosArquivoAnualProtecaoGestor_(d,true));
    }else if(d.tipo==='tecnico'){
      const chave='tecnico:'+d.id+':'+d.hash;if(!conferidos.has(chave))conferidos.set(chave,lerJsonProtecaoGestor_(d));
      const bundle=conferidos.get(chave);if(bundle.versao!==1||bundle.planilhaId!==plano.planilhaId||!Object.prototype.hasOwnProperty.call(bundle[d.conteudo]||{},d.chave))throw Error('Conteúdo técnico incompleto.');
    }else throw Error('Tipo de destino inválido.');
  }catch(erro){const e=Error('O arquivo de destino da manutenção não pôde ser conferido. A origem não será substituída nesta etapa. Confira os backups e preserve os arquivos. Detalhe: '+String(erro.message||erro));e.codigo='DESTINO_MANUTENCAO_INVALIDO';throw e;}});
}
function formulaConstanteProtecaoGestor_(formula){
  if(!formula)return true;
  const expressao=String(formula).replace(/^=/,'').replace(/"(?:[^"]|"")*"/g,'0').replace(/\d+(?:[.,]\d+)?(?:[Ee][+-]?\d+)?/g,'0').replace(/\b(?:TRUE|FALSE)\b/gi,'0');
  return /^[\s0()+\-*/^%&<>=]+$/.test(expressao);
}
function conferirFormulasCompactacaoProtecaoGestor_(formulas,nome){
  if((formulas||[]).some(function(r){return r.some(function(f){return f&&!formulaConstanteProtecaoGestor_(f);});}))throw Error('Há fórmulas personalizadas com referências ou funções não constantes em '+nome+'. O arquivamento foi interrompido para não deslocar essas referências. Os dados continuam na principal.');
}
function registrarPlanoProtecaoGestor_(ss,pasta,mudancas,tipo,destinos){
  if(!mudancas.length)return {sucesso:true,semMudancas:true};
  const id='manutencao-'+gerarIdGestor_(),plano={versao:2,id:id,planilhaId:propriedade_(CHAVE_ID_PLANILHA_GESTOR),tipo:tipo,mudancas:mudancas};
  plano.destinos=destinos||destinosPlanoProtecaoGestor_(plano);conferirDestinosPlanoProtecaoGestor_(plano);
  const ref=salvarJsonProtecaoGestor_(pasta,'Gestor_Plano_'+id+'.json',plano);
  const sh=abaTecnicaProtecaoGestor_(ss,ABA_MANUTENCAO_PROTECAO_GESTOR_,CAB_MANUTENCAO_PROTECAO_GESTOR_,true);
  sh.getRange(sh.getLastRow()+1,1,1,6).setValues([[id,'PRONTO',ref.id,ref.hash,new Date(),'']]);SpreadsheetApp.flush();
  retomarManutencaoProtecaoGestor_(ss);return {sucesso:true,operacaoId:id,tipo:tipo};
}
function assinaturaFormulasProtecaoGestor_(formulas){
  const celulas=[];(formulas||[]).forEach(function(r,i){r.forEach(function(f,j){if(f)celulas.push([i,j,f]);});});return hashGestor_(celulas);
}
function formulasAbaProtecaoGestor_(sh){return sh&&sh.getLastRow()?sh.getDataRange().getFormulas():[];}
function mudancaProtecaoGestor_(ss,nome,depois,formulas){
  const sh=ss.getSheetByName(nome);
  return {nome:nome,antes:hashEstadoGestor_(lerEstadoAbaGestor_(sh)),depois:hashEstadoGestor_(depois),valores:depois,
    antesFormulas:assinaturaFormulasProtecaoGestor_(formulasAbaProtecaoGestor_(sh)),depoisFormulas:assinaturaFormulasProtecaoGestor_(formulas),formulas:formulas||[]};
}
function retomarManutencaoProtecaoGestor_(ss){
  const sh=abaTecnicaProtecaoGestor_(ss,ABA_MANUTENCAO_PROTECAO_GESTOR_,CAB_MANUTENCAO_PROTECAO_GESTOR_,false);if(!sh||sh.getLastRow()<2)return;
  const pendentes=localizarLinhasTecnicasGestor_(sh,2,'PRONTO');
  pendentes.forEach(function(linha){
    const r=sh.getRange(linha,1,1,6).getValues()[0],plano=lerJsonProtecaoGestor_({id:r[2],hash:r[3]});
    const permitidas=['Lançamentos','Empréstimos',ABA_ARQUIVOS_ANUAIS_GESTOR_,ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_];
    if(![1,2].includes(plano.versao)||plano.id!==r[0]||plano.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!Array.isArray(plano.mudancas)||plano.mudancas.some(function(m){return !permitidas.includes(m.nome)||!Array.isArray(m.valores)||hashEstadoGestor_(m.valores)!==m.depois;}))throw Error('Plano de manutenção incompatível. Nenhuma divergência será sobrescrita.');
    // A expressão e a natureza da célula fazem parte da conferência. Texto
    // literal "=..." nunca é promovido a fórmula por semelhança de conteúdo.
    const coincide=function(m,sh,lado){const f=formulasAbaProtecaoGestor_(sh);return hashEstadoGestor_(lerEstadoAbaGestor_(sh))===m[lado]&&(m[lado+'Formulas']?assinaturaFormulasProtecaoGestor_(f)===m[lado+'Formulas']:!f.some(function(r){return r.some(Boolean);}));};
    plano.mudancas.forEach(function(m){if(m.depoisFormulas&&assinaturaFormulasProtecaoGestor_(m.formulas)!==m.depoisFormulas)throw Error('Plano de fórmulas incompatível.');const alvo=ss.getSheetByName(m.nome);if(!coincide(m,alvo,'antes')&&!coincide(m,alvo,'depois'))throw Error('A manutenção encontrou alteração externa ou fórmula não conferida em '+m.nome+'. Preserve os dados para conferência.');});
    conferirDestinosPlanoProtecaoGestor_(plano);
    plano.mudancas.forEach(function(m){let alvo=ss.getSheetByName(m.nome);if(coincide(m,alvo,'depois'))return;conferirDestinosPlanoProtecaoGestor_(plano);if(plano.tipo==='arquivo-anual'&&['Lançamentos','Empréstimos'].includes(m.nome))conferirFormulasCompactacaoProtecaoGestor_(m.formulas,m.nome);if(!alvo)alvo=ss.insertSheet(m.nome);gravarMatrizProtecaoGestor_(alvo,m.valores,m.formulas);if(!coincide(m,alvo,'depois'))throw Error('A manutenção ainda precisa de conferência em '+m.nome+'.');});
    conferirDestinosPlanoProtecaoGestor_(plano);
    sh.getRange(linha,2).setValue('CONFIRMADO');SpreadsheetApp.flush();
  });
}
function conferirSemPendenciasProtecaoGestor_(ss){
  const d=ss.getSheetByName(ABA_DIARIO_GESTOR_);if(!d)return;
  if(['PRONTO','PREPARANDO'].some(function(e){return localizarLinhasTecnicasGestor_(d,3,e).length;}))throw Error('Resolva os envios em conferência antes da manutenção ou do backup automático.');
}
function ativarProtecaoPeloMenuGestor(){const r=configurarProtecaoAutomaticaGestor();SpreadsheetApp.getUi().alert('Proteção automática ativada',r.mensagem,SpreadsheetApp.getUi().ButtonSet.OK);}
function backupPeloMenuGestor(){const r=executarBackupProtegidoWeb({requestId:'manual-'+gerarIdGestor_()});SpreadsheetApp.getUi().alert('Backup confirmado no Drive',r.url,SpreadsheetApp.getUi().ButtonSet.OK);}
function catalogoAnualProtecaoGestor_(ss,conferirResumo=true){
  const sh=abaTecnicaProtecaoGestor_(ss||obterPlanilhaGestor_(),ABA_ARQUIVOS_ANUAIS_GESTOR_,CAB_ARQUIVOS_ANUAIS_GESTOR_,false);
  if(!sh||sh.getLastRow()<2)return [];
  const vistos=new Set();return sh.getRange(2,1,sh.getLastRow()-1,6).getValues().map(function(r){
    const ano=Number(r[0]);let resumo;try{resumo=JSON.parse(String(r[3]));}catch(_){throw Error('Resumo do arquivo anual inválido.');}
    if(!Number.isInteger(ano)||ano<2000||ano>2200||vistos.has(ano)||!/^[A-Za-z0-9_-]{8,160}$/.test(String(r[1]))||!/^[a-f0-9]{64}$/.test(String(r[2]))||resumo.versao!==1||!Array.isArray(resumo.meses))throw Error('Catálogo anual incompatível. Preserve os arquivos.');
    vistos.add(ano);const e={ano:ano,id:String(r[1]),hash:String(r[2]),resumo:resumo,data:r[4],lote:String(r[5])};return conferirResumo?conferirResumoAnualProtecaoGestor_(e):e;
  }).sort(function(a,b){return a.ano-b.ano;});
}
function conferirResumoAnualProtecaoGestor_(entrada){
  // Um comprovante por ano evita reler todos os arquivos a cada abertura.
  // Só pode ser criado a partir do conteúdo anual conferido, nunca do resumo.
  const chave='GESTOR_RESUMO_ANUAL_V1:'+entrada.ano,assinatura=function(e){return hashGestor_([e.ano,e.id,e.hash,e.resumo]);};
  if(propriedade_(chave)===assinatura(entrada))return entrada;
  const resumo=resumoArquivoAnualProtecaoGestor_(dadosArquivoAnualProtecaoGestor_(entrada)),e=Object.assign({},entrada,{resumo:resumo});
  PropertiesService.getScriptProperties().setProperty(chave,assinatura(e));return e;
}
function catalogoParaRecuperacaoProtecaoGestor_(ss){
  const sh=ss.getSheetByName(ABA_ARQUIVOS_ANUAIS_GESTOR_),original=lerEstadoAbaGestor_(sh);
  try{return {catalogo:catalogoAnualProtecaoGestor_(ss,false),original:original,danificado:false,erro:''};}catch(erro){
    const valores=sh?sh.getDataRange().getValues():[],refs=new Map();
    valores.forEach(function(r,i){
      if(!i&&hashGestor_(r.slice(0,6))===hashGestor_(CAB_ARQUIVOS_ANUAIS_GESTOR_))return;
      if(!r.some(function(v){return v!==''&&v!=null;}))return;
      if(!i&&!Number.isInteger(Number(r[0])))return; // Cabeçalho danificado, guardado integralmente.
      const ano=Number(r[0]),id=String(r[1]||''),hash=String(r[2]||'');
      if(!Number.isInteger(ano)||ano<2000||ano>2200||!/^[A-Za-z0-9_-]{8,160}$/.test(id)||!/^[a-f0-9]{64}$/.test(hash))throw Error('O catálogo contém uma referência anual sem ano, arquivo ou comprovante identificável. Preserve a aba para recuperação assistida; nenhum dado foi substituído.');
      if(refs.has(ano)&&(refs.get(ano).id!==id||refs.get(ano).hash!==hash))throw Error('Há referências conflitantes para o mesmo ano. Preserve o catálogo para recuperação assistida.');
      refs.set(ano,{ano:ano,id:id,hash:hash,resumo:null,data:r[4],lote:String(r[5]||'')});
    });
    if(!refs.size&&original.length>1)throw Error('O catálogo está danificado e seus anos não puderam ser identificados. Preserve a aba para recuperação assistida.');
    return {catalogo:Array.from(refs.values()).sort(function(a,b){return a.ano-b.ano;}),original:original,danificado:true,erro:String(erro.message||erro)};
  }
}
function dadosArquivoAnualProtecaoGestor_(entrada,reler=false){
  const ctx=CONTEXTO_GESTOR_,chave=entrada.ano+':'+entrada.id+':'+entrada.hash;if(ctx){ctx.cacheAnualProtecao=ctx.cacheAnualProtecao||new Map();if(!reler&&ctx.cacheAnualProtecao.has(chave))return ctx.cacheAnualProtecao.get(chave);}
  const ss=SpreadsheetApp.openById(entrada.id),abas=['Lançamentos','Empréstimos'].map(function(nome){
    const sh=ss.getSheetByName(nome);if(!sh)throw Error('Arquivo anual sem a aba '+nome+'.');
    const raw=sh.getDataRange().getValues();if(raw.some(function(r){return r.slice(COLUNAS_GESTOR_).some(function(v){return v!==''&&v!=null;});}))throw Error('O arquivo anual contém colunas adicionais. Preserve a personalização no Drive antes de recuperar seus dados.');
    const valores=normalizarMatrizProtecaoGestor_(raw,COLUNAS_GESTOR_);return {nome:nome,valores:valores};
  });
  const dados={ano:entrada.ano,abas:abas};
  if(hashGestor_(dados)!==entrada.hash)throw Error('O arquivo anual de '+entrada.ano+' mudou. Seus valores não foram misturados à consulta; confira a cópia no Drive.');
  if(ctx)ctx.cacheAnualProtecao.set(chave,dados);return dados;
}
function resumoArquivoAnualProtecaoGestor_(dados){
  let total=0,qtd=0;const meses=new Set(),categorias=Object.create(null),consumoMes=Object.create(null);
  dados.abas.forEach(function(aba){aba.valores.slice(1).forEach(function(r){const mes=limparApostrofo(r[8]);meses.add(mes);qtd++;if(aba.nome==='Lançamentos'&&!isStatusCancelado(r[9])){
    const valor=centavosGestor_(r[7]),cat=String(r[3]||'Outros');total+=valor;categorias[cat]=(categorias[cat]||0)+valor;
    consumoMes[mes]=consumoMes[mes]||Object.create(null);consumoMes[mes][cat]=(consumoMes[mes][cat]||0)+valor;
  }});});
  return {versao:1,meses:Array.from(meses).sort(function(a,b){return parseMesFat(a).time-parseMesFat(b).time;}),pessoalCentavos:total,quantidade:qtd,categoriasCentavos:categorias,consumoCatMesCentavos:consumoMes};
}
function criarArquivoAnualProtecaoGestor_(ss,pasta,dados,lote){
  const novo=SpreadsheetApp.create('Gestor — Arquivo '+dados.ano+' — '+lote.slice(-8));
  DriveApp.getFileById(novo.getId()).moveTo(pasta);
  ['Dashboard & Resumo','Formas de Pagamento','Anotações'].forEach(function(nome){
    const origem=ss.getSheetByName(nome);if(!origem)return;
    const valores=nome==='Anotações'?[origem.getDataRange().getValues()[0]]:origem.getDataRange().getValues();
    gravarMatrizProtecaoGestor_(novo.getSheetByName(nome)||novo.insertSheet(nome),valores);
  });
  dados.abas.forEach(function(aba){
    const sh=novo.getSheetByName(aba.nome)||novo.insertSheet(aba.nome);gravarMatrizProtecaoGestor_(sh,aba.valores);sh.setFrozenRows(1);
    const cab=sh.getRange(1,1,1,COLUNAS_GESTOR_);cab.setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    if(sh.setColumnWidths){sh.setColumnWidths(1,COLUNAS_GESTOR_,120);sh.setColumnWidth(2,220);}
  });
  const info=novo.getSheetByName('Leia-me')||novo.insertSheet('Leia-me');
  gravarMatrizProtecaoGestor_(info,[['Arquivo anual do Gestor','Somente consulta'],['Ano',dados.ano],['Preservação','IDs, parcelas e pagamentos mantidos. Alterar estes dados invalida a conferência do app.'],['Origem',propriedade_(CHAVE_ID_PLANILHA_GESTOR)],['Lote',lote]]);
  SpreadsheetApp.flush();
  const entrada={ano:dados.ano,id:novo.getId(),hash:hashGestor_(dados),resumo:resumoArquivoAnualProtecaoGestor_(dados),data:new Date(),lote:lote};
  dadosArquivoAnualProtecaoGestor_(entrada); // Não remove da origem antes do readback.
  return entrada;
}
function lerRegistrosConsultaProtecaoGestor_(nome,anos){
  const ss=obterPlanilhaGestor_(),sh=ss.getSheetByName(nome),base=lerAbaCompleta(sh,11);
  const refs=base.raw.map(function(_,i){return {linha:i+2,arquivado:false};}),ids=new Set(base.raw.map(function(r){return String(r[11]||'');}).filter(Boolean));
  catalogoAnualProtecaoGestor_(ss).filter(function(e){return !Array.isArray(anos)||anos.includes(e.ano);}).forEach(function(e){
    const aba=dadosArquivoAnualProtecaoGestor_(e).abas.find(function(a){return a.nome===nome;});
    aba.valores.slice(1).forEach(function(r){
      if(!r[11]||ids.has(String(r[11])))throw Error('Identificação repetida entre a planilha principal e o arquivo anual.');ids.add(String(r[11]));
      base.raw.push(copiarGestor_(r));base.disp.push(valoresExibidosRegistroGestor_(r,r.map(function(v){return String(v==null?'':v);})));refs.push({linha:0,arquivado:true,ano:e.ano});
    });
  });base.refs=refs;return base;
}
function planejarArquivoAnualProtecaoGestor_(ss,anoLimite){
  const recentes=idsAlteradosRecentementeProtecaoGestor_(ss);
  const registros=['Lançamentos','Empréstimos'].map(function(nome){const sh=ss.getSheetByName(nome);return {nome:nome,antes:lerEstadoAbaGestor_(sh),raw:sh?sh.getDataRange().getValues():[],formulas:sh?sh.getDataRange().getFormulas():[]};});
  const grupos=new Map(),selecionados=new Set(),ids=new Set();let elegiveis=0;
  registros.forEach(function(aba){aba.raw.slice(1).forEach(function(r,i){
    if(!r.some(function(v){return v!==''&&v!==null&&v!==undefined;}))return;
    if(!r[11]||!r[12]||!r[16])throw Error('Atualize os dados do app antes de arquivar registros sem identificação.');
    if(ids.has(String(r[11])))throw Error('Há identificações repetidas na origem. Nenhum registro será arquivado.');ids.add(String(r[11]));
    if(r[16]!==hashRegistroGestor_(r))throw Error('Um registro mudou desde a última conferência. Atualize o app antes de arquivar.');
    const chave=aba.nome+'|'+r[12];if(!grupos.has(chave))grupos.set(chave,[]);grupos.get(chave).push({aba:aba,r:r,i:i+1});
  });});
  grupos.forEach(function(itens){
    // Mantém a compra inteira se ainda há alguma obrigação ou parcela futura.
    // Séries fixas ficam na principal com seus controles de geração/cancelamento.
    const encerrada=itens.every(function(it){const r=it.r,emp=it.aba.nome==='Empréstimos',mes=r[8] instanceof Date?Utilities.formatDate(r[8],getTimezone(),'MM/yyyy'):r[8],info=parseMesFat(mes);
      return info.time&&info.a<=anoLimite&&!recentes.has(String(r[11]))&&limparApostrofo(r[6])!=='∞/∞'&&
        (emp?r[9]==='Recebido'&&centavosGestor_(valorPagoBancoGestor_(r,true))===centavosGestor_(r[7]):isStatusPago(r[9]));
    });if(encerrada){
      itens.forEach(function(it){if(it.r.slice(COLUNAS_GESTOR_).some(function(v){return v!==''&&v!=null;}))throw Error('Há conteúdo em colunas adicionais de '+it.aba.nome+', linha '+(it.i+1)+'. O arquivamento foi bloqueado antes de mover os registros. Preserve essas colunas para recuperação assistida.');});
      if(itens.some(function(it){return (it.aba.formulas[it.i]||[]).some(Boolean);}))return;
      elegiveis+=itens.length;if(selecionados.size+itens.length<=2000)itens.forEach(function(it){selecionados.add(String(it.r[11]));});
    }
  });
  const anos=new Map();registros.forEach(function(aba){aba.raw.slice(1).forEach(function(r){if(!selecionados.has(String(r[11])))return;
    const exibido=valoresExibidosRegistroGestor_(r,r.map(function(v){return v==null?'':String(v);})),n=copiarGestor_(r);[0,6,8].forEach(function(i){n[i]=exibido[i];});n[16]=hashRegistroGestor_(n);
    const ano=parseMesFat(n[8]).a;if(!anos.has(ano))anos.set(ano,{ano:ano,abas:registros.map(function(a){return {nome:a.nome,valores:normalizarMatrizProtecaoGestor_([a.raw[0]||[]],COLUNAS_GESTOR_)};})});
    anos.get(ano).abas.find(function(a){return a.nome===aba.nome;}).valores.push(normalizarMatrizProtecaoGestor_([n],COLUNAS_GESTOR_)[0]);
  });});if(selecionados.size)registros.forEach(function(a){conferirFormulasCompactacaoProtecaoGestor_(a.formulas,a.nome);});return {registros:registros,selecionados:selecionados,anos:Array.from(anos.values()),restantes:elegiveis-selecionados.size};
}
function idsAlteradosRecentementeProtecaoGestor_(ss){
  const sh=ss.getSheetByName(ABA_ATIVIDADE_GESTOR_),ids=new Set();if(!sh||sh.getLastRow()<2)return ids;
  const corte=new Date(getHojeSeguro());corte.setDate(corte.getDate()-90);
  const linhas=sh.getRange(2,1,sh.getLastRow()-1,5).getValues(),posicoes=[];
  linhas.forEach(function(r,i){const data=r[1] instanceof Date?r[1]:new Date(r[1]);if(r[4]==='EVENTO'&&Number.isFinite(data.getTime())&&data>=corte)posicoes.push(i+2);});
  if(posicoes.length)lerEventosAtividadeGestor_(posicoes,indiceEventosAtividadeGestor_()).forEach(function(e){if(e.reversivel)(e.alteracoes||[]).forEach(function(a){ids.add(String(a.id));});});return ids;
}
function arquivarAnosProtecaoGestor_(ss,pasta){
  const plano=planejarArquivoAnualProtecaoGestor_(ss,getHojeSeguro().getFullYear()-1);if(!plano.selecionados.size)return {sucesso:true,quantidade:0};
  // Expressões constantes podem ser preservadas exatamente. Referências a
  // células exigiriam rebasing também nas outras abas: não adivinhar endereços
  // ao compactar linhas de uma planilha personalizada manualmente.
  plano.registros.forEach(function(a){conferirFormulasCompactacaoProtecaoGestor_(a.formulas,a.nome);});
  const catalogo=catalogoAnualProtecaoGestor_(ss),lote='anual-'+gerarIdGestor_(),destinos=[];
  plano.anos.forEach(function(dados){
    const anterior=catalogo.find(function(e){return e.ano===dados.ano;});
    if(anterior){const antigos=dadosArquivoAnualProtecaoGestor_(anterior);dados.abas.forEach(function(a){a.valores=antigos.abas.find(function(x){return x.nome===a.nome;}).valores.concat(a.valores.slice(1));});}
    const entrada=criarArquivoAnualProtecaoGestor_(ss,pasta,dados,lote);destinos.push({tipo:'anual',ano:entrada.ano,id:entrada.id,hash:entrada.hash});const i=catalogo.findIndex(function(e){return e.ano===dados.ano;});if(i<0)catalogo.push(entrada);else catalogo[i]=entrada;
  });
  const tabela=[CAB_ARQUIVOS_ANUAIS_GESTOR_].concat(catalogo.sort(function(a,b){return a.ano-b.ano;}).map(function(e){return [e.ano,e.id,e.hash,JSON.stringify(e.resumo),e.data,e.lote];}));
  const mudancas=[mudancaProtecaoGestor_(ss,ABA_ARQUIVOS_ANUAIS_GESTOR_,tabela)];
  plano.registros.forEach(function(a){const manter=function(r,i){return i===0||!plano.selecionados.has(String(a.antes[i][11]));};mudancas.push(mudancaProtecaoGestor_(ss,a.nome,a.antes.filter(manter),a.formulas.filter(manter)));});
  registrarPlanoProtecaoGestor_(ss,pasta,mudancas,'arquivo-anual',destinos);return {sucesso:true,quantidade:plano.selecionados.size,anos:plano.anos.map(function(a){return a.ano;}),temMais:plano.restantes>0};
}
function compactarHistoricoProtecaoGestor_(ss,pasta){
  const corte=new Date(getHojeSeguro());corte.setDate(corte.getDate()-180);
  const bundle={versao:1,planilhaId:propriedade_(CHAVE_ID_PLANILHA_GESTOR),operacoes:Object.create(null),eventos:Object.create(null)},selecionadas=new Set(),eventos=new Set();
  const diario=ss.getSheetByName(ABA_DIARIO_GESTOR_),atividade=ss.getSheetByName(ABA_ATIVIDADE_GESTOR_);
  const linhas=diario?diario.getDataRange().getValues():[],atv=atividade?atividade.getDataRange().getValues():[];
  let bytes=0;
  for(let i=1;i<linhas.length;){
    const r=linhas[i];if(r[2]==='PARTE')throw Error('Parte sem cabeçalho no diário. Preserve os dados antes da manutenção.');
    validarCabecalhoOperacaoGestor_(r);const qtd=Number(r[3]),proximo=i+1+qtd;
    if(proximo>linhas.length)throw Error('Diário incompleto.');
    if(r[2]==='CONFIRMADO'&&r[5] instanceof Date&&r[5]<corte&&selecionadas.size<100){
      const entrada=lerOperacaoTecnicaGestor_(diario,i+1),item={cabecalho:entrada.cabecalho,plano:entrada.plano},tam=Utilities.newBlob(JSON.stringify(serializarGestor_(item))).getBytes().length;
      if(bytes+tam<6*1024*1024){bundle.operacoes[r[0]]=item;selecionadas.add(String(r[0]));bytes+=tam;}
    }i=proximo;
  }
  if(atividade){
    const indice=indiceEventosAtividadeGestor_();
    indice.linhas.forEach(function(l){const r=atv[l-1],data=r[1] instanceof Date?r[1]:new Date(r[1]);if(r[4]!=='EVENTO'||!Number.isFinite(data.getTime())||data>=corte||eventos.size>=100)return;
      const evento=lerEventosAtividadeGestor_([l],indice)[0];if(!evento)throw Error('Evento incompleto.');
      const tam=Utilities.newBlob(JSON.stringify(serializarGestor_(evento))).getBytes().length;
      if(bytes+tam<6*1024*1024){bundle.eventos[r[0]]=evento;eventos.add(String(r[0]));bytes+=tam;}
    });
  }
  if(!selecionadas.size&&!eventos.size)return {sucesso:true,operacoes:0,eventos:0};
  const ref=salvarJsonProtecaoGestor_(pasta,'Gestor_HistoricoTecnico_'+gerarIdGestor_()+'.json',bundle),mudancas=[];
  function referencia(tipo,id){return JSON.stringify({versao:1,id:ref.id,hash:ref.hash,tipo:tipo,chave:String(id)});}
  if(selecionadas.size){
    const depois=[linhas[0]];for(let i=1;i<linhas.length;){const r=linhas[i],qtd=Number(r[3]);
      if(selecionadas.has(String(r[0])))depois.push([r[0],r[1],'ARQUIVADO',0,referencia('operacoes',r[0]),r[5]]);
      else Array.prototype.push.apply(depois,linhas.slice(i,i+1+qtd));i+=1+qtd;
    }mudancas.push(mudancaProtecaoGestor_(ss,ABA_DIARIO_GESTOR_,depois));
  }
  if(eventos.size){
    const depois=[atv[0]];for(let i=1;i<atv.length;){const r=atv[i];
      if(r[4]==='EVENTO'&&eventos.has(String(r[0]))){depois.push([r[0],r[1],r[2],r[3],'EVENTO_ARQUIVADO',referencia('eventos',r[0])]);i+=1+Number(r[5]);}
      else {depois.push(r);i++;}
    }mudancas.push(mudancaProtecaoGestor_(ss,ABA_ATIVIDADE_GESTOR_,depois));
  }
  const destinos=Array.from(selecionadas).map(function(id){return {tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:'operacoes',chave:id};}).concat(Array.from(eventos).map(function(id){return {tipo:'tecnico',id:ref.id,hash:ref.hash,conteudo:'eventos',chave:id};}));
  registrarPlanoProtecaoGestor_(ss,pasta,mudancas,'historico-tecnico',destinos);return {sucesso:true,operacoes:selecionadas.size,eventos:eventos.size,temMais:selecionadas.size===100||eventos.size===100};
}
function lerReferenciaTecnicaProtecaoGestor_(texto,tipo,chave){
  let ref;try{ref=JSON.parse(String(texto));}catch(_){throw Error('Comprovante técnico arquivado inválido.');}
  if(ref.versao!==1||ref.tipo!==tipo||ref.chave!==String(chave))throw Error('Identificação do arquivo técnico não confere.');
  const ctx=CONTEXTO_GESTOR_;let bundle;
  const chaveCache=ref.id+':'+ref.hash;
  if(ctx){ctx.cacheTecnicoProtecao=ctx.cacheTecnicoProtecao||new Map();bundle=ctx.cacheTecnicoProtecao.get(chaveCache);}
  if(!bundle){bundle=lerJsonProtecaoGestor_(ref);if(ctx)ctx.cacheTecnicoProtecao.set(chaveCache,bundle);}
  if(bundle.versao!==1||bundle.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR)||!Object.prototype.hasOwnProperty.call(bundle[tipo]||{},ref.chave))throw Error('Arquivo técnico não corresponde a esta planilha.');
  return bundle[tipo][ref.chave];
}
function backupComArquivosProtecaoGestor_(backup,ss,recuperacao){
  const catalogo=recuperacao?recuperacao.catalogo:catalogoAnualProtecaoGestor_(ss);if(!catalogo.length&&!recuperacao?.catalogoDanificado)return backup;
  const arquivos=recuperacao?recuperacao.legiveis:catalogo.map(function(e){return dadosArquivoAnualProtecaoGestor_(e);});
  const resultado=Object.assign({},backup,{formato:'gestor-financeiro-backup-v2',arquivosAnuais:arquivos});
  if(recuperacao?.necessaria)resultado.recuperacaoOrigem={aviso:'Cópia anterior de uma recuperação: preserve também o JSON completo utilizado. Conteúdos não conferidos permanecem separados.',catalogo:copiarGestor_(catalogo),catalogoOriginal:serializarGestor_(recuperacao.catalogoOriginal),erroCatalogo:recuperacao.erroCatalogo,indisponiveis:copiarGestor_(recuperacao.indisponiveis),arquivosNaoConferidos:serializarGestor_(recuperacao.naoConferidos||[])};
  resultado.hashFinanceiro=assinaturaFinanceiraBackupProtecaoGestor_(resultado);
  resultado.observacao+=' Inclui o conteúdo completo dos arquivos anuais, independente dos endereços do Drive.';return resultado;
}
function assinaturaFinanceiraBackupProtecaoGestor_(backup){
  return hashGestor_({abas:backup.abas.filter(function(a){return a.nome!=='_Gestor_Atividade';}).map(function(a){return {nome:a.nome,valores:a.valores,formulas:a.formulas||[]};}),arquivosAnuais:backup.arquivosAnuais});
}
const ABA_BACKUPS_PROTECAO_GESTOR_='_Gestor_Backups';
const CAB_BACKUPS_PROTECAO_GESTOR_=['Identificação','Período','Estado','Arquivo ou nome','SHA256','Metadados JSON'];
function backupMensalProtecaoGestor_(ss,pasta,manualId){
  conferirSemPendenciasProtecaoGestor_(ss);
  const periodo=Utilities.formatDate(getHojeSeguro(),getTimezone(),'yyyy-MM'),dados=montarBackupDadosGestor_(ss,{restauravel:true}),origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR),prefixo=hashGestor_(origem).slice(0,12);dados.origemId=origem;
  const hashDados=hashGestor_({origem:origem,abas:dados.abas,arquivosAnuais:dados.arquivosAnuais||[]}),id=manualId||('mensal-'+prefixo+'-'+periodo+'-'+hashDados.slice(0,20));
  if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(id))throw Error('Identificação do backup inválida.');
  const tabela=abaTecnicaProtecaoGestor_(ss,ABA_BACKUPS_PROTECAO_GESTOR_,CAB_BACKUPS_PROTECAO_GESTOR_,true),achados=localizarLinhasTecnicasGestor_(tabela,1,id);
  if(achados.length>1)throw Error('Identificação de backup repetida. Preserve a aba para conferência.');
  const linha=achados[0]||tabela.getLastRow()+1,anterior=achados.length?tabela.getRange(linha,1,1,6).getValues()[0]:null;
  if(anterior&&anterior[2]==='CONFIRMADO'){const arquivo=DriveApp.getFileById(anterior[3]);lerJsonProtecaoGestor_({id:arquivo.getId(),hash:anterior[4]});const c=configProtecaoGestor_(),meta=JSON.parse(anterior[5]);c.ultimoBackup={periodo:anterior[1],data:meta.geradoEm,arquivoId:arquivo.getId(),hash:anterior[4]};salvarConfigProtecaoGestor_(c);return {sucesso:true,id:id,url:arquivo.getUrl(),arquivoId:arquivo.getId(),periodo:anterior[1],repetido:true};}
  const meta=anterior?JSON.parse(anterior[5]):{geradoEm:dados.geradoEm,hashDados:hashDados};
  if(meta.hashDados!==hashDados)throw Error('Os dados mudaram desde a preparação deste backup. Inicie uma nova cópia; a anterior foi preservada.');
  dados.geradoEm=meta.geradoEm;dados.identificacaoBackup=id;
  const texto=JSON.stringify(serializarGestor_(dados)),hash=hashTextoBackupGestor_(texto),nome='Gestor_Backup_'+periodo+'_'+prefixo+'_'+id+'.json';
  if(anterior&&(anterior[2]!=='PREPARANDO'||anterior[4]!==hash))throw Error('Preparação de backup incompatível.');
  if(!anterior){tabela.getRange(linha,1,1,6).setValues([[id,periodo,'PREPARANDO',nome,hash,JSON.stringify(meta)]]);SpreadsheetApp.flush();}
  const encontrados=pasta.getFilesByName(nome);let arquivo;
  if(encontrados.hasNext()){arquivo=encontrados.next();if(encontrados.hasNext())throw Error('Há cópias repetidas com o mesmo nome. Confira a pasta.');}
  else arquivo=pasta.createFile(nome,texto,'application/json');
  if(hashTextoBackupGestor_(arquivo.getBlob().getDataAsString('UTF-8'))!==hash)throw Error('A cópia mensal não passou na conferência.');
  tabela.getRange(linha,1,1,6).setValues([[id,periodo,'CONFIRMADO',arquivo.getId(),hash,JSON.stringify(meta)]]);SpreadsheetApp.flush();
  const c=configProtecaoGestor_();c.ultimoBackup={periodo:periodo,data:meta.geradoEm,arquivoId:arquivo.getId(),hash:hash};salvarConfigProtecaoGestor_(c);
  return {sucesso:true,id:id,url:arquivo.getUrl(),arquivoId:arquivo.getId(),periodo:periodo};
}
function configurarProtecaoAutomaticaGestor(pastaUrl){
  return comLockProtecaoGestor_(function(ss){
    const pasta=pastaProtecaoGestor_(typeof pastaUrl==='string'?pastaUrl:'',true),gatilhos=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor';});
    if(!gatilhos.length)ScriptApp.newTrigger('rotinaProtecaoProgramadaGestor').timeBased().atHour(3).everyDays(1).inTimezone(getTimezone()).create();
    // Não apaga gatilhos de outras contas ou de outras funções.
    const c=configProtecaoGestor_(),origem=propriedade_(CHAVE_ID_PLANILHA_GESTOR);
    if(c.planilhaId&&c.planilhaId!==origem)['ultimoBackup','ultimaManutencao','ultimoMesArquivo','ultimoMesManutencao'].forEach(function(k){delete c[k];});
    Object.assign(c,{versao:1,ativo:true,pastaId:pasta.getId(),backupMensal:true,arquivoAnual:true,manutencao:true,planilhaId:origem});salvarConfigProtecaoGestor_(c);
    return {sucesso:true,pastaUrl:pasta.getUrl(),mensagem:'Rotina diária instalada: confirma o backup de cada mês e verifica o arquivamento anual. Faça o primeiro backup antes da manutenção.'};
  });
}
function obterStatusProtecaoWeb(){
  const c=configProtecaoGestor_(),ss=realProtecaoGestor_();
  const instalada=c.ativo===true&&c.planilhaId===propriedade_(CHAVE_ID_PLANILHA_GESTOR)&&ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='rotinaProtecaoProgramadaGestor';});
  return {ativo:c.ativo===true,rotinaInstalada:instalada,pastaId:c.pastaId||'',pastaUrl:c.pastaId?'https://drive.google.com/drive/folders/'+c.pastaId:'',ultimoBackup:c.ultimoBackup||null,ultimaManutencao:c.ultimaManutencao||null,ultimoErro:c.ultimoErro||'',arquivos:catalogoAnualProtecaoGestor_(ss).map(function(e){return {ano:e.ano,id:e.id,quantidade:e.resumo.quantidade,pessoal:formatBRL(e.resumo.pessoalCentavos/100),url:'https://docs.google.com/spreadsheets/d/'+e.id+'/edit'};})};
}
function executarBackupProtegidoWeb(param){return comLockProtecaoGestor_(function(ss){const c=configProtecaoGestor_();if(!c.ativo)throw Error('Ative a proteção no Apps Script antes de gerar cópias no Drive.');return backupMensalProtecaoGestor_(ss,pastaProtecaoGestor_(),param&&param.requestId);});}
function previaManutencaoProtegidaWeb(){return comLockProtecaoGestor_(function(ss){conferirSemPendenciasProtecaoGestor_(ss);const plano=planejarArquivoAnualProtecaoGestor_(ss,getHojeSeguro().getFullYear()-1);return {assinatura:hashGestor_(['Lançamentos','Empréstimos',ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_,ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return [n,lerEstadoAbaGestor_(ss.getSheetByName(n))];})),quantidade:plano.selecionados.size,anos:plano.anos.map(function(a){return a.ano;}),regra:'Somente compras integralmente encerradas de anos anteriores. Fixos, pendências e compras com parcelas futuras permanecem na principal. Histórico técnico confirmado há mais de 180 dias pode ser compactado; nenhum comprovante de identificação é apagado.'};});}
function executarManutencaoProtegidaWeb(param){return comLockProtecaoGestor_(function(ss){
  const c=configProtecaoGestor_();if(!c.ativo)throw Error('Ative a proteção no Apps Script antes da manutenção.');conferirSemPendenciasProtecaoGestor_(ss);
  const assinatura=hashGestor_(['Lançamentos','Empréstimos',ABA_DIARIO_GESTOR_,ABA_ATIVIDADE_GESTOR_,ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return [n,lerEstadoAbaGestor_(ss.getSheetByName(n))];}));
  if(!param||param.confirmacao!=='ARQUIVAR'||param.assinatura!==assinatura)throw Error('Confira uma nova prévia da manutenção.');
  const pasta=pastaProtecaoGestor_();backupMensalProtecaoGestor_(ss,pasta,'antes-manutencao-'+assinatura.slice(0,32));
  const anual=arquivarAnosProtecaoGestor_(ss,pasta),tecnico=compactarHistoricoProtecaoGestor_(ss,pasta);const atual=configProtecaoGestor_();atual.ultimaManutencao={data:new Date().toISOString(),anual:anual,tecnico:tecnico};atual.ultimoErro='';salvarConfigProtecaoGestor_(atual);return atual.ultimaManutencao;
});}
function rotinaProtecaoProgramadaGestor(){
  try{return comLockProtecaoGestor_(function(ss){
    const c=configProtecaoGestor_();if(!c.ativo)return {ativo:false};
    if(c.planilhaId!==propriedade_(CHAVE_ID_PLANILHA_GESTOR))throw Error('A planilha configurada mudou. Ative a rotina novamente para confirmar o destino.');
    conferirSemPendenciasProtecaoGestor_(ss);const pasta=pastaProtecaoGestor_(),hoje=getHojeSeguro(),periodo=Utilities.formatDate(hoje,getTimezone(),'yyyy-MM');
    if(c.backupMensal&&c.ultimoBackup?.periodo!==periodo)backupMensalProtecaoGestor_(ss,pasta);
    if(c.arquivoAnual&&c.ultimoMesArquivo!==periodo){
      if(planejarArquivoAnualProtecaoGestor_(ss,hoje.getFullYear()-1).selecionados.size)backupMensalProtecaoGestor_(ss,pasta,'antes-anual-'+periodo+'-'+hashGestor_(['Lançamentos','Empréstimos',ABA_ARQUIVOS_ANUAIS_GESTOR_].map(function(n){return lerEstadoAbaGestor_(ss.getSheetByName(n));})).slice(0,20));
      const anual=arquivarAnosProtecaoGestor_(ss,pasta);
      if(!anual.temMais)c.ultimoMesArquivo=periodo;c.ultimaManutencao={data:new Date().toISOString(),anual:anual};
    }
    if(c.manutencao&&c.ultimoMesManutencao!==periodo){
      const tecnico=compactarHistoricoProtecaoGestor_(ss,pasta);if(!tecnico.temMais)c.ultimoMesManutencao=periodo;c.ultimaManutencao=Object.assign({},c.ultimaManutencao||{},{data:new Date().toISOString(),tecnico:tecnico});
    }
    const atual=configProtecaoGestor_();Object.assign(atual,c,{ultimoBackup:atual.ultimoBackup||c.ultimoBackup,ultimoErro:''});salvarConfigProtecaoGestor_(atual);return {sucesso:true};
  });}catch(e){const c=configProtecaoGestor_();c.ultimoErro=String(e.message||e).slice(0,300);salvarConfigProtecaoGestor_(c);throw e;}
}
function obterEmprestimosArquivadosWeb(param){
  const ano=param&&param.ano?Number(param.ano):null;
  if(ano!==null&&(!Number.isInteger(ano)||ano<2000||ano>2200))throw Error('Ano inválido.');
  const lido=lerRegistrosConsultaProtecaoGestor_('Empréstimos',ano===null?undefined:[ano]);
  return {itens:lido.raw.map(function(r,i){
    if(!lido.refs[i].arquivado)return null;const d=lido.disp[i],valor=extractNum(r[7]);
    return {arquivado:true,anoArquivo:lido.refs[i].ano,linha:0,registroId:r[11],compraId:r[12],versao:Number(r[13]),estadoBanco:r[14],data:d[0],pessoa:d[1],descricao:d[2],forma:d[3],parcela:limparApostrofo(d[6]),valorRaw:valor,valorTotalRaw:extractNum(r[4]),valorFmt:formatBRL(valor),mesFatura:limparApostrofo(d[8]),status:d[9],observacoes:d[10],dataCombinada:dataCombinadaEmprestimoGestor_(r),timeFat:parseMesFat(d[8]).time};
  }).filter(Boolean)};
}
function validarParticoesBackupProtecaoGestor_(backup){
  if(!Array.isArray(backup.arquivosAnuais)||backup.arquivosAnuais.length>100||backup.hashFinanceiro!==assinaturaFinanceiraBackupProtecaoGestor_(backup))throw Error('Os arquivos anuais do backup estão incompletos ou foram alterados.');
  if(Utilities.newBlob(JSON.stringify(backup)).getBytes().length>LIMITE_BACKUP_RESTAURACAO_GESTOR_)throw Error('Este backup excede 8 MB. Preserve-o para recuperação assistida em lotes; nenhum conteúdo foi ignorado.');
  const base=Object.assign({},backup,{formato:'gestor-financeiro-backup-v1'});delete base.arquivosAnuais;delete base.hashFinanceiro;
  const abas=validarBackupRestauracaoGestor_(base),ids=new Set(),anos=new Set();let celulas=abas.reduce(function(s,a){return s+a.valores.length*a.valores[0].length;},0);
  abas.filter(function(a){return ehAbaRegistrosGestor_(a.nome);}).forEach(function(a){a.valores.slice(1).forEach(function(r){if(r[11])ids.add(String(r[11]));});});
  abas.arquivosAnuais=backup.arquivosAnuais.map(function(dados){
    if(!Number.isInteger(dados.ano)||dados.ano<2000||dados.ano>=getHojeSeguro().getFullYear()||anos.has(dados.ano)||!Array.isArray(dados.abas)||dados.abas.length!==2||!['Lançamentos','Empréstimos'].every(function(n){return dados.abas.some(function(a){return a.nome===n;});}))throw Error('Partição anual incompatível.');anos.add(dados.ano);
    const copia=Object.assign({},base,{abas:base.abas.filter(function(a){return !ehAbaRegistrosGestor_(a.nome);}).concat(dados.abas)}),conferidas=validarBackupRestauracaoGestor_(copia).filter(function(a){return ehAbaRegistrosGestor_(a.nome);});
    conferidas.forEach(function(a){celulas+=a.valores.length*a.valores[0].length;a.valores.slice(1).forEach(function(r){
      if(!r[11]||ids.has(String(r[11]))||parseMesFat(r[8]).a!==dados.ano||limparApostrofo(r[6])==='∞/∞'||(a.nome==='Lançamentos'?!isStatusPago(r[9]):r[9]!=='Recebido'||centavosGestor_(valorPagoBancoGestor_(r,true))!==centavosGestor_(r[7])))throw Error('Registro anual duplicado, pendente ou incompatível.');ids.add(String(r[11]));
    });});
    return {ano:dados.ano,abas:conferidas.map(function(a){return {nome:a.nome,valores:normalizarMatrizProtecaoGestor_(a.valores,COLUNAS_GESTOR_)};})};
  });
  if(celulas>500000)throw Error('O backup completo ultrapassa 500 mil células. Preserve o arquivo para recuperação assistida.');return abas;
}
function planejarAnuaisRestauracaoProtecaoGestor_(abas,backup,ss){
  const leitura=catalogoParaRecuperacaoProtecaoGestor_(ss),catalogo=leitura.catalogo,legiveis=[],indisponiveis=[],naoConferidos=[],recebidos=abas.arquivosAnuais||[];
  catalogo.forEach(function(e){try{legiveis.push(dadosArquivoAnualProtecaoGestor_(e));}catch(erro){
    indisponiveis.push({ano:e.ano,id:e.id,motivo:String(erro.message||erro).slice(0,500)});
    // Se o conteúdo ainda abre, preserva uma imagem sem confiar nela como
    // histórico financeiro. Nunca importa silenciosamente dados divergentes.
    try{const origem=SpreadsheetApp.openById(e.id),abasOriginais=['Lançamentos','Empréstimos'].map(function(nome){const sh=origem.getSheetByName(nome);if(!sh)return {nome:nome,ausente:true};const r=sh.getDataRange();return {nome:nome,valores:r.getValues(),formulas:r.getFormulas()};});naoConferidos.push({ano:e.ano,id:e.id,abas:abasOriginais});}catch(_){}
  }});
  const nomes=['Lançamentos','Empréstimos'],substituidas=new Set(abas.map(function(a){return a.nome;})),preservadas=nomes.filter(function(n){return !substituidas.has(n);});
  const necessaria=leitura.danificado||indisponiveis.length>0,exigidos=leitura.danificado?catalogo:indisponiveis;
  if(necessaria&&(backup.formato!=='gestor-financeiro-backup-v2'||preservadas.length||exigidos.some(function(e){return !recebidos.some(function(d){return d.ano===e.ano;});})))throw Error('Há arquivo ou catálogo anual indisponível. Para recuperar, selecione um JSON completo v2 que contenha Lançamentos, Empréstimos e os anos '+Array.from(new Set(exigidos.map(function(e){return e.ano;}))).join(', ')+'. Nada foi substituído.');
  const anos=new Set(recebidos.map(function(d){return d.ano;}));if(preservadas.length)legiveis.forEach(function(d){anos.add(d.ano);});
  const arquivos=Array.from(anos).sort(function(a,b){return a-b;}).map(function(ano){
    const novo=recebidos.find(function(d){return d.ano===ano;}),antigo=legiveis.find(function(d){return d.ano===ano;});
    return {ano:ano,abas:nomes.map(function(nome){
      const fonte=(!substituidas.has(nome)?antigo:novo)?.abas.find(function(a){return a.nome===nome;});
      const cab=fonte?.valores[0]||antigo?.abas.find(function(a){return a.nome===nome;})?.valores[0]||ss.getSheetByName(nome)?.getDataRange().getValues()[0]||Array(COLUNAS_GESTOR_).fill('');
      return {nome:nome,valores:copiarGestor_(fonte?fonte.valores:normalizarMatrizProtecaoGestor_([cab],COLUNAS_GESTOR_))};
    })};
  }).filter(function(d){return d.abas.some(function(a){return a.valores.length>1;});});
  const ids=new Set();let celulas=0;
  nomes.forEach(function(nome){const dados=abas.find(function(a){return a.nome===nome;}),sh=ss.getSheetByName(nome),linhas=dados?dados.valores:sh?.getDataRange().getValues()||[];celulas+=linhas.reduce(function(s,r){return s+r.length;},0);linhas.slice(1).forEach(function(r){if(r[11]){if(ids.has(String(r[11])))throw Error('Identificação repetida nos dados preservados da restauração.');ids.add(String(r[11]));}});});
  arquivos.forEach(function(d){d.abas.forEach(function(a){celulas+=a.valores.length*COLUNAS_GESTOR_;a.valores.slice(1).forEach(function(r){if(!r[11]||ids.has(String(r[11])))throw Error('Identificação repetida entre dados ativos e anuais preservados.');ids.add(String(r[11]));});});});
  if(celulas>500000)throw Error('Os dados restaurados e preservados excedem 500 mil células. Use recuperação assistida.');
  abas.arquivosAnuais=arquivos;
  abas.catalogoAnualAtual=catalogo;
  return {catalogo:catalogo,catalogoDanificado:leitura.danificado,catalogoOriginal:leitura.original,erroCatalogo:leitura.erro,necessaria:necessaria,legiveis:legiveis,indisponiveis:indisponiveis,naoConferidos:naoConferidos,preservadas:preservadas,assinatura:hashGestor_({catalogoOriginal:leitura.original,catalogo:catalogo,legiveis:legiveis.map(function(d){return [d.ano,hashGestor_(d)];}),indisponiveis:indisponiveis,naoConferidos:naoConferidos})};
}
function prepararArquivosRestauracaoProtecaoGestor_(abas,ss){
  const arquivos=abas.arquivosAnuais||[],atual=abas.catalogoAnualAtual||catalogoAnualProtecaoGestor_(ss);
  if(!arquivos.length&&!atual.length)return;
  const pasta=arquivos.length?pastaProtecaoGestor_():null,lote='restauracao-'+String(CONTEXTO_GESTOR_.param.requestId),entradas=arquivos.map(function(d){return criarArquivoAnualProtecaoGestor_(ss,pasta,d,lote);});
  const sh=ss.getSheetByName(ABA_ARQUIVOS_ANUAIS_GESTOR_)||ss.insertSheet(ABA_ARQUIVOS_ANUAIS_GESTOR_);
  sh.valores=[CAB_ARQUIVOS_ANUAIS_GESTOR_].concat(entradas.map(function(e){return [e.ano,e.id,e.hash,JSON.stringify(e.resumo),e.data,e.lote];}));sh.colunas=6;sh.alterados=Object.create(null);sh.valores.forEach(function(r,i){r.forEach(function(_,j){sh.alterados[i+':'+j]=true;});});
}
// FIM PROTECAO GERADA
