import uuid
from backend.tests.conftest import make_supabase_token


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "supabase" in data


def test_unauthorized_without_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Missing Authorization header" in response.json()["detail"]


def test_unauthorized_with_invalid_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert response.status_code == 401
    assert "Invalid authentication token" in response.json()["detail"]


def test_unauthorized_with_expired_token(client):
    user_id = uuid.uuid4()
    expired_token = make_supabase_token(user_id, expires_in_seconds=-60)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"]


def test_onboard_and_me_flow(client):
    user_id = uuid.uuid4()
    token = make_supabase_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Onboard user and create organization
    onboard_payload = {
        "name": "Alex Founder",
        "org_name": "Nimbus Labs",
        "currency": "INR",
    }
    onboard_resp = client.post("/api/auth/onboard", json=onboard_payload, headers=headers)
    assert onboard_resp.status_code == 200
    data = onboard_resp.json()
    assert data["profile"]["name"] == "Alex Founder"
    assert data["current_org"]["name"] == "Nimbus Labs"
    assert data["current_org"]["role"] == "owner"

    # 2. Get me endpoint
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["profile"]["id"] == str(user_id)
    assert me_data["profile"]["name"] == "Alex Founder"
    assert me_data["current_org"]["name"] == "Nimbus Labs"

    # 3. Update profile
    patch_resp = client.patch(
        "/api/auth/profile",
        json={"name": "Alex Updated", "avatar_url": "https://avatar.png"},
        headers=headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Alex Updated"
    assert patch_resp.json()["avatar_url"] == "https://avatar.png"

