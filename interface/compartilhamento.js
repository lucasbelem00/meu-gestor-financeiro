// Mensagens de texto para celular. Formatação não altera registros ou pagamentos.
function textoLinhaMensagemGestor(valor){return String(valor??'').replace(/[\r\n]+/g,' ').trim();}
function tipoCompraMensagemGestor(parcela){
  const p=textoLinhaMensagemGestor(parcela).replace(/^'/,'');
  if(p==='∞/∞')return '📌 Fixo mensal';
  if(!p||p==='1/1')return '⚡ À vista';
  const m=/^(\d+)\/(\d+)$/.exec(p);
  return m?'➗ Parcela '+Number(m[1])+' de '+Number(m[2]):'Parcela: '+p;
}
function formaMensagemGestor(forma){
  return (typeof formaEhCartaoGestor==='function'&&formaEhCartaoGestor(forma)?'Cartão: ':'Forma: ')+textoLinhaMensagemGestor(forma);
}
function filtrosMensagemGestor(filtros,emprestimo=false){
  const f=filtros||{},linhas=[];
  linhas.push(f.mes?'📅 Referência: '+textoLinhaMensagemGestor(f.mes):'📅 Referência: todos os meses'+(f.ano?' de '+textoLinhaMensagemGestor(f.ano):''));
  if(f.forma)linhas.push(formaMensagemGestor(f.forma));
  if(f.categoria)linhas.push('Categoria: '+textoLinhaMensagemGestor(f.categoria));
  if(f.tag)linhas.push('Tag: #'+textoLinhaMensagemGestor(f.tag).replace(/^#/,''));
  if(f.termo)linhas.push('Busca: '+textoLinhaMensagemGestor(f.termo));
  if(f.tipoRapido)linhas.push('Filtro rápido: '+({parcelados:'Parcelados',fixos:'Fixos',pix:'Pix',apagar:'A pagar',mesatual:'Mês atual'}[f.tipoRapido]||textoLinhaMensagemGestor(f.tipoRapido)));
  if(f.status)linhas.push((emprestimo?'Situação: ':'Situação filtrada: ')+textoLinhaMensagemGestor(f.status));
  return linhas;
}
function montarResumoHistoricoMensagemGestor(itens,resumo,filtros){
  const linhas=['📋 *Resumo de Gastos Filtrados*',...filtrosMensagemGestor(filtros),''];
  const ativos=[],fora=[];
  itens.forEach(item=>{
    const status=textoLinhaMensagemGestor(item[9]);
    const excluido=['assinatura cancelada','ocorrência pulada'].includes(status.toLocaleLowerCase('pt-BR'));
    const bloco=['• *'+textoLinhaMensagemGestor(item[1])+'*','Data: '+textoLinhaMensagemGestor(item[0]),tipoCompraMensagemGestor(item[6]),formaMensagemGestor(item[2])];
    if(item[8])bloco.push('Fatura: '+textoLinhaMensagemGestor(item[8]));
    if(status)bloco.push('Situação: '+status+(excluido?' (fora do total)':''));
    bloco.push('Valor: *'+textoLinhaMensagemGestor(item[7])+'*');
    (excluido?fora:ativos).push(bloco.join('\n'));
  });
  if(ativos.length)linhas.push(ativos.join('\n\n'),'');
  // O total continua sendo o da consulta consistente do servidor, inclusive exclusões.
  linhas.push('💰 *Total:* '+textoLinhaMensagemGestor(resumo.somaTotal));
  if(fora.length)linhas.push('','*Registros fora do total:*','',fora.join('\n\n'));
  return linhas.join('\n');
}
function montarSimulacaoMensagemGestor(s,primeiraFatura){
  const linhas=['💳 *Simulação de compra*','Data: '+textoLinhaMensagemGestor(s.data)];
  if(s.forma)linhas.push(formaMensagemGestor(s.forma));
  if(primeiraFatura)linhas.push('Primeira fatura: '+textoLinhaMensagemGestor(primeiraFatura));
  linhas.push('',s.n===1?'⚡ Compra à vista (1x)':'➗ *'+s.n+' parcelas*');
  if(s.n>1){const contagens=new Map();s.parcelas.forEach(v=>{const c=Math.round(v*100);contagens.set(c,(contagens.get(c)||0)+1);});for(const [c,q]of contagens)linhas.push('• '+q+'x de '+formatBRL(c/100));}
  linhas.push('','💰 *Total da compra: '+formatBRL(s.valor)+'*');
  if(s.avista>0){
    const diferenca=Math.round(s.valor*100)-Math.round(s.avista*100);
    linhas.push('','⚡ Preço à vista: '+formatBRL(s.avista));
    linhas.push(diferenca===0?'Mesmo total nas duas opções.':(diferenca>0?'Economia à vista: ':'Economia no plano simulado: ')+formatBRL(Math.abs(diferenca)/100));
  }
  return linhas.join('\n');
}
function chaveParcelaMensagemGestor(it){
  // Identidade da compra, não descrição/valor, comprova a ligação entre recebimentos.
  return it.compraId?JSON.stringify([it.compraId,it.pessoa,it.descricao,it.forma,it.parcela,it.mesFatura,it.dataCombinada||'']):null;
}
function montarCobrancaMensagemGestor(pessoa,itens,filtros,contexto=itens){
  const f=filtros||{},grupos=new Map();let total=0,recebido=0;
  for(const [indice,it]of itens.entries()){
    if(!['A Receber','Recebido'].includes(it.status))continue;
    const chave=chaveParcelaMensagemGestor(it)||'isolado:'+indice;
    if(!grupos.has(chave))grupos.set(chave,{item:it,aberto:0,recebido:0,chave:chaveParcelaMensagemGestor(it)});
    const g=grupos.get(chave),valor=Math.round(Number(it.valorRaw)*100);
    if(!Number.isSafeInteger(valor)||valor<0)throw Error('Confira os valores dos empréstimos antes de compartilhar.');
    if(it.status==='Recebido'){g.recebido+=valor;recebido+=valor;}else{g.aberto+=valor;total+=valor;}
  }
  const linhas=['🤝 *Resumo '+(grupos.size>1?'dos Empréstimos':'do Empréstimo')+' — '+textoLinhaMensagemGestor(pessoa)+'*',...filtrosMensagemGestor(f,true),''];
  const pendentes=[],quitados=[],unico=grupos.size===1;
  for(const g of grupos.values()){
    const it=g.item;
    // Sob A Receber, os fragmentos recebidos disponíveis explicam o saldo, sem
    // entrar no total cobrado. Não inferir recebimentos pela quitação no banco.
    let recebidoGrupo=g.recebido;
    if(f.status==='A Receber'&&g.chave)recebidoGrupo=contexto.filter(r=>r.pessoa===pessoa&&r.status==='Recebido'&&chaveParcelaMensagemGestor(r)===g.chave).reduce((s,r)=>s+Math.round(Number(r.valorRaw)*100),0);
    const bloco=['• *'+textoLinhaMensagemGestor(it.descricao)+'*',tipoCompraMensagemGestor(it.parcela),formaMensagemGestor(it.forma)];
    if(it.mesFatura&&(!f.mes||it.mesFatura!==f.mes))bloco.push('Referência: '+textoLinhaMensagemGestor(it.mesFatura));
    if(g.aberto>0&&it.dataCombinada)bloco.push('Devolver até: '+textoLinhaMensagemGestor(it.dataCombinada));
    if(g.aberto>0){
      if(recebidoGrupo>0){bloco.push('Valor: '+formatBRL((g.aberto+recebidoGrupo)/100),'Já recebido: '+formatBRL(recebidoGrupo/100));if(!unico)bloco.push('Falta devolver: *'+formatBRL(g.aberto/100)+'*');}
      else if(!unico)bloco.push('Valor: *'+formatBRL(g.aberto/100)+'*');
      pendentes.push(bloco.join('\n'));
    }else{if(!unico)bloco.push('Recebido: *'+formatBRL(g.recebido/100)+'*');quitados.push(bloco.join('\n'));}
  }
  if(pendentes.length)linhas.push(pendentes.join('\n\n'),'','💰 *'+(unico?'Valor a devolver':'Total a devolver')+': '+formatBRL(total/100)+'*');
  if(quitados.length)linhas.push(...(pendentes.length?['']:[]),'*Valores recebidos:*','',quitados.join('\n\n'));
  if(f.status!=='A Receber'&&recebido>0)linhas.push('','✅ *Total Recebido: '+formatBRL(recebido/100)+'*');
  return linhas.join('\n');
}
