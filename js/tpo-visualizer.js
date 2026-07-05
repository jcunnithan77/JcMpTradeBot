// TradeBot Market Profile & Order Flow Analytics Hub - TPO Visualizer
// Dynamically renders 30-minute letter distributions (A to M periods) with structural overlays

const TPO_PERIODS_INFO = {
  "A": "09:15 - 09:45 AM | Action Period (Highest Volatility & Initial Balance Start)",
  "B": "09:45 - 10:15 AM | Balanced Action Period (Completes Initial Balance Range)",
  "C": "10:15 - 10:45 AM | Cheating Period (Tests morning range extremes)",
  "D": "10:45 - 11:15 AM | Directional Extension Period",
  "E": "11:15 - 11:45 AM | Mid-day Directional Continuation",
  "F": "11:45 - 12:15 PM | Mid-day Transition Period",
  "G": "12:15 - 12:45 PM | Gap Decision Period (Crucial on gap days)",
  "H": "12:45 - 13:15 PM | The Hammer Period (Option writers adjust strikes / gamma spikes)",
  "I": "13:15 - 13:45 PM | Afternoon Re-assessment Period",
  "J": "13:45 - 14:15 PM | The Joker Period (Rapid reversals occur if new highs fail)",
  "K": "14:15 - 14:45 PM | The Kill Period (Feared by intraday traders due to aggressive moves)",
  "L": "14:45 - 15:15 PM | Closing Institutional Execution Period",
  "M": "15:15 - 15:30 PM | Final 15-min Auction Closing Bell"
};

class TPOVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(logData) {
    if (!this.container || !logData || !logData.tpoDistribution) return;

    this.container.innerHTML = "";

    // Header info
    const header = document.createElement("div");
    header.className = "tpo-header";
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-weight: 700; color: #fff; font-size: 1rem;">${logData.index}</span>
        <span style="color: var(--text-muted); font-family: var(--font-mono);">${logData.date}</span>
        <span class="badge ${logData.profileShapeBadge}">${logData.profileShape}</span>
      </div>
      <div style="display: flex; gap: 1rem; font-size: 0.75rem;">
        <span style="color: var(--bullish-green);"><i class="fa-solid fa-square"></i> POC (${logData.poc})</span>
        <span style="color: var(--accent-cyan);"><i class="fa-solid fa-square"></i> VAH/VAL (${logData.vah} - ${logData.val})</span>
        <span style="color: var(--bearish-red);"><i class="fa-solid fa-square"></i> Single Print</span>
      </div>
    `;
    this.container.appendChild(header);

    // TPO Grid
    const grid = document.createElement("div");
    grid.className = "tpo-grid";

    logData.tpoDistribution.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.className = "tpo-row";
      
      if (row.isPoc) {
        rowEl.style.background = "rgba(0, 230, 118, 0.08)";
        rowEl.style.borderRadius = "4px";
      }

      // Price string
      const priceEl = document.createElement("div");
      priceEl.className = "tpo-price";
      priceEl.textContent = row.price;
      rowEl.appendChild(priceEl);

      // Letters container
      const lettersEl = document.createElement("div");
      lettersEl.className = "tpo-letters";

      row.letters.forEach(letter => {
        const letterSpan = document.createElement("span");
        letterSpan.className = "tpo-letter";
        letterSpan.textContent = letter;

        // Apply classes
        if (row.isPoc) letterSpan.classList.add("poc");
        else if (row.isSingle) letterSpan.classList.add("single");
        else if (row.isIb) letterSpan.classList.add("ib");

        // Tooltip on hover/click
        const info = TPO_PERIODS_INFO[letter] || `Period ${letter}`;
        letterSpan.title = `${info} | Price: ${row.price}`;

        letterSpan.addEventListener("click", () => {
          this.showPeriodToast(letter, info, row.price);
        });

        lettersEl.appendChild(letterSpan);
      });

      rowEl.appendChild(lettersEl);

      // Reference Line Markers (POC, VAH, VAL, IB High, IB Low)
      const refContainer = document.createElement("div");
      refContainer.style.display = "flex";
      refContainer.style.gap = "0.5rem";
      refContainer.style.alignItems = "center";
      refContainer.style.marginLeft = "auto";
      refContainer.style.paddingRight = "1rem";

      if (row.price === logData.poc || row.isPoc) {
        const pocBadge = document.createElement("span");
        pocBadge.className = "tpo-ref-line poc-line";
        pocBadge.innerHTML = `<i class="fa-solid fa-star"></i> POC (${logData.poc})`;
        refContainer.appendChild(pocBadge);
      }
      if (row.price === logData.vah) {
        const vahBadge = document.createElement("span");
        vahBadge.className = "tpo-ref-line vah-line";
        vahBadge.innerHTML = `📈 VAH (${logData.vah})`;
        refContainer.appendChild(vahBadge);
      }
      if (row.price === logData.val) {
        const valBadge = document.createElement("span");
        valBadge.className = "tpo-ref-line val-line";
        valBadge.innerHTML = `📉 VAL (${logData.val})`;
        refContainer.appendChild(valBadge);
      }
      if (row.price === logData.ibHigh) {
        const ibhBadge = document.createElement("span");
        ibhBadge.style.cssText = "font-size:0.7rem; color:var(--accent-purple); border:1px solid var(--accent-purple); padding:1px 6px; border-radius:4px; font-weight:700;";
        ibhBadge.textContent = `IB HIGH (${logData.ibHigh})`;
        refContainer.appendChild(ibhBadge);
      }
      if (row.price === logData.ibLow) {
        const iblBadge = document.createElement("span");
        iblBadge.style.cssText = "font-size:0.7rem; color:var(--accent-purple); border:1px solid var(--accent-purple); padding:1px 6px; border-radius:4px; font-weight:700;";
        iblBadge.textContent = `IB LOW (${logData.ibLow})`;
        refContainer.appendChild(iblBadge);
      }

      if (refContainer.children.length > 0) {
        rowEl.appendChild(refContainer);
      }

      grid.appendChild(rowEl);
    });

    this.container.appendChild(grid);
  }

  showPeriodToast(letter, info, price) {
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
      <div style="width:32px; height:32px; background:var(--accent-cyan); color:#000; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:800; font-family:var(--font-mono);">
        ${letter}
      </div>
      <div>
        <div style="font-size:0.8rem; color:var(--accent-cyan); text-transform:uppercase;">TPO Period Block Selected</div>
        <div style="font-size:0.85rem; color:#fff;">${info}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">At Price Level: <strong style="color:#fff;">${price}</strong></div>
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
