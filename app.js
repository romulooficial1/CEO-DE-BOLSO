(function () {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const page = document.body.dataset.page;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const appState = {
    user: null,
    profile: null,
    business: null,
    lastDiagnosis: null
  };

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function toast(message) {
    const host = $("#toastHost");
    if (!host) return;
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    host.appendChild(item);
    setTimeout(() => item.remove(), 5200);
  }

  function setLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      button.dataset.oldText = button.textContent;
      button.disabled = true;
      button.textContent = text || "Carregando...";
    } else {
      button.disabled = false;
      if (button.dataset.oldText) button.textContent = button.dataset.oldText;
      refreshIcons();
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function asNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeBusiness(raw = {}) {
    const revenue = asNumber(raw.revenue);
    const expenses = asNumber(raw.expenses);
    const customers = asNumber(raw.customers);
    const goal = asNumber(raw.goal);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const ticket = customers > 0 ? Math.round(revenue / customers) : 0;
    return {
      name: raw.name || "Negocio sem nome",
      type: raw.type || "Servicos",
      location: raw.location || "Brasil",
      challenge: raw.challenge || "Crescer com mais previsibilidade",
      mainGoal: raw.mainGoal || "Aumentar faturamento",
      revenue,
      expenses,
      customers,
      goal,
      profit,
      margin,
      ticket,
      goalProgress: goal > 0 ? Math.min(140, Math.round((revenue / goal) * 100)) : 0
    };
  }

  function clientScore(business) {
    const marginScore = Math.max(0, Math.min(34, business.margin * 0.9));
    const goalScore = Math.max(0, Math.min(28, business.goalProgress * 0.26));
    const customerScore = Math.max(0, Math.min(18, business.customers / 5));
    const dataScore = business.revenue && business.expenses && business.goal ? 12 : 4;
    const focusScore = business.challenge ? 8 : 3;
    return Math.max(18, Math.min(98, Math.round(marginScore + goalScore + customerScore + dataScore + focusScore)));
  }

  function clientAlerts(business) {
    const alerts = [];
    if (business.goalProgress < 75) alerts.push({ level: "critical", title: "Meta mensal em risco", text: `Progresso atual: ${business.goalProgress}%. Reforce oferta e recompra.` });
    if (business.margin < 20) alerts.push({ level: "warning", title: "Margem pressionada", text: `Margem de ${business.margin}%. Revise custos e precificacao.` });
    alerts.push({ level: "success", title: "Proxima acao", text: "Use a base de clientes para uma campanha de recompra esta semana." });
    return alerts;
  }

  function currentMonthUsage() {
    const usage = appState.profile?.usage || {};
    return Number(usage[window.CEOFirebase.monthKey()] || 0);
  }

  function isPremium() {
    return Boolean(appState.profile?.premium);
  }

  function canUseAI() {
    return isPremium() || currentMonthUsage() < 5;
  }

  function renderUsage() {
    const status = $("#usageStatus");
    const premium = $("#premiumStatus");
    if (!status || !premium) return;
    if (isPremium()) {
      status.textContent = "IA ilimitada";
      premium.textContent = "Premium";
      premium.classList.remove("free");
      return;
    }
    status.textContent = `${currentMonthUsage()}/5 usos IA`;
    premium.textContent = "Gratuito";
    premium.classList.add("free");
  }

  function renderDashboard() {
    const business = normalizeBusiness(appState.business || {});
    const score = appState.business ? clientScore(business) : 0;
    $("#businessTitle").textContent = appState.business ? `${business.name} - ${business.type}` : "Cadastre seu negocio";
    $("#monthSummary").textContent = appState.business
      ? `Resumo do mes: receita de ${money.format(business.revenue)}, lucro de ${money.format(business.profit)}, margem de ${business.margin}% e meta em ${business.goalProgress}%.`
      : "Preencha seus dados para receber analises reais.";
    $("#dashRevenue").textContent = money.format(business.revenue);
    $("#dashExpenses").textContent = money.format(business.expenses);
    $("#dashProfit").textContent = money.format(business.profit);
    $("#dashScore").textContent = `${score}/100`;
    $("#dashCustomers").textContent = business.customers;
    $("#dashTicket").textContent = money.format(business.ticket);
    $("#dashGoal").textContent = money.format(business.goal);
    $("#dashProgress").textContent = `${business.goalProgress}%`;
    const alerts = $("#alertList");
    alerts.innerHTML = clientAlerts(business)
      .map((alert) => `<article class="alert-item ${alert.level}"><strong>${escapeHtml(alert.title)}</strong><p class="muted">${escapeHtml(alert.text)}</p></article>`)
      .join("");
    renderUsage();
  }

  function fillBusinessForm() {
    const form = $("#businessForm");
    if (!form) return;
    const business = appState.business || {
      name: "",
      type: "",
      location: "",
      revenue: 42000,
      expenses: 25800,
      customers: 156,
      goal: 52000,
      challenge: "Conseguir mais clientes",
      mainGoal: "Crescer mantendo lucro"
    };
    Object.entries(business).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value;
    });
  }

  function collectBusinessForm() {
    const form = $("#businessForm");
    return {
      name: form.elements.namedItem("name").value.trim(),
      type: form.elements.namedItem("type").value.trim(),
      location: form.elements.namedItem("location").value.trim(),
      revenue: asNumber(form.elements.namedItem("revenue").value),
      expenses: asNumber(form.elements.namedItem("expenses").value),
      customers: asNumber(form.elements.namedItem("customers").value),
      goal: asNumber(form.elements.namedItem("goal").value),
      challenge: form.elements.namedItem("challenge").value.trim(),
      mainGoal: form.elements.namedItem("mainGoal").value.trim()
    };
  }

  function setView(view) {
    $$(".view").forEach((item) => item.classList.toggle("active", item.id === `view-${view}`));
    $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    const titles = {
      dashboard: ["Dashboard executivo", "Indicadores, alertas e resumo do mes."],
      business: ["Cadastro do negocio", "Dados que alimentam o consultor, diagnostico e relatorios."],
      chat: ["Consultor IA", "Pergunte sobre financas, marketing, vendas e crescimento."],
      diagnosis: ["Diagnostico empresarial", "Nota, riscos, oportunidades e prioridade da semana."],
      plans: ["Planos de acao", "Tarefas para 7, 30 e 90 dias."],
      marketing: ["Marketing IA", "Conteudo, legendas, anuncios e calendario semanal."],
      reports: ["Relatorios PDF", "Documento executivo premium."],
      premium: ["Premium", "IA ilimitada e recursos completos."]
    };
    $("#appHeading").textContent = titles[view]?.[0] || "CEO de Bolso AI";
    $("#appSubheading").textContent = titles[view]?.[1] || "";
  }

  async function authHeaders() {
    const token = await window.CEOFirebase.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function callIA(action, extra = {}) {
    if (!appState.business) {
      toast("Cadastre os dados do negocio antes de usar a IA.");
      setView("business");
      throw new Error("Negocio nao cadastrado.");
    }
    if (!canUseAI()) {
      showPremiumRequired();
      throw new Error("Limite gratuito atingido.");
    }
    const user = window.CEOFirebase.currentUser();
    const response = await fetch("/api/ia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders())
      },
      body: JSON.stringify({
        action,
        uid: user?.uid,
        email: user?.email,
        premium: isPremium(),
        business: appState.business,
        ...extra
      })
    });
    const json = await response.json();
    if (!response.ok) {
      if (json.premiumRequired) showPremiumRequired();
      throw new Error(json.error || "Falha na IA.");
    }
    if (json.usage?.demo && !isPremium()) {
      await window.CEOFirebase.incrementUsage();
      appState.profile = await window.CEOFirebase.getProfile();
      await window.CEOFirebase.saveHistory({
        action,
        question: extra.question || "",
        answer: json.data?.answer || json.data?.aiText || json.data?.executiveSummary || ""
      });
    }
    renderUsage();
    return json.data;
  }

  function showPremiumRequired() {
    toast("Este recurso exige Premium ou o limite gratuito foi atingido.");
    setView("premium");
  }

  function appendChat(text, type) {
    const list = $("#chatList");
    const item = document.createElement("div");
    item.className = `chat-message ${type}`;
    item.textContent = text;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }

  async function sendChat() {
    const input = $("#chatInput");
    const question = input.value.trim();
    if (!question) return;
    appendChat(question, "user");
    input.value = "";
    const button = $("#sendChat");
    setLoading(button, true, "Pensando...");
    try {
      const data = await callIA("chat", { question });
      appendChat(data.answer, "ai");
    } catch (error) {
      appendChat(error.message, "ai");
    } finally {
      setLoading(button, false);
    }
  }

  function listBlock(title, items) {
    return `<article class="result-item"><strong>${escapeHtml(title)}</strong><ul class="check-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`;
  }

  function renderDiagnosis(data) {
    appState.lastDiagnosis = data;
    $("#diagnosisResult").innerHTML = [
      `<article class="result-item"><strong>Nota geral: ${data.score}/100</strong><p class="muted">${escapeHtml(data.executiveSummary)}</p></article>`,
      listBlock("Pontos fortes", data.strengths),
      listBlock("Pontos fracos", data.weaknesses),
      listBlock("Riscos", data.risks),
      listBlock("Oportunidades", data.opportunities),
      listBlock("Plano de acao", data.actionPlan),
      `<article class="result-item"><strong>Marketing</strong><p class="muted">${escapeHtml(data.marketingRecommendation)}</p></article>`,
      `<article class="result-item"><strong>Financeiro</strong><p class="muted">${escapeHtml(data.financialRecommendation)}</p></article>`,
      `<article class="result-item"><strong>Prioridade da semana</strong><p class="muted">${escapeHtml(data.weekPriority)}</p></article>`,
      data.aiText ? `<article class="result-item"><strong>Analise da IA</strong><p class="muted">${escapeHtml(data.aiText)}</p></article>` : ""
    ].join("");
    renderDashboard();
  }

  async function generateDiagnosis() {
    const button = $("#generateDiagnosis");
    setLoading(button, true, "Gerando...");
    try {
      renderDiagnosis(await callIA("diagnosis"));
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(button, false);
    }
  }

  function renderPlan(data) {
    $("#planResult").innerHTML = [
      `<article class="result-item"><strong>Objetivo</strong><p class="muted">${escapeHtml(data.objective)}</p></article>`,
      ...data.tasks.map(([period, task]) => `<article class="timeline-item"><strong>${escapeHtml(period)}</strong><p class="muted">${escapeHtml(task)}</p></article>`),
      data.aiText ? `<article class="result-item"><strong>Orientacao da IA</strong><p class="muted">${escapeHtml(data.aiText)}</p></article>` : ""
    ].join("");
  }

  async function generatePlan(horizon) {
    try {
      renderPlan(await callIA("plan", { horizon }));
    } catch (error) {
      toast(error.message);
    }
  }

  function renderMarketing(data) {
    $("#marketingResult").innerHTML = [
      `<article class="result-item"><strong>${escapeHtml(data.campaign)}</strong><p class="muted">${escapeHtml(data.adCopy)}</p></article>`,
      ...data.posts.map((post) => `<article class="result-item"><strong>${escapeHtml(post.day)} - ${escapeHtml(post.format)}</strong><p class="muted">${escapeHtml(post.idea)}</p><p class="muted">${escapeHtml(post.caption)}</p><span class="pill">${escapeHtml(post.cta)}</span></article>`),
      listBlock("Ideias de promocoes", data.promoIdeas),
      data.aiText ? `<article class="result-item"><strong>Analise da IA</strong><p class="muted">${escapeHtml(data.aiText)}</p></article>` : ""
    ].join("");
  }

  async function generateMarketing() {
    const button = $("#generateMarketing");
    setLoading(button, true, "Criando...");
    try {
      renderMarketing(await callIA("marketing"));
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(button, false);
    }
  }

  async function exportPdf() {
    if (!isPremium()) {
      showPremiumRequired();
      return;
    }
    const button = $("#exportPdf");
    setLoading(button, true, "Exportando...");
    try {
      const user = window.CEOFirebase.currentUser();
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders())
        },
        body: JSON.stringify({ uid: user?.uid, email: user?.email, premium: isPremium(), business: appState.business })
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Nao foi possivel gerar o PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "relatorio-ceo-de-bolso-ai.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("PDF gerado com sucesso.");
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(button, false);
    }
  }

  async function startPayment() {
    const button = $("#startPayment") || $("#upgradeTop");
    setLoading(button, true, "Abrindo pagamento...");
    try {
      const user = window.CEOFirebase.currentUser();
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid, email: user?.email })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao criar pagamento.");
      if (json.init_point) {
        window.location.href = json.init_point;
      } else {
        throw new Error("Mercado Pago nao retornou link de assinatura.");
      }
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(button, false);
    }
  }

  async function loadAppData(user) {
    appState.user = user;
    appState.profile = await window.CEOFirebase.getProfile();
    appState.business = await window.CEOFirebase.getBusiness();
    renderDashboard();
    fillBusinessForm();
    if (!appState.business) $("#onboarding")?.classList.add("open");
    if (new URLSearchParams(location.search).get("premium") === "pending") {
      toast("Pagamento iniciado. Assim que o webhook confirmar, seu Premium sera ativado.");
    }
  }

  function initAppPage() {
    const gate = $("#authGate");
    const shell = $("#appShell");
    window.CEOFirebase.onAuth(async (user) => {
      if (!user) {
        gate.classList.add("open");
        shell.hidden = true;
        return;
      }
      gate.classList.remove("open");
      shell.hidden = false;
      await loadAppData(user);
      refreshIcons();
    });

    $("#gateLogin")?.addEventListener("click", async () => authFromGate("login"));
    $("#gateSignup")?.addEventListener("click", async () => authFromGate("signup"));
    $("#gateGoogle")?.addEventListener("click", async () => {
      try {
        await window.CEOFirebase.signInGoogle();
        location.reload();
      } catch (error) {
        toast(error.message);
      }
    });
    $("#gateReset")?.addEventListener("click", async () => {
      const email = $("#gateEmail").value.trim();
      if (!email) return toast("Informe seu e-mail para recuperar a senha.");
      await window.CEOFirebase.resetPassword(email);
      toast("Se o e-mail existir, enviaremos instrucoes de recuperacao.");
    });

    async function authFromGate(mode) {
      const email = $("#gateEmail").value.trim();
      const password = $("#gatePassword").value.trim();
      if (!email || password.length < 6) return toast("Informe e-mail e senha com pelo menos 6 caracteres.");
      try {
        if (mode === "signup") await window.CEOFirebase.signUpEmail(email, password);
        else await window.CEOFirebase.signInEmail(email, password);
        location.reload();
      } catch (error) {
        toast(error.message);
      }
    }

    $$("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    $("#goBusinessSetup")?.addEventListener("click", () => {
      $("#onboarding").classList.remove("open");
      setView("business");
      fillBusinessForm();
    });
    $("#businessForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        appState.business = await window.CEOFirebase.saveBusiness(collectBusinessForm());
        renderDashboard();
        $("#onboarding").classList.remove("open");
        toast("Dados do negocio salvos.");
        setView("dashboard");
      } catch (error) {
        toast(error.message);
      }
    });
    $("#sendChat")?.addEventListener("click", sendChat);
    $("#chatInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") sendChat();
    });
    $$("#quickQuestions button").forEach((button) => {
      button.addEventListener("click", () => {
        $("#chatInput").value = button.textContent.trim();
        sendChat();
      });
    });
    $("#generateDiagnosis")?.addEventListener("click", generateDiagnosis);
    $$("[data-plan]").forEach((button) => button.addEventListener("click", () => generatePlan(button.dataset.plan)));
    $("#generateMarketing")?.addEventListener("click", generateMarketing);
    $("#exportPdf")?.addEventListener("click", exportPdf);
    $("#startPayment")?.addEventListener("click", startPayment);
    $("#upgradeTop")?.addEventListener("click", () => setView("premium"));
    $("#logoutBtn")?.addEventListener("click", async () => {
      await window.CEOFirebase.logout();
      location.href = "/";
    });
  }

  function initLandingAuth() {
    let mode = "login";
    const modal = $("#authModal");
    const title = $("#authTitle");
    const subtitle = $("#authSubtitle");
    const submit = $("#authSubmit");
    const toggle = $("#toggleAuth");

    function setMode(next) {
      mode = next;
      const signup = mode === "signup";
      title.textContent = signup ? "Criar conta" : "Entrar";
      subtitle.textContent = signup ? "Comece gratis em poucos segundos." : "Acesse seu CEO particular.";
      submit.textContent = signup ? "Criar conta" : "Entrar";
      toggle.textContent = signup ? "Ja tenho conta" : "Criar conta gratis";
    }

    $$("[data-open-auth]").forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.openAuth || "login");
        modal.classList.add("open");
      });
    });
    $("#closeAuth")?.addEventListener("click", () => modal.classList.remove("open"));
    toggle?.addEventListener("click", () => setMode(mode === "signup" ? "login" : "signup"));
    submit?.addEventListener("click", async () => {
      const email = $("#authEmail").value.trim();
      const password = $("#authPassword").value.trim();
      if (!email || password.length < 6) return toast("Informe e-mail e senha com pelo menos 6 caracteres.");
      setLoading(submit, true);
      try {
        if (mode === "signup") await window.CEOFirebase.signUpEmail(email, password);
        else await window.CEOFirebase.signInEmail(email, password);
        location.href = "/app.html";
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(submit, false);
      }
    });
    $("#authGoogle")?.addEventListener("click", async () => {
      try {
        await window.CEOFirebase.signInGoogle();
        location.href = "/app.html";
      } catch (error) {
        toast(error.message);
      }
    });
    $("#resetPassword")?.addEventListener("click", async () => {
      const email = $("#authEmail").value.trim();
      if (!email) return toast("Informe seu e-mail para recuperar a senha.");
      await window.CEOFirebase.resetPassword(email);
      toast("Se o e-mail existir, enviaremos instrucoes de recuperacao.");
    });
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.16 }
    );
    $$(".reveal").forEach((item) => observer.observe(item));
  }

  function initPwa() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshIcons();
    initReveal();
    initPwa();
    if (page === "landing") initLandingAuth();
    if (page === "app") initAppPage();
  });
})();
