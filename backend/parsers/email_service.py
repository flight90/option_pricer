import re
from typing import List, Dict, Any
# import imaplib
# import email

# NOTE: Imaplib and email integration would go here.
# For the first draft, we will return some mock data to show how it plugs into the frontend.

def fetch_email_pricing_requests() -> List[Dict[str, Any]]:
    """
    Connects to IMAP/Exchange inbox, fetches unread emails,
    and runs regex to extract pricing requests.
    
    Returns a list of parsed requests.
    """
    # MOCK implementation for the first draft demonstration
    mock_emails = [
        {
            "id": "e123",
            "subject": "Pricing Request from Trading Desk",
            "sender": "trader@bank.com",
            "parsed_data": {
                "ticker": "AAPL",
                "option_type": "call",
                "strike": 155.0,
                "maturity_date": "2026-09-18",
                "strike_type": "AbsStrike",
                "counterparty": "Goldman Sachs",
                "exec_method": "DeltaAdj"
            }
        },
        {
            "id": "e124",
            "subject": "Fwd: Urgent TSLA puts",
            "sender": "sales@bank.com",
            "parsed_data": {
                "ticker": "TSLA",
                "option_type": "put",
                "strike": 210.0,
                "maturity_date": "2026-06-20",
                "strike_type": "AbsStrike",
                "counterparty": "Morgan Stanley",
                "exec_method": "Reprice"
            }
        },
        {
            "id": "e125",
            "subject": "SPX relative strike RFQ",
            "sender": "pm@hedgefund.com",
            "parsed_data": {
                "ticker": "SPX",
                "option_type": "call",
                "strike": 105,
                "maturity_date": "2027-03-19",
                "strike_type": "RelativeStrike",
                "counterparty": "JP Morgan",
                "exec_method": "DeltaAdj"
            }
        }
    ]
    return mock_emails
