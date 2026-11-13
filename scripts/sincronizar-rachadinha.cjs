const fs=require('node:fs'),path=require('node:path');
function sincronizarMotor(){
  // Monta todos os blocos antes de gravar cada destino uma unica vez.
  const pendentes=new Map();
  const ler=(arquivo,codificacao)=>pendentes.has(path.resolve(arquivo))?pendentes.get(path.resolve(arquivo)):fs.readFileSync(arquivo,codificacao);
  const guardar=(arquivo,conteudo)=>pendentes.set(path.resolve(arquivo),conteudo);
  for(const nome of ['index.html','Backend/Code.gs']){
    const arquivo=path.resolve(__dirname,'..',nome),fonte=ler(arquivo,'utf8'),ini='// INICIO DICIONARIO PT GERADO',fim='// FIM DICIONARIO PT GERADO';
    if(fonte.split(ini).length!==2||fonte.split(fim).length!==2)throw Error('Dicionário compartilhado ausente ou repetido: '+nome);
    guardar(arquivo,fonte.slice(0,fonte.indexOf(ini))+ini+'\n'+ler(path.resolve(__dirname,'../shared/portugues.js'),'utf8').trim()+'\n'+fonte.slice(fonte.indexOf(fim)));
  }
  for(const n of ['index.html','Backend/Code.gs']){const s=ler(path.resolve(__dirname,'..',n),'utf8');for(const marcador of ['// INICIO COMPETENCIAS GERADAS','// INICIO MOTOR RACHADINHA GERADO'])if(s.split(marcador).length!==2)throw Error('Bloco compartilhado ausente ou repetido: '+marcador+' em '+n);}
  const raiz=path.resolve(__dirname,'..'), motor=ler(path.join(raiz,'shared/rachadinha.js'),'utf8').trim();
  for(const nome of ['index.html','Backend/Code.gs']){
    const arquivo=path.join(raiz,nome),fonte=ler(arquivo,'utf8');
    const inicio='// INICIO MOTOR RACHADINHA GERADO',fim='// FIM MOTOR RACHADINHA GERADO';
    if(!fonte.includes(inicio)||!fonte.includes(fim)) throw Error('Marcador do motor não encontrado: '+nome);
    guardar(arquivo,fonte.slice(0,fonte.indexOf(inicio))+inicio+'\n'+motor+'\n'+fonte.slice(fonte.indexOf(fim)));
  }
  for(const nome of ['index.html','Backend/Code.gs']){
    const arquivo=path.join(raiz,nome),fonte=ler(arquivo,'utf8'),inicio='// INICIO COMPETENCIAS GERADAS',fim='// FIM COMPETENCIAS GERADAS';
    if(!fonte.includes(inicio)||!fonte.includes(fim))throw Error('Marcador de competências não encontrado: '+nome);
    guardar(arquivo,fonte.slice(0,fonte.indexOf(inicio))+inicio+'\n'+ler(path.join(raiz,'shared/competencias.js'),'utf8').trim()+'\n'+fonte.slice(fonte.indexOf(fim)));
  }
  const arquivoSituacoes=path.join(raiz,'interface/situacoes.js'),situacoes=ler(arquivoSituacoes,'utf8');
  const inicioCalendario='// INICIO CALENDARIO BANCARIO GERADO',fimCalendario='// FIM CALENDARIO BANCARIO GERADO';
  if(situacoes.split(inicioCalendario).length!==2||situacoes.split(fimCalendario).length!==2)throw Error('Calendário bancário ausente ou duplicado.');
  guardar(arquivoSituacoes,situacoes.slice(0,situacoes.indexOf(inicioCalendario))+inicioCalendario+'\n'+ler(path.join(raiz,'shared/calendario-bancario.js'),'utf8').trim()+'\n'+situacoes.slice(situacoes.indexOf(fimCalendario)));
  const arquivo=path.join(raiz,'index.html');let html=ler(arquivo,'utf8');
  const relIni='// INICIO RELOGIO CIVIL GERADO',relFim='// FIM RELOGIO CIVIL GERADO';
  if(html.split(relIni).length!==2||html.split(relFim).length!==2)throw Error('Relógio civil ausente ou repetido.');
  html=html.slice(0,html.indexOf(relIni))+relIni+'\n'+ler(path.join(raiz,'shared/relogio-civil.js'),'utf8').trim()+'\n'+ler(path.join(raiz,'interface/relogio.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(relFim));
  const logoInicio='<!-- INICIO ICONE GESTOR GERADO -->',logoFim='<!-- FIM ICONE GESTOR GERADO -->';
  if(html.includes(logoInicio)){
    const logo=ler(path.join(raiz,'icons/gestor.svg'),'utf8').trim().replace('<svg ','<svg aria-hidden="true" focusable="false" class="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/20 shrink-0" ');
    html=html.slice(0,html.indexOf(logoInicio))+logoInicio+'\n'+logo+'\n'+html.slice(html.indexOf(logoFim));
  }
  const catInicio='// INICIO CATALOGO ACOES GERADO',catFim='// FIM CATALOGO ACOES GERADO';
  if(html.includes(catInicio))html=html.slice(0,html.indexOf(catInicio))+catInicio+'\n'+ler(path.join(raiz,'shared/acoes.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(catFim));
  for(const nome of ['botoes','perfil','compartilhamento','rachadinha','sincronizacao','situacoes','usabilidade','retomada','rotina','faturas','painel','agenda','planejamento','recorrencias','desempenho','restauracao','navegacao','modais','conferencia','envios','protecao']){
    const inicio='// INICIO INTERFACE '+nome.toUpperCase()+' GERADA',fim='// FIM INTERFACE '+nome.toUpperCase()+' GERADA';
    if(!html.includes(inicio)||!html.includes(fim))throw Error('Marcador da interface não encontrado: '+nome);
    html=html.slice(0,html.indexOf(inicio))+inicio+'\n'+ler(path.join(raiz,'interface',nome+'.js'),'utf8').trim()+'\n'+html.slice(html.indexOf(fim));
  }
  guardar(arquivo,html);
  const backend=path.join(raiz,'Backend/Code.gs');let codigo=ler(backend,'utf8');
  for(const nome of ['preferencias','recorrencias','calendario-bancario','perfil-gastos','retomar-fixo','pular-fixo','planejamento','datas-recuperacao','notas-backup','anual','apresentacao-anual','relatorios','ativacao']){
    const fonteLocal=path.join(raiz,'shared',nome+'.js');if(!fs.existsSync(fonteLocal))continue;
    const ini='// INICIO MODULO '+nome.toUpperCase()+' GERADO',fimLocal='// FIM MODULO '+nome.toUpperCase()+' GERADO',conteudo=ler(fonteLocal,'utf8').trim();
    codigo=codigo.includes(ini)?codigo.slice(0,codigo.indexOf(ini))+ini+'\n'+conteudo+'\n'+codigo.slice(codigo.indexOf(fimLocal)):codigo+'\n'+ini+'\n'+conteudo+'\n'+fimLocal+'\n';
  }
  const inicio='// INICIO PROTECAO GERADA',fim='// FIM PROTECAO GERADA',fonte=ler(path.join(raiz,'shared/protecao.js'),'utf8').trim();
  if(codigo.includes(inicio))codigo=codigo.slice(0,codigo.indexOf(inicio))+inicio+'\n'+fonte+'\n'+codigo.slice(codigo.indexOf(fim));
  else codigo+='\n'+inicio+'\n'+fonte+'\n'+fim+'\n';
  guardar(backend,codigo);
  // A lista fica literal nos artefatos para manter os normalizadores autônomos.
  const camposMetricas=JSON.stringify(require('../shared/metricas-diagnostico.cjs'));
  for(const nome of ['index.html','Backend/Code.gs']){
    const arquivo=path.join(raiz,nome),conteudo=ler(arquivo,'utf8');
    const padrao=nome==='index.html'?/for\(const campo of \[[^\n]+?\]\)/:/if\(detalhes\)for\(const k of \[[^\n]+?\]\)/;
    if(!padrao.test(conteudo))throw Error('Lista de métricas ausente: '+nome);
    guardar(arquivo,conteudo.replace(padrao,nome==='index.html'?'for(const campo of '+camposMetricas+')':'if(detalhes)for(const k of '+camposMetricas+')'));
  }
  for(const [destino,conteudo] of pendentes){
    for(let tentativa=0;;tentativa++){
      try{fs.writeFileSync(destino,conteudo);break;}
      catch(erro){if(!['EBUSY','EPERM'].includes(erro.code)||tentativa>=5)throw erro;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
    }
  }
}
if(require.main===module)sincronizarMotor();
module.exports={sincronizarMotor};
