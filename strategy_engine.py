"""
TradeBot Strategy Generator Engine (Python Backend)
===================================================
Implements Mr. Vishnu R Gupthan's Open Type & Day Type institutional rules in Python.
Evaluates morning session parameters (Open Type, Day Type, IB Width, CMP, Bias)
to generate actionable afternoon/next-day trade setups.

Author: TradeBot Market Profile Team
"""

from typing import Dict, Any, Optional

class StrategyGeneratorEngine:
    """
    Python backend rule engine for Market Profile & Order Flow trade setups.
    """

    @classmethod
    def generate_setup(
        cls,
        index_name: str = "NIFTY 50",
        open_type: str = "OTD",
        day_type: str = "NVD",
        ib_width: str = "narrow",
        bias: str = "bullish",
        cmp: Optional[float] = None,
        ib_range: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate session parameters and generate structured trade setup JSON.
        """
        if cmp is None or ib_range is None or cmp <= 0 or ib_range <= 0:
            return {
                "status": "awaiting_inputs",
                "message": "Awaiting live exchange price (CMP) and Initial Balance (IB) range."
            }

        strategy = {
            "status": "success",
            "index": index_name,
            "open_type": open_type,
            "day_type": day_type,
            "ib_width": ib_width,
            "bias": bias,
            "cmp": cmp,
            "ib_range": ib_range,
            "title": "",
            "bias_badge": "",
            "bias_text": "",
            "trigger": "",
            "target1": 0.0,
            "target2": 0.0,
            "sl": 0.0,
            "rr_ratio": "",
            "rule_note": ""
        }

        # Rule Engine Logic
        if open_type == "OD":
            # Open Drive
            strategy["title"] = f"{index_name} Open Drive (OD) Trend Strategy"
            strategy["bias_badge"] = "bullish" if bias == "bullish" else "bearish"
            strategy["bias_text"] = "Strong Bullish Trend Conviction" if bias == "bullish" else "Strong Bearish Trend Conviction"
            
            if bias == "bullish":
                strategy["trigger"] = f"Sit tight and ride momentum! Enter on minor pullbacks towards {round(cmp - ib_range * 0.2)} (A-period mid-point) with positive Delta."
                strategy["target1"] = round(cmp + ib_range * 1.5, 2)
                strategy["target2"] = round(cmp + ib_range * 2.2, 2)
                strategy["sl"] = round(cmp - ib_range * 0.5, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Drive): Immediate aggressive directional movement from opening bell with NO retracement. Never initiate counter-trend trades against an OD. High volume & institutional initiation confirmed."
            else:
                strategy["trigger"] = f"Aggressive shorting! Enter on pullbacks towards {round(cmp + ib_range * 0.2)} with negative Order Flow Delta."
                strategy["target1"] = round(cmp - ib_range * 1.5, 2)
                strategy["target2"] = round(cmp - ib_range * 2.2, 2)
                strategy["sl"] = round(cmp + ib_range * 0.5, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Drive): One-sided aggressive selling. Watch for single print gaps acting as strong resistance ceilings."
        
        elif open_type == "OTD":
            # Open Test Drive
            strategy["title"] = f"{index_name} Open Test Drive (OTD) Breakout Strategy"
            strategy["bias_badge"] = "bullish" if bias == "bullish" else "bearish"
            strategy["bias_text"] = "Bullish Breakout after VAL/POC Test" if bias == "bullish" else "Bearish Breakdown after VAH Test"

            if bias == "bullish":
                strategy["trigger"] = f"Enter long on breakout of Initial Balance High ({round(cmp + ib_range * 0.4)}) after successful test of lower support."
                strategy["target1"] = round(cmp + ib_range * 1.2, 2)
                strategy["target2"] = round(cmp + ib_range * 1.8, 2)
                strategy["sl"] = round(cmp - ib_range * 0.4, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Test Drive): Initial small test toward reference point (VAL/POC), rejects, then drives aggressively in opposite direction. Enter on breakout of opening range after successful test."
            else:
                strategy["trigger"] = f"Enter short on breakdown of IB Low ({round(cmp - ib_range * 0.4)}) after rejection at VAH resistance."
                strategy["target1"] = round(cmp - ib_range * 1.2, 2)
                strategy["target2"] = round(cmp - ib_range * 1.8, 2)
                strategy["sl"] = round(cmp + ib_range * 0.4, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Test Drive): Sellers absorb morning push and drive price lower. Watch for cumulative delta divergence."
        
        elif open_type == "ORR":
            # Open Rejection Reverse
            strategy["title"] = f"{index_name} Open Rejection Reverse (ORR) Strategy"
            strategy["bias_badge"] = "purple"
            strategy["bias_text"] = "Structural Reversal / Double Distribution Watch"

            if bias == "bullish":
                strategy["trigger"] = f"Watch B-period reversal! Enter long when price crosses back above opening print ({cmp}) with surging volume."
                strategy["target1"] = round(cmp + ib_range * 1.3, 2)
                strategy["target2"] = round(cmp + ib_range * 2.0, 2)
                strategy["sl"] = round(cmp - ib_range * 0.6, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Rejection Reverse): Opens, pushes in one direction, meets strong rejection at key level, and reverses beyond opening price. B-period reversal is key!"
            else:
                strategy["trigger"] = f"Short on B-period failure below opening print ({cmp}). Look for option writers adding short straddles in H period."
                strategy["target1"] = round(cmp - ib_range * 1.3, 2)
                strategy["target2"] = round(cmp - ib_range * 2.0, 2)
                strategy["sl"] = round(cmp + ib_range * 0.6, 2)
                strategy["rule_note"] = "Module 04 Rule (Open Rejection Reverse): Strong rejection at upper value area. Expect rapid liquidation down to opposite side of profile."
        
        else:
            # Open Auction
            strategy["title"] = f"{index_name} Open Auction (OA) Mean Reversion"
            strategy["bias_badge"] = "neutral"
            strategy["bias_text"] = "Sideways / Balanced Day Range Trading"
            
            strategy["trigger"] = f"Fade range extremes! Buy near VAL ({round(cmp - ib_range * 0.5)}) or Sell near VAH ({round(cmp + ib_range * 0.5)})."
            strategy["target1"] = round(cmp, 2)
            strategy["target2"] = round(cmp + ib_range * 0.4 if bias == "bullish" else cmp - ib_range * 0.4, 2)
            strategy["sl"] = round(cmp - ib_range * 0.8 if bias == "bullish" else cmp + ib_range * 0.8, 2)
            strategy["rule_note"] = "Module 04 Rule (Open Auction): Rotates back and forth inside or outside previous range without clear directional conviction. Scalping strategy (10-20 points). Expect mean reversion to daily POC!"

        # Adjust for IB width
        if ib_width == "wide" and open_type != "OD":
            strategy["rule_note"] += "\n\n[WIDE IB ALERT]: Since Initial Balance is wide (~85% of day's range), odds strongly favor a Normal Day (Balance). Do not chase breakouts; trade mean reversion!"
        elif ib_width == "narrow":
            strategy["rule_note"] += "\n\n[NARROW IB ALERT]: Narrow initial balance (<150 pts) favors a Normal Variation Day (NVD) or Trend Day extension of 1.5x to 2x!"

        # Calculate RR Ratio
        risk = abs(cmp - strategy["sl"])
        reward = abs(strategy["target1"] - cmp)
        rr_val = round(reward / (risk if risk > 0 else 1.0), 1)
        strategy["rr_ratio"] = f"1 : {rr_val}"

        return strategy
