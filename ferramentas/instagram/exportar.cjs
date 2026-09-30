const puppeteer=require(require('path').join(__dirname,'..','capturas-loja','node_modules','puppeteer-core'));
const fs=require('fs'),path=require('path');
// Uso: sirva ferramentas/instagram/fonte na porta 8937 (a receita de
// ferramentas/capturas-loja/srv.js serve) e rode este arquivo. Sai em
// ~/Downloads/spot-instagram-png, no tamanho real (1080x1350 e 1080x1920).
const SAIDA=path.join(require('os').homedir(),'Downloads','spot-instagram-png');
(async()=>{fs.mkdirSync(SAIDA,{recursive:true});
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new'});
const p=await b.newPage();await p.setViewport({width:1600,height:1000,deviceScaleFactor:1080/324});
await p.goto('http://localhost:8937/Spot%20Instagram.dc.html',{waitUntil:'networkidle0',timeout:90000});await new Promise(r=>setTimeout(r,7000));
// rosto de banco (pessoa real) vira a inicial, como o app mostra
await p.evaluate(()=>{document.querySelectorAll('[style*="randomuser"]').forEach(e=>{e.style.backgroundImage='none';e.style.background='#F5F5F3';e.style.display='flex';e.style.alignItems='center';e.style.justifyContent='center';e.style.color='#0B3D2E';e.style.fontWeight='700';e.style.fontSize=Math.round(e.getBoundingClientRect().height*0.45)+'px';e.textContent='C'})});
const pecas=await p.$$('[data-screen-label]');let n=0;
for(const el of pecas){const nome=await el.evaluate(e=>e.getAttribute('data-screen-label'));if(nome==='Perfil')continue;
  n++;const arq=path.join(SAIDA,String(n).padStart(2,'0')+'-'+nome.replace(/[·×()]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').toLowerCase()+'.png');
  await el.scrollIntoView();await new Promise(r=>setTimeout(r,700));await el.screenshot({path:arq});
  const buf=fs.readFileSync(arq);console.log(path.basename(arq),buf.readUInt32BE(16)+'x'+buf.readUInt32BE(20));}
await b.close()})();
