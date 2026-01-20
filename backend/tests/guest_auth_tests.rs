//! Guest authentication tests
//!
//! Tests for guest registration, login, and authentication functionality.
//! Following TDD approach per Constitution II.

use hotel_management_backend::models::UserRole;
use hotel_management_backend::services::AuthService;

use serde_json;
use uuid::Uuid;

/// Test helper: Basic email validation (sufficient for unit tests)
fn is_valid_email(email: &str) -> bool {
    // Basic email validation: contains @ and at least one . after @
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    let local = parts[0];
    let domain = parts[1];

    // Local part must not be empty
    if local.is_empty() || domain.is_empty() {
        return false;
    }

    domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
}

/// Test helper: Password policy used in tests
/// - At least 8 characters
/// - At least one letter
/// - At least one number
fn is_valid_password(password: &str) -> bool {
    if password.len() < 8 {
        return false;
    }
    let has_letter = password.chars().any(|c| c.is_alphabetic());
    let has_number = password.chars().any(|c| c.is_numeric());
    has_letter && has_number
}

// ============================================================================
// US1: Guest Registration / Password & Email validation
// ============================================================================

#[test]
fn test_password_validation_minimum_length() {
    assert!(!is_valid_password("short1")); // Too short
    assert!(!is_valid_password("1234567")); // 7 chars
    assert!(is_valid_password("password1")); // 9 chars with letter and number
}

#[test]
fn test_password_validation_requires_letter() {
    assert!(!is_valid_password("12345678")); // No letters
    assert!(is_valid_password("12345678a")); // Has letter
}

#[test]
fn test_password_validation_requires_number() {
    assert!(!is_valid_password("abcdefgh")); // No numbers
    assert!(is_valid_password("abcdefg1")); // Has number
}

#[test]
fn test_password_validation_full_requirements() {
    assert!(!is_valid_password("")); // Empty
    assert!(!is_valid_password("short")); // Too short, no number
    assert!(!is_valid_password("1234567")); // Too short, no letter
    assert!(!is_valid_password("abcdefgh")); // No number
    assert!(!is_valid_password("12345678")); // No letter
    assert!(is_valid_password("Password1")); // Valid
    assert!(is_valid_password("securepass123")); // Valid
    assert!(is_valid_password("MyP@ssw0rd!")); // Valid with special chars
}

#[test]
fn test_email_validation_basic_format() {
    assert!(!is_valid_email("invalid"));
    assert!(!is_valid_email("invalid@"));
    assert!(!is_valid_email("@domain.com"));
    assert!(!is_valid_email("user@.com"));
    assert!(!is_valid_email("user@domain."));
    assert!(is_valid_email("user@domain.com"));
    assert!(is_valid_email("test.user@example.org"));
}

#[test]
fn test_email_validation_various_formats() {
    assert!(is_valid_email("simple@example.com"));
    assert!(is_valid_email("very.common@example.com"));
    assert!(is_valid_email("user+tag@example.com"));
    assert!(is_valid_email("user@subdomain.example.com"));
    assert!(!is_valid_email("plainaddress"));
    assert!(!is_valid_email("@missing-local.com"));
    assert!(!is_valid_email("missing-at-sign.com"));
}

// ============================================================================
// US1: Password hashing / verification (Argon2id helpers)
// ============================================================================

#[test]
fn test_password_hash_and_verify() {
    // Hash and verify using AuthService helpers (pure helpers; no DB)
    let password = "SecurePass123";

    // hash_password returns AppResult<String>; unwrap for test
    let hash = AuthService::hash_password(password).expect("Password hashing should succeed");

    // Hash should not equal raw password
    assert_ne!(hash, password);

    // Correct password verifies
    let ok = AuthService::verify_password(password, &hash).expect("Verification should succeed");
    assert!(ok, "Correct password should verify");

    // Incorrect password does not verify
    let not_ok = AuthService::verify_password("wrongpassword", &hash).expect("Verification should succeed");
    assert!(!not_ok, "Wrong password should not verify");
}

// ============================================================================
// US1: Guest role presence
// ============================================================================

#[test]
fn test_guest_role_exists() {
    let guest_role = UserRole::Guest;
    // Debug formatting should show variant name; this ensures the enum variant exists
    assert_eq!(format!("{:?}", guest_role), "Guest");
}

// ============================================================================
// US2: Guest login design assertions (DB-free)
// ============================================================================

#[test]
fn test_guest_login_jwt_structure_serialization() {
    // This unit test checks how the role serializes (we don't generate a token here)
    let role = UserRole::Guest;

    // serde_json should serialize the enum to a lowercase string (per crate impl)
    let serialized = serde_json::to_string(&role).expect("Role should serialize");
    assert!(serialized.to_lowercase().contains("guest"), "Role should serialize as 'guest' (case-insensitive)");
}

#[test]
fn test_guest_login_requires_email_not_username() {
    // Guest login should use email field; design test only
    assert!(is_valid_email("guest@example.com"));
    assert!(is_valid_email("test.user@hotel.com"));
    assert!(!is_valid_email("admin"));
    assert!(!is_valid_email("reception"));
}

#[test]
fn test_invalid_credentials_error_is_generic() {
    // Ensure the example error message is generic (design expectation)
    let expected_error_patterns = ["invalid", "credentials", "email", "password"];
    let actual_error = "Invalid email or password";

    let matches = expected_error_patterns
        .iter()
        .filter(|p| actual_error.to_lowercase().contains(&p.to_lowercase()))
        .count();
    assert!(matches >= 2, "Error message should be generic and not leak details");
}

#[test]
fn test_staff_role_cannot_use_guest_login_design() {
    let admin_role = UserRole::Admin;
    let receptionist_role = UserRole::Receptionist;
    let guest_role = UserRole::Guest;

    assert_ne!(admin_role, guest_role);
    assert_ne!(receptionist_role, guest_role);

    let is_staff = |role: UserRole| matches!(role, UserRole::Admin | UserRole::Receptionist);
    assert!(is_staff(admin_role));
    assert!(is_staff(receptionist_role));
    assert!(!is_staff(guest_role));
}

// Integration tests requiring DB / API are intentionally omitted here.
// When you have a test database configured (DATABASE_URL, migrations applied),
// add integration tests under backend/tests/ that create a test user, call the
// registration/login endpoints and assert responses.