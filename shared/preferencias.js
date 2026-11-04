const ABA_PREFERENCIAS_APP_GESTOR_='Preferências do app';
const CAB_PREFERENCIAS_APP_GESTOR_=['Chave','Valor JSON','Versão'];
function validarPreferenciasAppGestor_(linhas){
 if(!Array.isArray(linhas)||linhas.length>2||JSON.stringify(linhas[0])!==JSON.stringify(CAB_PREFERENCIAS_APP_GESTOR_))throw Error('Estrutura de preferências inválida.');
 for(const r of linhas.slice(1)){if(r.length!==3||r[0]!=='limitePessoal'||typeof r[1]!=='string'||!Number.isSafeInteger(r[2])||r[2]<1)throw Error('Preferência inválida.');let v;try{v=JSON.parse(r[1]);}catch(_){throw Error('Valor de preferência inválido.');}if(!v||!Number.isSafeInteger(v.centavos)||v.centavos<0||typeof v.incluirPrevistos!=='boolean')throw Error('Limite pessoal inválido.');}return linhas;
}
function lerPreferenciasAppGestor_(){
 const sh=obterPlanilhaGestor_().getSheetByName(ABA_PREFERENCIAS_APP_GESTOR_);if(!sh||!sh.getLastRow())return {limitePessoal:null,versao:0};
 const range=sh.getDataRange();if(range.getFormulas().some(r=>r.some(Boolean)))throw Error('Preferências não aceita fórmulas.');
 const linhas=validarPreferenciasAppGestor_(range.getValues()),r=linhas[1];return {limitePessoal:r?JSON.parse(r[1]):null,versao:r?r[2]:0};
}
function salvarLimitePessoalWeb(p){return executarOperacaoGestor_('salvarLimitePessoalWeb',p,()=>{
 const atual=lerPreferenciasAppGestor_();if(p.versao!==atual.versao)throw Error('O limite mudou em outro aparelho. Atualize os dados antes de salvar.');
 const v={centavos:p.centavos,incluirPrevistos:p.incluirPrevistos},linhas=[CAB_PREFERENCIAS_APP_GESTOR_,['limitePessoal',JSON.stringify(v),atual.versao+1]];validarPreferenciasAppGestor_(linhas);
 const ss=obterPlanilhaGestor_(),sh=ss.getSheetByName(ABA_PREFERENCIAS_APP_GESTOR_)||ss.insertSheet(ABA_PREFERENCIAS_APP_GESTOR_);sh.getRange(1,1,2,3).setValues(linhas);return {limitePessoal:v,versao:atual.versao+1};
},false);}
