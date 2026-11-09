from typing import Optional
import httpx
from backend.app.config import settings


class SupabaseAdminClient:
    """
    Lightweight Supabase admin client for server-side operations
    using the service role key over HTTPS REST API.
    """
    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    @property
    def headers(self) -> dict:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/auth/v1/admin/users/{user_id}",
                headers=self.headers,
                timeout=10.0,
            )
            if resp.status_code == 200:
                return resp.json()
            return None


supabase_admin = SupabaseAdminClient()

