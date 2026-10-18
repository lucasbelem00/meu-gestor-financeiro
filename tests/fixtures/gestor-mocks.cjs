const fs=require('node:fs'), vm=require('node:vm'), crypto=require('node:crypto'), path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../Backend/Code.gs'),'utf8');
const clone=v=>Array.isArray(v)?v.map(clone):v instanceof Date?new Date(v):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)])):v;
class Sheet {
  constructor(name,rows,db){this.name=name;this.rows=clone(rows);this.db=db;this.formats={};this.literais=new Set();}
  getName(){return this.name;}
  getLastRow(){let n=this.rows.length;while(n>0&&!this.rows[n-1].some(v=>v!==''&&v!==null&&v!==undefined))n--;return n;}
  getDataRange(){let col=Math.max(1,...this.rows.map(r=>r.length));return this.getRange(1,1,Math.max(1,this.getLastRow()),col);}
  getRange(row,col,n=1,m=1){
    if(typeof row==='string'){let a=row.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);const num=s=>s.split('').reduce((a,x)=>a*26+x.charCodeAt(0)-64,0);row=Number(a[2]);col=num(a[1]);n=a[4]?Number(a[4])-row+1:1;m=a[3]?num(a[3])-col+1:1;}
    const sh=this;const raw=()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>clone(sh.rows[row-1+i]?.[col-1+j]??'')));
    const isFormula=(x,i,j)=>typeof x==='string'&&x.startsWith('=')&&!sh.literais.has((row-1+i)+':'+(col-1+j));
    const calc=(x,i,j)=>isFormula(x,i,j)?(x==='=1000+1000'?2000:Number(x.slice(1))||0):x;
    const rg={getValues:()=>raw().map((r,i)=>r.map((x,j)=>calc(x,i,j))),getFormulas:()=>raw().map((r,i)=>r.map((x,j)=>isFormula(x,i,j)?x:'')),getDisplayValues:()=>raw().map((r,i)=>r.map((x,j)=>x instanceof Date?formatDate(x,'','dd/MM/yyyy'):String(calc(x,i,j)))),getNumberFormats:()=>raw().map(()=>Array(m).fill('General')),
      setValues(values){if(n!==values.length||values.some(r=>r.length!==m))throw Error('dims '+sh.name);sh.db.maybeFail(sh.name,'before',row,col);values.forEach((r,i)=>r.forEach((v,j)=>{sh.rows[row-1+i]??=[];const literal=typeof v==='string'&&v.startsWith("'");const key=(row-1+i)+':'+(col-1+j);if(literal)sh.literais.add(key);else sh.literais.delete(key);sh.rows[row-1+i][col-1+j]=literal?v.slice(1):clone(v);}));sh.db.maybeFail(sh.name,'after',row,col);return rg;},getValue(){return rg.getValues()[0][0];},setValue(v){return rg.setValues([[v]]);},clearContent(){return rg.setValues(Array.from({length:n},()=>Array(m).fill('')));}};
    for(const k of ['setNumberFormats','setNumberFormat','setFontWeight','setBackground','setFontColor'])rg[k]=()=>rg;
    return rg;
  }
  deleteRow(r){this.rows.splice(r-1,1);}
  setFrozenRows(){}hideSheet(){}
}
class DB {
  constructor(data={}){this.sheets={};this.failure=null;for(const [name,rows]of Object.entries(data))this.sheets[name]=new Sheet(name,rows,this);}
  getSheetByName(n){return this.sheets[n]??null;}
  insertSheet(n){if(this.sheets[n])throw Error('Already exists');return this.sheets[n]=new Sheet(n,[],this);}
  getName(){return 'Teste isolado';}getSpreadsheetTimeZone(){return 'America/Sao_Paulo';}toast(){}
  maybeFail(name,stage,row,col){if(this.failure&&this.failure.name===name&&this.failure.stage===stage&&(!this.failure.row||this.failure.row===row)&&(!this.failure.col||this.failure.col===col)){this.failure=null;throw Error('FALHA SIMULADA '+stage+' '+name);}}
}
function formatDate(d,t,f){const p=n=>String(n).padStart(2,'0');if(f==='yyyy-MM-dd')return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;if(f==='dd/MM/yyyy')return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;return d.toISOString();}
function boot(data={}){
 const db=new DB(data), props=new Map([['GESTOR_PLANILHA_ID','fixture'],['GESTOR_API_BRIDGE_ENABLED','true'],['GESTOR_API_TOKEN','fake-token']]);
 const lock={has:false,waitLock(){if(this.has)throw Error('NESTED REAL LOCK');this.has=true;},tryLock(){if(this.has)return false;this.has=true;return true;},releaseLock(){if(!this.has)throw Error('UNOWNED LOCK');this.has=false;}};
 const ctx=vm.createContext({console,Date,Set,Map,JSON,Math,Number,ContentService:{MimeType:{JSON:'json'},createTextOutput:()=>({content:'',setMimeType(){return this;},setContent(c){this.content=c;return this;}})},LockService:{getScriptLock:()=>lock},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},SpreadsheetApp:{openById:()=>db,flush(){}},Session:{getScriptTimeZone:()=> 'America/Sao_Paulo'},Utilities:{newBlob:s=>({getBytes:()=>Array.from(Buffer.from(s))}),parseDate:(s)=>new Date(s),getUuid:()=>crypto.randomUUID(),computeDigest:(alg,s)=>[...crypto.createHash('sha256').update(s).digest()].map(n=>n>127?n-256:n),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},formatDate}});
 vm.runInContext(source,ctx);ctx.getHojeSeguro=()=>new Date(2026,9,16);
 return {ctx,db,lock,props};
}
const ledgerHeader=['Data','Descrição','Forma','Categoria','Total','Qtd','Parcela','Valor','Mês','Situação','Tags'];
const empHeader=['Data','Pessoa','Descrição','Forma','Total','Qtd','Parcela','Valor','Mês','Situação','Obs'];
const payment=[...Array.from({length:6},()=>[]),['','Cartao','Banco',1000,5,10,'',0]];
const fixture=(lanc=[],emp=[])=>clone({'Lançamentos':[ledgerHeader,...lanc],'Empréstimos':[empHeader,...emp],'Formas de Pagamento':payment,'Dashboard & Resumo':Array.from({length:42},()=>Array(4).fill(''))});
const personal=(desc='Compra',val=50,part='1/1',mes='10/2026',status='Em Aberto',forma='Cartao',date='01/10/2026')=>[date,desc,forma,'Teste',val,1,part,val,mes,status,''];
const loan=(person='Ana',status='A Receber',val=120,forma='Pix')=>['01/10/2026',person,'Ajuda',forma,val,1,'1/1',val,'10/2026',status,''];
const launch={dataCompra:'16/10/2026',descricao:'Teste',formaPagto:'Cartao',categoria:'Teste',valorTotal:100,numParcelas:3,parcelaInicial:1,mesPrimeiraFatura:'10/2026'};
module.exports={boot,fixture,personal,loan,launch,clone};
