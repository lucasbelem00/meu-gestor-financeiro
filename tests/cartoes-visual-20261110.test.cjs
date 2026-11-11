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
