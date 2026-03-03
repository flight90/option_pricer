import pandas as pd
from typing import List, Dict, Any, Optional

def parse_pricing_requests(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parses an uploaded file (.xlsx, .csv, .txt) and extracts pricing requests.
    Expects columns or data hinting at: Ticker, Type (Call/Put), Strike, Time to Maturity
    """
    ext = filename.split('.')[-1].lower()
    
    try:
        if ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_bytes)
        elif ext == 'csv':
            # Decode bytes to string
            from io import StringIO
            s = str(file_bytes, 'utf-8')
            df = pd.read_csv(StringIO(s))
        elif ext == 'txt':
            from io import StringIO
            s = str(file_bytes, 'utf-8')
            df = pd.read_table(StringIO(s)) # Assuming tab separated
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
            
        requests = []
        
        # Fuzzy matching logic for column names
        cols = [c.lower() for c in df.columns]
        
        # Identify relevant columns (basic heuristic)
        ticker_col = next((c for c in cols if "ticker" in c or "symbol" in c), None)
        type_col = next((c for c in cols if "type" in c or "call" in c or "put" in c), None)
        strike_col = next((c for c in cols if "strike" in c or "k" == c), None)
        ttm_col = next((c for c in cols if "maturity" in c or "ttm" in c or "time" in c or "t" == c or "expiry" in c or "date" in c), None)
        
        # Optional new columns
        strike_type_col = next((c for c in cols if "striketype" in c.replace(' ','').replace('_','') or "strike_type" in c), None)
        cpty_col = next((c for c in cols if "counter" in c or "cpty" in c or "client" in c or "party" in c), None)
        exec_col = next((c for c in cols if "exec" in c or "method" in c), None)
        spot_col = next((c for c in cols if "spot" in c or "ref" in c), None)
        rate_col = next((c for c in cols if "rate" in c and "borrow" not in c), None)
        vol_col = next((c for c in cols if "vol" in c or "sigma" in c), None)
        div_col = next((c for c in cols if "div" in c), None)
        borrow_col = next((c for c in cols if "borrow" in c), None)
        
        if not (ticker_col and type_col and strike_col and ttm_col):
            raise ValueError("Could not find all required columns (Ticker, Type, Strike, Maturity) in the file.")
            
        # Map back to original column names for reading
        # ... this is a simplified stub doing precise matches based on the found lowercase names.
        
        for _, row in df.iterrows():
            row_dict = {k.lower(): v for k, v in row.items()}
            
            ticker = str(row_dict[ticker_col]).strip()
            opt_type = str(row_dict[type_col]).strip().lower()
            if opt_type not in ["call", "put"]:
                continue
                
            try:
                strike = float(row_dict[strike_col])
                ttm = float(row_dict[ttm_col])
                req = {
                    "ticker": ticker,
                    "option_type": opt_type,
                    "strike": strike,
                    "time_to_maturity": ttm
                }
                
                # Optional fields
                if strike_type_col and strike_type_col in row_dict:
                    val = str(row_dict[strike_type_col]).strip()
                    if val.lower() in ['absstrike', 'abs', 'absolute']:
                        req['strike_type'] = 'AbsStrike'
                    elif val.lower() in ['relativestrike', 'rel', 'relative', 'rel%', 'pct']:
                        req['strike_type'] = 'RelativeStrike'
                if cpty_col and cpty_col in row_dict:
                    val = str(row_dict[cpty_col]).strip()
                    if val and val.lower() != 'nan': req['counterparty'] = val
                if exec_col and exec_col in row_dict:
                    val = str(row_dict[exec_col]).strip()
                    if val and val.lower() != 'nan': req['exec_method'] = val
                if spot_col and spot_col in row_dict:
                    try: req['spot_override'] = str(float(row_dict[spot_col]))
                    except: pass
                if rate_col and rate_col in row_dict:
                    try: req['rate_override'] = str(float(row_dict[rate_col]))
                    except: pass
                if vol_col and vol_col in row_dict:
                    try: req['vol_override'] = str(float(row_dict[vol_col]))
                    except: pass
                if div_col and div_col in row_dict:
                    try: req['div_override'] = str(float(row_dict[div_col]))
                    except: pass
                if borrow_col and borrow_col in row_dict:
                    try: req['borrow_override'] = str(float(row_dict[borrow_col]))
                    except: pass
                    
                requests.append(req)
            except ValueError:
                continue
                
        return requests
        
    except Exception as e:
        raise ValueError(f"Failed to parse file: {str(e)}")
