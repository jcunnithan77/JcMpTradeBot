// TradeBot Market Profile & Order Flow Analytics Hub - Multi-Asset AI Live Market Scanner
// Scans Intraday Options, MCX Commodities, Swing Trades, and Long Term Equities with FYERS API integration

class LiveScanner {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.filterCategory = "all";
    this.filterSignal = "all";
    this.filterSector = "all";
    this.searchQuery = "";
    
    // Build initial comprehensive multi-asset universe
    this.stocks = this.buildMultiAssetUniverse();
  }

  buildMultiAssetUniverse() {
    const rawUniverse = [
      // Major Indices
      { id: "nifty", name: "NIFTY 50", ticker: "NIFTY", tvTicker: "NSE:NIFTY", fyersSymbol: "NSE:NIFTY50-INDEX", cmp: "24,504.00", change: "+110.20", percent: "+0.46%", sector: "Indices", category: "Index", type: "Index" },
      { id: "banknifty", name: "BANK NIFTY", ticker: "BANKNIFTY", tvTicker: "NSE:BANKNIFTY", fyersSymbol: "NSE:BANKNIFTY-INDEX", cmp: "52,650.00", change: "+320.50", percent: "+0.61%", sector: "Indices", category: "Index", type: "Index" },
      { id: "sensex", name: "SENSEX", ticker: "SENSEX", tvTicker: "BSE:SENSEX", fyersSymbol: "BSE:SENSEX-INDEX", cmp: "80,000.00", change: "+410.00", percent: "+0.51%", sector: "Indices", category: "Index", type: "Index" },
      { id: "midcap", name: "MIDCAP SELECT", ticker: "MIDCAP", tvTicker: "NSE:MIDCPNIFTY", fyersSymbol: "NSE:NIFTYMIDSELECT-INDEX", cmp: "12,480.00", change: "+85.00", percent: "+0.68%", sector: "Indices", category: "Index", type: "Index" },

      // Intraday Options
      { id: "opt-1", name: "Nifty 50 24200 CE", ticker: "NIFTY24JUL24200CE", tvTicker: "NSE:NIFTY", fyersSymbol: "NSE:NIFTY24JUL24200CE", cmp: "185.50", change: "+35.00", percent: "+23.25%", sector: "Indices / Options", category: "Options", strike: "24,200", type: "Option" },
      { id: "opt-2", name: "Bank Nifty 52000 CE", ticker: "BANKNIFTY24JUL52000CE", tvTicker: "NSE:BANKNIFTY", fyersSymbol: "NSE:BANKNIFTY24JUL52000CE", cmp: "420.00", change: "+80.00", percent: "+23.50%", sector: "Indices / Options", category: "Options", strike: "52,000", type: "Option" },
      { id: "opt-3", name: "Sensex 80000 PE", ticker: "SENSEX24JUL80000PE", tvTicker: "BSE:SENSEX", fyersSymbol: "BSE:SENSEX24JUL80000PE", cmp: "310.00", change: "-45.00", percent: "-12.60%", sector: "Indices / Options", category: "Options", strike: "80,000", type: "Option" },
      { id: "opt-4", name: "FinNifty 23500 CE", ticker: "FINNIFTY24JUL23500CE", tvTicker: "NSE:FINNIFTY", fyersSymbol: "NSE:FINNIFTY24JUL23500CE", cmp: "145.00", change: "+20.00", percent: "+16.00%", sector: "Indices / Options", category: "Options", strike: "23,500", type: "Option" },

      // MCX Commodities
      { id: "mcx-1", name: "Crude Oil Futures", ticker: "CRUDEOIL24JULFUT", tvTicker: "MCX:CRUDEOIL1!", fyersSymbol: "MCX:CRUDEOIL24JULFUT", cmp: "6,850.00", change: "+45.00", percent: "+0.66%", sector: "Energy / MCX", category: "MCX", type: "Commodity" },
      { id: "mcx-2", name: "Gold Futures", ticker: "GOLD24AUGFUT", tvTicker: "MCX:GOLD1!", fyersSymbol: "MCX:GOLD24AUGFUT", cmp: "72,400.00", change: "+310.00", percent: "+0.43%", sector: "Bullion / MCX", category: "MCX", type: "Commodity" },
      { id: "mcx-3", name: "Silver Futures", ticker: "SILVER24SEPFUT", tvTicker: "MCX:SILVER1!", fyersSymbol: "MCX:SILVER24SEPFUT", cmp: "91,500.00", change: "+850.00", percent: "+0.94%", sector: "Bullion / MCX", category: "MCX", type: "Commodity" },
      { id: "mcx-4", name: "Natural Gas Futures", ticker: "NATURALGAS24JULFUT", tvTicker: "MCX:NATURALGAS1!", fyersSymbol: "MCX:NATURALGAS24JULFUT", cmp: "215.50", change: "-4.50", percent: "-2.05%", sector: "Energy / MCX", category: "MCX", type: "Commodity" },
      { id: "mcx-5", name: "Copper Futures", ticker: "COPPER24JULFUT", tvTicker: "MCX:COPPER1!", fyersSymbol: "MCX:COPPER24JULFUT", cmp: "865.00", change: "+12.00", percent: "+1.41%", sector: "Base Metals / MCX", category: "MCX", type: "Commodity" },

      // Swing Trades (Equities)
      { id: "sw-1", name: "Reliance Industries", ticker: "RELIANCE", tvTicker: "BSE:RELIANCE", fyersSymbol: "NSE:RELIANCE-EQ", cmp: "3,120.00", change: "+45.00", percent: "+1.46%", sector: "Energy / Petrochem", category: "Swing", type: "Equity" },
      { id: "sw-2", name: "Trent Ltd", ticker: "TRENT", tvTicker: "BSE:TRENT", fyersSymbol: "NSE:TRENT-EQ", cmp: "5,450.00", change: "+120.00", percent: "+2.25%", sector: "Retail / Fashion", category: "Swing", type: "Equity" },
      { id: "sw-3", name: "Larsen & Toubro", ticker: "LT", tvTicker: "BSE:LT", fyersSymbol: "NSE:LT-EQ", cmp: "3,650.00", change: "+65.00", percent: "+1.81%", sector: "Capital Goods", category: "Swing", type: "Equity" },
      { id: "sw-4", name: "Hindustan Aeronautics", ticker: "HAL", tvTicker: "BSE:HAL", fyersSymbol: "NSE:HAL-EQ", cmp: "5,200.00", change: "+180.00", percent: "+3.58%", sector: "Defense", category: "Swing", type: "Equity" },
      { id: "sw-5", name: "Tata Motors", ticker: "TATAMOTORS", tvTicker: "BSE:TATAMOTORS", fyersSymbol: "NSE:TATAMOTORS-EQ", cmp: "1,015.00", change: "+18.00", percent: "+1.81%", sector: "Automobile", category: "Swing", type: "Equity" },
      { id: "sw-6", name: "Zomato Ltd", ticker: "ZOMATO", tvTicker: "BSE:ZOMATO", fyersSymbol: "NSE:ZOMATO-EQ", cmp: "210.00", change: "+8.50", percent: "+4.22%", sector: "New-Age Tech", category: "Swing", type: "Equity" },

      // Long Term Investment (Wealth Portfolio)
      { id: "lt-1", name: "Tata Consultancy Services", ticker: "TCS", tvTicker: "BSE:TCS", fyersSymbol: "NSE:TCS-EQ", cmp: "4,050.00", change: "+55.00", percent: "+1.38%", sector: "IT Services", category: "Long Term", type: "Equity" },
      { id: "lt-2", name: "HDFC Bank Ltd", ticker: "HDFCBANK", tvTicker: "BSE:HDFCBANK", fyersSymbol: "NSE:HDFCBANK-EQ", cmp: "1,680.00", change: "+22.00", percent: "+1.33%", sector: "Banking", category: "Long Term", type: "Equity" },
      { id: "lt-3", name: "Titan Company", ticker: "TITAN", tvTicker: "BSE:TITAN", fyersSymbol: "NSE:TITAN-EQ", cmp: "3,450.00", change: "+40.00", percent: "+1.17%", sector: "Consumer Luxury", category: "Long Term", type: "Equity" },
      { id: "lt-4", name: "ITC Ltd", ticker: "ITC", tvTicker: "BSE:ITC", fyersSymbol: "NSE:ITC-EQ", cmp: "465.00", change: "+6.50", percent: "+1.42%", sector: "FMCG / Tobacco", category: "Long Term", type: "Equity" },
      { id: "lt-5", name: "Sun Pharma", ticker: "SUNPHARMA", tvTicker: "BSE:SUNPHARMA", fyersSymbol: "NSE:SUNPHARMA-EQ", cmp: "1,550.00", change: "+25.00", percent: "+1.64%", sector: "Pharma / Healthcare", category: "Long Term", type: "Equity" },
      { id: "lt-6", name: "Bharat Electronics", ticker: "BEL", tvTicker: "BSE:BEL", fyersSymbol: "NSE:BEL-EQ", cmp: "315.00", change: "+12.50", percent: "+4.13%", sector: "Defense Electronics", category: "Long Term", type: "Equity" }
    ];

    // Process all through AI Processing Engine
    return rawUniverse.map(item => {
      if (window.aiProcessingEngine) {
        return window.aiProcessingEngine.processSymbol(item);
      }
      return item;
    });
  }

  init() {
    this.render();
    this.setupControls();
    
    // Subscribe to Fyers connector updates
    if (window.app && window.app.fyersConnector) {
      window.app.fyersConnector.subscribe((updatedStock) => {
        this.updateCardUI(updatedStock);
      });
    }
  }

  setupControls() {
    // Category Tabs
    const catBtns = document.querySelectorAll(".scan-cat-btn");
    catBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        catBtns.forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.filterCategory = e.currentTarget.getAttribute("data-category");
        this.renderGrid();
      });
    });

    const searchInput = document.getElementById("scan-search");
    const signalSelect = document.getElementById("scan-filter-signal");
    const sectorSelect = document.getElementById("scan-filter-sector");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderGrid();
      });
    }
    if (signalSelect) {
      signalSelect.addEventListener("change", (e) => {
        this.filterSignal = e.target.value;
        this.renderGrid();
      });
    }
    if (sectorSelect) {
      sectorSelect.addEventListener("change", (e) => {
        this.filterSector = e.target.value;
        this.renderGrid();
      });
    }
  }

  updateCardUI(stock) {
    if (!stock || !stock.id) return;
    const cardEl = document.getElementById(`card-${stock.id}`);
    if (!cardEl) return;

    const priceEl = cardEl.querySelector(".stock-cmp");
    const changeEl = cardEl.querySelector(".ticker-change");
    const deltaEl = cardEl.querySelector(".delta-stat");
    
    if (priceEl) {
      priceEl.textContent = `₹ ${stock.cmp}`;
      priceEl.style.color = stock.status === "up" ? "var(--bullish-green)" : "var(--bearish-red)";
    }
    if (changeEl) {
      changeEl.className = `ticker-change ${stock.status}`;
      changeEl.textContent = `${stock.change} (${stock.percent})`;
    }
    if (deltaEl && stock.deltaStatus) {
      deltaEl.innerHTML = `<strong>Order Flow:</strong> ${stock.deltaStatus}`;
    }

    // Add subtle glow pulse
    cardEl.style.boxShadow = stock.status === "up" ? "0 0 18px rgba(0,230,118,0.35)" : "0 0 18px rgba(255,23,68,0.35)";
    setTimeout(() => {
      if (cardEl) cardEl.style.boxShadow = "none";
    }, 1000);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="scanner-header-card">
        <div class="scanner-header-info">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
            <span class="live-pulse-icon"></span>
            <span style="font-size:0.8rem; font-weight:800; color:var(--accent-cyan); text-transform:uppercase; letter-spacing:1px;">Multi-Asset Fyers Live & AI Processing Engine</span>
          </div>
          <h2><i class="fa-solid fa-radar" style="color:var(--accent-cyan);"></i> Institutional Multi-Asset AI Scanner</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Real-time scanning across Intraday Options, MCX Commodities, Swing Equities, and Long Term Wealth Portfolios with Steidlmayer TPO and Fundamental valuation synthesis.</p>
        </div>
        <div class="scanner-header-actions" id="fyers-header-actions">
          <!-- Fyers button injected by fyers-connector.js -->
        </div>
      </div>

      <!-- Asset Category Tabs -->
      <div class="category-tabs-bar" style="display:flex; gap:0.75rem; margin-top:1.5rem; margin-bottom:1.25rem; overflow-x:auto; padding-bottom:0.5rem;">
        <button class="scan-cat-btn active" data-category="all" style="padding:0.6rem 1.25rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
          <i class="fa-solid fa-layer-group" style="color:var(--accent-cyan);"></i> All Assets (22)
        </button>
        <button class="scan-cat-btn" data-category="Options" style="padding:0.6rem 1.25rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
          <i class="fa-solid fa-bolt" style="color:var(--neutral-amber);"></i> ⚡ Intraday Options
        </button>
        <button class="scan-cat-btn" data-category="MCX" style="padding:0.6rem 1.25rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
          <i class="fa-solid fa-fire-flame-simple" style="color:var(--bearish-red);"></i> 🛢️ MCX Commodities
        </button>
        <button class="scan-cat-btn" data-category="Swing" style="padding:0.6rem 1.25rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
          <i class="fa-solid fa-chart-line" style="color:var(--bullish-green);"></i> 📈 Swing Trades
        </button>
        <button class="scan-cat-btn" data-category="Long Term" style="padding:0.6rem 1.25rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.5rem; white-space:nowrap;">
          <i class="fa-solid fa-gem" style="color:var(--accent-purple);"></i> 💎 Long Term Portfolio
        </button>
      </div>

      <!-- Filter & Search Bar -->
      <div class="filter-bar" style="margin-bottom:1.5rem;">
        <div class="filter-group" style="flex:1; min-width:240px;">
          <span class="filter-label"><i class="fa-solid fa-magnifying-glass"></i> Search Ticker / Strike:</span>
          <input type="text" id="scan-search" class="form-control" placeholder="Search Reliance, Nifty 24200 CE, Gold, TCS..." style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:0.55rem 0.85rem; border-radius:6px; color:#fff; width:100%;">
        </div>
        <div class="filter-group">
          <span class="filter-label"><i class="fa-solid fa-filter"></i> AI Signal:</span>
          <select id="scan-filter-signal" class="filter-select">
            <option value="all">All Signals</option>
            <option value="Strong Buy">Strong Buy (90%+)</option>
            <option value="Buy">Buy (78-89%)</option>
            <option value="Watchlist">Watchlist / Neutral</option>
          </select>
        </div>
        <div class="filter-group">
          <span class="filter-label"><i class="fa-solid fa-industry"></i> Sector / Type:</span>
          <select id="scan-filter-sector" class="filter-select">
            <option value="all">All Sectors</option>
            <option value="Indices / Options">Indices / Options</option>
            <option value="Energy">Energy / Petrochem / MCX</option>
            <option value="Bullion">Bullion / Gold / Silver</option>
            <option value="Defense">Defense / Capital Goods</option>
            <option value="Banking">Banking / Financials</option>
            <option value="IT Services">IT Services / Tech</option>
          </select>
        </div>
      </div>

      <!-- Scanner Grid -->
      <div id="scanner-grid-content" class="stock-grid" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:1.25rem;">
        <!-- Dynamically rendered -->
      </div>
    `;

    // Ensure Fyers UI button is attached
    if (window.app && window.app.fyersConnector) {
      window.app.fyersConnector.setupUI();
    }

    this.renderGrid();
  }

  renderGrid() {
    const gridEl = document.getElementById("scanner-grid-content");
    if (!gridEl) return;

    let filtered = this.stocks;

    if (this.filterCategory !== "all") {
      filtered = filtered.filter(s => s.category === this.filterCategory);
    }
    if (this.searchQuery) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(this.searchQuery) || s.ticker.toLowerCase().includes(this.searchQuery) || s.sector.toLowerCase().includes(this.searchQuery));
    }
    if (this.filterSignal !== "all") {
      filtered = filtered.filter(s => s.signal && s.signal.toLowerCase().includes(this.filterSignal.toLowerCase()));
    }
    if (this.filterSector !== "all") {
      filtered = filtered.filter(s => s.sector && s.sector.toLowerCase().includes(this.filterSector.toLowerCase()));
    }

    gridEl.innerHTML = "";
    if (filtered.length === 0) {
      gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3.5rem; color:var(--text-muted); background:rgba(0,0,0,0.3); border-radius:12px; border:1px dashed rgba(255,255,255,0.1);">No instruments found matching your scan criteria in this asset class.</div>`;
      return;
    }

    filtered.forEach(stock => {
      const card = document.createElement("div");
      card.className = "stock-card";
      card.id = `card-${stock.id}`;
      card.style.cursor = "pointer";
      card.style.position = "relative";
      card.style.overflow = "hidden";
      card.style.transition = "all 0.3s ease";

      let borderHighlight = "1px solid rgba(255,255,255,0.08)";
      if (stock.aiScore >= 92) borderHighlight = "1px solid var(--accent-cyan)";
      else if (stock.aiScore >= 80) borderHighlight = "1px solid var(--bullish-green)";
      else if (stock.category === "Long Term") borderHighlight = "1px solid var(--accent-purple)";
      card.style.border = borderHighlight;

      // Category specific tag badge
      let catBadgeColor = "cyan";
      if (stock.category === "Options") catBadgeColor = "amber";
      else if (stock.category === "MCX") catBadgeColor = "red";
      else if (stock.category === "Long Term") catBadgeColor = "purple";

      card.innerHTML = `
        <div class="stock-card-header">
          <div class="stock-info">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem;">
              <span class="badge ${catBadgeColor}" style="font-size:0.65rem; padding:0.15rem 0.5rem;">${stock.category || 'Equity'}</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">${stock.sector}</span>
            </div>
            <h3 style="display:flex; align-items:center; gap:0.5rem; font-size:1.15rem;">
              <span>${stock.name}</span>
              ${stock.aiScore >= 92 ? `<i class="fa-solid fa-fire" style="color:var(--accent-cyan); font-size:0.85rem;" title="High Momentum Breakout"></i>` : ""}
            </h3>
            <span style="font-family:var(--font-mono); font-size:0.8rem; color:#cbd5e1;">${stock.ticker}</span>
          </div>
          <div class="stock-price-block">
            <div class="stock-cmp" style="font-size:1.35rem; font-weight:800; color:${stock.status === 'up' ? 'var(--bullish-green)' : 'var(--bearish-red)'};">₹ ${stock.cmp}</div>
            <span class="ticker-change ${stock.status}">${stock.change} (${stock.percent})</span>
          </div>
        </div>

        <div style="margin: 0.75rem 0; padding: 0.7rem; background:rgba(0,0,0,0.35); border-radius:8px; border-left:3px solid ${stock.aiScore >= 90 ? 'var(--accent-cyan)' : stock.aiScore >= 78 ? 'var(--bullish-green)' : 'var(--accent-purple)'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
            <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">AI Confidence Score</span>
            <span class="badge ${stock.signalBadge || 'bullish'}" style="font-size:0.75rem;">${stock.signal} (${stock.aiScore}%)</span>
          </div>
          <div class="progress-bar-bg" style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
            <div style="width:${stock.aiScore}%; height:100%; background:${stock.aiScore >= 90 ? 'var(--accent-cyan)' : stock.aiScore >= 78 ? 'var(--bullish-green)' : 'var(--accent-purple)'}; box-shadow:0 0 8px ${stock.aiScore >= 90 ? 'var(--accent-cyan)' : 'var(--bullish-green)'};"></div>
          </div>
        </div>

        <!-- Dynamic Category-Specific Metrics Block -->
        <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:#cbd5e1; margin-bottom:0.85rem;">
          ${stock.category === "Options" && stock.optionData ? `
            <div style="display:flex; justify-content:space-between; background:rgba(255,193,7,0.08); padding:0.4rem 0.6rem; border-radius:6px;">
              <span><i class="fa-solid fa-bolt" style="color:var(--neutral-amber);"></i> Delta: <strong>${stock.optionData.delta}</strong> | IV: <strong>${stock.optionData.iv}</strong></span>
              <span style="color:var(--bullish-green); font-weight:600;">${stock.optionData.buildup.split(" ")[0]}</span>
            </div>
          ` : ""}
          ${stock.category === "Long Term" && stock.fundamentalData ? `
            <div style="display:flex; justify-content:space-between; background:rgba(168,85,247,0.08); padding:0.4rem 0.6rem; border-radius:6px;">
              <span><i class="fa-solid fa-gem" style="color:var(--accent-purple);"></i> P/E: <strong>${stock.fundamentalData.peRatio}</strong> | ROE: <strong>${stock.fundamentalData.roe}</strong></span>
              <span style="color:var(--accent-cyan); font-weight:600;">Multi-Bagger</span>
            </div>
          ` : ""}
          <div style="display:flex; align-items:flex-start; gap:0.5rem;">
            <i class="fa-solid fa-layer-group" style="color:var(--accent-purple); margin-top:0.2rem;"></i>
            <span><strong>TPO Profile:</strong> ${stock.profileStatus}</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem;">
            <i class="fa-solid fa-chart-column" style="color:var(--bullish-green); margin-top:0.2rem;"></i>
            <span class="delta-stat"><strong>Order Flow:</strong> ${stock.deltaStatus}</span>
          </div>
        </div>

        <div class="stock-card-footer" style="border-top:1px solid rgba(255,255,255,0.05); padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-hand-pointer"></i> Click for TPO Chart & Valuation</span>
          <span style="color:var(--accent-cyan); font-weight:700; font-size:0.85rem;">View Analysis &rarr;</span>
        </div>
      `;

      card.addEventListener("click", () => {
        if (window.app && window.app.stockPicker) {
          window.app.stockPicker.open(stock);
        }
      });

      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "0 10px 28px rgba(0,240,255,0.18)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "none";
      });

      gridEl.appendChild(card);
    });
  }

  updateCardUI(stock) {
    if (!stock || !this.stocks) return;
    const match = this.stocks.find(s => s.id === stock.id || s.fyersSymbol === stock.fyersSymbol || s.ticker === stock.ticker);
    if (match) {
      match.cmp = stock.cmp;
      match.change = stock.change;
      match.percent = stock.percent;
      match.status = stock.status;
      match.rawLtp = stock.rawLtp;
    }
    const container = document.getElementById("live-scanner-container");
    if (container && (container.style.display !== "none" || container.classList.contains("active"))) {
      this.renderGrid();
    }
  }
}
