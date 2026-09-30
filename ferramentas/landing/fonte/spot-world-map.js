(function(){
if(customElements.get('spot-world-map'))return;
const load=src=>new Promise((r,j)=>{if(document.querySelector(`script[src="${src}"]`)){const t=setInterval(()=>{if(window.d3&&window.topojson){clearInterval(t);r()}},30);return}const s=document.createElement('script');s.src=src;s.onload=r;s.onerror=j;document.head.appendChild(s)});
let world=null;
async function getWorld(){
  if(world)return world;
  await load('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
  await load('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
  const t=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json());
  world=topojson.feature(t,t.objects.countries);
  world.features=world.features.filter(f=>f.id!=='010');
  return world;
}
class M extends HTMLElement{
  connectedCallback(){Object.assign(this.style,{display:'block',width:'100%',height:'100%'});requestAnimationFrame(()=>this.draw())}
  async draw(){
    const w=await getWorld();
    const W=this.clientWidth||390,H=this.clientHeight||217;
    const vis=new Set((this.getAttribute('visited')||'').split(',').map(s=>s.trim()));
    const land=this.getAttribute('land')||'#CBD3CD',on=this.getAttribute('on')||'#0B3D2E';
    const p=d3.geoEqualEarth().fitExtent([[8,this.hasAttribute('top')?+this.getAttribute('top'):8],[W-8,H-8]],w);
    const path=d3.geoPath(p);
    this.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${w.features.map(f=>`<path d="${path(f)}" fill="${vis.has(f.id)?on:land}" stroke="${this.getAttribute('bg')||'#E4E8E4'}" stroke-width=".5"/>`).join('')}</svg>`;
  }
}
customElements.define('spot-world-map',M);
const PINS=[
 {lon:-9.14,lat:38.72,n:'Marina',c:'Lisboa',q:'Pede o arroz de pato e senta lá fora.',a:'#6A7A5A'},
 {lon:139.69,lat:35.69,n:'Rafa',c:'Tóquio',q:'Chega às 11h, antes da fila.',a:'#9A7050'},
 {lon:-99.13,lat:19.43,n:'Bia',c:'Cidade do México',q:'Tacos al pastor na esquina do hotel.',a:'#A04A30'},
 {lon:-58.38,lat:-34.6,n:'João',c:'Buenos Aires',q:'Parrilla sem reserva, só ir cedo.',a:'#4A5A6A'},
 {lon:18.77,lat:42.42,n:'Lucas',c:'Kotor',q:'Sobe o forte no fim da tarde.',a:'#B8905A'},
 {lon:-46.63,lat:-23.55,n:'Carol',c:'São Paulo',q:'Balcão do Maní, mil-folhas de mandioquinha.',a:'#5A6A50'},
 {lon:-74,lat:40.7,n:'Pedro',c:'Nova York',q:'Bagel quente, antes das 9h.',a:'#7A5A48'},
 {lon:28.98,lat:41.01,n:'Ana',c:'Istambul',q:'Balsa pro lado asiático no pôr do sol.',a:'#3E6A80'}
];
class H extends HTMLElement{
  connectedCallback(){Object.assign(this.style,{display:'block',position:'relative',width:'100%',height:'100%'});this.i=0;this.draw();this.ro=new ResizeObserver(()=>{clearTimeout(this.rt);this.rt=setTimeout(()=>this.draw(),120)});this.ro.observe(this);}
  disconnectedCallback(){this.ro&&this.ro.disconnect();clearInterval(this.t)}
  async draw(){
    const w=await getWorld();const W=this.clientWidth,Hh=this.clientHeight;if(!W||!Hh)return;
    const vis=new Set((this.getAttribute('visited')||'').split(','));
    const p=d3.geoEqualEarth().fitExtent([[12,12],[W-12,Hh-12]],w);const path=d3.geoPath(p);
    const mob=W<640;
    let h=`<svg width="${W}" height="${Hh}" style="display:block">${w.features.map(f=>`<path d="${path(f)}" fill="${vis.has(f.id)?'#0B3D2E':'#CBD3CD'}" stroke="#E4E8E4" stroke-width=".6"/>`).join('')}</svg>`;
    const sz=mob?20:28;
    PINS.forEach((pn,k)=>{const [x,y]=p([pn.lon,pn.lat]);pn.x=x;pn.y=y;
      h+=`<div data-pin="${k}" style="position:absolute;left:${x-sz/2}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;border-radius:${mob?6:9}px;background:${pn.a};outline:3px solid #F5F5F3;transition:transform .35s"></div>`;});
    h+=`<div data-card style="position:absolute;width:${mob?210:270}px;background:#F5F5F3;border-radius:14px;padding:${mob?'10px 12px':'14px 16px'};font-family:inherit;color:#111;transition:opacity .35s, transform .35s;pointer-events:none"></div>`;
    this.innerHTML=h;this.show(this.i);
    const start=()=>{clearInterval(this.t);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.t=setInterval(()=>{this.i=(this.i+1)%PINS.length;this.show(this.i)},3200)};start();
    this.querySelectorAll('[data-pin]').forEach(e=>{e.style.cursor='pointer';const go=()=>{clearInterval(this.t);this.i=+e.dataset.pin;this.show(this.i)};e.addEventListener('mouseenter',go);e.addEventListener('click',go);e.addEventListener('mouseleave',start);});
  }
  show(k){
    const pn=PINS[k],card=this.querySelector('[data-card]');if(!card)return;const W=this.clientWidth,mob=W<640,cw=mob?210:270;
    this.querySelectorAll('[data-pin]').forEach(e=>e.style.transform=+e.dataset.pin===k?'scale(1.25)':'scale(1)');
    card.style.opacity=0;card.style.transform='translateY(6px)';
    clearTimeout(this.ct);this.ct=setTimeout(()=>{
      card.innerHTML=`<div style="font-size:${mob?12:13}px;color:#6B6B67"><b style="color:#111;font-weight:600">${pn.n} foi</b> · ${pn.c}</div><div style="font-size:${mob?15:19}px;font-weight:600;letter-spacing:-.02em;line-height:1.2;margin-top:4px">“${pn.q}”</div>`;
      let x=pn.x+22;if(x+cw>W-8)x=pn.x-cw-22;let y=pn.y-30;const ch=card.offsetHeight||80;if(y+ch>this.clientHeight-8)y=this.clientHeight-ch-8;if(y<8)y=8;
      card.style.left=x+'px';card.style.top=y+'px';card.style.opacity=1;card.style.transform='none';
    },this.shown?220:0);this.shown=1;
  }
}
customElements.define('spot-hero-map',H);
const pct=n=>{const p=Math.min(100,n/195*100);return (p>=10?Math.round(p)+'':p.toFixed(1).replace('.',',').replace(',0',''))+'%'};
let names=null;
async function getNames(){if(names)return names;names={};try{const c=await fetch('https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.11.0/codes.json').then(r=>r.json());const dn=new Intl.DisplayNames(['pt-BR'],{type:'region'});c.forEach(([a2,a3,n])=>{try{names[n]=dn.of(a2)}catch(e){}})}catch(e){}return names}
class Paint extends HTMLElement{
  connectedCallback(){Object.assign(this.style,{display:'block',position:'relative',width:'100%',height:'100%'});try{this.sel=new Set(JSON.parse(localStorage.getItem('spot-landing-paint')||'[]'))}catch(e){this.sel=new Set()}this.last=null;this.draw();this.ro=new ResizeObserver(()=>{clearTimeout(this.rt);this.rt=setTimeout(()=>this.draw(),150)});this.ro.observe(this)}
  disconnectedCallback(){this.ro&&this.ro.disconnect()}
  nm(f){return (names&&names[f.id])||f.properties.name}
  async draw(){
    const w=await getWorld();await getNames();const W=this.clientWidth,H=this.clientHeight;if(!W||!H)return;const mob=W<640;
    const p=d3.geoEqualEarth().fitExtent([[12,mob?150:12],[W-12,mob?H-12:H-176]],w);const path=d3.geoPath(p);this.feat=w.features;
    this.innerHTML=`<svg width="${W}" height="${H}" style="display:block;touch-action:manipulation">${w.features.map((f,k)=>`<path data-k="${k}" d="${path(f)}" fill="${this.sel.has(f.id)?'#0B3D2E':'#CBD3CD'}" stroke="#E4E8E4" stroke-width=".6" style="cursor:pointer;transition:fill .18s"/>`).join('')}</svg>
    <div data-hud style="position:absolute;left:${mob?16:28}px;${mob?'right:16px;top:16px':'bottom:28px'};background:#F5F5F3;border-radius:18px;color:#111"></div>
    <div data-tip style="position:absolute;pointer-events:none;background:#111;color:#F5F5F3;font-size:14px;font-weight:600;padding:6px 10px;border-radius:8px;opacity:0;transition:opacity .12s;white-space:nowrap"></div>`;
    const svg=this.querySelector('svg'),tip=this.querySelector('[data-tip]');
    svg.addEventListener('pointermove',e=>{const t=e.target.closest('path');if(!t){tip.style.opacity=0;return}const r=this.getBoundingClientRect();tip.textContent=this.nm(this.feat[t.dataset.k]);tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top-34)+'px';tip.style.opacity=1});
    svg.addEventListener('pointerleave',()=>tip.style.opacity=0);
    svg.addEventListener('pointerover',e=>{const t=e.target.closest('path');if(t&&!this.sel.has(this.feat[t.dataset.k].id))t.setAttribute('fill','#AEB9B1')});
    svg.addEventListener('pointerout',e=>{const t=e.target.closest('path');if(t)t.setAttribute('fill',this.sel.has(this.feat[t.dataset.k].id)?'#0B3D2E':'#CBD3CD')});
    svg.addEventListener('click',e=>{const t=e.target.closest('path');if(!t)return;const f=this.feat[t.dataset.k];if(this.sel.has(f.id)){this.sel.delete(f.id);this.last=null}else{this.sel.add(f.id);this.last=this.nm(f)}t.setAttribute('fill',this.sel.has(f.id)?'#0B3D2E':'#AEB9B1');localStorage.setItem('spot-landing-paint',JSON.stringify([...this.sel]));this.hud(true)});
    this.hud();
  }
  hud(bump){const h=this.querySelector('[data-hud]');if(!h)return;const n=this.sel.size,mob=this.clientWidth<640;
    const R=mob?30:40,SW=mob?7:8,S=2*R+SW,C=2*Math.PI*R;
    if(!h.dataset.built){h.dataset.built=1;h.style.padding=mob?'14px 16px':'20px 22px';h.style.minWidth=mob?'0':'300px';
      h.innerHTML=`<div style="display:flex;gap:${mob?14:18}px;align-items:center"><div style="position:relative;width:${S}px;height:${S}px;flex:none"><svg width="${S}" height="${S}" style="display:block;transform:rotate(-90deg)"><circle cx="${S/2}" cy="${S/2}" r="${R}" fill="none" stroke="#E2E2DE" stroke-width="${SW}"/><circle data-arc cx="${S/2}" cy="${S/2}" r="${R}" fill="none" stroke="#0B3D2E" stroke-width="${SW}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset .5s cubic-bezier(.2,.8,.2,1)"/></svg><div data-pct style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${mob?15:19}px;font-weight:700;letter-spacing:-.03em"></div></div><div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1"><div style="display:flex;align-items:baseline;gap:8px"><span data-n style="font-size:${mob?30:40}px;font-weight:700;letter-spacing:-.045em;line-height:1;display:inline-block;transition:transform .2s"></span><span data-lbl style="font-size:${mob?15:17}px;font-weight:600"></span><button data-clear style="margin-left:auto;border:none;background:none;padding:4px 0;font:inherit;font-size:14px;color:#9A9A96;cursor:pointer"></button></div><div data-sub style="font-size:${mob?14:15}px;color:#6B6B67;line-height:1.35"></div></div></div>`;
      h.querySelector('[data-clear]').onclick=()=>{this.sel.clear();this.last=null;localStorage.setItem('spot-landing-paint','[]');this.querySelectorAll('svg path').forEach(p=>p.setAttribute('fill','#CBD3CD'));this.hud()};}
    const fr=n?Math.max(.025,Math.min(1,n/195)):0;
    h.querySelector('[data-arc]').setAttribute('stroke-dashoffset',C*(1-fr));
    h.querySelector('[data-pct]').textContent=pct(n);
    h.querySelector('[data-n]').textContent=n;
    h.querySelector('[data-lbl]').textContent=n===1?'país':'países';
    h.querySelector('[data-clear]').textContent=n?'Limpar':'';
    h.querySelector('[data-sub]').innerHTML=this.last?`de 195 · acabou de entrar <b style="color:#111;font-weight:600">${this.last}</b>`:n?'de 195 no mundo':'Toque nos países em que você já foi';
    if(bump){const s=h.querySelector('[data-n]');s.style.transform='scale(1.12)';setTimeout(()=>s.style.transform='none',160)}}
}
customElements.define('spot-paint-map',Paint);
const CITIES={
 'Lisboa':[['Taberna da Rua das Flores','Petiscos','Marina','Chega antes das 19h, não aceita reserva.','#A06A48','#6A7A5A'],['Miradouro da Graça','Experiência','Pedro','Pôr do sol com uma imperial do quiosque.','#C0A070','#7A5A48'],['Manteigaria','Doces','Ana','Pastel de nata saindo do forno. Come em pé.','#D0A060','#3E6A80']],
 'Tóquio':[['Fuunji','Ramen','Rafa','Tsukemen. A fila anda rápido.','#8A5A3A','#9A7050'],['Omoide Yokocho','Bar','Carol','Yakitori em banquinho, vai tarde.','#3A3A48','#5A6A50'],['Trunk Hotel','Ficar','João','Quarto pequeno, localização perfeita.','#8A9A9A','#4A5A6A']],
 'Cidade do México':[['El Huequito','Tacos','Bia','Al pastor. Pede dois de cada.','#A04A30','#A04A30'],['Contramar','Frutos do mar','Marina','Tostada de atum e peixe meio a meio.','#D08A5A','#6A7A5A'],['Casa Azul','Experiência','Lucas','Compra o ingresso online, a fila é longa.','#3E6A9A','#B8905A']],
 'Buenos Aires':[['Don Julio','Parrilla','João','Ojo de bife, e divide a provoleta.','#6A3A2A','#4A5A6A'],['Café Tortoni','Café','Ana','Vai mais pela história do que pelo café.','#7A6A48','#3E6A80'],['Florería Atlántico','Bar','Pedro','Entra pela floricultura, desce a escada.','#2A3A3A','#7A5A48']],
 'Nova York':[['Russ & Daughters','Café da manhã','Pedro','Bagel quente, antes das 9h.','#B89A70','#7A5A48'],['Katz’s','Sanduíche','Carol','Pastrami. E não perde o ticket.','#8A4A3A','#5A6A50'],['The High Line','Experiência','Bia','Começa no sul e termina no Hudson Yards.','#5A7A5A','#A04A30']],
 'São Paulo':[['Maní','Brasileira','Carol','Mil-folhas de mandioquinha, no balcão.','#A0603A','#5A6A50'],['Bar da Dona Onça','Bar','Rafa','Chope e o bolinho de arroz.','#3E4A50','#9A7050'],['Mocotó','Nordestina','Lucas','Almoço de semana, sem fila.','#B07040','#B8905A']]
};
const PHOTO={"Taberna da Rua das Flores":"1504674900247-0877df9cc836","Miradouro da Graça":"1585208798174-6cedd86e019a","Manteigaria":"1567620905732-2d1ec7ab7445","Fuunji":"1546069901-ba9599a7e63c","Omoide Yokocho":"1540959733332-eab4deabeeaf","Trunk Hotel":"1517248135467-4c7edcad34c4","El Huequito":"1555939594-58d7cb561ad1","Contramar":"1565299624946-b28f40a0ae38","Casa Azul":"1518105779142-d975f22f1b0a","Don Julio":"1544025162-d76694265947","Café Tortoni":"1551218808-94e220e084d2","Florería Atlántico":"1470337458703-46ad1756a187","Russ & Daughters":"1540189549336-e6e99c3679fe","Katz’s":"1512058564366-18510be2db19","The High Line":"1559339352-11d035aa65de","Maní":"1544025162-d76694265947","Bar da Dona Onça":"1514933651103-005eec06c04b","Mocotó":"1414235077428-338989a2e8c0"};
const AVP={"#6A7A5A":"women/44","#9A7050":"men/46","#A04A30":"women/68","#4A5A6A":"men/22","#B8905A":"women/12","#5A6A50":"women/90","#7A5A48":"men/75","#3E6A80":"women/33"};
const STARS=k=>'<span style="display:inline-flex;gap:2px" aria-label="'+k+' de 5 estrelas">'+[1,2,3,4,5].map(i=>'<svg width="13" height="13" viewBox="0 0 24 24" fill="'+(i<=k?'#0B3D2E':'#D6D6D2')+'"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>').join('')+'</span>';
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
class Search extends HTMLElement{
  connectedCallback(){this.style.display='block';this.q='';this.city='Lisboa';this.render();}
  render(){
    const q=norm(this.q);const keys=Object.keys(CITIES);
    const match=q?keys.filter(k=>norm(k).includes(q)):[this.city];
    const res=match.flatMap(k=>CITIES[k].map(r=>[k,...r])).slice(0,6);
    const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const friends=new Set(res.map(r=>r[3])).size;
    const summary=res.length?`${friends} ${friends===1?'amigo já foi':'amigos já foram'} a ${match.length===1?match[0]:'essas cidades'}`:'';
    if(!this.built){this.built=1;this.innerHTML=`<div style="display:flex;flex-direction:column;gap:22px"><div style="display:flex;flex-wrap:wrap;gap:16px 28px;align-items:center"><div style="flex:1 1 320px;max-width:600px;height:68px;border-radius:14px;background:#E9E9E6;display:flex;align-items:center;gap:14px;padding:0 22px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B6B67" stroke-width="2.2"><circle cx="10.5" cy="10.5" r="7"/><path d="M20 20l-4.5-4.5"/></svg><input data-q placeholder="Digite uma cidade" style="flex:1;min-width:0;border:none;background:none;outline:none;font:600 24px 'Inter Tight',system-ui,sans-serif;letter-spacing:-.02em;color:#111"></div><div data-chips style="display:flex;gap:6px 20px;flex-wrap:wrap"></div></div><div data-sum style="font-size:16px;color:#6B6B67;min-height:22px"></div><div data-res style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:28px 16px"></div></div>`;
      this.querySelector('[data-q]').addEventListener('input',e=>{this.q=e.target.value;this.render()});}
    this.querySelector('[data-chips]').innerHTML=keys.map(k=>{const on=!q&&k===this.city;return `<button data-c="${k}" style="border:none;background:none;padding:6px 0;font:inherit;font-size:17px;cursor:pointer;color:${on?'#111':'#6B6B67'};font-weight:${on?600:400};border-bottom:2px solid ${on?'#111':'transparent'}">${k}</button>`}).join('');
    this.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{this.city=b.dataset.c;this.q='';this.querySelector('[data-q]').value='';this.render()});
    this.querySelector('[data-sum]').textContent=summary;
    const R=this.querySelector('[data-res]');
    R.innerHTML=res.length?res.map(([c,n,t,f,qt,ph,av],i)=>`<div style="display:flex;flex-direction:column;gap:12px;opacity:0;transform:translateY(10px);transition:opacity .35s ${i*60}ms,transform .35s ${i*60}ms"><div style="aspect-ratio:4/3;border-radius:18px;background:${ph} url(https://images.unsplash.com/photo-${PHOTO[n]}?w=700&q=70) center/cover"></div><div><div style="font-size:21px;font-weight:600;letter-spacing:-.025em">${n}</div><div style="font-size:15px;color:#6B6B67;margin-top:2px">${t} · ${c}</div></div><div style="display:flex;gap:10px;align-items:flex-start;font-size:16px;line-height:1.4"><div style="width:26px;height:26px;border-radius:8px;background:${av} url(https://randomuser.me/api/portraits/${AVP[av]||'women/44'}.jpg) center/cover;flex:none"></div><div><div style="display:flex;gap:8px;align-items:center"><b style="font-weight:600">${f} foi</b>${STARS((n.length+f.length)%3===0?4:5)}</div><span style="color:#6B6B67">“${qt}”</span></div></div></div>`).join(''):`<div style="font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.3;max-width:560px">Ninguém da sua rede foi a “${esc(this.q)}” ainda. <span style="color:#6B6B67">No Spot, você pode ser o primeiro a marcar.</span></div>`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>R.querySelectorAll(':scope>div').forEach(d=>{d.style.opacity=1;d.style.transform='none'})));
  }
}
customElements.define('spot-city-search',Search);
})();
