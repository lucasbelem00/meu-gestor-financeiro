// Fonte única do cálculo, incorporada no navegador e no Apps Script pelo build.
function calcularDivisaoContaGestor(dados) {
  const d=dados || {}, pessoas=d.pessoas || [], itens=d.itens || [];
  const inteiro=(v,rotulo)=>{if(!Number.isSafeInteger(v)||v<0||v>100000000000) throw new Error(rotulo+' inválido.');return v;};
  if(!Array.isArray(pessoas)||!pessoas.length||pessoas.length>100||!Array.isArray(itens)||!itens.length||itens.length>500) throw new Error('Informe de 1 a 100 pessoas e de 1 a 500 itens.');
  const ids=new Set(), nomes=new Set();
  const partes=pessoas.map(p=>{
    const id=String(p.id || ''), nome=String(p.nome || '').trim(), peso=Number(p.peso==null?1:p.peso);
    const chave=nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(!id||id.length>160||!nome||nome.length>80||ids.has(id)||nomes.has(chave)||!Number.isFinite(peso)||peso<0.01||peso>100) throw new Error('Confira nomes distintos e cotas entre 0,01 e 100.');
    ids.add(id);nomes.add(chave);
    return {id:id,nome:nome,peso:peso,pagoCentavos:inteiro(p.pagoCentavos==null?0:p.pagoCentavos,'Pagamento'),baseCentavos:0,itens:[]};
  });
  function repartir(total,pesos) {
    const soma=pesos.reduce((s,p)=>s+p,0);
    if(!soma) {if(total) throw new Error('Não há pessoas para dividir o valor.');return pesos.map(()=>0);}
    const cotas=pesos.map((peso,i)=>{const c=total*peso/soma;return {i:i,valor:Math.floor(c),resto:c-Math.floor(c)};});
    let sobra=total-cotas.reduce((s,c)=>s+c.valor,0);
    cotas.slice().sort((a,b)=>b.resto-a.resto||a.i-b.i).forEach(c=>{if(sobra>0){cotas[c.i].valor++;sobra--;}});
    if(sobra) throw new Error('Não foi possível distribuir os centavos.');
    return cotas.map(c=>c.valor);
  }
  const idsItens=new Set();let base=0;
  itens.forEach(it=>{
    const valor=inteiro(it.valorCentavos,'Valor do item'), id=String(it.id || '');
    if(!id||idsItens.has(id)||!valor||!Array.isArray(it.consumidores)||!it.consumidores.length||new Set(it.consumidores).size!==it.consumidores.length||it.consumidores.some(c=>!ids.has(c))) throw new Error('Confira o valor e os consumidores de cada item.');
    idsItens.add(id);base+=valor;inteiro(base,'Total da conta');
    const consumidores=partes.filter(p=>it.consumidores.includes(p.id));
    const valores=repartir(valor,consumidores.map(p=>p.peso));
    consumidores.forEach((p,i)=>{p.baseCentavos+=valores[i];p.itens.push(String(it.descricao || 'Item'));});
  });
  const desconto=inteiro(d.descontoCentavos==null?0:d.descontoCentavos,'Desconto'), acrescimo=inteiro(d.acrescimoCentavos==null?0:d.acrescimoCentavos,'Acréscimo'), percentual=Number(d.servicoPercentual==null?0:d.servicoPercentual);
  if(desconto>base||!Number.isFinite(percentual)||percentual<0||percentual>100) throw new Error('Confira o desconto e a taxa de serviço (0 a 100%).');
  const descontos=repartir(desconto,partes.map(p=>p.baseCentavos));
  const bases=partes.map((p,i)=>p.baseCentavos-descontos[i]);
  const taxa=Math.round((base-desconto)*percentual/100);
  const rateioAcrescimos=d.rateioAcrescimos||'consumo';
  if(!['consumo','igual'].includes(rateioAcrescimos))throw new Error('Escolha como dividir os acréscimos: pelo consumo ou igualmente por pessoa.');
  const taxas=repartir(taxa,bases), extras=repartir(acrescimo,partes.map(p=>rateioAcrescimos==='igual'?1:p.baseCentavos));
  partes.forEach((p,i)=>{p.descontoCentavos=descontos[i];p.taxaCentavos=taxas[i];p.acrescimoCentavos=extras[i];p.finalCentavos=bases[i]+taxas[i]+extras[i];p.saldoCentavos=p.finalCentavos-p.pagoCentavos;});
  const total=inteiro(base-desconto+taxa+acrescimo,'Total final'), pago=partes.reduce((s,p)=>s+p.pagoCentavos,0);
  if(pago>total) throw new Error('Os pagamentos ao estabelecimento ultrapassam o total da conta.');
  const devedores=partes.filter(p=>p.saldoCentavos>0).map(p=>({id:p.id,valor:p.saldoCentavos}));
  const credores=partes.filter(p=>p.saldoCentavos<0).map(p=>({id:p.id,valor:-p.saldoCentavos}));
  const transferencias=[];
  credores.forEach(c=>{devedores.forEach(p=>{const valor=Math.min(c.valor,p.valor);if(valor>0){transferencias.push({de:p.id,para:c.id,valorCentavos:valor});c.valor-=valor;p.valor-=valor;}});});
  return {pessoas:partes,rateioAcrescimos:rateioAcrescimos,baseCentavos:base,descontoCentavos:desconto,taxaCentavos:taxa,acrescimoCentavos:acrescimo,totalCentavos:total,pagoCentavos:pago,pendenteEstabelecimentoCentavos:total-pago,transferencias:transferencias};
}
