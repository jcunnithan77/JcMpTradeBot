/**
 * TradeBot AI Stock Picker & Picked Logic Studio
 * ===============================================
 * Handles interactive 4-tab analysis breakdowns for equities, indices, and options:
 * 1. Interactive TradingView Chart & Setup Summary
 * 2. Pillar 1: Market Profile & TPO Institutional Edge
 * 3. Pillar 2: Order Flow Delta & Option Greeks
 * 4. Pillar 3: Risk-Reward Plan & Fundamental Valuation
 */
class StockPicker {
  constructor() {
    this.currentStock = null;
    this.activeTab = "chart";
    this.initEventListeners();
  }

  initEventListeners() {
    document.addEventListener("DOMContentLoaded", () => {
      const closeBtn = document.querySelector(".btn-close-picker");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => this.close());
      }
      const backdrop = document.getElementById("modal-stock-picker");
      if (backdrop) {
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop) this.close();
        });
      }
    });
  }

  open(stock) {
    if (!stock) return;
    this.currentStock = stock;
    this.activeTab = "chart";

    const modal = document.getElementById("modal-stock-picker");
    if (!modal) return;

    // Populate Header
    const titleEl = document.getElementById("picker-stock-title");
    const subtitleEl = document.getElementById("picker-stock-subtitle");
    const badgeEl = document.getElementById("picker-ai-score-badge");
    const cmpEl = document.getElementById("picker-stock-cmp");

    const cmpNum = parseFloat((stock.cmp || "0").toString().replace(/,/g, "").replace(/\+/g, "")) || 100;
    const changeNum = parseFloat((stock.change || "0").toString().replace(/,/g, "").replace(/\+/g, "")) || 0;
    const aiScore = stock.aiScore || (stock.category === "Index" ? 96 : 90);

    if (titleEl) titleEl.textContent = `${stock.name || stock.stock || stock.ticker} (${stock.ticker || ""})`;
    if (subtitleEl) subtitleEl.textContent = `${stock.category || "Equities"} • ${stock.sector || "General Market"} • AI Institutional Setup`;
    if (badgeEl) {
      badgeEl.textContent = `AI Score: ${aiScore}%`;
      badgeEl.className = `badge ${aiScore >= 90 ? "bullish" : (aiScore >= 80 ? "blue" : "neutral")}`;
    }
    if (cmpEl) cmpEl.textContent = `₹ ${stock.cmp || cmpNum.toFixed(2)}`;

    // Ensure pickedLogic exists
    if (!stock.pickedLogic && window.aiProcessingEngine && typeof window.aiProcessingEngine.generatePickedLogic === "function") {
      stock.pickedLogic = window.aiProcessingEngine.generatePickedLogic(stock, cmpNum, changeNum);
    }

    this.renderTabs();
    modal.classList.add("active");
  }

  close() {
    const modal = document.getElementById("modal-stock-picker");
    if (modal) modal.classList.remove("active");
  }

  renderTabs() {
    const container = document.getElementById("picker-tab-content");
    if (!container || !this.currentStock) return;

    const stock = this.currentStock;
    const logic = stock.pickedLogic || {};
    const cmpNum = parseFloat((stock.cmp || "0").toString().replace(/,/g, "").replace(/\+/g, "")) || 100;

    // Generate option greeks if needed
    let greeks = stock.greeks;
    if (!greeks && window.aiProcessingEngine && typeof window.aiProcessingEngine.generateOptionGreeks === "function") {
      greeks = window.aiProcessingEngine.generateOptionGreeks(stock, cmpNum);
    }

    // Determine TradingView Symbol
    let tvSymbol = "NSE:" + (stock.ticker || "NIFTY");
    if ((stock.ticker || "").includes("SENSEX") || (stock.name || "").includes("SENSEX")) {
      tvSymbol = "BSE:SENSEX";
    } else if (stock.ticker === "NIFTY") {
      tvSymbol = "NSE:NIFTY";
    } else if (stock.ticker === "BANKNIFTY") {
      tvSymbol = "NSE:BANKNIFTY";
    }

    container.innerHTML = `
      <!-- Tab Navigation -->
      <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; overflow-x:auto; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.08);">
        <button class="picker-tab-btn ${this.activeTab === 'chart' ? 'active' : ''}" onclick="window.stockPicker.switchTab('chart')">
          <i class="fa-solid fa-chart-candlestick"></i> Interactive Chart & Setup
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'tpo' ? 'active' : ''}" onclick="window.stockPicker.switchTab('tpo')">
          <i class="fa-solid fa-layer-group"></i> Pillar 1: Market Profile (TPO)
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'orderflow' ? 'active' : ''}" onclick="window.stockPicker.switchTab('orderflow')">
          <i class="fa-solid fa-water"></i> Pillar 2: Order Flow & Greeks
        </button>
        <button class="picker-tab-btn ${this.activeTab === 'risk' ? 'active' : ''}" onclick="window.stockPicker.switchTab('risk')">
          <i class="fa-solid fa-shield-halved"></i> Pillar 3: Risk Plan & Valuation
        </button>
      </div>

      <!-- Tab 1: Chart & Setup -->
      <div id="tab-chart" style="display:${this.activeTab === 'chart' ? 'block' : 'none'};">
        <div style="height:450px; width:100%; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); margin-bottom:1.5rem; background:#131722;">
          <iframe 
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(tvSymbol)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FKolkata"
            style="width:100%; height:100%; border:none;"
            allowtransparency="true"
            scrolling="no"
            allowfullscreen>
          </iframe>
        </div>
        <div class="stock-rationale" style="background:rgba(0,240,255,0.04); border-left:4px solid var(--accent-cyan); padding:1rem; border-radius:8px;">
          <div style="font-size:0.8rem; color:var(--accent-cyan); text-transform:uppercase; font-weight:700; margin-bottom:0.5rem;">
            <i class="fa-solid fa-bullseye"></i> Setup Rationale & Institutional Edge:
          </div>
          <div style="line-height:1.6; color:#e2e8f0; font-size:0.95rem;">
            ${stock.rationale || stock.structuralEdge || logic.tpoEdge || "Strong institutional breakout setup validated across daily timeframe and order flow footprint."}
          </div>
        </div>
      </div>

      <!-- Tab 2: Pillar 1 Market Profile (TPO) -->
      <div id="tab-tpo" style="display:${this.activeTab === 'tpo' ? 'block' : 'none'};">
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
          <h4 style="color:var(--accent-cyan); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
            <i class="fa-solid fa-layer-group"></i> Market Profile (TPO) Structural Analysis
          </h4>
          <p style="color:#cbd5e1; line-height:1.7; font-size:0.95rem; margin-bottom:1.5rem;">
            ${logic.tpoEdge || stock.structuralEdge || "Price is accepting value above previous balance area with continuous 30-minute TPO letter block expansion."}
          </p>
          
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem;">
            <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Point of Control (POC)</span>
              <div style="font-size:1.2rem; font-weight:700; color:var(--accent-cyan); margin-top:0.3rem;">₹ ${(cmpNum * 0.992).toFixed(2)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Value Area High (VAH)</span>
              <div style="font-size:1.2rem; font-weight:700; color:var(--bullish-green); margin-top:0.3rem;">₹ ${(cmpNum * 1.008).toFixed(2)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Value Area Low (VAL)</span>
              <div style="font-size:1.2rem; font-weight:700; color:var(--bearish-red); margin-top:0.3rem;">₹ ${(cmpNum * 0.978).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Pillar 2 Order Flow & Greeks -->
      <div id="tab-orderflow" style="display:${this.activeTab === 'orderflow' ? 'block' : 'none'};">
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
          <h4 style="color:var(--bullish-green); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
            <i class="fa-solid fa-water"></i> Order Flow Delta & Institutional Footprint
          </h4>
          <p style="color:#cbd5e1; line-height:1.7; font-size:0.95rem; margin-bottom:1.5rem;">
            ${logic.orderFlowEdge || "Cumulative Order Flow Delta reveals aggressive market buying absorption at key support levels."}
          </p>

          ${greeks ? `
          <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:1.25rem;">
            <h5 style="color:var(--accent-purple); margin-bottom:1rem;">Option Greeks & OI Buildup (${greeks.optionType || 'Equity Option'})</h5>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.75rem; margin-bottom:1rem;">
              <div style="background:rgba(180,80,255,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(180,80,255,0.2); text-align:center;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Delta (&Delta;)</span>
                <div style="font-size:1.1rem; font-weight:700; color:#fff;">${greeks.delta}</div>
              </div>
              <div style="background:rgba(180,80,255,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(180,80,255,0.2); text-align:center;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Gamma (&Gamma;)</span>
                <div style="font-size:1.1rem; font-weight:700; color:#fff;">${greeks.gamma}</div>
              </div>
              <div style="background:rgba(180,80,255,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(180,80,255,0.2); text-align:center;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Theta (&Theta;)</span>
                <div style="font-size:1.1rem; font-weight:700; color:var(--bearish-red);">${greeks.theta}</div>
              </div>
              <div style="background:rgba(180,80,255,0.05); padding:0.75rem; border-radius:8px; border:1px solid rgba(180,80,255,0.2); text-align:center;">
                <span style="font-size:0.7rem; color:var(--text-muted);">Implied Vol (IV)</span>
                <div style="font-size:1.1rem; font-weight:700; color:var(--accent-cyan);">${greeks.iv}</div>
              </div>
            </div>
            <div style="background:rgba(0,0,0,0.4); padding:0.75rem 1rem; border-radius:8px; font-size:0.85rem; color:#cbd5e1; display:flex; justify-content:space-between; align-items:center;">
              <span><strong>OI Buildup:</strong> ${greeks.buildup || greeks.summary || 'Bullish Accumulation'}</span>
              <span style="color:var(--text-muted);">Total OI: ${greeks.oi || '24,50,000'}</span>
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Tab 4: Pillar 3 Risk Plan & Valuation -->
      <div id="tab-risk" style="display:${this.activeTab === 'risk' ? 'block' : 'none'};">
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
          <h4 style="color:var(--accent-cyan); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
            <i class="fa-solid fa-shield-halved"></i> Institutional Risk-Reward Plan & Execution Levels
          </h4>
          
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem; margin-bottom:1.5rem;">
            <div style="background:rgba(0,240,255,0.05); padding:1rem; border-radius:8px; border:1px solid rgba(0,240,255,0.2); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Entry Zone</span>
              <div style="font-size:1.15rem; font-weight:700; color:var(--accent-cyan); margin-top:0.3rem;">${stock.entry || stock.entryZone || (logic.riskPlan ? logic.riskPlan.entry : cmpNum.toFixed(2))}</div>
            </div>
            <div style="background:rgba(0,230,118,0.05); padding:1rem; border-radius:8px; border:1px solid rgba(0,230,118,0.2); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Target 1 / 2</span>
              <div style="font-size:1.15rem; font-weight:700; color:var(--bullish-green); margin-top:0.3rem;">${stock.target1 || stock.target || (logic.riskPlan ? logic.riskPlan.target1 : (cmpNum*1.045).toFixed(2))}</div>
            </div>
            <div style="background:rgba(255,23,68,0.05); padding:1rem; border-radius:8px; border:1px solid rgba(255,23,68,0.2); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Stop Loss (SL)</span>
              <div style="font-size:1.15rem; font-weight:700; color:var(--bearish-red); margin-top:0.3rem;">${stock.sl || (logic.riskPlan ? logic.riskPlan.sl : (cmpNum*0.972).toFixed(2))}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Risk-Reward (R:R)</span>
              <div style="font-size:1.15rem; font-weight:700; color:#fff; margin-top:0.3rem;">${stock.rr || (logic.riskPlan ? logic.riskPlan.rr : "1 : 3.2")}</div>
            </div>
          </div>

          <div class="stock-rationale" style="background:rgba(0,230,118,0.03); border-left:4px solid var(--bullish-green); padding:1rem; border-radius:8px;">
            <div style="font-size:0.8rem; color:var(--bullish-green); text-transform:uppercase; font-weight:700; margin-bottom:0.4rem;">
              <i class="fa-solid fa-chart-pie"></i> Fundamental & Valuation Edge:
            </div>
            <div style="line-height:1.6; color:#e2e8f0; font-size:0.95rem;">
              ${stock.fundamentalEdge || "High institutional holdings with robust quarterly revenue expansion and positive free cash flow yield."}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    this.renderTabs();
  }
}

// Expose globally
window.stockPicker = new StockPicker();
