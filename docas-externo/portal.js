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
  // Ler a chave diretamente da URL completa. Aceita links com #acesso=<token>
  // e, por compatibilidade, ?acesso=<token>. Nunca envia fragmentos ao servidor.
  function extractInvite() {
    const full = String(window.location.href || "");
    const hash = String(window.location.hash || "").replace(/^#/, "");
    const fragment = new URLSearchParams(hash);
    const search = new URLSearchParams(window.location.search);
    const raw = fragment.get("acesso") || search.get("acesso") ||
      (full.match(/(?:[?#&])acesso=([a-f0-9]{64})(?=$|[&#])/i) || [])[1] || "";
    return String(raw).trim().toLowerCase();
  }
  let invite = extractInvite();
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
      status.textContent = "Informe o token da Companhia ou cole o link individual recebido da SNP. Clique em Validar token e liberar formulário.";
      const recovery = $("recuperar-acesso");
      if (recovery) recovery.hidden = false;
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
      status.textContent = "Não foi possível validar o acesso: " + err.message + ". Cole novamente o link completo abaixo para tentar outra vez.";
      const recovery = $("recuperar-acesso");
      if(recovery) recovery.hidden = false;
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
  const recovery = $("recuperar-acesso");
  const recoveryForm = $("recuperar-form");
  if (recoveryForm) recoveryForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const entry = String($("recuperar-token")?.value || "").trim();
    const match = entry.match(/(?:^|[?#&])acesso=([a-f0-9]{64})(?=$|[&#])/i);
    const standalone = /^[a-f0-9]{64}$/i.test(entry) ? entry : "";
    const candidate = String(match?.[1] || standalone).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(candidate)) {
      status.textContent = "O link informado não contém um token válido de 64 caracteres.";
      return;
    }
    invite = candidate;
    recovery.hidden = true;
    $("recuperar-token").value = "";
    const botao = recoveryForm.querySelector("button[type=submit]");
    if (botao) { botao.disabled = true; botao.textContent = "Validando acesso..."; }
    try { await startup(); } finally {
      if (botao) { botao.disabled = false; botao.textContent = "Validar token e liberar formulário"; }
    }
  });
  startup();
})();