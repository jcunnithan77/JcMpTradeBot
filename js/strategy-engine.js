// TradeBot Market Profile & Order Flow Analytics Hub - Strategy Engine
// Interactive rule engine based on Mr. Vishnu R Gupthan's Open Type & Day Type checklists

class StrategyEngine {
  constructor(formId, outputId) {
    this.form = document.getElementById(formId);
    this.output = document.getElementById(outputId);
    
    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.generateStrategy();
      });
      
      // Auto-update on select change
      this.form.querySelectorAll("select, input").forEach(el => {
        el.addEventListener("change", () => this.generateStrategy());
      });
    }
  }

  generateStrategy() {
    if (!this.form || !this.output) return;

    const formData = new FormData(this.form);
    const index = formData.get("index") || "NIFTY 50";
    const openType = formData.get("openType") || "OTD";
    const dayType = formData.get("dayType") || "NVD";
    const ibWidth = formData.get("ibWidth") || "narrow";
    const bias = formData.get("bias") || "bullish";
    const cmpVal = formData.get("cmp");
    const ibVal = formData.get("ibRange");

    if (!cmpVal || !ibVal || isNaN(parseFloat(cmpVal)) || isNaN(parseFloat(ibVal))) {
      this.output.innerHTML = `
        <div class="strategy-card" style="border-left: 4px solid var(--accent-neutral); text-align: center; padding: 2.5rem;">
          <h3 style="color: var(--text-secondary); margin-bottom: 0.75rem;"><i class="fa-solid fa-signal"></i> Awaiting Live Exchange Price & IB Range</h3>
          <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto; line-height: 1.6;">Please connect your FYERS API account in the top right navbar to stream real-time index prices, or manually input the CMP and Initial Balance range above to calculate institutional rules.</p>
        </div>
      `;
      return;
    }

    const cmp = parseFloat(cmpVal);
    const ibRange = parseFloat(ibVal);

    let strategy = {
      title: "",
      biasBadge: "",
      biasText: "",
      trigger: "",
      target1: 0,
      target2: 0,
      sl: 0,
      rr: "",
      ruleNote: ""
    };

    // Rule Engine Logic
    if (openType === "OD") {
      // Open Drive
      strategy.title = `${index} Open Drive (OD) Trend Strategy`;
      strategy.biasBadge = bias === "bullish" ? "bullish" : "bearish";
      strategy.biasText = bias === "bullish" ? "Strong Bullish Trend Conviction" : "Strong Bearish Trend Conviction";
      
      if (bias === "bullish") {
        strategy.trigger = `Sit tight and ride momentum! Enter on minor pullbacks towards ${Math.round(cmp - ibRange * 0.2)} (A-period mid-point) with positive Delta.`;
        strategy.target1 = Math.round(cmp + ibRange * 1.5);
        strategy.target2 = Math.round(cmp + ibRange * 2.2);
        strategy.sl = Math.round(cmp - ibRange * 0.5);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Drive):</strong> Immediate aggressive directional movement from opening bell with NO retracement. Never initiate counter-trend trades against an OD. High volume & institutional initiation confirmed.";
      } else {
        strategy.trigger = `Aggressive shorting! Enter on pullbacks towards ${Math.round(cmp + ibRange * 0.2)} with negative Order Flow Delta.`;
        strategy.target1 = Math.round(cmp - ibRange * 1.5);
        strategy.target2 = Math.round(cmp - ibRange * 2.2);
        strategy.sl = Math.round(cmp + ibRange * 0.5);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Drive):</strong> One-sided aggressive selling. Watch for single print gaps acting as strong resistance ceilings.";
      }
    } else if (openType === "OTD") {
      // Open Test Drive
      strategy.title = `${index} Open Test Drive (OTD) Breakout Strategy`;
      strategy.biasBadge = bias === "bullish" ? "bullish" : "bearish";
      strategy.biasText = bias === "bullish" ? "Bullish Breakout after VAL/POC Test" : "Bearish Breakdown after VAH Test";

      if (bias === "bullish") {
        strategy.trigger = `Enter long on breakout of Initial Balance High (${Math.round(cmp + ibRange * 0.4)}) after successful test of lower support.`;
        strategy.target1 = Math.round(cmp + ibRange * 1.2);
        strategy.target2 = Math.round(cmp + ibRange * 1.8);
        strategy.sl = Math.round(cmp - ibRange * 0.4);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Test Drive):</strong> Initial small test toward reference point (VAL/POC), rejects, then drives aggressively in opposite direction. Enter on breakout of opening range after successful test.";
      } else {
        strategy.trigger = `Enter short on breakdown of IB Low (${Math.round(cmp - ibRange * 0.4)}) after rejection at VAH resistance.`;
        strategy.target1 = Math.round(cmp - ibRange * 1.2);
        strategy.target2 = Math.round(cmp - ibRange * 1.8);
        strategy.sl = Math.round(cmp + ibRange * 0.4);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Test Drive):</strong> Sellers absorb morning push and drive price lower. Watch for cumulative delta divergence.";
      }
    } else if (openType === "ORR") {
      // Open Rejection Reverse
      strategy.title = `${index} Open Rejection Reverse (ORR) Strategy`;
      strategy.biasBadge = "purple";
      strategy.biasText = "Structural Reversal / Double Distribution Watch";

      if (bias === "bullish") {
        strategy.trigger = `Watch B-period reversal! Enter long when price crosses back above opening print (${cmp}) with surging volume.`;
        strategy.target1 = Math.round(cmp + ibRange * 1.3);
        strategy.target2 = Math.round(cmp + ibRange * 2.0);
        strategy.sl = Math.round(cmp - ibRange * 0.6);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Rejection Reverse):</strong> Opens, pushes in one direction, meets strong rejection at key level, and reverses beyond opening price. B-period reversal is key!";
      } else {
        strategy.trigger = `Short on B-period failure below opening print (${cmp}). Look for option writers adding short straddles in H period.`;
        strategy.target1 = Math.round(cmp - ibRange * 1.3);
        strategy.target2 = Math.round(cmp - ibRange * 2.0);
        strategy.sl = Math.round(cmp + ibRange * 0.6);
        strategy.ruleNote = "<strong>Module 04 Rule (Open Rejection Reverse):</strong> Strong rejection at upper value area. Expect rapid liquidation down to opposite side of profile.";
      }
    } else {
      // Open Auction
      strategy.title = `${index} Open Auction (OA) Mean Reversion`;
      strategy.biasBadge = "neutral";
      strategy.biasText = "Sideways / Balanced Day Range Trading";
      
      strategy.trigger = `Fade range extremes! Buy near VAL (${Math.round(cmp - ibRange * 0.5)}) or Sell near VAH (${Math.round(cmp + ibRange * 0.5)}).`;
      strategy.target1 = cmp; // Target POC
      strategy.target2 = Math.round(bias === "bullish" ? cmp + ibRange * 0.4 : cmp - ibRange * 0.4);
      strategy.sl = Math.round(bias === "bullish" ? cmp - ibRange * 0.8 : cmp + ibRange * 0.8);
      strategy.ruleNote = "<strong>Module 04 Rule (Open Auction):</strong> Rotates back and forth inside or outside previous range without clear directional conviction. Scalping strategy (10-20 points). Expect mean reversion to daily POC!";
    }

    // Adjust for IB width
    if (ibWidth === "wide" && openType !== "OD") {
      strategy.ruleNote += " <br><br>⚠️ <strong>Wide IB Alert:</strong> Since Initial Balance is wide (~85% of day's range), odds strongly favor a <em>Normal Day (Balance)</em>. Do not chase breakouts; trade mean reversion!";
    } else if (ibWidth === "narrow") {
      strategy.ruleNote += " <br><br>⚡ <strong>Narrow IB Alert:</strong> Narrow initial balance (<150 pts) favors a <em>Normal Variation Day (NVD)</em> or <em>Trend Day</em> extension of 1.5x to 2x!";
    }

    // Calculate RR
    const risk = Math.abs(cmp - strategy.sl);
    const reward = Math.abs(strategy.target1 - cmp);
    const rrRatio = (reward / (risk || 1)).toFixed(1);
    strategy.rr = `1 : ${rrRatio}`;

    // Render output
    this.output.innerHTML = `
      <div class="trade-idea-box" style="animation: fadeIn 0.3s ease;">
        <div class="trade-idea-header">
          <div class="trade-idea-title">
            <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent-cyan);"></i>
            <span>${strategy.title}</span>
          </div>
          <span class="badge ${strategy.biasBadge}">${strategy.biasText}</span>
        </div>

        <div style="margin-bottom:1.25rem; font-size:0.95rem; color:#fff; background:rgba(0,240,255,0.08); padding:0.85rem 1.25rem; border-radius:8px; border-left:3px solid var(--accent-cyan);">
          <strong style="color:var(--accent-cyan); text-transform:uppercase; font-size:0.75rem; display:block; margin-bottom:0.2rem;">Actionable Entry Trigger:</strong>
          ${strategy.trigger}
        </div>

        <div class="trade-idea-grid">
          <div class="trade-metric">
            <span class="trade-metric-label">Target 1 (Primary)</span>
            <span class="trade-metric-val green">${strategy.target1.toLocaleString()}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Target 2 (Extension)</span>
            <span class="trade-metric-val green">${strategy.target2.toLocaleString()}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Stop Loss (Structural)</span>
            <span class="trade-metric-val red">${strategy.sl.toLocaleString()}</span>
          </div>
          <div class="trade-metric">
            <span class="trade-metric-label">Risk : Reward</span>
            <span class="trade-metric-val cyan">${strategy.rr}</span>
          </div>
        </div>

        <div class="strategy-note">
          <i class="fa-solid fa-book-open"></i>
          <div>
            <div style="font-weight:700; color:var(--accent-purple); margin-bottom:0.3rem;">Vishnu R Gupthan's Course Bible Rationale:</div>
            ${strategy.ruleNote}
          </div>
        </div>
      </div>
    `;
  }
}
