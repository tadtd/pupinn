use diesel::prelude::*;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{
    Booking, BookingWithRoom, GuestNote, NewGuestNote, UpdateUser, User,
    UserRole,
};
use crate::schema::{bookings, guest_interaction_notes, users};

/// Guest service for managing guest information and interaction notes
pub struct GuestService {
    pool: DbPool,
}

impl GuestService {
    /// Create a new GuestService instance
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Search for guests by name, email, phone, id_number, or booking reference
    ///
    /// # Arguments
    /// * `query` - Search term to match against guest fields or booking references
    ///
    /// # Returns
    /// * `Vec<User>` - List of matching guest users
    pub fn search_guests(&self, query: &str) -> AppResult<Vec<User>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Use prefix matching instead of substring matching
        let search_pattern = format!("{}%", query);

        // Search in guest users (role = 'guest') - all guests from past to now
        let guests: Vec<User> = users::table
            .filter(users::role.eq(UserRole::Guest))
            .filter(
                users::full_name
                    .ilike(&search_pattern)
                    .or(users::email.ilike(&search_pattern))
                    .or(users::phone.ilike(&search_pattern))
                    .or(users::id_number.ilike(&search_pattern)),
            )
            .order(users::created_at.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Also search by booking reference if query looks like a reference (prefix match)
        let mut guests_by_booking = Vec::new();
        if query.len() >= 3 {
            // Booking references can be searched with prefix (e.g., "BK-2025" matches "BK-20250127-XXXX")
            let bookings_with_reference: Vec<Booking> = bookings::table
                .filter(bookings::reference.ilike(&search_pattern))
                .load(&mut conn)
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            for booking in bookings_with_reference {
                if let Some(user_id) = booking.created_by_user_id {
                    // Get the guest user for this booking
                    if let Ok(guest) = users::table
                        .find(user_id)
                        .filter(users::role.eq(UserRole::Guest))
                        .first::<User>(&mut conn)
                    {
                        // Avoid duplicates
                        if !guests.iter().any(|g| g.id == guest.id)
                            && !guests_by_booking.iter().any(|g: &User| g.id == guest.id)
                        {
                            guests_by_booking.push(guest);
                        }
                    }
                }
            }
        }

        // Combine results
        let mut all_guests = guests;
        all_guests.extend(guests_by_booking);

        Ok(all_guests)
    }

    /// Get full guest profile with PII and booking history
    ///
    /// # Arguments
    /// * `guest_id` - The guest's UUID
    ///
    /// # Returns
    /// * `User` - Full guest user with all PII fields
    ///
    /// # Errors
    /// * `NotFound` - Guest not found
    /// * `Forbidden` - User is not a guest
    pub fn get_guest_profile(&self, guest_id: Uuid) -> AppResult<User> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let user: User = users::table
            .find(guest_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Guest not found".to_string()))?;

        if user.role != UserRole::Guest {
            return Err(AppError::Forbidden(
                "User is not a guest".to_string(),
            ));
        }

        Ok(user)
    }

    /// Get booking history for a guest
    ///
    /// # Arguments
    /// * `guest_id` - The guest's UUID
    ///
    /// # Returns
    /// * `Vec<BookingWithRoom>` - List of bookings with room details
    pub fn get_guest_booking_history(&self, guest_id: Uuid) -> AppResult<Vec<BookingWithRoom>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // First, get the guest's full name for matching staff-created bookings
        let guest: User = users::table
            .find(guest_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Guest not found".to_string()))?;

        // Get all bookings for this guest:
        // 1. Bookings created by the guest themselves (created_by_user_id = guest_id)
        // 2. Bookings created by staff with matching guest_name (for staff-created bookings)
        let mut all_bookings: Vec<Booking> = bookings::table
            .filter(bookings::created_by_user_id.eq(guest_id))
            .order(bookings::created_at.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Also get staff-created bookings that match guest's name (case-insensitive)
        if let Some(ref full_name) = guest.full_name {
            let staff_created_bookings: Vec<Booking> = bookings::table
                .filter(bookings::created_by_user_id.is_null())
                .filter(bookings::guest_name.ilike(full_name))
                .order(bookings::created_at.desc())
                .load(&mut conn)
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            // Add staff-created bookings, avoiding duplicates
            for booking in staff_created_bookings {
                if !all_bookings.iter().any(|b| b.id == booking.id) {
                    all_bookings.push(booking);
                }
            }
        }

        // Sort by created_at descending
        all_bookings.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        // Load room details for each booking
        use crate::models::Room;
        use crate::schema::rooms;

        let mut bookings_with_rooms = Vec::new();
        for booking in all_bookings {
            let room: Option<Room> = rooms::table
                .find(booking.room_id)
                .first(&mut conn)
                .optional()
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            bookings_with_rooms.push(BookingWithRoom {
                booking,
                room,
            });
        }

        Ok(bookings_with_rooms)
    }

    /// Update guest information (PII fields)
    ///
    /// # Arguments
    /// * `guest_id` - The guest's UUID
    /// * `update` - UpdateUser struct with fields to update
    ///
    /// # Returns
    /// * `User` - Updated guest user
    ///
    /// # Errors
    /// * `NotFound` - Guest not found
    /// * `Forbidden` - User is not a guest
    /// * `ValidationError` - Invalid update data
    pub fn update_guest(&self, guest_id: Uuid, update: UpdateUser) -> AppResult<User> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify guest exists and is a guest
        let existing: User = users::table
            .find(guest_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Guest not found".to_string()))?;

        if existing.role != UserRole::Guest {
            return Err(AppError::Forbidden(
                "Cannot update non-guest accounts through guest management".to_string(),
            ));
        }

        // Validate email if provided
        if let Some(ref email) = update.email {
            if email.is_empty() {
                return Err(AppError::ValidationError(
                    "Email cannot be empty".to_string(),
                ));
            }

            // Check if email is already taken by another user
            let existing_email: Option<User> = users::table
                .filter(users::email.eq(email))
                .filter(users::id.ne(guest_id))
                .first(&mut conn)
                .optional()
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            if existing_email.is_some() {
                return Err(AppError::ValidationError(
                    "Email already exists".to_string(),
                ));
            }
        }

        // Update user
        let updated_user: User = diesel::update(users::table.find(guest_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(updated_user)
    }

    /// Get all interaction notes for a guest
    ///
    /// # Arguments
    /// * `guest_id` - The guest's UUID
    ///
    /// # Returns
    /// * `Vec<GuestNote>` - List of interaction notes, ordered by created_at descending
    ///
    /// # Errors
    /// * `NotFound` - Guest not found
    pub fn get_guest_notes(&self, guest_id: Uuid) -> AppResult<Vec<GuestNote>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify guest exists
        let _guest: User = users::table
            .find(guest_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Guest not found".to_string()))?;

        let notes: Vec<GuestNote> = guest_interaction_notes::table
            .filter(guest_interaction_notes::guest_id.eq(guest_id))
            .order(guest_interaction_notes::created_at.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(notes)
    }

    /// Add an interaction note for a guest
    ///
    /// # Arguments
    /// * `guest_id` - The guest's UUID
    /// * `admin_id` - The admin user's UUID creating the note
    /// * `note` - The note content
    ///
    /// # Returns
    /// * `GuestNote` - The created note
    ///
    /// # Errors
    /// * `NotFound` - Guest or admin not found
    /// * `ValidationError` - Note is empty or too long
    pub fn add_guest_note(
        &self,
        guest_id: Uuid,
        admin_id: Uuid,
        note: &str,
    ) -> AppResult<GuestNote> {
        // Validate note
        if note.trim().is_empty() {
            return Err(AppError::ValidationError(
                "Note cannot be empty".to_string(),
            ));
        }

        if note.len() > 10000 {
            return Err(AppError::ValidationError(
                "Note must be 10,000 characters or less".to_string(),
            ));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify guest exists and is a guest
        let guest: User = users::table
            .find(guest_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Guest not found".to_string()))?;

        if guest.role != UserRole::Guest {
            return Err(AppError::Forbidden(
                "Cannot add notes for non-guest accounts".to_string(),
            ));
        }

        // Verify admin exists and is an admin
        let admin: User = users::table
            .find(admin_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Admin not found".to_string()))?;

        if admin.role != UserRole::Admin {
            return Err(AppError::Forbidden(
                "Only admins can create guest interaction notes".to_string(),
            ));
        }

        // Create note
        let new_note = NewGuestNote {
            guest_id,
            admin_id,
            note: note.trim(),
        };

        let created_note: GuestNote = diesel::insert_into(guest_interaction_notes::table)
            .values(&new_note)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(created_note)
    }
}

