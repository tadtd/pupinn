use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

// Import from the main crate
use hotel_management_backend::db::create_pool;
use hotel_management_backend::models::{NewRoom, NewUser, RoomType, UserRole};
use hotel_management_backend::schema::{rooms, users};
use hotel_management_backend::services::AuthService;

fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = create_pool(&database_url);
    let mut conn = pool.get().expect("Failed to get database connection");

    println!("🌱 Seeding database...\n");

    // Seed users
    seed_users(&mut conn);

    // Seed rooms
    seed_rooms(&mut conn);

    println!("\n✅ Database seeding complete!");
}

fn seed_users(conn: &mut PgConnection) {
    println!("Creating users...");

    let users_data = vec![
        ("admin", "admin123", UserRole::Admin),
        ("reception", "reception123", UserRole::Receptionist),
    ];

    for (username, password, role) in users_data {
        // Check if user already exists
        let existing: Option<hotel_management_backend::models::User> = users::table
            .filter(users::username.eq(username))
            .first(conn)
            .optional()
            .expect("Failed to query users");

        if existing.is_some() {
            println!("  ⏭️  User '{}' already exists, skipping", username);
            continue;
        }

        let password_hash =
            AuthService::hash_password(password).expect("Failed to hash password");

        let new_user = NewUser {
            username,
            password_hash: &password_hash,
            role,
        };

        diesel::insert_into(users::table)
            .values(&new_user)
            .execute(conn)
            .expect("Failed to insert user");

        println!("  ✅ Created user '{}' with role {:?}", username, role);
    }
}

fn seed_rooms(conn: &mut PgConnection) {
    println!("\nCreating rooms...");

    let rooms_data = vec![
        ("101", RoomType::Single),
        ("102", RoomType::Single),
        ("201", RoomType::Double),
        ("202", RoomType::Double),
        ("301", RoomType::Suite),
    ];

    for (number, room_type) in rooms_data {
        // Check if room already exists
        let existing: Option<hotel_management_backend::models::Room> = rooms::table
            .filter(rooms::number.eq(number))
            .first(conn)
            .optional()
            .expect("Failed to query rooms");

        if existing.is_some() {
            println!("  ⏭️  Room '{}' already exists, skipping", number);
            continue;
        }

        let new_room = NewRoom { number, room_type };

        diesel::insert_into(rooms::table)
            .values(&new_room)
            .execute(conn)
            .expect("Failed to insert room");

        println!("  ✅ Created room '{}' ({:?})", number, room_type);
    }
}

