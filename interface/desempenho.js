// Leituras coordenadas e trabalho visual apenas nas telas que estão abertas.
// O cache é transitório: nunca guarda mutações, prévias financeiras ou backups.
function criarCoordenadorLeiturasGestor(opcoes) {
  const agora = opcoes.agora || Date.now;
  const ttl = opcoes.ttlMs ?? 15000;
  const limiteEntradas = opcoes.limiteEntradas ?? 8;
  const limiteBytes = opcoes.limiteBytes ?? 1000000;
  const leituras = opcoes.leituras || new Set();
  const cacheaveis = new Set(opcoes.cacheaveis || []);
  const cache = new Map(), consultas = new Map();
  const metricas = { envios: 0, compartilhadas: 0, cache: 0, descartadas: 0, invalidacoes: 0 };
  let geracao = 0, bytes = 0;

  function copiar(valor) {
    return valor == null ? valor : JSON.parse(JSON.stringify(valor));
  }
  function chaveEstavel(valor) {
    if (valor === undefined) return 'null';
    if (Array.isArray(valor)) return '[' + valor.map(chaveEstavel).join(',') + ']';
    if (valor && typeof valor === 'object') return '{' + Object.keys(valor).sort().map(k => JSON.stringify(k) + ':' + chaveEstavel(valor[k])).join(',') + '}';
    return JSON.stringify(valor);
  }
  function remover(chave) {
    const item = cache.get(chave);
    if (item) { bytes -= item.bytes; cache.delete(chave); }
  }
  function invalidar() {
    geracao++;
    metricas.invalidacoes++;
    cache.clear(); bytes = 0;
    // Promessas anteriores seguem observadas por seus solicitantes, sem serem
    // reaproveitadas por consultas iniciadas depois desta invalidação.
    consultas.clear();
    // Falhas de um acessório de cache nunca transformam uma gravação já
    // confirmada no servidor em um resultado incerto no aparelho.
    try { if (opcoes.aoInvalidar) opcoes.aoInvalidar(); } catch (_) {}
  }
  function guardar(chave, valor, instante) {
    const serializado = JSON.stringify(valor);
    const tamanho = typeof TextEncoder === 'function' ? new TextEncoder().encode(serializado).length : serializado.length * 2;
    if (tamanho > limiteBytes || limiteEntradas < 1) return;
    remover(chave);
    while (cache.size >= limiteEntradas || bytes + tamanho > limiteBytes) remover(cache.keys().next().value);
    cache.set(chave, { valor: copiar(valor), instante, bytes: tamanho }); bytes += tamanho;
  }
  function resultado(valor, instante, origem, acao) {
    const copia = copiar(valor);
    if (cacheaveis.has(acao) && copia && typeof copia === 'object') {
      copia.consultadoEmDesempenho = instante;
      copia.origemLeituraDesempenho = origem;
    }
    return copia;
  }
  function consultar(acao, param, extras, repeticoes = 0) {
    const versao = geracao, chave = acao + ':' + chaveEstavel(param) + ':' + chaveEstavel(extras);
    const podeCache = cacheaveis.has(acao);
    const item = podeCache && cache.get(chave);
    if (item && agora() - item.instante >= 0 && agora() - item.instante < ttl) {
      cache.delete(chave); cache.set(chave, item); metricas.cache++;
      return Promise.resolve(resultado(item.valor, item.instante, 'cache', acao));
    }
    if (item) remover(chave);
    const chaveEnvio = versao + ':' + chave;
    let promessa = consultas.get(chaveEnvio);
    if (promessa) metricas.compartilhadas++;
    else {
      metricas.envios++;
      promessa = Promise.resolve().then(() => opcoes.executar(acao, copiar(param), ...extras.map(copiar))).then(valor => {
        let versaoResposta = versao;
        if (acao === 'getDadosCompletos' && valor && versao === geracao) {
          // Uma consulta completa pode revelar mudanças de outro aparelho ou
          // novas ocorrências fixas. Seus relatórios anteriores perdem validade.
          // O novo número pertence à resposta compartilhada, não a cada leitor.
          invalidar(); versaoResposta = geracao;
        }
        return { valor, instante: agora(), versaoResposta };
      });
      consultas.set(chaveEnvio, promessa);
      promessa.then(() => { if (consultas.get(chaveEnvio) === promessa) consultas.delete(chaveEnvio); }, () => { if (consultas.get(chaveEnvio) === promessa) consultas.delete(chaveEnvio); });
    }
    return promessa.then(({valor, instante, versaoResposta}) => {
      if (versaoResposta !== geracao) {
        metricas.descartadas++;
        // Não repete uma falha de rede nem qualquer gravação. Só refaz uma
        // leitura bem-sucedida que atravessou uma alteração dos dados.
        if (repeticoes < 2) return consultar(acao, param, extras, repeticoes + 1);
        const erro = new Error('Os dados mudaram durante a consulta. Atualize novamente para conferir a versão atual.');
        erro.codigo = 'LEITURA_SUBSTITUIDA'; throw erro;
      }
      if (podeCache && valor && !valor.erro && !valor.error && !valor.integridade?.bloqueada) {
        try { guardar(chave, valor, instante); } catch (_) {}
      }
      return resultado(valor, instante, 'rede', acao);
    });
  }
  function chamar(acao, param, ...extras) {
    if (leituras.has(acao)) {
      try { return consultar(acao, copiar(param), extras.map(copiar)); }
      catch (erro) { return Promise.reject(erro); }
    }
    invalidar();
    return Promise.resolve().then(() => opcoes.executar(acao, param, ...extras)).finally(invalidar);
  }
  return {
    chamar, invalidar,
    geracao: () => geracao,
    metricas: () => ({ ...metricas, entradas: cache.size, bytes, pendentes: consultas.size })
  };
}

const graficosPendentesDesempenhoGestor = new Map();
function limparGraficoDesempenhoGestor(id,anterior){
  const pendente=graficosPendentesDesempenhoGestor.get(id);graficosPendentesDesempenhoGestor.delete(id);
  const existentes=new Set([anterior,pendente?.anterior].filter(Boolean));existentes.forEach(g=>g.destroy());return null;
}
const leiturasDesempenhoGestor = new Set(acoesDoTipoGestor('leitura'));
const apiAntesCoordenacaoDesempenhoGestor = window.apiCall;
const coordenadorLeiturasDesempenhoGestor = criarCoordenadorLeiturasGestor({
  executar: (...args) => apiAntesCoordenacaoDesempenhoGestor(...args),
  leituras: leiturasDesempenhoGestor,
  cacheaveis: Object.keys(CATALOGO_ACOES_GESTOR).filter(acao => CATALOGO_ACOES_GESTOR[acao].cacheavel),
  aoInvalidar: () => { if (typeof geracaoLeituraGestor !== 'undefined') geracaoLeituraGestor++; }
});
window.apiCall = function(acao, param, ...extras) {
  const estadoMensal = acao === 'obterRelatorioMes' && cargaMensalDesempenhoGestor?.mes === String(param) ? cargaMensalDesempenhoGestor : null;
  return coordenadorLeiturasDesempenhoGestor.chamar(acao, param, ...extras).then(resultado => {
    if (estadoMensal) setTimeout(() => concluirVisualMensalDesempenhoGestor(estadoMensal, null), 0);
    return resultado;
  }, erro => {
    if (estadoMensal) setTimeout(() => concluirVisualMensalDesempenhoGestor(estadoMensal, erro), 0);
    throw erro;
  });
};
function invalidarLeiturasDesempenhoGestor() { coordenadorLeiturasDesempenhoGestor.invalidar(); }
function obterMetricasDesempenhoGestor() { return coordenadorLeiturasDesempenhoGestor.metricas(); }

// Durante a troca de período, os números e botões do mês anterior ficam
// cobertos e fora do foco. A estrutura mantém sua altura para não saltar.
let cargaMensalDesempenhoGestor = null;
const blocosMensaisDesempenhoGestor = [];
function prepararBlocosMensaisDesempenhoGestor() {
  if (blocosMensaisDesempenhoGestor.length) return;
  const candidatos = [document.getElementById('rel-aberto')?.closest('.grid'), document.getElementById('chartRelatorio')?.closest('.card-glass')];
  for (const bloco of candidatos.filter(Boolean)) {
    const envoltorio = document.createElement('div'); envoltorio.className = 'relative min-w-0';
    const status = document.createElement('div'); status.className = 'absolute inset-0 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-6 text-sm text-slate-200 flex flex-col items-center justify-center gap-3'; status.hidden = true; status.style.display = 'none';
    const texto = document.createElement('p'); texto.className = 'text-center leading-relaxed'; status.append(texto);
    bloco.before(envoltorio); envoltorio.append(bloco, status);
    if (!blocosMensaisDesempenhoGestor.length) status.setAttribute('role', 'status');
    blocosMensaisDesempenhoGestor.push({bloco,status,texto,visibilidade:bloco.style.visibility,inert:bloco.inert,aria:bloco.getAttribute('aria-hidden')});
  }
}
function cobrirValoresMensaisDesempenhoGestor(estado) {
  prepararBlocosMensaisDesempenhoGestor();
  for (const item of blocosMensaisDesempenhoGestor) {
    item.bloco.setAttribute('aria-busy', 'true');
    if (!estado.trocou) continue;
    item.bloco.style.visibility = 'hidden'; item.bloco.inert = true; item.bloco.setAttribute('aria-hidden', 'true');
    item.status.hidden = false; item.status.style.display = 'flex'; item.status.querySelectorAll('button').forEach(b => b.remove());
    item.texto.textContent = 'Conferindo os valores de ' + estado.mes + '…';
  }
}
function concluirVisualMensalDesempenhoGestor(estado, erro) {
  if (cargaMensalDesempenhoGestor !== estado) return;
  const aplicado = !erro && ultimoRelatorioMensalCache?.periodoReferencia === estado.mes;
  if (!aplicado && !erro) return;
  for (const [indice,item] of blocosMensaisDesempenhoGestor.entries()) {
    item.bloco.setAttribute('aria-busy', 'false');
    if (!estado.trocou) continue;
    if (aplicado) {
      item.bloco.style.visibility = item.visibilidade; item.bloco.inert = item.inert;
      if (item.aria === null) item.bloco.removeAttribute('aria-hidden'); else item.bloco.setAttribute('aria-hidden', item.aria);
      item.status.hidden = true; item.status.style.display = 'none';
    } else {
      item.texto.textContent = 'Os valores de ' + estado.mes + ' ainda não estão disponíveis.';
      if (indice === 0 && !item.status.querySelector('button')) {
        const repetir = document.createElement('button'); repetir.type = 'button'; repetir.className = 'rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold text-white'; repetir.textContent = 'Tentar novamente';
        repetir.onclick = () => carregarRelatorioMesUnico(estado.mes); item.status.append(repetir);
      }
    }
  }
  if (aplicado) aplicarGraficosVisiveisDesempenhoGestor();
}
const carregarMensalAntesCoordenacaoDesempenhoGestor = window.carregarRelatorioMesUnico;
if (typeof carregarMensalAntesCoordenacaoDesempenhoGestor === 'function') {
  window.carregarRelatorioMesUnico = function(mes) {
    const estado = {mes: String(mes), trocou: ultimoRelatorioMensalCache?.periodoReferencia !== String(mes)};
    cargaMensalDesempenhoGestor = estado; cobrirValoresMensaisDesempenhoGestor(estado);
    return carregarMensalAntesCoordenacaoDesempenhoGestor(mes);
  };
}

// Vários consumidores podem aguardar a mesma atualização, com um único render.
// Uma gravação que começar ou terminar abre uma nova geração de atualização.
const carregarDadosAntesCoordenacaoGestor = window.carregarDados;
let recargaCoordenadaDesempenhoGestor = null;
window.carregarDados = function(...args) {
  const versao = coordenadorLeiturasDesempenhoGestor.geracao();
  if (recargaCoordenadaDesempenhoGestor?.versao === versao) return recargaCoordenadaDesempenhoGestor.promessa;
  const atual = { versao, promessa: null };
  atual.promessa = Promise.resolve().then(() => carregarDadosAntesCoordenacaoGestor(...args)).finally(() => {
    if (recargaCoordenadaDesempenhoGestor === atual) recargaCoordenadaDesempenhoGestor = null;
  });
  recargaCoordenadaDesempenhoGestor = atual;
  return atual.promessa;
};

function graficoEstaVisivelDesempenhoGestor(canvas) {
  return Boolean(canvas?.isConnected && !canvas.closest('.hidden,[hidden],[aria-hidden="true"]'));
}
const atualizarGraficoAntesCoordenacaoGestor = window.atualizarGraficoGestor;
window.atualizarGraficoGestor = function(anterior, contexto, configuracao) {
  const canvas = contexto?.canvas;
  if (canvas?.id && !graficoEstaVisivelDesempenhoGestor(canvas)) {
    graficosPendentesDesempenhoGestor.set(canvas.id, {anterior, contexto, configuracao});
    return anterior;
  }
  if (canvas?.id) graficosPendentesDesempenhoGestor.delete(canvas.id);
  return atualizarGraficoAntesCoordenacaoGestor(anterior, contexto, configuracao);
};
function aplicarGraficosVisiveisDesempenhoGestor() {
  for (const [id, item] of graficosPendentesDesempenhoGestor) {
    if (!graficoEstaVisivelDesempenhoGestor(item.contexto.canvas)) continue;
    graficosPendentesDesempenhoGestor.delete(id);
    const grafico = atualizarGraficoAntesCoordenacaoGestor(item.anterior, item.contexto, item.configuracao);
    if (id === 'chartCategorias') chartGlobal = grafico;
    if (id === 'chartRelatorio') chartRel = grafico;
    if (id === 'chartAnualBarras') chartAnualObj = grafico;
  }
}
const setAbaAntesCoordenacaoDesempenhoGestor = window.setAba;
window.setAba = function(...args) {
  const retorno = setAbaAntesCoordenacaoDesempenhoGestor(...args);
  aplicarGraficosVisiveisDesempenhoGestor();
  return retorno;
};
// A lista detalhada de terceiros pode ter anos de parcelas. O estado fica em
// emprestimosGlobal; a montagem de cards espera a abertura dessa ferramenta.
const painelEmprestimosAntesCoordenacaoGestor = window.renderizarPainelEmprestimos;
if (typeof painelEmprestimosAntesCoordenacaoGestor === 'function') {
  window.renderizarPainelEmprestimos = function(...args) {
    const view = document.getElementById('subview-emprestimos');
    if (view?.closest('.hidden,[hidden],[aria-hidden="true"]')) return;
    return painelEmprestimosAntesCoordenacaoGestor(...args);
  };
}
window.addEventListener('online', invalidarLeiturasDesempenhoGestor);
window.addEventListener('focus', invalidarLeiturasDesempenhoGestor);
window.addEventListener('storage', evento => {
  if (evento.key === null || evento.key === 'gestorEpocaRestauracaoV1' || evento.key === 'cacheDadosGestorV11' || evento.key?.startsWith('gestorMutacaoV3:')) invalidarLeiturasDesempenhoGestor();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') invalidarLeiturasDesempenhoGestor();
});
