// Identidade dos botões de ação, inclusive rótulos substituídos após cliques.
// Não altera ações, atributos de envio, controles numéricos ou filtros selecionáveis.
function rotuloAcaoBotaoGestor(valor){
 const original=String(valor??'').trim();
 if(['✏️','✏'].includes(original))return '✏️ Editar';
 if(['🗑️','🗑'].includes(original))return '🗑️ Excluir';
 const texto=original.replace(/^(?:(?:⚙️?|✏️?|🗑️?|📋|📲|🧹|➕|\+|🔁|⚖️?|💰|✅|❌|↩️?|↻|💾|📤|🫴|🔎|🔍|⏳|✕|📅|🎛️?|🤝|↔️?|💳|➖)\s*)+/u,'').replace(/^Conferir recebimento$/,'Registrar recebimento parcial');
 const regras=[
  [/^(Organizar|Gerenciar)\b/,'⚙️'],
  [/^Editar\b/,'✏️'],[/^(Excluir|Remover)\b/,'🗑️'],
  [/^(Adicionar|Incluir|Lançar|Registrar [Ee]mpréstimo|Registrar divisão|Preencher minha parte|Pessoa$|Opção\b)/,'➕'],
  [/^Filtros$/,'🎛️'],[/^Limpar\b/,'🧹'],[/^Copiar\b/,'📋'],[/^Cobrar\b/,'🫴'],
  [/^(Registrar|Confirmar) recebimento parcial/i,'➖'],
  [/^(Registrar recebimento|Receber\b|Confirmar [Rr]ecebimento)/,'💰'],
  [/^Registrar pagamento\b/,'💳'],[/^Transferir\b/,'↔️'],[/^Compartilhar\b/,'📤'],[/^Repetir\b/,'🔁'],
  [/^Prévia(?: para)? WhatsApp$/,'📲'],[/^Comparar meses\b/,'📅'],[/^Comparar(?: preços)?$/,'⚖️'],
  [/^Conferir fatura\b/,'💳'],[/^Comparar com\b/,'🔎'],[/^(Conferir|Consultar)\b/,'🔎'],[/^Buscar\b/,'🔍'],
  [/^(Salvar|Guardar)\b/,'💾'],[/^Atualizar\b/,'↻'],
  [/^(Cancelar|Fechar)\b/,'✕'],[/^Desativar\b/,'⏸️'],[/^Reativar\b/,'▶️'],
  [/^(Marcar concluído|Confirmar\b|Sim, [Cc]onfirmar)/,'✅'],[/^Reabrir\b/,'↩️'],
  [/^(Enviando|Salvando|Conferindo|Processando|Transferindo|Baixando|Preparando)\b/,'⏳']
 ];
 const regra=regras.find(([teste])=>teste.test(texto));
 return regra?regra[1]+' '+texto.replace(/^Organizar\b/,'Gerenciar').replace(/^Prévia WhatsApp$/,'Prévia para WhatsApp').replace(/\s+(?:⚡|🤝|👇)$/u,''):original;
}
function padronizarBotaoAcaoGestor(botao){
 if(!botao||botao.tagName!=='BUTTON'||botao.children.length||botao.hasAttribute('aria-pressed')||botao.hasAttribute('data-menu-aba'))return;
 const original=botao.textContent,novo=rotuloAcaoBotaoGestor(original);
 if(novo!==original)botao.textContent=novo;
}
function iniciarPadraoBotoesGestor(){
 document.querySelectorAll('button').forEach(padronizarBotaoAcaoGestor);
 if(typeof MutationObserver!=='function')return;
 const observador=new MutationObserver(registros=>{
  const candidatos=new Set();
  for(const r of registros){
   const alvo=r.target.nodeType===1?r.target:r.target.parentElement;
   const pai=alvo?.closest?.('button');if(pai)candidatos.add(pai);
   for(const n of r.addedNodes||[]){if(n.nodeType!==1)continue;if(n.tagName==='BUTTON')candidatos.add(n);n.querySelectorAll?.('button').forEach(b=>candidatos.add(b));}
  }
  candidatos.forEach(padronizarBotaoAcaoGestor);
 });
 observador.observe(document.body,{subtree:true,childList:true,characterData:true});
}
document.addEventListener('DOMContentLoaded',iniciarPadraoBotoesGestor);
