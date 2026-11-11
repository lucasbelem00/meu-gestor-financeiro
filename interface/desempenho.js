// Leituras coordenadas e trabalho visual apenas nas telas que estão abertas.
// O cache é transitório: nunca guarda mutações, prévias financeiras ou backups.
let buscaEmprestimosPendenteGestor=null;
function criarControleResizeHorizonteGestor(opcoes){
  let pequeno=opcoes.largura()<640;
  return function(){const novo=opcoes.largura()<640;if(novo===pequeno)return false;pequeno=novo;if(opcoes.possuiDados())opcoes.renderizar();return true;};
}
function agendarBuscaEmprestimosGestor(){
  clearTimeout(buscaEmprestimosPendenteGestor);
  buscaEmprestimosPendenteGestor=setTimeout(()=>{buscaEmprestimosPendenteGestor=null;renderizarPainelEmprestimos();},160);
}
function criarCoordenadorLeiturasGestor(opcoes) {
  const agora = opcoes.agora || Date.now;
  const ttl = opcoes.ttlMs ?? 15000;
  const limiteEntradas = opcoes.limiteEntradas ?? 8;
  const limiteBytes = opcoes.limiteBytes ?? 1000000;
  const leituras = opcoes.leituras || new Set();
  const cacheaveis = new Set(opcoes.cacheaveis || []);
  const leiturasDeTela=new Set(['filtrarLancamentosWeb','obterAtividadeWeb','obterRecorrenciasWeb']);
  const retentaveisOcupado=new Set(['getDadosCompletos','filtrarLancamentosWeb','obterAtividadeWeb','obterRecorrenciasWeb','obterRelatorioMes','obterRelatorioAnual']);
  const esperar=opcoes.esperar||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
  const cache = new Map(), consultas = new Map();
  const cargasCompletas = new Set();
  const mutacoesPendentes = new Set();
  const consultasHistorico = new Set();
  const esperasConsultas=[];
  function aguardarConsulta(promessas,motivo,retomar){
    const inicio=agora();
    return Promise.allSettled(Array.from(promessas)).then(()=>{
      esperasConsultas.push({motivo,duracaoMs:Math.max(0,agora()-inicio)});
      if(esperasConsultas.length>20)esperasConsultas.shift();
      return retomar();
    });
  }
  let respostaCompletaAtual = null;
  let atualizacaoConfirmada = null, historicoConfirmado = null;
  const metricas = { envios: 0, compartilhadas: 0, cache: 0, descartadas: 0, invalidacoes: 0, atualizacoesConfirmadas: 0, filtrosSuperados:0, ocupadas:0, retentativasOcupado:0, ocupadasEsgotadas:0 };
  const motivosInvalidacao = new Set(['externa','mutacao_inicio','mutacao_fim','carga_completa','online','foco','armazenamento','visivel']);
  const invalidacoesPorMotivo = {}, ultimasInvalidacoes = [], ultimosDescartes = [];
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
  function invalidar(motivo = 'externa') {
    geracao++;
    metricas.invalidacoes++;
    motivo=motivosInvalidacao.has(motivo)?motivo:'externa';
    invalidacoesPorMotivo[motivo]=(invalidacoesPorMotivo[motivo]||0)+1;
    ultimasInvalidacoes.push({instante:agora(),geracao,motivo});if(ultimasInvalidacoes.length>20)ultimasInvalidacoes.shift();
    cache.clear(); bytes = 0;
    respostaCompletaAtual = null;
    atualizacaoConfirmada = null;historicoConfirmado=null;
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
  function consultar(acao, param, extras, repeticoes = 0, continuar = null, tentativasOcupadas = 0) {
    if(continuar&&!continuar()){metricas.filtrosSuperados++;const e=new Error('Consulta substituída pela navegação ou por outro filtro.');e.codigo='CONSULTA_SUBSTITUIDA';return Promise.reject(e);}
    // Somente leituras de tela aguardam retorno; protocolo e mutações seguem livres.
    if(leiturasDeTela.has(acao)||cacheaveis.has(acao)){
      const visibilidade=opcoes.aguardarVisibilidade?.();
      if(visibilidade)return aguardarConsulta([visibilidade],'tela_oculta',()=>consultar(acao,param,extras,repeticoes,continuar,tentativasOcupadas));
    }
    // Histórico não disputa a trava com a edição já enviada nesta aba.
    // Não bloquear consultas internas de protocolo/confirmação da mutação.
    if(leiturasDeTela.has(acao)&&mutacoesPendentes.size){
      return aguardarConsulta(mutacoesPendentes,'gravacao',()=>consultar(acao,param,extras,repeticoes,continuar,tentativasOcupadas));
    }
    // A resposta da carga completa invalida relatórios. Se ela já está em
    // andamento, esperar antes de enviar evita uma consulta descartada e refeita.
    if ((cacheaveis.has(acao)||leiturasDeTela.has(acao)) && cargasCompletas.size) {
      return aguardarConsulta(cargasCompletas,'carga_completa',() => consultar(acao, param, extras, repeticoes,continuar,tentativasOcupadas));
    }
    const versao = geracao, chave = acao + ':' + chaveEstavel(param) + ':' + chaveEstavel(extras);
    // Uma leitura já enviada pode continuar no Google. As próximas aguardam
    // seu término; filtros visuais superados são descartados antes de enviar.
    if(acao==='filtrarLancamentosWeb'&&consultasHistorico.size&&!consultas.has(versao+':'+chave)){
      return aguardarConsulta(consultasHistorico,'historico',()=>consultar(acao,param,extras,repeticoes,continuar,tentativasOcupadas));
    }
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
          invalidar('carga_completa'); versaoResposta = geracao;
        }
        const resposta = { valor, instante: agora(), versaoResposta };
        // Só auxilia leitores antigos ainda em voo. Uma chamada nova continua
        // consultando a rede, sem cache de resultado para getDadosCompletos.
        if(acao==='getDadosCompletos'&&versaoResposta===geracao&&cargasCompletas.size>1&&valor&&!valor.erro&&!valor.error&&!valor.integridade?.bloqueada){
          respostaCompletaAtual={chave,resposta};
        }
        return resposta;
      });
      consultas.set(chaveEnvio, promessa);
      if(acao==='filtrarLancamentosWeb'){
        consultasHistorico.add(promessa);
        promessa.then(()=>consultasHistorico.delete(promessa),()=>consultasHistorico.delete(promessa));
      }
      if(acao==='getDadosCompletos'){
        cargasCompletas.add(promessa);
        promessa.then(()=>cargasCompletas.delete(promessa),()=>cargasCompletas.delete(promessa));
      }
      promessa.then(() => { if (consultas.get(chaveEnvio) === promessa) consultas.delete(chaveEnvio); }, () => { if (consultas.get(chaveEnvio) === promessa) consultas.delete(chaveEnvio); });
    }
    return promessa.then(({valor, instante, versaoResposta}) => {
      if(continuar&&!continuar()){metricas.filtrosSuperados++;const e=new Error('Consulta substituída pela navegação ou por outro filtro.');e.codigo='CONSULTA_SUBSTITUIDA';throw e;}
      if (versaoResposta !== geracao) {
        metricas.descartadas++;
        ultimosDescartes.push({instante:agora(),acao,geracaoConsulta:versao,geracaoAtual:geracao});if(ultimosDescartes.length>10)ultimosDescartes.shift();
        if(acao==='getDadosCompletos'&&respostaCompletaAtual?.chave===chave&&respostaCompletaAtual.resposta.versaoResposta===geracao){
          metricas.compartilhadas++;
          const atual=respostaCompletaAtual.resposta;
          return resultado(atual.valor,atual.instante,'rede',acao);
        }
        // Não repete uma falha de rede nem qualquer gravação. Só refaz uma
        // leitura bem-sucedida que atravessou uma alteração dos dados.
        if (repeticoes < 2) return consultar(acao, param, extras, repeticoes + 1,continuar,tentativasOcupadas);
        const erro = new Error('Os dados mudaram durante a consulta. Atualize novamente para conferir a versão atual.');
        erro.codigo = 'LEITURA_SUBSTITUIDA'; throw erro;
      }
      if (podeCache && valor && !valor.erro && !valor.error && !valor.integridade?.bloqueada) {
        try { guardar(chave, valor, instante); } catch (_) {}
      }
      return resultado(valor, instante, 'rede', acao);
    }).catch(async erro=>{
      if(erro?.codigo!=='SERVICO_OCUPADO'||!retentaveisOcupado.has(acao))throw erro;
      metricas.ocupadas++;
      const vigente=()=> (!continuar||continuar())&&(!opcoes.podeRetomar||opcoes.podeRetomar(acao));
      if(!vigente()){const cancelada=new Error('Consulta substituída.');cancelada.codigo='CONSULTA_SUBSTITUIDA';throw cancelada;}
      if(tentativasOcupadas>=2){metricas.ocupadasEsgotadas++;throw erro;}
      const pausa=[1200,2500][tentativasOcupadas],inicio=agora();
      try{opcoes.aoOcupado?.(acao,tentativasOcupadas+1);}catch(_){}
      await esperar(pausa);
      esperasConsultas.push({motivo:'planilha_ocupada',duracaoMs:Math.max(0,agora()-inicio)});if(esperasConsultas.length>20)esperasConsultas.shift();
      if(!vigente()){const cancelada=new Error('Consulta substituída.');cancelada.codigo='CONSULTA_SUBSTITUIDA';throw cancelada;}
      metricas.retentativasOcupado++;
      return consultar(acao,param,extras,repeticoes,continuar,tentativasOcupadas+1);
    }).finally(()=>{if(acao==='getDadosCompletos'&&!cargasCompletas.size)respostaCompletaAtual=null;});
  }
  function chamar(acao, param, ...extras) {
    if (leituras.has(acao)) {
      try { return consultar(acao, copiar(param), extras.map(copiar)); }
      catch (erro) { return Promise.reject(erro); }
    }
    invalidar('mutacao_inicio');
    const versaoInicio=geracao;let respostaConfirmada;
    const mutacao=Promise.resolve().then(() => opcoes.executar(acao, param, ...extras)).then(res=>{respostaConfirmada=res;return res;}).finally(()=>{
      const mesmaGeracao=geracao===versaoInicio;
      invalidar('mutacao_fim');
      // O servidor só acrescenta este snapshot depois de confirmar a gravação.
      // Qualquer outra alteração/retomada durante o envio exige consulta normal.
      try{
        const snapshot=respostaConfirmada?.atualizacaoDados,d=snapshot?.dados;
        if(mesmaGeracao&&!respostaConfirmada?.integridade?.bloqueada&&param?.incluirAtualizacaoDados===true&&['salvarLancamentoWeb','editarLancamentoLinhaWeb','salvarCategoriasWeb','excluirLancamentoWeb','registrarPagamentoFaturaWeb','alternarStatusEmprestimoWeb','dividirParcelaEmprestimoWeb','salvarFormaPagamentoWeb'].includes(acao)&&snapshot?.versao===1&&
          d&&typeof d==='object'&&!Array.isArray(d)&&Number(d.protocoloGestor)>=18&&!d.erro&&!d.error&&
          d.integridade&&d.integridade.bloqueada===false&&typeof d.epocaRestauracao==='string'&&
          d.kpis&&d.faturas&&Array.isArray(d.lancamentos)&&Array.isArray(d.formasPagamento)&&
          Array.isArray(d.configCategorias)&&Array.isArray(d.emprestimos?.itens)&&d.versoesConfiguracao){
          const serializado=JSON.stringify(d);
          if(serializado.length*2<=limiteBytes)atualizacaoConfirmada={geracao,instante:agora(),dados:JSON.parse(serializado),historico:copiar(snapshot.historico)};
        }
      }catch(_){/* Acessório opcional nunca transforma confirmação em erro. */}
    });
    mutacoesPendentes.add(mutacao);
    mutacao.then(()=>mutacoesPendentes.delete(mutacao),()=>mutacoesPendentes.delete(mutacao));
    return mutacao;
  }
  return {
    chamar, invalidar,
    consultarHistorico:(param,continuar)=>consultar('filtrarLancamentosWeb',copiar(param),[],0,continuar),
    consumirAtualizacaoConfirmada:()=>{
      const item=atualizacaoConfirmada;atualizacaoConfirmada=null;
      if(!item||item.geracao!==geracao||mutacoesPendentes.size||agora()-item.instante<0||agora()-item.instante>=ttl)return null;
      historicoConfirmado=item.historico?{...item.historico,geracao,instante:item.instante}:null;
      return copiar(item.dados);
    },
    consumirHistoricoConfirmado:param=>{
      const item=historicoConfirmado;historicoConfirmado=null;
      if(!item||item.geracao!==geracao||mutacoesPendentes.size||agora()-item.instante<0||agora()-item.instante>=ttl)return null;
      if(chaveEstavel(item.consulta)!==chaveEstavel(param))return null;
      const r=item.resposta;if(!r||!Array.isArray(r.itens)||r.itens.length>50||!(typeof r.versaoConsulta==='string'||r.versaoConsulta===null&&item.requerReconsultaPaginacao===true)||!Number.isInteger(r.qtdTotal)||r.qtdTotal<0)return null;
      historicoConfirmado=null;metricas.historicosConfirmados=(metricas.historicosConfirmados||0)+1;return copiar(r);
    },
    registrarAtualizacaoConfirmada:()=>{metricas.atualizacoesConfirmadas++;},
    // Só recargas visuais usam esta espera. A API de confirmação/protocolo
    // continua livre para evitar dependência circular dentro das gravações.
    aguardarMutacoes: () => mutacoesPendentes.size ? Promise.allSettled(Array.from(mutacoesPendentes)) : null,
    geracao: () => geracao,
    metricas: () => ({ ...metricas, versaoInterface:'v181', esperasConsultas:copiar(esperasConsultas), invalidacoesPorMotivo:{...invalidacoesPorMotivo}, ultimasInvalidacoes:copiar(ultimasInvalidacoes), ultimosDescartes:copiar(ultimosDescartes), entradas: cache.size, bytes, pendentes: consultas.size })
  };
}

const graficosPendentesDesempenhoGestor = new Map();
function limparGraficoDesempenhoGestor(id,anterior){
  const pendente=graficosPendentesDesempenhoGestor.get(id);graficosPendentesDesempenhoGestor.delete(id);
  const existentes=new Set([anterior,pendente?.anterior].filter(Boolean));existentes.forEach(g=>g.destroy());return null;
}
const leiturasDesempenhoGestor = new Set(acoesDoTipoGestor('leitura'));
const apiAntesCoordenacaoDesempenhoGestor = window.apiCall;
function consultaOcupadaAindaVisivelGestor(acao){
  if(document.visibilityState==='hidden')return false;
  const abas={filtrarLancamentosWeb:'lancamentos',obterAtividadeWeb:'atividade',obterRecorrenciasWeb:'assinaturas',obterRelatorioMes:'relatorio',obterRelatorioAnual:'anual'};
  if(typeof abaAtivaAtual!=='undefined'&&abas[acao]&&abaAtivaAtual!==abas[acao])return false;
  return acao!=='obterAtividadeWeb'||typeof painelAtividadeGestor==='undefined'||painelAtividadeGestor==='historico';
}
function avisarEsperaConsultaGestor(acao){
  const texto='Aguardando outra operação na planilha… A consulta será repetida automaticamente.';
  if(acao==='filtrarLancamentosWeb'&&typeof informarEstadoConsultaHistoricoGestor==='function')informarEstadoConsultaHistoricoGestor(texto);
  const id={obterAtividadeWeb:'estadoHistoricoAtividade',obterRecorrenciasWeb:'estadoModelosRecorrenciaGestor'}[acao];
  const e=id&&document.getElementById?.(id);if(e)e.textContent=texto;
}
let esperaVisibilidadeConsultaGestor=null,liberarVisibilidadeConsultaGestor=null;
function aguardarVisibilidadeConsultaGestor(){
  if(document.visibilityState!=='hidden')return null;
  if(!esperaVisibilidadeConsultaGestor)esperaVisibilidadeConsultaGestor=new Promise(resolve=>{liberarVisibilidadeConsultaGestor=resolve;});
  return esperaVisibilidadeConsultaGestor;
}
function retomarVisibilidadeConsultaGestor(){
  if(document.visibilityState!=='visible')return;
  const liberar=liberarVisibilidadeConsultaGestor;esperaVisibilidadeConsultaGestor=null;liberarVisibilidadeConsultaGestor=null;liberar?.();
}
const coordenadorLeiturasDesempenhoGestor = criarCoordenadorLeiturasGestor({
  aguardarVisibilidade:aguardarVisibilidadeConsultaGestor,
  podeRetomar:consultaOcupadaAindaVisivelGestor,aoOcupado:avisarEsperaConsultaGestor,
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
function invalidarLeiturasDesempenhoGestor(motivo) { coordenadorLeiturasDesempenhoGestor.invalidar(motivo); }
function obterMetricasDesempenhoGestor() { return coordenadorLeiturasDesempenhoGestor.metricas(); }
let retomarFiltroHistoricoGestor=false;
function capturarHistoricoAtualizacaoGestor(){
  if(typeof abaAtivaAtual==='undefined'||abaAtivaAtual!=='lancamentos'||typeof offsetAtual==='undefined'||offsetAtual!==0||typeof filtrosAtuais==='undefined')return null;
  const filtros=JSON.parse(JSON.stringify(filtrosAtuais));delete filtros.versaoConsulta;return {filtros,offset:0,limite:50};
}
function consumirHistoricoAtualizacaoGestor(param){return coordenadorLeiturasDesempenhoGestor.consumirHistoricoConfirmado(param);}
let consultaHistoricoAplicadaGestor=null;
function chaveFiltrosHistoricoEntradaGestor(f){const c={...f};delete c.versaoConsulta;return JSON.stringify(c);}
function registrarConsultaHistoricoAplicadaGestor(f){consultaHistoricoAplicadaGestor={chave:chaveFiltrosHistoricoEntradaGestor(f),geracao:typeof geracaoLeituraGestor==='undefined'?0:geracaoLeituraGestor,instante:Date.now()};}
function atualizarHistoricoAoEntrarGestor(){
  if(typeof retomarFiltroHistoricoGestor!=='undefined')retomarFiltroHistoricoGestor=false;
  if(typeof estadoIntegracaoInterfaceGestor!=='undefined'&&estadoIntegracaoInterfaceGestor.pxPaginaHistoricoEmAndamento)return;
  const c=consultaHistoricoAplicadaGestor,lista=document.getElementById('lista-lancamentos'),idade=c?Date.now()-c.instante:-1;
  if(c&&idade>=0&&idade<15000&&c.geracao===(typeof geracaoLeituraGestor==='undefined'?0:geracaoLeituraGestor)&&c.chave===chaveFiltrosHistoricoEntradaGestor(filtrosAtuais)&&!lista?.inert)return;
  chamarFiltroBackend(false,true);
}
function consultarHistoricoVisivelGestor(param,continuar){
  if(typeof abaAtivaAtual!=='undefined'&&abaAtivaAtual==='lancamentos')retomarFiltroHistoricoGestor=false;
  return coordenadorLeiturasDesempenhoGestor.consultarHistorico(param,()=>continuar()&&(typeof abaAtivaAtual==='undefined'||abaAtivaAtual==='lancamentos')).catch(e=>{
    const fora=typeof abaAtivaAtual!=='undefined'&&abaAtivaAtual!=='lancamentos';
    if(fora)retomarFiltroHistoricoGestor=true;
    if(fora||!continuar()){const cancelada=new Error('Consulta substituída.');cancelada.codigo='CONSULTA_SUBSTITUIDA';throw cancelada;}
    throw e;
  });
}
const geracoesAtualizacaoRecargaGestor=new WeakMap();
function validarAtualizacaoDadosRecargaGestor(dados){
  const geracao=geracoesAtualizacaoRecargaGestor.get(dados);
  return geracao===undefined||geracao===coordenadorLeiturasDesempenhoGestor.geracao();
}
function concluirAtualizacaoDadosRecargaGestor(dados){
  if(!geracoesAtualizacaoRecargaGestor.has(dados)||!validarAtualizacaoDadosRecargaGestor(dados))return;
  geracoesAtualizacaoRecargaGestor.delete(dados);
  coordenadorLeiturasDesempenhoGestor.registrarAtualizacaoConfirmada();
  try{
    if(typeof registrarDiagnosticoAtividadeGestor==='function')registrarDiagnosticoAtividadeGestor('atualizacaoDadosConfirmada',null,0);
    if(typeof gravarArmazenamentoGestor==='function')gravarArmazenamentoGestor('gestorUltimaAtualizacaoV1',JSON.stringify(Date.now()));
  }catch(_){/* Diagnóstico opcional não invalida a atualização já aplicada. */}
}

// Somente a recarga visual pode consumir a resposta da gravação. Consultas
// internas de protocolo, confirmação e API direta continuam consultando a rede.
function consultarDadosRecargaGestor(){
  const dados=coordenadorLeiturasDesempenhoGestor.consumirAtualizacaoConfirmada();
  if(dados){
    try{
      if(typeof receberEstadoDadosCompletosGestor!=='function')throw Error('Ingestão indisponível');
      receberEstadoDadosCompletosGestor(dados);
      geracoesAtualizacaoRecargaGestor.set(dados,coordenadorLeiturasDesempenhoGestor.geracao());
      return Promise.resolve(dados);
    }catch(_){/* Falha na ingestão opcional recorre à consulta completa normal. */}
  }
  return apiCall('getDadosCompletos');
}

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
  const mutacoes = coordenadorLeiturasDesempenhoGestor.aguardarMutacoes();
  if(mutacoes)return mutacoes.then(()=>window.carregarDados(...args));
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
  if(args[0]==='lancamentos')Promise.resolve().then(()=>{
    if(retomarFiltroHistoricoGestor&&abaAtivaAtual==='lancamentos'&&typeof chamarFiltroBackend==='function'){
      retomarFiltroHistoricoGestor=false;chamarFiltroBackend(false,true);
    }
  });
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
window.addEventListener('online',()=>{invalidarLeiturasDesempenhoGestor('online');const aviso=document.getElementById('avisoLeituraDadosGestor');revalidadorDiaGestor.verificar(aviso?.hidden===false);});
// Foco e visibilidade descrevem a mesma retomada. Só uma saída observada
// abre outro ciclo; não há janela de tempo que possa ocultar uma saída real.
function criarControleRetomadaGestor(opcoes){
  let afastado=opcoes.afastado();
  return {
    sair:()=>{afastado=true;},
    retomar:motivo=>{
      if(!afastado||!opcoes.visivel())return false;
      afastado=false;opcoes.retornar(motivo);return true;
    }
  };
}
const controleRetomadaGestor=criarControleRetomadaGestor({
  afastado:()=>document.visibilityState!=='visible'||(typeof document.hasFocus==='function'&&!document.hasFocus()),
  visivel:()=>document.visibilityState==='visible',
  retornar:motivo=>{invalidarLeiturasDesempenhoGestor(motivo);revalidadorDiaGestor.verificar();}
});
window.addEventListener('blur',()=>controleRetomadaGestor.sair());
window.addEventListener('focus',()=>controleRetomadaGestor.retomar('foco'));
window.addEventListener('storage', evento => {
  if (evento.key === null || evento.key === 'gestorEpocaRestauracaoV1' || evento.key === 'cacheDadosGestorV11' || evento.key?.startsWith('gestorMutacaoV3:')) invalidarLeiturasDesempenhoGestor('armazenamento');
});
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState==='hidden')controleRetomadaGestor.sair();
  else if(document.visibilityState==='visible'){controleRetomadaGestor.retomar('visivel');retomarVisibilidadeConsultaGestor();}
});

// Revalida o dia ao retomar as telas de consulta, sem recarregar o aplicativo
// nem interromper formulários e modais em edição. Falhas permitem nova tentativa.
function criarRevalidadorDiaGestor(opcoes){
  const agora=opcoes.agora||(()=>new Date()),dia=opcoes.dia||(d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate());
  let conferido=dia(agora()),pendente=null,proximaTentativa=0;
  function verificar(forcar=false){
    const hoje=agora(),chave=dia(hoje);
    if((chave===conferido&&!forcar)||!opcoes.permitir())return Promise.resolve(false);
    if(pendente)return pendente;
    if(!opcoes.online()){opcoes.estado('Os dados podem ser do dia anterior. Conecte-se para atualizar.');return Promise.resolve(false);}
    if(hoje.getTime()<proximaTentativa)return Promise.resolve(false);
    proximaTentativa=hoje.getTime()+60000;opcoes.estado('Atualizando os dados do novo dia…');
    pendente=Promise.resolve().then(()=>opcoes.carregar()).then(ok=>{
      if(ok===false)throw Error('Consulta não atualizada');
      conferido=chave;proximaTentativa=0;opcoes.estado('');return true;
    }).catch(()=>{opcoes.estado('Os dados do novo dia ainda não foram atualizados. Confira a conexão e tente atualizar novamente; o servidor também pode estar temporariamente indisponível.');return false;}).finally(()=>{pendente=null;});
    return pendente;
  }
  return {verificar};
}
const revalidadorDiaGestor=criarRevalidadorDiaGestor({
  agora:()=>new Date(typeof instanteCivilGestor==='function'?instanteCivilGestor():Date.now()),
  dia:d=>typeof dataCivilISOGestor==='function'?dataCivilISOGestor():d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),
  permitir:()=>document.visibilityState==='visible'&&typeof abaAtivaAtual!=='undefined'&&['dashboard','agenda'].includes(abaAtivaAtual)&&!document.querySelector('[role="dialog"]:not(.hidden):not([hidden])'),
  online:()=>navigator.onLine,
  carregar:()=>carregarDados(),
  estado:texto=>{for(const id of ['estadoNovoDiaPainelGestor','estadoNovoDiaAgendaGestor']){const e=document.getElementById(id);if(e){e.textContent=texto;e.hidden=!texto;}}}
});
const abaAntesRevalidacaoDiaGestor=window.setAba;
window.setAba=function(...args){const r=abaAntesRevalidacaoDiaGestor(...args);revalidadorDiaGestor.verificar();return r;};
document.addEventListener('DOMContentLoaded',()=>{
  for(const [view,id]of [['dashboard','estadoNovoDiaPainelGestor'],['agenda','estadoNovoDiaAgendaGestor']]){
    const pai=document.getElementById('view-'+view);if(!pai)continue;const e=document.createElement('p');e.id=id;e.hidden=true;e.className='text-sm text-amber-200';e.setAttribute('role','status');pai.prepend(e);
  }
  setInterval(()=>revalidadorDiaGestor.verificar(),60000);
});

// Chamado somente ao montar diagnóstico, sem copiar conteúdo ou nomes de chaves.
function diagnosticoArmazenamentoGestor(){
 try{
  const grupos={fila:{chaves:0,bytesEstimados:0},revisoes:{chaves:0,bytesEstimados:0},rascunhos:{chaves:0,bytesEstimados:0},notas:{chaves:0,bytesEstimados:0},envios:{chaves:0,bytesEstimados:0},caches:{chaves:0,bytesEstimados:0},outros:{chaves:0,bytesEstimados:0}};
  let bytesEstimados=0,chaves=0;
  for(let i=0;i<localStorage.length;i++){
   const chave=localStorage.key(i);if(chave===null)continue;const valor=localStorage.getItem(chave);if(valor===null)continue;
   const grupo=/^(gestorFilaItemV2:|gestorFilaOrdemV1:|filaOfflineGestor$)/.test(chave)?'fila':/^gestorFilaRevisaoV1:/.test(chave)?'revisoes':/^gestorRascunho/.test(chave)?'rascunhos':/^(gestorNota|notasLocais)/.test(chave)?'notas':/^gestor(Mutacao|EmprestimoPendente|Cancelamento)/.test(chave)?'envios':/^(cacheDadosGestorV11$|gestorHistoricoCacheV1$)/.test(chave)?'caches':'outros';
   const bytes=2*(chave.length+valor.length);grupos[grupo].chaves++;grupos[grupo].bytesEstimados+=bytes;bytesEstimados+=bytes;chaves++;
  }
  return {disponivel:true,criterio:'Estimativa UTF-16; não mede a cota nem o espaço livre do navegador',chaves,bytesEstimados,grupos};
 }catch(_){return {disponivel:false};}
}
