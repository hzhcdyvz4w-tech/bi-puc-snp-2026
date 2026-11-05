// BI PUC - Portal DOCAS, somente preenchimento por convite, sem login.
// Segurança: token na URL #fragment, não via query string ou logs; banco liga token a companhia.
// Acesso à API administrativa apenas neste serviço. Nunca enviar secret key ao navegador.
const ORIGIN = "https://hzhcdyvz4w-tech.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "3600",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
function response(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}
function getSecret(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return keys.default || "";
  } catch { return ""; }
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ORIGIN) return response(403, {ok:false, erro:"Origem não autorizada."});
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  if (req.method !== "POST") return response(405,{ok:false,erro:"Método não permitido."});
  if ((Number(req.headers.get("content-length")) || 0) > 32000) {
    return response(413,{ok:false,erro:"Dados excedem o limite."});
  }
  const secret = getSecret();
  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (!url || !secret) return response(503,{ok:false,erro:"Serviço indisponível."});
  try {
    const raw = await req.text();
    if (raw.length > 32000) return response(413,{ok:false,erro:"Dados excedem o limite."});
    const input = JSON.parse(raw);
    const action = input?.action;
    const token = input?.chave;
    if (action !== "verificar" && action !== "enviar") {
      return response(400,{ok:false,erro:"Operação inválida."});
    }
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return response(403,{ok:false,erro:"Link de acesso inválido."});
    }
    const payload = input?.dados && typeof input.dados==="object" && !Array.isArray(input.dados) ? input.dados : {};
    const h: Record<string,string> = {
      "Content-Type":"application/json",
      "apikey":secret,
      "Prefer":"return=representation",
    };
    if (secret.startsWith("eyJ")) h["Authorization"]="Bearer "+secret;
    const upstream = await fetch(url+"/rest/v1/rpc/puc_portal_convite",{
      method:"POST", headers:h,
      body:JSON.stringify({p_operacao:action,p_chave:token,p_dados:payload}),
      signal:AbortSignal.timeout(12000)
    });
    if (!upstream.ok) return response(502,{ok:false,erro:"Não foi possível concluir a operação. Consulte o gestor."});
    const result = await upstream.json();
    if (!result?.ok) return response(403,{ok:false,erro:result?.erro||"Acesso inválido."});
    return response(200,result);
  } catch {
    return response(503,{ok:false,erro:"Falha temporária na comunicação. Tente novamente."});
  }
});