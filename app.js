const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  return BRL.format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function businessPayload() {
  return {
    revenue: Number($("#bizRevenue")?.value || 42000),
    expenses: Number($("#bizExpenses")?.value || 25800),
    customers: Number($("#bizCustomers")?.value || 156),
    goal: Number($("#bizGoal")?.value || 52000),
    segment: $("#marketingSegment")?.value || "servicos",
    name: "Empresa demo"
  };
}

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Erro na requisicao");
  }

  return response.json();
}

function setLoading(element, isLoading) {
  if (!element) return;
  element.classList.toggle("loading", isLoading);
  element.disabled = isLoading;
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  $$(".reveal").forEach((element) => observer.observe(element));
}

function initHeroCanvas() {
  const canvas = $("#heroCanvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const pointer = { x: 0.62, y: 0.38 };
  const particles = Array.from({ length: 80 }, (_, index) => ({
    seed: index * 0.017,
    x: Math.random(),
    y: Math.random(),
    radius: 1 + Math.random() * 2.4,
    speed: 0.00035 + Math.random() * 0.0007,
    hue: Math.random() > 0.45 ? "34, 211, 238" : "168, 85, 247"
  }));

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * ratio);
    canvas.height = Math.floor(canvas.clientHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(time) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    const gradient = context.createRadialGradient(
      width * pointer.x,
      height * pointer.y,
      20,
      width * pointer.x,
      height * pointer.y,
      width * 0.66
    );
    gradient.addColorStop(0, "rgba(34, 211, 238, 0.16)");
    gradient.addColorStop(0.48, "rgba(59, 130, 246, 0.08)");
    gradient.addColorStop(1, "rgba(7, 10, 19, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      const drift = Math.sin(time * particle.speed + particle.seed * 100) * 0.06;
      const x = ((particle.x + drift + time * particle.speed * 0.06) % 1) * width;
      const y = ((particle.y + Math.cos(time * particle.speed + index) * 0.04) % 1) * height;

      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${particle.hue}, 0.52)`;
      context.fill();

      if (index % 4 === 0) {
        const next = particles[(index + 9) % particles.length];
        const nx = next.x * width;
        const ny = next.y * height;
        const distance = Math.hypot(nx - x, ny - y);
        if (distance < 180) {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nx, ny);
          context.strokeStyle = `rgba(${particle.hue}, ${0.12 - distance / 1800})`;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / Math.max(window.innerHeight, 1);
  });
  resize();
  requestAnimationFrame(draw);
}

function initHeroMetrics() {
  const values = [
    { revenue: 84200, profit: 27400, customers: 312, goal: 82 },
    { revenue: 88100, profit: 29100, customers: 329, goal: 86 },
    { revenue: 91600, profit: 30800, customers: 341, goal: 91 }
  ];
  let index = 0;

  setInterval(() => {
    index = (index + 1) % values.length;
    const current = values[index];
    const counters = $$("[data-hero-counter]");
    counters[0].textContent = `${formatCurrency(current.revenue / 1000).replace("R$", "R$ ")}k`.replace(",0", "");
    counters[1].textContent = `${formatCurrency(current.profit / 1000).replace("R$", "R$ ")}k`.replace(",0", "");
    counters[2].textContent = String(current.customers);
    const ring = $(".goal-ring");
    if (ring) {
      ring.style.setProperty("--progress", current.goal);
      $("strong", ring).textContent = `${current.goal}%`;
    }
  }, 3600);
}

function drawCashflow() {
  const canvas = $("#cashflowChart");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const revenue = [26, 32, 30, 37, 42, 48].map((value) => value + Math.random() * 3);
  const expenses = [18, 20, 21, 23, 25, 27].map((value) => value + Math.random() * 2);
  const max = 56;
  const padding = 28;
  const step = (width - padding * 2) / (revenue.length - 1);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  for (let y = padding; y < height - padding; y += 38) {
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  function line(values, color) {
    context.beginPath();
    values.forEach((value, index) => {
      const x = padding + index * step;
      const y = height - padding - (value / max) * (height - padding * 2);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    values.forEach((value, index) => {
      const x = padding + index * step;
      const y = height - padding - (value / max) * (height - padding * 2);
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    });
  }

  line(expenses, "rgba(251, 113, 133, 0.85)");
  line(revenue, "rgba(34, 211, 238, 0.95)");
}

function initDashboard() {
  drawCashflow();
  window.addEventListener("resize", drawCashflow);
  $("#refreshDashboard")?.addEventListener("click", () => {
    const revenue = 40000 + Math.round(Math.random() * 12000);
    const expenses = 23000 + Math.round(Math.random() * 6000);
    const profit = revenue - expenses;
    const goal = Math.round((revenue / 52000) * 100);
    $("#metricRevenue").textContent = formatCurrency(revenue);
    $("#metricExpenses").textContent = formatCurrency(expenses);
    $("#metricProfit").textContent = formatCurrency(profit);
    $("#metricGoal").textContent = `${goal}%`;
    drawCashflow();
  });
}

async function askQuestion(question) {
  const data = await api("/api/ai/consultor", {
    question,
    business: businessPayload()
  });
  return data.answer;
}

function initDemo() {
  const input = $("#demoQuestion");
  const answer = $("#demoAnswer p");
  const button = $("#askDemo");

  $$(".example-row button").forEach((example) => {
    example.addEventListener("click", () => {
      input.value = example.dataset.question;
      button.click();
    });
  });

  button?.addEventListener("click", async () => {
    const question = input.value.trim();
    if (!question) return;
    setLoading(button, true);
    answer.textContent = "Analisando contexto financeiro, meta e prioridades...";
    try {
      answer.textContent = await askQuestion(question);
    } catch (error) {
      answer.textContent = "Nao consegui conectar agora. Priorize receita recorrente, reduza custos sem retorno e transforme clientes atuais em recompra nesta semana.";
    } finally {
      setLoading(button, false);
    }
  });
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderDiagnosis(data) {
  const element = $("#diagnosisResult");
  if (!element) return;

  element.innerHTML = `
    <div class="score-card">
      <div class="score-orb" style="--score: ${data.score}">
        <strong>${data.score}</strong>
      </div>
      <div>
        <span class="eyebrow">${escapeHtml(data.status)}</span>
        <h3>Nota da empresa</h3>
        <p>Receita de ${formatCurrency(data.business.revenue)}, lucro de ${formatCurrency(data.business.profit)} e margem de ${data.business.margin}%.</p>
      </div>
    </div>
    <div class="result-columns">
      <div class="result-box">
        <h4>Pontos fortes</h4>
        ${renderList(data.strengths)}
      </div>
      <div class="result-box">
        <h4>Pontos fracos</h4>
        ${renderList(data.weaknesses)}
      </div>
      <div class="result-box">
        <h4>Plano de acao</h4>
        ${renderList(data.actionPlan)}
      </div>
    </div>
  `;
}

async function runDiagnosis() {
  const button = $("#runDiagnosis");
  setLoading(button, true);
  try {
    renderDiagnosis(await api("/api/diagnostico", businessPayload()));
  } finally {
    setLoading(button, false);
  }
}

function renderPlan(data) {
  const element = $("#planResult");
  if (!element) return;
  element.innerHTML = `
    <div class="result-box">
      <h4>Objetivo do ciclo</h4>
      <p>${escapeHtml(data.objective)}</p>
    </div>
    ${data.tasks
      .map(
        ([period, task]) => `
          <div class="timeline-item">
            <strong>${escapeHtml(period)}</strong>
            <p>${escapeHtml(task)}</p>
          </div>
        `
      )
      .join("")}
  `;
}

async function generatePlan(horizon = "30") {
  renderPlan(await api("/api/action-plan", { ...businessPayload(), horizon }));
}

function initPlanner() {
  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".segmented button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      generatePlan(button.dataset.horizon);
    });
  });
}

function renderMarketing(data) {
  const element = $("#marketingResult");
  if (!element) return;
  element.innerHTML = data.calendar
    .map(
      (item) => `
        <article class="marketing-card">
          <span>${escapeHtml(item.day)} - ${escapeHtml(item.format)}</span>
          <h4>${escapeHtml(item.theme)}</h4>
          <p>${escapeHtml(item.caption)}</p>
          <p><strong>CTA:</strong> ${escapeHtml(item.cta)}</p>
        </article>
      `
    )
    .join("");
}

async function generateMarketing() {
  const button = $("#generateMarketing");
  setLoading(button, true);
  try {
    renderMarketing(
      await api("/api/marketing", {
        segment: $("#marketingSegment").value,
        objective: $("#marketingObjective").value
      })
    );
  } finally {
    setLoading(button, false);
  }
}

function renderFinance(data) {
  const element = $("#financeResult");
  if (!element) return;
  const max = Math.max(...data.categories.map((item) => item.amount));
  element.innerHTML = `
    <div class="finance-card">
      <h4>Distribuicao de gastos</h4>
      <div class="finance-bars">
        ${data.categories
          .map(
            (item) => `
              <div class="finance-bar">
                <span>${escapeHtml(item.label)} - ${formatCurrency(item.amount)}</span>
                <div><i style="--w: ${(item.amount / max) * 100}%"></i></div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
    <div class="finance-card">
      <h4>Risco financeiro: ${escapeHtml(data.risk)}</h4>
      <p>Margem atual de ${data.business.margin}% e lucro de ${formatCurrency(data.business.profit)}.</p>
      <h4>Gastos excessivos</h4>
      ${renderList(data.excessiveCosts)}
      <h4>Oportunidades</h4>
      ${renderList(data.opportunities)}
    </div>
  `;
}

async function runFinance() {
  const button = $("#runFinance");
  setLoading(button, true);
  try {
    renderFinance(await api("/api/financial", businessPayload()));
  } finally {
    setLoading(button, false);
  }
}

function renderAlerts(data) {
  const element = $("#alertsResult");
  if (!element) return;
  element.innerHTML = data.alerts
    .map(
      (alert) => `
        <article class="alert-item ${escapeHtml(alert.level)}">
          <span class="alert-dot"></span>
          <div>
            <h4>${escapeHtml(alert.title)}</h4>
            <p>${escapeHtml(alert.text)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

async function runAlerts() {
  const button = $("#runAlerts");
  setLoading(button, true);
  try {
    renderAlerts(await api("/api/alerts", businessPayload()));
  } finally {
    setLoading(button, false);
  }
}

function initWorkspaceTabs() {
  $$(".workspace-nav button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".workspace-nav button").forEach((item) => item.classList.remove("active"));
      $$(".module-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#panel-${button.dataset.tab}`)?.classList.add("active");
    });
  });
}

function initChat() {
  const input = $("#chatQuestion");
  const button = $("#sendChat");
  const messages = $("#chatMessages");

  function append(content, type) {
    const bubble = document.createElement("div");
    bubble.className = `chat-message ${type}`;
    bubble.textContent = content;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  button?.addEventListener("click", async () => {
    const question = input.value.trim();
    if (!question) return;
    append(question, "user");
    input.value = "";
    setLoading(button, true);
    try {
      append(await askQuestion(question), "ai");
    } catch (error) {
      append("A conexao falhou agora. Sugestao imediata: revise custos recorrentes, crie uma oferta de recompra e acompanhe lucro semanalmente.", "ai");
    } finally {
      setLoading(button, false);
    }
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      button.click();
    }
  });
}

function initAuth() {
  const status = $("#authStatus");

  $("#googleLogin")?.addEventListener("click", async () => {
    try {
      const result = await window.CEOFirebase?.signInWithGoogle();
      if (result?.user) {
        status.textContent = `Conectado com Google: ${result.user.email}`;
      } else {
        status.textContent = "Login demo ativo. Firebase ainda nao foi configurado.";
      }
    } catch (error) {
      status.textContent = "Nao foi possivel autenticar com Google. Verifique a configuracao Firebase.";
    }
  });

  $("#emailLogin")?.addEventListener("click", async () => {
    const email = $("#emailInput").value.trim();
    const password = $("#passwordInput").value.trim();
    if (!email || !password) {
      status.textContent = "Informe email e senha para testar o acesso.";
      return;
    }

    try {
      const result = await window.CEOFirebase?.signInWithEmail(email, password);
      if (result?.user) {
        status.textContent = `Conectado com email: ${result.user.email}`;
      } else {
        localStorage.setItem("ceo-demo-user", email);
        status.textContent = `Sessao demo ativa para ${email}.`;
      }
    } catch (error) {
      status.textContent = "Firebase retornou erro no login. Em modo demo, a sessao local continua ativa.";
    }
  });
}

function initReportDownload() {
  $("#downloadReport")?.addEventListener("click", async () => {
    const button = $("#downloadReport");
    setLoading(button, true);
    try {
      const response = await fetch("/api/report.pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessPayload())
      });
      if (!response.ok) throw new Error("PDF indisponivel");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "relatorio-ceo-de-bolso-ai.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(button, false);
    }
  });
}

function initInstallPrompt() {
  let installEvent = null;
  const button = $("#installApp");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    button?.classList.add("available");
  });

  button?.addEventListener("click", async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    button.classList.remove("available");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }
}

function initButtons() {
  $("#runDiagnosis")?.addEventListener("click", runDiagnosis);
  $("#generateMarketing")?.addEventListener("click", generateMarketing);
  $("#runFinance")?.addEventListener("click", runFinance);
  $("#runAlerts")?.addEventListener("click", runAlerts);
}

async function initDefaultModuleData() {
  await Promise.allSettled([runDiagnosis(), generatePlan("30"), generateMarketing(), runFinance(), runAlerts()]);
}

document.addEventListener("DOMContentLoaded", async () => {
  refreshIcons();
  initReveal();
  initHeroCanvas();
  initHeroMetrics();
  initDashboard();
  initDemo();
  initWorkspaceTabs();
  initChat();
  initPlanner();
  initAuth();
  initReportDownload();
  initInstallPrompt();
  initButtons();
  await initDefaultModuleData();
  refreshIcons();
});
