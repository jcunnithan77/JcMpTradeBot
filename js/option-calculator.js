/**
 * TradeBot Option Price & Target Estimator (UI Engine)
 * ======================================================
 * Implements Black-76 & Black-Scholes option pricing models, Newton-Raphson IV solver,
 * Greeks calculation, and real-time DOM updates for interactive trading analysis.
 */

class OptionCalculator {
  constructor() {
    this.state = {
      index: 'NIFTY 50',
      optionType: 'call',
      currentFuture: 24500.0,
      currentOptionPrice: 185.50,
      targetFuture: 24650.0,
      strike: 24500.0,
      daysToExpiry: 4.5,
      rate: 0.07,
      lotSize: 25
    };

    this.presets = {
      'NIFTY 50': { future: 24500, option: 185.50, target: 24650, strike: 24500, lot: 25, step: 50 },
      'BANK NIFTY': { future: 52500, option: 420.00, target: 52850, strike: 52500, lot: 15, step: 100 },
      'SENSEX': { future: 80000, option: 550.00, target: 80500, strike: 80000, lot: 10, step: 100 },
      'MIDCAP SELECT': { future: 12800, option: 110.00, target: 12950, strike: 12800, lot: 50, step: 25 }
    };

    this.init();
  }

  init() {
    // Wait for DOM to load or bind immediately if loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  setupUI() {
    const container = document.getElementById('tab-options-calc');
    if (!container) return;

    this.renderLayout(container);
    this.bindEvents();
    this.calculateAndUpdate();
  }

  // Math Helpers
  normCdf(x) {
    // Standard Normal CDF using Erf approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  normPdf(x) {
    return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
  }

  black76Price(F, K, T, r, sigma, type = 'call') {
    if (T <= 0 || sigma <= 0 || F <= 0 || K <= 0) {
      return type === 'call' ? Math.max(0, F - K) : Math.max(0, K - F);
    }

    const d1 = (Math.log(F / K) + (0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const discount = Math.exp(-r * T);

    if (type === 'call') {
      return discount * (F * this.normCdf(d1) - K * this.normCdf(d2));
    } else {
      return discount * (K * this.normCdf(-d2) - F * this.normCdf(-d1));
    }
  }

  black76Greeks(F, K, T, r, sigma, type = 'call') {
    if (T <= 0 || sigma <= 0 || F <= 0 || K <= 0) {
      const callDelta = F > K ? 1.0 : 0.0;
      const putDelta = K > F ? -1.0 : 0.0;
      return { delta: type === 'call' ? callDelta : putDelta, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }

    const d1 = (Math.log(F / K) + (0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const discount = Math.exp(-r * T);

    const delta = type === 'call' ? discount * this.normCdf(d1) : discount * (this.normCdf(d1) - 1.0);
    const gamma = (discount * this.normPdf(d1)) / (F * sigma * Math.sqrt(T));
    const vega = (F * discount * this.normPdf(d1) * Math.sqrt(T)) / 100.0;

    const term1 = -(F * discount * this.normPdf(d1) * sigma) / (2.0 * Math.sqrt(T));
    let thetaAnnual = 0;
    if (type === 'call') {
      thetaAnnual = term1 + r * discount * (F * this.normCdf(d1) - K * this.normCdf(d2));
    } else {
      thetaAnnual = term1 - r * discount * (K * this.normCdf(-d2) - F * this.normCdf(-d1));
    }
    const theta = thetaAnnual / 365.0;

    return {
      delta: Number(delta.toFixed(4)),
      gamma: Number(gamma.toFixed(6)),
      theta: Number(theta.toFixed(2)),
      vega: Number(vega.toFixed(2))
    };
  }

  calculateIV(targetPrice, F, K, T, r = 0.07, type = 'call') {
    if (targetPrice <= 0 || T <= 0 || F <= 0 || K <= 0) return 0.001;

    const intrinsic = type === 'call' ? Math.max(0, F - K) : Math.max(0, K - F);
    const discountedIntrinsic = intrinsic * Math.exp(-r * T);
    if (targetPrice <= discountedIntrinsic) return 0.001;

    // Newton-Raphson
    let sigma = 0.25;
    for (let i = 0; i < 50; i++) {
      const price = this.black76Price(F, K, T, r, sigma, type);
      const diff = price - targetPrice;
      if (Math.abs(diff) < 1e-5) return Number(sigma.toFixed(4));

      const greeks = this.black76Greeks(F, K, T, r, sigma, type);
      const vegaRaw = greeks.vega * 100.0;
      if (vegaRaw < 1e-8) break;

      sigma -= diff / vegaRaw;
      if (sigma <= 0.001 || sigma >= 5.0) break;
    }

    // Bisection fallback
    let low = 0.001, high = 5.0;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2.0;
      const priceMid = this.black76Price(F, K, T, r, mid, type);
      if (Math.abs(priceMid - targetPrice) < 1e-5) return Number(mid.toFixed(4));
      if (priceMid < targetPrice) low = mid;
      else high = mid;
    }
    return Number(((low + high) / 2.0).toFixed(4));
  }

  renderLayout(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2><i class="fa-solid fa-calculator" style="color:var(--accent-cyan);"></i> Option Price & Target Estimator</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">
          Predict exact option prices when underlying futures reach your target levels. Uses rigorous Black-76 mathematical modeling with real-time Implied Volatility (IV) solving and Greeks progression.
        </p>
      </div>

      <div class="analyzer-grid" style="grid-template-columns: 460px 1fr; gap:1.5rem; align-items:start;">
        
        <!-- LEFT: INPUTS & PRESETS -->
        <div class="glass-card" style="padding:1.5rem;">
          <div class="card-header" style="margin-bottom:1.25rem;">
            <span class="card-title"><i class="fa-solid fa-sliders"></i> Trade Setup Parameters</span>
            <span class="badge bullish" id="calc-status-badge">Ready</span>
          </div>

          <!-- Quick Presets -->
          <div style="margin-bottom:1.25rem;">
            <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:0.4rem; font-weight:600;">
              <i class="fa-solid fa-bolt"></i> Quick Index Presets
            </label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
              <button type="button" class="action-btn secondary preset-btn active" data-preset="NIFTY 50" style="font-size:0.8rem; padding:0.4rem;">NIFTY 50</button>
              <button type="button" class="action-btn secondary preset-btn" data-preset="BANK NIFTY" style="font-size:0.8rem; padding:0.4rem;">BANK NIFTY</button>
              <button type="button" class="action-btn secondary preset-btn" data-preset="SENSEX" style="font-size:0.8rem; padding:0.4rem;">SENSEX</button>
              <button type="button" class="action-btn secondary preset-btn" data-preset="MIDCAP SELECT" style="font-size:0.8rem; padding:0.4rem;">MIDCAP SELECT</button>
            </div>
          </div>

          <!-- Option Type Toggle -->
          <div style="margin-bottom:1.25rem;">
            <label style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:0.4rem; font-weight:600;">
              Option Direction
            </label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
              <button type="button" class="action-btn opt-type-btn active" data-type="call" style="background:var(--bullish-bg); border:1px solid var(--bullish-border); color:var(--bullish-green); justify-content:center; font-weight:700;">
                <i class="fa-solid fa-arrow-trend-up"></i> BULLISH CALL
              </button>
              <button type="button" class="action-btn opt-type-btn" data-type="put" style="background:transparent; border:1px solid var(--card-border); color:var(--text-muted); justify-content:center; font-weight:700;">
                <i class="fa-solid fa-arrow-trend-down"></i> BEARISH PUT
              </button>
            </div>
          </div>

          <form id="opt-calc-form" style="display:flex; flex-direction:column; gap:1rem;">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Current Future (₹)</label>
                <input type="number" id="calc-current-future" class="form-control" value="24500" step="any" required>
              </div>
              <div class="form-group">
                <label class="form-label">Current Option Price (₹)</label>
                <input type="number" id="calc-current-option" class="form-control" value="185.50" step="any" required>
              </div>
            </div>

            <div class="form-group" style="background:rgba(0, 240, 255, 0.05); padding:0.85rem; border-radius:8px; border:1px dashed var(--accent-cyan-glow);">
              <label class="form-label" style="color:var(--accent-cyan); font-weight:700;">
                <i class="fa-solid fa-bullseye"></i> Target Future Level (₹)
              </label>
              <input type="number" id="calc-target-future" class="form-control" value="24650" step="any" style="font-size:1.1rem; font-weight:700; color:#fff;" required>
            </div>

            <!-- Advanced / Strike Settings -->
            <div style="border-top:1px solid var(--card-border); padding-top:1rem; margin-top:0.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <span style="font-size:0.8rem; color:var(--text-main); font-weight:600;"><i class="fa-solid fa-gear"></i> Strike & Expiry Details</span>
                <button type="button" id="btn-auto-atm" style="background:transparent; border:none; color:var(--accent-cyan); font-size:0.75rem; cursor:pointer; text-decoration:underline;">
                  Auto-Select ATM Strike
                </button>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                  <label class="form-label">Strike Price</label>
                  <input type="number" id="calc-strike" class="form-control" value="24500" step="any" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Days to Expiry</label>
                  <input type="number" id="calc-days" class="form-control" value="4.5" step="0.1" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Lot Size</label>
                  <input type="number" id="calc-lot" class="form-control" value="25" required>
                </div>
              </div>
            </div>

            <!-- Quick Expiry Buttons -->
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button type="button" class="expiry-btn action-btn secondary" data-days="0.5" style="font-size:0.7rem; padding:0.2rem 0.5rem;">0DTE (Today)</button>
              <button type="button" class="expiry-btn action-btn secondary" data-days="3" style="font-size:0.7rem; padding:0.2rem 0.5rem;">3 Days</button>
              <button type="button" class="expiry-btn action-btn secondary active" data-days="5" style="font-size:0.7rem; padding:0.2rem 0.5rem;">5 Days (Weekly)</button>
              <button type="button" class="expiry-btn action-btn secondary" data-days="20" style="font-size:0.7rem; padding:0.2rem 0.5rem;">20 Days (Monthly)</button>
            </div>

            <button type="submit" class="action-btn" style="margin-top:0.5rem; width:100%; justify-content:center; background:linear-gradient(135deg, var(--accent-cyan), var(--accent-blue)); color:#000; font-weight:800; font-size:1rem; box-shadow:0 0 20px var(--accent-cyan-glow);">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Predict Option Price & Greeks
            </button>

          </form>
        </div>

        <!-- RIGHT: ANALYTICS & VISUAL DASHBOARD -->
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          
          <!-- Hero Card: Target Prediction -->
          <div class="glass-card" style="padding:1.5rem; background:linear-gradient(145deg, rgba(18,25,43,0.9), rgba(12,16,28,0.95)); border:1px solid rgba(0, 240, 255, 0.25); box-shadow:0 0 30px rgba(0, 240, 255, 0.1);">
            
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem; border-bottom:1px solid var(--card-border); padding-bottom:1rem;">
              <div>
                <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:1px;">
                  Predicted Target Option Price
                </span>
                <div id="out-target-price" style="font-size:2.8rem; font-weight:800; color:#fff; font-family:var(--font-heading); line-height:1.1; margin-top:0.2rem;">
                  ₹ 270.55
                </div>
              </div>

              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <span id="out-roi-badge" class="badge bullish" style="font-size:1rem; padding:0.4rem 0.8rem; margin-bottom:0.4rem;">
                  +₹85.05 (+45.85%)
                </span>
                <span id="out-lot-pnl" style="font-size:0.9rem; color:var(--text-muted); font-weight:600;">
                  Est. Lot Profit: <strong style="color:var(--bullish-green);">₹ +2,126.25</strong> (Lot: 25)
                </span>
              </div>
            </div>

            <!-- Implied Volatility & Greeks Grid -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem; text-align:center;">
              
              <div style="background:rgba(255,255,255,0.03); padding:0.85rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Implied Vol (IV)</div>
                <div id="out-iv" style="font-size:1.3rem; font-weight:700; color:var(--accent-cyan); margin:0.2rem 0;">17.11%</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">Annualized Vol</div>
              </div>

              <div style="background:rgba(255,255,255,0.03); padding:0.85rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Delta (Δ)</div>
                <div id="out-delta" style="font-size:1.3rem; font-weight:700; color:#fff; margin:0.2rem 0;">+0.50 ➔ +0.63</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">₹ move per ₹1 Future</div>
              </div>

              <div style="background:rgba(255,255,255,0.03); padding:0.85rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Gamma (Γ)</div>
                <div id="out-gamma" style="font-size:1.3rem; font-weight:700; color:#fff; margin:0.2rem 0;">0.00086</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">Delta acceleration</div>
              </div>

              <div style="background:rgba(255,255,255,0.03); padding:0.85rem; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Theta (Θ) / day</div>
                <div id="out-theta" style="font-size:1.3rem; font-weight:700; color:var(--bearish-red); margin:0.2rem 0;">-₹20.58</div>
                <div style="font-size:0.7rem; color:var(--text-dim);">Daily time decay</div>
              </div>

            </div>

          </div>

          <!-- Sensitivity Matrix Table -->
          <div class="glass-card" style="padding:1.5rem;">
            <div class="card-header" style="margin-bottom:1rem;">
              <span class="card-title"><i class="fa-solid fa-table-list"></i> Price Sensitivity & Scenario Progression</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">Simulated across future levels at current IV</span>
            </div>

            <div style="overflow-x:auto;">
              <table class="struct-table" style="width:100%; text-align:left; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid var(--card-border); color:var(--text-muted); font-size:0.8rem;">
                    <th style="padding:0.75rem;">Scenario</th>
                    <th style="padding:0.75rem;">Future Level (₹)</th>
                    <th style="padding:0.75rem;">Predicted Option Price (₹)</th>
                    <th style="padding:0.75rem;">Price Change (₹)</th>
                    <th style="padding:0.75rem;">ROI (%)</th>
                    <th style="padding:0.75rem;">Lot P&L (₹)</th>
                  </tr>
                </thead>
                <tbody id="out-sensitivity-body" style="font-family:var(--font-mono); font-size:0.9rem;">
                  <!-- Dynamically populated -->
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>
    `;
  }

  bindEvents() {
    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const presetName = btn.getAttribute('data-preset');
        if (this.presets[presetName]) {
          const p = this.presets[presetName];
          this.state.index = presetName;
          this.state.currentFuture = p.future;
          this.state.currentOptionPrice = p.option;
          this.state.targetFuture = p.target;
          this.state.strike = p.strike;
          this.state.lotSize = p.lot;

          document.getElementById('calc-current-future').value = p.future;
          document.getElementById('calc-current-option').value = p.option;
          document.getElementById('calc-target-future').value = p.target;
          document.getElementById('calc-strike').value = p.strike;
          document.getElementById('calc-lot').value = p.lot;

          this.calculateAndUpdate();
        }
      });
    });

    // Option Type
    document.querySelectorAll('.opt-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.opt-type-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.borderColor = 'var(--card-border)';
          b.style.color = 'var(--text-muted)';
        });
        const type = btn.getAttribute('data-type');
        this.state.optionType = type;
        if (type === 'call') {
          btn.style.background = 'var(--bullish-bg)';
          btn.style.borderColor = 'var(--bullish-border)';
          btn.style.color = 'var(--bullish-green)';
        } else {
          btn.style.background = 'var(--bearish-bg)';
          btn.style.borderColor = 'var(--bearish-border)';
          btn.style.color = 'var(--bearish-red)';
        }
        this.calculateAndUpdate();
      });
    });

    // Expiry buttons
    document.querySelectorAll('.expiry-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.expiry-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const days = parseFloat(btn.getAttribute('data-days'));
        this.state.daysToExpiry = days;
        document.getElementById('calc-days').value = days;
        this.calculateAndUpdate();
      });
    });

    // Auto ATM
    const autoAtmBtn = document.getElementById('btn-auto-atm');
    if (autoAtmBtn) {
      autoAtmBtn.addEventListener('click', () => {
        const future = parseFloat(document.getElementById('calc-current-future').value) || 24500;
        let step = 50;
        if (future > 40000 && future < 60000) step = 100; // Banknifty
        else if (future > 60000) step = 100; // Sensex
        else if (future < 15000) step = 25; // Midcap
        const atm = Math.round(future / step) * step;
        document.getElementById('calc-strike').value = atm;
        this.state.strike = atm;
        this.calculateAndUpdate();
      });
    }

    // Live input changes
    const inputs = ['calc-current-future', 'calc-current-option', 'calc-target-future', 'calc-strike', 'calc-days', 'calc-lot'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.state.currentFuture = parseFloat(document.getElementById('calc-current-future').value) || 0;
          this.state.currentOptionPrice = parseFloat(document.getElementById('calc-current-option').value) || 0;
          this.state.targetFuture = parseFloat(document.getElementById('calc-target-future').value) || 0;
          this.state.strike = parseFloat(document.getElementById('calc-strike').value) || 0;
          this.state.daysToExpiry = parseFloat(document.getElementById('calc-days').value) || 0.1;
          this.state.lotSize = parseInt(document.getElementById('calc-lot').value) || 1;
          this.calculateAndUpdate();
        });
      }
    });

    // Form submit
    const form = document.getElementById('opt-calc-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.calculateAndUpdate();
      });
    }
  }

  async calculateAndUpdate() {
    const F = this.state.currentFuture;
    const C = this.state.currentOptionPrice;
    const targetF = this.state.targetFuture;
    const K = this.state.strike;
    const T_years = Math.max(0.001, this.state.daysToExpiry / 365.0);
    const r = this.state.rate;
    const type = this.state.optionType;
    const lot = this.state.lotSize;

    if (F <= 0 || C <= 0 || targetF <= 0 || K <= 0) return;

    // 1. Try calling Python Backend API (/api/options/estimate)
    try {
      const res = await fetch('/api/options/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          future: F,
          option: C,
          target: targetF,
          strike: K,
          days: this.state.daysToExpiry,
          type: type,
          rate: r,
          lot: lot
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.analytics) {
          this.renderFromBackend(data);
          return;
        }
      }
    } catch (err) {
      // Python backend unreachable (e.g. opened standalone file), falling back to local JS engine
    }

    // 2. Local JS Engine Fallback
    const iv = this.calculateIV(C, F, K, T_years, r, type);
    const currentGreeks = this.black76Greeks(F, K, T_years, r, iv, type);
    const targetGreeks = this.black76Greeks(targetF, K, T_years, r, iv, type);
    const targetPrice = this.black76Price(targetF, K, T_years, r, iv, type);
    const priceChange = targetPrice - C;
    const roi = C > 0 ? (priceChange / C) * 100.0 : 0;
    const lotPnl = priceChange * lot;

    const simMatrix = [];
    let step = Math.max(10, Math.round(Math.abs(targetF - F) / 4.0 / 10) * 10);
    if (step === 0) step = 25;
    const offsets = [-3 * step, -2 * step, -step, 0, step, 2 * step, 3 * step];
    offsets.forEach(offset => {
      const simF = Number((targetF + offset).toFixed(2));
      const simP = this.black76Price(simF, K, T_years, r, iv, type);
      const simChange = simP - C;
      const simRoi = C > 0 ? (simChange / C) * 100.0 : 0;
      simMatrix.push({
        future_level: simF,
        option_price: simP,
        price_change: simChange,
        roi_percent: simRoi,
        is_target: offset === 0
      });
    });

    this.renderFromBackend({
      inputs: { lot_size: lot },
      analytics: {
        implied_volatility_percent: iv * 100,
        current_greeks: currentGreeks,
        target_option_price: targetPrice,
        target_greeks: targetGreeks,
        price_change_rs: priceChange,
        roi_percent: roi,
        expected_lot_pnl_rs: lotPnl
      },
      sensitivity_matrix: simMatrix
    });
  }

  renderFromBackend(data) {
    const analytics = data.analytics;
    const lot = data.inputs.lot_size || this.state.lotSize;
    const targetPrice = analytics.target_option_price;
    const priceChange = analytics.price_change_rs;
    const roi = analytics.roi_percent;
    const lotPnl = analytics.expected_lot_pnl_rs;
    const currentGreeks = analytics.current_greeks;
    const targetGreeks = analytics.target_greeks;

    const priceEl = document.getElementById('out-target-price');
    const roiEl = document.getElementById('out-roi-badge');
    const pnlEl = document.getElementById('out-lot-pnl');

    if (priceEl) priceEl.textContent = `₹ ${targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (roiEl) {
      const sign = priceChange >= 0 ? '+' : '';
      roiEl.textContent = `${sign}₹${priceChange.toFixed(2)} (${sign}${roi.toFixed(2)}%)`;
      roiEl.className = `badge ${priceChange >= 0 ? 'bullish' : 'bearish'}`;
    }

    if (pnlEl) {
      const sign = lotPnl >= 0 ? '+' : '';
      const color = lotPnl >= 0 ? 'var(--bullish-green)' : 'var(--bearish-red)';
      pnlEl.innerHTML = `Est. Lot Profit: <strong style="color:${color};">₹ ${sign}${lotPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (Lot: ${lot})`;
    }

    const ivEl = document.getElementById('out-iv');
    const deltaEl = document.getElementById('out-delta');
    const gammaEl = document.getElementById('out-gamma');
    const thetaEl = document.getElementById('out-theta');

    if (ivEl) ivEl.textContent = `${analytics.implied_volatility_percent.toFixed(2)}%`;
    if (deltaEl) deltaEl.textContent = `${currentGreeks.delta >= 0 ? '+' : ''}${currentGreeks.delta} ➔ ${targetGreeks.delta >= 0 ? '+' : ''}${targetGreeks.delta}`;
    if (gammaEl) gammaEl.textContent = `${currentGreeks.gamma}`;
    if (thetaEl) thetaEl.textContent = `-₹${Math.abs(currentGreeks.theta)}`;

    const tbody = document.getElementById('out-sensitivity-body');
    if (tbody) {
      tbody.innerHTML = '';
      data.sensitivity_matrix.forEach(row => {
        const isTarget = row.is_target;
        const tr = document.createElement('tr');
        if (isTarget) {
          tr.style.background = 'rgba(0, 240, 255, 0.1)';
          tr.style.fontWeight = '700';
          tr.style.borderLeft = '4px solid var(--accent-cyan)';
        } else {
          tr.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        }

        const simChange = row.price_change;
        const simRoi = row.roi_percent;
        const simPnl = simChange * lot;
        const sign = simChange >= 0 ? '+' : '';
        const color = simChange >= 0 ? 'var(--bullish-green)' : 'var(--bearish-red)';

        tr.innerHTML = `
          <td style="padding:0.75rem; color:${isTarget ? 'var(--accent-cyan)' : 'var(--text-muted)'};">
            ${isTarget ? '<i class="fa-solid fa-bullseye"></i> TARGET LEVEL' : ''}
          </td>
          <td style="padding:0.75rem; font-weight:700; color:#fff;">₹ ${row.future_level.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:0.75rem; font-weight:700; color:#fff;">₹ ${row.option_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding:0.75rem; color:${color};">${sign}₹${simChange.toFixed(2)}</td>
          <td style="padding:0.75rem; color:${color};">${sign}${simRoi.toFixed(2)}%</td>
          <td style="padding:0.75rem; color:${color}; font-weight:700;">${sign}₹${simPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}

// Global instance
window.optionCalculator = new OptionCalculator();
