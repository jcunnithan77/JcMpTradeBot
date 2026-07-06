"""
TradeBot Option Pricing & Target Estimator Engine
=================================================
A mathematically rigorous Black-76 & Black-Scholes option pricing module designed for Indian Index
Futures (NIFTY 50, BANK NIFTY, SENSEX, MIDCAP SELECT) and Stock Options.

Features:
- Implied Volatility (IV) calculation using Newton-Raphson with robust Bisection fallback.
- Option Greeks (Delta, Gamma, Theta, Vega, Rho) calculation.
- Target Option Price prediction when Underlying Future reaches a specified target level.
- Multi-level Sensitivity Matrix generation.
- Interactive CLI and importable Python API.

Author: TradeBot Market Profile Team
"""

import math
import sys
import io
import json
import argparse
from typing import Dict, List, Tuple, Optional, Union


class OptionPricingEngine:
    """
    Core Option Pricing & Analytics Engine supporting Black-76 (for Futures Options)
    and standard Black-Scholes (for Spot/Stock Options).
    """

    @staticmethod
    def norm_cdf(x: float) -> float:
        """Standard Normal Cumulative Distribution Function (CDF)."""
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

    @staticmethod
    def norm_pdf(x: float) -> float:
        """Standard Normal Probability Density Function (PDF)."""
        return (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * x * x)

    @classmethod
    def black76_price(cls, F: float, K: float, T_years: float, r: float, sigma: float, option_type: str = 'call') -> float:
        """
        Calculate option price using Black-76 model (standard for Index/Stock Futures).
        
        :param F: Current Future Price
        :param K: Strike Price
        :param T_years: Time to expiration in years (days / 365)
        :param r: Risk-free interest rate (annualized, e.g., 0.07 for 7%)
        :param sigma: Implied Volatility (annualized, e.g., 0.18 for 18%)
        :param option_type: 'call' or 'put'
        """
        if T_years <= 0 or sigma <= 0 or F <= 0 or K <= 0:
            return max(0.0, F - K) if option_type.lower() == 'call' else max(0.0, K - F)

        d1 = (math.log(F / K) + (0.5 * sigma * sigma) * T_years) / (sigma * math.sqrt(T_years))
        d2 = d1 - sigma * math.sqrt(T_years)

        discount = math.exp(-r * T_years)
        if option_type.lower() == 'call':
            price = discount * (F * cls.norm_cdf(d1) - K * cls.norm_cdf(d2))
        else:
            price = discount * (K * cls.norm_cdf(-d2) - F * cls.norm_cdf(-d1))
        return max(0.0, price)

    @classmethod
    def black76_greeks(cls, F: float, K: float, T_years: float, r: float, sigma: float, option_type: str = 'call') -> Dict[str, float]:
        """
        Calculate Option Greeks using Black-76 model.
        Returns Delta, Gamma, Theta (daily), Vega (per 1% IV), and Rho.
        """
        if T_years <= 0 or sigma <= 0 or F <= 0 or K <= 0:
            # Expired or degenerate option
            intrinsic_call = 1.0 if F > K else 0.0
            intrinsic_put = -1.0 if K > F else 0.0
            return {
                "delta": intrinsic_call if option_type.lower() == 'call' else intrinsic_put,
                "gamma": 0.0,
                "theta": 0.0,
                "vega": 0.0,
                "rho": 0.0
            }

        d1 = (math.log(F / K) + (0.5 * sigma * sigma) * T_years) / (sigma * math.sqrt(T_years))
        d2 = d1 - sigma * math.sqrt(T_years)
        discount = math.exp(-r * T_years)

        # Delta
        if option_type.lower() == 'call':
            delta = discount * cls.norm_cdf(d1)
        else:
            delta = discount * (cls.norm_cdf(d1) - 1.0)

        # Gamma (identical for Call and Put)
        gamma = (discount * cls.norm_pdf(d1)) / (F * sigma * math.sqrt(T_years))

        # Vega (per 1% change in volatility)
        vega_raw = F * discount * cls.norm_pdf(d1) * math.sqrt(T_years)
        vega = vega_raw / 100.0

        # Theta (daily decay in currency units)
        term1 = -(F * discount * cls.norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T_years))
        if option_type.lower() == 'call':
            term2 = r * discount * (F * cls.norm_cdf(d1) - K * cls.norm_cdf(d2))
            theta_annual = term1 + term2
        else:
            term2 = -r * discount * (K * cls.norm_cdf(-d2) - F * cls.norm_cdf(-d1))
            theta_annual = term1 + term2
        theta = theta_annual / 365.0

        # Rho (per 1% change in interest rate)
        if option_type.lower() == 'call':
            rho_raw = -T_years * discount * (F * cls.norm_cdf(d1) - K * cls.norm_cdf(d2))
        else:
            rho_raw = -T_years * discount * (K * cls.norm_cdf(-d2) - F * cls.norm_cdf(-d1))
        rho = rho_raw / 100.0

        return {
            "delta": round(delta, 4),
            "gamma": round(gamma, 6),
            "theta": round(theta, 2),
            "vega": round(vega, 2),
            "rho": round(rho, 2)
        }

    @classmethod
    def calculate_iv(cls, target_price: float, F: float, K: float, T_years: float, r: float = 0.07, option_type: str = 'call', max_iter: int = 100, tol: float = 1e-5) -> float:
        """
        Solve for Implied Volatility (IV) given market option price using Newton-Raphson
        with a robust Bisection search fallback.
        
        Returns annualized IV as a decimal (e.g., 0.185 for 18.5%).
        """
        if target_price <= 0 or T_years <= 0 or F <= 0 or K <= 0:
            return 0.001

        # Check intrinsic value lower bound
        intrinsic = max(0.0, F - K) if option_type.lower() == 'call' else max(0.0, K - F)
        discount = math.exp(-r * T_years)
        discounted_intrinsic = intrinsic * discount
        if target_price <= discounted_intrinsic:
            return 0.001

        # Newton-Raphson method
        sigma = 0.25  # Initial guess 25%
        for _ in range(max_iter):
            price = cls.black76_price(F, K, T_years, r, sigma, option_type)
            diff = price - target_price
            if abs(diff) < tol:
                return round(sigma, 4)
            
            greeks = cls.black76_greeks(F, K, T_years, r, sigma, option_type)
            vega_raw = greeks["vega"] * 100.0  # restore raw vega
            if vega_raw < 1e-8:
                break
            
            step = diff / vega_raw
            sigma -= step
            if sigma <= 0.001 or sigma >= 5.0:
                break

        # Bisection Fallback (Guaranteed convergence within [0.001, 5.0])
        low, high = 0.001, 5.0
        for _ in range(80):
            mid = (low + high) / 2.0
            price_mid = cls.black76_price(F, K, T_years, r, mid, option_type)
            if abs(price_mid - target_price) < tol:
                return round(mid, 4)
            if price_mid < target_price:
                low = mid
            else:
                high = mid
        return round((low + high) / 2.0, 4)

    @classmethod
    def estimate_target_option(
        cls,
        current_future: float,
        current_option_price: float,
        target_future: float,
        strike: Optional[float] = None,
        days_to_expiry: float = 5.0,
        option_type: str = 'call',
        rate: float = 0.07,
        lot_size: int = 25
    ) -> Dict:
        """
        Main high-level API: Calculates Implied Volatility from current levels,
        predicts option price when future reaches target level, and calculates Greeks & sensitivity.
        """
        if strike is None or strike <= 0:
            # Default to nearest ATM strike (rounding to nearest 50)
            strike = round(current_future / 50.0) * 50.0

        T_years = max(0.001, days_to_expiry / 365.0)

        # 1. Calculate Implied Volatility from current option price
        iv = cls.calculate_iv(current_option_price, current_future, strike, T_years, rate, option_type)

        # 2. Calculate Current Greeks
        current_greeks = cls.black76_greeks(current_future, strike, T_years, rate, iv, option_type)

        # 3. Predict Target Option Price when Future reaches target_future
        target_option_price = cls.black76_price(target_future, strike, T_years, rate, iv, option_type)
        target_option_price = round(target_option_price, 2)

        # 4. Calculate Target Greeks at new future level
        target_greeks = cls.black76_greeks(target_future, strike, T_years, rate, iv, option_type)

        # 5. P&L and ROI
        price_change = round(target_option_price - current_option_price, 2)
        roi_percent = round((price_change / current_option_price) * 100.0, 2) if current_option_price > 0 else 0.0
        lot_pnl = round(price_change * lot_size, 2)

        # 6. Generate Sensitivity Matrix around Target Level
        step_size = max(10.0, round(abs(target_future - current_future) / 4.0, -1))
        if step_size == 0:
            step_size = 25.0

        sensitivity_matrix = []
        offsets = [-3 * step_size, -2 * step_size, -step_size, 0.0, step_size, 2 * step_size, 3 * step_size]
        for offset in offsets:
            sim_future = round(target_future + offset, 2)
            sim_price = round(cls.black76_price(sim_future, strike, T_years, rate, iv, option_type), 2)
            sim_change = round(sim_price - current_option_price, 2)
            sim_roi = round((sim_change / current_option_price) * 100.0, 2) if current_option_price > 0 else 0.0
            sensitivity_matrix.append({
                "future_level": sim_future,
                "option_price": sim_price,
                "price_change": sim_change,
                "roi_percent": sim_roi,
                "is_target": (offset == 0.0)
            })

        return {
            "status": "success",
            "inputs": {
                "current_future": current_future,
                "current_option_price": current_option_price,
                "target_future": target_future,
                "strike": strike,
                "days_to_expiry": days_to_expiry,
                "option_type": option_type.upper(),
                "rate": rate,
                "lot_size": lot_size
            },
            "analytics": {
                "implied_volatility_percent": round(iv * 100.0, 2),
                "current_greeks": current_greeks,
                "target_option_price": target_option_price,
                "target_greeks": target_greeks,
                "price_change_rs": price_change,
                "roi_percent": roi_percent,
                "expected_lot_pnl_rs": lot_pnl
            },
            "sensitivity_matrix": sensitivity_matrix
        }

    @classmethod
    def print_report(cls, result: Dict):
        """Print a beautifully formatted CLI report of the option prediction."""
        inputs = result["inputs"]
        analytics = result["analytics"]

        print("\n" + "="*70)
        print("  TRADEBOT OPTION PRICE & TARGET ESTIMATOR REPORT")
        print("="*70)
        print(f"Option Type       : {inputs['option_type']} | Strike: {inputs['strike']} | Expiry: {inputs['days_to_expiry']} Days")
        print(f"Current Future    : INR {inputs['current_future']:,.2f} | Current Option Price: INR {inputs['current_option_price']:,.2f}")
        print(f"Implied Vol (IV)  : {analytics['implied_volatility_percent']}%")
        print("-" * 70)
        print(f"TARGET FUTURE     : INR {inputs['target_future']:,.2f}")
        print(f"PREDICTED OPTION  : INR {analytics['target_option_price']:,.2f}")
        print(f"EXPECTED CHANGE   : {analytics['price_change_rs']:+,.2f} ({analytics['roi_percent']:+.2f}%)")
        print(f"EXPECTED P&L      : INR {analytics['expected_lot_pnl_rs']:+,.2f} (Lot Size: {inputs['lot_size']})")
        print("-" * 70)
        print("GREEKS ANALYSIS:")
        cg = analytics["current_greeks"]
        tg = analytics["target_greeks"]
        print(f"  Delta           : Current {cg['delta']:+.4f}  -> Target {tg['delta']:+.4f}")
        print(f"  Gamma           : Current {cg['gamma']:.6f} -> Target {tg['gamma']:.6f}")
        print(f"  Theta           : Current INR {cg['theta']:.2f}/day -> Target INR {tg['theta']:.2f}/day")
        print(f"  Vega            : Current INR {cg['vega']:.2f}/1% IV -> Target INR {tg['vega']:.2f}/1% IV")
        print("-" * 70)
        print("SENSITIVITY MATRIX (Option Price across Future Levels):")
        print(f"  {'Future Level':<15} | {'Option Price':<15} | {'Change (INR)':<15} | {'ROI (%)':<10}")
        print("  " + "-"*60)
        for row in result["sensitivity_matrix"]:
            marker = "  [TARGET]" if row["is_target"] else ""
            print(f"  INR {row['future_level']:<11,.2f} | INR {row['option_price']:<11,.2f} | {row['price_change']:+14,.2f} | {row['roi_percent']:+8.2f}%{marker}")
        print("="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="TradeBot Option Price & Target Estimator")
    parser.add_argument("--future", "-f", type=float, help="Current Future Price (e.g. 24500)")
    parser.add_argument("--option", "-o", type=float, help="Current Option Price (e.g. 180)")
    parser.add_argument("--target", "-t", type=float, help="Target Future Level (e.g. 24650)")
    parser.add_argument("--strike", "-k", type=float, default=None, help="Strike Price (default: nearest ATM)")
    parser.add_argument("--days", "-d", type=float, default=5.0, help="Days to Expiry (default: 5.0)")
    parser.add_argument("--type", "-p", type=str, default="call", choices=["call", "put"], help="Option Type: call or put")
    parser.add_argument("--rate", "-r", type=float, default=0.07, help="Risk-free rate (default: 0.07)")
    parser.add_argument("--lot", "-l", type=int, default=25, help="Lot Size (default: 25 for Nifty)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON format")
    parser.add_argument("--demo", action="store_true", help="Run interactive demonstration")

    args = parser.parse_args()

    if args.demo or (args.future is None or args.option is None or args.target is None):
        print("\nRunning TradeBot Option Estimator Demonstration (NIFTY 50 ATM Call Option)")
        # Sample Nifty trade setup
        result = OptionPricingEngine.estimate_target_option(
            current_future=24500.0,
            current_option_price=185.50,
            target_future=24650.0,
            strike=24500.0,
            days_to_expiry=4.5,
            option_type='call',
            lot_size=25
        )
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            OptionPricingEngine.print_report(result)
        if not args.demo and (args.future is None or args.option is None or args.target is None):
            print("Tip: To run with your own values, use CLI arguments:")
            print("   python option_pricing_engine.py --future 24500 --option 180 --target 24650 --type call --strike 24500 --days 5")
            print("   or pass --json for API integration.\n")
        return

    result = OptionPricingEngine.estimate_target_option(
        current_future=args.future,
        current_option_price=args.option,
        target_future=args.target,
        strike=args.strike,
        days_to_expiry=args.days,
        option_type=args.type,
        rate=args.rate,
        lot_size=args.lot
    )

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        OptionPricingEngine.print_report(result)


if __name__ == "__main__":
    if hasattr(sys.stdout, 'buffer') and getattr(sys.stdout, 'encoding', '').lower() != 'utf-8':
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except Exception:
            pass
    main()
