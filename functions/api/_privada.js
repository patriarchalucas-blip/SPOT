// "Só eu vejo" também na lista pública (06/10/2026).
//
// A lista pública (/l/<código>, a capa dela e o "Salvar no meu Spot") lê os
// spots com a chave de serviço, que passa por cima do RLS. A regra da
// migração 028 — Quero ir de viagem PRIVADA só o dono vê — não valia ali: o
// link de Lisboa mostrava pra qualquer um o Quero ir de uma próxima viagem
// marcada "Só eu vejo". Aqui ela é repetida, igual ao SQL:
//   not (status = 'want' and trip_id is not null and viagem_privada(trip_id))
// (A outra metade da 028, "viagem privada sem Fui some", já está coberta:
// numa viagem assim todo spot é Quero ir, e todos saem por esta regra.)

const SB_URL = 'https://kzidnilsyrvauzgelsqd.supabase.co';

// Os ids das viagens privadas do dono. null = não deu pra saber (banco fora,
// coluna ausente): aí quem chama trata TODO Quero ir com viagem como privado.
// Errar pra esconder, nunca pra mostrar.
export async function viagensPrivadas(env, uid) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/trips?select=id&privada=is.true&user_id=eq.' + uid,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? new Set(d.map((t) => String(t.id))) : null;
  } catch (e) { return null }
}

// Pra quem chama: o select dos spots precisa trazer trip_id.
export function semQueroIrPrivado(spots, privadas) {
  return (Array.isArray(spots) ? spots : []).filter((s) =>
    !(s && s.status === 'want' && s.trip_id != null && (!privadas || privadas.has(String(s.trip_id)))));
}
