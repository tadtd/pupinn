use std::collections::HashMap;
use diesel::prelude::*;
use rig::{
    completion::{Prompt, ToolDefinition},
    providers::{openai, gemini},
    tool::Tool,
};
use rig::client::CompletionClient;
use tracing::{error, info};
use serde::{Deserialize, Serialize};
use chrono::NaiveDate;
use bigdecimal::BigDecimal;
use thiserror::Error;

use crate::{
    db::DbPool,
    schema::{system_settings, messages},
    models::message::Message,
    services::{BookingService, RoomService},
};
use uuid::Uuid;

/// Custom error type for tool operations
#[derive(Debug, Error)]
pub enum ToolError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

pub struct AiService {
    pool: DbPool,
}

/// Tool input for searching available rooms
#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
struct SearchRoomsInput {
    #[schemars(description = "Check-in date in YYYY-MM-DD format (e.g., 2026-02-20)")]
    check_in_date: String,
    #[schemars(description = "Check-out date in YYYY-MM-DD format (e.g., 2026-02-25)")]
    check_out_date: String,
    #[schemars(description = "Optional filter for room type: single, double, or suite")]
    room_type: Option<String>,
}

/// Tool input for creating a booking proposal
#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
struct CreateBookingProposalInput {
    #[schemars(description = "UUID of the room to book (obtained from search_available_rooms)")]
    room_id: String,
    #[schemars(description = "Check-in date in YYYY-MM-DD format")]
    check_in_date: String,
    #[schemars(description = "Check-out date in YYYY-MM-DD format")]
    check_out_date: String,
}

/// Tool for searching available rooms
#[derive(Debug, Clone)]
struct SearchRoomsTool {
    pool: DbPool,
}

impl Tool for SearchRoomsTool {
    const NAME: &'static str = "search_available_rooms";

    type Error = ToolError;
    type Args = SearchRoomsInput;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schemars::schema_for!(SearchRoomsInput)).unwrap();
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search for available rooms based on check-in and check-out dates. Returns a list of available rooms with their details including room type, number, and price per night.".to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        // Parse dates
        let check_in = NaiveDate::parse_from_str(&args.check_in_date, "%Y-%m-%d")
            .map_err(|e| ToolError::InvalidInput(format!("Invalid check-in date format: {}", e)))?;
        let check_out = NaiveDate::parse_from_str(&args.check_out_date, "%Y-%m-%d")
            .map_err(|e| ToolError::InvalidInput(format!("Invalid check-out date format: {}", e)))?;

        // Parse room type if provided
        let room_type = args.room_type.as_ref().and_then(|rt| {
            match rt.to_lowercase().as_str() {
                "single" => Some(crate::models::RoomType::Single),
                "double" => Some(crate::models::RoomType::Double),
                "suite" => Some(crate::models::RoomType::Suite),
                _ => None,
            }
        });

        let room_service = RoomService::new(self.pool.clone());
        let booking_service = BookingService::new(self.pool.clone());

        // Get all rooms (optionally filtered by type)
        let rooms = room_service.list_rooms(None, room_type)
            .map_err(|e| ToolError::Database(format!("Failed to list rooms: {}", e)))?;

        // Check availability for each room
        let mut available_rooms = Vec::new();
        for room in rooms {
            if room.status == crate::models::RoomStatus::Maintenance {
                continue;
            }

            let is_available = booking_service.check_availability(
                room.id,
                check_in,
                check_out,
                None,
            ).map_err(|e| ToolError::Database(format!("Failed to check availability: {}", e)))?;

            if is_available {
                available_rooms.push(format!(
                    "Room {}: {:?} room, Price: {} VND per night, Room ID: {}",
                    room.number,
                    room.room_type,
                    room.price,
                    room.id
                ));
            }
        }

        if available_rooms.is_empty() {
            Ok("No rooms are available for the selected dates. Please try different dates or contact the front desk for assistance.".to_string())
        } else {
            Ok(format!("Available rooms:\n{}", available_rooms.join("\n")))
        }
    }
}

/// Tool for creating a booking proposal
#[derive(Debug, Clone)]
struct CreateBookingProposalTool {
    pool: DbPool,
}

impl Tool for CreateBookingProposalTool {
    const NAME: &'static str = "create_booking_proposal";

    type Error = ToolError;
    type Args = CreateBookingProposalInput;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schemars::schema_for!(CreateBookingProposalInput)).unwrap();
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Create a booking proposal for the user to review. This will generate a booking card that the user can confirm or cancel. Only call this when you have all required information: room_id, check_in_date, and check_out_date.".to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        // Parse room ID
        let room_id = Uuid::parse_str(&args.room_id)
            .map_err(|e| ToolError::InvalidInput(format!("Invalid room ID: {}", e)))?;

        // Parse dates
        let check_in = NaiveDate::parse_from_str(&args.check_in_date, "%Y-%m-%d")
            .map_err(|e| ToolError::InvalidInput(format!("Invalid check-in date format: {}", e)))?;
        let check_out = NaiveDate::parse_from_str(&args.check_out_date, "%Y-%m-%d")
            .map_err(|e| ToolError::InvalidInput(format!("Invalid check-out date format: {}", e)))?;

        // Get room details
        let room_service = RoomService::new(self.pool.clone());
        let room = room_service.get_room_by_id(room_id)
            .map_err(|e| ToolError::NotFound(format!("Failed to get room details: {}", e)))?;

        // Calculate nights and total price
        let nights = (check_out - check_in).num_days();
        if nights <= 0 {
            return Err(ToolError::InvalidInput("Check-out date must be after check-in date".to_string()));
        }

        let total_price = &room.price * BigDecimal::from(nights);

        // Create booking proposal JSON
        let proposal = serde_json::json!({
            "room_id": room.id.to_string(),
            "room_number": room.number,
            "room_type": format!("{:?}", room.room_type).to_lowercase(),
            "check_in_date": args.check_in_date,
            "check_out_date": args.check_out_date,
            "total_price": total_price.to_string(),
            "nights": nights,
            "price_per_night": room.price.to_string()
        });

        // Return the proposal as a special formatted message
        Ok(format!("BOOKING_PROPOSAL:{}", serde_json::to_string(&proposal).unwrap()))
    }
}

impl AiService {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Load settings from DB
    fn get_settings(&self) -> HashMap<String, String> {
        let mut conn = self.pool.get().expect("Failed to get DB connection");
        let settings = system_settings::table
            .load::<crate::models::setting::SystemSetting>(&mut conn)
            .unwrap_or_default();
        
        settings.into_iter().map(|s| (s.key, s.value)).collect()
    }

    pub async fn generate_reply(&self, user_id: Uuid, user_name: &str, user_message: &str) -> Option<String> {
        let settings = self.get_settings();

        // Check if AI is enabled
        if settings.get("ai_enabled").map(|s| s.as_str()) != Some("true") {
            return None;
        }

        let api_key = settings.get("ai_api_key").cloned().unwrap_or_default();
        if api_key.is_empty() {
            error!("AI is enabled but API key is missing");
            return Some("I'm having trouble connecting to my brain (API Key missing).".to_string());
        }

        let provider = settings.get("ai_provider").map(|s| s.as_str()).unwrap_or("openai");
        let model_name = settings.get("ai_model").cloned().unwrap_or_else(|| "gpt-3.5-turbo".to_string());
        
        // Fetch recent chat history
        let mut conn = self.pool.get().expect("Failed to get DB connection");
        let history = messages::table
            .filter(
                (messages::sender_id.eq(user_id).and(messages::receiver_id.eq(crate::api::chat::PUPINN_ID)))
                .or(messages::sender_id.eq(crate::api::chat::PUPINN_ID).and(messages::receiver_id.eq(user_id)))
            )
            .order(messages::created_at.desc())
            .limit(10)
            .load::<Message>(&mut conn)
            .unwrap_or_default();
            
        let mut history_text = String::new();
        // Reverse to get chronological order from oldest to newest
        for msg in history.iter().rev() {
             let sender = if msg.sender_id == user_id { user_name } else { "Pupinn" };
             history_text.push_str(&format!("{}: {}\n", sender, msg.content));
        }

        // Updated preamble with booking capabilities
        let preamble = format!(
            "You are Pupinn, the virtual concierge for the Pupinn Hotel. \
            You are chatting with a user named {}. \
            
            HOTEL INFORMATION: \
            - Name: Pupinn \
            - Room Types Offered: Single (1-2 guests, ~1,000,000 VND/night), Double (2-4 guests, ~1,500,000 VND/night), and Suite (4+ guests, luxury, ~2,500,000 VND/night). \
            - Guest Services: Guests can search for rooms, book stays, and manage reservations through the chat or Guest Portal. \
            
            YOUR CAPABILITIES: \
            You have access to the following tools: \
            1. search_available_rooms: Search for available rooms by date range and optional room type \
            2. create_booking_proposal: Create a booking proposal that the user can confirm or cancel \
            
            BOOKING WORKFLOW: \
            1. When a user wants to book a room, gather the following information through conversation: \
               - Check-in date (must be specific, e.g., '2026-02-20', not 'next week') \
               - Check-out date (must be specific) \
               - Room type preference (single, double, or suite) - ask about number of guests to recommend \
            2. Once you have check-in and check-out dates, use search_available_rooms to find options \
            3. Help the user choose a room based on their needs (number of guests, budget, preferences) \
            4. When the user confirms their choice, use create_booking_proposal with the room_id from search results \
            5. IMPORTANT: After calling create_booking_proposal, the tool will return a message starting with 'BOOKING_PROPOSAL:' followed by JSON data. \
               You MUST include this EXACT output in your response, followed by your conversational message. \
               Example: 'BOOKING_PROPOSAL:{{...json data...}} I've created a booking proposal for you! Please review the details in the card above and click Book to confirm.' \
            6. The system will automatically display a booking card with Book and Cancel buttons for the user \
            
            GUIDELINES: \
            - Tone: Helpful, professional, and welcoming \
            - Always ask for specific dates (YYYY-MM-DD format) - if user says 'next week' or 'Tet Holiday', ask for exact dates \
            - Recommend room types based on number of guests: 1-2 → Single, 2-4 → Double, 4+ → Suite \
            - If no rooms are available, suggest alternative dates \
            - After creating a booking proposal, include the tool's BOOKING_PROPOSAL output in your response, then add a friendly message \
            - If user cancels a proposal, ask why and offer alternatives \
            
            Here is the recent conversation history:\n\
            {}\n\
            User's new message is below.", 
            user_name, history_text
        );

        info!("Generating AI reply via {} using model {}", provider, model_name);

        // Create tools
        let search_tool = SearchRoomsTool { pool: self.pool.clone() };
        let booking_tool = CreateBookingProposalTool { pool: self.pool.clone() };

        let result = match provider {
            "gemini" => {
                let client = match gemini::Client::new(&api_key) {
                    Ok(c) => c,
                    Err(_) => return Some("Failed to initialize Gemini client.".to_string()),
                };
                let agent = client
                    .agent(&model_name)
                    .preamble(&preamble)
                    .tool(search_tool)
                    .tool(booking_tool)
                    .build();
                
                agent.prompt(user_message).multi_turn(10).await
            },
            _ => {
                // Default to OpenAI or compatible
                let base_url = settings.get("ai_base_url").map(|s| s.as_str()).unwrap_or("https://api.openai.com/v1");
                
                if base_url != "https://api.openai.com/v1" {
                    tracing::warn!("Custom AI Base URL '{}' found but temporarily ignored due to library limitation. Please set OPENAI_API_BASE env var if possible.", base_url);
                }

                let client: openai::Client = match openai::Client::new(&api_key) {
                    Ok(c) => c,
                    Err(_) => return Some("Failed to initialize OpenAI client.".to_string()),
                };

                let agent = client
                    .agent(&model_name)
                    .preamble(&preamble)
                    .tool(search_tool)
                    .tool(booking_tool)
                    .build();

                agent.prompt(user_message).multi_turn(10).await
            }
        };

        match result {
            Ok(response) => Some(response),
            Err(e) => {
                error!("AI Generation Error: {}", e);
                Some("I apologize, but I'm having trouble processing that right now.".to_string())
            }
        }
    }
}