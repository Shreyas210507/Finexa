from typing import List
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Supabase Configuration
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    SUPABASE_JWT_SECRET: str = Field(default="")
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:password@localhost:5432/postgres"
    )

    # API & Security
    CORS_ORIGINS: str = Field(default="http://localhost:3000")
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    DEMO_MODE: bool = Field(default=True)

    # AI Configuration (Gemini)
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.1-flash-lite")
    AI_RATE_LIMIT_PER_MINUTE: int = Field(default=20)
    AI_MAX_TOOL_CALLS: int = Field(default=6)
    AI_MAX_OUTPUT_TOKENS: int = Field(default=1200)

    # PayPal Sandbox
    PAYPAL_MODE: str = Field(default="sandbox")
    PAYPAL_CLIENT_ID: str = Field(default="")
    PAYPAL_CLIENT_SECRET: str = Field(default="")
    PAYPAL_WEBHOOK_ID: str = Field(default="")

    # Partner Integrations
    ZAPIER_SIGNING_SECRET: str = Field(default="")
    APIMATIC_AUTH_KEY: str = Field(default="")
    POSTMAN_API_KEY: str = Field(default="")

    @computed_field
    @property
    def cors_origin_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins and "*" not in origins:
            origins.append(self.FRONTEND_URL)
        return origins


settings = Settings()

