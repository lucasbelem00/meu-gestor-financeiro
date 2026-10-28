// Interface da proteção de longo prazo; não instala rotinas sem ação explícita.
function detalheFechamentoAnualGestor(estado){
  if(!estado)return '';
  const titulo='Ano '+estado.ano+' · '+(estado.incluidoDepois?'incluído após fechamento':estado.alteradoDepois?'atualizado após fechamento':'retrato preservado');
  const texto=estado.incluidoDepois?'Este registro foi incluído depois do fechamento. A planilha fechada permanece preservada.':'No fechamento: '+formatBRL(estado.pagoBancoNoFechamento||0)+' pagos ao banco'+(estado.recebidoNoFechamento===null?'':estado.recebidoNoFechamento?' · recebido da pessoa':' · ainda a receber da pessoa')+'. Os valores e a situação atuais aparecem neste cartão. Movimentos posteriores ficam vinculados no controle.';
  return '<details class="text-xs text-slate-300 mt-2"><summary class="cursor-pointer py-1">'+escaparHTML(titulo)+'</summary><p class="pt-1">'+escaparHTML(texto)+'</p></details>';
}
let arquivosAnuaisUIProtecaoGestor=[],emprestimosArquivoUIProtecaoGestor=[],chaveEmprestimosArquivoUIProtecaoGestor='',pedidoEmprestimosArquivoUIProtecaoGestor=null,geracaoArquivosUIProtecaoGestor=0;
function itensEmprestimosConsultaProtecaoGestor(){
  const ativos=emprestimosGlobal.itens||[],status=document.getElementById('selFiltroStatusEmp')?.value;
  return status==='A Receber'?ativos:ativos.concat(emprestimosArquivoUIProtecaoGestor);
}
function restaurarFiltrosIniciaisEmpGestor(){
  for(const id of ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','inpBuscaEmp']){const e=document.getElementById(id);if(e)e.value='';}
  const status=document.getElementById('selFiltroStatusEmp');if(status)status.value='A Receber';renderizarPainelEmprestimos();
}
function filtrosIniciaisEmpGestor(){return ['selFiltroMesEmp','selFiltroPessoaEmp','selFiltroFormaEmp','inpBuscaEmp'].every(id=>!document.getElementById(id)?.value)&&document.getElementById('selFiltroStatusEmp')?.value==='A Receber';}
function atualizarAtalhoFiltrosProtecaoGestor(){
  const box=document.getElementById('listaResumoPessoasEmp');if(!box)return;
  let b=document.getElementById('btnRestaurarFiltrosEmpGestor');if(!b){b=document.createElement('button');b.id='btnRestaurarFiltrosEmpGestor';b.type='button';b.textContent='Voltar ao padrão';b.className='mb-3 rounded-lg border border-slate-500 px-3 py-2 text-xs font-bold text-slate-200';b.setAttribute('aria-label','Voltar aos filtros iniciais: todos os meses a receber');b.onclick=restaurarFiltrosIniciaisEmpGestor;box.before(b);}b.hidden=filtrosIniciaisEmpGestor();
}
function solicitarEmprestimosArquivoProtecaoGestor(){
  const view=document.getElementById('subview-emprestimos'),status=document.getElementById('selFiltroStatusEmp')?.value;
  if(!arquivosAnuaisUIProtecaoGestor.length||status==='A Receber'||document.getElementById('painelConsultaEmprestimo')?.hidden||view?.closest('.hidden,[hidden],[aria-hidden="true"]'))return;
  const mes=document.getElementById('selFiltroMesEmp')?.value,ano=mes?Number(mes.split('/')[1]):null;
  const chave=JSON.stringify([arquivosAnuaisUIProtecaoGestor,ano]);if(chave===chaveEmprestimosArquivoUIProtecaoGestor||pedidoEmprestimosArquivoUIProtecaoGestor?.chave===chave)return;
  const pedido={chave,geracao:geracaoArquivosUIProtecaoGestor};pedidoEmprestimosArquivoUIProtecaoGestor=pedido;
  const box=document.getElementById('listaResumoPessoasEmp');let info=document.getElementById('estadoArquivosEmpGestor');if(!info){info=document.createElement('p');info.id='estadoArquivosEmpGestor';info.className='mb-3 text-xs text-sky-200';info.setAttribute('role','status');box?.before(info);}info.textContent='Consultando empréstimos recebidos nos arquivos anuais…';
  apiCall('obterEmprestimosArquivadosWeb',{ano},1).then(res=>{
    if(pedidoEmprestimosArquivoUIProtecaoGestor!==pedido||pedido.geracao!==geracaoArquivosUIProtecaoGestor)return;
    if(!Array.isArray(res.itens)||res.itens.some(i=>!i.arquivado||i.status!=='Recebido'||!i.registroId))throw Error('A consulta anual não retornou os dados esperados.');
    emprestimosArquivoUIProtecaoGestor=res.itens;chaveEmprestimosArquivoUIProtecaoGestor=chave;pedidoEmprestimosArquivoUIProtecaoGestor=null;info.textContent='';renderizarPainelEmprestimos();
  }).catch(e=>{if(pedidoEmprestimosArquivoUIProtecaoGestor===pedido){pedidoEmprestimosArquivoUIProtecaoGestor=null;info.textContent='Os empréstimos antigos não foram carregados: '+e.message;}});
}
const renderEmpAntesProtecaoGestor=window.renderizarPainelEmprestimos;
window.renderizarPainelEmprestimos=function(...args){const r=renderEmpAntesProtecaoGestor(...args);atualizarAtalhoFiltrosProtecaoGestor();solicitarEmprestimosArquivoProtecaoGestor();return r;};
const renderDadosAntesProtecaoGestor=window.renderizarDados;
window.renderizarDados=function(dados){
  const novo=Array.isArray(dados.arquivosAnuais)?dados.arquivosAnuais:[];
  if(JSON.stringify(novo)!==JSON.stringify(arquivosAnuaisUIProtecaoGestor)){geracaoArquivosUIProtecaoGestor++;emprestimosArquivoUIProtecaoGestor=[];chaveEmprestimosArquivoUIProtecaoGestor='';pedidoEmprestimosArquivoUIProtecaoGestor=null;}
  arquivosAnuaisUIProtecaoGestor=novo;return renderDadosAntesProtecaoGestor(dados);
};
const setAbaAntesArquivosProtecaoGestor=window.setAba;
window.setAba=function(...args){const r=setAbaAntesArquivosProtecaoGestor(...args);if(args[0]==='lancamentos'&&arquivosAnuaisUIProtecaoGestor.length)chamarFiltroBackend(false,false);return r;};
function linkSeguroProtecaoGestor(url){return /^https:\/\/(?:drive\.google\.com|docs\.google\.com)\//.test(String(url||''))?url:'';}
function abaCompletaCSVProtecaoGestor(dados,nome){
  const origem=dados.abas.find(a=>a.nome===nome);if(!origem)return null;
  const antigas=(dados.arquivosAnuais||[]).flatMap(d=>(d.abas.find(a=>a.nome===nome)?.valores||[]).slice(1));
  return {...origem,exibidos:(origem.exibidos||origem.valores).concat(antigas.map(r=>r.map((v,i)=>[4,7,17].includes(i)&&typeof v==='number'?formatBRL(v):String(v??''))))};
}
document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.getElementById('modalExportarDados');if(!modal?.firstElementChild)return;
  const criar=(tag,texto='',classe='')=>{const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;};
  const botao=texto=>{const b=criar('button',texto,'rounded-xl border border-slate-600 px-3 py-3 text-xs font-bold text-slate-200 disabled:opacity-50');b.type='button';return b;};
  const painel=criar('section','','rounded-xl border border-slate-700 p-3 space-y-3');painel.id='painelProtecaoLongoPrazoGestor';painel.append(criar('h4','Backups automáticos e arquivos anuais','text-sm font-bold text-white'));
  const status=criar('p','Consulte a situação das cópias no Google Drive.','text-xs text-slate-200');status.setAttribute('role','status');painel.append(status);
  const acoes=criar('div','','grid grid-cols-1 sm:grid-cols-2 gap-2'),consultar=botao('Atualizar situação'),ativar=botao('Ativar proteção automática'),anual=botao('Ativar organização por ano e PDFs'),backup=botao('Fazer backup no Drive agora'),manutencao=botao('Conferir manutenção');acoes.append(consultar,ativar,anual,backup,manutencao);painel.append(acoes);backup.disabled=true;manutencao.disabled=true;anual.disabled=true;
  const lista=criar('div','','space-y-2 text-xs'),ajuda=criar('details','','text-xs text-slate-300');ajuda.append(criar('summary','Como funciona e ativação inicial','cursor-pointer py-2'),criar('p','A rotina roda na sua conta Google, com o app fechado: faz uma cópia por mês e verifica o arquivo anual. Compras com saldo, empréstimos em aberto e fixos ficam na principal. Arquivos anuais são somente consulta. Nenhuma cópia é apagada automaticamente.','mt-2'));
  ajuda.append(criar('p','Na primeira ativação, o Google pode exigir autorização. Nesse caso, na planilha abra Extensões → Apps Script, execute configurarProtecaoAutomaticaGestor e autorize a sua própria conta. Depois volte aqui e atualize a situação.','mt-2'));
  painel.append(lista,ajuda);modal.firstElementChild.append(painel);
  let ocupado=false,geracao=0,ultimoStatus=null,pedidoBackup='';
  function disponibilidade(){if(!navigator.onLine)throw Error('Conecte-se para consultar ou gerar cópias atualizadas.');if(protocoloServidorGestor<15)throw Error('Atualize o Apps Script e o app para esta versão antes de usar os arquivos anuais.');}
  function controles(){consultar.disabled=ocupado;ativar.disabled=ocupado||ultimoStatus?.ativo===true&&ultimoStatus?.rotinaInstalada!==false;backup.disabled=ocupado||!ultimoStatus?.ativo;manutencao.disabled=ocupado||!ultimoStatus?.ativo;anual.disabled=ocupado||!ultimoStatus?.ativo;anual.hidden=ultimoStatus?.organizacaoAnual===true;}
  function exibir(s){
    ultimoStatus=s;lista.replaceChildren();
    status.textContent=(s.ativo?(s.rotinaInstalada===false?'A rotina automática precisa ser reativada. ':'Proteção automática configurada. '):'Proteção automática ainda não ativada. ')+(s.ultimoBackup?'Último backup confirmado: '+dataLegivelBackupGestor(s.ultimoBackup.data)+' · período '+s.ultimoBackup.periodo+'.':'Nenhum backup automático confirmado.')+(s.ultimoErro?' Última tentativa: '+s.ultimoErro:'');
    const url=linkSeguroProtecaoGestor(s.pastaUrl);if(url){const a=criar('a','Abrir pasta no Drive','block text-sky-200 underline');a.href=url;a.target='_blank';a.rel='noopener noreferrer';lista.append(a);}
    if(s.planilha)lista.append(criar('p','Base de controle: '+s.planilha,'text-slate-300'));
    if(s.organizacaoAnual)lista.append(criar('p','Organização anual ativa. Anos fechados preservam o retrato; pagamentos e recebimentos posteriores ficam vinculados no controle. PDFs são resumos de consulta; mantenha o backup JSON.','text-slate-300'));
    for(const ano of s.anos||[]){const url=linkSeguroProtecaoGestor(ano.url);if(url){const a=criar('a','Ano '+ano.ano+' · '+(ano.estado==='FECHADO'?'fechado, somente leitura':'aberto'),'block text-sky-200 underline');a.href=url;a.target='_blank';a.rel='noopener noreferrer';lista.append(a);}}
    if(s.erroRelatorios)lista.append(criar('p','Relatórios: '+s.erroRelatorios,'text-amber-300'));
    if(s.avisoBackupAssistido)lista.append(criar('p',s.avisoBackupAssistido,'text-amber-300'));
    if(s.ultimaCopiaPreservada)lista.append(criar('p','Última cópia preservada para recuperação assistida: '+dataLegivelBackupGestor(s.ultimaCopiaPreservada.data)+'. Ela não substitui a confirmação de um backup restaurável.','text-slate-300'));
    for(const arquivo of s.arquivos||[]){const link=linkSeguroProtecaoGestor(arquivo.url);if(!link)continue;const a=criar('a','Arquivo '+arquivo.ano+' · '+arquivo.quantidade+' registro(s) · '+arquivo.pessoal+' pessoais','block text-sky-200 underline');a.href=link;a.target='_blank';a.rel='noopener noreferrer';lista.append(a);}
    controles();
  }
  async function acao(executar){if(ocupado)return;ocupado=true;const g=++geracao;controles();try{disponibilidade();await executar();if(g===geracao)exibir(await apiCall('obterStatusProtecaoWeb',null,1));}catch(e){status.textContent=e.message||'Não foi possível confirmar a operação. Confira a situação antes de repetir.';}finally{if(g===geracao){ocupado=false;controles();}}}
  consultar.onclick=()=>acao(async()=>{});
  ativar.onclick=()=>mostrarConfirmacao('Ativar proteção automática?','Será instalada uma rotina na sua conta Google para backups mensais e arquivos anuais. A pasta deve ser particular. Haverá backup e conferência antes de retirar registros encerrados da principal.',()=>acao(async()=>{await apiCall('ativarProtecaoAutomaticaWeb',{},1);}),false,'Ativar rotina','neutral');
  anual.onclick=()=>mostrarConfirmacao('Organizar os anos desta base?','Destino: '+(ultimoStatus?.planilha||'base configurada')+'. Será conferido um backup antes de organizar os registros por competência. Cadastros, notas e provas das operações ficam no controle permanente. O mesmo webapp consultará todos os anos. A rotina passará a gerar resumos PDF no Drive, sem apagar cópias anteriores.',()=>acao(async()=>{status.textContent='Conferindo a cópia e preparando os anos…';await apiCall('ativarOrganizacaoAnualWeb',{},1);invalidarLeiturasDesempenhoGestor();await carregarDados();}),false,'Ativar nesta base','neutral');
  backup.onclick=()=>acao(async()=>{
    if(!pedidoBackup)pedidoBackup=novoRequestIdGestor();status.textContent='Gerando e conferindo a cópia no Drive…';
    await apiCall('executarBackupProtegidoWeb',{requestId:pedidoBackup},1);pedidoBackup='';
  });
  manutencao.onclick=async()=>{
    let p;await acao(async()=>{status.textContent='Conferindo o que pode ser arquivado…';p=await apiCall('previaManutencaoProtegidaWeb',null,1);});if(!p)return;
    mostrarConfirmacao('Conferir manutenção segura',p.quantidade+' registro(s) encerrados podem ir para arquivos anuais'+(p.anos?.length?' de '+p.anos.join(', '):'')+'. '+p.regra+' Será criada uma cópia antes de alterar a principal.',()=>acao(async()=>{status.textContent='Guardando a cópia e conferindo os arquivos…';await apiCall('executarManutencaoProtegidaWeb',{confirmacao:'ARQUIVAR',assinatura:p.assinatura},1);invalidarLeiturasDesempenhoGestor();await carregarDados();}),false,'Arquivar com segurança','neutral');
  };
  // Consulta explícita: desabilitar controles durante focusin pode consumir
  // o primeiro clique em Ativar ou impedir a navegação pelo teclado.
  const abrirAntesProtecao=window.abrirExportacaoDados;
  window.abrirExportacaoDados=function(...args){const r=abrirAntesProtecao(...args);consultar.onclick();return r;};
});
