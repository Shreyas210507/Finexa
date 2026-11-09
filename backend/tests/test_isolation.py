import uuid
from backend.tests.conftest import make_supabase_token


def test_cross_org_isolation(client):
    # 1. User A creates Org A
    user_a_id = uuid.uuid4()
    token_a = make_supabase_token(user_a_id)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    resp_a = client.post(
        "/api/auth/onboard",
        json={"name": "User A", "org_name": "Org Alpha", "currency": "INR"},
        headers=headers_a,
    )
    assert resp_a.status_code == 200
    org_a_id = resp_a.json()["current_org"]["id"]

    # 2. User B creates Org B
    user_b_id = uuid.uuid4()
    token_b = make_supabase_token(user_b_id)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp_b = client.post(
        "/api/auth/onboard",
        json={"name": "User B", "org_name": "Org Beta", "currency": "USD"},
        headers=headers_b,
    )
    assert resp_b.status_code == 200
    org_b_id = resp_b.json()["current_org"]["id"]

    # 3. User A attempts to access Org B using X-Organisation-ID header
    unauthorized_attempt = client.get(
        "/api/organisations/current",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-Organisation-ID": org_b_id,
        },
    )
    assert unauthorized_attempt.status_code == 403
    assert "User does not have access to this organisation" in unauthorized_attempt.json()["detail"]

    # 4. User B attempts to access Org A using X-Organisation-ID header
    unauthorized_attempt_b = client.get(
        "/api/organisations/current",
        headers={
            "Authorization": f"Bearer {token_b}",
            "X-Organisation-ID": org_a_id,
        },
    )
    assert unauthorized_attempt_b.status_code == 403
    assert "User does not have access to this organisation" in unauthorized_attempt_b.json()["detail"]


def test_rbac_member_cannot_update_org(client):
    # 1. Owner creates org
    owner_id = uuid.uuid4()
    owner_token = make_supabase_token(owner_id)
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    resp = client.post(
        "/api/auth/onboard",
        json={"name": "Org Owner", "org_name": "Role Test Org", "currency": "INR"},
        headers=owner_headers,
    )
    org_id = resp.json()["current_org"]["id"]

    # 2. Owner invites a normal member
    member_id = uuid.uuid4()
    invite_resp = client.post(
        "/api/organisations/current/members/invite",
        json={"user_id": str(member_id), "role": "member"},
        headers=owner_headers,
    )
    assert invite_resp.status_code == 200

    # 3. Member tries to update organization settings -> must fail 403
    member_token = make_supabase_token(member_id)
    member_headers = {
        "Authorization": f"Bearer {member_token}",
        "X-Organisation-ID": org_id,
    }

    patch_resp = client.patch(
        "/api/organisations/current",
        json={"name": "Hacked Org Name"},
        headers=member_headers,
    )
    assert patch_resp.status_code == 403
    assert "Operation requires one of the following roles" in patch_resp.json()["detail"]

