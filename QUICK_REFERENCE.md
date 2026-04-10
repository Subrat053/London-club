# BABA GAMES - Quick Reference Guide

## Project At a Glance

**Type**: Online Betting Platform (Gambling Games)
**Stack**: Node.js + Express + EJS + MySQL + Socket.io
**Games**: WINGO (1/3/5/10 min), 5D Lottery, K3 (Thai Hi-Lo)
**Users**: Players, Managers, Admins
**Database**: MySQL with commission tracking system

---

## Quick Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create MySQL database
mysql -u root -p
CREATE DATABASE babagames;

# 3. Initialize database
npm run database

# 4. Configure .env (if needed)
# PORT=5005
# DATABASE_HOST=localhost
# DATABASE_USER=root

# 5. Start server
npm start

# Access at http://localhost:5005
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/server.js` | Server entry point, routes setup |
| `src/routes/web.js` | All 300+ route definitions |
| `src/controllers/` | Business logic for each feature |
| `src/views/` | EJS HTML templates |
| `src/public/js/` | Frontend JavaScript |
| `src/config/connectDB.js` | MySQL connection |
| `.env` | Configuration variables |

---

## Folder Structure at a Glance

```
src/
├── server.js                 → Main server
├── routes/web.js             → All API routes
├── controllers/              → Business logic
│   ├── accountController.js  → Login/Register
│   ├── userController.js     → User operations
│   ├── winGoController.js    → Game logic
│   ├── adminController.js    → Admin operations
│   └── [others]
├── views/                    → HTML templates (EJS)
│   ├── account/              → Login, Register
│   ├── home/                 → Home page
│   ├── bet/                  → Game pages
│   ├── wallet/               → Wallet pages
│   ├── manage/               → Admin panels
│   └── [others]
├── public/                   → Static files
│   ├── css/                  → Stylesheets
│   ├── js/                   → Frontend logic
│   ├── images/               → Images
│   └── assets/               → UI library, fonts
└── config/
    ├── connectDB.js          → MySQL pool
    └── configEngine.js       → EJS setup
```

---

## Database Tables (Essential)

| Table | Purpose |
|-------|---------|
| `users` | User accounts, profiles, balances |
| `wingo` | Game periods/results |
| `orders_wingo` | Individual bets placed |
| `recharge` | Deposit transactions |
| `withdraw` | Withdrawal transactions |
| `level` | Commission structure |
| `roses` | Commission tracking |
| `admin` | Platform settings |

---

## Main Routes

### User Pages (No API)
```
GET  /home                 → Home page
GET  /login                → Login form
GET  /register             → Registration form
GET  /wallet               → Wallet page
GET  /win, /5d, /k3        → Game pages
GET  /promotion            → Referral page
GET  /vip                  → VIP info
```

### API Endpoints (POST/GET)
```
POST /api/webapi/login                    → User login
POST /api/webapi/register                 → User registration
POST /api/webapi/action/join              → Place WINGO bet
POST /api/webapi/action/5d/join           → Place 5D bet
POST /api/webapi/action/k3/join           → Place K3 bet
POST /api/webapi/recharge                 → Request deposit
POST /api/webapi/withdrawal               → Request withdrawal
POST /api/webapi/transfer                 → Transfer to user
GET  /api/webapi/GetUserInfo              → Get profile

ADMIN:
POST /api/webapi/admin/recharge           → Approve deposit
POST /api/webapi/admin/withdraw           → Approve withdrawal
POST /api/webapi/admin/banned             → Ban user
POST /api/webapi/admin/5d/editResult      → Set game result
```

---

## User Flow

```
1. Register
   ↓ (Create user account, generate code)
2. Login
   ↓ (JWT token in cookie)
3. Navigate to game
   ↓ (E.g., /win for WINGO)
4. Place bet
   ↓ (Money deducted, order created)
5. Wait for result
   ↓ (Cron job generates result after time)
6. See winnings/losses
   ↓ (Real-time via Socket.io)
7. Withdraw money
   ↓ (Admin approval needed)
```

---

## Admin Features Quick Access

```
URL Pattern: /admin/manager/[page]

/admin/manager/index              → WINGO game management
/admin/manager/5d                 → 5D game management
/admin/manager/k3                 → K3 game management
/admin/manager/members            → User management
/admin/manager/ctv                → Affiliate management
/admin/manager/recharge           → Approve deposits
/admin/manager/withdraw           → Approve withdrawals
/admin/manager/statistical        → Dashboard/statistics
/admin/manager/levelSetting       → Commission rates
/admin/manager/CreatedSalaryRecord → Payout settings
```

---

## Commission System

**How it works:**
1. User places bet: 1000
2. Referrer gets commission: 1000 × level_rate
3. Commission goes to: `money` + `roses_f` fields
4. After payout: moved to main money

**Levels (0-6):**
- Level 0: f1=0.6 (60% of bet, decimal: 0.6%)
- Level 1: f1=0.7
- Level 2: f1=0.75
- Level 3: f1=0.8
- Level 4: f1=0.85
- Level 5: f1=0.9
- Level 6: f1=1.0

*Note: Actual calculation uses f1 as decimal (multiply by amount)*

---

## Payment Methods Supported

| Method | Type | Status |
|--------|------|--------|
| Manual Bank | Manual verification | Implemented |
| Manual UPI | Manual verification | Implemented |
| Manual USDT | Manual verification | Implemented |
| UPI Gateway | Automated | Configured |
| WowPay | Third-party | Configured |

---

## Important Functions

### Authentication
```javascript
middlewareController       // Check user logged in
middlewareDailyController  // Check manager/CTV status
middlewareAdminController  // Check admin status
```

### Game Logic
```javascript
betWinGo()       // Place WINGO bet
betK5D()         // Place 5D bet
betK3()          // Place K3 bet
rosesPlus()      // Calculate commissions
```

### User Operations
```javascript
login()          // User login
register()       // User registration
recharge()       // Deposit request
withdrawal3()    // Withdrawal request
transfer()       // User-to-user transfer
```

---

## Common Edits

### Change Minimum Deposit
```javascript
// In .env
MINIMUM_MONEY=100  // Change to desired amount
```

### Change Server Port
```javascript
// In .env
PORT=5005  // Change to desired port
```

### Add New Game
1. Create table: `CREATE TABLE newgame (...)`
2. Create controller: `src/controllers/newGameController.js`
3. Add routes: Edit `src/routes/web.js`
4. Add views: Create `src/views/bet/newgame/`
5. Add cron job: Edit `cronJobContronler.js`

### Make User Admin
```bash
mysql babagames
UPDATE users SET is_admin = '1' WHERE phone = '1234567890';
```

---

## Debugging Tips

### Check User in Database
```bash
mysql babagames
SELECT phone, password, is_admin, veri, status FROM users LIMIT 5;
```

### View Bets Placed
```bash
SELECT * FROM orders_wingo WHERE phone = '1234567890';
```

### Check Game Results
```bash
SELECT * FROM wingo ORDER BY id DESC LIMIT 5;
```

### View Balance
```bash
SELECT phone, money, money_freezing, roses_f FROM users WHERE phone = '1234567890';
```

### Check Commission Records
```bash
SELECT * FROM roses WHERE phone = '1234567890';
```

---

## Common Issues & Fixes

| Issue | Quick Fix |
|-------|-----------|
| Can't login | Check veri=1, status=1 in users table |
| Bet not saving | Check if user has balance |
| Result not updating | Check cron jobs running |
| Admin access denied | Add is_admin=1 to user |
| Game not loading | Check socket.io connection |
| Balance not updating | Check real-time socket events |

---

## Tech Stack Overview

```
Frontend:
├── EJS (templating)
├── HTML/CSS3
├── Vanilla JavaScript
├── Socket.io (real-time)
└── Vant UI (components)

Backend:
├── Express.js (framework)
├── Node.js (runtime)
├── JWT (authentication)
├── node-cron (scheduling)
└── Socket.io (WebSocket)

Database:
├── MySQL 2 (driver)
├── Connection pooling
└── SQL queries
```

---

## Environment Variables Explained

```env
PORT=5005                  # Server port

JWT_ACCESS_TOKEN=...       # JWT secret (change in production!)
secret_key=...             # Session secret

DATABASE_HOST=localhost    # MySQL host
DATABASE_USER=root         # MySQL username
DATABASE_PASSWORD=         # MySQL password
DATABASE_NAME=babagames    # Database name

UPI_GATEWAY_PAYMENT_KEY=...    # UPI provider key
WOWPAY_MERCHANT_ID=...         # WowPay merchant ID
WOWPAY_MERCHANT_KEY=...        # WowPay merchant key

APP_BASE_URL=https://example.com    # Your domain
APP_NAME=BABA GAMES                 # Platform name

MINIMUM_MONEY=100          # Min recharge amount
```

---

## Game Results Calculation

**WINGO**: 
- Last digit of reference (TCS Nifty/Sensex)
- Or custom random 0-9
- Odds: Color 2x, Number 9x

**5D**:
- Predicted 5-digit number
- Odds: Based on correctness
- Similar to lottery

**K3**:
- 3-dice combination
- Sum-based predictions
- Various odds per combo

---

## Useful Commands

```bash
# Start development server (with auto-reload)
npm start

# Initialize database
npm run database

# View logs
tail -f [log_file]

# Database backup
mysqldump -u root -p babagames > backup.sql

# Database restore
mysql -u root -p babagames < backup.sql

# Check MySQL status
systemctl status mysql  # Linux
brew services list     # Mac

# Stop server
Ctrl + C
```

---

## Support & Contact

**Admin Panel**: At `/admin/manager/settings`
- Edit support links
- Configure customer service
- Update contact info

---

## Next Steps for New Developers

1. **Read** PROJECT_DOCUMENTATION.md (full guide)
2. **Explore** src/routes/web.js (understand routes)
3. **Check** src/controllers/userController.js (see pattern)
4. **Review** src/views/ (understand templates)
5. **Test** features manually
6. **Modify** something small to understand flow
7. **Build** new features confidently

---

*Quick Reference v1.0 - April 2026*
*See PROJECT_DOCUMENTATION.md for detailed information*
