const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fonte=fs.readFileSync('interface/perfil.js','utf8'),c=vm.createContext({});vm.runInContext(fonte.slice(0,fonte.indexOf('// Classificação visual')),c);
test('uso do cartão distingue limites reais sem arredondar a faixa de atenção',()=>{
 for(const [disponivel,estado]of [[1000,'normal'],[200.01,'normal'],[200,'alerta'],[0.01,'alerta'],[0,'atingido'],[-0.01,'excedido'],[-200,'excedido']]){const s=c.estadoUsoCartaoVisualGestor({limiteRaw:1000,disponivelRaw:disponivel});assert.equal(s.estado,estado);assert.match(s.classe,estado==='normal'?/blue/:estado==='excedido'?/rose/:/amber/);}
 assert.equal(c.estadoUsoCartaoVisualGestor({limiteRaw:1000,disponivelRaw:200.01}).texto,'<80%');
 assert.equal(c.estadoUsoCartaoVisualGestor({limiteRaw:1000,disponivelRaw:-0.01}).texto,'>100%');
 for(const f of [{},{limiteRaw:0,disponivelRaw:0},{limiteRaw:1000,disponivelRaw:null},{limiteRaw:NaN,disponivelRaw:10}])assert.equal(c.estadoUsoCartaoVisualGestor(f),null);
});

test('card apresenta parte pessoal roxa e aviso textual no limite, preservando terceiros âmbar',()=>{
 const h=fs.readFileSync('index.html','utf8'),i=h.indexOf('    function renderListaFormas()'),fim=h.indexOf('\n    function ',i+20);let markup='';
 const c=vm.createContext({formasGlobais:[{nome:'Cartão',tipo:'cartao',limiteRaw:1000,disponivelRaw:0,pctUso:'100%',utilizado:'R$ 20,00',terceirosMesRaw:30,terceirosMes:'R$ 30,00',totalBancoMes:'R$ 50,00'}],modoEdicaoFormas:false,tipoFormaPagamentoGestor:p=>p.tipo,escaparHTML:String,document:{getElementById:()=>({set innerHTML(v){markup=v;}})}});c.window=c;
 vm.runInContext(fonte.slice(0,fonte.indexOf('// Classificação visual')),c);vm.runInContext(h.slice(i,fim),c);c.renderListaFormas();assert(markup.includes('Seus gastos na fatura'));assert(markup.includes('text-purple-300'));assert(markup.includes('Limite atingido'));assert(markup.includes('text-amber-300'));assert(markup.includes('R$ 30,00 de terceiros'));assert(markup.includes('aria-label='));
});

test('Pix mantém percentual da referência e total de terceiros só do mês, incluindo recebidos',()=>{
 const h=fs.readFileSync('index.html','utf8'),i=h.indexOf('    function renderListaFormas()'),fim=h.indexOf('\n    function ',i+20);let markup='';
 const horizonte={totalTerceiros:{Pix:{'11/2026':50,'12/2026':80}},recebidoTerceiros:{Pix:{'11/2026':20}}};
 const c=vm.createContext({formasGlobais:[{nome:'Pix',tipo:'pix',limiteRaw:500,disponivelRaw:480,gastoMesRaw:20,limiteTotal:'R$ 500,00',disponivel:'R$ 480,00',utilizado:'R$ 20,00',totalFuturo:'R$ 90,00',futuroPessoalRaw:90}],horizonteDetalhadoGestor:horizonte,evolucaoMesAtual:'11/2026',modoEdicaoFormas:false,tipoFormaPagamentoGestor:p=>p.tipo,escaparHTML:String,formatBRL:n=>'R$ '+n.toFixed(2),document:{getElementById:()=>({set innerHTML(v){markup=v;}})}});c.window=c;
 vm.runInContext(fonte.slice(0,fonte.indexOf('// Classificação visual')),c);const resumo=c.resumoTerceirosFormaVisualGestor('Pix',horizonte,'11/2026');assert.equal(resumo.gastosMes,50);assert.equal(resumo.aReceber,undefined);
 vm.runInContext(h.slice(i,fim),c);c.renderListaFormas();for(const texto of ['Seus gastos no mês','Valor de referência','Referência restante','A pagar nos próximos meses','R$ 50.00 de terceiros','Total no mês:','R$ 70.00','4% Uso','R$ 90,00'])assert(markup.includes(texto),texto);
 assert(!markup.includes('Limite Total'));assert(!markup.includes('Seus gastos na fatura'));assert(!markup.includes('A receber de terceiros'));assert(!markup.includes('R$ 110.00'));assert(!markup.includes('0% Uso'));assert(!markup.includes('Banco:'));
 c.formasGlobais[0].disponivelRaw=0;c.renderListaFormas();assert(markup.includes('Referência atingida'));c.formasGlobais[0].disponivelRaw=-1;c.renderListaFormas();assert(markup.includes('Referência excedida'));horizonte.totalTerceiros.Pix={'12/2026':80};c.renderListaFormas();assert(!markup.includes('Gastos de terceiros no mês'));assert(!markup.includes('A receber de terceiros'));assert(markup.includes('R$ 500,00'));
});
