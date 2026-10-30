// Limites iguais em cadastro, relatórios, backup e organização anual.
// Mantém os anos históricos já aceitos pelo cadastro antes da organização anual.
const ANO_MIN_COMPETENCIA_GESTOR_=1900;
const ANO_MAX_COMPETENCIA_GESTOR_=2200;
function anoCompetenciaValidoGestor_(ano){return Number.isInteger(ano)&&ano>=ANO_MIN_COMPETENCIA_GESTOR_&&ano<=ANO_MAX_COMPETENCIA_GESTOR_;}
function validarPeriodoParcelasGestor_(valor,quantidade=1,inicial=1){
  const texto=String(valor||'').replace(/^'/,'').trim(),p=/^(\d{2})\/(\d{4})$/.exec(texto);
  if(!p||Number(p[1])<1||Number(p[1])>12||!anoCompetenciaValidoGestor_(Number(p[2])))throw Error('Mês da fatura inválido. Use MM/AAAA, entre '+ANO_MIN_COMPETENCIA_GESTOR_+' e '+ANO_MAX_COMPETENCIA_GESTOR_+'.');
  if(!Number.isInteger(quantidade)||!Number.isInteger(inicial)||inicial<1||quantidade<inicial)throw Error('Confira a quantidade de parcelas e a parcela inicial.');
  const ultimoAno=Math.floor((Number(p[2])*12+Number(p[1])-1+quantidade-inicial)/12);
  if(!anoCompetenciaValidoGestor_(ultimoAno))throw Error('As parcelas ultrapassam o ano máximo permitido ('+ANO_MAX_COMPETENCIA_GESTOR_+'). Confira o mês da primeira fatura e as parcelas.');
  return texto;
}
