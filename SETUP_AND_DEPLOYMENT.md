# BABA GAMES - Setup & Deployment Guide

## Complete Setup Instructions

### Prerequisites Checklist

- [ ] Node.js v12.0.0+ installed
- [ ] npm 6.0.0+ installed
- [ ] MySQL Server 5.7+ installed and running
- [ ] Text editor or IDE (VSCode recommended)
- [ ] Git (optional, for version control)
- [ ] Command line/Terminal knowledge

**Verify installations:**
```bash
node --version    # Should show v12+
npm --version     # Should show 6+
mysql --version   # Should show 5.7+
```

---

## Step 1: Download & Extract Project

### Option A: From ZIP file
```bash
# Extract the provided babagame.zip file
# Navigate to the extracted folder
cd babagame
```

### Option B: From Git Repository
```bash
git clone https://github.com/username/babagame.git
cd babagame
```

---

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will download:
# - express.js
# - mysql2
# - ejs
# - socket.io
# - and all other dependencies from package.json
```

**If installation fails:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules package-lock.json
# (Windows: del node_modules /s /q && del package-lock.json)

# Reinstall
npm install --verbose
```

**Common installation errors:**
- PHP extension errors (grpc, mongodb, sodium): Check user memory notes
- Network timeout: Increase timeout with `npm install --fetch-timeout=120000`
- Permission denied: Use `sudo npm install` (if needed on Mac/Linux)

---

## Step 3: Setup MySQL Database

### On Windows:
```bash
# Open Command Prompt or PowerShell as Administrator

# Start MySQL
# Method 1: If MySQL is running as service (default)
# Already running

# Method 2: If installed locally
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysql -u root -p

# Or use MySQL Workbench GUI (easier)
```

### On Mac:
```bash
# Start MySQL
mysql.server start

# Or from Homebrew
brew services start mysql

# Connect to MySQL
mysql -u root -p
# Password is usually blank or your set password
```

### On Linux:
```bash
# Start MySQL service
sudo systemctl start mysql

# Connect to MySQL
mysql -u root -p
```

### Create Database

```sql
-- Once connected to MySQL, run:

CREATE DATABASE babagames CHARACTER SET utf8 COLLATE utf8_general_ci;

-- Verify database created
SHOW DATABASES;

-- You should see "babagames" in the list

-- Exit MySQL
exit;
```

---

## Step 4: Initialize Database Tables

From your project root directory:

```bash
# This runs the CreateDatabase.js file
npm run database

# Expected output:
# Connected successfully
# Create Success Database Wingo.
# Create Success Database 5D.
# Create Success Database K3.
# Please press ctrl + C and enter npm start to run the server.
```

**What gets created:**
- `users` table (for user accounts)
- `wingo`, `5d`, `k3` tables (game data)
- `orders_wingo`, `orders_5d`, `orders_k3` tables (bets)
- `recharge`, `withdraw` tables (financial)
- `level` table (commission structure with default values)
- `admin` table (platform settings)
- `bank_recharge` table (platform bank accounts)
- And many more supporting tables

**If initialization fails:**

```bash
# Check if database exists
mysql -u root -p
USE babagames;
SHOW TABLES;

# If tables already exist, that's fine
# The initialization script deletes and recreates them

# If you want to start fresh:
DROP DATABASE babagames;
CREATE DATABASE babagames CHARACTER SET utf8 COLLATE utf8_general_ci;
npm run database
```

---

## Step 5: Configure Environment Variables

### Create .env file (if not exists)

In the project root directory, create a file named `.env`:

```env
# ==========================================
# SERVER CONFIG
# ==========================================
PORT=5005

# ==========================================
# DATABASE CONFIG  
# ==========================================
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=babagames

# If using different credentials:
# DATABASE_HOST=192.168.1.100
# DATABASE_USER=babauser
# DATABASE_PASSWORD=strongpassword123
# DATABASE_NAME=babagames

# ==========================================
# SECURITY & JWT
# ==========================================
JWT_ACCESS_TOKEN=shas$isbwDBWDN2543#jcws
secret_key=ap6v9njn

# WARNING: Change these in production!
# Example production values:
# JWT_ACCESS_TOKEN=your_long_random_string_here_min_32_chars
# secret_key=another_random_string_for_session_encryption

# ==========================================
# PAYMENT GATEWAYS
# ==========================================

# UPI Payment Gateway
UPI_GATEWAY_PAYMENT_KEY=0c79da69-fdc1-4a07-a8b4-7135a0168385

# WowPay Payment Gateway
WOWPAY_MERCHANT_ID=100789501
WOWPAY_MERCHANT_KEY=f5b22eabfd774a98befdb220fb7af60c

# ==========================================
# PLATFORM CONFIGURATION
# ==========================================
APP_BASE_URL=http://localhost:5005
APP_NAME=BABA GAMES
PAYMENT_EMAIL=admin@example.com
PAYMENT_INFO=WINGO PAYMENT

# ==========================================
# BUSINESS LOGIC
# ==========================================
MINIMUM_MONEY=100
accountBank=vp6262
```

### Important Configuration Notes

**For Development:**
```env
APP_BASE_URL=http://localhost:5005
DATABASE_HOST=localhost
PORT=5005
```

**For Production:**
```env
APP_BASE_URL=https://www.yourdomain.com
DATABASE_HOST=remote.mysql.server.com
PORT=80 or 443
JWT_ACCESS_TOKEN=<generate-strong-random-string>
secret_key=<generate-strong-random-string>
DATABASE_PASSWORD=<strong-password>
```

---

## Step 6: Start the Server

```bash
# Start development server with auto-reload
npm start

# Expected output:
# [nodemon] restarting due to changes...
# Connected success port: 5005

# Server running at http://localhost:5005
```

**Server Details:**
- Framework: Express.js
- Auto-reload: Enabled (nodemon watches for changes)
- Default port: 5005 (can be changed via .env PORT)
- Database: Connected to babagames MySQL database

---

## Step 7: Verify Installation

### Test Server

Open browser:
```
http://localhost:5005/

# Should redirect to /home (landing page)
```

### Create Test User

```
1. Go to http://localhost:5005/register
2. Fill in form:
   - Phone: 1234567890
   - Password: test@123
3. Click Register
4. Go to http://localhost:5005/login
5. Login with credentials from step 2
6. Should see home page with wallet, balance, etc.
```

### Verify Admin Panel

```bash
# Login as admin user
# First, you need to make a user admin

mysql babagames
UPDATE users SET is_admin = '1' WHERE phone = '1234567890';
exit;

# Then go to http://localhost:5005/admin/manager/index
# Should see admin dashboard
```

### Check Database

```bash
mysql -u root babagames

# View users
SELECT phone, is_admin, is_manager, veri FROM users LIMIT 5;

# View games
SELECT * FROM wingo LIMIT 3;
SELECT * FROM 5d LIMIT 3;

# View level configuration
SELECT * FROM level;

exit;
```

---

## Production Deployment Guide

### Prerequisites for Production

- [ ] Server/VPS (AWS, DigitalOcean, Linode, etc.)
- [ ] Domain name (with SSL certificate)
- [ ] MySQL database (hosted or local)
- [ ] Git for deployment
- [ ] PM2 or systemd for process management

### Deployment Steps

#### 1. Prepare Server

```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt-get update && apt-get upgrade -y  # Ubuntu/Debian
yum update -y  # CentOS/RHEL

# Install Node.js
curl https://nodejs.org -o nodejs.sh
bash nodejs.sh
node --version

# Install MySQL
apt-get install mysql-server -y
```

#### 2. Clone Project

```bash
# Navigate to deployment directory
cd /var/www

# Clone from git (or upload via SFTP)
git clone https://github.com/username/babagame.git
cd babagame

# Install dependencies
npm install --production
```

#### 3. Configure Production .env

```bash
nano .env
# Or use any editor

# Set production values:
PORT=80  (or 8080 if using reverse proxy)
APP_BASE_URL=https://www.yourdomain.com
DATABASE_HOST=mysql.yourdomain.com (or localhost)
DATABASE_USER=babagames_user
DATABASE_PASSWORD=strong_random_password
JWT_ACCESS_TOKEN=generate_random_string_here
secret_key=another_random_string_here

# Save and exit
```

#### 4. Setup MySQL

```bash
# Connect to MySQL
mysql -u root -p

# Create database user
CREATE USER 'babagames_user'@'localhost' IDENTIFIED BY 'strong_random_password';
GRANT ALL PRIVILEGES ON babagames.* TO 'babagames_user'@'localhost';
FLUSH PRIVILEGES;

# Create and initialize database
CREATE DATABASE babagames;
exit;

# Initialize tables
npm run database
```

#### 5. Setup Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start src/server.js --name "babagame"

# Make it auto-restart on server reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 monit
```

#### 6. Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
apt-get install nginx -y

# Create config
nano /etc/nginx/sites-available/babagame

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name www.yourdomain.com yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name www.yourdomain.com yourdomain.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/babagame /etc/nginx/sites-enabled/babagame

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

#### 7. Setup SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx -y

# Generate certificate
certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew
systemctl enable certbot.timer
systemctl start certbot.timer
```

#### 8. Setup Firewall

```bash
# Enable firewall
ufw enable

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3306/tcp  # Only if accessing MySQL remotely

# Check status
ufw status
```

#### 9. Setup Database Backups

```bash
# Create backup script
nano /usr/local/bin/backup_babagame.sh

# Add:
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u babagames_user -p'your_password' babagames > /backups/babagame_$DATE.sql

# Keep only last 30 days
find /backups -name "babagame_*.sql" -mtime +30 -delete
```

```bash
# Make executable
chmod +x /usr/local/bin/backup_babagame.sh

# Setup cron job (daily backup at 2am)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup_babagame.sh
```

#### 10. Monitor Application

```bash
# View logs
pm2 logs babagame

# Tail logs
tail -f ~/.pm2/logs/babagame-error.log
tail -f ~/.pm2/logs/babagame-out.log

# Monitor resources
pm2 monit
```

---

## Deployment Checklist

### Before Going Live

- [ ] Change all .env secrets (JWT_ACCESS_TOKEN, secret_key)
- [ ] Update APP_BASE_URL to your domain
- [ ] Update payment gateway credentials with real keys
- [ ] Increase database connection pool for production
- [ ] Enable HTTPS (SSL certificate)
- [ ] Setup database backups
- [ ] Configure firewall rules
- [ ] Test all features on production server
- [ ] Setup monitoring/alerting
- [ ] Create admin user account
- [ ] Document admin password (secure location)
- [ ] Test login, games, recharge, withdrawal
- [ ] Check Socket.io real-time updates
- [ ] Verify cron jobs running
- [ ] Test payment gateway integration
- [ ] Monitor server performance

### Production Security

1. **Change Passwords**:
   - Database password
   - MySQL user password
   - Admin account password

2. **Replace MD5 Hashing**:
   - Current: MD5 (cryptographically broken)
   - Should use: bcrypt or argon2

3. **Add Rate Limiting**:
   ```bash
   npm install express-rate-limit
   ```

4. **Add Input Validation**:
   ```bash
   npm install joi
   ```

5. **Add CORS Protection**:
   ```bash
   npm install cors
   ```

---

## Troubleshooting Deployment

### Issue: "Cannot find module" error

```bash
# Solution: Reinstall dependencies
rm -rf node_modules
npm install --production
```

### Issue: Database connection refused

```bash
# Check MySQL is running
systemctl status mysql

# Check credentials in .env are correct
cat .env | grep DATABASE

# Restart MySQL
systemctl restart mysql
```

### Issue: Port already in use

```bash
# Find what's using port 5005
lsof -i :5005

# Kill the process
kill -9 <PID>

# Or change port in .env
```

### Issue: PM2 not auto-starting

```bash
# Reinstall PM2 startup
pm2 unstartup
pm2 startup
pm2 save
```

### Issue: Nginx not forwarding requests

```bash
# Check Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Check logs
tail -f /var/log/nginx/error.log
```

---

## Performance Optimization

### Database

```javascript
// Add connection pooling (increase for production)
const connection = mysql.createPool({
    connectionLimit: 50,  // Increase from 10
    queueLimit: 0,
    waitForConnections: true
})
```

### Node.js

```bash
# Run with cluster mode (use multiple CPU cores)
pm2 start src/server.js -i max
```

### Caching

```bash
npm install redis
# Implement caching for frequently accessed data
```

---

## Monitoring & Maintenance

### Daily

- Check PM2 status
- Monitor server resources (CPU, RAM, Disk)
- Check application logs for errors

### Weekly

- Review database size
- Check backup completion
- Monitor payment gateway logs

### Monthly

- Database maintenance/optimization
- Review security logs
- Update dependencies (carefully)
- Test disaster recovery/backup restore

### Quarterly

- Security audit
- Performance review
- Plan new features
- Update documentation

---

## Database Maintenance

### Optimize Tables

```bash
mysql babagames
OPTIMIZE TABLE users;
OPTIMIZE TABLE orders_wingo;
OPTIMIZE TABLE orders_5d;
OPTIMIZE TABLE orders_k3;
exit;
```

### Check Table Integrity

```bash
mysqlcheck -u root -p babagames -a
```

### Backup Before Major Changes

```bash
mysqldump -u root -p babagames > backup_before_changes.sql
```

### Monitor Database Size

```bash
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'babagames'
ORDER BY size_mb DESC;
```

---

## Rollback Procedure

If deployment goes wrong:

```bash
# Stop current version
pm2 stop babagame

# Go back to previous version
git revert <commit_hash>

# Reinstall dependencies
npm install --production

# Restart
pm2 start babagame

# Check logs
pm2 logs babagame
```

---

## Post-Deployment Verification

```bash
# 1. Check server is running
curl http://localhost:5005

# 2. Test API endpoint
curl -X POST http://localhost:5005/api/webapi/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890","password":"test@123"}'

# 3. Check database connectivity
mysql -u root -p babagames -e "SELECT COUNT(*) FROM users;"

# 4. Test Socket.io
# Open browser dev tools
# Check WebSocket connection in Network tab

# 5. Monitor logs
tail -f /var/log/pm2.log
```

---

## Support & Help

**Common Issues**:
- See PROJECT_DOCUMENTATION.md "Troubleshooting" section
- Check System Logs: `tail -f ~/.pm2/logs/babagame-error.log`
- MySQL Logs: `/var/log/mysql/error.log`
- Nginx Logs: `/var/log/nginx/error.log`

**Resources**:
- Express.js: https://expressjs.com/
- MySQL: https://dev.mysql.com/
- Node.js: https://nodejs.org/
- Socket.io: https://socket.io/
- PM2: https://pm2.keymetrics.io/

---

*Setup & Deployment Guide v1.0 - April 2026*
*See PROJECT_DOCUMENTATION.md and QUICK_REFERENCE.md for additional help*
