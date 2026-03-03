from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
from pathlib import Path
from .pricing.black_scholes import price_option_with_defaults, get_ticker_defaults
from .parsers.file_parser import parse_pricing_requests
from .parsers.email_service import fetch_email_pricing_requests
from .booking.api_client import initialize_booking


app = FastAPI(title="Option Pricer API")

# Serve frontend static files
frontend_dir = Path(__file__).parent.parent / "frontend"
app.mount("/frontend", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

# Allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PricingRequest(BaseModel):
    ticker: str
    option_type: Literal["call", "put"]
    strike: float
    time_to_maturity: float # in years
    strike_type: Optional[Literal["AbsStrike", "RelativeStrike"]] = "AbsStrike"
    ref_spot: Optional[float] = None  # needed for RelativeStrike resolution
    # Optional ad-hoc parameters to override defaults
    spot_override: Optional[float] = None
    rate_override: Optional[float] = None
    vol_override: Optional[float] = None
    div_override: Optional[float] = None
    borrow_override: Optional[float] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to the Option Pricer API"}

@app.get("/api/defaults/{ticker}")
def get_defaults(ticker: str):
    """Returns default market data and return type for a ticker."""
    try:
        defaults = get_ticker_defaults(ticker)
        return defaults
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/price")
def get_price(req: PricingRequest):
    try:
        overrides = {}
        if req.spot_override is not None: overrides["S"] = req.spot_override
        if req.rate_override is not None: overrides["r"] = req.rate_override
        if req.vol_override is not None: overrides["sigma"] = req.vol_override
        if req.div_override is not None: overrides["div"] = req.div_override
        if req.borrow_override is not None: overrides["borrow"] = req.borrow_override
        
        # Resolve strike: if RelativeStrike, multiply percentage by ref_spot
        actual_strike = req.strike
        if req.strike_type == "RelativeStrike":
            spot = req.ref_spot or req.spot_override or overrides.get("S")
            if spot is None:
                from .pricing.black_scholes import get_market_data
                spot = get_market_data(req.ticker)["S"]
            actual_strike = req.strike * spot  # e.g., 1.1 × 150 = 165
        
        result = price_option_with_defaults(
            ticker=req.ticker,
            option_type=req.option_type,
            K=actual_strike,
            T=req.time_to_maturity,
            ad_hoc_overrides=overrides if overrides else None
        )
        return {
            "price": round(result["price"], 4),
            "delta": round(result["delta"] * 100, 1),  # Return as percentage
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """ Endpoint to upload and parse an Excel/CSV/TXT file for option parameters """
    try:
        content = await file.read()
        requests = parse_pricing_requests(content, file.filename)
        return {"parsed_requests": requests, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/emails")
def check_emails():
    """ Endpoint to check connected IMAP inbox for new pricing requests """
    try:
        emails = fetch_email_pricing_requests()
        return {"emails": emails, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/book")
def activate_booking(req_data: Dict[str, Any]):
    """ Endpoint to initialize trade booking """
    try:
        result = initialize_booking(req_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
