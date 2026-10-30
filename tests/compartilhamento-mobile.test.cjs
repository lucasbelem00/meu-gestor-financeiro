const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moeda=v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function tela(){const c=vm.createContext({formatBRL:moeda,formaEhCartaoGestor:f=>f!=='Pix'});vm.runInContext(fs.readFileSync('interface/compartilhamento.js','utf8'),c);return c;}
const item=(dados={})=>({pessoa:'Núbia',descricao:'Hollywood Burguer',forma:'Azul Skyline',parcela:'1/1',mesFatura:'10/2026',valorRaw:41,status:'A Receber',compraId:'compra-1',...dados});

test('uma compra à vista mostra um único valor e a data combinada, sem 1/1',()=>{
 const c=tela(),t=c.montarCobrancaMensagemGestor('Núbia',[item({dataCombinada:'14/11/2026'})],{status:'A Receber',mes:'10/2026'});
 assert.match(t,/Hollywood Burguer\*\n⚡ À vista\nCartão: Azul Skyline/);assert.match(t,/Devolver até: 14\/11\/2026/);assert.equal(t.match(/R\$ 41,00/g).length,1);assert.match(t,/Valor a devolver: R\$ 41,00/);assert(!t.includes('1/1'));
});
test('várias compras separam parcelas, formas e competências sem presumir Pix sempre à vista',()=>{
 const c=tela(),t=c.montarCobrancaMensagemGestor('Núbia',[item(),item({compraId:'compra-2',descricao:'Roupas',forma:'Pix',parcela:'3/6',mesFatura:'11/2026',valorRaw:75})],{status:'A Receber'});
 assert.match(t,/Parcela 3 de 6\nForma: Pix\nReferência: 11\/2026/);assert.match(t,/Total a devolver: R\$ 116,00/);assert(t.includes('\n\n• *Roupas*'));
});
test('recebidos são resumo de recebimentos, sem data de cobrança ou total a devolver',()=>{
 const t=tela().montarCobrancaMensagemGestor('Núbia',[item({status:'Recebido',dataCombinada:'14/11/2026'})],{status:'Recebido'});
 assert.match(t,/Valores recebidos/);assert.match(t,/Total Recebido: R\$ 41,00/);assert(!t.includes('a devolver'));assert(!t.includes('Devolver até'));assert.equal(t.match(/R\$ 41,00/g).length,1);
});
test('recebimento parcial conhecido explica valor original e saldo sem cobrar a parte recebida',()=>{
 const c=tela(),aberto=item({valorRaw:31}),pago=item({valorRaw:10,status:'Recebido'}),t=c.montarCobrancaMensagemGestor('Núbia',[aberto],{status:'A Receber'},[aberto,pago]);
 assert.match(t,/Valor: R\$ 41,00\nJá recebido: R\$ 10,00/);assert.match(t,/Valor a devolver: R\$ 31,00/);assert(!t.includes('Total Recebido'));
});
test('quitação no banco não é devolução da pessoa nem comprova recebimento parcial',()=>{
 const t=tela().montarCobrancaMensagemGestor('Núbia',[item({estadoBanco:'Pago',pagoBancoRaw:41})],{status:'A Receber'});
 assert.match(t,/Valor a devolver: R\$ 41,00/);assert(!t.includes('Já recebido'));
});
test('compras diferentes com descrição idêntica e parcelas de meses distintos nunca são fundidas',()=>{
 const t=tela().montarCobrancaMensagemGestor('Núbia',[item(),item({compraId:'compra-2',status:'Recebido'}),item({mesFatura:'11/2026'})],{});
 assert.equal(t.match(/• \*Hollywood Burguer/g).length,3);assert.match(t,/Total a devolver: R\$ 82,00/);assert.match(t,/Total Recebido: R\$ 41,00/);
});
test('sem identidade não se deduz relação entre um pagamento e outra dívida',()=>{
 const aberto=item({compraId:undefined,valorRaw:31}),t=tela().montarCobrancaMensagemGestor('Núbia',[aberto],{status:'A Receber'},[aberto,item({compraId:undefined,status:'Recebido',valorRaw:10})]);
 assert(!t.includes('Já recebido'));assert.match(t,/Valor a devolver: R\$ 31,00/);
});
test('somas de centavos não acumulam imprecisão visível',()=>{
 const t=tela().montarCobrancaMensagemGestor('Núbia',[item({valorRaw:0.1}),item({compraId:'compra-2',valorRaw:0.2})],{status:'A Receber'});assert.match(t,/Total a devolver: R\$ 0,30/);
});
test('histórico conserva ano, fixo, situação e total do servidor com exclusões separadas',()=>{
 const c=tela(),a=['18/10/2026','Total Pass','Azul Skyline','Saúde',139.9,1,'∞/∞','R$ 139,90','11/2026','Assinatura Ativa'],b=['18/10/2025','Ocorrência antiga','Pix','Saúde',40,1,'∞/∞','R$ 40,00','10/2025','Ocorrência Pulada'];
 const t=c.montarResumoHistoricoMensagemGestor([a,b],{somaTotal:'R$ 139,90'},{ano:2026,categoria:'Saúde',tipoRapido:'fixos'});
 assert.match(t,/Data: 18\/10\/2026\n📌 Fixo mensal/);assert.match(t,/Total:\* R\$ 139,90/);assert.match(t,/Registros fora do total/);assert.match(t,/Ocorrência Pulada \(fora do total\)/);assert(t.indexOf('Total:*')<t.indexOf('Ocorrência antiga'));assert.match(t,/todos os meses de 2026/);assert.match(t,/Categoria: Saúde/);
});
test('simulação explicita doze parcelas e mantém a distribuição exata dos quatro mil reais',()=>{
 const s={data:'30/10/2026',valor:4000,n:12,parcelas:Array.from({length:12},(_,i)=>i<4?333.34:333.33),avista:3500,forma:'Azul Skyline'},t=tela().montarSimulacaoMensagemGestor(s,'11/2026');
 assert.match(t,/12 parcelas/);assert.match(t,/• 4x de R\$ 333,34\n• 8x de R\$ 333,33/);assert.match(t,/Total da compra: R\$ 4\.000,00/);assert.match(t,/Economia à vista: R\$ 500,00/);assert.match(t,/Primeira fatura: 11\/2026/);
});
test('simulação sem comparação omite preço à vista e economia; uma parcela é à vista',()=>{
 const t=tela().montarSimulacaoMensagemGestor({data:'30/10/2026',valor:10,n:1,parcelas:[10],avista:0},'');assert.match(t,/Compra à vista \(1x\)/);assert(!t.includes('Preço à vista'));assert(!t.includes('Economia'));assert(!t.includes('Cartão:'));
});
test('comparação mais cara à vista não é apresentada como economia à vista',()=>{
 const t=tela().montarSimulacaoMensagemGestor({data:'30/10/2026',valor:10,n:1,parcelas:[10],avista:12},'');assert.match(t,/Economia no plano simulado: R\$ 2,00/);assert(!t.includes('Economia à vista:'));
});
test('cópia do histórico inclui páginas além da primeira e conserva a versão da consulta',async()=>{
 const c=tela(),h=fs.readFileSync('index.html','utf8'),i=h.indexOf('    async function copiarResumoFiltroWhats()'),f=h.indexOf('    // ============================================================================',i),chamadas=[];let mensagem;
 Object.assign(c,{filtrosAtuais:{ano:'2026'},mostrarAviso(){},apiCall:async(_,p)=>{chamadas.push(p);return {versaoConsulta:'versao-estavel',qtdTotal:501,somaTotal:'R$ 501,00',itens:Array.from({length:p.offset?1:500},(_,n)=>['18/10/2026','Gasto '+(p.offset+n),'Pix','Teste',1,1,'1/1','R$ 1,00','10/2026','Pago'])};},abrirPreviaCobrancaWhats:t=>mensagem=t});
 vm.runInContext(h.slice(i,f),c);await c.copiarResumoFiltroWhats();assert.equal(chamadas.length,2);assert.equal(chamadas[1].filtros.versaoConsulta,'versao-estavel');assert.match(mensagem,/Gasto 500/);assert.equal(mensagem.match(/• \*Gasto /g).length,501);assert.match(mensagem,/Total:\* R\$ 501,00/);
});
test('simulação abre prévia editável sem copiar antes da confirmação ou incluir Pix, e preserva a preferência de cobrança',()=>{
 const {ambiente}=require('./fixtures/pacote-rotina-ui.cjs'),a=ambiente(),s=fs.readFileSync('interface/usabilidade.js','utf8'),i=s.indexOf('function copiarSimulacaoWhats()'),f=s.indexOf('function transferirSimulacaoGestor(',i);
 a.local.set('gestorPixCobrancaV1','teste@exemplo.com');a.local.set('gestorPixPadraoV1','true');
 Object.assign(a.c,{lerSimulacaoGestor:()=>({data:'30/10/2026',valor:10,n:1,parcelas:[10],avista:0})});
 vm.runInContext(fs.readFileSync('interface/compartilhamento.js','utf8'),a.c);vm.runInContext(s.slice(i,f),a.c);a.c.copiarSimulacaoWhats();
 assert.equal(a.copias.length,0);assert.match(a.el('textoModalPixCobranca').value,/Total da compra/);assert.equal(a.el('tituloModalPixCobranca').textContent,'💳 Confira a simulação');assert(a.el('linhaIncluirPixCobranca').classList.contains('hidden'));assert(a.el('btnAbrirConfigPixCobranca').classList.contains('hidden'));assert.equal(a.el('chkIncluirPixCobranca').disabled,true);
 a.el('textoModalPixCobranca').value='Simulação revisada por mim';a.el('chkIncluirPixCobranca').checked=true;a.el('btnCopiarPixCobranca').onclick();assert.equal(a.copias[0][0],'Simulação revisada por mim');assert.equal(a.envios.length,0);assert.equal(a.local.get('gestorPixPadraoV1'),'true');
 a.c.abrirPreviaCobrancaWhats('Cobrança','Copiado');assert.equal(a.el('tituloModalPixCobranca').textContent,'📋 Confira a mensagem');assert.equal(a.el('chkIncluirPixCobranca').checked,true);assert.equal(a.el('chkIncluirPixCobranca').disabled,false);a.el('btnCopiarPixCobranca').onclick();assert.match(a.copias[1][0],/Cobrança[\s\S]*Minha chave Pix/);
});
