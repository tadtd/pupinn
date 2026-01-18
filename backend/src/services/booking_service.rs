use chrono::{NaiveDate, Utc, Duration};
use diesel::prelude::*;
use diesel::dsl::{count, sum, avg};
use diesel::result::{QueryResult, DatabaseErrorInformation};
use rand::Rng;
use bigdecimal::BigDecimal;
use std::str::FromStr;
use serde::Serialize;
use uuid::Uuid;

/// Simple error wrapper for database errors
struct StringError(String);

impl DatabaseErrorInformation for StringError {
    fn message(&self) -> &str {
        &self.0
    }

    fn details(&self) -> Option<&str> {
        None
    }

    fn hint(&self) -> Option<&str> {
        None
    }

    fn table_name(&self) -> Option<&str> {
        None
    }

    fn column_name(&self) -> Option<&str> {
        None
    }

    fn constraint_name(&self) -> Option<&str> {
        None
    }

    fn statement_position(&self) -> Option<i32> {
        None
    }
}

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{
    Booking, BookingStatus, BookingWithRoom, BookingWithPayments, NewBooking, Room, RoomStatus, RoomType, UpdateBooking,
};
use crate::schema::{bookings, rooms};

/// Booking service for managing reservations
pub struct BookingService {
    pool: DbPool,
}

/// Financial metrics for a room
#[derive(Debug, Clone, Serialize)]
pub struct RoomFinancials {
    pub room_id: Uuid,
    pub total_revenue: BigDecimal,
    pub booking_count: i64,
    pub average_revenue: Option<BigDecimal>,
    pub occupancy_rate: f64,
}

impl BookingService {
    /// Create a new BookingService instance
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Get default price for a room type
    #[allow(dead_code)]
    fn get_default_price_for_room_type(room_type: RoomType) -> BigDecimal {
        match room_type {
            // Default prices in VND
            RoomType::Single => BigDecimal::from_str("1000000").unwrap(),
            RoomType::Double => BigDecimal::from_str("1500000").unwrap(),
            RoomType::Suite => BigDecimal::from_str("2500000").unwrap(),
        }
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

        // Find overlapping bookings that block availability
        let mut query = bookings::table
            .filter(bookings::room_id.eq(room_id))
            .filter(bookings::status.ne(BookingStatus::Cancelled))
            .filter(bookings::status.ne(BookingStatus::CheckedOut))
            .filter(bookings::check_in_date.lt(check_out_date))
            .filter(bookings::check_out_date.gt(check_in_date))
            .into_boxed();

        if let Some(booking_id) = exclude_booking_id {
            query = query.filter(bookings::id.ne(booking_id));
        }

        let conflicting: Vec<Booking> = query
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check room status only for immediate bookings (check-in today)
        // Future bookings can be made on Dirty/Cleaning/Occupied rooms since
        // they will be available by the check-in date.
        // Maintenance rooms are always blocked as maintenance duration is unpredictable.
        let today = Utc::now().date_naive();
        let room_rec: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Maintenance always blocks bookings
        if room_rec.status == RoomStatus::Maintenance {
            return Ok(false);
        }

        // For same-day check-in, room must be Available or at least cleanable
        if check_in_date == today {
            // Room must be Available, Dirty, or Cleaning for same-day check-in
            // Occupied rooms cannot accept same-day bookings
            if room_rec.status == RoomStatus::Occupied {
                return Ok(false);
            }
        }

        Ok(conflicting.is_empty())
    }

    /// Create a new booking
    pub fn create_booking(
        &self,
        guest_name: &str,
        room_id: Uuid,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
        price: Option<BigDecimal>,
    ) -> AppResult<Booking> {
        self.validate_dates(check_in_date, check_out_date)?;

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        // Maintenance rooms are always blocked
        if room.status == RoomStatus::Maintenance {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is under maintenance",
                room.number
            )));
        }

        // check_availability handles both booking conflicts and room status checks
        if !self.check_availability(room_id, check_in_date, check_out_date, None)? {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is not available for the selected dates",
                room.number
            )));
        }

        let reference = self.generate_reference()?;

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

        let booking_price = price.unwrap_or_else(|| {
            let nights = (check_out_date - check_in_date).num_days();
            &room.price * BigDecimal::from(nights.max(1))
        });

        let new_booking = NewBooking {
            reference: &reference,
            guest_name: guest_name.trim(),
            room_id,
            check_in_date,
            check_out_date,
            created_by_user_id: None,
            creation_source: "staff",
            price: booking_price,
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

    /// Get a booking with room and payment summary
    #[allow(dead_code)]
    pub fn get_booking_with_payments(&self, booking_id: Uuid) -> AppResult<BookingWithPayments> {
        let booking_with_room = self.get_booking_with_room(booking_id)?;
        
        // Get payment summary
        let payment_service = crate::services::PaymentService::new(self.pool.clone());
        let payment_summary = payment_service.get_payment_summary(booking_id).ok();
        
        Ok(BookingWithPayments {
            booking: booking_with_room.booking,
            room: booking_with_room.room,
            payment_summary,
        })
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

        let room_ids: Vec<Uuid> = booking_list.iter().map(|b| b.room_id).collect();
        let rooms_list: Vec<Room> = rooms::table
            .filter(rooms::id.eq_any(&room_ids))
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let result: Vec<BookingWithRoom> = booking_list
            .into_iter()
            .map(|booking| {
                let room = rooms_list.iter().find(|r| r.id == booking.room_id).cloned();
                BookingWithRoom { booking, room }
            })
            .collect();

        Ok(result)
    }

    #[allow(dead_code)]
    pub fn get_guest_bookings(
        &self,
        guest_name_input: &str,
        status_filter: Option<BookingStatus>,
    ) -> AppResult<Vec<BookingWithRoom>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        use crate::schema::bookings::dsl as b;
        use crate::schema::rooms::dsl as r;

        let mut query = b::bookings
            .inner_join(r::rooms)
            .into_boxed();

        query = query.filter(b::guest_name.eq(guest_name_input));

        if let Some(s) = status_filter {
            query = query.filter(b::status.eq(s));
        }

        let results: Vec<(Booking, Room)> = query
            .order(b::created_at.desc())
            .load::<(Booking, Room)>(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let response = results.into_iter().map(|(booking, room)| {
            BookingWithRoom {
                booking,
                room: Some(room)
            }
        }).collect();

        Ok(response)
    }

    /// Create a new booking for a guest user
    pub fn create_guest_booking(
        &self,
        user_id: Uuid,
        guest_name: &str,
        room_id: Uuid,
        check_in_date: NaiveDate,
        check_out_date: NaiveDate,
        price: Option<BigDecimal>,
    ) -> AppResult<BookingWithRoom> {
        self.validate_dates(check_in_date, check_out_date)?;

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room: Room = rooms::table
            .find(room_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Room with ID '{}' not found", room_id)))?;

        // Maintenance rooms are always blocked
        if room.status == RoomStatus::Maintenance {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is under maintenance",
                room.number
            )));
        }

        // check_availability handles both booking conflicts and room status checks
        if !self.check_availability(room_id, check_in_date, check_out_date, None)? {
            return Err(AppError::RoomUnavailable(format!(
                "Room {} is not available for the selected dates",
                room.number
            )));
        }

        let reference = self.generate_reference()?;

        if guest_name.trim().is_empty() {
            return Err(AppError::ValidationError(
                "Guest name is required".to_string(),
            ));
        }

        let booking_price = price.unwrap_or_else(|| {
            let nights = (check_out_date - check_in_date).num_days();
            &room.price * BigDecimal::from(nights.max(1))
        });

        let new_booking = NewBooking {
            reference: &reference,
            guest_name: guest_name.trim(),
            room_id,
            check_in_date,
            check_out_date,
            created_by_user_id: Some(user_id),
            creation_source: "guest",
            price: booking_price,
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

    /// List bookings by user ID
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
            .filter(bookings::created_by_user_id.eq(Some(user_id)))
            .into_boxed();

        if let Some(status) = status_filter {
            query = query.filter(bookings::status.eq(status));
        }

        let booking_list: Vec<Booking> = query
            .order(bookings::check_in_date.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room_ids: Vec<Uuid> = booking_list.iter().map(|b| b.room_id).collect();
        let rooms_list: Vec<Room> = rooms::table
            .filter(rooms::id.eq_any(&room_ids))
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let result: Vec<BookingWithRoom> = booking_list
            .into_iter()
            .map(|booking| {
                let room = rooms_list.iter().find(|r| r.id == booking.room_id).cloned();
                BookingWithRoom { booking, room }
            })
            .collect();

        Ok(result)
    }

    /// Get a booking for a specific user (ownership check)
    pub fn get_guest_booking(
        &self,
        booking_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<BookingWithRoom> {
        let booking_with_room = self.get_booking_with_room(booking_id)?;

        if booking_with_room.booking.created_by_user_id != Some(user_id) {
            return Err(AppError::NotFound("Booking not found".to_string()));
        }

        Ok(booking_with_room)
    }

    /// Cancel a booking for a specific user
    pub fn cancel_guest_booking(
        &self,
        booking_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking = bookings::table
            .find(booking_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("Booking not found".to_string()))?;

        if booking.created_by_user_id != Some(user_id) {
            return Err(AppError::NotFound("Booking not found".to_string()));
        }

        if booking.status != BookingStatus::Upcoming {
            return Err(AppError::InvalidStatusTransition(
                "Only upcoming bookings can be cancelled".to_string(),
            ));
        }

        let update = UpdateBooking {
            status: Some(BookingStatus::Cancelled),
            ..Default::default()
        };

        diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Check in a guest
    pub fn check_in(&self, booking_id: Uuid, confirm_early: bool) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        fn app_error_to_diesel(e: AppError) -> diesel::result::Error {
            diesel::result::Error::DatabaseError(
                diesel::result::DatabaseErrorKind::CheckViolation,
                Box::new(StringError(e.to_string())) as Box<dyn DatabaseErrorInformation + Send + Sync>,
            )
        }

        conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let booking: Booking = bookings::table
                .find(booking_id)
                .first(conn)
                .map_err(|_| diesel::result::Error::NotFound)?;

            if !booking.status.can_transition_to(BookingStatus::CheckedIn) {
                return Err(app_error_to_diesel(AppError::InvalidStatusTransition(format!(
                    "Cannot check in booking with status {:?}",
                    booking.status
                ))));
            }

            let today = Utc::now().date_naive();
            let actual_check_in_date = if booking.check_in_date > today && confirm_early {
                today  // Early check-in: use today instead of original check-in date
            } else {
                booking.check_in_date
            };

            if booking.check_in_date > today && !confirm_early {
                return Err(app_error_to_diesel(AppError::ValidationError(format!(
                    "Check-in date is {}. Confirm early check-in to proceed.",
                    booking.check_in_date
                ))));
            }

            // For early check-in, validate room availability on the actual check-in date
            if actual_check_in_date < booking.check_in_date {
                // Check if room is available for the early check-in date
                let conflicting: Vec<Booking> = bookings::table
                    .filter(bookings::room_id.eq(booking.room_id))
                    .filter(bookings::id.ne(booking_id))
                    .filter(bookings::status.ne(BookingStatus::Cancelled))
                    .filter(bookings::status.ne(BookingStatus::CheckedOut))
                    .filter(bookings::check_in_date.lt(booking.check_out_date))
                    .filter(bookings::check_out_date.gt(actual_check_in_date))
                    .load(conn)
                    .map_err(|e| diesel::result::Error::DatabaseError(
                        diesel::result::DatabaseErrorKind::CheckViolation,
                        Box::new(StringError(format!("Failed to check availability: {}", e))) as Box<dyn DatabaseErrorInformation + Send + Sync>,
                    ))?;

                if !conflicting.is_empty() {
                    return Err(app_error_to_diesel(AppError::RoomUnavailable(format!(
                        "Room is not available for early check-in on {}. Another booking is active until {}.",
                        actual_check_in_date,
                        conflicting[0].check_out_date
                    ))));
                }
            }

            let current_room: Room = rooms::table
                .find(booking.room_id)
                .first(conn)
                .map_err(|_| diesel::result::Error::NotFound)?;

            if current_room.status == RoomStatus::Maintenance {
                return Err(app_error_to_diesel(AppError::RoomUnavailable(
                    "Room is under maintenance".to_string(),
                )));
            }

            // For early check-in on the actual date, also check if room is currently occupied
            if actual_check_in_date == today && current_room.status == RoomStatus::Occupied {
                // Check if there's an active booking that's still checked in
                let active_booking: Option<Booking> = bookings::table
                    .filter(bookings::room_id.eq(booking.room_id))
                    .filter(bookings::id.ne(booking_id))
                    .filter(bookings::status.eq(BookingStatus::CheckedIn))
                    .filter(bookings::check_out_date.gt(today))
                    .first(conn)
                    .optional()
                    .map_err(|e| diesel::result::Error::DatabaseError(
                        diesel::result::DatabaseErrorKind::CheckViolation,
                        Box::new(StringError(format!("Failed to check room occupancy: {}", e))) as Box<dyn DatabaseErrorInformation + Send + Sync>,
                    ))?;

                if active_booking.is_some() {
                    let active = active_booking.unwrap();
                    return Err(app_error_to_diesel(AppError::RoomUnavailable(format!(
                        "Room is currently occupied by another guest until {}",
                        active.check_out_date
                    ))));
                }
            }

            // Update booking status and check-in date if doing early check-in
            let rows_updated = if actual_check_in_date < booking.check_in_date {
                // Early check-in: update both status and check-in date
                diesel::update(
                    bookings::table
                        .find(booking_id)
                        .filter(bookings::status.eq(booking.status)),
                )
                .set((
                    bookings::status.eq(BookingStatus::CheckedIn),
                    bookings::check_in_date.eq(actual_check_in_date),
                ))
                .execute(conn)?
            } else {
                // Normal check-in: only update status
                diesel::update(
                    bookings::table
                        .find(booking_id)
                        .filter(bookings::status.eq(booking.status)),
                )
                .set(bookings::status.eq(BookingStatus::CheckedIn))
                .execute(conn)?
            };

            if rows_updated == 0 {
                return Err(app_error_to_diesel(AppError::Conflict(
                    "Booking status was updated by another operation.".to_string(),
                )));
            }

            // Set room to Occupied directly (no need to set Available first)
            diesel::update(rooms::table.find(booking.room_id))
                .set(rooms::status.eq(RoomStatus::Occupied))
                .execute(conn)?;

            bookings::table
                .find(booking_id)
                .first(conn)
                .map_err(|_| diesel::result::Error::NotFound)
        })
        .map_err(|e| AppError::from(e))
    }

    /// Check out a guest
    pub fn check_out(&self, booking_id: Uuid, _confirm_early: bool) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        fn app_error_to_diesel(e: AppError) -> diesel::result::Error {
            diesel::result::Error::DatabaseError(
                diesel::result::DatabaseErrorKind::CheckViolation,
                Box::new(StringError(e.to_string())) as Box<dyn DatabaseErrorInformation + Send + Sync>,
            )
        }

        conn.transaction::<_, diesel::result::Error, _>(|conn| {
            let booking: Booking = bookings::table
                .find(booking_id)
                .first(conn)
                .map_err(|_| diesel::result::Error::NotFound)?;

            if !booking.status.can_transition_to(BookingStatus::CheckedOut) {
                return Err(app_error_to_diesel(AppError::InvalidStatusTransition(format!(
                    "Cannot check out booking with status {:?}.",
                    booking.status
                ))));
            }

            // Allow staff to perform an early check-out without requiring an explicit
            // confirmation flag. Previously we prevented check-outs when the
            // booking's check-out date was in the future unless `confirm_early`
            // was true — this blocked legitimate early check-outs initiated by
            // staff or guests. For now, permit early check-outs unconditionally.
            let _today = Utc::now().date_naive();

            let current_room: Room = rooms::table
                .find(booking.room_id)
                .first(conn)
                .map_err(|_| diesel::result::Error::NotFound)?;

            // Note: can_transition_to already validated that only CheckedIn or Overstay
            // bookings can check out, so no additional status check needed here.

            // Update the booking's check_out_date to today (or at least
            // `check_in_date + 1`) and adjust the price so financial reports
            // reflect the actual stay. Database enforces `check_out_date >
            // check_in_date`, so ensure we respect that constraint.
            let today = Utc::now().date_naive();
            let min_checkout = booking.check_in_date + Duration::days(1);
            let desired_checkout = if today > min_checkout { today } else { min_checkout };

            let nights_i64 = (desired_checkout - booking.check_in_date).num_days().max(1);
            let nights = BigDecimal::from(nights_i64);
            let new_price = current_room.price.clone() * nights;

            // Perform the update and return the updated booking row. Using
            // `get_result` surfaces database errors with better context.
            let updated_booking: Booking = diesel::update(
                bookings::table
                    .find(booking_id)
                    .filter(bookings::status.eq(booking.status)),
            )
            .set((
                bookings::status.eq(BookingStatus::CheckedOut),
                bookings::check_out_date.eq(desired_checkout),
                bookings::price.eq(new_price.clone()),
            ))
            .get_result(conn)?;

            // Mark the room as dirty after successful check-out
            diesel::update(rooms::table.find(booking.room_id))
                .set(rooms::status.eq(RoomStatus::Dirty))
                .execute(conn)?;

            Ok(updated_booking)
        })
        .map_err(|e| AppError::from(e))
    }

    /// Cancel a booking
    pub fn cancel(&self, booking_id: Uuid) -> AppResult<Booking> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking: Booking = bookings::table
            .find(booking_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Booking '{}' not found", booking_id)))?;

        if !booking.status.can_transition_to(BookingStatus::Cancelled) {
            return Err(AppError::InvalidStatusTransition(format!(
                "Cannot cancel booking with status {:?}.",
                booking.status
            )));
        }

        let update = UpdateBooking {
            status: Some(BookingStatus::Cancelled),
            ..Default::default()
        };

        diesel::update(bookings::table.find(booking_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Calculate financial metrics for a room
    #[allow(dead_code)]
    pub fn calculate_room_financials(
        &self,
        room_id: Uuid,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> AppResult<RoomFinancials> {
        self.calculate_room_financials_with_payments(room_id, start_date, end_date, false)
    }

    /// Calculate financial metrics for a room, optionally using actual payments
    pub fn calculate_room_financials_with_payments(
        &self,
        room_id: Uuid,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
        _use_payments: bool,
    ) -> AppResult<RoomFinancials> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let build_query = || {
            let mut query = bookings::table
                .into_boxed()
                .filter(bookings::room_id.eq(room_id))
                .filter(bookings::status.eq(BookingStatus::CheckedOut));

            // If both start and end are provided, select bookings that overlap
            // the date interval [start, end] (i.e. check_in_date <= end AND
            // check_out_date >= start). If only one bound is provided, fall
            // back to filtering by check_out_date as before.
            if let (Some(start), Some(end)) = (start_date, end_date) {
                query = query.filter(bookings::check_in_date.le(end));
                query = query.filter(bookings::check_out_date.ge(start));
            } else {
                if let Some(start) = start_date {
                    query = query.filter(bookings::check_out_date.ge(start));
                }
                if let Some(end) = end_date {
                    query = query.filter(bookings::check_out_date.le(end));
                }
            }

            query
        };

        let total_revenue: Option<BigDecimal> = build_query()
            .select(sum(bookings::price))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let booking_count: i64 = build_query()
            .select(count(bookings::id))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let average_revenue: Option<BigDecimal> = build_query()
            .select(avg(bookings::price))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let occupancy_rate = if let (Some(start), Some(end)) = (start_date, end_date) {
            let total_days = (end - start).num_days() as f64 + 1.0;
            if total_days > 0.0 {
                let bookings_in_period: Vec<Booking> = bookings::table
                    .filter(bookings::room_id.eq(room_id))
                    .filter(bookings::status.eq(BookingStatus::CheckedOut))
                    .filter(bookings::check_in_date.le(end))
                    .filter(bookings::check_out_date.ge(start))
                    .load(&mut conn)
                    .map_err(|e| AppError::DatabaseError(e.to_string()))?;

                let total_days_occupied: i64 = bookings_in_period
                    .iter()
                    .map(|b| {
                        let booking_start = b.check_in_date.max(start);
                        let booking_end = b.check_out_date.min(end);
                        (booking_end - booking_start).num_days().max(0)
                    })
                    .sum();

                (total_days_occupied as f64 / total_days) * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        };

        Ok(RoomFinancials {
            room_id,
            total_revenue: total_revenue.unwrap_or_else(|| BigDecimal::from(0)),
            booking_count,
            average_revenue,
            occupancy_rate: occupancy_rate.min(100.0).max(0.0),
        })
    }

    /// Get time-series revenue data grouped by date
    pub fn get_revenue_time_series(
        &self,
        room_id: Option<Uuid>,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> AppResult<Vec<(NaiveDate, BigDecimal)>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut query = bookings::table
            .into_boxed()
            .filter(bookings::status.eq(BookingStatus::CheckedOut));

        if let Some(room_id) = room_id {
            query = query.filter(bookings::room_id.eq(room_id));
        }

        if let Some(start) = start_date {
            query = query.filter(bookings::check_out_date.ge(start));
        }

        if let Some(end) = end_date {
            query = query.filter(bookings::check_out_date.le(end));
        }

        let bookings_list: Vec<Booking> = query
            .order(bookings::check_out_date.asc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Group by date and sum revenue
        use std::collections::HashMap;
        let mut revenue_by_date: HashMap<NaiveDate, BigDecimal> = HashMap::new();

        for booking in bookings_list {
            let date = booking.check_out_date;
            let revenue = revenue_by_date.entry(date).or_insert_with(|| BigDecimal::from(0));
            *revenue += &booking.price;
        }

        let mut result: Vec<(NaiveDate, BigDecimal)> = revenue_by_date.into_iter().collect();
        result.sort_by_key(|(date, _)| *date);

        Ok(result)
    }

    /// Get booking history for a specific room
    pub fn get_room_booking_history(
        &self,
        room_id: Uuid,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> AppResult<Vec<BookingWithRoom>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let mut query = bookings::table
            .into_boxed()
            .filter(bookings::room_id.eq(room_id))
            .filter(bookings::status.eq(BookingStatus::CheckedOut));

        if let Some(start) = start_date {
            query = query.filter(bookings::check_out_date.ge(start));
        }

        if let Some(end) = end_date {
            query = query.filter(bookings::check_out_date.le(end));
        }

        let booking_list: Vec<Booking> = query
            .order(bookings::check_out_date.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let room: Option<Room> = rooms::table
            .find(room_id)
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let result: Vec<BookingWithRoom> = booking_list
            .into_iter()
            .map(|booking| BookingWithRoom {
                booking,
                room: room.clone(),
            })
            .collect();

        Ok(result)
    }

    /// Handle stale bookings
    pub fn handle_stale_bookings(&self, conn: &mut PgConnection) -> QueryResult<(usize, usize)> {
        use crate::schema::bookings::dsl::*;
        let today = chrono::Utc::now().naive_utc().date();

        // No-show handling removed - upcoming bookings past check-in date remain as upcoming
        let no_show_count = 0;

        let overstay_count = diesel::update(bookings)
            .filter(status.eq(BookingStatus::CheckedIn))
            .filter(check_out_date.lt(today))
            .set(status.eq(BookingStatus::Overstay))
            .execute(conn)?;

        Ok((no_show_count, overstay_count))
    }
}