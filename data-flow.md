# Pupinn Hotel Management System - Data Flow Documentation

This document provides comprehensive data flow diagrams for the Pupinn hotel management system, illustrating how data moves through the application across different features and components.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Booking Management Flow](#booking-management-flow)
4. [AI-Assisted Booking Flow](#ai-assisted-booking-flow)
5. [Real-time Chat System](#real-time-chat-system)
6. [Room Status Management](#room-status-management)
7. [Payment Processing Flow](#payment-processing-flow)
8. [Image Upload Flow](#image-upload-flow)

---

## System Architecture Overview

The overall system architecture showing the main components and their interactions:

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        UI["Next.js Frontend<br/>(React 19)"]
    end
    
    subgraph Backend["Backend Layer (Rust/Axum)"]
        API["API Handlers<br/>(HTTP/WebSocket)"]
        Services["Business Logic<br/>(Services Layer)"]
        AI["AI Service<br/>(Rig Framework)"]
    end
    
    subgraph Data["Data Layer"]
        DB[(PostgreSQL<br/>Database)]
        Storage[("MinIO<br/>Object Storage")]
    end
    
    UI -->|HTTP/REST| API
    UI -->|WebSocket| API
    API --> Services
    Services --> AI
    Services --> DB
    Services --> Storage
    
    style UI fill:#3b82f6
    style API fill:#8b5cf6
    style Services fill:#8b5cf6
    style AI fill:#8b5cf6
    style DB fill:#10b981
    style Storage fill:#10b981
```

---

## Authentication Flow

### Staff Authentication Flow

```mermaid
sequenceDiagram
    participant U as Staff User
    participant F as Frontend
    participant API as /auth/login
    participant AS as AuthService
    participant DB as Database
    
    U->>F: Enter username & password
    F->>API: POST /auth/login
    API->>AS: authenticate_staff(username, password)
    AS->>DB: Query user by username
    DB-->>AS: User record
    AS->>AS: Verify password hash (Argon2id)
    AS->>AS: Generate JWT token
    AS-->>API: Return JWT + user info
    API-->>F: 200 OK with token
    F->>F: Store token in localStorage
    F->>U: Redirect to staff dashboard
```

### Guest Authentication Flow

```mermaid
sequenceDiagram
    participant U as Guest User
    participant F as Frontend
    participant Reg as /auth/register
    participant Login as /auth/guest/login
    participant AS as AuthService
    participant DB as Database
    
    Note over U,DB: Registration Flow
    U->>F: Fill registration form
    F->>Reg: POST /auth/register
    Reg->>AS: register_guest(email, password, full_name)
    AS->>AS: Hash password (Argon2id)
    AS->>DB: INSERT user with role='guest'
    DB-->>AS: New user ID
    AS-->>Reg: Success
    Reg-->>F: 201 Created
    
    Note over U,DB: Login Flow
    U->>F: Enter email & password
    F->>Login: POST /auth/guest/login
    Login->>AS: authenticate_guest(email, password)
    AS->>DB: Query user by email
    DB-->>AS: User record
    AS->>AS: Verify password hash
    AS->>AS: Generate JWT token
    AS-->>Login: Return JWT + user info
    Login-->>F: 200 OK with token
    F->>F: Store token in localStorage
    F->>U: Redirect to guest dashboard
```

---

## Booking Management Flow

### Guest Self-Booking Flow

```mermaid
flowchart TD
    Start([Guest Visits Portal]) --> Search["Search Rooms<br/>(Dates + Type)"]
    Search --> Results[Display Available Rooms]
    Results --> Select[Select & Confirm]
    Select --> Validate{Valid?}
    Validate -->|No| Error[Show Error]
    Validate -->|Yes| Create[Create Booking]
    Create --> Success["Update Room to 'occupied'<br/>Redirect to My Bookings"]
    Error --> Results
    
    style Start fill:#3b82f6
    style Success fill:#10b981
    style Error fill:#ef4444
```

### Staff Booking Flow

```mermaid
flowchart TD
    Start([Staff Creates Booking]) --> Input["Enter Guest Info<br/>& Select Room"]
    Input --> Validate{Valid &<br/>Authorized?}
    Validate -->|No| Error[Show Error]
    Validate -->|Yes| Create[Create Booking]
    Create --> Guest{Guest Exists?}
    Guest -->|No| NewGuest[Create Guest Account]
    Guest -->|Yes| Link[Link to Guest]
    NewGuest --> Success
    Link --> Success["Update Room<br/>Show Success"]
    Error --> Input
    
    style Start fill:#8b5cf6
    style Success fill:#10b981
    style Error fill:#ef4444
```

### Check-in/Check-out Flow

```mermaid
sequenceDiagram
    participant S as Staff
    participant F as Frontend
    participant API as Booking API
    participant BS as BookingService
    participant RS as RoomService
    participant DB as Database
    
    Note over S,DB: Check-in Flow
    S->>F: Click "Check In" for booking
    F->>API: POST /bookings/:id/check-in
    API->>BS: check_in_booking(id)
    BS->>DB: UPDATE booking status='checked_in'
    BS->>RS: update_room_status(room_id, 'occupied')
    RS->>DB: UPDATE room status='occupied'
    DB-->>BS: Success
    BS-->>API: Booking updated
    API-->>F: 200 OK
    F->>S: Show success notification
    
    Note over S,DB: Check-out Flow
    S->>F: Click "Check Out" for booking
    F->>API: POST /bookings/:id/check-out
    API->>BS: check_out_booking(id)
    BS->>DB: UPDATE booking status='checked_out'
    BS->>RS: update_room_status(room_id, 'dirty')
    RS->>DB: UPDATE room status='dirty'
    DB-->>BS: Success
    BS-->>API: Booking updated
    API-->>F: 200 OK
    F->>S: Show success notification<br/>(Room marked as Dirty)
```

---

## AI-Assisted Booking Flow

The AI-powered booking system using the Rig framework with custom tools:

```mermaid
sequenceDiagram
    participant G as Guest
    participant UI as Chat Interface
    participant WS as WebSocket Handler
    participant AI as AI Service (Rig)
    participant Tools as AI Tools
    participant DB as Database
    participant BookAPI as Booking API
    
    G->>UI: "I want to book a room for 2 people"
    UI->>WS: Send message via WebSocket
    WS->>AI: generate_reply(message, user_id)
    
    Note over AI: AI Agent Processing
    AI->>AI: Analyze request
    AI->>UI: "What are your check-in and check-out dates?"
    
    G->>UI: "From 2026-02-20 to 2026-02-25"
    UI->>WS: Send dates
    WS->>AI: generate_reply(dates, user_id)
    
    Note over AI,DB: Tool: SearchRoomsTool
    AI->>Tools: search_available_rooms(check_in, check_out, "double")
    Tools->>DB: Query available rooms
    DB-->>Tools: [Room 101: Double, 1,500,000 VND/night]
    Tools-->>AI: Room results
    
    AI->>UI: "Found Room 101 (Double) for 1,500,000 VND/night"
    G->>UI: "Yes, create booking proposal"
    UI->>WS: Confirmation
    WS->>AI: generate_reply(confirmation, user_id)
    
    Note over AI,DB: Tool: CreateBookingProposalTool
    AI->>Tools: create_booking_proposal(room_id, dates)
    Tools->>DB: Validate room & dates
    Tools->>Tools: Calculate total price
    Tools-->>AI: BOOKING_PROPOSAL:{json}
    
    AI->>WS: Return booking proposal
    WS->>UI: Send BOOKING_PROPOSAL message
    
    Note over UI: Frontend Renders Interactive Card
    UI->>UI: Parse BOOKING_PROPOSAL
    UI->>G: Display Booking Card with "Book Now" button
    
    G->>UI: Click "Book Now"
    UI->>BookAPI: POST /guest/bookings
    BookAPI->>DB: Create booking
    DB-->>BookAPI: Booking created
    BookAPI-->>UI: Success
    UI->>G: Redirect to My Bookings page
```

### AI Tool Architecture

```mermaid
flowchart TB
    UserMsg("User Message<br/>(Input Request)")

    subgraph AI["AI Service (Rig Framework)"]
        direction TB
        Agent("AI Agent<br/>(GPT-4/Gemini)")
        Preamble["System Preamble<br/>(Instructions)"]
        
        subgraph Tools["Custom Tools"]
            direction TB
            Search["SearchRoomsTool<br/>Inputs: dates, room_type<br/>Output: Available rooms"]
            Proposal["CreateBookingProposalTool<br/>Inputs: room_id, dates<br/>Output: BOOKING_PROPOSAL"]
        end
    end
    
    subgraph Services["Backend Services"]
        RS[RoomService]
        BS[BookingService]
    end
    
    DB[(Database)]
    UserMsg -.->|"1. Gather info"| Agent
    Preamble --- Agent
    Agent -.->|"2. Search rooms"| Search
    Agent -.->|"3. Create proposal"| Proposal
    Search --> RS
    Proposal --> BS
    RS --> DB
    BS --> DB
    
    classDef agent fill:#8b5cf6,stroke:#fff,stroke-width:2px,color:white;
    classDef tool fill:#3b82f6,stroke:#fff,stroke-width:2px,color:white;
    classDef db fill:#10b981,stroke:#fff,stroke-width:2px,color:white;
    classDef gray fill:#333,stroke:#fff,stroke-width:1px,color:white;
    classDef user fill:#e11d48,stroke:#fff,stroke-width:2px,color:white;

    class Agent agent;
    class Search,Proposal tool;
    class DB db;
    class RS,BS,Preamble gray;
    class UserMsg user;
```

---

## Real-time Chat System

### WebSocket Connection & Basic Messaging

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant WS as WebSocket Handler
    participant State as ChatState
    participant DB as Database
    
    Note over U,State: Connection Setup
    U->>F: Open chat interface
    F->>WS: WebSocket connection + JWT
    WS->>WS: Verify JWT
    WS->>State: Register (user_id → socket)
    WS-->>F: Connected
    
    Note over U,DB: Send Message
    U->>F: Type & send message
    F->>WS: WebSocket: text message
    WS->>DB: Save message
    WS->>State: Lookup receiver
    
    alt Receiver Online
        State-->>WS: Return socket
        WS->>F: Forward to receiver
    else Receiver Offline
        Note over WS: Message stored only
    end
```

### AI Bot & Image Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant WS as WebSocket Handler
    participant AI as AI Service
    participant Storage as MinIO
    participant DB as Database
    
    Note over U,AI: AI Bot Interaction
    U->>F: Message to Pupinn bot
    F->>WS: WebSocket: bot message
    WS->>DB: Save user message
    WS->>AI: generate_reply(message)
    AI->>AI: Process with tools
    AI-->>WS: AI response
    WS->>DB: Save AI message
    WS->>F: Send response
    F->>U: Display AI message
    
    Note over U,Storage: Image Upload
    U->>F: Select image
    F->>WS: POST /api/chat/upload
    WS->>Storage: Upload to MinIO
    Storage-->>WS: Image URL
    WS->>DB: Save message with URL
    WS->>F: Forward image message
    F->>U: Display image
```

### Chat State Management

```mermaid
flowchart TD
    Start([Connection]) --> Auth{JWT Valid?}
    Auth -->|No| Reject[Close]
    Auth -->|Yes| Register["Register in ChatState<br/>(user_id → socket)"]
    Register --> Listen[Listen]
    
    Listen --> Route{Message To?}
    Route -->|Bot| AI[AI Service]
    Route -->|User| Forward[Forward if Online]
    
    AI --> Listen
    Forward --> Listen
    
    Listen --> Disconnect{Closed?}
    Disconnect -->|Yes| Cleanup[Remove]
    Disconnect -->|No| Listen
    
    style Start fill:#3b82f6
    style AI fill:#8b5cf6
    style Cleanup fill:#ef4444
    style Reject fill:#ef4444
```

---

## Room Status Management

### Room Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Available: Room Created
    
    Available --> Occupied: Guest Checks In
    Occupied --> Dirty: Guest Checks Out
    Dirty --> Cleaning: Cleaner Starts Cleaning
    Cleaning --> Available: Cleaning Complete
    
    Available --> Maintenance: Maintenance Needed
    Occupied --> Maintenance: Emergency Repair
    Dirty --> Maintenance: Repair Required
    Cleaning --> Maintenance: Issue Found
    Maintenance --> Available: Repair Complete
    
    note right of Dirty
        Automatically set on checkout
        Appears on cleaner dashboard
    end note
    
    note right of Cleaning
        Cleaner marks as "cleaning"
        in progress state
    end note
    
    note right of Maintenance
        Admin/Receptionist only
        Removes from availability
    end note
```

### Cleaner Workflow

```mermaid
sequenceDiagram
    participant C as Cleaner
    participant F as Frontend
    participant API as Room API
    participant RS as RoomService
    participant DB as Database
    
    C->>F: Login to cleaner dashboard
    F->>API: GET /rooms?status=dirty,cleaning
    API->>DB: Query rooms for cleaner
    DB-->>API: List of assigned rooms
    API-->>F: Room data
    F->>C: Display rooms with color coding<br/>(Red=Dirty, Yellow=Cleaning, Green=Available)
    
    Note over C,DB: Start Cleaning
    C->>F: Click "Start Cleaning" on Room 101
    F->>API: PATCH /rooms/:id {status: "cleaning"}
    API->>RS: update_room_status(id, "cleaning")
    RS->>DB: UPDATE room status='cleaning'
    DB-->>RS: Success
    RS-->>API: Room updated
    API-->>F: 200 OK
    F->>F: Update UI (room turns yellow)
    
    Note over C,DB: Complete Cleaning
    C->>F: Click "Mark as Clean" on Room 101
    F->>API: PATCH /rooms/:id {status: "available"}
    API->>RS: update_room_status(id, "available")
    RS->>DB: UPDATE room status='available'
    DB-->>RS: Success
    RS-->>API: Room updated
    API-->>F: 200 OK
    F->>F: Update UI (room turns green, removed from dashboard)
```

---

## Payment Processing Flow

```mermaid
flowchart TD
    Start([Process Payment]) --> Input["Enter Details<br/>(Booking, Amount, Type)"]
    Input --> Validate{Valid &<br/>Authorized?}
    
    Validate -->|No| Error[Show Error]
    Validate -->|Yes| Create[Create Payment]
    
    Create --> Check{Full Payment?}
    Check -->|Yes| Paid["Status: 'paid'"]
    Check -->|No| Partial["Status: 'partial'"]
    
    Paid --> Success[Show Success]
    Partial --> Success
    Error --> End([End])
    
    style Start fill:#8b5cf6
    style Success fill:#10b981
    style Error fill:#ef4444
```

### Payment Types & Amounts

```mermaid
flowchart LR
    subgraph PaymentTypes["Payment Types"]
        Deposit["Deposit<br/>(Initial payment)"]
        Partial["Partial<br/>(Additional payment)"]
        Full["Full<br/>(Complete payment)"]
        Refund["Refund<br/>(Negative amount)"]
    end
    
    subgraph Validation["Validation Rules"]
        V1["Deposit/Partial/Full:<br/>Amount > 0"]
        V2["Refund:<br/>Amount can be negative"]
        V3["Total payments ≤ Booking price"]
    end
    
    Deposit --> V1
    Partial --> V1
    Full --> V1
    Refund --> V2
    
    V1 --> V3
    V2 --> V3
    
    style Refund fill:#ef4444
    style V3 fill:#de6f1b
```

---

## Image Upload Flow

### MinIO Integration for Chat Images

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as /api/chat/upload
    participant SS as StorageService
    participant MinIO as MinIO Server
    participant DB as Database
    participant WS as WebSocket
    
    U->>F: Select image in chat
    F->>F: Validate image (size, type)
    F->>API: POST /api/chat/upload (multipart/form-data)
    
    Note over API,MinIO: Upload to MinIO
    API->>API: Extract file from multipart
    API->>API: Validate file type & size
    API->>SS: upload_image(file, filename)
    SS->>SS: Generate unique filename (UUID)
    SS->>MinIO: PUT object to bucket "chat-images"
    MinIO-->>SS: Success
    SS->>SS: Generate public URL
    SS-->>API: Return image URL
    
    Note over API,WS: Save Message with Image
    API->>DB: INSERT message (sender, receiver, image_url)
    DB-->>API: Message saved
    API->>WS: Notify WebSocket handler
    WS->>F: Send message with image_url via WebSocket
    F->>F: Render image in chat
    F->>U: Display image message
    
    alt Upload Failed
        SS-->>API: Error
        API-->>F: 500 Internal Server Error
        F->>U: Show error message
    end
```

### MinIO Configuration Flow

```mermaid
flowchart TB
    Start([Application Startup]) --> LoadEnv[Load Environment Variables]
    LoadEnv --> MinIOConfig["MinIO Configuration:<br/>- MINIO_URL=http://minio:9000<br/>- MINIO_ROOT_USER<br/>- MINIO_ROOT_PASSWORD"]
    
    MinIOConfig --> InitDocker[Docker Compose Initializes MinIO]
    InitDocker --> CreateBucket["minio-create-bucket service:<br/>Creates 'chat-images' bucket"]
    CreateBucket --> BackendInit[Backend Initializes StorageService]
    BackendInit --> CreateClient[Create MinIO Client]
    CreateClient --> Ready[MinIO Ready for Uploads]
    
    Ready --> Upload{Image Upload<br/>Request?}
    Upload -->|Yes| Process[Process Upload]
    Upload -->|No| Wait[Wait]
    
    Process --> Store[Store in MinIO]
    Store --> URL[Generate Public URL]
    URL --> Return["Return URL:<br/>http://minio:9000/chat-images/{uuid}.jpg"]
    Return --> Wait
    
    style Start fill:#3b82f6
    style Ready fill:#10b981
    style Store fill:#8b5cf6
```

---

## Summary

This document illustrates the complete data flow architecture of the Pupinn hotel management system, covering:

- **Authentication**: Separate flows for staff and guest users with JWT-based security
- **Bookings**: Self-service guest booking and staff-assisted booking workflows
- **AI Integration**: Rig framework-based AI agent with custom tools for intelligent booking assistance
- **Real-time Communication**: WebSocket-based chat with in-memory state management
- **Room Management**: Complete room status lifecycle from available to occupied to cleaned
- **Payments**: Multi-payment support with type validation and booking status updates
- **Image Storage**: MinIO integration for chat image uploads

All components work together to provide a seamless, modern hotel management experience with AI-powered assistance and real-time capabilities.
