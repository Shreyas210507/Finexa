# APIMatic Developer SDK & API Portal Guide

FINEXA provides seamless integration with **APIMatic** to automatically generate developer SDKs in **6 programming languages** (TypeScript/JavaScript, Python, C#/.NET, Java, PHP, and Ruby) directly from our OpenAPI 3.1 schema.

---

## 1. OpenAPI Specification File

The complete, enriched OpenAPI specification is exported and maintained at:
📁 **[`apimatic/finexa-openapi.json`](file:///c:/Users/shrey/OneDrive/Desktop/Projects/Finexa/apimatic/finexa-openapi.json)** (43 REST API endpoints).

To re-export the latest specification at any time:
```bash
python scripts/export_apimatic_spec.py
```

---

## 2. Generating Client SDKs in APIMatic

1. Go to the [APIMatic Dashboard](https://www.apimatic.io/).
2. Click **Import API** and upload `apimatic/finexa-openapi.json`.
3. APIMatic automatically validates the schema and generates:
   * **TypeScript/Node.js SDK**: `@finexa/sdk`
   * **Python SDK**: `finexa-client`
   * **C# / .NET SDK**: `Finexa.Api.Client`
   * **Java SDK**: `io.finexa:finexa-java-sdk`
   * **Interactive API Documentation Portal** with live "Try It Out" console.

---

## 3. Sample Code Generated SDK Usage (Python)

```python
from finexa_client import FinexaClient
from finexa_client.configuration import Configuration

# Initialize client
client = FinexaClient(
    Configuration(
        base_uri="http://127.0.0.1:8000",
        access_token="your_jwt_auth_token"
    )
)

# 1. Fetch live financial summary
summary = client.dashboard.get_summary(period="30d")
print(f"Cash Balance: ${summary.closing_balance}")
print(f"Monthly Runway: {summary.runway_display}")

# 2. Query Autonomous AI CFO
response = client.ai.chat(message="Identify unusual vendor expenses")
print(f"AI CFO Insights: {response.content}")
```

---

## 4. Sample Code Generated SDK Usage (TypeScript)

```typescript
import { FinexaClient } from "@finexa/sdk";

const finexa = new FinexaClient({
  baseUrl: "http://127.0.0.1:8000",
  accessToken: "your_jwt_auth_token",
});

async function runFintechSync() {
  const kpis = await finexa.dashboard.getSummary({ period: "30d" });
  console.log(`Current Reserves: $${kpis.closingBalance}`);

  const anomalies = await finexa.ai.getAnomalies();
  console.log(`Sentinel Scan flagged ${anomalies.length} risk items.`);
}
```

