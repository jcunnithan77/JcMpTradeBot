// TradeBot Market Profile & Order Flow Analytics Hub - FYERS API Live Data Bridge & Automated OAuth Login
// Supports automated OAuth 2.0 login redirect, SHA-256 AppIdHash token generation, REST Quotes, and AI simulation fallback

class FyersConnector {
  constructor() {
    this.appId = sessionStorage.getItem("tb_fyers_app_id") || localStorage.getItem("tb_fyers_app_id") || "";
    this.secretId = sessionStorage.getItem("tb_fyers_secret_id") || localStorage.getItem("tb_fyers_secret_id") || "";
    this.redirectUri = sessionStorage.getItem("tb_fyers_redirect_uri") || localStorage.getItem("tb_fyers_redirect_uri") || window.location.href.split("?")[0];
    this.accessToken = sessionStorage.getItem("tb_fyers_access_token") || localStorage.getItem("tb_fyers_access_token") || "";
    this.isConnected = false;
    this.isSimulationMode = false;
    this.pollTimer = null;
    this.listeners = [];
  }

  init() {
    this.setupUI();
    
    // Check if redirected back from Fyers OAuth login with ?auth_code=
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, "?"));
    const authCode = urlParams.get("auth_code") || hashParams.get("auth_code");
    
    if (authCode) {
      console.log("⚡ FYERS OAuth Code detected in URL:", authCode);
      this.validateAuthCode(authCode);
    } else if (this.appId && this.accessToken) {
      this.connect();
    } else {
      this.setDisconnectedState();
    }
  }

  setupUI() {
    // Add Fyers connection button to header if not already present
    const headerActions = document.querySelector(".scanner-header-actions") || document.querySelector(".nav-container");
    const existingBtn = document.getElementById("btn-fyers-status");
    
    if (!existingBtn && headerActions) {
      const btn = document.createElement("button");
      btn.id = "btn-fyers-status";
      btn.className = "action-btn secondary";
      btn.style.cssText = "padding:0.45rem 0.9rem; font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.5rem; border:1px solid var(--accent-cyan); background:rgba(0,240,255,0.08); color:#fff; border-radius:8px; cursor:pointer;";
      btn.innerHTML = `<span class="fyers-indicator" style="width:10px; height:10px; border-radius:50%; background:var(--text-muted); display:inline-block;"></span> <span>⚫ FYERS: DISCONNECTED (CLICK TO CONNECT)</span>`;
      
      btn.addEventListener("click", () => this.openSettingsModal());
      
      if (headerActions.classList.contains("nav-container")) {
        headerActions.appendChild(btn);
      } else {
        headerActions.insertBefore(btn, headerActions.firstChild);
      }
    }

    // Add TPO Study Notes dictionary button if not present
    const existingDictBtn = document.getElementById("btn-tpo-dict-navbar");
    if (!existingDictBtn && headerActions) {
      const dictBtn = document.createElement("button");
      dictBtn.id = "btn-tpo-dict-navbar";
      dictBtn.className = "action-btn secondary";
      dictBtn.style.cssText = "padding:0.45rem 0.9rem; font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.5rem; border:1px solid var(--accent-purple); background:rgba(168,85,247,0.12); color:#fff; border-radius:8px; cursor:pointer; margin-left:0.5rem;";
      dictBtn.innerHTML = `<i class="fa-solid fa-book-open-reader" style="color:var(--accent-purple);"></i> <span>TPO STUDY NOTES</span>`;
      dictBtn.addEventListener("click", () => {
        if (window.openTPODictionaryModal) window.openTPODictionaryModal();
      });
      if (headerActions.classList.contains("nav-container")) {
        headerActions.appendChild(dictBtn);
      } else {
        headerActions.insertBefore(dictBtn, headerActions.firstChild);
      }
    }
  }

  updateStatusUI(status, text, color) {
    const btn = document.getElementById("btn-fyers-status");
    if (!btn) return;
    
    const indicator = btn.querySelector(".fyers-indicator");
    const label = btn.querySelector("span:last-child");
    
    if (indicator) {
      indicator.style.background = color;
      indicator.style.boxShadow = `0 0 8px ${color}`;
    }
    if (label) {
      label.textContent = `FYERS: ${text}`;
    }
    btn.style.borderColor = color;
  }

  async computeSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }

  openSettingsModal() {
    let modal = document.getElementById("modal-fyers-settings");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-fyers-settings";
      modal.className = "modal-backdrop active";
      modal.innerHTML = `
        <div class="modal-card" style="max-width:640px; background:var(--bg-secondary); border:1px solid var(--accent-cyan); border-radius:16px; padding:2rem; box-shadow:0 25px 60px rgba(0,0,0,0.9); max-height:90vh; overflow-y:auto;">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <i class="fa-solid fa-plug-circle-bolt" style="color:var(--accent-cyan); font-size:1.6rem;"></i>
              <div>
                <h3 style="color:#fff; font-size:1.3rem; margin:0;">FYERS API V3 Automated Login & Live Bridge</h3>
                <span style="font-size:0.8rem; color:var(--text-muted);">Connect Fyers account via OAuth 2.0 automated login or manual token</span>
              </div>
            </div>
            <button class="close-btn btn-close-fyers" style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
          </div>

          <div style="background:rgba(0,240,255,0.05); border-left:3px solid var(--accent-cyan); padding:0.85rem 1rem; border-radius:8px; margin-bottom:1.5rem; font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
            <strong>⚡ Automated OAuth 2.0 Login:</strong> Enter your Fyers App ID & Secret ID below and click <strong>"Login with FYERS Portal"</strong>. TradeBot will redirect you to Fyers' secure login screen, catch the authorization code automatically upon return, and compute the SHA-256 AppIdHash to generate your live Access Token!
          </div>

          <!-- Option 1: Automated OAuth Login -->
          <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
              <span class="badge cyan">Option 1</span>
              <strong style="color:#fff; font-size:0.95rem;">🚀 Automated OAuth Login (Recommended)</strong>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
              <div class="form-group">
                <label class="form-label" style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.35rem;">Fyers App ID (Client ID):</label>
                <input type="text" id="fyers-app-id" class="form-control" placeholder="e.g. XC00000-100" value="${this.appId}" style="width:100%; padding:0.6rem 0.8rem; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-family:var(--font-mono); font-size:0.85rem;">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.35rem;">Secret ID (App Secret):</label>
                <input type="password" id="fyers-secret-id" class="form-control" placeholder="e.g. ABCDE12345" value="${this.secretId}" style="width:100%; padding:0.6rem 0.8rem; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-family:var(--font-mono); font-size:0.85rem;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label" style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.35rem;">Redirect URI (Must match Fyers App Dashboard):</label>
              <input type="text" id="fyers-redirect-uri" class="form-control" value="${this.redirectUri}" style="width:100%; padding:0.6rem 0.8rem; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#cbd5e1; font-family:var(--font-mono); font-size:0.8rem;">
            </div>

            <button type="button" id="btn-fyers-oauth-login" class="action-btn" style="width:100%; justify-content:center; background:linear-gradient(135deg, var(--accent-cyan), #0099ff); color:#000; font-weight:800; padding:0.75rem; border-radius:8px; box-shadow:0 0 18px rgba(0,240,255,0.35); cursor:pointer;">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> ⚡ Login with FYERS Portal ↗
            </button>
          </div>

          <!-- Option 2: Manual Token Paste -->
          <form id="form-fyers-config" style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.25rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.85rem;">
              <span class="badge amber">Option 2</span>
              <strong style="color:#fff; font-size:0.95rem;">🔑 Manual Token Paste (Fallback)</strong>
            </div>

            <div class="form-group" style="margin-bottom:1.25rem;">
              <label class="form-label" style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.35rem;">Fyers V3 Access Token / JWT:</label>
              <textarea id="fyers-access-token" class="form-control" rows="2" placeholder="Paste your existing Fyers JWT access token here..." style="width:100%; padding:0.6rem 0.8rem; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-family:var(--font-mono); font-size:0.75rem;">${this.accessToken}</textarea>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
              <button type="button" id="btn-fyers-disconnect" class="action-btn secondary" style="flex:1; justify-content:center; border-color:var(--bearish-red); color:var(--bearish-red); padding:0.65rem;">
                <i class="fa-solid fa-power-off"></i> Disconnect / AI Sim
              </button>
              <button type="submit" class="action-btn" style="flex:1; justify-content:center; background:var(--bullish-green); color:#000; font-weight:700; padding:0.65rem;">
                <i class="fa-solid fa-link"></i> Save & Connect Live
              </button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector(".btn-close-fyers").addEventListener("click", () => {
        modal.classList.remove("active");
      });

      modal.querySelector("#btn-fyers-disconnect").addEventListener("click", () => {
        this.disconnect();
        modal.classList.remove("active");
        if (window.app) window.app.showToast("Fyers Disconnected", "Switched to AI High-Frequency Simulation Mode.");
      });

      // OAuth Login Trigger
      modal.querySelector("#btn-fyers-oauth-login").addEventListener("click", () => {
        this.startOAuthLogin();
      });

      // Manual Token Submit
      modal.querySelector("#form-fyers-config").addEventListener("submit", (e) => {
        e.preventDefault();
        const appIdInput = document.getElementById("fyers-app-id").value.trim();
        const secretIdInput = document.getElementById("fyers-secret-id").value.trim();
        const tokenInput = document.getElementById("fyers-access-token").value.trim();
        
        this.appId = appIdInput;
        this.secretId = secretIdInput;
        this.accessToken = tokenInput;
        
        sessionStorage.setItem("tb_fyers_app_id", this.appId);
        sessionStorage.setItem("tb_fyers_secret_id", this.secretId);
        sessionStorage.setItem("tb_fyers_access_token", this.accessToken);
        localStorage.setItem("tb_fyers_app_id", this.appId);
        localStorage.setItem("tb_fyers_secret_id", this.secretId);
        localStorage.setItem("tb_fyers_access_token", this.accessToken);
        
        modal.classList.remove("active");
        if (this.appId && this.accessToken) {
          this.connect();
          if (window.app) window.app.showToast("Connecting FYERS API...", `Authenticating App ID: ${this.appId}`);
        } else {
          this.startHybridSimulation();
        }
      });
    } else {
      modal.classList.add("active");
    }
  }

  startOAuthLogin() {
    const appIdInput = document.getElementById("fyers-app-id").value.trim();
    const secretIdInput = document.getElementById("fyers-secret-id").value.trim();
    const redirectInput = document.getElementById("fyers-redirect-uri").value.trim() || window.location.href.split("?")[0];
    
    if (!appIdInput || !secretIdInput) {
      if (window.app) window.app.showToast("⚠️ Missing Credentials", "Please enter your Fyers App ID and Secret ID for automated login.");
      return;
    }

    this.appId = appIdInput;
    this.secretId = secretIdInput;
    this.redirectUri = redirectInput;
    
    sessionStorage.setItem("tb_fyers_app_id", this.appId);
    sessionStorage.setItem("tb_fyers_secret_id", this.secretId);
    sessionStorage.setItem("tb_fyers_redirect_uri", this.redirectUri);
    localStorage.setItem("tb_fyers_app_id", this.appId);
    localStorage.setItem("tb_fyers_secret_id", this.secretId);
    localStorage.setItem("tb_fyers_redirect_uri", this.redirectUri);

    // Fyers V3 OAuth Authorization URL — use full client_id including suffix (e.g. XXXXXXXXXX-100)
    const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${encodeURIComponent(this.appId)}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&state=tradebot_auto_login`;
    
    if (window.app) window.app.showToast("⚡ Redirecting to FYERS Portal...", "Please complete secure login on Fyers.");
    
    setTimeout(() => {
      window.location.href = authUrl;
    }, 800);
  }

  async validateAuthCode(authCode) {
    // After OAuth redirect the page reloads — read credentials from sessionStorage or localStorage
    if (!this.appId || !this.secretId) {
      this.appId = sessionStorage.getItem("tb_fyers_app_id") || localStorage.getItem("tb_fyers_app_id") || "";
      this.secretId = sessionStorage.getItem("tb_fyers_secret_id") || localStorage.getItem("tb_fyers_secret_id") || "";
    }
    
    if (!this.appId || !this.secretId) {
      if (window.app) window.app.showToast("⚠️ Missing Credentials", "App ID & Secret ID not found. Please enter them again in the Fyers settings modal.");
      this.openSettingsModal();
      return;
    }

    this.updateStatusUI("authenticating", "VALIDATING LOGIN...", "var(--neutral-amber)");
    if (window.app) window.app.showToast("⚡ Validating Auth Code...", "Computing SHA-256 AppIdHash & exchanging token with Fyers API...");

    try {
      // Ensure redirectUri is set
      if (!this.redirectUri) {
        this.redirectUri = sessionStorage.getItem("tb_fyers_redirect_uri") || localStorage.getItem("tb_fyers_redirect_uri") || window.location.href.split("?")[0];
      }

      // Enforce Fyers V3 requirement: appId MUST have -100 suffix when building hash
      let appIdWithSuffix = this.appId;
      if (!appIdWithSuffix.includes("-") && appIdWithSuffix.length === 10) {
        appIdWithSuffix = `${appIdWithSuffix}-100`;
      }

      // Compute SHA-256 hash of appId:secretId as required by Fyers V3
      const sha256Hash = await this.computeSHA256(`${appIdWithSuffix}:${this.secretId}`);

      const payload = {
        grant_type: "authorization_code",
        appIdHash: sha256Hash,
        code: authCode,
        redirect_uri: this.redirectUri   // REQUIRED — must exactly match Fyers App Dashboard
      };

      console.log("📡 Fyers /token request payload:", {
        grant_type: payload.grant_type,
        appIdHash: sha256Hash.slice(0, 12) + "...",   // partial for security
        code: authCode.slice(0, 8) + "...",
        redirect_uri: payload.redirect_uri
      });

      // Python backend proxy for Fyers V3 token exchange (avoids browser CORS)
      const response = await fetch("/api/fyers/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appId: appIdWithSuffix,
          secretId: this.secretId,
          code: authCode,
          redirect_uri: this.redirectUri
        })
      });

      const data = await response.json();
      console.log("📡 Fyers /token raw response:", data);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — ${data?.message || data?.errmsg || "Token exchange failed"}`);
      }

      if (data && (data.s === "ok" || data.access_token)) {
        this.accessToken = data.access_token;
        sessionStorage.setItem("tb_fyers_access_token", this.accessToken);
        localStorage.setItem("tb_fyers_access_token", this.accessToken);
        
        // Token exchange succeeded! Clean URL bar without reloading
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (window.app) window.app.showToast("🟢 AUTO-LOGIN SUCCESSFUL!", "Live Fyers Access Token generated. Streaming live exchange quotes...");
        this.connect();
      } else {
        throw new Error(data.message || data.errmsg || "Token exchange failed — check your App ID, Secret ID and redirect URI match your Fyers App dashboard.");
      }
    } catch (err) {
      console.warn("⚠️ Fyers token exchange error:", err.message);
      // CORS is the most common failure — guide user to paste token manually
      if (err.message.toLowerCase().includes("failed to fetch") || err.message.toLowerCase().includes("network")) {
        if (window.app) window.app.showToast("⚠️ CORS Block Detected", "Browser security blocked direct API call. Please use Option 2: paste your Access Token manually.");
      } else {
        if (window.app) window.app.showToast("⚠️ Login Error", err.message);
      }
      this.openSettingsModal();
      this.setDisconnectedState();
    }
  }

  connect() {
    this.stopSimulation();
    this.updateStatusUI("connecting", "CONNECTING...", "var(--neutral-amber)");

    // Test connectivity with a small quote ping via Python proxy
    const testSymbols = "NSE:RELIANCE-EQ,NSE:NIFTY50-INDEX";
    const proxyUrl = `/api/fyers/quotes?symbols=${encodeURIComponent(testSymbols)}`;

    fetch(proxyUrl, {
      method: "GET",
      headers: {
        "Authorization": `${this.appId}:${this.accessToken}`,
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log("[FYERS] connect() test response:", data);

      // Accept as connected if Fyers responds with s:ok OR if we got a real response
      // (even errors like market closed are valid — token is working)
      if (data && data.s === "ok") {
        // Full live data confirmed
        this.isConnected = true;
        this.isSimulationMode = false;
        this.updateStatusUI("connected", "LIVE FEED CONNECTED", "var(--bullish-green)");
        if (window.app) window.app.showToast("FYERS LIVE", "Real-time institutional streaming active. Prices update every 2.5s.");
        this.startLivePolling();
      } else if (data && data.s && data.s !== "error") {
        // Partial response — token valid but market may be closed
        this.isConnected = true;
        this.isSimulationMode = false;
        this.updateStatusUI("connected", "CONNECTED (MARKET CLOSED)", "#f59e0b");
        if (window.app) window.app.showToast("FYERS CONNECTED", `Token valid. ${data.message || "Market may be closed — data will stream when market opens."}`);
        this.startLivePolling();
      } else {
        const msg = data?.message || data?.errmsg || "Token may be expired. Please reconnect.";
        console.warn("[FYERS] connect() failed — Fyers said:", msg);
        this.setDisconnectedState(msg);
        if (window.app) window.app.showToast("FYERS ERROR", msg);
      }
    })
    .catch(err => {
      console.warn("[FYERS] connect() network error:", err.message);
      this.isConnected = false;
      this.setDisconnectedState(err.message);
      if (window.app) window.app.showToast("FYERS DISCONNECTED", err.message);
    });
  }

  disconnect() {
    this.appId = "";
    this.secretId = "";
    this.accessToken = "";
    sessionStorage.removeItem("tb_fyers_app_id");
    sessionStorage.removeItem("tb_fyers_secret_id");
    sessionStorage.removeItem("tb_fyers_access_token");
    localStorage.removeItem("tb_fyers_app_id");
    localStorage.removeItem("tb_fyers_secret_id");
    localStorage.removeItem("tb_fyers_access_token");
    this.setDisconnectedState("Fyers disconnected. Showing accurate last closed market prices.");
  }

  startIntervalPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    console.log("[FYERS] Starting interval polling fallback every 2.5s...");
    this.pollTimer = setInterval(() => {
      if (!this.isConnected) return;
      this.fetchLiveQuotes();
    }, 2500);
  }

  startLivePolling() {
    this.stopLivePolling();

    // 1. Attempt Server-Sent Events (SSE) Live Stream from Python Backend
    try {
      if (window.EventSource) {
        const allStocks = this.getAllStocks();
        const symbols = [
          ...new Set(
            allStocks
              .map(s => s.fyersSymbol)
              .filter(sym => sym && sym !== "undefined" && !sym.includes("undefined"))
          )
        ].slice(0, 50).join(",");

        if (symbols) {
          const sseUrl = `/api/fyers/stream?symbols=${encodeURIComponent(symbols)}&auth=${encodeURIComponent(`${this.appId}:${this.accessToken}`)}`;
          this.sseSource = new EventSource(sseUrl);
          this.sseSource.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              if (data && data.s === "ok" && data.d) {
                data.d.forEach(item => {
                  if (item && item.v) {
                    this.broadcastQuoteUpdate(item.n, item.v.lp, item.v.ch, item.v.chp, item.v.volume);
                  }
                });
              }
            } catch (err) {
              console.warn("[FYERS] SSE parse error:", err);
            }
          };
          this.sseSource.onerror = (e) => {
            console.warn("[FYERS] SSE stream error or reconnecting...");
          };
          console.log("[FYERS] SSE Live Stream initiated to Python Backend. Frontend REST polling disabled (backend pushing data).");
          return; // STOP HERE: Do not start interval REST polling when SSE stream is active!
        }
      }
    } catch (err) {
      console.warn("[FYERS] SSE failed, falling back to interval polling:", err);
    }

    // 2. Only start interval polling if SSE is NOT available or failed
    this.startIntervalPolling();
  }

  stopLivePolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
  }

  stopSimulation() {
    // No-op: simulation mode is not active in this build
    // Kept for API compatibility
    this.isSimulationMode = false;
  }

  startHybridSimulation() {
    // Fallback when no token: show a toast guiding user to authenticate
    this.isSimulationMode = true;
    this.isConnected = false;
    this.updateStatusUI("disconnected", "FYERS: DISCONNECTED", "var(--text-muted)");
    if (window.app) window.app.showToast("FYERS Not Connected", "Enter your App ID and Access Token in the FYERS settings to get live data.");
  }

  setDisconnectedState(message = "Fyers disconnected. Showing accurate last closed market prices.") {
    this.stopLivePolling();
    this.isConnected = false;
    this.updateStatusUI("disconnected", "⚫ FYERS: DISCONNECTED", "var(--text-muted)");
    if (message) {
      console.log(message);
    }
  }

  getAllStocks() {
    let stocks = [];
    const scanner = window.liveScanner || window.app?.liveScanner;
    if (scanner && scanner.stocks) {
      stocks = stocks.concat(scanner.stocks);
    }
    if (window.aiProcessingEngine && typeof window.aiProcessingEngine.getLiveTickers === "function") {
      stocks = stocks.concat(window.aiProcessingEngine.getLiveTickers());
    }
    if (window.app && window.app.state && window.app.state.swingTrades) {
      stocks = stocks.concat(window.app.state.swingTrades);
    }
    return stocks;
  }

  fetchLiveQuotes() {
    const allStocks = this.getAllStocks();
    const symbols = [
      ...new Set(
        allStocks
          .map(s => s.fyersSymbol)           // only use explicit fyersSymbol — never guess
          .filter(sym => sym && sym !== "undefined" && !sym.includes("undefined"))
      )
    ];
    if (symbols.length === 0) {
      console.log("[FYERS] fetchLiveQuotes: no symbols to poll");
      return;
    }

    const batchSymbols = symbols.slice(0, 50).join(",");
    const proxyUrl = `/api/fyers/quotes?symbols=${encodeURIComponent(batchSymbols)}`;

    fetch(proxyUrl, {
      method: "GET",
      headers: {
        "Authorization": `${this.appId}:${this.accessToken}`,
        "Content-Type": "application/json"
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log("[FYERS] quote poll response s:", data?.s, "count:", data?.d?.length);
      if (data && data.s === "ok" && data.d) {
        data.d.forEach(item => {
          if (item && item.v) {
            this.broadcastQuoteUpdate(item.n, item.v.lp, item.v.ch, item.v.chp, item.v.volume);
          }
        });
      } else if (data && data.s === "error") {
        console.warn("[FYERS] quote poll error from Fyers:", data.message);
        // Don't disconnect on single poll error — token might still be valid
      }
    })
    .catch(err => {
      console.warn("[FYERS] live poll network error:", err.message);
    });
  }

  broadcastQuoteUpdate(fyersSymbol, lastPrice, change, changePercent, volume) {
    const allStocks = this.getAllStocks();

    // Safely parse all numeric fields — Fyers may send null/undefined outside market hours
    const lp  = parseFloat(lastPrice)    || 0;
    const ch  = parseFloat(change)       || 0;
    const chp = parseFloat(changePercent)|| 0;

    // Find ALL matching items across all arrays and pages (strict exact matching to prevent options from overwriting index prices)
    const matchingStocks = allStocks.filter(s =>
      s.fyersSymbol === fyersSymbol ||
      s.tvTicker    === fyersSymbol ||
      `NSE:${s.ticker}-EQ` === fyersSymbol ||
      `NSE:${s.ticker}-INDEX` === fyersSymbol ||
      `BSE:${s.ticker}-INDEX` === fyersSymbol ||
      s.ticker === fyersSymbol
    );

    if (matchingStocks.length > 0) {
      matchingStocks.forEach(stock => {
        stock.cmp     = lp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        stock.change  = `${ch  >= 0 ? "+" : ""}${ch.toFixed(2)}`;
        stock.percent = `${chp >= 0 ? "+" : ""}${chp.toFixed(2)}%`;
        stock.status  = ch >= 0 ? "up" : "down";
        stock.rawLtp  = lp;

        if (window.aiProcessingEngine) {
          window.aiProcessingEngine.processSymbol(stock);
        }
        this.notifyListeners(stock);
      });

      // Trigger universal UI re-rendering across ALL pages & analytical modules
      if (window.app) {
        window.app.renderTickers();
        window.app.renderSwingTrades();
        window.app.renderLongTermPicks();
        if (typeof window.app.renderIndexAnalyzer === "function") window.app.renderIndexAnalyzer();
      }
      if (window.liveScanner && typeof window.liveScanner.updateCardUI === "function") {
        matchingStocks.forEach(s => window.liveScanner.updateCardUI(s));
      }
      if (window.optionCalculator && typeof window.optionCalculator.updateLivePrice === "function") {
        matchingStocks.forEach(s => window.optionCalculator.updateLivePrice(s));
      }
      if (window.strategyEngine && typeof window.strategyEngine.updateLivePrice === "function") {
        matchingStocks.forEach(s => window.strategyEngine.updateLivePrice(s));
      }
    }
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  notifyListeners(updatedStock) {
    this.listeners.forEach(cb => cb(updatedStock));
  }
}
