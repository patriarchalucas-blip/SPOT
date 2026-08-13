// Cloudflare Pages Function — temperatura média histórica por cidade+mês,
// via Visual Crossing (mesmo padrão da find-instagram.js: chave só no
// servidor, nunca no navegador).
//
// "Média" de verdade, não o clima de 1 ano só (que pode ter sido um ano
// atípico) — pega os últimos 3 anos completos do mesmo mês e tira a média
// real de todos os dias. Resultado fica em cache por cidade+mês por 6
// meses: clima não muda de um mês pro outro, então a MESMA cidade+mês
// nunca gera custo de novo depois da primeira consulta.
//
// Teto de segurança: Visual Crossing cobra por REGISTRO (1 dia = 1
// registro), não por chamada — MONTHLY_RECORD_CAP conta registros gastos
// no mês e para de consultar bem antes do limite grátis de 1000/dia
// (~30.000/mês), com margem de sobra.
const MONTHLY_RECORD_CAP=9000;

export async function onRequestPost(context){
  const{request,env}=context;
  let body;
  try{body=await request.json()}catch(e){return json({error:'bad_request'},400)}

  const city=String(body.city||'').trim();
  const country=String(body.country||'').trim();
  const month=parseInt(body.month,10);
  if(!city||!month||month<1||month>12)return json({error:'missing_params'},400);
  if(!env.VISUALCROSSING_KEY||!env.SPOT_KV)return json({avg_temp:null,configured:false});

  const cacheKey='climate_'+normKey(city+'|'+country+'|'+month);
  const cached=await env.SPOT_KV.get(cacheKey);
  if(cached)return json(JSON.parse(cached));

  const monthKey='climate_records_'+new Date().toISOString().slice(0,7);
  const usedRecords=parseInt((await env.SPOT_KV.get(monthKey))||'0',10);
  if(usedRecords>=MONTHLY_RECORD_CAP){
    // Teto atingido — não consulta, sem custo nenhum. App cai pro
    // fallback (sem mostrar temperatura), tenta de novo mês que vem.
    return json({avg_temp:null,capped:true});
  }

  const location=encodeURIComponent(city+(country?', '+country:''));
  const thisYear=new Date().getUTCFullYear();
  const years=[thisYear-1,thisYear-2,thisYear-3];
  let allTemps=[],recordsGastos=0;

  for(const y of years){
    const mm=String(month).padStart(2,'0');
    const lastDay=new Date(y,month,0).getUTCDate();
    const start=`${y}-${mm}-01`,end=`${y}-${mm}-${String(lastDay).padStart(2,'0')}`;
    const url=`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}/${start}/${end}?unitGroup=metric&include=days&elements=datetime,temp&key=${env.VISUALCROSSING_KEY}&contentType=json`;
    try{
      const r=await fetch(url);
      if(!r.ok)continue;
      const d=await r.json();
      const days=(d.days||[]);
      days.forEach(day=>{if(typeof day.temp==='number')allTemps.push(day.temp)});
      recordsGastos+=days.length;
    }catch(e){/* essa fonte falhou, segue com as outras */}
  }
  await env.SPOT_KV.put(monthKey,String(usedRecords+recordsGastos),{expirationTtl:60*60*24*40});

  const result=allTemps.length
    ?{avg_temp:Math.round((allTemps.reduce((a,b)=>a+b,0)/allTemps.length)*10)/10,years_used:years.length}
    :{avg_temp:null};
  await env.SPOT_KV.put(cacheKey,JSON.stringify(result),{expirationTtl:60*60*24*180});
  return json(result);
}

function normKey(s){return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'_')}
function json(obj,status){
  return new Response(JSON.stringify(obj),{status:status||200,headers:{'Content-Type':'application/json'}});
}
