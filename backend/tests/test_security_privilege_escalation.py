"""
Security Tests: Privilege Escalation & Session Invalidation
GreenLink Agritech — Tests de securite P1
"""
import httpx

API_URL = "https://redd-carbon-track.preview.emergentagent.com"

ADMIN_EMAIL = "klenakan.eric@gmail.com"
ADMIN_PASSWORD = "474Treckadzo"
AGENT_EMAIL = "testagent@test.ci"
AGENT_PASSWORD = "test123456"
FARMER_EMAIL = "testplanteur@test.ci"
FARMER_PASSWORD = "test123456"

# Share a single client and cache tokens to avoid rate limiting
_client = httpx.Client(timeout=30)
_tokens = {}

def get_token(identifier, password):
    if identifier not in _tokens:
        r = _client.post(f"{API_URL}/api/auth/login", json={
            "identifier": identifier, "password": password
        })
        assert r.status_code == 200, f"Login failed for {identifier}: {r.text}"
        _tokens[identifier] = r.json()["access_token"]
    return _tokens[identifier]

def auth(identifier, password):
    return {"Authorization": f"Bearer {get_token(identifier, password)}"}


def test_cannot_escalate_via_profile_update():
    """A field_agent should NOT be able to change user_type to super_admin."""
    h = auth(AGENT_EMAIL, AGENT_PASSWORD)

    r = _client.get(f"{API_URL}/api/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json().get("user_type") == "field_agent"

    # Attempt privilege escalation
    _client.put(f"{API_URL}/api/auth/profile", headers=h, json={
        "user_type": "super_admin",
        "full_name": "Hacked Agent"
    })

    r = _client.get(f"{API_URL}/api/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json()["user_type"] == "field_agent", "PRIVILEGE ESCALATION DETECTED!"

    # Restore original name
    _client.put(f"{API_URL}/api/auth/profile", headers=h, json={"full_name": "Agent Terrain Test"})


def test_cannot_inject_forbidden_fields():
    """Injecting is_active, hashed_password, roles via profile update should be blocked."""
    h = auth(FARMER_EMAIL, FARMER_PASSWORD)

    r = _client.put(f"{API_URL}/api/auth/profile", headers=h, json={
        "is_active": False,
        "hashed_password": "injected_hash",
        "roles": ["super_admin"],
    })
    assert r.status_code in [400, 422]

    r = _client.get(f"{API_URL}/api/auth/me", headers=h)
    assert r.status_code == 200


def test_admin_endpoints_require_admin_role():
    """Non-admin users should not access admin-only endpoints."""
    h = auth(FARMER_EMAIL, FARMER_PASSWORD)

    r = _client.get(f"{API_URL}/api/auth/admin/password-health/{FARMER_EMAIL}", headers=h)
    assert r.status_code == 403

    r = _client.post(f"{API_URL}/api/auth/admin/repair-password", headers=h, json={
        "email": FARMER_EMAIL, "new_password": "hacked123"
    })
    assert r.status_code == 403


def test_change_password_flow():
    """Change password: old token invalidated, new token works, revert succeeds."""
    # Fresh login for this test
    r = _client.post(f"{API_URL}/api/auth/login", json={
        "identifier": AGENT_EMAIL, "password": AGENT_PASSWORD
    })
    assert r.status_code == 200
    old_token = r.json()["access_token"]

    r = _client.get(f"{API_URL}/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert r.status_code == 200

    # Change password
    r = _client.post(f"{API_URL}/api/auth/change-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"current_password": AGENT_PASSWORD, "new_password": "tempchanged999"})
    assert r.status_code == 200
    new_token = r.json()["access_token"]

    # Old token must be invalidated
    r = _client.get(f"{API_URL}/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert r.status_code == 401, "Old token should be invalidated!"

    # New token works
    r = _client.get(f"{API_URL}/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert r.status_code == 200

    # Revert password
    r = _client.post(f"{API_URL}/api/auth/change-password",
        headers={"Authorization": f"Bearer {new_token}"},
        json={"current_password": "tempchanged999", "new_password": AGENT_PASSWORD})
    assert r.status_code == 200
    # Update cached token
    _tokens[AGENT_EMAIL] = r.json()["access_token"]


def test_change_password_validations():
    """Wrong current password and same password are rejected."""
    h = auth(FARMER_EMAIL, FARMER_PASSWORD)

    # Wrong current password
    r = _client.post(f"{API_URL}/api/auth/change-password", headers=h,
        json={"current_password": "wrongpassword", "new_password": "newpass123456"})
    assert r.status_code == 400

    # Same password
    r = _client.post(f"{API_URL}/api/auth/change-password", headers=h,
        json={"current_password": FARMER_PASSWORD, "new_password": FARMER_PASSWORD})
    assert r.status_code == 400
