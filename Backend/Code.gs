// ============================================================================
// GESTOR FINANCEIRO - BACKEND COMPLETO (APPS SCRIPT)
// ============================================================================
// UTILITÁRIOS GLOBAIS UNIFICADOS (Fuso Horário, Moeda, Datas e Português BR)
// ============================================================================

// O ID fica nas propriedades de cada projeto Apps Script. Assim, o projeto de
// teste pode apontar para a planilha de teste e o projeto de produção para a real.
const CHAVE_ID_PLANILHA_GESTOR = 'GESTOR_PLANILHA_ID';

function obterPlanilhaGestor_() {
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

  const isPix = String(dados.formaPagto).toLowerCase().includes('pix');
  const isAssinatura = Boolean(dados.isAssinatura);
  const parcelas = (isPix || isAssinatura) ? 1 : Number(dados.numParcelas || 1);
  const parcelaInicial = (parcelas <= 1) ? 1 : Number(dados.parcelaInicial || 1);
  if (!Number.isInteger(parcelas) || parcelas < 1) throw new Error(contexto + 'o número de parcelas deve ser um inteiro positivo.');
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
  return String(statusStr || '').trim().toLowerCase() === 'assinatura cancelada';
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
    if (DICIONARIO_ACENTOS_PT[semAcento]) {
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
    .addItem('🔄 Atualizar Faturas Pagas', 'atualizarStatusAutomatico')
    .addToUi();
  atualizarStatusAutomatico();
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

function atualizarStatusAutomatico() {
  const lock = LockService.getScriptLock();
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
  } finally {
    lock.releaseLock();
  }
}

function processarAssinaturasAutomaticas(lancSheet) {
  if (!lancSheet || lancSheet.getLastRow() < 2) return;
  const ultimaLinha = lancSheet.getLastRow();
  const data = lancSheet.getRange(2, 1, ultimaLinha - 1, 11).getValues();
  const displayData = lancSheet.getRange(2, 1, ultimaLinha - 1, 11).getDisplayValues();

  const assinaturas = {};

  data.forEach((r, idx) => {
    const descStr = String(displayData[idx][1] || '').trim();
    if (!descStr) return;

    const parcela = String(displayData[idx][6] || '').trim();
    const status = String(displayData[idx][9] || '').trim();

    if (parcela === '∞/∞' && status !== 'Assinatura Cancelada' && status !== 'Pago (Cancelada)') {
      const forma = String(displayData[idx][2] || '').trim();
      const chave = `${normalizarTexto(descStr)}_${normalizarTexto(forma)}`;
      const dtCompraStr = String(displayData[idx][0] || '').trim();
      const mesFat = String(displayData[idx][8] || '').trim();
      const infoFat = parseMesFat(mesFat);

      if (infoFat.time > 0) {
        if (!assinaturas[chave] || infoFat.time > assinaturas[chave].timeReferencia) {
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
      const dtOrig = parseDataBR(ass.dtCompraOriginal);
      const diaOrig = dtOrig ? dtOrig.getDate() : 1;
      const mesCompraBase = dtOrig ? (dtOrig.getMonth() + 1) : ass.infoFat.m;
      const anoCompraBase = dtOrig ? dtOrig.getFullYear() : ass.infoFat.a;

      for (let i = 1; i <= mesesParaLancar; i++) {
        const baseCompra = new Date(anoCompraBase, (mesCompraBase - 1) + i, 1);
        const ultimoDiaMesCompra = new Date(baseCompra.getFullYear(), baseCompra.getMonth() + 1, 0).getDate();
        const diaSeguro = Math.min(diaOrig, ultimoDiaMesCompra);
        const nDataStr = "'" + String(diaSeguro).padStart(2, '0') + '/' + String(baseCompra.getMonth() + 1).padStart(2, '0') + '/' + baseCompra.getFullYear();

        const baseFat = new Date(ass.infoFat.a, (ass.infoFat.m - 1) + i, 1);
        const nFatStr = "'" + String(baseFat.getMonth() + 1).padStart(2, '0') + '/' + baseFat.getFullYear();

        const valParcela = extractNum(ass.linhaBase[7]);
        novasLinhas.push([
          nDataStr,
          ass.dispBase[1],
          ass.dispBase[2],
          ass.dispBase[3],
          '',
          '',
          '∞/∞',
          valParcela,
          nFatStr,
          'Assinatura Ativa',
          ass.dispBase[10] || ''
        ]);
      }
    }
  });

  if (novasLinhas.length > 0) {
    const prox = Math.max(2, lancSheet.getLastRow() + 1);
    lancSheet.getRange(prox, 1, novasLinhas.length, 11).setValues(novasLinhas);
    lancSheet.getRange(prox, 5, novasLinhas.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    lancSheet.getRange(prox, 8, novasLinhas.length, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

function organizarEAtualizarPlanilha(lancSheet, pagtoSheet) {
  if (!lancSheet) return;
  const ultimaLinha = lancSheet.getLastRow();
  if (ultimaLinha < 2) return;

  const diasVencimento = {};
  if (pagtoSheet && pagtoSheet.getLastRow() >= 7) {
    const uLP = pagtoSheet.getLastRow();
    const dadosPagto = pagtoSheet.getRange(7, 2, uLP - 6, 5).getValues();
    dadosPagto.forEach(linha => {
      const nome = String(linha[0] || '').trim().toLowerCase();
      const dia = parseInt(linha[4], 10);
      if (nome && !isNaN(dia)) diasVencimento[nome] = dia;
    });
  }

  const numRows = ultimaLinha - 1;
  const range = lancSheet.getRange(2, 1, numRows, 11);
  const rawVals = range.getValues();
  const dispVals = range.getDisplayValues();

  const hoje = getHojeSeguro();
  const timeHoje = hoje.getTime();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth() + 1;

  let alterouStatus = false;
  let linhas = [];

  for (let i = 0; i < numRows; i++) {
    const d = dispVals[i];
    const r = rawVals[i];
    const desc = String(d[1] || '').trim();
    const vazia = !desc;

    if (!vazia) {
      const formaLower = String(d[2] || '').trim().toLowerCase();
      const parcela = String(d[6] || '').trim();
      const mesFat = String(d[8] || '').trim();
      let statusAtual = String(d[9] || '').trim();

      const isAssinatura = (parcela === '∞/∞');
      const isPix = formaLower.includes('pix');
      const dtCompra = parseDataBR(d[0]);
      const infoFat = parseMesFat(mesFat);

      if (statusAtual !== 'Assinatura Cancelada' && statusAtual !== 'Pago (Cancelada)') {
        let jaVenceuOuPagou = false;

        if (isPix) {
          if (!dtCompra || timeHoje >= dtCompra.getTime()) {
            jaVenceuOuPagou = true;
          }
        } else if (infoFat.m > 0 && infoFat.a > 0) {
          const diaOrig = diasVencimento[formaLower];
          if (diaOrig) {
            let dataVenc = new Date(infoFat.a, infoFat.m - 1, diaOrig, 0, 0, 0, 0);
            if (dataVenc.getDay() === 0) dataVenc.setDate(dataVenc.getDate() + 1);
            if (dataVenc.getDay() === 6) dataVenc.setDate(dataVenc.getDate() + 2);
            if (timeHoje > dataVenc.getTime()) {
              jaVenceuOuPagou = true;
            }
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
      if (item.vazia) return ['', '', '', '', '', '', '', '', '', '', ''];
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
      ];
    });

    range.setValues(novosValores);
    lancSheet.getRange(2, 5, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    lancSheet.getRange(2, 8, Math.max(1, numRows), 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

// CORRIGIDO: agora reordena 6 colunas (B..G) para a coluna "Arquivado" acompanhar o cartão
function organizarFormasPagamento(pagtoSheet) {
  const ultimaLinha = pagtoSheet.getLastRow();
  if (ultimaLinha < 7) return;

  const numRows = ultimaLinha - 6;
  const staticRange = pagtoSheet.getRange(7, 2, numRows, 6);
  const staticData = staticRange.getValues();

  staticData.sort((a, b) => {
    const nomeA = String(a[0]).toLowerCase().trim();
    const nomeB = String(b[0]).toLowerCase().trim();
    if (!nomeA && !nomeB) return 0;
    if (!nomeA) return 1;
    if (!nomeB) return -1;
    const isTotalA = nomeA.includes('total') || nomeA.includes('carteira');
    const isTotalB = nomeB.includes('total') || nomeB.includes('carteira');
    const isPixA = nomeA.includes('pix');
    const isPixB = nomeB.includes('pix');
    if (isTotalA && !isTotalB) return 1;
    if (!isTotalA && isTotalB) return -1;
    if (isPixA && !isPixB) return 1;
    if (!isPixA && isPixB) return -1;
    return 0;
  });
  staticRange.setValues(staticData);
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
  const range = empSheet.getRange(2, 1, numRows, 11);
  const rawVals = range.getValues();
  const dispVals = range.getDisplayValues();

  let linhas = [];
  for (let i = 0; i < numRows; i++) {
    const d = dispVals[i];
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
      if (item.vazia) return ['', '', '', '', '', '', '', '', '', '', ''];
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
      ];
    });
    range.setValues(novosValores);
    empSheet.getRange(2, 5, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
    empSheet.getRange(2, 8, numRows, 1).setNumberFormat('R$#,##0.00;$(R$#,##0.00);"-"');
  }
}

// Dividir Parcela de Empréstimo (Amigo pagou só a metade)
function dividirParcelaEmprestimoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) return { sucesso: false };

    const dispAll = empSheet.getRange(2, 1, uL - 1, 11).getDisplayValues();
    const rawAll = empSheet.getRange(2, 1, uL - 1, 11).getValues();

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Parcela não localizada.');

    const valorOriginalParc = extractNum(rawAll[idxAlvo][7]);
    const valorRecebido = extractNum(dados.valorRecebido);
    const valorRestante = valorOriginalParc - valorRecebido;

    if (valorRecebido <= 0 || valorRestante <= 0) {
      throw new Error("O valor recebido deve ser menor que o total da parcela e maior que zero.");
    }

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
    ];

    const prox = empSheet.getLastRow() + 1;
    empSheet.getRange(prox, 1, 1, 11).setValues([novaLinhaPago]);
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

function alternarStatusEmprestimoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) return { sucesso: false };

    const dispAll = empSheet.getRange(2, 1, uL - 1, 11).getDisplayValues();

    if (dados.quitarMesPessoa) {
      const pessoaAlvo = normalizarTexto(dados.pessoa);
      const mesAlvo = String(dados.mesFatura || '').replace(/^'/, '').trim();
      let qtdQuitada = 0;
      for (let i = 0; i < dispAll.length; i++) {
        const d = dispAll[i];
        const pNorm = normalizarTexto(d[1]);
        const mLinha = String(d[8] || '').replace(/^'/, '').trim();
        const stAtual = String(d[9] || '').trim();
        if (pNorm === pessoaAlvo && (!mesAlvo || mLinha === mesAlvo) && stAtual !== 'Recebido') {
          empSheet.getRange(i + 2, 10).setValue('Recebido');
          qtdQuitada++;
        }
      }
      return { sucesso: true, qtd: qtdQuitada };
    }

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0) throw new Error('Parcela de empréstimo não localizada.');

    const stAtual = String(dispAll[idxAlvo][9] || '').trim();
    const novoStatus = (stAtual === 'Recebido') ? 'A Receber' : 'Recebido';
    empSheet.getRange(idxAlvo + 2, 10).setValue(novoStatus);

    return { sucesso: true, novoStatus: novoStatus };
  } catch (e) {
    throw new Error('Erro ao atualizar empréstimo: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function excluirEmprestimoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);
    const uL = empSheet.getLastRow();
    if (uL < 2) return { sucesso: false };

    const dispAll = empSheet.getRange(2, 1, uL - 1, 11).getDisplayValues();
    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idxAlvo < 0) throw new Error('Registro não encontrado.');

    const linhaInt = idxAlvo + 2;
    if (!dados.excluirTodasParcelas) {
      empSheet.deleteRow(linhaInt);
    } else {
      const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
      const origPessoa = normalizarTexto(dispAll[idxAlvo][1]);
      const origDesc = normalizarTexto(dispAll[idxAlvo][2]);
      const origForma = normalizarTexto(dispAll[idxAlvo][3]);
      let linhasApagar = [linhaInt];

      for (let i = 0; i < dispAll.length; i++) {
        const numL = i + 2;
        if (numL === linhaInt) continue;
        const d = dispAll[i];
        if (
          String(d[0] || '').replace(/^'/, '').trim() === origData &&
          normalizarTexto(d[1]) === origPessoa &&
          normalizarTexto(d[2]) === origDesc &&
          normalizarTexto(d[3]) === origForma &&
          String(d[9] || '').trim() !== 'Recebido'
        ) {
          linhasApagar.push(numL);
        }
      }
      linhasApagar.sort((a, b) => b - a).forEach(l => empSheet.deleteRow(l));
    }
    organizarAbaEmprestimos(empSheet);
    return { sucesso: true };
  } catch (e) {
    throw new Error('Erro ao excluir empréstimo: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function editarEmprestimoLinhaWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const empSheet = garantirAbaEmprestimos(ss);

    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error("Aba de empréstimos vazia.");
    const rangeAll = empSheet.getRange(2, 1, uL - 1, 11);
    const rawAll = rangeAll.getValues();
    const dispAll = rangeAll.getDisplayValues();

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= rawAll.length) throw new Error("Parcela do empréstimo não encontrada.");

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origPessoa = String(dispAll[idxAlvo][1] || '').trim();
    const origDesc = String(dispAll[idxAlvo][2] || '').trim();
    const origForma = String(dispAll[idxAlvo][3] || '').trim();
    const origMesFat = String(dispAll[idxAlvo][8] || '').replace(/^'/, '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();

    const pessoaFmt = formatarTituloInteligente(dados.pessoa);
    const descFmt = formatarTituloInteligente(dados.descricao);
    const valorFloat = extractNum(dados.valorParcela);
    const novaDataFmt = "'" + String(dados.dataCompra || '').replace(/^'/, '').trim();
    const novoMesFatLimpo = String(dados.mesFatura || '').replace(/^'/, '').trim();
    const novoMesFatFmt = "'" + novoMesFatLimpo;

    const infoParcAlvo = parseNumParcela(parcStr);
    const totalParcelas = infoParcAlvo.total;
    const propagarValor = Boolean(dados.propagarValorParcelas);
    const mudouMesFat = (novoMesFatLimpo !== origMesFat);
    const infoNovoMes = parseMesFat(novoMesFatLimpo);

    rawAll[idxAlvo][0] = novaDataFmt;
    rawAll[idxAlvo][1] = pessoaFmt;
    rawAll[idxAlvo][2] = descFmt;
    rawAll[idxAlvo][3] = dados.formaPagto;
    rawAll[idxAlvo][6] = "'" + parcStr;
    rawAll[idxAlvo][7] = valorFloat;
    rawAll[idxAlvo][8] = novoMesFatFmt;
    rawAll[idxAlvo][9] = dados.status;
    rawAll[idxAlvo][10] = dados.observacoes || '';

    if (totalParcelas > 1) {
      const sufixoParc = '/' + totalParcelas;
      let indicesMesmaCompraEmp = [idxAlvo];

      for (let i = 0; i < rawAll.length; i++) {
        if (i === idxAlvo) continue;
        const d = dispAll[i];
        const pAtual = String(d[6] || '').replace(/^'/, '').trim();
        const stAtual = String(d[9] || '').trim();

        if (
          pAtual.endsWith(sufixoParc) &&
          String(d[0] || '').replace(/^'/, '').trim() === origData &&
          String(d[1] || '').trim() === origPessoa &&
          String(d[2] || '').trim() === origDesc &&
          String(d[3] || '').trim() === origForma
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

      const somaRealTotal = indicesMesmaCompraEmp.reduce((acc, idxLinha) => acc + extractNum(rawAll[idxLinha][7]), 0);
      indicesMesmaCompraEmp.forEach(idxLinha => {
        rawAll[idxLinha][4] = somaRealTotal;
      });
    } else {
      rawAll[idxAlvo][4] = valorFloat;
    }

    for (let i = 0; i < rawAll.length; i++) {
      if (i === idxAlvo) continue;
      const d = dispAll[i];
      if (!String(d[1] || '').trim()) continue;
      if (!String(rawAll[i][0]).startsWith("'")) rawAll[i][0] = "'" + String(d[0] || '').replace(/^'/, '').trim();
      const p = String(d[6] || '').replace(/^'/, '').trim();
      if (p && p !== '∞/∞' && !String(rawAll[i][6]).startsWith("'")) rawAll[i][6] = "'" + p;
      if (!String(rawAll[i][8]).startsWith("'")) rawAll[i][8] = "'" + String(d[8] || '').replace(/^'/, '').trim();
    }

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
function moverParaEmprestimosWeb(dados) {
  const lock = LockService.getScriptLock();
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
    const rawAll = lancSheet.getRange(2, 1, uL - 1, 11).getValues();
    const dispAll = lancSheet.getRange(2, 1, uL - 1, 11).getDisplayValues();

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Lançamento original não encontrado.');

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origDesc = String(dispAll[idxAlvo][1] || '').trim();
    const origForma = String(dispAll[idxAlvo][2] || '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();
    const infoParc = parseNumParcela(parcStr);
    const sufixo = '/' + infoParc.total;

    let indicesParaMover = [idxAlvo];
    if (infoParc.total > 1 && parcStr !== '∞/∞') {
      for (let i = 0; i < dispAll.length; i++) {
        if (i === idxAlvo) continue;
        const d = dispAll[i];
        const pAtual = String(d[6] || '').replace(/^'/, '').trim();
        if (
          pAtual.endsWith(sufixo) &&
          String(d[0] || '').replace(/^'/, '').trim() === origData &&
          String(d[1] || '').trim() === origDesc &&
          String(d[2] || '').trim() === origForma
        ) {
          indicesParaMover.push(i);
        }
      }
    }

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
        jaPago ? 'Recebido' : 'A Receber',
        d[10] || ''
      ];
    });

    const proxEmp = Math.max(2, empSheet.getLastRow() + 1);
    empSheet.getRange(proxEmp, 1, novasLinhasEmp.length, 11).setValues(novasLinhasEmp);
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
function moverParaGastosPessoaisWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(12000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const empSheet = garantirAbaEmprestimos(ss);

    const catFmt = dados.categoria || 'Outros';
    const tagsFmt = dados.tags || '';

    const uL = empSheet.getLastRow();
    if (uL < 2) throw new Error('Planilha de empréstimos vazia.');
    const rawAll = empSheet.getRange(2, 1, uL - 1, 11).getValues();
    const dispAll = empSheet.getRange(2, 1, uL - 1, 11).getDisplayValues();

    const idxAlvo = localizarIndiceSeguro(dispAll, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idxAlvo < 0 || idxAlvo >= dispAll.length) throw new Error('Empréstimo original não encontrado.');

    const origData = String(dispAll[idxAlvo][0] || '').replace(/^'/, '').trim();
    const origPessoa = String(dispAll[idxAlvo][1] || '').trim();
    const origDesc = String(dispAll[idxAlvo][2] || '').trim();
    const origForma = String(dispAll[idxAlvo][3] || '').trim();
    const parcStr = String(dispAll[idxAlvo][6] || '').replace(/^'/, '').trim();
    const infoParc = parseNumParcela(parcStr);
    const sufixo = '/' + infoParc.total;

    let indicesParaMover = [idxAlvo];
    if (infoParc.total > 1 && parcStr !== '∞/∞') {
      for (let i = 0; i < dispAll.length; i++) {
        if (i === idxAlvo) continue;
        const d = dispAll[i];
        const pAtual = String(d[6] || '').replace(/^'/, '').trim();
        if (
          pAtual.endsWith(sufixo) &&
          String(d[0] || '').replace(/^'/, '').trim() === origData &&
          String(d[1] || '').trim() === origPessoa &&
          String(d[2] || '').trim() === origDesc &&
          String(d[3] || '').trim() === origForma
        ) {
          indicesParaMover.push(i);
        }
      }
    }

    indicesParaMover.sort((a, b) => a - b);
    const novasLinhasLanc = indicesParaMover.map(idx => {
      const r = rawAll[idx], d = dispAll[idx];
      const dtClean = String(d[0] || '').replace(/^'/, '').trim();
      const pClean = String(d[6] || '').replace(/^'/, '').trim() || '1/1';
      const fatClean = String(d[8] || '').replace(/^'/, '').trim();
      const valParc = extractNum(r[7]);
      const valTot = extractNum(r[4]) || (valParc * infoParc.total);
      const isPix = normalizarTexto(d[3]).includes('pix');
      const jaPago = isStatusPago(d[9]);

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
        (jaPago || isPix) ? 'Pago' : 'Em Aberto',
        tagsFmt
      ];
    });

    const proxLanc = Math.max(2, lancSheet.getLastRow() + 1);
    lancSheet.getRange(proxLanc, 1, novasLinhasLanc.length, 11).setValues(novasLinhasLanc);
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
      tags: ''
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

function sincronizarLoteWeb(loteOffline) {
  const lock = LockService.getScriptLock();
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
      const descFormatada = formatarTituloInteligente(dados.descricao);
      const valorTotal = extractNum(dados.valorTotal);
      const isPix = String(dados.formaPagto || '').toLowerCase().includes('pix');
      const isAssinatura = Boolean(dados.isAssinatura);

      let numParcelas = 1, parcelaInicial = 1;
      if (!isAssinatura && !isPix) {
        numParcelas = Math.max(1, parseInt(dados.numParcelas, 10) || 1);
        parcelaInicial = Math.max(1, parseInt(dados.parcelaInicial, 10) || 1);
        if (parcelaInicial > numParcelas) parcelaInicial = 1;
      }

      const valorParcela = isAssinatura ? valorTotal : (valorTotal / numParcelas);
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
        statusPadrao = 'Assinatura Ativa';
      } else if (isPix) {
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
          dados.formaPagto,
          dados.categoria,
          isAssinatura ? '' : valorTotal,
          isAssinatura ? '' : numParcelas,
          pTxt,
          valorParcela,
          "'" + mFmt + '/' + aFmt,
          statusPadrao,
          dados.tags || ''
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

function salvarLancamentoWeb(dados) {
  return sincronizarLoteWeb([dados]);
}

// ============================================================================
// LEITURA GERAL DO SISTEMA (DASHBOARD, LIMITES, EMPRÉSTIMOS, TAGS E METAS)
// ============================================================================

function getDadosCompletos() {
  const obterMaisFrequente = (mapaContagem, ultimoUsado) => {
    let melhorChave = ultimoUsado || '';
    let maiorQtd = -1;
    for (let k in mapaContagem) {
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
      const lockCriacaoEmprestimos = LockService.getScriptLock();
      lockCriacaoEmprestimos.waitLock(10000);
      try { empSheet = garantirAbaEmprestimos(ss); }
      finally { lockCriacaoEmprestimos.releaseLock(); }
    }
    const nomesConfigCat = listarNomesCategoriasConfig(dashSheet);

    // CORRIGIDO: manutenção da planilha agora protegida por lock (evita conflito com gravações)
    const lockMant = LockService.getScriptLock();
    const temLock = lockMant.tryLock(20000);
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
    let mapLowerToOriginal = {};
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
            banco: String(r[1] || '').trim(),
            limiteTotal: dispP[idx][2] || 'R$ 0,00',
            fechamento: String(r[3] || '').trim(),
            vencimento: String(r[4] || '').trim(),
            arquivado: isArq,
            utilizado: 'R$ 0,00',
            disponivel: dispP[idx][6] || 'R$ 0,00',
            pctUso: '0%',
            terceirosMes: 'R$ 0,00',
            terceirosMesRaw: 0,
            terceirosFuturoRaw: 0
          });
          mapLowerToOriginal[n.toLowerCase()] = n;
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
    let pivotFaturas = {};
    let gastoMesPorForma = {};
    let abertoMesPorForma = {};
    let futuroParcelasPorForma = {};
    let freqCartoesCompras = {};

    listaFormasPagto.forEach(f => {
      const n = f.nome.trim();
      pivotFaturas[n] = {};
      gastoMesPorForma[n] = 0;
      abertoMesPorForma[n] = 0;
      futuroParcelasPorForma[n] = 0;
    });

    let setMeses = new Set([mesAtualStr]);
    let mapAutofill = {};
    let mapPrefixosAutofill = {};
    let statsDesc = {};
    let statsPrefixos = {};
    let listaAssinaturas = {};
    let lancamentosValidos = [];
    let freqTagsCompras = {};
    let consumoCatPorMes = {};
    let resumoParcelasCompra = {};

    let calcAberto = 0, calcPago = 0, calcCompromisso = 0, calcGeral = 0;
    let mapCatTotal = {};

    if (lancSheet && lancSheet.getLastRow() > 1) {
      const uL_Lanc = lancSheet.getLastRow();
      const lancData = lancSheet.getRange(2, 1, uL_Lanc - 1, 11).getValues();
      const dispLancData = lancSheet.getRange(2, 1, uL_Lanc - 1, 11).getDisplayValues();

      lancData.forEach((r, idx) => {
        const dVals = dispLancData[idx];
        const descStr = String(dVals[1] || '').trim();
        if (!descStr) return;

        const dtLimpa = String(dVals[0] || '').replace(/^'/, '').trim();
        const forma = String(dVals[2] || '').trim();
        const formaLower = forma.toLowerCase();
        const chaveForma = mapLowerToOriginal[formaLower] || forma;
        const isPix = formaLower.includes('pix');
        const isTotal = formaLower.includes('total') || formaLower.includes('carteira');

        const catStr = String(dVals[3] || '').trim();
        const catRes = resolverCategoria(catStr, nomesConfigCat);
        const parcela = String(dVals[6] || '').replace(/^'/, '').trim();
        const statusRaw = String(dVals[9] || '').trim();
        const mesFat = String(dVals[8] || '').replace(/^'/, '').trim();
        const valor = extractNum(r[7]);
        const valorFmt = formatBRL(valor);
        const tagsDaLinha = String(dVals[10] || '').trim();

        const cancelado = isStatusCancelado(statusRaw);
        const pago = isStatusPago(statusRaw);
        const infoFat = parseMesFat(mesFat);
        const infoParc = parseNumParcela(parcela);

        const chaveCompraUnica = `${dtLimpa}_${normalizarTexto(descStr)}_${normalizarTexto(chaveForma)}_${infoParc.total}`;

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
        if (!statsDesc[descNorm]) {
          statsDesc[descNorm] = { original: descStr, formas: {}, cats: {}, ultForma: chaveForma, ultCat: catStr, ultValor: valor, ultTags: tagsDaLinha };
        }
        statsDesc[descNorm].original = descStr;
        if (valor > 0) statsDesc[descNorm].ultValor = valor;
        if (tagsDaLinha) statsDesc[descNorm].ultTags = tagsDaLinha;
        if (chaveForma) {
          statsDesc[descNorm].formas[chaveForma] = (statsDesc[descNorm].formas[chaveForma] || 0) + 1;
          statsDesc[descNorm].ultForma = chaveForma;
        }
        if (catStr) {
          statsDesc[descNorm].cats[catStr] = (statsDesc[descNorm].cats[catStr] || 0) + 1;
          statsDesc[descNorm].ultCat = catStr;
        }

        const partesTraco = descNorm.split(/\s*[-–]\s*/);
        const prefixoItem = partesTraco[0].trim();
        if (prefixoItem && prefixoItem.length >= 3) {
          if (!statsPrefixos[prefixoItem]) {
            statsPrefixos[prefixoItem] = { formas: {}, cats: {}, ultForma: chaveForma, ultCat: catStr };
          }
          if (chaveForma) {
            statsPrefixos[prefixoItem].formas[chaveForma] = (statsPrefixos[prefixoItem].formas[chaveForma] || 0) + 1;
            statsPrefixos[prefixoItem].ultForma = chaveForma;
          }
          if (catStr) {
            statsPrefixos[prefixoItem].cats[catStr] = (statsPrefixos[prefixoItem].cats[catStr] || 0) + 1;
            statsPrefixos[prefixoItem].ultCat = catStr;
          }
        }

        if (parcela === '∞/∞') {
          const chaveAss = `${descNorm}_${normalizarTexto(chaveForma)}`;
          if (!listaAssinaturas[chaveAss] || infoFat.time >= listaAssinaturas[chaveAss].timeRef) {
            listaAssinaturas[chaveAss] = {
              linhaBase: idx + 2,
              descricao: descStr,
              forma: chaveForma,
              categoria: catStr,
              valor: valorFmt,
              valorRaw: valor,
              status: statusRaw,
              mesUltimaFat: mesFat,
              timeRef: infoFat.time
            };
          }
        }

        if (!cancelado && valor > 0) {
          calcGeral += valor;

          if (mesFat) {
            if (!consumoCatPorMes[mesFat]) consumoCatPorMes[mesFat] = {};
            consumoCatPorMes[mesFat][catRes] = (consumoCatPorMes[mesFat][catRes] || 0) + valor;
          }

          if (mesFat === mesAtualStr) {
            calcCompromisso += valor;
            if (pago) calcPago += valor;
            else calcAberto += valor;

            mapCatTotal[catRes] = (mapCatTotal[catRes] || 0) + valor;
            gastoMesPorForma[chaveForma] = (gastoMesPorForma[chaveForma] || 0) + valor;
            if (!pago) {
              abertoMesPorForma[chaveForma] = (abertoMesPorForma[chaveForma] || 0) + valor;
            }
          }

          if (infoFat.time > 0) {
            mesesUnicos.push(mesFat);
            const isFuturo = (infoFat.a > anoAt) || (infoFat.a === anoAt && infoFat.m > mesAt);

            if (isFuturo && !pago && parcela !== '∞/∞' && !isPix) {
              futuroParcelasPorForma[chaveForma] = (futuroParcelasPorForma[chaveForma] || 0) + valor;
            }

            if (!pago || isPix) {
              setMeses.add(mesFat);
              if (!pivotFaturas[chaveForma]) pivotFaturas[chaveForma] = {};
              pivotFaturas[chaveForma][mesFat] = (pivotFaturas[chaveForma][mesFat] || 0) + valor;
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
        return [dt, d[1], d[2], d[3], d[4], d[5], String(d[6]).replace(/^'/, ''), val, String(d[8]).replace(/^'/, ''), d[9], item.idx + 2, d[10], resParc];
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
    let terceirosAbertoMesPorForma = {};
    let terceirosFuturoPorForma = {};
    let terceirosTotalMesPorForma = {};
    let terceirosAReceberPorMes = {};
    let terceirosCartaoPorFormaMes = {};
    let empKpiAReceberMes = 0, empKpiRecebidoMes = 0, empKpiTotalAReceberGeral = 0, empKpiLimiteOcupado = 0;
    let empKpiAtrasados = 0;
    let freqPessoasEmp = {};

    if (empSheet && empSheet.getLastRow() > 1) {
      const uLEmp = empSheet.getLastRow();
      const rawEmp = empSheet.getRange(2, 1, uLEmp - 1, 11).getValues();
      const dispEmp = empSheet.getRange(2, 1, uLEmp - 1, 11).getDisplayValues();

      rawEmp.forEach((r, idx) => {
        const d = dispEmp[idx];
        const pessoa = String(d[1] || '').trim();
        const desc = String(d[2] || '').trim();
        if (!pessoa && !desc) return;

        const dtLimpa = String(d[0] || '').replace(/^'/, '').trim();
        const formaRaw = String(d[3] || '').trim();
        const chaveForma = mapLowerToOriginal[formaRaw.toLowerCase()] || formaRaw;
        const consomeLimiteCartao = formaEmprestimoConsomeLimite_(chaveForma);
        const parcLimpa = String(d[6] || '').replace(/^'/, '').trim();
        const valParc = extractNum(r[7]);
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

          if (consomeLimiteCartao && infoFat.time >= timeMesAtual) {
            if (!terceirosCartaoPorFormaMes[chaveForma]) terceirosCartaoPorFormaMes[chaveForma] = {};
            terceirosCartaoPorFormaMes[chaveForma][mesFat] = (terceirosCartaoPorFormaMes[chaveForma][mesFat] || 0) + valParc;

            // A devolução da pessoa não quita a fatura do banco. Por isso o limite
            // continua ocupado pela parcela do cartão, mesmo com status Recebido.
            empKpiLimiteOcupado += valParc;
            if (mesFat === mesAtualStr) {
              terceirosAbertoMesPorForma[chaveForma] = (terceirosAbertoMesPorForma[chaveForma] || 0) + valParc;
            } else if (infoFat.time > timeMesAtual) {
              terceirosFuturoPorForma[chaveForma] = (terceirosFuturoPorForma[chaveForma] || 0) + valParc;
            }
          }
        }

        listaEmprestimos.push({
          linha: idx + 2,
          data: dtLimpa,
          pessoa: pessoa,
          descricao: desc,
          forma: chaveForma,
          parcela: parcLimpa,
          valorRaw: valParc,
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
      return somaMes > 0 || somaTerceirosAReceber > 0 || somaTerceirosCartao > 0;
    }).sort((a, b) => parseMesFat(a).time - parseMesFat(b).time);

    let mesesContinuos = mesesComGasto.length > 0 ? mesesComGasto : [mesAtualStr];

    Object.values(listaAssinaturas).forEach(ass => {
      const stLower = String(ass.status || '').toLowerCase();
      const isAtiva = (stLower === 'assinatura ativa' || stLower === 'assinatura paga');
      if (isAtiva && ass.valorRaw > 0) {
        mesesContinuos.forEach(mHoriz => {
          const infoH = parseMesFat(mHoriz);
          if (infoH.time > ass.timeRef) {
            if (!pivotFaturas[ass.forma]) pivotFaturas[ass.forma] = {};
            pivotFaturas[ass.forma][mHoriz] = (pivotFaturas[ass.forma][mHoriz] || 0) + ass.valorRaw;
          }
        });
      }
    });

    let somaFuturoCartoes = 0;
    let somaAbertoMesCartoes = 0;
    let somaTerceirosMesCartoes = 0;
    let pivotTotalCarteira = {};
    let pivotTotalBanco = {};
    mesesContinuos.forEach(m => { pivotTotalCarteira[m] = 0; pivotTotalBanco[m] = 0; });

    listaFormasPagto.forEach(f => {
      const fNomeTrim = f.nome.trim();
      const nomeLower = fNomeTrim.toLowerCase();
      const isPagamentoAVista = !formaEmprestimoConsomeLimite_(nomeLower);
      const isTotal = nomeLower.includes('total') || nomeLower.includes('carteira');
      const limRaw = extractNum(f.limiteTotal);

      const gastoMesPessoal = gastoMesPorForma[fNomeTrim] || 0;
      const abertoMesPessoal = abertoMesPorForma[fNomeTrim] || 0;
      const futuroParcPessoal = futuroParcelasPorForma[fNomeTrim] || 0;

      const tercAbertoMes = terceirosAbertoMesPorForma[fNomeTrim] || 0;
      const tercFuturo = terceirosFuturoPorForma[fNomeTrim] || 0;
      const tercTotalMes = terceirosTotalMesPorForma[fNomeTrim] || 0;

      f.limiteRaw = limRaw;
      f.gastoMesRaw = gastoMesPessoal;
      f.terceirosMesRaw = tercTotalMes;
      f.terceirosMes = formatBRL(tercTotalMes);
      f.terceirosFuturoRaw = tercFuturo;
      f.totalBancoMes = formatBRL(gastoMesPessoal + tercTotalMes);

      if (isPagamentoAVista) {
        f.utilizado = formatBRL(gastoMesPessoal);
        f.totalFuturo = 'R$ 0,00';
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

        somaFuturoCartoes += futuroTotalCard;
        somaAbertoMesCartoes += abertoTotalCard;
        somaTerceirosMesCartoes += tercTotalMes;

        f.utilizado = formatBRL(gastoMesPessoal);
        f.totalFuturo = futuroTotalCard > 0 ? formatBRL(futuroTotalCard) : 'R$ 0,00';

        const comprometidoCard = abertoTotalCard + futuroTotalCard;
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

    const chaveTotalCarteira = listaFormasPagto.find(f => f.nome.toLowerCase().includes('total') || f.nome.toLowerCase().includes('carteira'))?.nome || 'Total Carteira';
    const pivotTerceirosAReceber = {};
    mesesContinuos.forEach(function (m) { pivotTerceirosAReceber[m] = terceirosAReceberPorMes[m] || 0; });
    pivotFaturas[chaveTotalCarteira] = pivotTotalCarteira;
    pivotFaturas['__TERCEIROS_A_RECEBER__'] = pivotTerceirosAReceber;
    pivotFaturas['__BANCO_TOTAL__'] = pivotTotalBanco;

    listaFormasPagto.forEach(f => {
      const nomeLower = f.nome.toLowerCase();
      if (nomeLower.includes('total') || nomeLower.includes('carteira')) {
        const gastoMesCartoes = pivotTotalCarteira[mesAtualStr] || 0;
        const comprometidoTotal = somaAbertoMesCartoes + somaFuturoCartoes;
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

    let anosUnicos = [...new Set(mesesUnicos.map(m => m.split('/')[1]))].sort((a, b) => b - a);
    let estruturaMesesPorAno = {};
    mesesUnicos.forEach(mFat => {
      let [m, a] = mFat.split('/');
      if (!estruturaMesesPorAno[a]) estruturaMesesPorAno[a] = [];
      estruturaMesesPorAno[a].push(mFat);
    });

    const opcoesFormasFiltradas = listaFormasPagto
      .filter(f => !f.arquivado)
      .map(f => f.nome)
      .filter(nome => !nome.toLowerCase().includes('total') && !nome.toLowerCase().includes('carteira'));

    let listaNotas = [];
    if (notasSheet && notasSheet.getLastRow() >= 2) {
      const nRows = notasSheet.getRange(2, 1, notasSheet.getLastRow() - 1, 4).getDisplayValues();
      nRows.forEach(nr => {
        if (nr[0] || nr[1]) {
          listaNotas.push({
            id: String(nr[0] || ''),
            texto: String(nr[1] || ''),
            concluida: String(nr[2] || '').toLowerCase() === 'true',
            data: String(nr[3] || '')
          });
        }
      });
    }

    return {
      kpis: {
        totalAberto: formatBRL(calcAberto),
        totalPago: formatBRL(calcPago),
        comprometimentoMes: formatBRL(calcCompromisso),
        totalGeral: formatBRL(calcGeral)
      },
      faturas: { mesesGlobais: mesesContinuos, pivot: pivotFaturas, mesAtual: mesAtualStr },
      categorias: categorias,
      configCategorias: configCategorias,
      consumoCategoriasPorMes: consumoCatPorMes,
      formasPagamento: listaFormasPagto,
      cartaoMaisFrequente: cartaoMaisFrequente,
      lancamentos: ultimosLancamentos,
      temMaisLancamentos: lancamentosValidos.length > 50,
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
        itens: listaEmprestimos.reverse()
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
    return output.setContent(JSON.stringify({ sucesso: false, erro: err.message }));
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
    return JSON.stringify({ sucesso: false, erro: err && err.message ? err.message : String(err) });
  }
}

function propriedade_(nome) {
  return PropertiesService.getScriptProperties().getProperty(nome) || '';
}

function executarAcaoApi_(action, param) {
  switch (action) {
    case 'getDadosCompletos': return getDadosCompletos();
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
  if (!sheet || sheet.getLastRow() < 2) return { raw: [], disp: [] };
  const rng = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols);
  return { raw: rng.getValues(), disp: rng.getDisplayValues() };
}

// ----------------------------------------------------------------------------
// LOCALIZAÇÃO SEGURA DA LINHA (serve para Lançamentos e Empréstimos)
// Lançamentos: desc na coluna B (idx 1). Empréstimos: desc na coluna C (idx 2).
// ----------------------------------------------------------------------------
function localizarIndiceSeguro(dispAll, linha, descricao, mesFatura, parcela) {
  const descN = normalizarTexto(descricao);
  const mes = limparApostrofo(mesFatura);
  const parc = limparApostrofo(parcela);
  const confere = function (d) {
    const bateDesc = normalizarTexto(d[1]) === descN || normalizarTexto(d[2]) === descN;
    const bateMes = !mes || limparApostrofo(d[8]) === mes;
    const bateParc = !parc || limparApostrofo(d[6]) === parc;
    return bateDesc && bateMes && bateParc;
  };
  const idxLinha = parseInt(linha, 10) - 2;
  if (!isNaN(idxLinha) && idxLinha >= 0 && idxLinha < dispAll.length && confere(dispAll[idxLinha])) return idxLinha;
  for (let i = 0; i < dispAll.length; i++) {
    if (confere(dispAll[i])) return i;
  }
  return -1;
}

// Índices de todas as parcelas da mesma compra (Lançamentos)
function indicesMesmaCompra(dispAll, idxAlvo) {
  const a = dispAll[idxAlvo];
  const parcAlvo = limparApostrofo(a[6]);
  const info = parseNumParcela(parcAlvo);
  const lista = [idxAlvo];
  if (info.total <= 1 || parcAlvo === '∞/∞') return lista;
  const sufixo = '/' + info.total;
  for (let i = 0; i < dispAll.length; i++) {
    if (i === idxAlvo) continue;
    const d = dispAll[i];
    if (
      limparApostrofo(d[6]).endsWith(sufixo) &&
      limparApostrofo(d[0]) === limparApostrofo(a[0]) &&
      normalizarTexto(d[1]) === normalizarTexto(a[1]) &&
      normalizarTexto(d[2]) === normalizarTexto(a[2])
    ) lista.push(i);
  }
  return lista;
}

// Monta uma linha de 11 colunas de "Lançamentos" aplicando alterações (over)
function montarLinhaLanc(d, r, over) {
  const o = over || {};
  const parc = limparApostrofo(d[6]);
  return [
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
  ];
}

function escreverLinhaPlanilha(sheet, numLinha, linha) {
  sheet.getRange(numLinha, 1, 1, linha.length).setValues([linha]);
  sheet.getRange(numLinha, 5).setNumberFormat(FORMATO_MOEDA_PLANILHA);
  sheet.getRange(numLinha, 8).setNumberFormat(FORMATO_MOEDA_PLANILHA);
}

// ============================================================================
// LANÇAMENTOS: EDITAR / EXCLUIR / ADIANTAR / QUITAR FATURA
// ============================================================================

function editarLancamentoLinhaWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const raw = lido.raw, disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idx < 0) throw new Error('Lançamento não localizado. Atualize a página e tente novamente.');

    const alvo = disp[idx];
    const parcAlvo = limparApostrofo(alvo[6]);
    const infoAlvo = parseNumParcela(parcAlvo);
    const ehParcelado = infoAlvo.total > 1 && parcAlvo !== '∞/∞';

    const descFmt = formatarTituloInteligente(dados.descricao);
    const valor = extractNum(dados.valorParcela);
    const novaData = limparApostrofo(dados.dataCompra);
    const novoMes = limparApostrofo(dados.mesFatura);
    const mudouMes = novoMes !== limparApostrofo(alvo[8]);
    const infoNovoMes = parseMesFat(novoMes);
    const tags = dados.tags || '';

    const grupo = ehParcelado ? indicesMesmaCompra(disp, idx) : [idx];
    const novas = {};

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

function excluirLancamentoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descricao, dados.mesFatura, dados.parcela);
    if (idx < 0) throw new Error('Lançamento não encontrado. Atualize a página.');

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
function adiantarParcelasWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const raw = lido.raw, disp = lido.disp;

    const idx = localizarIndiceSeguro(disp, dados.linha, dados.descOriginal, dados.mesOriginal, dados.parcelaOriginal);
    if (idx < 0) throw new Error('Compra não localizada.');

    const mesDestino = limparApostrofo(dados.mesDestino);
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

    const novas = {};
    candidatas.forEach(function (i) {
      const v = extractNum(raw[i][7]);
      const novoV = arred2(v - (somaOrig > 0 ? desconto * v / somaOrig : 0));
      novas[i] = montarLinhaLanc(disp[i], raw[i], {
        valor: novoV,
        mes: mesDestino,
        status: dados.marcarComoPago ? 'Pago' : disp[i][9]
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

function quitarFaturaWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const lido = lerAbaCompleta(lancSheet, 11);
    const disp = lido.disp;
    if (disp.length === 0) return { sucesso: true, qtd: 0 };

    const forma = normalizarTexto(dados.forma);
    const mes = limparApostrofo(dados.mesFatura);
    const info = parseMesFat(mes);
    const hoje = getHojeSeguro();
    const mesPassado = info.a < hoje.getFullYear() || (info.a === hoje.getFullYear() && info.m < (hoje.getMonth() + 1));

    const colStatus = disp.map(function (d) { return [d[9]]; });
    let qtd = 0;
    disp.forEach(function (d, i) {
      if (!String(d[1] || '').trim()) return;
      if (normalizarTexto(d[2]) !== forma || limparApostrofo(d[8]) !== mes) return;
      const st = String(d[9] || '').trim();
      if (isStatusPago(st) || isStatusCancelado(st)) return;
      colStatus[i][0] = (st === 'Assinatura Ativa') ? (mesPassado ? 'Pago' : 'Assinatura Paga') : 'Pago';
      qtd++;
    });
    if (qtd > 0) lancSheet.getRange(2, 10, colStatus.length, 1).setValues(colStatus);
    return { sucesso: true, qtd: qtd };
  } catch (e) {
    throw new Error('Falha ao quitar fatura: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// ASSINATURAS (DESPESAS FIXAS)
// ============================================================================

function editarAssinaturaWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const pagtoSheet = ss.getSheetByName('Formas de Pagamento');
    const lido = lerAbaCompleta(lancSheet, 11);
    const raw = lido.raw, disp = lido.disp;

    const chaveOrig = normalizarTexto(dados.descOriginal) + '_' + normalizarTexto(dados.formaOriginal);
    const descNova = formatarTituloInteligente(dados.novaDesc);
    const chaveNova = normalizarTexto(descNova) + '_' + normalizarTexto(dados.novaForma);
    const chaveMudou = chaveNova !== chaveOrig;
    const valorNovo = extractNum(dados.novaValor);

    const hoje = getHojeSeguro();
    const timeMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getTime();

    const novas = {};
    let qtd = 0;
    disp.forEach(function (d, i) {
      if (limparApostrofo(d[6]) !== '∞/∞') return;
      if (normalizarTexto(d[1]) + '_' + normalizarTexto(d[2]) !== chaveOrig) return;
      const st = String(d[9] || '').trim();
      if (isStatusCancelado(st) || st === 'Pago (Cancelada)') return;

      if (parseMesFat(d[8]).time >= timeMesAtual) {
        novas[i] = montarLinhaLanc(d, raw[i], { desc: descNova, forma: dados.novaForma, cat: dados.novaCat, valor: valorNovo });
        qtd++;
      } else if (chaveMudou) {
        novas[i] = montarLinhaLanc(d, raw[i], { status: isStatusPago(st) ? 'Pago (Cancelada)' : 'Assinatura Cancelada' });
      }
    });

    Object.keys(novas).forEach(function (k) {
      escreverLinhaPlanilha(lancSheet, parseInt(k, 10) + 2, novas[k]);
    });
    organizarEAtualizarPlanilha(lancSheet, pagtoSheet);
    return { sucesso: true, qtd: qtd };
  } catch (e) {
    throw new Error('Falha ao editar assinatura: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function cancelarAssinaturaWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const lancSheet = ss.getSheetByName('Lançamentos');
    const lido = lerAbaCompleta(lancSheet, 11);
    const disp = lido.disp;
    if (disp.length === 0) return { sucesso: true, qtd: 0 };

    const chave = normalizarTexto(dados.descricao) + '_' + normalizarTexto(dados.forma);
    const colStatus = disp.map(function (d) { return [d[9]]; });
    let qtd = 0;
    disp.forEach(function (d, i) {
      if (limparApostrofo(d[6]) !== '∞/∞') return;
      if (normalizarTexto(d[1]) + '_' + normalizarTexto(d[2]) !== chave) return;
      const st = String(d[9] || '').trim();
      if (isStatusCancelado(st) || st === 'Pago (Cancelada)') return;
      colStatus[i][0] = isStatusPago(st) ? 'Pago (Cancelada)' : 'Assinatura Cancelada';
      qtd++;
    });
    if (qtd > 0) lancSheet.getRange(2, 10, colStatus.length, 1).setValues(colStatus);
    return { sucesso: true, qtd: qtd };
  } catch (e) {
    throw new Error('Falha ao cancelar assinatura: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// NOTAS
// ============================================================================

function salvarNotasWeb(notas) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    let sh = ss.getSheetByName('Anotações');
    if (!sh) {
      sh = ss.insertSheet('Anotações');
      sh.getRange(1, 1, 1, 4).setValues([['ID', 'Texto', 'Concluída', 'Data']]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
    const lista = Array.isArray(notas) ? notas : [];
    if (lista.length > 0) {
      const linhas = lista.map(function (n) {
        let texto = String(n.texto || '');
        if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
        return ["'" + String(n.id || ''), texto, n.concluida === true, "'" + String(n.data || '')];
      });
      sh.getRange(2, 1, linhas.length, 4).setValues(linhas);
    }
    return { sucesso: true, qtd: lista.length };
  } catch (e) {
    throw new Error('Falha ao salvar notas: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// Pagamentos à vista não comprometem limite de cartão; continuam com parcelas
// próprias de recebimento no controle de empréstimos.
function formaEmprestimoConsomeLimite_(forma) {
  const nome = String(forma || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return !(/pix|debito|transferencia|dinheiro|\bted\b|\bdoc\b/.test(nome));
}

// EMPRÉSTIMOS: NOVO REGISTRO
// ============================================================================

function salvarEmprestimoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Dados do empréstimo inválidos.');
    validarDataCalendarioWeb_(dados.dataCompra, 'Data da compra');
    if (!String(dados.formaPagto || '').trim()) throw new Error('Selecione como o empréstimo foi pago.');
    const formaPagto = String(dados.formaPagto || '').trim();
    const isPix = normalizarTexto(formaPagto).includes('pix');
    let mesPrimeiraFatura = limparApostrofo(dados.mesPrimeiraFatura);
    if (isPix) {
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

    const valorTotal = extractNum(dados.valorTotal);
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) throw new Error('Informe um valor maior que zero.');
    const numParcelas = isPix ? 1 : Number(dados.numParcelas || 1);
    const parcelaInicial = isPix ? 1 : Number(dados.parcelaInicial || 1);
    if (!Number.isInteger(numParcelas) || numParcelas < 1) throw new Error('O número de parcelas deve ser um inteiro positivo.');
    if (!Number.isInteger(parcelaInicial) || parcelaInicial < 1 || parcelaInicial > numParcelas) {
      throw new Error('A parcela inicial deve estar entre 1 e o total de parcelas.');
    }
    const totalCentavos = Math.round(valorTotal * 100);
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

    const linhas = [];
    for (let p = parcelaInicial; p <= numParcelas; p++) {
      const dRef = new Date(anoFat, (mesFat - 1) + (p - parcelaInicial), 1);
      const valorParcela = (centavosBase + (p <= sobraCentavos ? 1 : 0)) / 100;
      linhas.push([
        "'" + dtStr, pessoa, desc, formaPagto, valorTotal, numParcelas,
        "'" + p + '/' + numParcelas, valorParcela,
        "'" + pad2(dRef.getMonth() + 1) + '/' + dRef.getFullYear(),
        'A Receber', dados.observacoes || ''
      ]);
    }

    const prox = Math.max(2, empSheet.getLastRow() + 1);
    empSheet.getRange(prox, 1, linhas.length, 11).setValues(linhas);
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
  const alvo = String(nome || '').trim().toLowerCase();
  if (!alvo || pagtoSheet.getLastRow() < 7) return -1;
  const nomes = pagtoSheet.getRange(7, 2, pagtoSheet.getLastRow() - 6, 1).getValues();
  for (let i = 0; i < nomes.length; i++) {
    if (String(nomes[i][0]).trim().toLowerCase() === alvo) return i + 7;
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
      if (String(l[0]).trim().toLowerCase() === String(de).trim().toLowerCase()) { l[0] = para; mudou = true; }
    });
    if (mudou) rng.setValues(vals);
  });
}

function salvarFormaPagamentoWeb(dados) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    if (!sh) throw new Error('Aba "Formas de Pagamento" não encontrada.');

    const orig = String(dados.nomeOriginal || '').trim();
    const nome = String(dados.nome || '').trim();
    if (!nome) throw new Error('Informe o nome do cartão.');
    const banco = String(dados.banco || '').trim();
    const limite = extractNum(dados.limite);
    const fech = parseInt(dados.fechamento, 10);
    const venc = parseInt(dados.vencimento, 10);

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

    sh.getRange(linha, 2, 1, 5).setValues([[nome, banco, limite, isNaN(fech) ? '' : fech, isNaN(venc) ? '' : venc]]);
    if (orig && orig !== nome) renomearFormaNasAbas(ss, orig, nome);
    organizarFormasPagamento(sh);
    return { sucesso: true };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function reordenarFormasPagamentoWeb(nomes) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    if (!sh || sh.getLastRow() < 7) return { sucesso: true };

    const rng = sh.getRange(7, 2, sh.getLastRow() - 6, 6);
    const v = rng.getValues();
    const usados = new Set();
    const novo = [];
    (nomes || []).forEach(function (n) {
      const alvo = String(n || '').trim().toLowerCase();
      for (let ix = 0; ix < v.length; ix++) {
        if (!usados.has(ix) && String(v[ix][0]).trim().toLowerCase() === alvo) {
          usados.add(ix);
          novo.push(v[ix]);
          break;
        }
      }
    });
    v.forEach(function (l, ix) { if (!usados.has(ix)) novo.push(l); });
    rng.setValues(novo);
    return { sucesso: true };
  } catch (e) {
    throw new Error('Falha ao reordenar: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function excluirFormaPagamentoWeb(nome) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const sh = ss.getSheetByName('Formas de Pagamento');
    const linha = encontrarLinhaForma(sh, nome);
    if (linha < 0) throw new Error('Cartão não encontrado.');

    // Se já existem lançamentos/empréstimos com esse cartão, apenas ARQUIVA (preserva o histórico)
    const alvo = String(nome).trim().toLowerCase();
    let emUso = false;
    [['Lançamentos', 3], ['Empréstimos', 4]].forEach(function (par) {
      const aba = ss.getSheetByName(par[0]);
      if (!aba || aba.getLastRow() < 2 || emUso) return;
      const vals = aba.getRange(2, par[1], aba.getLastRow() - 1, 1).getValues();
      if (vals.some(function (l) { return String(l[0]).trim().toLowerCase() === alvo; })) emUso = true;
    });

    if (emUso) {
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

function salvarCategoriasWeb(param) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = obterPlanilhaGestor_();
    const dash = ss.getSheetByName('Dashboard & Resumo');
    if (!dash) throw new Error('Aba "Dashboard & Resumo" não encontrada.');

    // aceita o formato antigo (lista) e o novo ({ categorias, renomeacoes })
    const lista = Array.isArray(param) ? param : ((param && param.categorias) || []);
    const renomeacoes = (!Array.isArray(param) && param && param.renomeacoes) ? param.renomeacoes : [];

    const cats = lista.slice(0, 25);
    const nomes = [], metas = [];
    for (let i = 0; i < 25; i++) {
      const c = cats[i];
      const nome = c ? String(c.nome || '').trim() : '';
      const meta = c ? extractNum(c.meta) : 0;
      nomes.push([nome]);
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
        const mapa = {};
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
  const porCategoria = {};
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
function unificarCategoriasNaPlanilha() {
  const lock = LockService.getScriptLock();
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

function lerLancamentosParaRelatorio() {
  const ss = obterPlanilhaGestor_();
  const lido = lerAbaCompleta(ss.getSheetByName('Lançamentos'), 11);
  const nomesCfg = listarNomesCategoriasConfig(ss.getSheetByName('Dashboard & Resumo'));
  const linhas = [];
  lido.raw.forEach(function (r, i) {
    const d = lido.disp[i];
    const desc = String(d[1] || '').trim();
    if (!desc) return;
    const parc = limparApostrofo(d[6]);
    const infoParc = parseNumParcela(parc);
    linhas.push({
      idx: i, d: d, r: r, desc: desc,
      forma: String(d[2] || '').trim(),
      cat: String(d[3] || '').trim() || 'Sem Categoria',
      catRes: resolverCategoria(d[3], nomesCfg),
      parc: parc, infoParc: infoParc,
      valor: extractNum(r[7]),
      mes: limparApostrofo(d[8]),
      infoMes: parseMesFat(d[8]),
      status: String(d[9] || '').trim(),
      tags: String(d[10] || '').trim(),
      data: limparApostrofo(d[0]),
      chave: limparApostrofo(d[0]) + '_' + normalizarTexto(desc) + '_' + normalizarTexto(d[2]) + '_' + infoParc.total
    });
  });
  return linhas;
}

function calcularResumoParcelas(linhas) {
  const mapa = {};
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
  return modo === 'relatorio' ? base.concat([l.tags, l.idx + 2, res]) : base.concat([l.idx + 2, l.tags, res]);
}

function lerMetasCategorias() {
  const ss = obterPlanilhaGestor_();
  const dash = ss.getSheetByName('Dashboard & Resumo');
  const mapa = {};
  if (!dash) return mapa;
  const nomes = dash.getRange('B17:B41').getValues();
  const metas = dash.getRange('D17:D41').getValues();
  nomes.forEach(function (r, i) {
    const n = String(r[0] || '').trim();
    if (n) mapa[n] = extractNum(metas[i][0]);
  });
  return mapa;
}

function lerTerceirosDoMes(mes) {
  const ss = obterPlanilhaGestor_();
  const sh = ss.getSheetByName('Empréstimos');
  const mapa = {};
  if (!sh || sh.getLastRow() < 2) return mapa;
  const lido = lerAbaCompleta(sh, 11);
  lido.raw.forEach(function (r, i) {
    const d = lido.disp[i];
    if (limparApostrofo(d[8]) !== mes) return;
    const k = normalizarTexto(d[3]);
    if (!mapa[k]) mapa[k] = { nome: String(d[3] || '').trim(), total: 0 };
    mapa[k].total += extractNum(r[7]);
  });
  return mapa;
}

function somarTags(linhas) {
  const mapa = {};
  linhas.forEach(function (l) {
    if (!l.tags) return;
    l.tags.split(',').forEach(function (t) {
      const tag = t.trim().toLowerCase().replace(/^#/, '');
      if (!tag) return;
      if (!mapa[tag]) mapa[tag] = { nome: '#' + tag, total: 0, qtd: 0 };
      mapa[tag].total += l.valor;
      mapa[tag].qtd += 1;
    });
  });
  return Object.values(mapa).sort(function (a, b) { return b.total - a.total; });
}

function somarPor(linhas, campo) {
  const mapa = {};
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

  const todas = lerLancamentosParaRelatorio();
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
    if (isStatusPago(l.status)) pago += l.valor; else aberto += l.valor;
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
  const categorias = somarPor(doMes, 'catRes').map(function (c) {
    return { nome: c.nome, total: c.total, meta: metas[c.nome] || 0 };
  });

  const terceiros = lerTerceirosDoMes(mes);
  const mapaForma = {};
  doMes.forEach(function (l) {
    const k = normalizarTexto(l.forma);
    if (!mapaForma[k]) mapaForma[k] = { nome: l.forma, total: 0, aberto: 0, terceiros: 0, totalBanco: 0 };
    mapaForma[k].total += l.valor;
    if (!isStatusPago(l.status)) mapaForma[k].aberto += l.valor;
  });
  Object.keys(terceiros).forEach(function (k) {
    if (mapaForma[k]) mapaForma[k].terceiros = terceiros[k].total;
  });
  const formas = Object.values(mapaForma).map(function (f) {
    f.totalBanco = f.total + f.terceiros;
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
    formas: formas,
    tags: somarTags(doMes),
    lancamentos: doMes.map(function (l) { return itemLancamento(l, resumo, 'relatorio'); })
  };
}

// ============================================================================
// RELATÓRIO ANUAL
// ============================================================================

function obterRelatorioAnual(ano) {
  const anoNum = parseInt(ano, 10);
  const todas = lerLancamentosParaRelatorio();
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
    formas: somarPor(doAno, 'forma'),
    tags: somarTags(doAno)
  };
}

// ============================================================================
// HISTÓRICO: BUSCA + FILTROS + SOMA
// ============================================================================

function filtrarLancamentosWeb(filtros, offset, limite) {
  const f = filtros || {};
  const off = Math.max(0, parseInt(offset, 10) || 0);
  const lim = Math.max(1, parseInt(limite, 10) || 50);

  const todas = lerLancamentosParaRelatorio();
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
    if (f.forma && normalizarTexto(l.forma) !== normalizarTexto(f.forma)) return false;
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
      case 'pix': if (normalizarTexto(l.forma).indexOf('pix') < 0) return false; break;
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
    itens: pagina.map(function (l) { return itemLancamento(l, resumo, 'historico'); }),
    temMais: (off + lim) < maisRecentesPrimeiro.length,
    qtdTotal: filtrados.length,
    somaTotal: formatBRL(soma),
    somaMetade: formatBRL(soma / 2)
  };
}
