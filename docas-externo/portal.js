'use strict';
(()=> {
  const cfg = window.PUC_DOCAS_CONFIG || {};
  const base = String(cfg.supabaseUrl || "").replace(/\/$/, "");
  const apiKey = String(cfg.publishableKey || "");
  const endpoint = base + "/functions/v1/puc-docas-externo";
  const $ = (id) => document.getElementById(id);
  const form = $("dados-form");
  const status = $("acesso-status");
  const button = $("enviar");
  const validConfig = /^https:\/\/[a-z0-9.-]+\.supabase\.(co|in)$/i.test(base)
    && apiKey.length > 15 && !/service_role|sb_secret_/.test(apiKey);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  let invite = fragment.get("acesso") || "";
  let company = null;
  let protocol = null;
  const today = () => {
    const parts = new Intl.DateTimeFormat("en-US",{
      timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date());
    const m = Object.fromEntries(parts.map(p => [p.type,p.value]));
    return m.year+"-"+m.month+"-"+m.day;
  };
  const show = (message, error = false) => {
    const el = $("mensagem");
    el.hidden = false;
    el.className = error ? "error" : "";
    el.textContent = message;
  };
  form.elements.data_atualizacao.value = today();
  async function request(action, dados = {}) {
    const response = await fetch(endpoint,{
      method:"POST",
      mode:"cors",
      cache:"no-store",
      redirect:"error",
      headers:{"Content-Type":"application/json", "apikey":apiKey},
      body:JSON.stringify({action, chave:invite, dados})
    });
    let result;
    try {result = await response.json();} catch {throw Error("Resposta inválida do servidor.");}
    if(!response.ok || !result.ok) {
      throw Error(String(result.erro || "A operação não foi autorizada."));
    }
    return result;
  }
  function clearSensitiveFragment() {
    if(location.hash) history.replaceState(null,"",location.pathname+location.search);
  }
  async function startup() {
    if(!validConfig) {
      $("config-erro").hidden = false;
      status.textContent = "Serviço de preenchimento indisponível.";
      return;
    }
    if (!/^[a-f0-9]{64}$/.test(invite)) {
      status.textContent = "Link de convite ausente ou inválido. Solicite o endereço individual à SNP.";
      return;
    }
    // A chave permanece somente na memória da página, não no URL ou no referrer.
    clearSensitiveFragment();
    try {
      const result = await request("verificar");
      company = {
        companhia_codigo: result.companhia_codigo,
        companhia_nome: result.companhia_nome
      };
      if (!company.companhia_codigo || !company.companhia_nome) {
        throw Error("Convite sem Companhia identificada.");
      }
      form.elements.companhia_nome.value = company.companhia_nome;
      $("companhia").textContent = "Companhia autorizada: " + company.companhia_nome;
      $("declaracao").hidden = false;
      $("acesso").hidden = true;
    } catch(err) {
      invite = "";
      status.textContent = "Não foi possível abrir o formulário: " + err.message;
    }
  }
  form.addEventListener("reset", () => {
    setTimeout(() => {
      form.elements.data_atualizacao.value = today();
      form.elements.companhia_nome.value = company?.companhia_nome || "";
      protocol = null;
    },0);
  });
  form.addEventListener("submit", async(event) => {
    event.preventDefault();
    if (!company || !invite) return show("O link não foi autorizado. Solicite um novo convite.",true);
    if (!form.reportValidity()) return;
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      // Companhia é definida pelo servidor. Dados enviados pelo navegador não a alteram.
      delete data.companhia_nome;
      for(const k of ["investimento_total","execucao_fisica","execucao_financeira"]) {
        data[k] = data[k] === "" ? null : Number(data[k]);
      }
      for(const k of ["inicio","conclusao_prevista"]) if(!data[k]) data[k] = null;
      for(const k of Object.keys(data)) if(typeof data[k] === "string") {
        data[k] = data[k].trim() || null;
      }
      if(!protocol) protocol=crypto.randomUUID();
      data.protocolo=protocol;
      const result = await request("enviar",data);
      const receipt = String(result.protocolo || protocol);
      form.reset();
      show("Informações registradas no banco de dados da SNP.\nProtocolo: " +
           receipt + "\nSituação: recebida, aguardando conferência.\nVocê pode cadastrar outro empreendimento.");
    } catch(err) {
      show("Não foi possível confirmar o envio: " + err.message +
           "\nO formulário permanece preenchido para uma nova tentativa.",true);
    } finally {button.disabled = false;}
  });
  startup();
})();