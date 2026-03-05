import uuid
from typing import Dict, Any


def initialize_booking(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mock booking API client.
    Accepts the full booking payload including final option details,
    counterparty, portfolio, and execution parameters.
    In production this would POST to an external booking system.
    """
    # Validate required fields
    required = ['ticker', 'option_type', 'counterparty', 'portfolio']
    missing = [f for f in required if not request_data.get(f)]
    if missing:
        return {
            "status": "error",
            "message": f"Missing required booking fields: {', '.join(missing)}",
            "payload_received": request_data
        }

    booking_id = f"BKG-{uuid.uuid4().hex[:8].upper()}"

    # Build the booking record
    booking_record = {
        "booking_id": booking_id,
        "instrument": request_data.get("instrument", "Option"),
        "ticker": request_data.get("ticker"),
        "option_type": request_data.get("option_type"),
        "strike_type": request_data.get("strike_type"),
        "exec_method": request_data.get("exec_method"),
        "maturity": request_data.get("maturity"),
        "counterparty": request_data.get("counterparty"),
        "portfolio": request_data.get("portfolio"),
        "ref_spot": request_data.get("ref_spot"),
        "exec_spot": request_data.get("exec_spot"),
        "indicative_price": request_data.get("indicative_price"),
        "indicative_delta": request_data.get("indicative_delta"),
        "final_strike": request_data.get("final_strike"),
        "final_price": request_data.get("final_price"),
        "final_quantity": request_data.get("final_quantity"),
    }

    # In production: requests.post("https://booking-api.example.com/v1/trades", json=booking_record)
    print(f"[BOOKING] {booking_id} | {booking_record['ticker']} {booking_record['option_type']} "
          f"| Cpty: {booking_record['counterparty']} | Portfolio: {booking_record['portfolio']} "
          f"| Final Strike: {booking_record['final_strike']} | Final Price: {booking_record['final_price']} "
          f"| Final Qty: {booking_record['final_quantity']}")

    return {
        "status": "success",
        "booking_id": booking_id,
        "message": f"Booking initialized for {booking_record['ticker']} → {booking_record['portfolio']}",
        "booking_record": booking_record
    }
