// TradeBot Market Profile & Order Flow Analytics Hub - Main Application Controller
// Manages state, UI events, LocalStorage persistence, and dynamic rendering

class AppController {
  constructor() {
    this.state = {
      currentIndex: "nifty",
      currentDate: new Date().toISOString().split("T")[0],
      swingFilterStatus: "all",
      swingFilterSector: "all",
      dailyLogs: [],
      swingTrades: [],
      longTermPicks: []
    };

    this.tpoVisualizer = new TPOVisualizer("tpo-chart-container");
    this.strategyEngine = new StrategyEngine("strategy-form", "strategy-output");
    this.fyersConnector = new FyersConnector();
    this.liveScanner = new LiveScanner("live-scanner-container");
    this.backtestEngine = new BacktestEngine("backtest-studio-container");
    this.stockPicker = window.stockPicker || (typeof StockPicker !== "undefined" ? new StockPicker() : null);

    // Expose instances globally on window so cross-component references work seamlessly
    window.tpoVisualizer = this.tpoVisualizer;
    window.strategyEngine = this.strategyEngine;
    window.fyersConnector = this.fyersConnector;
    window.liveScanner = this.liveScanner;
    window.backtestEngine = this.backtestEngine;
    window.stockPicker = this.stockPicker;
  }

  init() {
    // Purge any simulated or static market data from localStorage (as mandated by user), while keeping API credentials intact across OAuth redirects
    localStorage.removeItem("tb_market_data");
    localStorage.removeItem("tb_daily_logs");
    localStorage.removeItem("tb_swing_trades");
    localStorage.removeItem("tb_long_term_picks");

    this.loadState();
    this.setupEventListeners();
    this.renderTickers();
    this.renderIndexAnalyzer();
    this.renderSwingTrades();
    this.renderLongTermPicks();
    this.renderCourseBible();
    this.strategyEngine.generateStrategy();
    this.fyersConnector.init();
    this.fyersConnector.subscribe(() => {
      this.renderTickers();
      this.renderIndexAnalyzer();
    });
    this.liveScanner.init();
    this.backtestEngine.init();

    console.log("🚀 TradeBot Market Profile Hub initialized successfully with Fyers Live Bridge & AI Processing Engine.");
  }

  loadState() {
    const engine = window.aiProcessingEngine || new AIProcessingEngine();
    this.state.dailyLogs = engine.getLiveDailyLogs();
    this.state.swingTrades = engine.getLiveSwingTrades();
    this.state.longTermPicks = engine.getLiveLongTermPicks();
  }

  saveState() {
    // Intentionally left blank to prevent caching transient market data to localStorage
  }

  setupEventListeners() {
    // Tab Switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = btn.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });

    // Index Switcher Pills
    document.querySelectorAll(".index-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const indexId = pill.getAttribute("data-index");
        this.setIndex(indexId);
      });
    });

    // Date Selector
    const dateSelect = document.getElementById("date-selector-input");
    if (dateSelect) {
      dateSelect.addEventListener("change", (e) => {
        this.state.currentDate = e.target.value;
        this.renderIndexAnalyzer();
      });
    }

    // Swing Trade Filters
    const statusFilter = document.getElementById("filter-swing-status");
    const sectorFilter = document.getElementById("filter-swing-sector");

    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.state.swingFilterStatus = e.target.value;
        this.renderSwingTrades();
      });
    }
    if (sectorFilter) {
      sectorFilter.addEventListener("change", (e) => {
        this.state.swingFilterSector = e.target.value;
        this.renderSwingTrades();
      });
    }

    // Modals
    const addLogBtn = document.getElementById("btn-add-log");
    const addStockBtn = document.getElementById("btn-add-stock");
    const exportBtn = document.getElementById("btn-export-plan");

    if (addLogBtn) addLogBtn.addEventListener("click", () => this.openModal("modal-add-log"));
    if (addStockBtn) addStockBtn.addEventListener("click", () => this.openModal("modal-add-stock"));
    if (exportBtn) exportBtn.addEventListener("click", () => this.exportCurrentPlan());

    document.querySelectorAll(".close-btn, .btn-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
      });
    });

    // Form Submissions
    const logForm = document.getElementById("form-add-log");
    const stockForm = document.getElementById("form-add-stock");

    if (logForm) {
      logForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddLogSubmit(new FormData(logForm));
        logForm.reset();
        this.closeModals();
      });
    }

    if (stockForm) {
      stockForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddStockSubmit(new FormData(stockForm));
        stockForm.reset();
        this.closeModals();
      });
    }
  }

  switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    document.querySelectorAll(".tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === tabId);
    });
  }

  setIndex(indexId) {
    this.state.currentIndex = indexId;

    // Update pills
    document.querySelectorAll(".index-pill").forEach(pill => {
      pill.classList.toggle("active", pill.getAttribute("data-index") === indexId);
    });

    // Update available dates for this index
    this.populateDateSelector();
    this.renderIndexAnalyzer();
  }

  populateDateSelector() {
    const dateSelect = document.getElementById("date-selector-input");
    if (!dateSelect) return;

    if (window.aiProcessingEngine) {
      this.state.dailyLogs = window.aiProcessingEngine.getLiveDailyLogs();
    }

    const logsForIndex = this.state.dailyLogs.filter(l => l.indexId === this.state.currentIndex);

    dateSelect.innerHTML = "";
    logsForIndex.forEach((log, idx) => {
      const opt = document.createElement("option");
      opt.value = log.date;
      opt.textContent = `${log.date} (${log.openTypeBadge.toUpperCase()})`;
      if (idx === 0) {
        opt.selected = true;
        this.state.currentDate = log.date;
      }
      dateSelect.appendChild(opt);
    });
  }

  renderTickers() {
    const tickerBar = document.getElementById("ticker-bar");
    if (!tickerBar) return;

    tickerBar.innerHTML = "";
    const tickers = window.aiProcessingEngine ? window.aiProcessingEngine.getLiveTickers() : [];
    tickers.forEach(t => {
      const card = document.createElement("div");
      card.className = `ticker-card ${this.state.currentIndex === t.id ? "active" : ""}`;
      card.innerHTML = `
        <div class="ticker-info">
          <span class="ticker-name">${t.name}</span>
          <span class="ticker-price">${t.price}</span>
        </div>
        <span class="ticker-change ${t.status}">${t.change} (${t.percent})</span>
      `;
      card.addEventListener("click", () => {
        this.switchTab("tab-analyzer");
        this.setIndex(t.id);
      });
      tickerBar.appendChild(card);
    });
  }

  renderIndexAnalyzer() {
    if (window.aiProcessingEngine) {
      this.state.dailyLogs = window.aiProcessingEngine.getLiveDailyLogs();
    }

    // Populate date selector if empty
    const dateSelect = document.getElementById("date-selector-input");
    if (dateSelect && dateSelect.options.length === 0) {
      this.populateDateSelector();
    }

    const log = this.state.dailyLogs.find(l => l.indexId === this.state.currentIndex && l.date === this.state.currentDate) || this.state.dailyLogs.find(l => l.indexId === this.state.currentIndex);

    if (!log) {
      document.getElementById("open-type-badge").textContent = "No Data Available";
      return;
    }

    // Render badges
    const openBadgeEl = document.getElementById("open-type-badge");
    const dayBadgeEl = document.getElementById("day-type-badge");
    const shapeBadgeEl = document.getElementById("profile-shape-badge");

    if (openBadgeEl) {
      openBadgeEl.className = `badge ${log.openTypeBadge}`;
      openBadgeEl.innerHTML = `<i class="fa-solid fa-bolt"></i> ${log.openType}`;
    }
    if (dayBadgeEl) {
      dayBadgeEl.className = `badge ${log.dayTypeBadge}`;
      dayBadgeEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${log.dayType}`;
    }
    if (shapeBadgeEl) {
      shapeBadgeEl.className = `badge ${log.profileShapeBadge}`;
      shapeBadgeEl.innerHTML = `<i class="fa-solid fa-shapes"></i> ${log.profileShape}`;
    }

    // Render Structural Table
    const structTbody = document.getElementById("struct-table-body");
    if (structTbody) {
      structTbody.innerHTML = `
        <tr>
          <th>Point of Control (POC)</th>
          <td class="val-mono" style="color:var(--bullish-green); font-size:1.05rem;">${log.poc}</td>
        </tr>
        <tr>
          <th>Value Area High (VAH)</th>
          <td class="val-mono">${log.vah}</td>
        </tr>
        <tr>
          <th>Value Area Low (VAL)</th>
          <td class="val-mono">${log.val}</td>
        </tr>
        <tr>
          <th>Initial Balance (IB High - Low)</th>
          <td class="val-mono">${log.ibHigh} - ${log.ibLow}</td>
        </tr>
        <tr>
          <th>IB Range Analysis</th>
          <td style="color:#cbd5e1; font-weight:500;">${log.ibStatus}</td>
        </tr>
      `;
    }

    // Render Anomalies
    const anomaliesList = document.getElementById("anomalies-list");
    if (anomaliesList) {
      anomaliesList.innerHTML = "";
      log.anomalies.forEach(a => {
        const li = document.createElement("li");
        li.style.cssText = "padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); color:#e2e8f0; font-size:0.9rem; display:flex; align-items:center; gap:0.5rem;";
        li.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:var(--neutral-amber);"></i> <span>${a}</span>`;
        anomaliesList.appendChild(li);
      });
    }

    // Render Next Day Trade Idea Box
    const tradeBox = document.getElementById("next-day-trade-idea");
    if (tradeBox && log.nextDayIdea) {
      const idea = log.nextDayIdea;
      tradeBox.innerHTML = `
        <div class="trade-idea-header">
          <div class="trade-idea-title">
            <i class="fa-solid fa-lightbulb" style="color:var(--accent-cyan);"></i>
            <span>Next Day Trade Plan (${log.index} - ${log.date})</span>
          </div>
          <span class="badge ${idea.biasBadge}">${idea.bias}</span>
        </div>

        <div style="margin-bottom:1.25rem; font-size:0.95rem; color:#fff; background:rgba(0,240,255,0.08); padding:0.85rem 1.25rem; border-radius:8px; border-left:3px solid var(--accent-cyan);">
          <strong style="color:var(--accent-cyan); text-transform:uppercase; font-size:0.75rem; display:block; margin-bottom:0.2rem;">Actionable Entry Trigger:</strong>
          ${idea.trigger}
        </div>

        <div class="trade-idea-grid">
          <div class="trade-metric">
            <span class="trade-metric-label">Target 1 (Primary)</span>
            <span class="trade-metric-val green">${idea.target1}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Target 2 (Extension)</span>
            <span class="trade-metric-val green">${idea.target2}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Stop Loss (SL)</span>
            <span class="trade-metric-val red">${idea.sl}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Risk : Reward</span>
            <span class="trade-metric-val cyan">${idea.rr}</span>
          </div>
        </div>

        <div class="strategy-note">
          <i class="fa-solid fa-graduation-cap"></i>
          <div>
            <div style="font-weight:700; color:var(--accent-purple); margin-bottom:0.3rem;">Vishnu R Gupthan's Option Buying & Structural Rationale:</div>
            ${idea.note}
          </div>
        </div>
      `;
    }

    // Render TPO Visualizer
    this.tpoVisualizer.render(log);
  }

  renderSwingTrades() {
    const grid = document.getElementById("swing-grid");
    if (!grid) return;

    if (window.aiProcessingEngine) {
      this.state.swingTrades = window.aiProcessingEngine.getLiveSwingTrades();
    }
    let filtered = this.state.swingTrades;
    if (this.state.swingFilterStatus !== "all") {
      filtered = filtered.filter(s => s.status.toLowerCase().includes(this.state.swingFilterStatus));
    }
    if (this.state.swingFilterSector !== "all") {
      filtered = filtered.filter(s => s.sector.toLowerCase().includes(this.state.swingFilterSector));
    }

    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No swing trade updates found matching your filter criteria.</div>`;
      return;
    }

    filtered.forEach(stock => {
      const card = document.createElement("div");
      card.className = "stock-card";
      card.innerHTML = `
        <div class="stock-card-header">
          <div class="stock-info">
            <h3>${stock.stock}</h3>
            <span>${stock.ticker} &bull; ${stock.sector}</span>
          </div>
          <div class="stock-price-block">
            <div class="stock-cmp">${stock.cmp}</div>
            <span class="badge ${stock.statusBadge || 'bullish'}">${stock.status}</span>
          </div>
        </div>

        <div class="stock-levels-grid">
          <div class="stock-level-item">
            <span>Entry Zone</span>
            <span style="color:var(--accent-cyan);">${stock.entry}</span>
          </div>
          <div class="stock-level-item">
            <span>Target 1 / 2</span>
            <span style="color:var(--bullish-green);">${stock.target1} / ${stock.target2}</span>
          </div>
          <div class="stock-level-item">
            <span>Stop Loss</span>
            <span style="color:var(--bearish-red);">${stock.sl}</span>
          </div>
        </div>

        <div class="stock-rationale">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.3rem; font-weight:700;">Structural & Order Flow Edge:</div>
          ${stock.rationale}
        </div>

        <div class="stock-card-footer">
          <span><i class="fa-regular fa-clock"></i> Horizon: <strong style="color:#fff;">${stock.horizon}</strong></span>
          <span style="color:var(--accent-cyan); font-weight:700;"><i class="fa-solid fa-chart-line"></i> View Chart & Logic &rarr;</span>
        </div>
      `;
      card.style.cursor = "pointer";
      if (this.stockPicker) card.addEventListener("click", () => this.stockPicker.open(stock));
      grid.appendChild(card);
    });
  }

  renderLongTermPicks() {
    const grid = document.getElementById("longterm-grid");
    if (!grid) return;

    if (window.aiProcessingEngine) {
      this.state.longTermPicks = window.aiProcessingEngine.getLiveLongTermPicks();
    }
    grid.innerHTML = "";
    this.state.longTermPicks.forEach(pick => {
      const card = document.createElement("div");
      card.className = "stock-card";
      card.style.borderLeft = "4px solid var(--accent-purple)";
      card.innerHTML = `
        <div class="stock-card-header">
          <div class="stock-info">
            <h3>${pick.stock}</h3>
            <span>${pick.ticker} &bull; ${pick.sector}</span>
          </div>
          <div class="stock-price-block">
            <div class="stock-cmp">${pick.cmp}</div>
            <span class="badge purple">Wealth Creation</span>
          </div>
        </div>

        <div class="stock-levels-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stock-level-item">
            <span>Accumulation Zone</span>
            <span style="color:var(--accent-cyan);">${pick.entryZone}</span>
          </div>
          <div class="stock-level-item">
            <span>Multi-Bagger Target</span>
            <span style="color:var(--bullish-green);">${pick.target}</span>
          </div>
          <div class="stock-level-item">
            <span>Invalidation SL</span>
            <span style="color:var(--bearish-red);">${pick.sl}</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="stock-rationale" style="border-left-color:var(--bullish-green); background:rgba(0,230,118,0.03);">
            <div style="font-size:0.75rem; color:var(--bullish-green); text-transform:uppercase; margin-bottom:0.2rem; font-weight:700;"><i class="fa-solid fa-chart-line"></i> Fundamental Edge:</div>
            ${pick.fundamentalEdge}
          </div>
          <div class="stock-rationale" style="border-left-color:var(--accent-cyan); background:rgba(0,240,255,0.03);">
            <div style="font-size:0.75rem; color:var(--accent-cyan); text-transform:uppercase; margin-bottom:0.2rem; font-weight:700;"><i class="fa-solid fa-layer-group"></i> Market Profile & Institutional Edge:</div>
            ${pick.structuralEdge}
          </div>
        </div>
        <div class="stock-card-footer" style="margin-top:1rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:0.75rem; display:flex; justify-content:space-between;">
          <span style="font-size:0.8rem; color:var(--text-muted);">Multi-Bagger Candidate</span>
          <span style="color:var(--accent-cyan); font-weight:700; font-size:0.85rem;"><i class="fa-solid fa-chart-line"></i> View Chart & Logic &rarr;</span>
        </div>
      `;
      card.style.cursor = "pointer";
      if (this.stockPicker) card.addEventListener("click", () => this.stockPicker.open(pick));
      grid.appendChild(card);
    });
  }

  renderCourseBible() {
    const grid = document.getElementById("bible-grid");
    if (!grid) return;

    grid.innerHTML = "";
    const bible = window.COURSE_BIBLE || [];
    bible.forEach(mod => {
      const card = document.createElement("div");
      card.className = "bible-card";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:var(--accent-purple); font-weight:700; text-transform:uppercase;">${mod.module}</span>
          <span class="badge purple">${mod.readMins}</span>
        </div>
        <h4><i class="fa-solid fa-book-bookmark"></i> ${mod.title}</h4>
        <p style="font-style:italic; color:#e2e8f0; border-left:2px solid var(--accent-cyan); padding-left:0.75rem;">${mod.summary}</p>
        <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-top:0.25rem;">Key Principles & Applications:</div>
        <ul>
          ${mod.keyPoints.map(p => `<li style="margin-bottom:0.5rem;">${p}</li>`).join("")}
        </ul>
      `;
      grid.appendChild(card);
    });
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add("active");
  }

  closeModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
  }

  handleAddLogSubmit(formData) {
    const indexName = formData.get("indexName");
    const date = formData.get("logDate");
    const openType = formData.get("openType");
    const dayType = formData.get("dayType");
    const poc = formData.get("poc");
    const vah = formData.get("vah");
    const val = formData.get("val");
    const ibHigh = formData.get("ibHigh");
    const ibLow = formData.get("ibLow");

    let indexId = "nifty";
    if (indexName.includes("BANK")) indexId = "banknifty";
    else if (indexName.includes("SENSEX")) indexId = "sensex";
    else if (indexName.includes("MIDCAP")) indexId = "midcap";

    const newLog = {
      id: `${indexId}-${date}`,
      date: date,
      index: indexName,
      indexId: indexId,
      openType: openType,
      openTypeBadge: openType.includes("Drive") ? "od" : "orr",
      dayType: dayType,
      dayTypeBadge: "trend",
      profileShape: "Custom Profile Analysis",
      profileShapeBadge: "p-shape",
      ibHigh: ibHigh,
      ibLow: ibLow,
      ibStatus: `User Logged IB Range (${parseInt(ibHigh) - parseInt(ibLow)} pts)`,
      poc: poc,
      vah: vah,
      val: val,
      anomalies: [
        "User logged custom session structure",
        `POC established at ${poc}`,
        `Value Area defined between ${vah} - ${val}`
      ],
      nextDayIdea: {
        bias: "Directional Breakout Watch",
        biasBadge: "bullish",
        trigger: `Watch breakout of VAH (${vah}) or breakdown of VAL (${val})`,
        target1: `${parseInt(vah) + 100}`,
        target2: `${parseInt(vah) + 200}`,
        sl: `${poc}`,
        rr: "1 : 2.5",
        note: "Custom user-added session analysis. Apply Module 04 & 05 morning open checklists to validate breakout volume."
      },
      tpoDistribution: [
        { price: vah, letters: ["K", "L", "M"], isIb: false, isPoc: false },
        { price: poc, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"], isIb: true, isPoc: true },
        { price: val, letters: ["A", "B", "C"], isIb: true, isPoc: false }
      ]
    };

    this.state.dailyLogs.unshift(newLog);
    this.saveState();
    this.setIndex(indexId);
    this.showToast("Success", `Added new Daily Analysis for ${indexName} (${date})`);
  }

  handleAddStockSubmit(formData) {
    const type = formData.get("tradeType");
    const stock = formData.get("stockName");
    const ticker = formData.get("tickerSymbol");
    const cmp = formData.get("cmp");
    const entry = formData.get("entry");
    const target1 = formData.get("target1");
    const target2 = formData.get("target2") || target1;
    const sl = formData.get("sl");
    const rationale = formData.get("rationale");

    if (type === "swing") {
      this.state.swingTrades.unshift({
        id: `swing-${Date.now()}`,
        stock: stock,
        ticker: ticker,
        cmp: cmp,
        entry: entry,
        target1: target1,
        target2: target2,
        sl: sl,
        status: "Active Entry",
        statusBadge: "bullish",
        horizon: "1 - 3 Weeks",
        rr: "1 : 3.0",
        sector: "Custom Idea",
        rationale: `<strong>User Added Setup:</strong> ${rationale}`
      });
      this.saveState();
      this.renderSwingTrades();
      this.switchTab("tab-swing");
    } else {
      this.state.longTermPicks.unshift({
        id: `lt-${Date.now()}`,
        stock: stock,
        ticker: ticker,
        cmp: cmp,
        entryZone: entry,
        target: target1,
        sl: sl,
        sector: "Wealth Creation",
        fundamentalEdge: "User logged fundamental rationale and moat analysis.",
        structuralEdge: `<strong>Market Profile Edge:</strong> ${rationale}`
      });
      this.saveState();
      this.renderLongTermPicks();
      this.switchTab("tab-longterm");
    }

    this.showToast("Success", `Added ${stock} (${ticker}) to ${type === "swing" ? "Swing Trades" : "Wealth Portfolio"}`);
  }

  exportCurrentPlan() {
    const log = this.state.dailyLogs.find(l => l.indexId === this.state.currentIndex && l.date === this.state.currentDate);
    if (!log) return;

    const summaryText = `
=== TRADEBOT MARKET PROFILE DAILY TRADE PLAN ===
Index: ${log.index} | Date: ${log.date}
Open Type: ${log.openType}
Day Type: ${log.dayType} (${log.profileShape})

--- STRUCTURAL REFERENCES ---
POC (Point of Control): ${log.poc}
VAH (Value Area High):  ${log.vah}
VAL (Value Area Low):   ${log.val}
Initial Balance Range:  ${log.ibHigh} - ${log.ibLow} (${log.ibStatus})

--- NEXT DAY TRADE IDEA ---
Directional Bias: ${log.nextDayIdea.bias}
Entry Trigger:    ${log.nextDayIdea.trigger}
Target 1 / 2:     ${log.nextDayIdea.target1} / ${log.nextDayIdea.target2}
Stop Loss (SL):   ${log.nextDayIdea.sl}
Risk : Reward:    ${log.nextDayIdea.rr}

--- VISHNU GUPTHAN STRATEGY NOTE ---
${log.nextDayIdea.note}

Generated by TradeBot Market Profile & Order Flow Analytics Hub.
`;

    navigator.clipboard.writeText(summaryText.trim()).then(() => {
      this.showToast("Copied to Clipboard!", `Formatted Trade Plan for ${log.index} copied to clipboard.`);
    }).catch(() => {
      alert(summaryText);
    });
  }

  showToast(title, msg) {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div style="width:32px; height:32px; background:var(--bullish-green); color:#000; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:800;">
        <i class="fa-solid fa-check"></i>
      </div>
      <div>
        <div style="font-size:0.8rem; color:var(--bullish-green); text-transform:uppercase;">${title}</div>
        <div style="font-size:0.85rem; color:#fff;">${msg}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  window.app = new AppController();
  window.app.init();
});
