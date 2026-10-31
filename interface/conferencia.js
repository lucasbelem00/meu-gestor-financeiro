// Ferramentas locais: o conteúdo do CSV nunca é enviado para a API.
const ConferenciaLocalGestor = (() => {
  function falha(codigo) { const e = new Error(codigo); e.codigoConferencia = codigo; throw e; }
  function moeda(texto) {
    let t=String(texto).trim().replace(/R\$\s*/g,'').replace(/[\s\u00a0]/g,'');
    if(!t||!/^-?[\d.,]+$/.test(t))falha('VALOR_INVALIDO');
    if(t.includes(',')){if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(t))falha('VALOR_INVALIDO');t=t.replace(/\./g,'').replace(',','.');}
    else if(!/^-?\d+(?:\.\d{1,2})?$/.test(t))falha('VALOR_INVALIDO');
    const n=Math.round(Number(t)*100);if(!Number.isSafeInteger(n)||Math.abs(n)>1e12)falha('VALOR_INVALIDO');return n;
  }
  function data(texto) {
    const t=String(texto).trim(),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t),b=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
    if(!m&&!b)falha('DATA_INVALIDA');const [a,mes,dia]=m?[+m[1],+m[2],+m[3]]:[+b[3],+b[2],+b[1]];
    const d=new Date(Date.UTC(a,mes-1,dia));if(a<1900||a>2200||d.getUTCFullYear()!==a||d.getUTCMonth()!==mes-1||d.getUTCDate()!==dia)falha('DATA_INVALIDA');return Math.floor(d.getTime()/86400000);
  }
  function csv(texto,separador) {
    if(typeof texto!=='string'||texto.length>2000000)falha('ARQUIVO_GRANDE');if(![',',';','\t'].includes(separador))falha('SEPARADOR_INVALIDO');
    const linhas=[];let linha=[],campo='',aspas=false,fechou=false;
    function celula(){linha.push(campo);campo='';fechou=false;if(linha.length>100)falha('COLUNAS_EXCESSIVAS');}
    function finalizar(){celula();if(linha.some(c=>c.trim()))linhas.push(linha);linha=[];if(linhas.length>5001)falha('LINHAS_EXCESSIVAS');}
    texto=texto.replace(/^\uFEFF/,'');
    for(let i=0;i<texto.length;i++){const c=texto[i];if(aspas){if(c==='"'){if(texto[i+1]==='"'){campo+='"';i++;}else{aspas=false;fechou=true;}}else campo+=c;}
      else if(c===separador)celula();else if(c==='\n'||c==='\r'){if(c==='\r'&&texto[i+1]==='\n')i++;finalizar();}
      else if(c==='"'&&!campo&&!fechou)aspas=true;else{if(fechou||c==='"')falha('CSV_ASPAS');campo+=c;}}
    if(aspas)falha('CSV_ASPAS');if(campo||linha.length||fechou)finalizar();
    if(linhas.length<2||linhas[0].length<3)falha('CSV_CABECALHO');if(linhas.some(r=>r.length!==linhas[0].length))falha('CSV_COLUNAS');return linhas;
  }
  function compararPrecos(opcoes) {
    const unidades={kg:['massa',1,'kg'],g:['massa',.001,'kg'],l:['volume',1,'L'],ml:['volume',.001,'L'],un:['unidade',1,'unidade']};
    const itens=opcoes.map(o=>{const u=unidades[o.unidade],p=moeda(o.preco),texto=String(o.quantidade).trim(),q=Number(texto.replace(',','.')),n=Number(o.pacotes);if(!u||p<=0||!/^\d+(?:[.,]\d{1,6})?$/.test(texto)||!Number.isFinite(q)||q<=0||!Number.isInteger(n)||n<1||n>10000||q>1e9)falha('PRECO_INVALIDO');return {...o,grupo:u[0],base:u[2],taxa:p/(q*n*u[1])};});
    if(itens.length<2||itens.some(o=>o.grupo!==itens[0].grupo))falha('UNIDADES_INCOMPATIVEIS');return itens.sort((a,b)=>a.taxa-b.taxa);
  }
  function conciliar(extrato,app) {
    // Conservador: mesmo valor E mesma data são candidatos, nunca prova de quitação.
    const ch=x=>x.dia+'|'+x.centavos,es=new Map(),as=new Map();
    for(const [itens,mapa] of [[extrato,es],[app,as]])for(const i of itens){const k=ch(i);if(!mapa.has(k))mapa.set(k,[]);mapa.get(k).push(i);}
    const pares=[],ambiguos=[],soExtrato=[],soApp=[];
    for(const k of new Set([...es.keys(),...as.keys()])){const e=es.get(k)||[],a=as.get(k)||[];if(e.length===1&&a.length===1)pares.push({extrato:e[0],app:a[0]});else if(e.length&&a.length)ambiguos.push({extrato:e,app:a});else{soExtrato.push(...e);soApp.push(...a);}}
    return {pares,ambiguos,soExtrato,soApp};
  }
  function diagnostico(codigo,etapa,contagens={}) {
    // Lista fechada: nunca copiar Error.message, cabeçalhos, nomes, linhas ou arquivo.
    const codigos=['ARQUIVO_GRANDE','LINHAS_EXCESSIVAS','COLUNAS_EXCESSIVAS','SEPARADOR_INVALIDO','CSV_ASPAS','CSV_CABECALHO','CSV_COLUNAS','VALOR_INVALIDO','DATA_INVALIDA','COLUNAS_MAPEADAS','CONSULTA_FALHOU','FORMATO_RESPOSTA','ARQUIVO_LEITURA','SEM_DESPESAS','OK'];
    const numero=k=>Number.isSafeInteger(contagens[k])&&contagens[k]>=0?contagens[k]:0;
    return {formato:'gestor-conferencia-diagnostico-v1',versaoFerramenta:1,geradoEm:new Date().toISOString(),codigo:codigos.includes(codigo)?codigo:'ERRO_INTERNO',etapa:['arquivo','mapeamento','consulta','comparacao'].includes(etapa)?etapa:'comparacao',linhaErro:numero('linhaErro'),linhas:numero('linhas'),candidatos:numero('candidatos'),ambiguidades:numero('ambiguidades'),somenteExtrato:numero('somenteExtrato'),somenteApp:numero('somenteApp')};
  }
  return {moeda,data,csv,compararPrecos,conciliar,diagnostico};
})();

const textosErroConferenciaGestor={ARQUIVO_GRANDE:'Use um CSV de até 2 MB.',LINHAS_EXCESSIVAS:'Use até 5.000 lançamentos por arquivo.',COLUNAS_EXCESSIVAS:'O arquivo tem mais de 100 colunas.',CSV_ASPAS:'Há aspas incompletas ou fora do formato CSV. Exporte novamente pelo banco.',CSV_CABECALHO:'Use um CSV com cabeçalho e ao menos uma linha, com data, descrição e valor.',CSV_COLUNAS:'As linhas têm quantidades diferentes de colunas. Confira o separador ou exporte novamente.',VALOR_INVALIDO:'Há um valor inválido na coluna selecionada. Use 1.234,56 ou 1234.56; confira a coluna.',DATA_INVALIDA:'Há uma data inválida. São aceitos dd/mm/aaaa e aaaa-mm-dd.',COLUNAS_MAPEADAS:'Escolha três colunas diferentes para data, descrição e valor.',CONSULTA_FALHOU:'Não foi possível consultar o mês no app. Confira a conexão e tente novamente.',FORMATO_RESPOSTA:'O app recebeu dados em formato inesperado. Confira se app e Apps Script estão atualizados.',ARQUIVO_LEITURA:'Não foi possível ler esse arquivo como texto UTF-8. Exporte um CSV UTF-8.',SEM_DESPESAS:'Nenhuma despesa com o sinal escolhido. Confira como o banco representa as saídas.'};
let arquivoConferenciaGestor=null,geracaoConferenciaGestor=0,diagnosticoConferenciaGestor=null;
function elConferenciaGestor(tag,texto,classe=''){const e=document.createElement(tag);e.textContent=texto;e.className=classe;return e;}
function diagnosticarConferenciaGestor(codigo,etapa,contagens={}){
  diagnosticoConferenciaGestor=ConferenciaLocalGestor.diagnostico(codigo,etapa,contagens);
  document.getElementById('extrato-diagnostico').textContent=JSON.stringify(diagnosticoConferenciaGestor,null,2);
  document.getElementById('extrato-estado').textContent=(codigo==='OK'?'Comparação concluída. As diferenças abaixo precisam de conferência.':textosErroConferenciaGestor[codigo]||'Não foi possível concluir. Copie o diagnóstico para investigarmos.')+(diagnosticoConferenciaGestor.linhaErro?' Linha de dados '+diagnosticoConferenciaGestor.linhaErro+' (incluindo o cabeçalho).':'');
}
function invalidarConferenciaGestor(){geracaoConferenciaGestor++;document.getElementById('extrato-resultados').replaceChildren();diagnosticoConferenciaGestor=null;document.getElementById('extrato-diagnostico').textContent='Sem diagnóstico nesta configuração. Leia um arquivo e faça a comparação.';document.getElementById('extrato-estado').textContent='Confira as opções e compare novamente.';}
async function lerArquivoConferenciaGestor(){
  invalidarConferenciaGestor();arquivoConferenciaGestor=null;const geracao=geracaoConferenciaGestor,arquivo=document.getElementById('extrato-arquivo').files[0],mapa=document.getElementById('extrato-mapa');mapa.replaceChildren();if(!arquivo)return;
  try{if(arquivo.size>2000000)throw Object.assign(new Error(),{codigoConferencia:'ARQUIVO_GRANDE'});const texto=new TextDecoder('utf-8',{fatal:true}).decode(await arquivo.arrayBuffer());if(geracao!==geracaoConferenciaGestor)return;const linhas=ConferenciaLocalGestor.csv(texto,document.getElementById('extrato-separador').value);arquivoConferenciaGestor=linhas;
    for(const [id,titulo,padrao]of [['data','Data',/data|date/i],['descricao','Descrição',/descri|title|histor|estabelec/i],['valor','Valor',/valor|amount/i]]){const l=elConferenciaGestor('label',titulo,'block text-sm text-slate-200'),s=document.createElement('select');s.id='extrato-col-'+id;s.className='w-full bg-slate-900 border border-slate-600 rounded-xl p-3';linhas[0].forEach((t,i)=>{const o=elConferenciaGestor('option',(i+1)+' — '+t.slice(0,80));o.value=String(i);s.append(o);});const escolhido=linhas[0].findIndex(t=>padrao.test(t));s.value=String(escolhido>=0?escolhido:['data','descricao','valor'].indexOf(id));s.onchange=invalidarConferenciaGestor;l.append(s);mapa.append(l);}
    document.getElementById('extrato-estado').textContent=(linhas.length-1)+' linhas lidas neste aparelho. Confira as colunas antes de comparar.';
  }catch(e){if(geracao===geracaoConferenciaGestor)diagnosticarConferenciaGestor(e.codigoConferencia||'ARQUIVO_LEITURA','arquivo');}
}
function prepararFormasConferenciaGestor(){const s=document.getElementById('extrato-forma');if(!s)return;const anterior=s.value;s.replaceChildren(elConferenciaGestor('option','Selecione a forma de pagamento'));s.options[0].value='';for(const f of formasGlobais||[]){const nome=typeof f==='string'?f:f.nome;if(!nome)continue;const o=elConferenciaGestor('option',nome);o.value=nome;s.append(o);}if([...s.options].some(o=>o.value===anterior))s.value=anterior;}
async function compararExtratoGestor(){
  const resultado=document.getElementById('extrato-resultados');invalidarConferenciaGestor();let etapa='mapeamento';const geracao=geracaoConferenciaGestor;
  try{if(!arquivoConferenciaGestor)throw Object.assign(new Error(),{codigoConferencia:'CSV_CABECALHO'});const col=['data','descricao','valor'].map(k=>Number(document.getElementById('extrato-col-'+k).value));if(new Set(col).size!==3)throw Object.assign(new Error(),{codigoConferencia:'COLUNAS_MAPEADAS'});
    const mes=document.getElementById('extrato-mes').value,forma=document.getElementById('extrato-forma').value;if(!/^\d{4}-\d{2}$/.test(mes)||!forma){document.getElementById('extrato-estado').textContent='Escolha o mês da fatura e a forma de pagamento.';return;}
    const sinal=document.getElementById('extrato-sinal').value==='negativo'?-1:1;let excluidos=0;
    const extrato=[];arquivoConferenciaGestor.slice(1).forEach((r,i)=>{try{const v=ConferenciaLocalGestor.moeda(r[col[2]])*sinal;if(v<=0){excluidos++;return;}extrato.push({dia:ConferenciaLocalGestor.data(r[col[0]]),descricao:r[col[1]].slice(0,300),centavos:v,origem:'CSV linha '+(i+2)});}catch(e){e.linhaConferencia=i+2;throw e;}});
    if(!extrato.length)throw Object.assign(new Error(),{codigoConferencia:'SEM_DESPESAS'});
    etapa='consulta';document.getElementById('extrato-estado').textContent='Consultando os registros do mês…';const r=await apiCall('obterRelatorioMes',mes.slice(5)+'/'+mes.slice(0,4),1);if(geracao!==geracaoConferenciaGestor)return;
    if(!r||!Array.isArray(r.lancamentos)||!Array.isArray(r.terceiros?.itens))throw Object.assign(new Error(),{codigoConferencia:'FORMATO_RESPOSTA'});
    etapa='comparacao';const app=[];
    for(const l of r.lancamentos){if(l[2]!==forma)continue;app.push({dia:ConferenciaLocalGestor.data(l[0]),descricao:String(l[1]),centavos:ConferenciaLocalGestor.moeda(l[7]),origem:'Pessoal'});}
    for(const l of r.terceiros.itens){if(l.forma!==forma)continue;const v=Math.round(l.valorRaw*100);if(!Number.isSafeInteger(v)||v<0)throw Object.assign(new Error(),{codigoConferencia:'FORMATO_RESPOSTA'});app.push({dia:ConferenciaLocalGestor.data(l.data),descricao:String(l.descricao),centavos:v,origem:'Terceiros'});}
    const c=ConferenciaLocalGestor.conciliar(extrato,app);diagnosticarConferenciaGestor('OK',etapa,{linhas:arquivoConferenciaGestor.length-1,candidatos:c.pares.length,ambiguidades:c.ambiguos.length,somenteExtrato:c.soExtrato.length,somenteApp:c.soApp.length});
    resultado.append(elConferenciaGestor('p',`${c.pares.length} candidatos • ${c.ambiguos.length} grupos ambíguos • ${c.soExtrato.length} só no extrato • ${c.soApp.length} só no app. ${excluidos} linhas de sinal oposto/zero desconsideradas.`, 'text-sky-200'));
    resultado.append(elConferenciaGestor('p','Mesmo valor e mesma data sugerem uma correspondência. Confira as descrições. Data de postagem diferente, estornos, parcelas e lançamentos agrupados podem explicar diferenças. Nenhum pagamento foi registrado.','text-sm text-slate-300'));
    function listar(titulo,itens){const d=document.createElement('details');d.className='border border-slate-700 rounded-xl p-3';d.append(elConferenciaGestor('summary',titulo+' ('+itens.length+')','font-bold cursor-pointer'));for(const x of itens){const p=elConferenciaGestor('p',x.origem+' • '+new Date(x.dia*86400000).toISOString().slice(0,10)+' • '+x.descricao+' • '+formatBRL(x.centavos/100),'text-sm my-3 break-words');d.append(p);}resultado.append(d);}
    listar('Candidatos — conferir os dois registros',c.pares.flatMap(p=>[p.extrato,p.app]));listar('Ambíguos — sem associação automática',c.ambiguos.flatMap(g=>[...g.extrato,...g.app]));listar('Somente no extrato',c.soExtrato);listar('Somente no app',c.soApp);
  }catch(e){if(geracao!==geracaoConferenciaGestor)return;diagnosticarConferenciaGestor(e.codigoConferencia||(etapa==='consulta'?'CONSULTA_FALHOU':'FORMATO_RESPOSTA'),etapa,{linhaErro:e.linhaConferencia,linhas:arquivoConferenciaGestor?arquivoConferenciaGestor.length-1:0});}
}
async function copiarDiagnosticoConferenciaGestor(){const s=document.getElementById('extrato-estado');if(!diagnosticoConferenciaGestor){s.textContent='Faça uma leitura ou comparação para gerar o diagnóstico.';return;}try{await navigator.clipboard.writeText(JSON.stringify(diagnosticoConferenciaGestor,null,2));s.textContent='Diagnóstico copiado, sem o conteúdo do extrato.';}catch(_){s.textContent='Não foi possível copiar. Selecione o texto do diagnóstico abaixo e copie manualmente.';}}
function adicionarPrecoGestor(){const lista=document.getElementById('precos-opcoes');if(lista.children.length>=12)return;const c=elConferenciaGestor('div','','card-glass p-4 grid grid-cols-2 sm:grid-cols-3 gap-3');for(const [id,titulo,valor]of [['nome','Produto / marca',''],['preco','Preço do conjunto (R$)',''],['quantidade','Quantidade por embalagem',''],['pacotes','Embalagens no conjunto','1']]){const l=elConferenciaGestor('label',titulo,'text-xs text-slate-200');const i=document.createElement('input');i.dataset.preco=id;i.value=valor;i.maxLength=id==='nome'?100:20;i.className='block w-full bg-slate-900 border border-slate-600 rounded-xl p-3 mt-1';if(id!=='nome')i.inputMode='decimal';l.append(i);c.append(l);}const l=elConferenciaGestor('label','Unidade','text-xs text-slate-200'),s=document.createElement('select');s.dataset.preco='unidade';s.className='block w-full bg-slate-900 border border-slate-600 rounded-xl p-3 mt-1';for(const u of ['g','kg','ml','l','un']){const o=elConferenciaGestor('option',u);o.value=u;s.append(o);}l.append(s);c.append(l);const b=elConferenciaGestor('button','Remover','text-rose-300 border border-slate-600 rounded-xl p-3');b.type='button';b.onclick=()=>{if(lista.children.length>2)c.remove();document.getElementById('precos-resultado').replaceChildren();};c.append(b);c.addEventListener('input',()=>document.getElementById('precos-resultado').replaceChildren());c.addEventListener('change',()=>document.getElementById('precos-resultado').replaceChildren());lista.append(c);}
function calcularPrecosGestor(){const saida=document.getElementById('precos-resultado');saida.replaceChildren();try{const op=[...document.getElementById('precos-opcoes').children].map((c,i)=>Object.fromEntries([...c.querySelectorAll('[data-preco]')].map(e=>[e.dataset.preco,e.value]).concat([['ordem',i+1]])));const itens=ConferenciaLocalGestor.compararPrecos(op);for(const o of itens){const empate=Math.abs(o.taxa-itens[0].taxa)<1e-7;saida.append(elConferenciaGestor('p',(empate?'Melhor preço por quantidade: ':'')+(o.nome.trim()||'Opção '+o.ordem)+' — '+formatBRL(o.taxa/100)+' / '+o.base+(empate?'':' • '+((o.taxa/itens[0].taxa-1)*100).toFixed(1)+'% acima da melhor opção'),empate?'text-sky-300 font-bold':'text-slate-200'));}saida.append(elConferenciaGestor('p','Compare produtos equivalentes. Qualidade, rendimento e condições de promoção também contam. Valores por unidade arredondados para exibição.','text-xs text-slate-300'));}catch(_){saida.append(elConferenciaGestor('p','Informe preços e quantidades maiores que zero. Compare apenas unidades compatíveis: g/kg, ml/L ou unidades.','text-amber-300'));}}
const abaAntesConferenciaGestor=window.setAba;window.setAba=function(aba,...args){const r=abaAntesConferenciaGestor(aba,...args);if(aba==='extrato')prepararFormasConferenciaGestor();if(aba==='precos'&&!document.getElementById('precos-opcoes').children.length){adicionarPrecoGestor();adicionarPrecoGestor();}return r;};
