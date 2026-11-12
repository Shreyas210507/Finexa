"""
APIMatic OpenAPI Specification Exporter for FINEXA.
Generates an enriched, production-grade OpenAPI 3.1 specification with APIMatic CodeGen extensions
for generating SDKs in 6 programming languages (Python, TypeScript, C#, Java, PHP, Ruby).
"""

import json
import os
import sys

# Ensure repository root is on Python path
sys.path.insert(0, os.path.abspath("."))

from backend.app.main import app

def generate_apimatic_spec():
    os.makedirs("apimatic", exist_ok=True)
    spec = app.openapi()

    # Enrich info with APIMatic metadata
    spec["info"]["title"] = "FINEXA Financial Intelligence API"
    spec["info"]["version"] = "2.0.0"
    spec["info"]["description"] = (
        "FINEXA is an autonomous financial intelligence platform for SMBs, startups, and freelancers. "
        "Provides double-entry ledger management, real-time runway forecasting, invoice generation, "
        "PayPal checkout reconciliation, and autonomous AI CFO advisory."
    )
    spec["info"]["contact"] = {
        "name": "FINEXA Developer Ecosystem",
        "url": "https://finexa.io/developers",
        "email": "api@finexa.io"
    }

    # APIMatic CodeGen Extensions
    spec["x-codegen-settings"] = {
        "packageName": "finexa-sdk",
        "python": {
            "packageName": "finexa_client",
            "packageVersion": "2.0.0"
        },
        "typescript": {
            "packageName": "@finexa/sdk",
            "packageVersion": "2.0.0"
        },
        "csharp": {
            "namespace": "Finexa.Api.Client",
            "packageVersion": "2.0.0"
        },
        "java": {
            "groupId": "io.finexa",
            "artifactId": "finexa-java-sdk",
            "packageVersion": "2.0.0"
        }
    }

    # Servers
    spec["servers"] = [
        {
            "url": "http://127.0.0.1:8000",
            "description": "Local Development Server"
        },
        {
            "url": "https://finexa-backend.onrender.com",
            "description": "Render Production Web Service"
        }
    ]

    out_path = os.path.join("apimatic", "finexa-openapi.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)

    print(f"APIMatic OpenAPI Spec exported to {out_path} ({len(spec['paths'])} endpoints).")

if __name__ == "__main__":
    generate_apimatic_spec()

