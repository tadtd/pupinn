// @generated automatically by Diesel CLI.

pub mod sql_types {
    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "booking_status"))]
    pub struct BookingStatus;

    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "room_status"))]
    pub struct RoomStatus;

    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "room_type"))]
    pub struct RoomType;

    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "user_role"))]
    pub struct UserRole;
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::BookingStatus;

    bookings (id) {
        id -> Uuid,
        #[max_length = 20]
        reference -> Varchar,
        #[max_length = 100]
        guest_name -> Varchar,
        room_id -> Uuid,
        check_in_date -> Date,
        check_out_date -> Date,
        status -> BookingStatus,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        created_by_user_id -> Nullable<Uuid>,
        #[max_length = 10]
        creation_source -> Varchar,
        price -> Numeric,
    }
}

diesel::table! {
    guest_interaction_notes (id) {
        id -> Uuid,
        guest_id -> Uuid,
        admin_id -> Uuid,
        note -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::RoomType;
    use super::sql_types::RoomStatus;

    rooms (id) {
        id -> Uuid,
        #[max_length = 10]
        number -> Varchar,
        room_type -> RoomType,
        status -> RoomStatus,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        price -> Numeric,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::UserRole;

    users (id) {
        id -> Uuid,
        #[max_length = 50]
        username -> Nullable<Varchar>,
        #[max_length = 255]
        password_hash -> Varchar,
        role -> UserRole,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        #[max_length = 255]
        email -> Nullable<Varchar>,
        #[max_length = 100]
        full_name -> Nullable<Varchar>,
        #[max_length = 20]
        phone -> Nullable<Varchar>,
        #[max_length = 50]
        id_number -> Nullable<Varchar>,
        deactivated_at -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(bookings -> rooms (room_id));
diesel::joinable!(bookings -> users (created_by_user_id));

diesel::allow_tables_to_appear_in_same_query!(bookings, guest_interaction_notes, rooms, users,);
