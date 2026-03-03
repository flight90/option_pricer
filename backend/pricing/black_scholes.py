import math
from scipy.stats import norm
from typing import Dict, Optional, Literal

# ==========================================
# Return Type Mapping
# ==========================================

# Predefined mapping: ticker -> return type
# Anything not listed defaults to "TotalReturn"
RETURN_TYPE_MAP = {
    "SPX": "ExcessReturn",
    "NDX": "ExcessReturn",
    "RTY": "ExcessReturn",
    "INDU": "ExcessReturn",
    "UKX": "ExcessReturn",
    "SX5E": "ExcessReturn",
    "NKY": "ExcessReturn",
    "HSI": "ExcessReturn",
}

def get_return_type(ticker: str) -> str:
    """Returns 'ExcessReturn' or 'TotalReturn' for a given ticker."""
    return RETURN_TYPE_MAP.get(ticker.upper(), "TotalReturn")

# ==========================================
# Generalized Black-Scholes (Cost-of-Carry)
# ==========================================

def d1(S: float, K: float, T: float, r: float, b: float, sigma: float) -> float:
    """d1 in the generalized BS model. b = cost-of-carry."""
    return (math.log(S / K) + (b + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))

def d2(S: float, K: float, T: float, r: float, b: float, sigma: float) -> float:
    return d1(S, K, T, r, b, sigma) - sigma * math.sqrt(T)

def black_scholes_price(
    option_type: Literal["call", "put"], 
    S: float, 
    K: float, 
    T: float, 
    r: float, 
    b: float,
    sigma: float
) -> float:
    """
    Generalized Black-Scholes price for a European option.
    S:     Spot Price
    K:     Strike Price
    T:     Time to maturity (in years)
    r:     Risk-free rate (annualized, continuous)
    b:     Cost-of-carry (drift term)
           - TotalReturn:  b = r - div - borrow
           - ExcessReturn: b = -div - borrow
    sigma: Volatility (annualized)
    """
    if T <= 0:
        if option_type == "call":
            return max(0.0, S - K)
        else:
            return max(0.0, K - S)

    d_1 = d1(S, K, T, r, b, sigma)
    d_2 = d2(S, K, T, r, b, sigma)
    
    if option_type == "call":
        price = S * math.exp((b - r) * T) * norm.cdf(d_1) - K * math.exp(-r * T) * norm.cdf(d_2)
    elif option_type == "put":
        price = K * math.exp(-r * T) * norm.cdf(-d_2) - S * math.exp((b - r) * T) * norm.cdf(-d_1)
    else:
        raise ValueError("option_type must be 'call' or 'put'")
    
    return price

def black_scholes_delta(
    option_type: Literal["call", "put"],
    S: float, K: float, T: float, r: float, b: float, sigma: float
) -> float:
    """
    Generalized BS delta.
    Call: e^((b-r)T) * N(d1)
    Put:  e^((b-r)T) * (N(d1) - 1)
    """
    if T <= 0:
        if option_type == "call":
            return 1.0 if S > K else 0.0
        else:
            return -1.0 if S < K else 0.0

    d_1 = d1(S, K, T, r, b, sigma)
    carry = math.exp((b - r) * T)

    if option_type == "call":
        return carry * norm.cdf(d_1)
    else:
        return carry * (norm.cdf(d_1) - 1.0)

# ==========================================
# Market Data Interface
# ==========================================

def get_market_data(ticker: str) -> Dict[str, float]:
    """
    Returns default market data for a given ticker.
    Includes: S (Spot), r (Risk-free rate), sigma (Volatility),
              div (Dividend rate), borrow (Borrow rate)
    """
    mock_data = {
        "AAPL":  {"S": 150.0, "r": 0.05, "sigma": 0.20, "div": 0.006, "borrow": 0.002},
        "TSLA":  {"S": 200.0, "r": 0.05, "sigma": 0.50, "div": 0.0,   "borrow": 0.01},
        "MSFT":  {"S": 420.0, "r": 0.05, "sigma": 0.22, "div": 0.008, "borrow": 0.001},
        "NVDA":  {"S": 880.0, "r": 0.05, "sigma": 0.45, "div": 0.0004,"borrow": 0.005},
        "AMZN":  {"S": 178.0, "r": 0.05, "sigma": 0.30, "div": 0.0,   "borrow": 0.002},
        "SPY":   {"S": 500.0, "r": 0.05, "sigma": 0.15, "div": 0.013, "borrow": 0.001},
        "SPX":   {"S": 5000.0,"r": 0.05, "sigma": 0.15, "div": 0.013, "borrow": 0.0},
        "NDX":   {"S": 18000.0,"r":0.05, "sigma": 0.20, "div": 0.007, "borrow": 0.0},
    }
    
    return mock_data.get(ticker.upper(), {"S": 100.0, "r": 0.05, "sigma": 0.30, "div": 0.02, "borrow": 0.005})

def get_ticker_defaults(ticker: str) -> Dict:
    """
    Returns the full set of defaults for a ticker, including return type.
    Used by the /api/defaults endpoint to populate the frontend.
    """
    market = get_market_data(ticker)
    return_type = get_return_type(ticker)
    return {
        "ticker": ticker.upper(),
        "spot": market["S"],
        "rate": market["r"],
        "vol": market["sigma"],
        "div": market["div"],
        "borrow": market["borrow"],
        "return_type": return_type
    }

def compute_cost_of_carry(r: float, div: float, borrow: float, return_type: str) -> float:
    """
    Compute cost-of-carry b based on return type.
    TotalReturn:  b = r - div - borrow
    ExcessReturn: b = -div - borrow
    """
    if return_type == "ExcessReturn":
        return -div - borrow
    else:  # TotalReturn (default)
        return r - div - borrow

def price_option_with_defaults(
    ticker: str,
    option_type: Literal["call", "put"],
    K: float,
    T: float,
    ad_hoc_overrides: Optional[Dict[str, float]] = None
) -> Dict:
    """
    Prices an option and returns both price and delta.
    Uses generalized Black-Scholes with cost-of-carry.
    """
    market_data = get_market_data(ticker)
    return_type = get_return_type(ticker)
    
    if ad_hoc_overrides:
        market_data.update(ad_hoc_overrides)
    
    S = market_data["S"]
    r = market_data["r"]
    sigma = market_data["sigma"]
    div = market_data["div"]
    borrow = market_data["borrow"]
    
    b = compute_cost_of_carry(r, div, borrow, return_type)
    
    price = black_scholes_price(
        option_type=option_type, S=S, K=K, T=T, r=r, b=b, sigma=sigma
    )
    delta = black_scholes_delta(
        option_type=option_type, S=S, K=K, T=T, r=r, b=b, sigma=sigma
    )
    
    return {"price": price, "delta": delta}
