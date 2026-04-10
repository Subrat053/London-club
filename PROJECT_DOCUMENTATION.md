# BABA GAMES - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Flow](#architecture--flow)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Features & Functionality](#features--functionality)
7. [Admin Panel & Management](#admin-panel--management)
8. [User Roles & Access Control](#user-roles--access-control)
9. [Game Types](#game-types)
10. [API Documentation](#api-documentation)
11. [Setup & Installation](#setup--installation)
12. [Environment Configuration](#environment-configuration)
13. [Frontend Details](#frontend-details)
14. [Backend Details](#backend-details)
15. [Money Flow & Commission System](#money-flow--commission-system)
16. [Security & Authentication](#security--authentication)
17. [Cron Jobs & Real-time Features](#cron-jobs--real-time-features)
18. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Project Overview

**BABA GAMES** is an online gambling/betting platform built with Node.js and Express. It allows users to:
- Register and create accounts
- Participate in multiple betting games (WINGO, K3, 5D)
- Manage their wallets (recharge, withdrawal)
- Build a referral network and earn commissions
- Track betting history and statistics
- Participate in VIP levels and bonuses
- Use admin/manager panel for platform management

The platform includes:
- **User System**: Registration, login, profile management
- **Betting Games**: WINGO, K3D, 5D (various time periods)
- **Wallet System**: Recharge, withdrawal, transfers
- **Referral System**: Multi-level commission structure
- **Admin Panel**: Full platform management
- **Manager Panel**: Secondary management for bulk operations
- **Real-time Updates**: Socket.io for live game results

---

## Tech Stack

### **Backend**
- **Framework**: Express.js (Node.js)
- **Language**: JavaScript (ES6+) with Babel transpiler
- **Database**: MySQL 2 (mysql2/promise)
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: Socket.io v4.4.1
- **Task Scheduling**: node-cron
- **Development**: Nodemon, Babel Node
- **Utilities**:
  - `dotenv` - Environment variable management
  - `md5` - Password hashing
  - `axios` - HTTP requests
  - `moment` - Date/time management
  - `uuid` - Unique ID generation
  - `body-parser` - Request parsing
  - `cookie-parser` - Cookie management

### **Frontend**
- **Templating Engine**: EJS (Embedded JavaScript)
- **CSS**: CSS3 (custom + Vant UI framework)
- **JavaScript**: Vanilla JavaScript + libraries
- **UI Framework**: Vant JS (Mobile UI components)
- **Icons**: SVG assets
- **Audio**: Audio files for game notifications

### **Deployment**
- **Port**: Default 3059 (configurable via .env PORT)
- **Database**: MySQL

---

## Architecture & Flow

### **System Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│              (EJS Templates + JavaScript + CSS)              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes (web.js)                                     │   │
│  │  - User routes (/login, /register, /home)           │   │
│  │  - Game routes (/win, /5d, /k3)                      │   │
│  │  - Wallet routes (/wallet/*)                         │   │
│  │  - Admin routes (/admin/manager/*)                   │   │
│  │  - Manager routes (/manager/*)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                    │   │
│  │  - middlewareController (JWT auth check)             │   │
│  │  - middlewareDailyController (Manager auth)          │   │
│  │  - middlewareAdminController (Admin auth)            │   │
│  │  - cookieParser (Extract auth token)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers (Business Logic)                        │   │
│  │  - accountController (Auth)                          │   │
│  │  - userController (Profile, wallet, transfers)       │   │
│  │  - winGoController (WINGO game)                       │   │
│  │  - k5Controller (5D game)                             │   │
│  │  - k3Controller (K3 game)                             │   │
│  │  - adminController (Admin operations)                │   │
│  │  - paymentController (Payment gateway)                │   │
│  │  - vipController (VIP system)                         │   │
│  │  - socketIoController (Real-time updates)             │   │
│  │  - cronJobController (Scheduled tasks)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MySQL Database Connection                           │   │
│  │  (mysql2/promise)                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   MYSQL DATABASE                             │
│  Tables: users, games (wingo, 5d, k3), wallets, etc.       │
└─────────────────────────────────────────────────────────────┘
```

### **User Flow (Request Lifecycle)**

```
1. USER VISITS /home
   ↓
2. Browser sends GET request
   ↓
3. Express receives request
   ↓
4. cookieParser extracts auth token from cookies
   ↓
5. middlewareController validates JWT token
   ↓
6. Token valid? → homeController.homePage() 
   ↓
7. Render EJS template with data
   ↓
8. Send HTML + CSS + JS to browser
   ↓
9. Browser renders page
   ↓
10. JavaScript sends AJAX requests to API endpoints
    ↓
11. API returns JSON data
    ↓
12. JavaScript updates DOM dynamically
    ↓
13. User interacts with page (real-time via Socket.io)
```

---

## Project Structure

```
babagame/
├── package.json                 # Dependencies & scripts
├── .env                         # Environment configuration
├── railway.ps1                  # Deployment script
├──.babelrc (implicit)          # Babel configuration
│
├── src/
│   ├── server.js               # Main Express server entry point
│   │
│   ├── config/
│   │   ├── configEngine.js     # View engine & static files setup
│   │   └── connectDB.js        # MySQL connection pool
│   │
│   ├── routes/
│   │   ├── web.js              # Main route definitions (300+ routes)
│   │   └── web_old.js          # Legacy routes (backup)
│   │
│   ├── controllers/            # Business logic layer
│   │   ├── accountController.js           # Login, register, password reset
│   │   ├── homeController.js              # Home page templates
│   │   ├── userController.js              # User profile, transfers, wallet
│   │   ├── winGoController.js             # WINGO game logic
│   │   ├── k5Controller.js                # 5D game logic
│   │   ├── k3Controller.js                # K3 game logic
│   │   ├── adminController.js             # Admin panel operations
│   │   ├── dailyController.js             # Manager panel operations
│   │   ├── paymentController.js           # Payment gateway integration
│   │   ├── middlewareController.js        # JWT authentication middleware
│   │   ├── socketIoController.js          # Real-time updates
│   │   ├── cronJobContronler.js          # Scheduled tasks
│   │   ├── vipController.js               # VIP levels & safe wallet
│   │   ├── activityController.js          # Activity & records
│   │   ├── tokenController.js             # Token management
│   │   ├── worker.js                      # Background worker threads
│   │   ├── 170924accountController.js     # Legacy account controller
│   │   ├── 170924userController.js        # Legacy user controller
│   │   ├── 180924cronJobController.js     # Legacy cron jobs
│   │   └── 180924userController.js        # Legacy user logic
│   │
│   ├── modal/                   # Database utilities
│   │   └── CreateDatabase.js    # Initial database seeding
│   │
│   ├── views/                   # EJS templates
│   │   ├── 404.ejs              # 404 error page
│   │   ├── index.ejs            # Landing page template
│   │   ├── nav.ejs              # Navigation component
│   │   ├── keFuMenu.ejs         # Customer support menu
│   │   │
│   │   ├── home/
│   │   │   ├── index.ejs        # Home page
│   │   │   └── slot.ejs         # Slot games page
│   │   │
│   │   ├── account/
│   │   │   ├── login.ejs        # Login form
│   │   │   ├── register.ejs     # Registration form
│   │   │   └── forgot.ejs       # Password recovery
│   │   │
│   │   ├── bet/                 # Betting pages
│   │   │   ├── wingo/
│   │   │   │   ├── win.ejs      # WINGO main game
│   │   │   │   ├── win3.ejs     # WINGO 3-minute
│   │   │   │   ├── win5.ejs     # WINGO 5-minute
│   │   │   │   └── win10.ejs    # WINGO 10-minute
│   │   │   ├── k3/              # K3 game pages
│   │   │   └── 5d/              # 5D game pages
│   │   │
│   │   ├── wallet/
│   │   │   ├── index.ejs        # Wallet overview
│   │   │   ├── recharge.ejs     # Recharge page
│   │   │   ├── withdrawal.ejs   # Withdrawal page
│   │   │   ├── addbank.ejs      # Add bank account
│   │   │   └── [other wallet pages]
│   │   │
│   │   ├── checkIn/             # Check-in & activities
│   │   │   ├── checkIn.ejs
│   │   │   ├── activity.ejs
│   │   │   ├── vip.ejs
│   │   │   ├── rebate.ejs
│   │   │   └── [others]
│   │   │
│   │   ├── promotion/           # Referral/promotion pages
│   │   │   ├── promotion.ejs
│   │   │   ├── myTeam.ejs
│   │   │   └── [others]
│   │   │
│   │   ├── member/              # User account pages
│   │   │   └── [user pages]
│   │   │
│   │   ├── manage/              # Admin panel templates
│   │   │   ├── index.ejs        # Admin dashboard
│   │   │   ├── members.ejs      # Member management
│   │   │   ├── ctv.ejs          # CTV (affiliate) management
│   │   │   ├── recharge.ejs     # Recharge management
│   │   │   ├── withdraw.ejs     # Withdrawal management
│   │   │   ├── statistical.ejs  # Statistics
│   │   │   ├── levelSetting.ejs # Level configuration
│   │   │   ├── 5d.ejs           # 5D game management
│   │   │   ├── k3.ejs           # K3 game management
│   │   │   ├── a-index-bet/     # Betting result management
│   │   │   ├── profileMember.ejs # Member detail view
│   │   │   ├── profileCTV.ejs   # Affiliate detail view
│   │   │   └── [others]
│   │   │
│   │   ├── daily/               # Manager-level pages
│   │   └── misc/
│   │
│   └── public/                  # Static files
│       ├── project.css          # Main stylesheet
│       ├── css/
│       │   ├── main.css
│       │   ├── admin.css
│       │   ├── font.css
│       │   ├── vantjs.css
│       │   ├── account/
│       │   ├── bet/
│       │   ├── home/
│       │   ├── wallet/
│       │   ├── member/
│       │   ├── checkIn/
│       │   └── [other sections]
│       │
│       ├── js/
│       │   ├── client.js        # Main client logic
│       │   ├── wingo1.js        # WINGO 1-min game
│       │   ├── wingo3.js        # WINGO 3-min game
│       │   ├── wingo5.js        # WINGO 5-min game
│       │   ├── wingo10.js       # WINGO 10-min game
│       │   ├── block.js
│       │   ├── qr.js            # QR code generation
│       │   ├── admin/           # Admin panel JS
│       │   └── [others]
│       │
│       ├── images/              # Image assets
│       │   ├── banner/
│       │   ├── lotterycategory/
│       │   ├── [others]
│       │
│       ├── assets/              # External libraries
│       │   ├── css/
│       │   ├── js/
│       │   ├── svg/
│       │   ├── png/
│       │   ├── vant/            # Vant UI framework
│       │   └── woff2/           # Font files
│       │
│       ├── audio/               # Sound effects
│       ├── k3/                  # K3 game assets
│       ├── plugins/             # jQuery plugins
│       └── 5d/                  # 5D game assets
│
├── Oldcontrollers/              # Legacy controller backups
│   ├── k3Controller.js.bak
│   ├── k5Controller.js
│   ├── [others]
│
└── temp/                        # Temporary files
```

---

## Database Schema

### **Core Tables**

#### **1. users Table**
Stores user account information and profile data.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Account Info
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL (MD5 hashed),
    code VARCHAR(50) UNIQUE NOT NULL (User referral code),
    invite VARCHAR(50) (Inviter's code - referral link),
    
    -- Profile
    real_name VARCHAR(100),
    avatar VARCHAR(255),
    
    -- Status
    status ENUM('0', '1') DEFAULT '1' (0=banned, 1=active),
    veri ENUM('0', '1') DEFAULT '0' (Email/phone verified),
    
    -- Financial
    money DECIMAL(15,2) DEFAULT 0 (Main wallet balance),
    money_freezing DECIMAL(15,2) DEFAULT 0 (Locked funds),
    safe_money DECIMAL(15,2) DEFAULT 0 (Safe vault/lock),
    commission DECIMAL(15,2) DEFAULT 0 (Earned commission),
    roses_f DECIMAL(15,2) DEFAULT 0 (Commission this period),
    roses_f1 DECIMAL(15,2) DEFAULT 0 (Direct referral commission),
    roses_today DECIMAL(15,2) DEFAULT 0 (Daily commission),
    
    -- Stats
    total_money DECIMAL(15,2) DEFAULT 0 (Total betting amount),
    total_draw DECIMAL(15,2) DEFAULT 0 (Total winnings),
    total_lose DECIMAL(15,2) DEFAULT 0 (Total losses),
    
    -- Levels
    user_level SMALLINT DEFAULT 0 (VIP level 0-6),
    rank_level SMALLINT DEFAULT 0 (Rank level),
    
    -- Tracking
    token VARCHAR(255) (JWT token),
    time_created BIGINT (Registration timestamp),
    last_login BIGINT,
    
    -- Flags
    is_admin ENUM('0', '1') DEFAULT '0',
    is_manager ENUM('0', '1') DEFAULT '0',
    is_affiliate ENUM('0', '1') DEFAULT '0'
);
```

#### **2. wingo Table**
Game results for WINGO betting game.

```sql
CREATE TABLE wingo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period VARCHAR(50) UNIQUE (Game period ID),
    game VARCHAR(50) (wingo, wingo3, wingo5, wingo10),
    amount DECIMAL(15,2) (Game amount),
    result VARCHAR(50) (Game result),
    status ENUM('0', '1') (0=pending, 1=completed),
    time BIGINT (Timestamp)
);
```

#### **3. 5d Table**
Game results for 5D lottery game.

```sql
CREATE TABLE 5d (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period VARCHAR(50) UNIQUE,
    game SMALLINT (1, 3, 5, 10 - betting amount),
    result VARCHAR(50) (5-digit result),
    status ENUM('0', '1'),
    time BIGINT
);
```

#### **4. k3 Table**
Game results for K3 (Thai Hi-Lo) game.

```sql
CREATE TABLE k3 (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period VARCHAR(50) UNIQUE,
    game SMALLINT (1, 3, 5, 10),
    result VARCHAR(50) (3-digit result),
    status ENUM('0', '1'),
    time BIGINT
);
```

#### **5. Orders/Bets Tables**
Stores individual bets placed by users.

```sql
CREATE TABLE orders_wingo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) (User phone),
    period VARCHAR(50) (Game period),
    amount DECIMAL(15,2) (Bet amount),
    odds DECIMAL(10,4) (Odds multiplier),
    result VARCHAR(50) (Bet choice),
    status ENUM('0', '1', '2') (0=pending, 1=won, 2=lost),
    payout DECIMAL(15,2) (Winnings if won),
    time BIGINT
);

-- Similar tables: orders_5d, orders_k3
```

#### **6. recharge Table**
Recharge/deposit transactions.

```sql
CREATE TABLE recharge (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    amount DECIMAL(15,2),
    method VARCHAR(50) (UPI, USDT, bank, manual_upi, etc.),
    status ENUM('0', '1', '2') (0=pending, 1=approved, 2=rejected),
    proof_image VARCHAR(255) (For manual payments),
    time BIGINT
);
```

#### **7. withdraw Table**
Withdrawal/payout transactions.

```sql
CREATE TABLE withdraw (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    amount DECIMAL(15,2),
    bank_id INT (FK to bank_account),
    status ENUM('0', '1', '2') (0=pending, 1=completed, 2=rejected),
    time BIGINT
);
```

#### **8. bank_account & bank_recharge Tables**
User bank details and recharge bank info.

```sql
-- User bank accounts
CREATE TABLE bank_account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    bank_name VARCHAR(100),
    account_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc VARCHAR(20)
);

-- Platform recharge accounts
CREATE TABLE bank_recharge (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name_bank VARCHAR(100),
    name_user VARCHAR(100),
    stk VARCHAR(50) (Account number),
    type VARCHAR(30) (bank, momo, etc.),
    time BIGINT
);
```

#### **9. level Table**
Commission structure by user level.

```sql
CREATE TABLE level (
    id INT PRIMARY KEY AUTO_INCREMENT,
    level SMALLINT (0-6, user levels),
    f1 DECIMAL(10,4) (Direct referral %, e.g., 0.6 = 60%),
    f2 DECIMAL(10,4) (Level 2 commission),
    f3 DECIMAL(10,4) (Level 3 commission),
    f4 DECIMAL(10,4) (Level 4 commission)
);

-- Example data:
-- level 0: f1=0.6, f2=0.18, f3=0.054, f4=0.0162
-- level 1: f1=0.7, f2=0.21, f3=0.063, f4=0.0189
-- ... up to level 6: f1=1.0, f2=0.3, f3=0.09, f4=0.027
```

#### **10. roses Table**
Commission tracking records.

```sql
CREATE TABLE roses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) (Recipient),
    code VARCHAR(50) (Recipient code),
    invite VARCHAR(50) (From inviter),
    f1 DECIMAL(15,2) (Commission amount),
    time BIGINT
);
```

#### **11. admin Table**
Platform-wide configuration.

```sql
CREATE TABLE admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Game settings (odds/results for testing)
    wingo1 VARCHAR(50),
    wingo3 VARCHAR(50),
    wingo5 VARCHAR(50),
    wingo10 VARCHAR(50),
    k5d VARCHAR(50),
    k5d3 VARCHAR(50),
    k5d5 VARCHAR(50),
    k5d10 VARCHAR(50),
    
    -- Platform settings
    win_rate SMALLINT (Expected win rate %),
    telegram VARCHAR(255) (Support link),
    cskh VARCHAR(255) (Customer service),
    app VARCHAR(255) (App download link)
);
```

#### **12. Activity & Tracking Tables**

```sql
-- Daily tracking
CREATE TABLE daily_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    date DATE,
    total_bet DECIMAL(15,2),
    total_win DECIMAL(15,2),
    total_loss DECIMAL(15,2)
);

-- VIP experience tracking
CREATE TABLE vip_exp (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    exp INT (Experience points),
    level SMALLINT (VIP level)
);

-- Safe vault transfers
CREATE TABLE safe_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    amount DECIMAL(15,2),
    type ENUM('in', 'out') (Transfer in or out),
    time BIGINT
);

-- Turn-over tracking (for commission calculation)
CREATE TABLE turn_over (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    code VARCHAR(50),
    invite VARCHAR(50),
    daily_turn_over DECIMAL(15,2),
    total_turn_over DECIMAL(15,2)
);
```

---

## Features & Functionality

### **1. User Management**

#### **Registration & Authentication**
- **Registration endpoint**: `POST /api/webapi/register`
  - Required fields: phone, password
  - Optional: invitation code (referral)
  - Password hashed with MD5
  - Automatic user code generation
  - Email verification via OTP

- **Login endpoint**: `POST /api/webapi/login`
  - Phone + Password
  - Returns JWT token stored in cookies
  - User state marked as verified (veri=1)

- **Password Reset**: `POST /api/resetPasword`
  - OTP verification required
  - Phone number verification flow

#### **User Profile**
- View profile: `GET /api/webapi/GetUserInfo`
- Update name/info: `PUT /api/webapi/change/userInfo`
- Change password: `PUT /api/webapi/change/pass`
- View my referrals: `GET /api/webapi/myTeam`

### **2. Betting Games**

#### **WINGO Game** (Multiple time periods)
- **Game variants**: 1-min, 3-min, 5-min, 10-min
- **Betting mechanics**:
  - Predict color (Red/Green) or number (0-9)
  - Multiplier odds: Red/Green 2x, specific number 9x
  - Main/Odd/Even bets
- **Endpoints**:
  - `GET /win` - WINGO main page
  - `GET /win/3` - 3-minute variant
  - `GET /win/5` - 5-minute variant
  - `GET /win/10` - 10-minute variant
  - `POST /api/webapi/action/join` - Place bet
  - `POST /api/webapi/GetMyEmerdList` - User's bets history

#### **5D (Lottery) Game**
- **Variants**: 1, 3, 5, 10-digit bets
- **Mechanics**: Predict 5-digit lottery number
- **Odds**: Based on correctness
- **Endpoints**:
  - `GET /5d` - Game page
  - `POST /api/webapi/action/5d/join` - Place bet
  - `POST /api/webapi/5d/GetMyEmerdList` - Bets history

#### **K3 (Thai Hi-Lo) Game**
- **Variants**: 1, 3, 5, 10-digit combinations
- **Mechanics**: 3 dice, predict combination/sum
- **Endpoints**:
  - `GET /k3` - Game page
  - `POST /api/webapi/action/k3/join` - Place bet

### **3. Wallet & Payment System**

#### **Wallet Features**
- Main wallet (playing money)
- Safe wallet/vault (locked savings)
- Freezing balance (locked during pending operations)

#### **Recharge (Deposit)**
- Multiple payment methods:
  - **Manual UPI**: Manual bank transfer, manual verification
  - **Manual USDT**: Crypto transfer, manual verification
  - **UPI Gateway**: Automated UPI payment (via payment gateway)
  - **WowPay**: Third-party payment processing
- **Endpoints**:
  - `POST /api/webapi/recharge` - Initiate recharge
  - `POST /api/webapi/confirm_recharge` - Confirm after payment
  - `GET /api/webapi/recharge/list` - Recharge history
- **Minimum amount**: Configurable (100 by default)

#### **Withdrawal**
- Transfer to linked bank accounts
- Admin approval workflow
- **Endpoints**:
  - `POST /api/webapi/withdrawal` - Request withdrawal
  - `GET /api/webapi/withdraw/list` - Withdrawal history
- Bank account management:
  - `POST /api/webapi/addBank` - Add bank account
  - `POST /api/webapi/check/Info` - Get bank info

#### **Transfers**
- User-to-user transfers within platform
- Direct wallet transfer or via referral code
- **Endpoints**:
  - `POST /api/webapi/transfer` - Transfer money
  - `GET /api/webapi/transfer_history` - Transfer history

### **4. Referral & Commission System**

#### **How it works**
- Every user gets a unique `code` (referral code)
- Invitees use inviter's code during registration (`invite` field)
- Creates a hierarchical network

#### **Multi-Level Commission Structure**
- **6 levels of referral**:
  - F1: Direct referrals → highest commission %
  - F2: F1's referrals → lower %
  - F3: F2's referrals → even lower %
  - F4: F3's referrals → lowest %

#### **Commission Calculation**
- Based on user's betting volume (`total_money`)
- Commission paid from bets placed by the entire downline
- Example: When downline member bets 1000, referrer gets:
  - F1 rate: 0.6 = 600 (60% of bet amount - but system uses decimals, actual = 0.006 * 1000 = 6)
  - Note: System appears to use percentage calculation

#### **Endpoints**
- `POST /api/webapi/promotion` - Get promotion info
- `GET /api/webapi/myTeam` - View referral tree
- `POST /api/webapi/invitationList` - Detailed invitation stats

#### **Bonus Distribution**
- Check-in bonuses: `POST /api/webapi/checkIn`
- Red envelope rewards: `POST /api/webapi/use/redenvelope`
- Invitation bonuses: Automated on referral actions
- Create bonus (Admin): `POST /manager/createBonus`

### **5. VIP System**

#### **Levels** (0-6)
- Each level has different commission percentages
- Upgraded based on experience points or bet volume
- Higher levels = better commission rates from downline

#### **Features**
- Experience tracking: `POST /api/webapi/exp-history`
- VIP bonuses
- Higher withdrawal limits
- Priority support

#### **Endpoints**
- `GET /vip` - VIP info page
- `POST /api/webapi/vip` - Get VIP details

### **6. Safe Wallet Feature**

#### **Purpose**
- Alternative wallet that's "locked" from gameplay
- Users can transfer money between main and safe wallets
- Access at `/safe` route

#### **Operations**
- Transfer to safe: `POST /api/webapi/transferToSafe`
- Withdraw from safe: `POST /api/webapi/transferOut`
- Safe history: `POST /api/webapi/safeHistory`

### **7. Rebate System**

#### **Purpose**
- Cashback or rebate on losses
- Automatic rebate calculation on betting

#### **Endpoints**
- View rebates: `POST /api/webapi/rebats`
- Transfer rebate: `POST /api/webapi/transfer-rebate`
- Rebate history: `POST /api/webapi/rebats-history`

### **8. Activity & Records**

#### **User Activity**
- Betting history with results
- Check-in records
- Daily tasks completion
- Promotion participation history

#### **Endpoints**
- `POST /api/webapi/activity/bats` - Today's bets
- `POST /api/webapi/activity/rewards` - Activity rewards
- `GET /api/webapi/confirm_recharge_usdt` - USDT payment confirmation

---

## Admin Panel & Management

### **Admin Features** (Full Platform Control)

#### **Access**
- Route prefix: `/admin/manager/`
- Requires: Admin authentication via `middlewareAdminController`
- Login via same credentials (is_admin = 1)

#### **Game Management**
- **WINGO Management** (`/admin/manager/index`)
  - View all WINGO bets
  - Set odds/results
  - Manage game periods
  - View by 1-min/3-min/5-min/10-min variants

- **5D Management** (`/admin/manager/5d`)
  - Edit game results
  - Manage lottery numbers
  - Approve/reject bets

- **K3 Management** (`/admin/manager/k3`)
  - Similar to 5D
  - Edit K3 results

#### **User Management**
- **Members** (`/admin/manager/members`)
  - View all users
  - Ban/unban users
  - `POST /api/webapi/admin/banned`
  - View detailed profile
  - Edit user info

- **CTVs (Affiliates)** (`/admin/manager/ctv`)
  - View affiliate structure
  - Create new CTV accounts
  - `POST /admin/manager/create/ctv`
  - View affiliate details: `/admin/manager/ctv/profile/:phone`

- **Member Details** (`/admin/member/info/:id`)
  - User statistics
  - Referral tree
  - Betting records
  - Financial history

#### **Financial Management**

**Recharge Management** (`/admin/manager/recharge`)
- View pending recharge requests
- Approve/reject deposits
- `POST /api/webapi/admin/recharge`
- `POST /api/webapi/admin/rechargeDuyet`

**Withdrawal Management** (`/admin/manager/withdraw`)
- View withdrawal requests
- Approve/process payouts
- `POST /api/webapi/admin/withdraw`

**Recharge Record** (`/admin/manager/rechargeRecord`)
- Historical recharge data
- Filter by date/status

**Withdraw Record** (`/admin/manager/withdrawRecord`)
- Historical withdrawal data

**Recharge Bonus** (`/admin/manager/recharge-bonus`)
- Manage deposit bonuses
- Create bonus campaigns
- Track bonus usage

#### **Level Management**
- **Level Settings** (`/admin/manager/levelSetting`)
  - Configure V/L levels (0-6)
  - Set commission percentages for each level
  - `POST /api/webapi/admin/updateLevel`
  - `GET /api/webapi/admin/getLevelInfo`

#### **Salary Management**
- **Create Salary Record** (`/admin/manager/CreatedSalaryRecord`)
  - Generate commission payouts
  - `POST /api/webapi/admin/CreatedSalary`
  - `GET /api/webapi/admin/getSalary`

#### **Statistics & Reporting**
- **Statistical Dashboard** (`/admin/manager/statistical`)
  - Total bets
  - Total users
  - Revenue metrics
  - User acquisition stats
  - `POST /api/webapi/admin/statistical`
  - `POST /api/webapi/admin/totalJoin`

#### **Settings**
- **Bank Settings** (`/admin/manager/settings`)
  - Configure recharge bank accounts
  - Edit bank details
  - `POST /admin/manager/settings/bank`

- **Support Settings**
  - Customer service link
  - Telegram link
  - `POST /admin/manager/settings/cskh`

- **Buff/Multiplier Settings**
  - Game odds multipliers
  - Buff percentage
  - `POST /admin/manager/settings/buff`
  - `POST /admin/manager/settings/get`

#### **Red Envelope Management**
- Create red envelope campaigns
- Manage distribution
- Track redemption
- `POST /admin/manager/listRedenvelops`

---

### **Manager Panel** (Secondary Management)

#### **Access**
- Route prefix: `/manager/`
- Requires: Manager authentication via `middlewareDailyController`
- Used for CTV/Manager-level operations

#### **Features**
- Similar to admin but with limited scope
- Can manage their own team members
- View subordinate statistics
- Create bonuses for team
- Approve recharges for team

#### **Endpoints**
- `GET /manager/index` - Manager dashboard
- `GET /manager/members` - Team members
- `GET /manager/listRecharge` - Team recharges
- `GET /manager/listWithdraw` - Team withdrawals
- View member info: `/manager/profileMember`
- Create bonus: `POST /manager/createBonus`

---

## User Roles & Access Control

### **Role Hierarchy**

```
1. ADMIN (is_admin = 1)
   └─ Full platform control
   └─ Access: /admin/manager/*

2. MANAGER/CTV (is_manager = 1 or is_affiliate = 1)
   └─ Team management
   └─ Access: /manager/*

3. REGULAR USER (no flags)
   └─ Self profile, games, wallet
   └─ Access: User pages + APIs
   └─ Protected by middlewareController (JWT check)

4. BANNED USER (status = 0)
   └─ No access to anything
   └─ Redirected to login
```

### **Authentication Flow**

```
1. User logs in → POST /api/webapi/login
2. Backend verifies phone + password
3. Generates JWT token
4. Sets token in HTTP-only cookie (auth)
5. Token requires: phone, veri=1 (verified), status=1 (active)
6. Middleware checks on every protected route
7. Token parsed from cookies by cookieParser
```

---

## Game Types

### **WINGO (Most Popular)**

#### **Mechanics**
- Predict outcome before time period ends
- Period duration: 1, 3, 5, or 10 minutes
- Rotating between different prediction types each round

#### **Bet Types**
- **Color**: Red or Green (2x multiplier)
- **Number**: Specific digit 0-9 (9x multiplier)
- **Main**: Over/Under/Equal (2x-3x)
- **Odd/Even**: (2x multiplier)

#### **How Results Calculated**
- Uses last digit of trading data or custom algorithm
- Stored in `wingo` table with period and result
- All bets stored in `orders_wingo` table
- Winner received payout * amount, loser loses bet

#### **Game Flow**
1. User opens `/win` page
2. JavaScript timer shows time left
3. User places bet via AJAX
4. Wait for period to end
5. Server generates result
6. Update user balance
7. Broadcast result via Socket.io

#### **Admin Control**
- Can set fixed results: `admin` table has `wingo1, wingo3, wingo5, wingo10` columns
- Can manipulate wins/losses for testing
- Real-time game management via admin panel

---

### **5D (Lottery)**

#### **Mechanics**
- Predict 5-digit lottery number
- Draw types: 1, 3, 5, 10 (different multipliers)
- Popular in Southeast Asia

#### **Predictions**
- Front: First 3 digits
- Back: Last 3 digits
- Middle: Middle 3 digits
- Exact: All 5 digits

#### **Storage**
- Results in `5d` table
- Bets in `orders_5d` table
- Each variant has separate management

---

### **K3 (Thai Hi-Lo)**

#### **Mechanics**
- Based on 3-dice roll
- Predict sum or combination
- Game types: 1, 3, 5, 10 (bet amount/multiplier)

#### **Predictions**
- Sum (3-18)
- Combination (e.g., triple, pair)
- Individual dice values

#### **Storage**
- Results in `k3` table
- Bets in `orders_k3` table

---

## API Documentation

### **Authentication Endpoints**

```
POST /api/webapi/login
├─ Body: { phone, password }
└─ Response: { success, token, user }

POST /api/webapi/register
├─ Body: { phone, password, code (optional) }
└─ Response: { success, user_code }

POST /api/webapi/send-otp
├─ Body: { phone }
└─ Response: { OTP sent }

POST /api/sent/otp/verify
├─ Body: { phone, otp }
└─ Response: { verified }

POST /api/resetPasword
├─ Body: { phone, new_password }
└─ Response: { success }
```

### **User Profile Endpoints**

```
GET /api/webapi/GetUserInfo
├─ Auth: Required (cookie)
└─ Response: { phone, name, level, money, total_bet, ... }

PUT /api/webapi/change/userInfo
├─ Auth: Required
├─ Body: { name, avatar, ... }
└─ Response: { updated_user }

PUT /api/webapi/change/pass
├─ Auth: Required
├─ Body: { old_password, new_password }
└─ Response: { success }
```

### **Game Endpoints**

```
POST /api/webapi/action/join (WINGO)
├─ Auth: Required
├─ Body: { period, amount, prediction }
└─ Response: { bet_id, odds }

POST /api/webapi/GetMyEmerdList
├─ Auth: Required
├─ Query: { game_type, limit, offset }
└─ Response: [ { period, amount, result, status, payout } ]

POST /api/webapi/action/5d/join
├─ Auth: Required
├─ Body: { period, amount, prediction }
└─ Response: { bet_id }

POST /api/webapi/action/k3/join
├─ Auth: Required
├─ Body: { period, amount, prediction }
└─ Response: { bet_id }
```

### **Wallet Endpoints**

```
POST /api/webapi/recharge
├─ Auth: Required
├─ Body: { amount, method }
└─ Response: { recharge_id, payment_link }

POST /api/webapi/confirm_recharge
├─ Auth: Required
├─ Body: { recharge_id, proof_image (for manual) }
└─ Response: { status }

GET /api/webapi/recharge/list
├─ Auth: Required
└─ Response: [ { id, amount, status, date } ]

POST /api/webapi/withdrawal
├─ Auth: Required
├─ Body: { amount, bank_id }
└─ Response: { withdraw_id, status }

POST /api/webapi/addBank
├─ Auth: Required
├─ Body: { bank_name, account_name, account_number }
└─ Response: { bank_id }

POST /api/webapi/transfer
├─ Auth: Required
├─ Body: { target_phone, amount }
└─ Response: { success }

GET /api/webapi/transfer_history
├─ Auth: Required
└─ Response: [ { date, amount, target } ]
```

### **Referral & Promotion Endpoints**

```
POST /api/webapi/promotion
├─ Auth: Required
└─ Response: { code, invite_link, earned_commission }

GET /api/webapi/myTeam
├─ Auth: Required
└─ Response: { direct_referrals, total_network, earnings }

POST /api/webapi/invitationList
├─ Auth: Required
└─ Response: [ { phone, date_joined, total_bet, commission } ]

POST /api/webapi/checkIn
├─ Auth: Required
└─ Response: { bonus_amount, status }

POST /api/webapi/use/redenvelope
├─ Auth: Required
├─ Body: { envelope_id }
└─ Response: { amount_received }
```

### **VIP & Safe Wallet Endpoints**

```
POST /api/webapi/vip
├─ Auth: Required
└─ Response: { level, experience, next_level_exp, bonuses }

POST /api/webapi/exp-history
├─ Auth: Required
└─ Response: [ { date, exp_earned, activity } ]

POST /api/webapi/safe
├─ Auth: Required
└─ Response: { balance, total_transfers }

POST /api/webapi/transferToSafe
├─ Auth: Required
├─ Body: { amount }
└─ Response: { success }

POST /api/webapi/transferOut
├─ Auth: Required
├─ Body: { amount }
└─ Response: { success }

POST /api/webapi/safeHistory
├─ Auth: Required
└─ Response: [ { date, amount, type } ]
```

### **Rebate Endpoints**

```
POST /api/webapi/rebats
├─ Auth: Required
└─ Response: { total_rebate, available_rebate }

POST /api/webapi/transfer-rebate
├─ Auth: Required
├─ Body: { amount }
└─ Response: { success }

POST /api/webapi/rebats-history
├─ Auth: Required
└─ Response: [ { date, amount, source } ]
```

### **Admin Endpoints**

```
POST /api/webapi/admin/listMember
├─ Auth: Admin required
├─ Body: { search, filter, page }
└─ Response: [ users ]

POST /api/webapi/admin/statistical
├─ Auth: Admin required
├─ Body: { date_range }
└─ Response: { total_bets, total_users, revenue }

POST /api/webapi/admin/updateLevel
├─ Auth: Admin required
├─ Body: { level, f1, f2, f3, f4 }
└─ Response: { updated_config }

POST /api/webapi/admin/recharge
├─ Auth: Admin required
├─ Body: { recharge_id, action }
└─ Response: { status }

POST /api/webapi/admin/withdraw
├─ Auth: Admin required
├─ Body: { withdraw_id, action }
└─ Response: { status }

POST /api/webapi/admin/banned
├─ Auth: Admin required
├─ Body: { phone, ban }
└─ Response: { success }

POST /api/webapi/admin/5d/editResult
├─ Auth: Admin required
├─ Body: { period, new_result }
└─ Response: { updated_bets }

POST /api/webapi/admin/k3/editResult
├─ Auth: Admin required
├─ Body: { period, new_result }
└─ Response: { updated_bets }
```

---

## Setup & Installation

### **Prerequisites**

- Node.js v12+ with npm
- MySQL Server 5.7+
- Windows/Linux/Mac OS
- Code editor (VSCode recommended)

### **Step 1: Clone/Extract Project**

```bash
# Extract the downloaded zip file
# Or clone from repository if using Git
git clone <repository-url>
cd babagame
```

### **Step 2: Install Dependencies**

```bash
# Install npm packages
npm install
```

**If npm install fails:**
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm cache clean --force`
- Try `npm install` again

### **Step 3: Create MySQL Database**

```bash
# Open MySQL client
mysql -u root -p

# Create database
CREATE DATABASE babagames CHARACTER SET utf8 COLLATE utf8_general_ci;

# Switch to database
USE babagames;
```

### **Step 4: Initialize Database (Create Tables & Seed Data)**

```bash
# Run from project root
npm run database
```

**What this does:**
- Creates all required tables
- Inserts level configuration
- Sets up bank recharge accounts
- Creates admin configuration
- Initializes game data

**Note**: First time might show errors if tables don't exist - this is normal.

### **Step 5: Configure Environment**

Create/edit `.env` file with your settings:

```bash
# .env file
PORT=5005
JWT_ACCESS_TOKEN=your_secret_key_here
secret_key=your_secret_key

# Database
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=babagames

# Payment Gateways
UPI_GATEWAY_PAYMENT_KEY=your_upi_key
WOWPAY_MERCHANT_ID=your_merchant_id
WOWPAY_MERCHANT_KEY=your_merchant_key

# Platform Info
APP_BASE_URL=http://localhost:5005
APP_NAME=BABA GAMES
PAYMENT_EMAIL=admin@example.com
PAYMENT_INFO=Game Payment

# Minimum deposit
MINIMUM_MONEY=100

# Account for testing
accountBank=test_account
```

### **Step 6: Start Server**

```bash
# Development (with auto-reload via nodemon)
npm start

# Should show: "Connected success port: 5005"
```

### **Step 7: Access the Application**

- **User portal**: http://localhost:5005/home
- **Login page**: http://localhost:5005/login
- **Admin panel**: http://localhost:5005/admin/manager/index (admin account required)
- **Manager panel**: http://localhost:5005/manager/index (manager account required)

---

## Environment Configuration

### **.env File Explained**

```env
# Server
PORT=5005                    # Server port (default 3059)

# JWT & Security
JWT_ACCESS_TOKEN=shas$isbwDBWDN2543#jcws    # JWT secret key
secret_key=ap6v9njn         # Session/encryption secret

# Database Connection
DATABASE_HOST=localhost      # MySQL host
DATABASE_USER=root          # MySQL username
DATABASE_PASSWORD=          # MySQL password
DATABASE_NAME=babagames     # Database name

# Payment Gateway: UPI Integration
UPI_GATEWAY_PAYMENT_KEY=0c79da69-fdc1-4a07-a8b4-7135a0168385

# Payment Gateway: WowPay Integration
WOWPAY_MERCHANT_ID=100789501
WOWPAY_MERCHANT_KEY=f5b22eabfd774a98befdb220fb7af60c
# Alternative merchant (commented out)
# WOWPAY_MERCHANT_ID=222887002
# WOWPAY_MERCHANT_KEY=MZBG89MDIBEDWJOJQYEZVSNP8EEVMSPM

# Payment Info
PAYMENT_INFO=WINGO PAYMENT  # Payment description
PAYMENT_EMAIL=manas.xdr@gmail.com  # Payment contact email

# Platform Info
APP_BASE_URL=https://www.babagame.in  # Base URL for redirects
APP_NAME=BABA GAMES         # Platform name

# Business Logic
MINIMUM_MONEY=100           # Minimum recharge/bet amount
accountBank=vp6262          # Demo bank account code
```

### **Important Notes**

1. **Security**: Change `JWT_ACCESS_TOKEN` and `secret_key` in production
2. **Database**: For hosted MySQL, update HOST, USER, PASSWORD accordingly
3. **Payment Gateways**: Get real keys from UPI and WowPay providers
4. **APP_BASE_URL**: Update to your actual domain in production
5. **Database Backups**: Regular backups recommended for production

---

## Frontend Details

### **Template Engine: EJS**

EJS (Embedded JavaScript) allows embedding JavaScript in HTML templates.

**Location**: `src/views/` - All HTML templates

**Example**:
```ejs
<!-- Render user balance -->
<span><%= user.money %></span>

<!-- Conditional rendering -->
<% if (user.level > 0) { %>
  <div>VIP <%= user.level %></div>
<% } %>

<!-- Loop through data -->
<% orders.forEach(order => { %>
  <tr>
    <td><%= order.amount %></td>
    <td><%= order.result %></td>
  </tr>
<% }); %>
```

### **Frontend Asset Structure**

#### **CSS Files** (`src/public/css/`)
- `main.css` - Global styles
- `admin.css` - Admin panel styles
- `font.css` - Font definitions
- `vantjs.css` - Vant UI framework styles
- `pages__parity.css` - Parity/odds pages
- Separate CSS for each section (account, bet, home, wallet, etc.)

#### **JavaScript Files** (`src/public/js/`)

**Main Scripts**:
- `client.js` - Main client logic (AJAX calls, DOM updates)
- `block.js` - Block/blocking logic
- `qr.js` - QR code generation
- `admin/` - Admin panel JavaScript

**Game Specific**:
- `wingo1.js` - WINGO 1-minute game logic
- `wingo3.js` - WINGO 3-minute game logic
- `wingo5.js` - WINGO 5-minute game logic
- `wingo10.js` - WINGO 10-minute game logic

#### **UI Framework: Vant**
Located in `src/public/assets/vant/`

Vant is a mobile-first Vue component library. This project uses:
- Button, Toast, Dialog components
- Form elements
- Lists and cards
- Mobile optimizations

### **Frontend Flow**

```
1. User loads /home
2. Server renders home/index.ejs
3. HTML sent to browser with embedded data
4. Browser renders page
5. client.js attached via <script>
6. client.js:
   - Sets up event listeners
   - Makes AJAX calls to API endpoints
   - Listens to Socket.io events
   - Updates DOM dynamically
7. Real-time updates via Socket.io connection
```

### **Key Frontend Components**

#### **Navigation** (`nav.ejs`)
- Top navigation/header
- Links to main sections
- User profile button

#### **Game Pages** (`bet/wingo/*.ejs`)
- Timer showing period countdown
- Betting buttons/options
- Odds display
- Current period info
- `wingo*.js` handles:
  - Timer updates
  - Form submission
  - Result display
  - Balance updates

#### **Wallet Page** (`wallet/index.ejs`)
- Balance display
- Recharge button
- Withdrawal button
- Transaction history
- Safe wallet balance

#### **Pages with EJS Rendering**

**Static Pages:**
- `/login` → `account/login.ejs`
- `/register` → `account/register.ejs`
- `/home` → `home/index.ejs`
- `/wallet` → `wallet/index.ejs`

**Protected Pages (require login):**
- `/win` → `bet/wingo/win.ejs`
- `/5d` → `bet/5d/5d.ejs`
- `/k3` → `bet/k3/k3.ejs`
- `/promotion` → `promotion/promotion.ejs`
- `/vip` → `checkIn/vip.ejs`

**Admin Pages:**
- `/admin/manager/index` → `manage/index.ejs`
- `/admin/manager/members` → `manage/members.ejs`
- `/admin/manager/statistical` → `manage/statistical.ejs`

---

## Backend Details

### **Express.js Application Structure**

```javascript
// src/server.js - Entry point

import 'dotenv/config'
import express from 'express'
import routes from './routes/web'
import cronJobController from './controllers/cronJobContronler'

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

// Middleware setup
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

// View engine
configViewEngine(app)

// Routes
routes.initWebRouter(app)

// Cron jobs (scheduled tasks)
cronJobController.cronJobGame1p(io)

// Socket.io (real-time)
socketIoController.sendMessageAdmin(io)

server.listen(port)
```

### **Middleware System**

#### **1. middlewareController** (User Authentication)

```javascript
// Check user is logged in
const middlewareController = async(req, res, next) => {
    const auth = req.cookies.auth  // Get JWT from cookie
    if (!auth) return res.redirect("/login")
    
    try {
        // Verify token in database
        const [rows] = await connection.execute(
            'SELECT token, status FROM users WHERE token = ? AND veri = 1',
            [auth]
        )
        
        if (auth == rows[0].token && rows[0].status == '1') {
            next()  // Token valid, proceed
        } else {
            return res.redirect("/login")
        }
    } catch (error) {
        return res.redirect("/login")
    }
}

export default middlewareController
```

**Usage**: Protect routes requiring login
```javascript
router.get('/wallet', middlewareController, homeController.walletPage)
```

#### **2. middlewareDailyController** (Manager Authentication)

Similar to above but checks `is_manager = 1`

#### **3. middlewareAdminController** (Admin Authentication)

Similar to above but checks `is_admin = 1`

### **Controller Pattern**

All controllers follow this pattern:

```javascript
// src/controllers/exampleController.js

import connection from "../config/connectDB"

// Page render
const examplePage = async (req, res) => {
    // Fetch data
    const [data] = await connection.query('SELECT * FROM table')
    
    // Render template with data
    return res.render("example.ejs", { data })
}

// API endpoint
const exampleAPI = async (req, res) => {
    try {
        // Get user from JWT token
        const auth = req.cookies.auth
        
        // Get request data
        const { param1, param2 } = req.body
        
        // Database operation
        await connection.execute(
            'INSERT INTO table SET col1 = ?, col2 = ?',
            [param1, param2]
        )
        
        // Return response
        return res.status(200).json({ 
            success: true, 
            message: "Operation successful" 
        })
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        })
    }
}

export default {
    examplePage,
    exampleAPI
}
```

### **Database Connection**

```javascript
// src/config/connectDB.js

const connection = mysql.createPool({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: 'babagames',
})

// Usage in controllers:
const [rows] = await connection.query('SELECT * FROM users LIMIT 10')
const [result] = await connection.execute(
    'INSERT INTO users SET phone = ?, password = ?',
    [phone, password]
)
```

### **Key Controller Functions**

#### **accountController** (Authentication)

```javascript
// Login
login(req, res):
  - Verify phone + password
  - Generate JWT token
  - Set token in cookie
  - Mark user as verified (veri)

// Register
register(req, res):
  - Check if phone exists
  - Hash password with MD5
  - Generate unique user code
  - Set invite code if provided
  - Create user record

// OTP
verifyCode(req, res):
  - Send OTP to phone
  - Verify OTP

// Password reset
forGotPassword(req, res):
  - Verify OTP
  - Update password
```

#### **userController** (User Operations)

```javascript
// User profile
userInfo(req, res):
  - Get user details from JWT token
  - Return profile data

// Transfers
transfer(req, res):
  - Verify target user exists
  - Check balance
  - Deduct from sender
  - Add to receiver
  - Create transfer record

// Recharge
recharge(req, res):
  - Validate amount > MINIMUM_MONEY
  - Create recharge request
  - Return payment method info
  - Generate payment link

// Withdrawal
withdrawal3(req, res):
  - Verify bank account exists
  - Create withdrawal request
  - Deduct from balance
  - Wait for admin approval

// Promotion
promotion(req, res):
  - Return user's referral code
  - Return referral link
  - Return earned commission
```

#### **winGoController** (Game Logic)

```javascript
// Place bet
betWinGo(req, res):
  - Extract user from JWT
  - Validate bet amount
  - Lock balance (money_freezing)
  - Create order record
  - Broadcast via Socket.io
  - Return bet confirmation

// Get game results
GetMyEmerdList(req, res):
  - Get user's bets
  - Get results for completed games
  - Calculate payouts for winners
  - Return bet history

// Affiliate commission
rosesPlus(auth, money):
  - Get user and inviter
  - Loop through 6 levels
  - Calculate commission per level
  - Update user balances
  - Create rose records (commission tracking)
  - Update turnover tracking
```

#### **adminController** (Admin Operations)

```javascript
// User management
listMember(req, res):
  - Search/filter users
  - Return paginated list

banned(req, res):
  - Set user status = 0
  - Prevent user access

// Financial approval
recharge(req, res):
  - Approve/reject recharge request
  - Update user balance if approved

withdraw(req, res):
  - Approve/reject withdrawal
  - Process payment to bank

// Game management
editResult(req, res):
  - Update game result
  - Recalculate all bets for that period
  - Update user balances
  - Send new result to connected clients via Socket.io

// Statistics
statistical(req, res):
  - Count total users
  - Sum total bets
  - Calculate revenue
  - Return dashboard data
```

### **Socket.io (Real-time Updates)**

```javascript
// src/controllers/socketIoController.js

const sendMessageAdmin = (io) => {
    io.on('connection', (socket) => {
        // User connected
        console.log('User connected:', socket.id)
        
        // Listen for events
        socket.on('disconnect', () => {
            console.log('User disconnected')
        })
        
        // Broadcast game results
        socket.emit('gameResult', {
            period: '2022070110000',
            result: '5',
            game: 'wingo'
        })
    })
}
```

**Frontend Socket.io usage**:
```javascript
// frontend JavaScript
const socket = io()

socket.on('gameResult', (data) => {
    console.log('Result:', data.result)
    updateUI(data)
})
```

### **Cron Jobs (Scheduled Tasks)**

```javascript
// src/controllers/cronJobContronler.js

const cronJobGame1p = (io) => {
    // Run every 1 minute (60000ms)
    cron.schedule('*/1 * * * *', async () => {
        // Generate game result
        let result = Math.floor(Math.random() * 10)
        
        // Save to database
        await connection.execute(
            'INSERT INTO wingo SET period = ?, result = ?, game = ?, status = 1',
            [periodId, result, 'wingo']
        )
        
        // Get all bets for this period
        const [bets] = await connection.query(
            'SELECT * FROM orders_wingo WHERE period = ?',
            [periodId]
        )
        
        // Calculate winners/losers
        bets.forEach(async (bet) => {
            if (bet.result == result) {
                // Winner: add winnings
                let payout = bet.amount * bet.odds
                await connection.execute(
                    'UPDATE users SET money = money + ? WHERE phone = ?',
                    [payout, bet.phone]
                )
                // Add commission to upline
                await rosesPlus(bet.phone, bet.amount)
            } else {
                // Loser: no action (already deducted)
            }
        })
        
        // Broadcast result to all connected clients
        io.emit('gameResult', { period: periodId, result })
    })
}
```

**Cron schedule syntax**:
```
*    *    *    *    *
┬    ┬    ┬    ┬    ┬
│    │    │    │    │
│    │    │    │    └─ Day of week (0 - 7)
│    │    │    └────── Month (1 - 12)
│    │    └───────────── Day of month (1 - 31)
│    └──────────────────── Hour (0 - 23)
└───────────────────────────── Minute (0 - 59)

Examples:
'*/1 * * * *'   - Every minute
'*/5 * * * *'   - Every 5 minutes
'0 * * * *'     - Every hour
'0 0 * * *'     - Every day at midnight
```

---

## Money Flow & Commission System

### **Commission Structure**

#### **How Bets Generate Commission**

```
User A (Inviter) invites User B (Invitee)
↓
User B places bet of 1000
↓
User A receives commission: 1000 * level_config.f1
  (f1 depends on User A's VIP level)
↓
Commission added to User A's rose_f and total money
```

#### **Multi-Level Example**

```
User A (Level 0: f1=0.6/0.006)
  └─ User B (Level 0)
      └─ User C (Level 0)

User C places bet: 1000
  ↓
  User B gets: 1000 * 0.6 = 600? (seems wrong, actual: 0.006 * 1000 = 6)
  User A gets: 6 * 0.18 = 1.08? (second level: f2 = 0.18)

Note: The system uses decimal calculations (0.006 = 0.6%)
```

#### **Level Configuration**

From `CreateDatabase.js`:
```javascript
// Level table structure
INSERT INTO level SET id = 1, level = 0, f1 = 0.6, f2 = 0.18, f3 = 0.054, f4 = 0.0162
INSERT INTO level SET id = 2, level = 1, f1 = 0.7, f2 = 0.21, f3 = 0.063, f4 = 0.0189
INSERT INTO level SET id = 3, level = 2, f1 = 0.75, f2 = 0.225, f3 = 0.0675, f4 = 0.0203
INSERT INTO level SET id = 4, level = 3, f1 = 0.8, f2 = 0.24, f3 = 0.072, f4 = 0.0216
INSERT INTO level SET id = 5, level = 4, f1 = 0.85, f2 = 0.255, f3 = 0.0765, f4 = 0.023
INSERT INTO level SET id = 6, level = 5, f1 = 0.9, f2 = 0.27, f3 = 0.081, f4 = 0.0243
INSERT INTO level SET id = 7, level = 6, f1 = 1.0, f2 = 0.3, f3 = 0.09, f4 = 0.027

// Interpretation:
// level 0 (default): Get 60% of level1, 18% of level2, 5.4% of level3, 1.62% of level4
// Higher levels get better percentages
```

### **Wallet Operations Flow**

#### **Recharge Flow**

```
1. User requests recharge
   /api/webapi/recharge
   ↓
2. System creates pending record in recharge table
   status = 0 (pending)
   ↓
3. User receives payment instructions:
   - Bank account details
   - UPI payment link
   - USDT address
   - WowPay link
   ↓
4. User makes payment outside system
   ↓
5. For manual payment: User uploads proof
   /api/webapi/confirm_recharge
   ↓
6. Admin reviews in admin panel
   /admin/manager/recharge
   ↓
7. Admin approves: 
   - Update recharge.status = 1
   - Add amount to user.money
   - Create activity record
   ↓
8. User money updated, can place bets
```

#### **Betting Flow**

```
User has: money = 5000
↓
Places bet: amount = 100
↓
System deducts immediately:
  - Deduct from money: money = 4900
  - Lock in money_freezing: money_freezing = 100
  - Create order record (pending)
  ↓
Period ends, result determined
  ↓
If won:
  - Payout = 100 * odds (e.g., 2x = 200)
  - money = 4900 + 200 = 5100
  - money_freezing = 0
  - Affiliate commissions added
  ↓
If lost:
  - money = 4900 (bet already deducted)
  - money_freezing = 0
  - No commission
```

#### **Withdrawal Flow**

```
User requests withdrawal: 500
  ↓
System checks:
  - Balance >= 500 ✓
  - Bank account linked ✓
  ↓
Create withdraw record
  withdrawal.status = 0 (pending)
  money_freezing += 500
  ↓
Admin reviews in admin panel
  /admin/manager/withdraw
  ↓
Admin processes:
  - Transfer funds to user bank
  - Update withdrawal.status = 1
  - Deduct from money: money -= 500
  - Clear money_freezing
  ↓
User receives funds in bank account
```

#### **Transfer Flow**

```
User A: money = 5000
User B: money = 1000
  ↓
A transfers 1000 to B
  /api/webapi/transfer
  ↓
System verifies:
  - B exists ✓
  - A has balance ≥ 1000 ✓
  ↓
Process:
  - A.money = 5000 - 1000 = 4000
  - B.money = 1000 + 1000 = 2000
  - Create transfer record
  ↓
Transfer complete
```

### **Safe Wallet (Vault Feature)**

```
Main wallet: 5000
Safe wallet: 0
  ↓
Transfer 2000 to safe:
  /api/webapi/transferToSafe
  ↓
Main wallet: 3000
Safe wallet: 2000
  ↓
Safe money is locked, can't be used for betting
(Can only be transferred back to main or withdrawn)
```

---

## Security & Authentication

### **Password Security**

```javascript
// Hashing with MD5 (Note: MD5 is deprecated, use bcrypt in production)
import md5 from 'md5'

const hashedPassword = md5(password)
// Store hashedPassword in database

// Verification
const inputPassword = md5(userInput)
if (inputPassword === storedHashedPassword) {
    // Correct password
}
```

**Issue**: MD5 is cryptographically broken. In production, use bcrypt:
```javascript
import bcrypt from 'bcrypt'

// Hashing
const hashed = await bcrypt.hash(password, 10)

// Verifying
const valid = await bcrypt.compare(password, hashed)
```

### **JWT Token**

```javascript
// Generate token
import jwt from 'jsonwebtoken'

const token = jwt.sign(
    { phone, userId },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: '30d' } // (not implemented in this project)
)

// Store in cookie
res.cookie('auth', token, {
    httpOnly: true,      // Prevent JavaScript access
    secure: true,        // HTTPS only
    sameSite: 'Strict'   // CSRF protection
})
```

**Current implementation**: 
- Token stored in cookie named 'auth'
- Checked on every protected endpoint
- No expiration (security risk)

### **Cookie Management**

```javascript
// Extract token from cookies
const auth = req.cookies.auth

// Validate token format
const [rows] = await connection.execute(
    'SELECT token, status FROM users WHERE token = ? AND veri = 1',
    [auth]
)
```

### **Access Control**

**3-tier system**:

1. **Public routes** (no auth required)
   - `/login`, `/register`, `/home` (landing page)

2. **User routes** (middlewareController)
   - `/wallet`, `/profile`, game pages
   - Checks: token valid + user verified + status active

3. **Admin/Manager routes** (middlewareAdminController / middlewareDailyController)
   - `/admin/manager/*`, `/manager/*`
   - Checks: token valid + is_admin or is_manager flag

### **SQL Injection Prevention**

Uses parameterized queries (prepared statements):

```javascript
// Safe - prevents SQL injection
const [rows] = await connection.execute(
    'SELECT * FROM users WHERE phone = ? AND status = ?',
    [phone, status]
)

// Unsafe (avoid)
const query = `SELECT * FROM users WHERE phone = '${phone}'`
```

### **Recommended Security Improvements**

1. **Replace MD5 with bcrypt** for password hashing
2. **Add JWT expiration** (currently missing)
3. **Use environment variables** for sensitive data (✓ implemented)
4. **Enable HTTPS** in production
5. **Add rate limiting** to prevent brute force attacks
6. **Implement CSRF protection** (use csrf middleware)
7. **Add input validation** (sanitize user inputs)
8. **Use HTTP-only cookies** for JWT storage (✓ configured)
9. **Implement account lockout** after failed login attempts
10. **Add audit logging** for admin actions

---

## Cron Jobs & Real-time Features

### **Automated Tasks (Cron Jobs)**

Located in `cronJobContronler.js`

#### **1. Game Period Generation** (Every 1 minute)

```javascript
cron.schedule('*/1 * * * *', async () => {
    // For each game type (wingo, 5d, k3)
    // Generate new period
    let newPeriod = getCurrentPeriod()
    
    // Generate result
    let result = generateResult()
    
    // Create new period record
    await connection.execute(
        'INSERT INTO wingo SET period = ?, result = ?, game = ?, status = 1',
        [newPeriod, result, gameType]
    )
    
    // Process previous period's bets
    processBets(previousPeriod)
    
    // Broadcast to all clients
    io.emit('newPeriod', { period: newPeriod })
})
```

#### **2. Salary/Commission Payout** (Scheduled, admin-triggered)

```javascript
// Called when admin creates salary record
const CreatedSalary = async (req, res) => {
    // Get all users with commission earned
    const [users] = await connection.query(
        'SELECT phone, roses_f FROM users WHERE roses_f > 0'
    )
    
    // Process each user
    users.forEach(async (user) => {
        // Transfer commission to main wallet
        await connection.execute(
            'UPDATE users SET money = money + ?, roses_f = 0 WHERE phone = ?',
            [user.roses_f, user.phone]
        )
        
        // Create salary record
        await connection.execute(
            'INSERT INTO salary_records SET phone = ?, amount = ?',
            [user.phone, user.roses_f]
        )
    })
}
```

### **Real-time Features (Socket.io)**

Socket.io enables real-time bidirectional communication between server and clients.

#### **Server Setup**

```javascript
// src/server.js
const server = require('http').createServer(app)
const io = require('socket.io')(server)

// Controller handles Socket.io logic
socketIoController.sendMessageAdmin(io)
```

#### **Broadcasting Game Results**

When a game period ends, results are broadcast to all connected clients immediately:

```javascript
// In game processor
io.emit('gameResult', {
    period: '2022070110001',
    result: '7',
    game: 'wingo',
    timestamp: Date.now()
})
```

#### **Frontend Socket.io**

```javascript
// client.js
const socket = io()

socket.on('gameResult', (data) => {
    console.log('New result:', data)
    
    // Update UI
    document.getElementById('result').innerText = data.result
    
    // Calculate if user won
    if (userBetResult == data.result) {
        showWinAnimation()
        updateBalance()
    } else {
        showLoseAnimation()
    }
})

// Listen for connection status
socket.on('connect', () => {
    console.log('Connected to server')
})

socket.on('disconnect', () => {
    console.log('Disconnected from server')
    // Attempt to reconnect
})
```

#### **Event Types**

```javascript
// Broadcasting game events
io.emit('gameResult', data)        // Result published
io.emit('newPeriod', data)         // New period available
io.emit('balanceUpdate', data)     // User balance changed
io.emit('notification', data)      // System notification
io.emit('announcement', data)      // Platform announcement

// User-specific events
socket.emit('personalMessage', data)   // Direct to one user
```

---

## Troubleshooting & Common Issues

### **Installation Issues**

#### **Issue**: npm install fails with missing dependencies

**Solution**:
```bash
# Clear cache
npm cache clean --force

# Delete existing installations
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### **Issue**: MySQL connection refused

**Check**:
```bash
# Verify MySQL is running
# Windows: Check Services (mysql80)
# Mac: brew services list
# Linux: sudo systemctl status mysql

# Check credentials in .env
# Database must exist: babagames
```

**Solution**:
```bash
# Create database if not exists
mysql -u root -p
CREATE DATABASE babagames;

# Run initialization
npm run database
```

### **Runtime Issues**

#### **Issue**: User can't login after registration

**Causes**:
1. User not verified (veri = 0)
   - Check OTP verification flow in accountController
2. User status is 0 (banned)
3. Token not set properly

**Debug**:
```bash
# Check user in database
mysql -u root babagames
SELECT phone, veri, status, token FROM users LIMIT 5;
```

#### **Issue**: Game results not updating in real-time

**Causes**:
1. Socket.io not properly initialized
2. Client not connected to server
3. Browser console shows WebSocket errors

**Debug**:
```javascript
// In browser console
socket.on('connect', () => console.log('Connected'))
socket.on('disconnect', () => console.log('Disconnected'))
socket.on('gameResult', (data) => console.log('Result:', data))
```

#### **Issue**: Bets not being saved

**Causes**:
1. Database connection issue
2. User not authenticated
3. Insufficient balance

**Debug**:
```bash
# Check orders table
mysql babagames
SELECT COUNT(*) FROM orders_wingo;
SELECT * FROM orders_wingo LIMIT 5;
```

#### **Issue**: Admin panel not accessible

**Causes**:
1. User account doesn't have is_admin = 1
2. Wrong login credentials
3. Session expired

**Solution**:
```bash
# Update user to admin
mysql babagames
UPDATE users SET is_admin = '1' WHERE phone = '1234567890';
```

### **Database Issues**

#### **Issue**: Database connection pooling errors

**Solution**:
```javascript
// In connectDB.js, increase pool size
const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'babagames',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})
```

#### **Issue**: Tables not created from npm run database

**Solution**:
```bash
# Run migration manually
mysql -u root babagame < migration.sql

# Or create tables individually
mysql babagames
CREATE TABLE users (...);
CREATE TABLE wingo (...);
```

### **Performance Issues**

#### **Issue**: Server responds slowly

**Causes**:
1. Too many database queries
2. Cron jobs running too frequently
3. Socket.io broadcasting overhead

**Solution**:
```javascript
// Add database query caching
// Reduce cron job frequency
// Optimize Socket.io events

// Example: Only broadcast to relevant clients
io.to(`game_${gameType}`).emit('result', data)
```

#### **Issue**: High CPU usage

**Solution**:
1. Check cron job frequency
2. Look for infinite loops in controllers
3. Use `top` command to identify bottlenecks

### **Security Issues**

#### **Issue**: Password hashing with MD5

**Solution**: Migrate to bcrypt
```bash
npm install bcrypt
```

```javascript
// Update accountController.js
import bcrypt from 'bcrypt'

// Registration
const hashedPassword = await bcrypt.hash(password, 10)

// Login
const valid = await bcrypt.compare(password, user.password)
```

#### **Issue**: JWT tokens don't expire

**Solution**:
```javascript
// Add expiration
const token = jwt.sign(
    { phone, userId },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: '30d' }
)

// Verify expiration
try {
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN)
} catch (error) {
    // Token expired
    res.redirect('/login')
}
```

### **Game Logic Issues**

#### **Issue**: Bets not crediting winnings

**Causes**:
1. Game result not saving to database
2. Bet verification logic broken
3. Payout calculation wrong

**Debug**:
```bash
# Check game results
SELECT * FROM wingo ORDER BY id DESC LIMIT 5;

# Check bets for that period
SELECT * FROM orders_wingo WHERE period = '2022070110001';

# Check user balance updates
SELECT money, money_freezing FROM users WHERE phone = '...' \G
```

---

## Advanced Topics

### **Adding a New Game Type**

1. **Create database table**:
```sql
CREATE TABLE newgame (
    id INT PRIMARY KEY AUTO_INCREMENT,
    period VARCHAR(50) UNIQUE,
    result VARCHAR(50),
    status ENUM('0', '1'),
    time BIGINT
);

CREATE TABLE orders_newgame (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20),
    period VARCHAR(50),
    amount DECIMAL(15,2),
    prediction VARCHAR(50),
    result VARCHAR(50),
    status ENUM('0', '1', '2'),
    payout DECIMAL(15,2),
    time BIGINT
);
```

2. **Create controller**: `newGameController.js`

3. **Add routes**: In `web.js`

4. **Create views**: In `src/views/bet/newgame/`

5. **Add Socket.io broadcasting**: In `socketIoController.js`

6. **Add cron job**: In `cronJobContronler.js`

### **Deploying to Production**

1. **Get domain & SSL certificate**
2. **Update `.env`** with production values
3. **Use environment-specific configs**
4. **Enable HTTPS**
5. **Set up database backups**
6. **Monitor logs and performance**
7. **Update `APP_BASE_URL`** in .env

### **Database Backup & Recovery**

```bash
# Backup
mysqldump -u root -p babagames > backup.sql

# Restore
mysql -u root -p babagames < backup.sql
```

---

## Project Building & Modification Guide

### **For New Developer (Building from Scratch)**

**Week 1: Setup & Basic Understanding**
- Install dependencies and configure database
- Understand EJS templating
- Review routes architecture
- Learn middleware pattern

**Week 2: User System**
- Implement registration/login
- Database user management
- JWT token handling
- Cookie authentication

**Week 3-4: Game Implementation**
- Create game tables and models
- Implement betting logic
- Add cron jobs for results
- Set up Socket.io broadcasting

**Week 5: Wallet System**
- Implement recharge/withdrawal
- Payment gateway integration
- Balance management
- Transaction history

**Week 6: Admin Panel**
- Create admin routes
- Build game management
- User management interface
- Statistics dashboard

**Week 7: Testing & Deployment**
- Test all features
- Deploy to server
- Set up monitoring
- Handle issues

---

**This documentation provides a complete guide to understand, maintain, and extend the BABA GAMES platform. Refer to relevant sections when modifying or troubleshooting the application.**

---

*Last Updated: April 2026*
*Project: BABA GAMES v1.0.0*
