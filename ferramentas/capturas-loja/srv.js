// Servidor local pra capturar telas do Spot.
//  - serve o repo (o app precisa de http; em file:// o localStorage lança e o script morre)
//  - /img?u=  passthrough same-origin de foto externa, com cache em disco.
//             Sem cache o Wikimedia devolve 429: a mesma foto é pedida a cada
//             redesenho de tela, e são muitos redesenhos.
//  - /save    grava o PNG que o html2canvas produziu
const http=require('http'),fs=require('fs'),path=require('path'),https=require('https'),
      crypto=require('crypto'),os=require('os');
const RAIZ=path.resolve(process.argv[2]), SAIDA=process.argv[3], PORTA=+(process.argv[4]||8795);
const CACHE=path.join(os.tmpdir(),'spot-fotos'); fs.mkdirSync(CACHE,{recursive:true});
// O Wikimedia exige User-Agent que diga quem é e como falar com você.
// "Mozilla/5.0" genérico é justamente o que eles barram.
const UA='SpotAppStoreShots/1.0 (https://meuspot.app; suporte@meuspot.app)';
const TIPO={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};

function baixar(alvo,saltos,cb){
  if(saltos>4)return cb(new Error('voltas demais'));
  https.get(alvo,{headers:{'User-Agent':UA,Accept:'image/*'}},r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){
      r.resume();
      return baixar(new URL(r.headers.location,alvo).href,saltos+1,cb);
    }
    const ps=[];r.on('data',d=>ps.push(d));
    r.on('end',()=>cb(null,r.statusCode,r.headers['content-type']||'image/jpeg',Buffer.concat(ps)));
  }).on('error',cb);
}

http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');

  if(u.pathname==='/img'){
    const alvo=u.searchParams.get('u');
    if(!alvo){res.writeHead(400);return res.end('sem u');}
    const chave=path.join(CACHE,crypto.createHash('sha1').update(alvo).digest('hex'));
    if(fs.existsSync(chave)){
      res.writeHead(200,{'Content-Type':'image/jpeg','Access-Control-Allow-Origin':'*'});
      return res.end(fs.readFileSync(chave));
    }
    baixar(alvo,0,(e,codigo,tipo,buf)=>{
      if(e){res.writeHead(502);return res.end(''+e);}
      if(codigo===200){try{fs.writeFileSync(chave,buf)}catch(x){}}
      else console.log('FOTO '+codigo+' '+alvo.slice(0,100));
      res.writeHead(200,{'Content-Type':tipo,'Access-Control-Allow-Origin':'*'});
      res.end(buf);
    });
    return;
  }

  if(u.pathname==='/save'&&req.method==='POST'){
    let b='';req.on('data',d=>b+=d);req.on('end',()=>{
      try{
        const {nome,dados}=JSON.parse(b);
        const limpo=String(nome).replace(/[^a-z0-9._-]/gi,'_');
        fs.mkdirSync(SAIDA,{recursive:true});
        fs.writeFileSync(path.join(SAIDA,limpo),Buffer.from(dados.split(',')[1],'base64'));
        res.writeHead(200,{'Access-Control-Allow-Origin':'*'});res.end('ok '+limpo);
      }catch(e){res.writeHead(500);res.end(''+e);}
    });
    return;
  }

  if(u.pathname==='/demo.js'){
    // Fica FORA do repo de propósito: é andaime de captura, não código do app.
    const f=path.join(__dirname,'demo.js');
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
    return res.end(fs.readFileSync(f));
  }

  let p=decodeURIComponent(u.pathname);
  if(p==='/'||p==='')p='/index.html';
  const arq=path.join(RAIZ,p);
  if(!arq.startsWith(RAIZ)){res.writeHead(403);return res.end('fora');}
  fs.readFile(arq,(e,d)=>{
    if(e){res.writeHead(404);return res.end('404 '+p);}
    res.writeHead(200,{'Content-Type':TIPO[path.extname(arq).toLowerCase()]||'application/octet-stream'});
    res.end(d);
  });
}).listen(PORTA,()=>console.log('de pe em http://127.0.0.1:'+PORTA));
