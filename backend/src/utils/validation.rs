use crate::errors::{AppError, AppResult};

/// Validate username format
/// - Must be 3-50 characters
/// - Can contain letters, numbers, underscores, and hyphens
/// - Must start with a letter or number
pub fn validate_username(username: &str) -> AppResult<()> {
    let username = username.trim();

    if username.is_empty() {
        return Err(AppError::ValidationError(
            "Username is required".to_string(),
        ));
    }

    if username.len() < 3 {
        return Err(AppError::ValidationError(
            "Username must be at least 3 characters".to_string(),
        ));
    }

    if username.len() > 50 {
        return Err(AppError::ValidationError(
            "Username must be 50 characters or less".to_string(),
        ));
    }

    // Must start with letter or number
    if !username.chars().next().map_or(false, |c| c.is_alphanumeric()) {
        return Err(AppError::ValidationError(
            "Username must start with a letter or number".to_string(),
        ));
    }

    // Can only contain letters, numbers, underscores, and hyphens
    if !username
        .chars()
        .all(|c| c.is_alphanumeric() || c == '_' || c == '-')
    {
        return Err(AppError::ValidationError(
            "Username can only contain letters, numbers, underscores, and hyphens".to_string(),
        ));
    }

    Ok(())
}

/// Validate email format
pub fn validate_email(email: &str) -> AppResult<()> {
    let email = email.trim();

    if email.is_empty() {
        return Err(AppError::ValidationError("Email is required".to_string()));
    }

    if email.len() > 255 {
        return Err(AppError::ValidationError(
            "Email must be 255 characters or less".to_string(),
        ));
    }

    // Basic email format validation
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err(AppError::ValidationError(
            "Invalid email format".to_string(),
        ));
    }

    let local = parts[0];
    let domain = parts[1];

    if local.is_empty() || domain.is_empty() {
        return Err(AppError::ValidationError(
            "Invalid email format".to_string(),
        ));
    }

    if local.len() > 64 {
        return Err(AppError::ValidationError(
            "Email local part is too long".to_string(),
        ));
    }

    if !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
        return Err(AppError::ValidationError(
            "Invalid email format".to_string(),
        ));
    }

    Ok(())
}

/// Validate phone number format
/// - Optional field, but if provided must be valid
/// - Supports international format with + prefix
/// - Can contain digits, spaces, hyphens, parentheses, and +
pub fn validate_phone(phone: &str) -> AppResult<()> {
    let phone = phone.trim();

    if phone.is_empty() {
        return Ok(()); // Phone is optional
    }

    if phone.len() > 20 {
        return Err(AppError::ValidationError(
            "Phone number must be 20 characters or less".to_string(),
        ));
    }

    // Remove common formatting characters for validation
    let digits_only: String = phone
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+')
        .collect();

    if digits_only.is_empty() {
        return Err(AppError::ValidationError(
            "Phone number must contain at least one digit".to_string(),
        ));
    }

    // Must start with + or digit
    if !phone.starts_with('+') && !phone.chars().next().map_or(false, |c| c.is_ascii_digit()) {
        return Err(AppError::ValidationError(
            "Phone number must start with a digit or +".to_string(),
        ));
    }

    // Count digits (excluding +)
    let digit_count = digits_only.chars().filter(|c| c.is_ascii_digit()).count();
    if digit_count < 7 {
        return Err(AppError::ValidationError(
            "Phone number must contain at least 7 digits".to_string(),
        ));
    }

    if digit_count > 15 {
        return Err(AppError::ValidationError(
            "Phone number must contain 15 digits or less".to_string(),
        ));
    }

    Ok(())
}

/// Validate date string format (YYYY-MM-DD)
pub fn validate_date_format(date_str: &str) -> AppResult<()> {
    if date_str.is_empty() {
        return Err(AppError::ValidationError("Date is required".to_string()));
    }

    // Check format YYYY-MM-DD
    if date_str.len() != 10 {
        return Err(AppError::ValidationError(
            "Date must be in YYYY-MM-DD format".to_string(),
        ));
    }

    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() != 3 {
        return Err(AppError::ValidationError(
            "Date must be in YYYY-MM-DD format".to_string(),
        ));
    }

    // Validate year, month, day are numeric
    if parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
        || !parts[0].chars().all(|c| c.is_ascii_digit())
        || !parts[1].chars().all(|c| c.is_ascii_digit())
        || !parts[2].chars().all(|c| c.is_ascii_digit())
    {
        return Err(AppError::ValidationError(
            "Date must be in YYYY-MM-DD format".to_string(),
        ));
    }

    Ok(())
}

/// Validate search query
pub fn validate_search_query(query: &str) -> AppResult<()> {
    let query = query.trim();

    if query.is_empty() {
        return Err(AppError::ValidationError(
            "Search query cannot be empty".to_string(),
        ));
    }

    if query.len() < 2 {
        return Err(AppError::ValidationError(
            "Search query must be at least 2 characters".to_string(),
        ));
    }

    if query.len() > 100 {
        return Err(AppError::ValidationError(
            "Search query must be 100 characters or less".to_string(),
        ));
    }

    Ok(())
}

