const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function carregarRegrasRascunho(c){
 const s=fs.readFileSync(path.resolve(__dirname,'../../interface/rotina.js'),'utf8');
 for(const [a,b]of [['function dataPadraoRascunhoGestor(','function chaveConclusaoRascunhoRotinaGestor('],['function rascunhoFormularioVazioRotinaGestor(','function guardarRascunhoRotinaGestor(']]){
  const i=s.indexOf(a),f=s.indexOf(b,i);if(i<0||f<i)throw Error('Trecho de rascunho não localizado');vm.runInContext(s.slice(i,f),c);
 }
};
