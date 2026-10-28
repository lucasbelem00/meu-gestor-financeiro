// Carrega a declaração atual promovida ao script principal. O contexto de teste
// fornece o estado compartilhado que, no navegador, é fechado pela integração.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fonte=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
function carregar(contexto,...nomes){
  contexto.estadoIntegracaoInterfaceGestor=contexto;
  for(const nome of nomes){
    const re=new RegExp('    (?:async )?function '+nome+'\\('),m=re.exec(fonte);
    if(!m)throw Error('Função da interface ausente: '+nome);
    const fim=fonte.indexOf('\n    }',m.index);
    if(fim<0)throw Error('Final da função ausente: '+nome);
    vm.runInContext(fonte.slice(m.index,fim+'\n    }'.length),contexto);
  }
}
module.exports=carregar;
