use std::collections::HashMap;
use diesel::prelude::*;
use rig::{
    completion::Prompt,
    providers::{openai, gemini},
};
use rig::client::CompletionClient;
use tracing::{error, info};

use crate::{
    db::DbPool,
    schema::{system_settings, messages},
    models::message::Message,
};
use uuid::Uuid;

pub struct AiService {
    pool: DbPool,
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

        // Peamble with history
        let preamble = format!(
            "You are Pupinn, the virtual concierge for the Pupinn Hotel. \
            You are chatting with a user named {}. \
            
            HOTEL INFORMATION: \
            - Name: Pupinn \
            - Room Types Offered: Single, Double, and Suite. \
            - Guest Services: Guests can self-register, search for rooms by date, book stays, and cancel upcoming reservations directly through the Guest Portal. \
            - Housekeeping: Note that rooms automatically switch to 'Dirty' status upon checkout and must be cleaned before becoming 'Available' again. \
            
            GUIDELINES: \
            - Tone: Helpful, professional, and welcoming. \
            - Constraints: You cannot perform database actions (like booking a room) directly. Guide the user to the appropriate dashboard or page to perform these actions. \
            - Context: You should answer questions about the hotel amenities, room differences, and the local area. \
            
            Here is the recent conversation history:\n\
            {}\n\
            User's new message is below.", 
            user_name, history_text
        );

        info!("Generating AI reply via {} using model {}", provider, model_name);

        let result = match provider {
            "gemini" => {
                let client = match gemini::Client::new(&api_key) {
                    Ok(c) => c,
                    Err(_) => return Some("Failed to initialize Gemini client.".to_string()),
                };
                let agent = client
                    .agent(&model_name)
                    .preamble(&preamble)
                    .build();
                
                agent.prompt(user_message).await
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
                    .build();

                agent.prompt(user_message).await
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