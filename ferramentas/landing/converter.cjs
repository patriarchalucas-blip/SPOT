// Converte a landing do Claude Design (index.dc.html + support.js) em HTML
// estático em /sobre, com as capturas reais do app no lugar dos iframes.
const fs=require('fs'),path=require('path');
// Uso: node ferramentas/landing/converter.cjs  (lê ferramentas/landing/fonte/,
// escreve sobre.html e landing/spot-world-map.js na raiz). As capturas dos
// celulares (landing/*.jpg) saem do app de hoje com a conta de exemplo em
// fonte/demo-do-app.js — ver ferramentas/landing/LEIA-ME.md.
const L=path.join(__dirname,'fonte'), R=path.join(__dirname,'..','..');
let dc=fs.readFileSync(path.join(L,'index.dc.html'),'utf8');
let map=fs.readFileSync(path.join(L,'spot-world-map.js'),'utf8');

// ── corpo: o que está dentro de <x-dc>, sem o <helmet> e o <template> ──
let body=dc.slice(dc.indexOf('<x-dc>')+6,dc.indexOf('</x-dc>'));
const helmet=body.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
body=body.replace(/<helmet>[\s\S]*?<\/helmet>/,'').replace(/<template id="__bundler_thumbnail">[\s\S]*?<\/template>/,'');
const estiloBase=helmet.match(/<style>([\s\S]*?)<\/style>/)[1];

// ── componentes: <x-import component-from-global-scope="X"> vira <X> ──
body=body.replace(/<x-import component-from-global-scope="([a-z-]+)"([^>]*)><\/x-import>/g,(m,tag,attrs)=>{
  const style=(attrs.match(/style="([^"]*)"/)||[])[1];
  return '<'+tag+(style?' style="'+style+'"':'')+'></'+tag+'>';
});
// O mapa de pintar se estica pra 100% do pai (o componente sobrescreve o
// style dele): a altura tem que estar na seção, senão ele nasce com 0px.
body=body.replace('<section style="background:#E4E8E4"><spot-paint-map style="width:100%;height:clamp(420px,56vw,760px)">','<section style="background:#E4E8E4;height:clamp(420px,56vw,760px)"><spot-paint-map>');
let nIframe=0;
// ── celulares: iframe da cópia do app → captura real do app ──
body=body.replace(/<iframe[^>]*src="\.\/app-real\/app\.html#([a-z]+)[^"]*"[^>]*title="([^"]*)"[^>]*><\/iframe>/g,(m,tela,titulo)=>{
  nIframe++;
  return '<img src="/landing/'+tela+'.jpg" alt="Tela '+titulo+' do app Spot" width="281" height="608" loading="lazy" decoding="async" style="display:block;width:281px;height:608px;object-fit:cover;object-position:top">';
});
// ── rosto de banco de imagem (pessoa real) → inicial, como o app mostra ──
body=body.replace(/<div style="width:40px;height:40px;border-radius:12px;background:#B8905A url\(https:\/\/randomuser\.me[^)]*\) center\/cover;flex:none"><\/div>/,
  '<div style="width:40px;height:40px;border-radius:12px;background:#F5F5F3;color:#0B3D2E;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;flex:none">C</div>');
map=map.replace("background:${av} url(https://randomuser.me/api/portraits/${AVP[av]||'women/44'}.jpg) center/cover;flex:none\"></div>",
  "background:${av};color:#F5F5F3;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none\">${f.charAt(0)}</div>");
// O campo de busca de cidade tinha base de 320px + padding e vazava 45px da
// tela em celular de 390 (rolagem lateral na página inteira).
map=map.replace('flex:1 1 320px;max-width:600px;height:68px','flex:1 1 260px;min-width:0;box-sizing:border-box;max-width:600px;height:68px');
if(/randomuser/.test(body+map))throw new Error('sobrou foto do randomuser');

// ── links ──
const LOJA='https://apps.apple.com/br/app/id6814856044';
body=body.split('<a href="#" style="display:inline-flex;flex-direction:column').join('<a href="'+LOJA+'" style="display:inline-flex;flex-direction:column');
body=body.replace('<a href="#" style="color:#6B6B67;text-decoration:none">Privacidade</a>','<a href="/privacidade" style="color:#6B6B67;text-decoration:none">Privacidade</a>')
  .replace('<a href="#" style="color:#6B6B67;text-decoration:none">Termos</a>','<a href="/termos" style="color:#6B6B67;text-decoration:none">Termos</a>')
  .replace('<a href="#" style="color:#6B6B67;text-decoration:none">Contato</a>','<a href="/suporte" style="color:#6B6B67;text-decoration:none">Contato</a>');
// Quem não tem iPhone usa pelo navegador — o app web é a raiz do site.
body=body.replace('<span style="font-size:15px;color:#6B6B67">Grátis para iPhone</span>',
  '<span style="font-size:15px;color:#6B6B67;line-height:1.4">Grátis para iPhone<br><a href="/" style="color:#6B6B67">ou use no navegador</a></span>');
// O nome EXATO da marca verificada no Google precisa estar escrito aqui
// (a verificação da tela de login confere a página inicial pública).
body=body.replace('<span>© 2026 Spot</span>','<span>© 2026 Spot - seus lugares</span>');
if(/href="#"(?! )/.test(body.replace(/href="#baixar"/g,'')))throw new Error('sobrou link vazio');

const html=`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<!-- Landing do Spot (29/09), desenhada no Claude Design e convertida para
     HTML estático. Esta é a página pública que o Google confere na
     verificação da marca do login: o nome "Spot - seus lugares" tem que
     continuar escrito nela (título e rodapé). Os celulares são capturas reais
     do app (/landing/*.jpg), geradas com a conta de demonstração. -->
<title>Spot - seus lugares · onde ir, pelos seus amigos</title>
<meta name="description" content="O Spot guarda onde você e seus amigos comeram, beberam e dormiram, com a frase de quem foi. Não por algoritmo.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Spot">
<meta property="og:title" content="Spot — onde ir, pelos seus amigos">
<meta property="og:description" content="Os lugares que seus amigos amaram, com o que eles escreveram sobre cada um.">
<meta property="og:url" content="https://meuspot.app/sobre">
<meta property="og:image" content="https://meuspot.app/compartilhar.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F5F5F3">
<link rel="apple-touch-icon" href="/icon-180.png">
<link rel="icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="/landing/spot-world-map.js"></script>
<style>${estiloBase}</style>
</head>
<body>
${body.trim()}
</body>
</html>
`;
fs.writeFileSync(path.join(R,'sobre.html'),html);
fs.mkdirSync(path.join(R,'landing'),{recursive:true});
fs.writeFileSync(path.join(R,'landing','spot-world-map.js'),map);
console.log('iframes trocados:',nIframe,'| tamanho:',html.length);
