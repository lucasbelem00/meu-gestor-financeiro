const {boot,fixture,personal,loan,launch,clone}=require('./gestor-mocks.cjs');
function ambienteProtecao(dados=fixture()){
 const b=boot(dados),arquivos=new Map(),planilhas=new Map([['fixture',b.db]]),gatilhos=[];let n=0;
 const iter=lista=>({hasNext(){return lista.length>0;},next(){if(!lista.length)throw Error('fim');return lista.shift();}});
 const pasta={id:'pasta-123456789',getId(){return this.id;},getUrl(){return 'https://drive.google.com/drive/folders/'+this.id;},getSharingAccess:()=> 'PRIVATE',getEditors:()=>[],getViewers:()=>[],isTrashed:()=>false,
  getFilesByName:nome=>iter([...arquivos.values()].filter(a=>a.nome===nome&&a.pasta===pasta.id)),
  createFile(nome,texto,mime){const a=arquivo('arquivo-'+String(++n).padStart(8,'0'),nome,texto);a.pasta=pasta.id;a.mime=mime;arquivos.set(a.id,a);return a;}};
 function arquivo(id,nome,texto=''){return {id,nome,texto,pasta:'root',getId(){return id;},getUrl(){return 'https://drive.google.com/file/d/'+id+'/view';},getBlob(){return {getDataAsString:()=>this.texto};},moveTo(p){this.pasta=p.id;return this;}};}
 b.ctx.DriveApp={Access:{PRIVATE:'PRIVATE'},getFolderById:id=>{if(id!==pasta.id)throw Error('pasta desconhecida');return pasta;},getFoldersByName:nome=>iter(nome==='Backups do Gestor de Gastos'?[pasta]:[]),createFolder:()=>pasta,getFileById:id=>{if(!arquivos.has(id))throw Error('arquivo desconhecido '+id);return arquivos.get(id);}};
 b.ctx.SpreadsheetApp.openById=id=>{if(!planilhas.has(id))throw Error('planilha desconhecida '+id);return planilhas.get(id);};
 b.ctx.SpreadsheetApp.create=nome=>{const id='planilha-'+String(++n).padStart(8,'0'),db=new b.db.constructor({});db.getId=()=>id;db.getName=()=>nome;planilhas.set(id,db);arquivos.set(id,arquivo(id,nome));return db;};
 b.ctx.ScriptApp={getProjectTriggers:()=>gatilhos,newTrigger:nome=>{const builder={timeBased(){return this;},atHour(){return this;},everyDays(){return this;},inTimezone(){return this;},create(){const g={getHandlerFunction:()=>nome};gatilhos.push(g);return g;}};return builder;}};
 const formatar=b.ctx.Utilities.formatDate;b.ctx.Utilities.formatDate=(d,t,f)=>f==='yyyy-MM'?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`:formatar(d,t,f);
 b.ctx.console={log(){}};
 function carregar(){return b.ctx.executarAcaoApi_('getDadosCompletos',null);}
 function ativar(){carregar();return b.ctx.configurarProtecaoAutomaticaGestor(pasta.id);}
 function manter(){const previa=b.ctx.previaManutencaoProtegidaWeb();return b.ctx.executarManutencaoProtegidaWeb({confirmacao:'ARQUIVAR',assinatura:previa.assinatura});}
 return {...b,arquivos,planilhas,pasta,gatilhos,carregar,ativar,manter};
}
module.exports={ambienteProtecao,fixture,personal,loan,launch,clone};
