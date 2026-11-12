# Render Cloud Deployment Blueprint Guide

FINEXA is fully configured for automated cloud deployment via **Render Infrastructure-as-Code (Blueprints)**.

---

## 1. Blueprint Configuration File

The deployment specification is defined in:
📁 **[`render.yaml`](file:///c:/Users/shrey/OneDrive/Desktop/Projects/Finexa/render.yaml)**

It provisions:
* **Web Service**: `finexa-backend` (Python 3.13 FastAPI backend)
* **Build Command**: `pip install -r backend/requirements.txt`
* **Start Command**: `bash scripts/start.sh`
* **Health Check**: Automated periodic probe at `/api/health`
* **Environment Variables**: Automatic synchronization of API keys (`GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `ZAPIER_SIGNING_SECRET`, etc.)

---

## 2. Deploying to Render in 3 Simple Steps

1. **Push your repository** to GitHub:
   ```bash
   git push origin main
   ```
2. **Open Render Dashboard**:
   * Navigate to [dashboard.render.com](https://dashboard.render.com).
   * Click **New +** > **Blueprint**.
   * Select your `Finexa` repository.
3. **Apply Blueprint**:
   * Render will automatically parse `render.yaml`.
   * Fill in your secret keys (`GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) when prompted.
   * Click **Apply**.
   * Your API will be live at `https://finexa-backend.onrender.com` in approximately 2 minutes!

---

## 3. Verifying the Deployment

Once deployed, the Render service reports live status via:
* **Health Check**: `https://finexa-backend.onrender.com/api/health`
* **Interactive Docs**: `https://finexa-backend.onrender.com/docs`
* **OpenAPI Schema**: `https://finexa-backend.onrender.com/openapi.json`

