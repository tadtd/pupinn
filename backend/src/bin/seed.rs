// bin/seed.rs
use diesel::prelude::*;
use dotenvy::dotenv;
use bigdecimal::BigDecimal;
use std::str::FromStr;
use std::env;
use chrono::{Utc, Duration, NaiveDate}; // Needed for booking dates

// Import from the main crate
use hotel_management_backend::db::create_pool;
use hotel_management_backend::models::{
    NewRoom, NewUser, NewGuestUser, RoomType, UserRole, RoomStatus, 
    NewBooking, BookingStatus // Ensure these are exported in your models
};
use hotel_management_backend::schema::{rooms, users, bookings};
use hotel_management_backend::services::AuthService;

fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = create_pool(&database_url);
    let mut conn = pool.get().expect("Failed to get database connection");

    println!("🌱 Seeding database...\n");

    // 1. Seed Users
    seed_users(&mut conn);

    // 2. Seed Rooms (Must come before bookings)
    seed_rooms(&mut conn);

    // 3. Seed Bookings
    seed_bookings(&mut conn);

    println!("\n✅ Database seeding complete!");
}

fn seed_users(conn: &mut PgConnection) {
    println!("Creating users...");

    // Staff users
    let staff_users_data = vec![
        ("admin", "admin123", UserRole::Admin),
        ("reception", "reception123", UserRole::Receptionist),
        ("cleaner", "cleaner123", UserRole::Cleaner),
    ];

    for (username, password, role) in staff_users_data {
        let existing: Option<hotel_management_backend::models::User> = users::table
            .filter(users::username.eq(username))
            .first(conn)
            .optional()
            .expect("Failed to query users");

        let password_hash = AuthService::hash_password(password).expect("Failed to hash password");

        if let Some(_) = existing {
            diesel::update(users::table.filter(users::username.eq(username)))
                .set((
                    users::password_hash.eq(&password_hash),
                    users::role.eq(role),
                    users::deactivated_at.eq(None::<chrono::DateTime<chrono::Utc>>),
                ))
                .execute(conn)
                .expect("Failed to update user");
            println!("  🔄 Updated user '{}'", username);
        } else {
            let new_user = NewUser {
                username: Some(username),
                password_hash: &password_hash,
                role,
                email: None,
                full_name: None,
                id_number: None,
                phone: None,
            };
            diesel::insert_into(users::table)
                .values(&new_user)
                .execute(conn)
                .expect("Failed to insert user");
            println!("  ✅ Created user '{}'", username);
        }
    }

    // Guest users - create actual guest accounts for the bookings
    println!("\nCreating guest users...");
    use hotel_management_backend::models::NewGuestUser;
    
    let guest_users_data = vec![
        ("tien-dat.do@example.com", "guest123", "Tien-Dat Do", Some("0901234567"), Some("ID001")),
        ("tien-dat.dam@example.com", "guest123", "Tien-Dat Dam", Some("0901234568"), Some("ID002")),
        ("bao-huy.pham@example.com", "guest123", "Bao-Huy Pham", Some("0901234569"), Some("ID003")),
        ("minh-tuan.nguyen@example.com", "guest123", "Minh-Tuan Nguyen-Ngoc", Some("0901234570"), Some("ID004")),
        ("quang-de.tran@example.com", "guest123", "Quang-De Tran", Some("0901234571"), Some("ID005")),
        ("xuan-dung.nguyen@example.com", "guest123", "Xuan-Dung Nguyen", Some("0901234572"), Some("ID006")),
        ("thanh-trinh.nguyen@example.com", "guest123", "Thanh-Trinh Nguyen", Some("0901234573"), Some("ID007")),
    ];

    for (email, password, full_name, phone, id_number) in guest_users_data {
        let existing: Option<hotel_management_backend::models::User> = users::table
            .filter(users::email.eq(email))
            .first(conn)
            .optional()
            .expect("Failed to query users");

        if existing.is_none() {
            let password_hash = AuthService::hash_password(password).expect("Failed to hash password");
            
            let new_guest = NewGuestUser {
                email,
                full_name,
                password_hash: &password_hash,
                role: UserRole::Guest,
                phone,
                id_number,
            };
            
            diesel::insert_into(users::table)
                .values(&new_guest)
                .execute(conn)
                .expect("Failed to insert guest user");
            println!("  ✅ Created guest '{}' ({})", full_name, email);
        } else {
            println!("  ⏭️  Guest '{}' already exists", email);
        }
    }
}

fn seed_rooms(conn: &mut PgConnection) {
    println!("\nCreating rooms...");

    // (Room Number, Type, Status, Price)
    let rooms_data = vec![
        // 1. Single Rooms
        ("101", RoomType::Single, RoomStatus::Available, "1000000"),
        ("102", RoomType::Single, RoomStatus::Available, "1000000"),
        ("103", RoomType::Single, RoomStatus::Dirty, "1000000"), // Recently vacated

        // 2. Double Rooms
        ("201", RoomType::Double, RoomStatus::Dirty, "1500000"), // Needs cleaning
        ("202", RoomType::Double, RoomStatus::Occupied, "1500000"), // Currently occupied (John Doe)
        ("203", RoomType::Double, RoomStatus::Occupied, "1500000"), // Currently occupied (Sarah Williams)
        ("204", RoomType::Double, RoomStatus::Occupied, "1500000"), // Currently occupied (Michael Chen)
        
        // 3. Suites
        ("301", RoomType::Suite,  RoomStatus::Available, "2500000"), // Future booking here
        ("302", RoomType::Suite,  RoomStatus::Maintenance, "2500000"), // Broken AC
        ("303", RoomType::Suite,  RoomStatus::Available, "2500000"), 

        // 4. Other (map to existing room types)
        ("401", RoomType::Single, RoomStatus::Available, "2000000"),
        ("402", RoomType::Double, RoomStatus::Available, "2000000"), // Cancelled booking here
    ];

    for (number, room_type, status, price_str) in rooms_data {
        let price = BigDecimal::from_str(price_str).unwrap();

        // Check if room exists
        let existing: Option<hotel_management_backend::models::Room> = rooms::table
            .filter(rooms::number.eq(number))
            .first(conn)
            .optional()
            .expect("Failed to query rooms");

        if existing.is_some() {
            // Update status and price of existing room
            diesel::update(rooms::table.filter(rooms::number.eq(number)))
                .set((
                    rooms::status.eq(status),
                    rooms::price.eq(price),
                    rooms::room_type.eq(room_type)
                ))
                .execute(conn)
                .expect("Failed to update room");
            println!("  ⏭️  Updated Room '{}' -> {:?}", number, status);
        } else {
            let new_room = NewRoom { number, room_type, price };
            
            diesel::insert_into(rooms::table)
                .values(&new_room)
                .execute(conn)
                .expect("Failed to insert room");

            // Force status update (since default might be 'Available')
            diesel::update(rooms::table.filter(rooms::number.eq(number)))
                .set(rooms::status.eq(status))
                .execute(conn)
                .expect("Failed to set room status");
            
            println!("  ✅ Created Room '{}' -> {:?}", number, status);
        }
    }
}

fn seed_bookings(conn: &mut PgConnection) {
    println!("\nCreating bookings...");

    // We need dates relative to today
    let today = Utc::now().date_naive();
    
    // Helper to find room ID by number
    let get_room_id = |num: &str, conn: &mut PgConnection| -> Option<uuid::Uuid> {
        rooms::table
            .filter(rooms::number.eq(num))
            .select(rooms::id)
            .first(conn)
            .optional()
            .unwrap_or(None)
    };

    // Helper to find guest user ID by email
    let get_guest_id = |guest_email: &str, conn: &mut PgConnection| -> Option<uuid::Uuid> {
        use hotel_management_backend::schema::users::dsl::*;
        users::table
            .filter(email.eq(guest_email))
            .filter(role.eq(UserRole::Guest))
            .select(id)
            .first(conn)
            .optional()
            .unwrap_or(None)
    };

    // Scenarios to seed: (reference, guest_name, guest_email, room_num, check_in, check_out, status, source)
    let bookings_specs = vec![
        // 1. ACTIVE BOOKING (Occupied Room 204) - Matches "Occupied" status
        ("SEED-002", "Tien-Dat Do", "tien-dat.do@example.com", "204", 
         today - Duration::days(2), // Checked in 2 days ago
         today + Duration::days(2), // Leaves in 2 days
         BookingStatus::CheckedIn, "Staff"),

         ("SEED-003", "Tien-Dat Dam", "tien-dat.dam@example.com", "303", 
         today - Duration::days(1), // Checked in yesterday
         today + Duration::days(3), // Leaves in 3 days
         BookingStatus::CheckedIn, "Staff"),

        // 2. CHECKED OUT / DIRTY (Room 103) - Matches "Dirty" status
        // Guest left this morning, room hasn't been cleaned yet
        ("SEED-001", "Bao-Huy Pham", "bao-huy.pham@example.com", "103", 
         today - Duration::days(4), 
         today, // Checked out today
         BookingStatus::CheckedIn, "Staff"), // Note: Keeping as CheckedIn for now or logic might auto-switch to CheckedOut

        ("SEED-006", "Minh-Tuan Nguyen-Ngoc", "minh-tuan.nguyen@example.com", "201",
         today - Duration::days(5),
         today - Duration::days(2), // Checked out 2 days ago
         BookingStatus::CheckedOut, "Staff"),

        // 3. UPCOMING BOOKING (Room 101) - Room is currently "Available"
        ("SEED-004", "Quang-De Tran", "quang-de.tran@example.com", "101", 
         today + Duration::days(3), // Arrives in 3 days
         today + Duration::days(6), 
         BookingStatus::Upcoming, "Guest"),

         ("SEED-005", "Xuan-Dung Nguyen", "xuan-dung.nguyen@example.com", "301", 
         today + Duration::days(10), 
         today + Duration::days(14), 
         BookingStatus::Upcoming, "Guest"),

        // 4. CANCELLED BOOKING (Room 402) - Room is "Available"
        ("SEED-007", "Thanh-Trinh Nguyen", "thanh-trinh.nguyen@example.com", "402", 
         today + Duration::days(5), 
         today + Duration::days(7), 
         BookingStatus::Cancelled, "Staff"),
    ];

     for (reference, guest_name, guest_email, room_num, check_in, check_out, status, source) in bookings_specs {
         if let Some(room_id) = get_room_id(room_num, conn) {
             let guest_user_id = get_guest_id(guest_email, conn);
             let room: hotel_management_backend::models::Room = rooms::table
                 .find(room_id)
                 .first(conn)
                 .expect("Failed to load room");
             let nights = (check_out - check_in).num_days().max(1) as i64;
             let booking_price = &room.price * BigDecimal::from(nights);

             // Check if booking exists
             let exists = bookings::table
                 .filter(bookings::reference.eq(reference))
                 .count()
                 .get_result::<i64>(conn)
                 .unwrap_or(0) > 0;

             if exists {
                 // Update existing booking with new guest name
                 diesel::update(bookings::table.filter(bookings::reference.eq(reference)))
                     .set((
                         bookings::guest_name.eq(guest_name),
                         bookings::status.eq(status),
                         bookings::check_in_date.eq(check_in),
                         bookings::check_out_date.eq(check_out),
                         bookings::created_by_user_id.eq(guest_user_id),
                     ))
                     .execute(conn)
                     .expect("Failed to update booking");
                 println!("  🔄 Updated '{}' -> {}", reference, guest_name);
             } else {
                 // Create new booking
                 let new_booking = NewBooking {
                     reference,
                     guest_name,
                     room_id,
                     check_in_date: check_in,
                     check_out_date: check_out,
                     created_by_user_id: guest_user_id,
                     creation_source: source,
                     price: booking_price,
                 };
                 diesel::insert_into(bookings::table)
                     .values(&new_booking)
                     .execute(conn)
                     .expect("Failed to insert booking");
                 if status != BookingStatus::Upcoming {
                     diesel::update(bookings::table.filter(bookings::reference.eq(reference)))
                         .set(bookings::status.eq(status))
                         .execute(conn)
                         .expect("Failed to set status");
                 }
                 println!("  ✅ Created '{}' -> {}", reference, guest_name);
             }
         }
     }
}