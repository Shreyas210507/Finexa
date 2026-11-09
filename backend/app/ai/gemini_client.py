import logging
import time
from typing import Any, Dict, Generator, List, Optional
from google import genai
from google.genai import types

from backend.app.config import settings

logger = logging.getLogger("finexa-ai")


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.model = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._client: Optional[genai.Client] = None

        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")
                self._client = None

    def is_configured(self) -> bool:
        return bool(self._client and self.api_key)

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        tools: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """Generate response with bounded retries and quota fallback."""
        if not self.is_configured():
            return {
                "text": "Gemini AI API key is not configured. FINEXA is operating in deterministic engine mode.",
                "tool_calls": [],
                "tokens": 0,
                "latency_ms": 1,
                "is_fallback": True,
            }

        start_time = time.time()
        config_kwargs: Dict[str, Any] = {
            "max_output_tokens": settings.AI_MAX_OUTPUT_TOKENS,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if tools:
            config_kwargs["tools"] = tools

        config = types.GenerateContentConfig(**config_kwargs)

        # Retry with exponential backoff for transient issues
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )
                latency = int((time.time() - start_time) * 1000)

                # Extract text and tool calls if any
                text = response.text or ""
                tool_calls = []
                if response.function_calls:
                    for fc in response.function_calls:
                        tool_calls.append({
                            "name": fc.name,
                            "args": dict(fc.args) if fc.args else {},
                        })

                tokens = 0
                if response.usage_metadata:
                    tokens = response.usage_metadata.total_token_count or 0

                return {
                    "text": text,
                    "tool_calls": tool_calls,
                    "tokens": tokens,
                    "latency_ms": latency,
                    "is_fallback": False,
                }
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Gemini API attempt {attempt + 1} failed: {err_str}")
                if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                    # Return graceful quota fallback
                    return {
                        "text": "AI rate limit or quota reached. FINEXA has safely fallen back to deterministic calculation mode.",
                        "tool_calls": [],
                        "tokens": 0,
                        "latency_ms": int((time.time() - start_time) * 1000),
                        "is_fallback": True,
                    }
                if attempt == max_retries:
                    return {
                        "text": "AI service temporarily unavailable. Operational intelligence remains accessible via the Financial Engine.",
                        "tool_calls": [],
                        "tokens": 0,
                        "latency_ms": int((time.time() - start_time) * 1000),
                        "is_fallback": True,
                    }
                time.sleep(1.0 * (attempt + 1))


gemini_service = GeminiService()

