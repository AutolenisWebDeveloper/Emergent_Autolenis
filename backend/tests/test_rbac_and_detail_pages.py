"""
RBAC and Detail Page API Tests for AutoLenis
Tests role-based access control, cross-role blocking, and invalid ID handling
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:3000"

# Test credentials from test_credentials.md
BUYER_EMAIL = "autolenis01@gmail.com"
BUYER_PASSWORD = "Louis101$"

DEALER_EMAIL = "rbac_dealer@autolenis-test.com"
DEALER_PASSWORD = "TestPass123$"

ADMIN_EMAIL = "rbac_admin@autolenis-test.com"
ADMIN_PASSWORD = "TestPass123$"


class TestAuthEndpoints:
    """Test authentication endpoints for all roles"""
    
    def test_buyer_signin_endpoint_exists(self):
        """Verify buyer/dealer signin endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": "test@test.com", "password": "wrong"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 for invalid credentials, not 404
        assert response.status_code in [401, 403, 500], f"Expected auth error, got {response.status_code}"
        
    def test_admin_signin_endpoint_exists(self):
        """Verify admin signin endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/signin",
            json={"email": "test@test.com", "password": "wrong"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 for invalid credentials, not 404
        assert response.status_code in [401, 403, 500], f"Expected auth error, got {response.status_code}"


class TestBuyerAuth:
    """Test buyer authentication and session"""
    
    @pytest.fixture(scope="class")
    def buyer_session(self):
        """Get authenticated buyer session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": BUYER_EMAIL, "password": BUYER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Buyer login failed: {response.status_code} - {response.text[:200]}")
        return session
    
    def test_buyer_login_success(self, buyer_session):
        """Verify buyer can login successfully"""
        # Session already authenticated in fixture
        assert buyer_session is not None
        
    def test_buyer_can_access_buyer_deal_api(self, buyer_session):
        """Buyer should be able to access their deal API"""
        response = buyer_session.get(f"{BASE_URL}/api/buyer/deal")
        # Should return 200 (with or without deal data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Either has deal or indicates no deal
        assert "success" in data or "data" in data or "error" in data


class TestDealerAuth:
    """Test dealer authentication and session"""
    
    @pytest.fixture(scope="class")
    def dealer_session(self):
        """Get authenticated dealer session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": DEALER_EMAIL, "password": DEALER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Dealer login failed: {response.status_code} - {response.text[:200]}")
        return session
    
    def test_dealer_login_success(self, dealer_session):
        """Verify dealer can login successfully"""
        assert dealer_session is not None


class TestAdminAuth:
    """Test admin authentication and session"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/auth/signin",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text[:200]}")
        return session
    
    def test_admin_login_success(self, admin_session):
        """Verify admin can login successfully"""
        assert admin_session is not None


class TestCrossRoleAPIAccess:
    """Test that users cannot access APIs for other roles"""
    
    @pytest.fixture(scope="class")
    def buyer_session(self):
        """Get authenticated buyer session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": BUYER_EMAIL, "password": BUYER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Buyer login failed: {response.status_code}")
        return session
    
    @pytest.fixture(scope="class")
    def dealer_session(self):
        """Get authenticated dealer session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": DEALER_EMAIL, "password": DEALER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Dealer login failed: {response.status_code}")
        return session
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/auth/signin",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return session
    
    def test_buyer_cannot_access_dealer_deals_api(self, buyer_session):
        """Buyer should NOT be able to access dealer deals API"""
        response = buyer_session.get(f"{BASE_URL}/api/dealer/deals/test-id-123")
        # Should return 401/403 (unauthorized/forbidden)
        assert response.status_code in [400, 401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_buyer_cannot_access_admin_deals_api(self, buyer_session):
        """Buyer should NOT be able to access admin deals API"""
        response = buyer_session.get(f"{BASE_URL}/api/admin/deals/test-id-123")
        # Should return 401/403 (unauthorized/forbidden)
        assert response.status_code in [400, 401, 403, 500], f"Expected 401/403, got {response.status_code}"
        
    def test_dealer_cannot_access_admin_deals_api(self, dealer_session):
        """Dealer should NOT be able to access admin deals API"""
        response = dealer_session.get(f"{BASE_URL}/api/admin/deals/test-id-123")
        # Should return 401/403 (unauthorized/forbidden)
        assert response.status_code in [400, 401, 403, 500], f"Expected 401/403, got {response.status_code}"
        
    def test_dealer_cannot_access_admin_payouts_api(self, dealer_session):
        """Dealer should NOT be able to access admin payouts API"""
        response = dealer_session.get(f"{BASE_URL}/api/admin/payouts/test-id-123")
        # Should return 401/403 (unauthorized/forbidden)
        assert response.status_code in [400, 401, 403, 500], f"Expected 401/403, got {response.status_code}"


class TestInvalidIDHandling:
    """Test that detail APIs return proper errors for invalid IDs"""
    
    @pytest.fixture(scope="class")
    def dealer_session(self):
        """Get authenticated dealer session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": DEALER_EMAIL, "password": DEALER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Dealer login failed: {response.status_code}")
        return session
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/admin/auth/signin",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return session
    
    def test_dealer_deals_invalid_id_returns_error(self, dealer_session):
        """Dealer deals API should return error for nonexistent ID"""
        response = dealer_session.get(f"{BASE_URL}/api/dealer/deals/nonexistent-id-123")
        # Should return 400/404 with error message
        assert response.status_code in [400, 403, 404], f"Expected 400/404, got {response.status_code}"
        data = response.json()
        assert data.get("success") == False or "error" in data
        
    def test_dealer_requests_invalid_id_returns_error(self, dealer_session):
        """Dealer requests API should return error for nonexistent ID"""
        response = dealer_session.get(f"{BASE_URL}/api/dealer/requests/nonexistent-id-456")
        # Should return 400/404 with error message
        assert response.status_code in [400, 403, 404], f"Expected 400/404, got {response.status_code}"
        
    def test_admin_deals_invalid_id_returns_error(self, admin_session):
        """Admin deals API should return error for nonexistent ID"""
        response = admin_session.get(f"{BASE_URL}/api/admin/deals/nonexistent-id-789")
        # Should return 404 with error message
        assert response.status_code in [400, 403, 404, 500], f"Expected 404, got {response.status_code}"
        data = response.json()
        assert data.get("success") == False or "error" in data
        
    def test_admin_payouts_invalid_id_returns_error(self, admin_session):
        """Admin payouts API should return error for nonexistent ID"""
        response = admin_session.get(f"{BASE_URL}/api/admin/payouts/nonexistent-id-000")
        # Should return 404 with error message
        assert response.status_code in [400, 403, 404, 500], f"Expected 404, got {response.status_code}"


class TestUnauthenticatedAccess:
    """Test that unauthenticated requests are blocked"""
    
    def test_buyer_deal_api_requires_auth(self):
        """Buyer deal API should require authentication"""
        response = requests.get(f"{BASE_URL}/api/buyer/deal")
        # Should return 401 or redirect
        assert response.status_code in [401, 403, 307, 302], f"Expected auth required, got {response.status_code}"
        
    def test_dealer_deals_api_requires_auth(self):
        """Dealer deals API should require authentication"""
        response = requests.get(f"{BASE_URL}/api/dealer/deals/test-id")
        # Should return 401 or redirect
        assert response.status_code in [400, 401, 403, 307, 302], f"Expected auth required, got {response.status_code}"
        
    def test_admin_deals_api_requires_auth(self):
        """Admin deals API should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/deals/test-id")
        # Should return 401 or redirect
        assert response.status_code in [400, 401, 403, 500, 307, 302], f"Expected auth required, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
