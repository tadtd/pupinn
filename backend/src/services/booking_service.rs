use chrono::{NaiveDate, Utc};
use diesel::prelude::*;
use rand::Rng;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{
    Booking, BookingStatus, BookingWithRoom, NewBooking, Room, RoomStatus, UpdateBooking,
};
use crate::schema::{bookings, rooms};
use crate::services::RoomService;

/// Booking service for managing reservations
pub struct BookingService {
    pool: DbPool,
}

impl BookingService {
    /// Create a new BookingService instance
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Generate a unique booking reference in format BK-YYYYMMDD-XXXX
    pub fn generate_reference(&self) -> AppResult<String> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let today = Utc::now().format("%Y%m%d").to_string();
        let mut rng = rand::thread_rng();

        // Try up to 10 times to generate a unique reference
        for _ in 0..10 {
            let suffix: String = (0..4)
                .map(|_| {
                    let idx = rng.gen_range(0..36);
                    if idx < 10 {
                        (b'0' + idx) as char
                    } else {
                        (b'A' + idx - 10) as char
                    }
                })
                .collect();

            let reference = format!("BK-{}-{}", today, suffix);

            // Check if reference already exists
            let existing: Option<Booking> = bookings::table
                .filter(bookings::reference.eq(&reference))
                .first(&mut conn)
                .optional()
                .map_err(|e| AppError::DatabaseError(e.to_string()))?;

            if existing.is_none() {
                return Ok(reference);
            }
        }

        Err(AppError::InternalError(
            "Failed to generate unique booking reference".to_string(),
        ))
    }

    /// Validate booking dates
    pub fn validate_dates(
        &self,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
    ) -> AppResult<()> {
        let today = Utc::now().date_naive();

        // Check-in date must be today or in the future
        if check_in_date < today {
            return Err(AppError::ValidationError(
                "Check-in date cannot be in the past".to_string(),
            ));
        }

        // Check-out date must be after check-in date
        if check_out_date <= check_in_date {
            return Err(AppError::ValidationError(
                "Check-out date must be after check-in date".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if a room is available for the given date range
    pub fn check_availability(
        &self,
        room_id: Uuid,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
        exclude_booking_id: Option<Uuid>,
    ) -> AppResult<bool> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Find overlapping bookings that are not cancelled or checked out
        let mut query = bookings::table
            .filter(bookings::room_id.eq(room_id))
            .filter(bookings::status.ne(BookingStatus::Cancelled))
            .filter(bookings::status.ne(BookingStatus::CheckedOut))
            .filter(bookings::check_in_date.lt(check_out_date))
            .filter(bookings::check_out_date.gt(check_in_date))
            .into_boxed();

        // Exclude a specific booking (for updates)
        if let Some(booking_id) = exclude_booking_id {
            query = query.filter(bookings::id.ne(booking_id));
        }

        let conflicting: Vec<Booking> = query
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(conflicting.is_empty())
    }

    /// Create a new booking
    pub fn create_booking(
        &self,
        guest_name: &str,
        room_id: Uuid,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
    ) -> AppResult<Booking> {
        // Validate dates
        self.validate_dates(check_in_date, check_out_date)?;

        // Check room exists and get its info
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        // Check room is not under maintenance
        if room.status == RoomStatus::Maintenance {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is under maintenance",
                room.number
            )));
        }

        // Check availability
        if !self.check_availability(room_id, check_in_date, check_out_date, None)? {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is not available for the selected dates",
                room.number
            )));
        }

        // Generate reference
        let reference = self.generate_reference()?;

        // Validate guest name
        if guest_name.trim().is_empty() {
            return Err(AppError::ValidationError(
                "Guest name is required".to_string(),
            ));
        }

        if guest_name.len() > 100 {
            return Err(AppError::ValidationError(
                "Guest name must be 100 characters or less".to_string(),
            ));
        }

        let new_booking = NewBooking {
            reference: &reference,
            guest_name: guest_name.trim(),
            room_id,
            check_in_date,
            check_out_date,
            created_by_user_id: None,
            creation_source: "staff",
        };

        diesel::insert_into(bookings::table)
            .values(&new_booking)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Get a booking by ID
    pub fn get_booking_by_id(&self, booking_id: Uuid) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        bookings::table
            .find(booking_id)
            .first(&mut conn)
            .map_err(|_| {
                AppError::NotFound(format!("Booking with ID '{}' not found", booking_id))
            })
    }

    /// Get a booking by reference
    pub fn get_booking_by_reference(&self, reference: &str) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        bookings::table
            .filter(bookings::reference.eq(reference))
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Booking '{}' not found", reference)))
    }

    /// Get a booking with room details
    pub fn get_booking_with_room(&self, booking_id: Uuid) -> AppResult<BookingWithRoom> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking = bookings::table.find(booking_id).first(&mut conn).map_err(
            |_| AppError::NotFound(format!("Booking with ID '{}' not found", booking_id)),
        )?;

        let room: Option<Room> = rooms::table
            .find(booking.room_id)
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(BookingWithRoom { booking, room })
    }

    /// List bookings with optional filters
    pub fn list_bookings(
        &self,
        status_filter: Option<BookingStatus>,
        guest_name_filter: Option<&str>,
        from_date: Option<NaiveDate>,
        to_date: Option<NaiveDate>,
    ) -> AppResult<Vec<BookingWithRoom>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut query = bookings::table.into_boxed();

        if let Some(status) = status_filter {
            query = query.filter(bookings::status.eq(status));
        }

        if let Some(name) = guest_name_filter {
            let pattern = format!("%{}%", name);
            query = query.filter(bookings::guest_name.ilike(pattern));
        }

        if let Some(from) = from_date {
            query = query.filter(bookings::check_in_date.ge(from));
        }

        if let Some(to) = to_date {
            query = query.filter(bookings::check_in_date.le(to));
        }

        let booking_list: Vec<Booking> = query
            .order(bookings::check_in_date.asc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Load rooms for all bookings
        let room_ids: Vec<Uuid> = booking_list.iter().map(|b| b.room_id).collect();
        let rooms_list: Vec<Room> = rooms::table
            .filter(rooms::id.eq_any(&room_ids))
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Map rooms to bookings
        let result: Vec<BookingWithRoom> = booking_list
            .into_iter()
            .map(|booking| {
                let room = rooms_list.iter().find(|r| r.id == booking.room_id).cloned();
                BookingWithRoom { booking, room }
            })
            .collect();

        Ok(result)
    }

    /// Check in a guest
    pub fn check_in(&self, booking_id: Uuid, confirm_early: bool) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking =
            bookings::table
                .find(booking_id)
                .first(&mut conn)
                .map_err(|_| {
                    AppError::NotFound(format!("Booking with ID '{}' not found", booking_id))
                })?;

        // Validate status transition
        if !booking.status.can_transition_to(BookingStatus::CheckedIn) {
            return Err(AppError::InvalidStatusTransition(format!(
                "Cannot check in booking with status {:?}",
                booking.status
            )));
        }

        // Check if it's early check-in
        let today = Utc::now().date_naive();
        if booking.check_in_date > today && !confirm_early {
            return Err(AppError::ValidationError(format!(
                "Check-in date is {}. Confirm early check-in to proceed.",
                booking.check_in_date
            )));
        }

        // Update booking status
        let update = UpdateBooking {
            status: Some(BookingStatus::CheckedIn),
            ..Default::default()
        };

        let updated_booking: Booking = diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Update room status to occupied
        // First check current room status - if dirty, set to available first
        let room_service = RoomService::new(self.pool.clone());
        let current_room = room_service.get_room_by_id(booking.room_id)?;
        
        // If room is dirty, we need to set it to available first (dirty -> available -> occupied)
        // This handles the case where a room was checked out but not yet cleaned
        if current_room.status == RoomStatus::Dirty {
            room_service.update_room_status(booking.room_id, RoomStatus::Available)?;
        }
        
        // Now set to occupied (available -> occupied is allowed)
        room_service.update_room_status(booking.room_id, RoomStatus::Occupied)?;

        Ok(updated_booking)
    }

    /// Check out a guest
    pub fn check_out(&self, booking_id: Uuid) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking =
            bookings::table
                .find(booking_id)
                .first(&mut conn)
                .map_err(|_| {
                    AppError::NotFound(format!("Booking with ID '{}' not found", booking_id))
                })?;

        // Validate status transition
        if !booking.status.can_transition_to(BookingStatus::CheckedOut) {
            return Err(AppError::InvalidStatusTransition(format!(
                "Cannot check out booking with status {:?}. Guest must be checked in first.",
                booking.status
            )));
        }

        // Update booking status
        let update = UpdateBooking {
            status: Some(BookingStatus::CheckedOut),
            ..Default::default()
        };

        let updated_booking: Booking = diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Update room status to dirty so cleaners can pick it up immediately
        let room_service = RoomService::new(self.pool.clone());
        room_service.update_room_status(booking.room_id, RoomStatus::Dirty)?;

        Ok(updated_booking)
    }

    /// Cancel a booking
    pub fn cancel(&self, booking_id: Uuid) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking =
            bookings::table
                .find(booking_id)
                .first(&mut conn)
                .map_err(|_| {
                    AppError::NotFound(format!("Booking with ID '{}' not found", booking_id))
                })?;

        // Validate status transition
        if !booking.status.can_transition_to(BookingStatus::Cancelled) {
            return Err(AppError::InvalidStatusTransition(format!(
                "Cannot cancel booking with status {:?}. Only upcoming bookings can be cancelled.",
                booking.status
            )));
        }

        // Update booking status
        let update = UpdateBooking {
            status: Some(BookingStatus::Cancelled),
            ..Default::default()
        };

        diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Create a new booking for a guest user
    ///
    /// This method is used when a guest creates a booking through the guest portal.
    /// The guest's user_id is recorded, and the guest's name is used from their account.
    ///
    /// # Arguments
    /// * `user_id` - The UUID of the guest user creating the booking
    /// * `guest_name` - The name to use for the booking (typically the guest's full name)
    /// * `room_id` - The room to book
    /// * `check_in_date` - Check-in date
    /// * `check_out_date` - Check-out date
    pub fn create_guest_booking(
        &self,
        user_id: Uuid,
        guest_name: &str,
        room_id: Uuid,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
    ) -> AppResult<BookingWithRoom> {
        // Validate dates
        self.validate_dates(check_in_date, check_out_date)?;

        // Check room exists and get its info
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        // Check room is not under maintenance
        if room.status == RoomStatus::Maintenance {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is under maintenance",
                room.number
            )));
        }

        // Check availability
        if !self.check_availability(room_id, check_in_date, check_out_date, None)? {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is not available for the selected dates",
                room.number
            )));
        }

        // Generate reference
        let reference = self.generate_reference()?;

        // Validate guest name
        if guest_name.trim().is_empty() {
            return Err(AppError::ValidationError(
                "Guest name is required".to_string(),
            ));
        }

        if guest_name.len() > 100 {
            return Err(AppError::ValidationError(
                "Guest name must be 100 characters or less".to_string(),
            ));
        }

        let new_booking = NewBooking {
            reference: &reference,
            guest_name: guest_name.trim(),
            room_id,
            check_in_date,
            check_out_date,
            created_by_user_id: Some(user_id),
            creation_source: "guest",
        };

        let booking: Booking = diesel::insert_into(bookings::table)
            .values(&new_booking)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(BookingWithRoom {
            booking,
            room: Some(room),
        })
    }

    /// List bookings for a specific user (guest)
    ///
    /// Returns all bookings created by the specified user, ordered by check-in date.
    ///
    /// # Arguments
    /// * `user_id` - The UUID of the user whose bookings to list
    /// * `status_filter` - Optional status filter
    pub fn list_bookings_by_user(
        &self,
        user_id: Uuid,
        status_filter: Option<BookingStatus>,
    ) -> AppResult<Vec<BookingWithRoom>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut query = bookings::table
            .filter(bookings::created_by_user_id.eq(user_id))
            .into_boxed();

        if let Some(status) = status_filter {
            query = query.filter(bookings::status.eq(status));
        }

        let booking_list: Vec<Booking> = query
            .order(bookings::check_in_date.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Load rooms for all bookings
        let room_ids: Vec<Uuid> = booking_list.iter().map(|b| b.room_id).collect();
        let rooms_list: Vec<Room> = rooms::table
            .filter(rooms::id.eq_any(&room_ids))
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Map rooms to bookings
        let result: Vec<BookingWithRoom> = booking_list
            .into_iter()
            .map(|booking| {
                let room = rooms_list.iter().find(|r| r.id == booking.room_id).cloned();
                BookingWithRoom { booking, room }
            })
            .collect();

        Ok(result)
    }

    /// Get a booking by ID with ownership check
    ///
    /// Returns the booking only if it belongs to the specified user.
    ///
    /// # Arguments
    /// * `booking_id` - The booking ID
    /// * `user_id` - The user ID to verify ownership
    pub fn get_guest_booking(
        &self,
        booking_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<BookingWithRoom> {
        let booking_with_room = self.get_booking_with_room(booking_id)?;

        // Verify ownership
        if booking_with_room.booking.created_by_user_id != Some(user_id) {
            return Err(AppError::NotFound("Booking not found".to_string()));
        }

        Ok(booking_with_room)
    }

    /// Cancel a guest booking with ownership check
    ///
    /// Cancels the booking only if it belongs to the specified user and is in "upcoming" status.
    ///
    /// # Arguments
    /// * `booking_id` - The booking ID
    /// * `user_id` - The user ID to verify ownership
    pub fn cancel_guest_booking(
        &self,
        booking_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking =
            bookings::table
                .find(booking_id)
                .first(&mut conn)
                .map_err(|_| AppError::NotFound("Booking not found".to_string()))?;

        // Verify ownership
        if booking.created_by_user_id != Some(user_id) {
            return Err(AppError::NotFound("Booking not found".to_string()));
        }

        // Validate status - only upcoming bookings can be cancelled
        if booking.status != BookingStatus::Upcoming {
            return Err(AppError::InvalidStatusTransition(
                "Only upcoming bookings can be cancelled".to_string(),
            ));
        }

        // Update booking status
        let update = UpdateBooking {
            status: Some(BookingStatus::Cancelled),
            ..Default::default()
        };

        diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }
}

