const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {boot,fixture,loan,clone}=require('./fixtures/gestor-mocks.cjs');
const api=(a,n,p)=>a.ctx.executarAcaoApi_(n,p||null);
function ambiente(){
 const linhas=Array.from({length:4},(_,i)=>{const r=loan('Ana',i===2?'Recebido':'A Receber',100,'Cartao');r[4]=400;r[5]=4;r[6]=(i+1)+'/4';r[8]=String(10+i).padStart(2,'0')+'/2026';if(i===3)r[8]='01/2027';return r;});
 const a=boot(fixture([],linhas));a.ctx.console={log(){}};api(a,'getDadosCompletos');return a;
}
const linhas=a=>a.db.sheets['Empréstimos'].rows.slice(1),item=(a,p)=>linhas(a).find(r=>r[6]===p);
function pedido(a,extras={}){const r=item(a,'2/4');return {registroId:r[11],compraId:r[12],versao:r[13],linha:3,descOriginal:r[2],mesOriginal:r[8],parcelaOriginal:r[6],dataCompra:r[0],pessoa:r[1],descricao:r[2],formaPagto:r[3],valorParcela:90,mesFatura:r[8],status:r[9],observacoes:r[10],escopoValorParcelas:'proximas',...extras};}
test('valor e datas em conjunto alcançam esta e próximas a receber; preservam anteriores e recebidas',()=>{
 const a=ambiente(),antes=clone(linhas(a)),p=pedido(a,{escopoDataCombinada:'proximas',dataCombinada:'31/01/2027'}),pre=api(a,'previaEdicaoEmprestimoWeb',p);
 assert.deepEqual(Array.from(pre.valores.itens,i=>[i.parcela,i.antes,i.depois]),[['2/4',100,90],['4/4',100,90]]);assert.deepEqual(Array.from(pre.datas.itens,i=>[i.parcela,i.depois]),[['2/4','31/01/2027'],['4/4','31/03/2027']]);
 const envio={...p,assinaturaValores:pre.valores.assinatura,assinaturaDatas:pre.datas.assinatura,requestId:'escopos-valor-datas-001'};api(a,'editarEmprestimoLinhaWeb',envio);
 for(const parcela of ['1/4','3/4']){const r=item(a,parcela),original=antes.find(i=>i[6]===parcela);assert.equal(r[7],100);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(r),'');assert.equal(r[9],original[9]);assert.equal(r[17],original[17]);}
 assert.equal(item(a,'2/4')[7],90);assert.equal(item(a,'4/4')[7],90);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(item(a,'4/4')),'31/03/2027');const salvo=JSON.stringify(linhas(a));api(a,'editarEmprestimoLinhaWeb',envio);assert.equal(JSON.stringify(linhas(a)),salvo);
});
test('escopo individual de valor é independente da aplicação de datas às próximas',()=>{
 const a=ambiente(),p=pedido(a,{escopoValorParcelas:'parcela',escopoDataCombinada:'proximas',dataCombinada:'14/12/2026'}),pre=api(a,'previaEdicaoEmprestimoWeb',p);assert.equal(pre.valores,null);api(a,'editarEmprestimoLinhaWeb',{...p,assinaturaDatas:pre.datas.assinatura,requestId:'escopos-individual-001'});assert.equal(item(a,'2/4')[7],90);assert.equal(item(a,'4/4')[7],100);assert.equal(a.ctx.dataCombinadaEmprestimoGestor_(item(a,'4/4')),'14/02/2027');
});
test('bulk sem prévia, com novo valor ou com uma parcela recebida depois da prévia é recusado',()=>{
 for(const caso of ['sem previa','valor diferente','recebido depois']){const a=ambiente(),p=pedido(a),pre=api(a,'previaEdicaoEmprestimoWeb',p);if(caso==='valor diferente')p.valorParcela=95;if(caso==='recebido depois'){item(a,'4/4')[9]='Recebido';item(a,'4/4')[13]++;}const antes=JSON.stringify(linhas(a));assert.throws(()=>api(a,'editarEmprestimoLinhaWeb',{...p,assinaturaValores:caso==='sem previa'?'':pre.valores.assinatura,requestId:'escopos-conferencia-001'}),/prévia/);assert.equal(JSON.stringify(linhas(a)),antes);}
});
test('novo valor não pode ficar abaixo do que já foi pago ao banco em uma parcela futura',()=>{
 const a=ambiente();item(a,'4/4')[17]=95;const antes=JSON.stringify(linhas(a));assert.throws(()=>api(a,'previaEdicaoEmprestimoWeb',pedido(a)),/menor que o pagamento/);assert.equal(JSON.stringify(linhas(a)),antes);
});
test('prévia de troca para Pix usa valor antigo nas parcelas anteriores e novo nas próximas',()=>{
 const a=ambiente(),p=pedido(a,{formaPagto:'Pix'}),pre=api(a,'previaEdicaoEmprestimoWeb',p);assert.equal(pre.pagamentoPix.total,280);api(a,'editarEmprestimoLinhaWeb',{...p,assinaturaValores:pre.valores.assinatura,assinaturaPix:pre.pagamentoPix.assinatura,confirmarPagamentoPix:true,requestId:'escopos-pix-001'});assert.equal(item(a,'1/4')[7],100);assert.equal(item(a,'1/4')[17],100);assert.equal(item(a,'2/4')[7],90);assert.equal(item(a,'4/4')[17],90);assert.equal(item(a,'3/4')[7],100);assert.equal(item(a,'3/4')[3],'Cartao');
});
test('escopo inválido e aplicação em conjunto partindo de recebido são recusados',()=>{
 const a=ambiente();assert.throws(()=>api(a,'editarEmprestimoLinhaWeb',pedido(a,{escopoValorParcelas:'todas',requestId:'escopos-invalido-001'})),/onde aplicar/);const b=ambiente(),r=item(b,'3/4'),p=pedido(b,{registroId:r[11],versao:r[13],linha:4,mesOriginal:r[8],parcelaOriginal:r[6],mesFatura:r[8],status:r[9]});assert.throws(()=>api(b,'previaEdicaoEmprestimoWeb',p),/parcelas a receber/);
});
test('editor novo exige servidor compatível antes de consultar prévia ou enviar alterações',async()=>{
 const chamadas=[],c=vm.createContext({protocoloServidorGestor:16,metadadosAcaoGestor:()=>({exigeProtocoloAtual:false}),apiCall:async n=>{chamadas.push(n);}});c.window=c;const s=fs.readFileSync('interface/rotina.js','utf8'),i=s.indexOf('const apiAntesRotinaGestor='),f=s.indexOf('function alternarModoEmprestimosGestor(',i);vm.runInContext(s.slice(i,f),c);
 await assert.rejects(c.apiCall('previaEdicaoEmprestimoWeb',{escopoValorParcelas:'proximas'}),/Backend\/Code.gs/);assert.deepEqual(chamadas,['getDadosCompletos']);c.protocoloServidorGestor=17;await c.apiCall('previaEdicaoEmprestimoWeb',{escopoValorParcelas:'proximas'});assert.equal(chamadas.at(-1),'previaEdicaoEmprestimoWeb');
});

test('cada edição reinicia os dois menus em individual e limita opções para compra única ou recebida',()=>{
 const els=new Map(),el=id=>{if(!els.has(id))els.set(id,{value:'',options:[{value:'parcela'},{value:'proximas'}],classList:{add(){},remove(){}}});return els.get(id);};
 const c=vm.createContext({document:{getElementById:el},novoRequestIdGestor:()=> 'sessao-ficticia',preencherDataTripla(){},definirValorMoeda:(id,v)=>el(id).value=v,lerValorMoeda:v=>typeof v==='number'?v:Number(el(v).value),restaurarBotoesEditorEmpGestor(){},categoriasGlobaisEdit:[]});const h=fs.readFileSync('index.html','utf8'),i=h.indexOf('      function abrirModalEdicaoEmp('),f=h.indexOf('    function fecharModalEdicaoEmp()',i);assert(i>=0&&f>i);vm.runInContext(h.slice(i,f),c);
 const abrir=(parcela,status='A Receber')=>c.abrirModalEdicaoEmp('ref','01/10/2026','Ana','Compra','Cartao',100,'10/2026',status,parcela,'');abrir('2/4');for(const id of ['escopoValorEmpGestor','escopoDataCombinadaEmpGestor']){assert.equal(el(id).value,'parcela');assert.equal(el(id).options[1].disabled,false);el(id).value='proximas';}
 abrir('1/1');for(const id of ['escopoValorEmpGestor','escopoDataCombinadaEmpGestor']){assert.equal(el(id).value,'parcela');assert.equal(el(id).options[1].disabled,true);}abrir('2/4','Recebido');for(const id of ['escopoValorEmpGestor','escopoDataCombinadaEmpGestor'])assert.equal(el(id).disabled,true);
});
