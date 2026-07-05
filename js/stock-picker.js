// TradeBot Market Profile & Order Flow Analytics Hub - AI Stock Picker & Per-Item Analysis Studio
// Features 5-tab analysis: Picked Logic, Steidlmayer TPO Profile Chart, TradingView Live Chart, GoCharting Market Profile, and Fundamental Study

class StockPicker {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    this.currentStock = null;
    this.activeTab = "logic";
    
    if (this.modal) {
      this.modal.querySelectorAll(".close-btn, .btn-close-picker").forEach(btn => {
        btn.addEventListener("click", () => this.close());
      });
    }
  }

  open(stock) {
    if (!this.modal || !stock) return;
    
    // Process through AI engine to guarantee all dynamic data is synthesized
    this.currentStock = window.aiProcessingEngine ? window.aiProcessingEngine.processSymbol(stock) : stock;
    
    // Default tab based on asset category
    if (this.currentStock.category === "Long Term") {
      this.activeTab = "fundamental";
    } else {
      this.activeTab = "logic";
    }

    this.render(this.currentStock);
    this.modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove("active");
    document.body.style.overflow = "auto";
    
    // Clear chart container
    const chartContainer = document.getElementById("tv-chart-embed");
    if (chartContainer) chartContainer.innerHTML = "";
  }

  getGoChartingTicker(stock) {
    if (!stock) return "NSE:RELIANCE";
    if (stock.category === "Options" || stock.type === "Option") {
      const name = (stock.name || "").toLowerCase();
      if (name.includes("bank")) return "NSE:BANKNIFTY";
      if (name.includes("fin")) return "NSE:FINNIFTY";
      if (name.includes("sensex")) return "BSE:SENSEX";
      return "NSE:NIFTY";
    }
    let ticker = stock.tvTicker || `NSE:${stock.ticker || 'RELIANCE'}`;
    ticker = ticker.replace("1!", "").replace("-EQ", "").replace("-INDEX", "");
    return ticker;
  }

  renderStudyNoteCard(stock) {
    const notes = window.TPO_STUDY_NOTES || {};
    const dayKey = Object.keys(notes.dayTypes || {}).find(k => (stock.dayType || "").toLowerCase().includes(k.toLowerCase())) || "Normal Variation";
    const openKey = Object.keys(notes.openTypes || {}).find(k => (stock.openType || "").toLowerCase().includes(k.toLowerCase().split(" ")[0])) || "Open-Drive";
    
    const dayInfo = (notes.dayTypes || {})[dayKey] || (notes.dayTypes || {})["Normal Variation"];
    const openInfo = (notes.openTypes || {})[openKey] || (notes.openTypes || {})["Open-Drive"];

    return `
      <div class="glass-card" style="margin-bottom:1.5rem; background:linear-gradient(135deg, rgba(168,85,247,0.12), rgba(0,240,255,0.05)); border:1px solid var(--accent-purple); padding:1.25rem; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.75rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <i class="fa-solid fa-graduation-cap" style="color:var(--accent-purple); font-size:1.4rem;"></i>
            <div>
              <h4 style="color:#fff; font-size:1.05rem; margin:0;">Steidlmayer Institutional Study Note & Explanation</h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">Why is this structure called <strong>${dayInfo.title}</strong> and <strong>${openInfo.title}</strong>?</span>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <span class="badge purple" style="font-size:0.75rem;"><i class="fa-solid fa-calendar-day"></i> ${dayInfo.title}</span>
            <span class="badge cyan" style="font-size:0.75rem;"><i class="fa-solid fa-door-open"></i> ${openInfo.title}</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; margin-bottom:1rem;">
          <!-- Day Type Explanation -->
          <div style="background:rgba(0,0,0,0.35); padding:1rem; border-radius:8px; border-left:3px solid var(--accent-purple);">
            <strong style="color:var(--accent-purple); font-size:0.85rem; display:block; margin-bottom:0.4rem;">
              <i class="fa-solid fa-circle-question"></i> ${dayInfo.whyCalled}
            </strong>
            <div style="font-size:0.8rem; color:#cbd5e1; line-height:1.5; white-space:pre-line; margin-top:0.5rem;">
              <strong>Key Characteristics:</strong>
              ${dayInfo.characteristics}
            </div>
          </div>

          <!-- Open Type Explanation -->
          <div style="background:rgba(0,0,0,0.35); padding:1rem; border-radius:8px; border-left:3px solid var(--accent-cyan);">
            <strong style="color:var(--accent-cyan); font-size:0.85rem; display:block; margin-bottom:0.4rem;">
              <i class="fa-solid fa-circle-question"></i> ${openInfo.whyCalled}
            </strong>
            <div style="font-size:0.8rem; color:#cbd5e1; line-height:1.5; white-space:pre-line; margin-top:0.5rem;">
              <strong>Key Characteristics:</strong>
              ${openInfo.characteristics}
            </div>
          </div>
        </div>

        <!-- Institutional Trading Playbook -->
        <div style="background:rgba(0,230,118,0.08); border:1px solid rgba(0,230,118,0.25); padding:0.85rem 1rem; border-radius:8px; display:flex; align-items:flex-start; gap:0.75rem;">
          <i class="fa-solid fa-lightbulb" style="color:var(--bullish-green); font-size:1.2rem; margin-top:0.1rem;"></i>
          <div style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
            <strong style="color:var(--bullish-green);">Institutional Trading Playbook for this Setup:</strong>
            <span style="display:block; margin-top:0.25rem;">${dayInfo.playbook} ${openInfo.playbook}</span>
          </div>
        </div>
      </div>
    `;
  }

  render(stock) {
    const titleEl = document.getElementById("picker-stock-title");
    const subEl = document.getElementById("picker-stock-subtitle");
    const cmpEl = document.getElementById("picker-stock-cmp");
    const scoreBadgeEl = document.getElementById("picker-ai-score-badge");
    const contentContainer = document.getElementById("picker-tab-content");

    const stockName = stock.name || stock.stock || "Asset Analysis";
    const tickerSymbol = stock.ticker || "RELIANCE";
    const cmpVal = stock.cmp || "0.00";
    const scoreVal = stock.aiScore || 85;
    const signalVal = stock.signal || "Buy";
    const category = stock.category || "Equity";
    const sector = stock.sector || "General";

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent-cyan);"></i> ${stockName} <span style="font-size:1rem; font-family:var(--font-mono); color:var(--text-muted);">(${tickerSymbol})</span>`;
    if (subEl) subEl.innerHTML = `<span class="badge cyan" style="font-size:0.7rem; margin-right:0.5rem;">${category}</span> ${sector} &bull; AI Institutional Setup`;
    if (cmpEl) cmpEl.innerHTML = `₹ ${cmpVal} <span style="font-size:0.95rem; color:${stock.status === 'up' ? 'var(--bullish-green)' : 'var(--bearish-red)'}; font-weight:700;">${stock.change || ''} (${stock.percent || ''})</span>`;
    
    if (scoreBadgeEl) {
      scoreBadgeEl.className = `badge ${scoreVal >= 90 ? 'bullish' : scoreVal >= 78 ? 'bullish' : 'purple'}`;
      scoreBadgeEl.innerHTML = `<i class="fa-solid fa-brain"></i> AI Score: ${scoreVal}% (${signalVal})`;
    }

    // Render 5-Tab Navigation Bar & Container inside modal
    const tabsBarHtml = `
      <div class="picker-tabs-bar" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.85rem; flex-wrap:wrap;">
        <button class="picker-tab-btn ${this.activeTab === 'logic' ? 'active' : ''}" data-tab="logic">
          <i class="fa-solid fa-bullseye" style="color:var(--accent-cyan);"></i> 🎯 3-Pillar Picked Logic
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'tpo' ? 'active' : ''}" data-tab="tpo">
          <i class="fa-solid fa-layer-group" style="color:var(--accent-purple);"></i> 📊 TPO Market Profile
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'chart' ? 'active' : ''}" data-tab="chart">
          <i class="fa-solid fa-chart-candlestick" style="color:var(--bullish-green);"></i> 📈 TradingView Chart
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'gocharting' ? 'active' : ''}" data-tab="gocharting">
          <i class="fa-solid fa-fire-flame-curved" style="color:#ff6b6b;"></i> 🌐 GoCharting Profile & Footprint
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'fundamental' ? 'active' : ''}" data-tab="fundamental">
          <i class="fa-solid fa-building-columns" style="color:var(--neutral-amber);"></i> 🏢 Fundamental Study
        </button>
      </div>
      <div id="picker-tab-pane-container">
        <!-- Dynamically rendered tab pane -->
      </div>
    `;

    if (contentContainer) {
      contentContainer.innerHTML = tabsBarHtml;
      this.setupTabListeners();
      this.renderTabContent(this.activeTab, stock);
    }
  }

  setupTabListeners() {
    const btns = document.querySelectorAll(".picker-tab-btn");
    btns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        btns.forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.activeTab = e.currentTarget.getAttribute("data-tab");
        this.renderTabContent(this.activeTab, this.currentStock);
      });
    });
  }

  renderTabContent(tab, stock) {
    const container = document.getElementById("picker-tab-pane-container");
    if (!container || !stock) return;

    if (tab === "logic") {
      const logic = stock.pickedLogic || {};
      const risk = logic.riskPlan || { entry: "0.00", target1: "0.00", target2: "0.00", sl: "0.00", rr: "1 : 3.0" };
      
      container.innerHTML = `
        ${this.renderStudyNoteCard(stock)}
        <!-- Option Greeks Banner if Intraday Option -->
        ${stock.category === "Options" && stock.optionData ? `
          <div class="glass-card" style="margin-bottom:1.5rem; background:rgba(255,193,7,0.06); border:1px solid rgba(255,193,7,0.25); padding:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.5rem;">
              <span style="font-weight:800; color:var(--neutral-amber); font-size:1.05rem;"><i class="fa-solid fa-bolt"></i> Option Greeks & OI Buildup Engine</span>
              <span class="badge amber">${stock.optionData.optionType} &bull; Strike ${stock.optionData.strike}</span>
            </div>
            <div class="trade-idea-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom:1rem;">
              <div class="trade-metric"><span class="trade-metric-label">Delta (Δ)</span><span class="trade-metric-val cyan">${stock.optionData.delta}</span></div>
              <div class="trade-metric"><span class="trade-metric-label">Gamma (Γ)</span><span class="trade-metric-val green">${stock.optionData.gamma}</span></div>
              <div class="trade-metric"><span class="trade-metric-label">Theta (Θ)</span><span class="trade-metric-val red">${stock.optionData.theta}</span></div>
              <div class="trade-metric"><span class="trade-metric-label">IV %</span><span class="trade-metric-val amber">${stock.optionData.iv}</span></div>
              <div class="trade-metric"><span class="trade-metric-label">Total OI</span><span class="trade-metric-val" style="color:#fff;">${stock.optionData.oiTotal}</span></div>
            </div>
            <div style="font-size:0.85rem; color:#cbd5e1; background:rgba(0,0,0,0.4); padding:0.65rem 0.85rem; border-radius:6px;">
              <strong style="color:var(--bullish-green);">${stock.optionData.buildup}:</strong> ${stock.optionData.summary}
            </div>
          </div>
        ` : ""}

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
          <!-- Pillar 1: Structural TPO Logic -->
          <div class="glass-card" style="border-top:3px solid var(--accent-purple); background:rgba(0,0,0,0.4); padding:1.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
              <i class="fa-solid fa-layer-group" style="color:var(--accent-purple); font-size:1.1rem;"></i>
              <span style="font-weight:700; color:#fff; font-size:1.05rem;">1. Structural TPO & Value Area Edge</span>
            </div>
            <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.5;">${logic.tpoEdge || stock.profileStatus || 'Strong time acceptance and POC migration supporting institutional setup.'}</p>
          </div>

          <!-- Pillar 2: Order Flow & Tape Dynamics -->
          <div class="glass-card" style="border-top:3px solid var(--accent-cyan); background:rgba(0,0,0,0.4); padding:1.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
              <i class="fa-solid fa-chart-line" style="color:var(--accent-cyan); font-size:1.1rem;"></i>
              <span style="font-weight:700; color:#fff; font-size:1.05rem;">2. Order Flow & Tape Dynamics</span>
            </div>
            <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.5;">${logic.orderFlowEdge || stock.deltaStatus || 'Positive cumulative delta divergence with institutional COT ask sweeps.'}</p>
          </div>
        </div>

        <!-- Pillar 3: Actionable Risk-to-Reward Plan -->
        <div class="trade-idea-box" style="margin-top:1.5rem; background:rgba(0,240,255,0.04); border:1px solid rgba(0,240,255,0.15);">
          <div class="trade-idea-header">
            <div class="trade-idea-title">
              <i class="fa-solid fa-shield-halved" style="color:var(--bullish-green);"></i>
              <span>3. Actionable Institutional Trade Setup</span>
            </div>
            <span class="badge cyan">${risk.rr} R:R</span>
          </div>

          <div class="trade-idea-grid">
            <div class="trade-metric">
              <span class="trade-metric-label">Entry Zone</span>
              <span class="trade-metric-val cyan" style="font-size:1.2rem;">₹ ${risk.entry}</span>
            </div>
            <div class="trade-metric">
              <span class="trade-metric-label">Target 1 (Primary)</span>
              <span class="trade-metric-val green" style="font-size:1.2rem;">₹ ${risk.target1}</span>
            </div>
            <div class="trade-metric">
              <span class="trade-metric-label">Target 2 (Extension)</span>
              <span class="trade-metric-val green" style="font-size:1.2rem;">₹ ${risk.target2}</span>
            </div>
            <div class="trade-metric">
              <span class="trade-metric-label">Stop Loss (SL)</span>
              <span class="trade-metric-val red" style="font-size:1.2rem;">₹ ${risk.sl}</span>
            </div>
          </div>
        </div>
      `;
    } 
    else if (tab === "tpo") {
      const tpo = stock.tpoProfileData || {};
      const levels = tpo.tpoLevels || [];
      
      container.innerHTML = `
        ${this.renderStudyNoteCard(stock)}
        <div style="margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <h4 style="color:#fff; font-size:1.1rem; margin-bottom:0.35rem;"><i class="fa-solid fa-layer-group" style="color:var(--accent-purple);"></i> Steidlmayer 30-Minute Letter-Block TPO Profile</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">${tpo.summary || 'Dynamic letter-block distribution showing time acceptance and institutional value expansion.'}</p>
          </div>
          <button type="button" class="action-btn secondary btn-switch-gocharting" style="border-color:#ff6b6b; color:#ff6b6b; font-size:0.8rem; padding:0.45rem 0.85rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
            <i class="fa-solid fa-fire-flame-curved"></i> Switch to Live GoCharting TPO ↗
          </button>
        </div>

        <!-- Key TPO Levels Header -->
        <div class="trade-idea-grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom:1.5rem; background:rgba(0,0,0,0.4); padding:1rem; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
          <div class="trade-metric"><span class="trade-metric-label" style="color:var(--accent-cyan);">POC (Point of Control)</span><span class="trade-metric-val cyan" style="font-size:1.3rem;">₹ ${tpo.poc}</span></div>
          <div class="trade-metric"><span class="trade-metric-label" style="color:var(--bullish-green);">Value Area High (VAH)</span><span class="trade-metric-val green" style="font-size:1.3rem;">₹ ${tpo.vah}</span></div>
          <div class="trade-metric"><span class="trade-metric-label" style="color:var(--bearish-red);">Value Area Low (VAL)</span><span class="trade-metric-val red" style="font-size:1.3rem;">₹ ${tpo.val}</span></div>
          <div class="trade-metric"><span class="trade-metric-label" style="color:var(--accent-purple);">Initial Balance (IB)</span><span class="trade-metric-val purple" style="font-size:1.1rem;">₹ ${tpo.ibLow} - ${tpo.ibHigh}</span></div>
        </div>

        <!-- TPO Letter-Block Grid Table -->
        <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow-x:auto; padding:1.25rem;">
          <table style="width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted); text-align:left;">
                <th style="padding:0.6rem 1rem;">Price Level</th>
                <th style="padding:0.6rem 1rem;">Structural Zone</th>
                <th style="padding:0.6rem 1rem;">TPO Letter Blocks (30-Min Periods A - N)</th>
                <th style="padding:0.6rem 1rem; text-align:right;">TPO Count</th>
              </tr>
            </thead>
            <tbody>
              ${levels.map(level => {
                let rowBg = "transparent";
                let badgeHtml = "";
                let textColor = "#fff";
                
                if (level.type === "poc") {
                  rowBg = "rgba(0, 240, 255, 0.12)";
                  badgeHtml = `<span class="badge cyan" style="font-size:0.65rem;">POC (Max Time)</span>`;
                  textColor = "var(--accent-cyan)";
                } else if (level.type === "vah") {
                  rowBg = "rgba(0, 230, 118, 0.08)";
                  badgeHtml = `<span class="badge bullish" style="font-size:0.65rem;">VAH (Resistance)</span>`;
                  textColor = "var(--bullish-green)";
                } else if (level.type === "val") {
                  rowBg = "rgba(255, 23, 68, 0.08)";
                  badgeHtml = `<span class="badge bearish" style="font-size:0.65rem;">VAL (Support)</span>`;
                  textColor = "var(--bearish-red)";
                } else if (level.type === "excess") {
                  badgeHtml = `<span style="font-size:0.7rem; color:var(--text-muted);">Single Print Excess</span>`;
                  textColor = "#94a3b8";
                } else {
                  badgeHtml = `<span style="font-size:0.7rem; color:#cbd5e1;">Value Area</span>`;
                }

                return `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04); background:${rowBg};">
                    <td style="padding:0.65rem 1rem; font-weight:700; color:${textColor};">₹ ${level.price}</td>
                    <td style="padding:0.65rem 1rem;">${badgeHtml}</td>
                    <td style="padding:0.65rem 1rem; letter-spacing:3px; font-weight:600; color:${textColor};">${level.blocks}</td>
                    <td style="padding:0.65rem 1rem; text-align:right; font-weight:700; color:var(--accent-purple);">${level.count}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;

      const switchBtn = container.querySelector(".btn-switch-gocharting");
      if (switchBtn) {
        switchBtn.addEventListener("click", () => {
          this.activeTab = "gocharting";
          const btns = document.querySelectorAll(".picker-tab-btn");
          btns.forEach(b => {
            b.classList.remove("active");
            if (b.getAttribute("data-tab") === "gocharting") b.classList.add("active");
          });
          this.renderTabContent("gocharting", stock);
        });
      }
    }
    else if (tab === "chart") {
      const tvSymbol = stock.tvTicker || `BSE:${stock.ticker || 'RELIANCE'}`;
      const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(tvSymbol)}&interval=30&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f172a&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FKolkata`;
      const tvFullUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
      
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,240,255,0.05)); border:1px solid var(--bullish-green); padding:0.85rem 1.25rem; border-radius:10px; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <h4 style="color:#fff; font-size:1rem; margin:0; display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-chart-candlestick" style="color:var(--bullish-green);"></i> TradingView Institutional Real-Time Chart
            </h4>
            <span style="font-size:0.8rem; color:var(--text-muted);">30-Minute Institutional Timeframe &bull; Symbol: <strong>${tvSymbol}</strong></span>
          </div>
          <a href="${tvFullUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="background:var(--bullish-green); color:#000; text-decoration:none; padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.5rem; border-radius:8px; font-weight:700; box-shadow:0 0 15px rgba(0,230,118,0.4);">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open TradingView Fullscreen ↗
          </a>
        </div>
        <div style="width:100%; height:480px; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); box-shadow:0 15px 35px rgba(0,0,0,0.6);">
          <iframe id="tv-iframe" src="${iframeUrl}" width="100%" height="100%" frameborder="0" allowtransparency="true" scrolling="no" allowfullscreen></iframe>
        </div>
      `;
    }
    else if (tab === "gocharting") {
      const goTicker = this.getGoChartingTicker(stock);
      const goUrl = `https://gocharting.com/terminal?ticker=${encodeURIComponent(goTicker)}`;
      
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, rgba(255,107,107,0.15), rgba(168,85,247,0.1)); border:1px solid #ff6b6b; padding:0.85rem 1.25rem; border-radius:10px; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <h4 style="color:#fff; font-size:1rem; margin:0; display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-fire-flame-curved" style="color:#ff6b6b;"></i> GoCharting Institutional Market Profile & Footprint
            </h4>
            <span style="font-size:0.8rem; color:var(--text-muted);">Real-time TPO, Order Flow Delta Footprint, & Volume Profile &bull; Symbol: <strong>${goTicker}</strong></span>
          </div>
          <a href="${goUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="background:#ff6b6b; color:#fff; text-decoration:none; padding:0.5rem 1rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.5rem; border-radius:8px; font-weight:700; box-shadow:0 0 15px rgba(255,107,107,0.4);">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Launch GoCharting Terminal ↗
          </a>
        </div>
        
        <div style="margin-bottom:1rem; background:rgba(0,0,0,0.35); padding:0.85rem 1rem; border-radius:8px; border-left:3px solid var(--accent-purple); font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
          <strong>Institutional Tip:</strong> GoCharting is India's premier platform for <strong>Steidlmayer TPO Market Profile</strong> and <strong>Order Flow Footprint charts</strong>. If your browser blocks iframe embedding due to cross-origin security policies, click the red button above to open the full interactive workstation in a standalone tab!
        </div>

        <div style="width:100%; height:500px; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); background:var(--bg-primary); position:relative; box-shadow:0 15px 35px rgba(0,0,0,0.6);">
          <iframe id="gocharting-iframe" src="${goUrl}" width="100%" height="100%" frameborder="0" allowtransparency="true" scrolling="yes" allowfullscreen style="background:#0f172a;"></iframe>
        </div>
      `;
    }
    else if (tab === "fundamental") {
      const fund = stock.fundamentalData || {};
      
      container.innerHTML = `
        <div style="margin-bottom:1.25rem;">
          <h4 style="color:#fff; font-size:1.1rem; margin-bottom:0.35rem;"><i class="fa-solid fa-building-columns" style="color:var(--neutral-amber);"></i> Fundamental Valuation & Institutional Shareholding Study</h4>
          <p style="font-size:0.85rem; color:var(--text-muted);">Deep financial analysis assessing multi-bagger wealth creation potential, balance sheet health, and FII/DII accumulation.</p>
        </div>

        <!-- 8 Key Valuation Ratios Grid -->
        <div class="trade-idea-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom:1.5rem;">
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">P/E Ratio (TTM)</span>
            <span class="trade-metric-val cyan">${fund.peRatio || '24.5'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Ind P/E: ${fund.industryPe || '28.0'}</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">P/B Ratio</span>
            <span class="trade-metric-val purple">${fund.pbRatio || '4.2'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Price to Book</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">ROE (Return on Equity)</span>
            <span class="trade-metric-val green">${fund.roe || '18.4%'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Capital Efficiency</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">ROCE %</span>
            <span class="trade-metric-val green">${fund.roce || '21.2%'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Capital Employed</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">Debt-to-Equity</span>
            <span class="trade-metric-val ${parseFloat(fund.debtEquity || 0.2) < 0.5 ? 'green' : 'amber'}">${fund.debtEquity || '0.18'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Balance Sheet Health</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">Dividend Yield %</span>
            <span class="trade-metric-val amber">${fund.divYield || '1.45%'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Annual Payout</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">Qtr Revenue Growth</span>
            <span class="trade-metric-val green">${fund.qRevGrowth || '+16.8%'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">Year-over-Year</div>
          </div>
          <div class="trade-metric" style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08);">
            <span class="trade-metric-label">Net Profit Margin</span>
            <span class="trade-metric-val cyan">${fund.netMargin || '14.5%'}</span>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">EBITDA: ${fund.ebitdaGrowth || '+21.0%'}</div>
          </div>
        </div>

        <!-- Institutional Shareholding Breakdown -->
        <div class="glass-card" style="margin-bottom:1.5rem; background:rgba(0,0,0,0.35); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <span style="font-weight:700; color:#fff;"><i class="fa-solid fa-chart-pie" style="color:var(--accent-cyan);"></i> Shareholding Pattern & Institutional Flow</span>
            <span style="font-size:0.85rem; color:var(--bullish-green); font-weight:700;">${fund.fiiTrend || '🟢 FII / DII Increasing Stake'}</span>
          </div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem; text-align:center;">
            <div style="background:rgba(255,255,255,0.03); padding:0.75rem; border-radius:8px;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Promoters</span>
              <strong style="font-size:1.2rem; color:#fff;">${fund.promoterHolding || '54.2%'}</strong>
            </div>
            <div style="background:rgba(0,240,255,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(0,240,255,0.2);">
              <span style="font-size:0.75rem; color:var(--accent-cyan); display:block;">FII / FPI Holding</span>
              <strong style="font-size:1.2rem; color:var(--accent-cyan);">${fund.fiiHolding || '21.4%'}</strong>
            </div>
            <div style="background:rgba(0,230,118,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(0,230,118,0.2);">
              <span style="font-size:0.75rem; color:var(--bullish-green); display:block;">DII / Mutual Funds</span>
              <strong style="font-size:1.2rem; color:var(--bullish-green);">${fund.diiHolding || '15.8%'}</strong>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:0.75rem; border-radius:8px;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Public / Retail</span>
              <strong style="font-size:1.2rem; color:#cbd5e1;">${fund.publicHolding || '8.6%'}</strong>
            </div>
          </div>
        </div>

        <!-- Competitive Moat & Structural Growth Catalyst -->
        <div class="glass-card" style="border-left:4px solid var(--neutral-amber); background:rgba(255,193,7,0.04); padding:1.25rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <i class="fa-solid fa-crown" style="color:var(--neutral-amber); font-size:1.1rem;"></i>
            <span style="font-weight:700; color:#fff; font-size:1.05rem;">Competitive Moat & Multi-Bagger Catalyst</span>
          </div>
          <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.6; margin:0;">
            ${fund.competitiveMoat || 'Commands dominant market share with high barriers to entry, strong pricing power, and massive free cash flow generation supporting long-term wealth creation.'}
          </p>
        </div>
      `;
    }
  }
}
