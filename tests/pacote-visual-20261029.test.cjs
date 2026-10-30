const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function trecho(inicio,fim){const i=html.indexOf(inicio),f=html.indexOf(fim,i+inicio.length);assert(i>=0&&f>i,inicio);return html.slice(i,f);}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const moeda=n=>'R$ '+Number(n).toFixed(2).replace('.',',');
function linha(nome,categoria='Saúde 💊',pago=0,total=100,status='Em Aberto'){
 const l=['29/10/2026',nome,'Cartão fictício',categoria,total,1,'1/1',moeda(total),'10/2026',status,'#casal',2,null,'id-'+nome,'compra-'+nome,1,'Em Aberto',pago,total-pago,false];return l;
}
function ambiente(){
 const campos=new Map(),controles=[['status','aberto'],['status','pago'],['status','naopago'],['status','parcial'],['status','quitado'],['categoria','Outros'],['categoria','Outros 📦'],['categoria','Saúde 💊']].map(([tipo,valor])=>({dataset:{filtroMensalTipo:tipo,filtroMensalValor:valor},setAttribute(k,v){this[k]=v;}}));
 function el(id){if(!campos.has(id))campos.set(id,{innerHTML:'',textContent:'',classList:{toggle(){}},setAttribute(){},focus(){}});return campos.get(id);}
 const itens=[linha('Sem pagar'),linha('Parcial','Saúde 💊',30),linha('Quitado','Outros',100,100,'Pago')];
 const c=vm.createContext({normalizarTexto:norm,escaparHTML:esc,formatBRL:moeda,lerValorMoeda:v=>Number(String(v).replace(/[^\d,.-]/g,'').replace(',','.')),
  tipoFormaPagamentoGestor:f=>typeof f==='object'?f.tipo:f==='Conta renomeada'?'pix':f==='Dinheiro'?'avista':'cartao',formaEhImediataGestor:()=>false,isCategoriaOutros:n=>norm(n).replace(/[^a-z]/g,'')==='outros',
  categoriasGlobaisEdit:[{nome:'Outros 📦'},{nome:'Saúde 💊'},{nome:'Mercado 🛒'}],document:{activeElement:null,getElementById:el,querySelectorAll:()=>controles},
  ultimoRelatorioMensalCache:{lancamentos:itens,categorias:[{nome:'Saúde 💊',total:200,meta:300},{nome:'Outros',total:100,meta:0}]},filtroInternoMensalAtivo:{},
  referenciaLinhaSegura:()=>'',acaoHTML:()=>'',detalheFechamentoAnualGestor:()=>'',modoEdicaoLancamentos:false,itensFiltradosAtualCache:[]});
 vm.runInContext(trecho('    function iconeFormaPagamentoVisualGestor(','    function formatarInfoParcelaCard('),c);
 vm.runInContext(trecho('    function getCategoriaExibicao(','    function ') ,c);
 vm.runInContext(trecho('    function formatarInfoParcelaCard(','    function renderTabelaLancamentos('),c);
 vm.runInContext(trecho('    function filtrosMensaisVaziosGestor(','    function carregarRelatorioMesUnico('),c);
 return {c,el,controles,itens};
}

test('atalhos agregados marcam situações e permitem refinar sem manter filtro oculto',()=>{
 const {c,controles}=ambiente();c.aplicarFiltroInternoMensal('status','aberto');assert.deepEqual(Array.from(c.filtroInternoMensalAtivo.status),['naopago','parcial']);assert.deepEqual(controles.slice(0,5).map(b=>b['aria-pressed']),['true','false','true','true','false']);
 c.aplicarFiltroInternoMensal('status','naopago');assert.deepEqual(Array.from(c.filtroInternoMensalAtivo.status),['parcial']);assert.equal(controles[0]['aria-pressed'],'false');
 c.aplicarFiltroInternoMensal('status','pago');assert.deepEqual(Array.from(c.filtroInternoMensalAtivo.status),['parcial','quitado']);assert.equal(controles[1]['aria-pressed'],'true');
 c.aplicarFiltroInternoMensal('todos','');assert(controles.every(b=>b['aria-pressed']==='false'));
});

test('seleções equivalentes não duplicam lançamentos nem alteram somas do mês',()=>{
 const {c,itens}=ambiente(),antes=JSON.stringify(itens);const r=c.filtrarItensMensaisGestor(itens,{status:['aberto','pago','parcial']});assert.equal(r.length,3);assert.equal(r.reduce((s,l)=>s+l[4],0),300);assert.equal(r.reduce((s,l)=>s+l[17],0),130);assert.equal(JSON.stringify(itens),antes);
});

test('categoria e termômetro compartilham seleção; resumo mantém Outros com emoji',()=>{
 const {c,el,controles}=ambiente();el('rel-sub-ticket').textContent='🔢 3 lançamentos no mês • Média: R$ 100,00';c.aplicarFiltroInternoMensal('categoria','Outros');assert.equal(controles[5]['aria-pressed'],'true');assert.equal(controles[6]['aria-pressed'],'true');assert.match(el('txtBannerFiltroMensal').textContent,/Outros 📦/);assert.match(el('resumoFiltroMensal').textContent,/1 lançamento/);assert.match(el('rel-sub-ticket').textContent,/3 lançamentos no mês/);
 c.aplicarFiltroInternoMensal('categoria','Outros 📦');assert.equal(controles[5]['aria-pressed'],'false');assert.equal(c.filtroInternoMensalAtivo.categoria.length,0);
});

test('categorias sem meta continuam disponíveis em Mais filtros e tags se combinam com elas',()=>{
 const {c,itens}=ambiente();assert(c.categoriasFiltroMensalGestor(c.ultimoRelatorioMensalCache).some(x=>x.nome==='Outros'));assert(!c.categoriasTermometroMensalGestor(c.ultimoRelatorioMensalCache).some(x=>x.nome==='Outros'));
 assert.deepEqual(Array.from(c.filtrarItensMensaisGestor(itens,{categoria:['Outros'],tag:['#casal']}),x=>x[1]),['Quitado']);assert.equal(c.filtrarItensMensaisGestor(itens,{categoria:['Outros'],tag:['outra']} ).length,0);
});

test('cores dos lançamentos distinguem quitação, saldo e assinatura ativa sem mudar valores',()=>{
 const {c}=ambiente();for(const status of ['Em Aberto','Agendado','Assinatura Ativa','Assinatura Cancelada'])assert.equal(c.corValorLancamentoGestor(status),'text-white');for(const status of ['Pago','Assinatura Paga','Pago (Cancelada)'])assert.equal(c.corValorLancamentoGestor(status),'text-emerald-400');assert.equal(c.corValorLancamentoGestor('Pago',70),'text-white');
 const r=linha('Parcial','Teste',30);assert.match(c.montarCardFaturaMensalSeguro(r),/text-white font-bold text-base/);assert.match(c.montarCardFaturaMensalSeguro(r),/Saldo restante/);r[17]=100;r[18]=0;r[9]='Pago';assert.match(c.montarCardFaturaMensalSeguro(r),/text-emerald-400 font-bold text-base/);assert.match(c.obterClasseBadgeStatus('Assinatura Ativa'),/violet/);
});

test('ícone de pagamento usa o tipo cadastrado inclusive em Pix renomeado',()=>{
 const {c}=ambiente();assert.equal(c.iconeFormaPagamentoVisualGestor('Conta renomeada'),'💠');assert.equal(c.iconeFormaPagamentoVisualGestor({nome:'Qualquer nome',tipo:'pix'}),'💠');assert.equal(c.iconeFormaPagamentoVisualGestor('Dinheiro'),'⚡');assert.equal(c.iconeFormaPagamentoVisualGestor('Cartão fictício'),'💳');
});

test('informação de parcela distingue à vista, parcelado e fixo com seus símbolos',()=>{
 const {c}=ambiente();for(const forma of ['Cartão fictício','Conta renomeada','Dinheiro']){assert.equal(c.formatarInfoParcelaCard('1/1',null,forma),'⚡ À vista');assert.match(c.formatarInfoParcelaCard('2/6',null,forma),/^➗ Parcela 2\/6/);}assert.equal(c.formatarInfoParcelaCard('∞/∞',null,'Cartão fictício'),'📌 Fixo mensal');assert.match(c.formatarInfoParcelaCard('2/6',{faltam:4,fimMes:'03/2027'},'Cartão fictício'),/fim 03\/2027/);assert.match(c.montarCardFaturaMensalSeguro(linha('Compra única')),/⚡ À vista/);
});

test('ranking destaca maiores gastos, preserva empates e não modifica o relatório',()=>{
 const {c}=ambiente(),dados=[{nome:'B',total:20},{nome:'D',total:0},{nome:'A',total:100},{nome:'C',total:50},{nome:'Outro empate',total:50}],antes=JSON.stringify(dados),r=c.rankingCategoriasVisualGestor(dados);assert.deepEqual(Array.from(r,x=>[x.nome,x.posicao,x.medalha]),[['A',1,'🥇'],['C',2,'🥈'],['Outro empate',2,'🥈'],['B',4,'4º']]);assert.equal(JSON.stringify(dados),antes);
 assert.deepEqual(Array.from(c.rankingCategoriasVisualGestor([{nome:'A',total:3},{nome:'B',total:2},{nome:'C',total:1}]),x=>x.medalha),['🥇','🥈','🥉']);
});
