"""
PayPal Subscription Plan Setup Script
======================================
Creates the Pro Monthly and Pro Yearly subscription plans in PayPal
and prints the Plan IDs to paste into your .env file.

Usage:
    python scripts/setup_paypal_plans.py

Requirements:
    - PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET set in .env
    - PAYPAL_ENVIRONMENT set to 'sandbox' or 'live'
    - pip install requests python-dotenv
"""

import os
import sys
import requests
from pathlib import Path

# Load .env from project root
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(env_path)
    print(f"✅ Loaded .env from: {env_path}")
except ImportError:
    print("⚠️  python-dotenv not installed, using existing environment variables")

# Config
ENVIRONMENT = os.getenv("PAYPAL_ENVIRONMENT", "sandbox").lower()
CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")

BASE_URL = (
    "https://api-m.sandbox.paypal.com"
    if ENVIRONMENT == "sandbox"
    else "https://api-m.paypal.com"
)

# Plan definitions
MONTHLY_PRICE = "9.99"
YEARLY_PRICE = "95.88"  # $7.99/month * 12
PRODUCT_NAME = "Dociva Pro"
PRODUCT_DESCRIPTION = "Premium PDF & document processing tools with AI features"


def get_access_token():
    """Get OAuth 2.0 access token from PayPal."""
    resp = requests.post(
        f"{BASE_URL}/v1/oauth2/token",
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"❌ Failed to get access token: {resp.status_code}")
        print(resp.text)
        sys.exit(1)
    token = resp.json()["access_token"]
    print(f"✅ Got access token: {token[:20]}...")
    return token


def create_product(token):
    """Create a PayPal catalog product (or reuse existing)."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Check for existing products first
    resp = requests.get(
        f"{BASE_URL}/v1/catalogs/products?page_size=20",
        headers=headers,
        timeout=15,
    )
    if resp.status_code == 200:
        products = resp.json().get("products", [])
        for p in products:
            if p.get("name") == PRODUCT_NAME:
                print(f"♻️  Reusing existing product: {p['id']}")
                return p["id"]

    # Create new product
    payload = {
        "name": PRODUCT_NAME,
        "description": PRODUCT_DESCRIPTION,
        "type": "SERVICE",
        "category": "SOFTWARE",
    }
    resp = requests.post(
        f"{BASE_URL}/v1/catalogs/products",
        headers=headers,
        json=payload,
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        print(f"❌ Failed to create product: {resp.status_code}")
        print(resp.text)
        sys.exit(1)
    product_id = resp.json()["id"]
    print(f"✅ Created product: {product_id}")
    return product_id


def create_plan(token, product_id, name, interval, price):
    """Create a subscription plan under the given product."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "product_id": product_id,
        "name": name,
        "description": f"Dociva Pro — {name}",
        "status": "ACTIVE",
        "billing_cycles": [
            {
                "frequency": {
                    "interval_unit": interval,
                    "interval_count": 1,
                },
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,  # infinite
                "pricing_scheme": {
                    "fixed_price": {
                        "value": price,
                        "currency_code": "USD",
                    }
                },
            }
        ],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3,
        },
    }
    resp = requests.post(
        f"{BASE_URL}/v1/billing/plans",
        headers=headers,
        json=payload,
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        print(f"❌ Failed to create plan '{name}': {resp.status_code}")
        print(resp.text)
        sys.exit(1)
    plan_id = resp.json()["id"]
    print(f"✅ Created plan '{name}': {plan_id}")
    return plan_id


def main():
    print("=" * 60)
    print("  PayPal Subscription Plan Setup")
    print(f"  Environment: {ENVIRONMENT.upper()}")
    print("=" * 60)
    print()

    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env")
        sys.exit(1)

    # 1. Get access token
    token = get_access_token()

    # 2. Create (or reuse) product
    product_id = create_product(token)

    # 3. Create monthly plan
    monthly_plan_id = create_plan(
        token, product_id,
        "Pro Monthly",
        "MONTH",
        MONTHLY_PRICE,
    )

    # 4. Create yearly plan
    yearly_plan_id = create_plan(
        token, product_id,
        "Pro Yearly",
        "YEAR",
        YEARLY_PRICE,
    )

    # 5. Summary
    print()
    print("=" * 60)
    print("  ✅ Done! Add these to your .env file:")
    print("=" * 60)
    print()
    print(f"PAYPAL_PLAN_ID_PRO_MONTHLY={monthly_plan_id}")
    print(f"PAYPAL_PLAN_ID_PRO_YEARLY={yearly_plan_id}")
    print()
    print("📋 Copy the two lines above into your .env file")
    print()


if __name__ == "__main__":
    main()
