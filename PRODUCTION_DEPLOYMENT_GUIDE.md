# Bata, Takbo! — Production Deployment Guide

**Stack:** AWS EC2 (Backend) + Neon.tech (PostgreSQL) + Cloudflare Pages (Frontend)

---

## Pre-Deployment Checklist

### 1. Code Changes for Production

#### A. Backend (`server/server.js`)

**Current CORS setup is good:**
```javascript
const IS_PROD = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: IS_PROD ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true
}));
```

**No changes needed** — just ensure `FRONTEND_URL` env var is set correctly.

#### B. Frontend (`web/src/main.js` or API config)

**Ensure API URL is environment-based:**
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**✅ Already configured correctly** in your codebase via `VITE_API_URL`.

#### C. Database (`server/db.js`)

**Already supports Neon:** Uses `DATABASE_URL` environment variable.

#### D. Service Worker (`web/public/sw.js`)

**Cache version bumped to v7** — ensure this is updated in future deploys.

---

## Deployment Steps

### Step 1: Prepare Environment Variables

Create two `.env` files (NEVER commit these):

#### Backend `.env` (for AWS EC2):
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@hostname.neon.tech/database?sslmode=require
JWT_SECRET=<64-char-hex>
AES_SECRET_KEY=<64-char-hex>
FRONTEND_URL=https://bata-takbo.pages.dev

# Email (Gmail SMTP)
EMAIL_USER=yourgame@gmail.com
EMAIL_PASS=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Admin accounts
ADMIN_SEED_FORCE=false
ADMIN_SEED_1_USERNAME=GameMaster
ADMIN_SEED_1_EMAIL=admin@yourdomain.com
ADMIN_SEED_1_PASSWORD=SecurePassword123!
```

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice for JWT_SECRET and AES_SECRET_KEY
```

#### Frontend Environment (for Cloudflare Pages dashboard):
```bash
VITE_API_URL=https://your-ec2-public-ip:3001
# OR if using domain: https://api.yourdomain.com
```

---

### Step 2: Database Setup (Neon.tech)

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project → PostgreSQL 15
3. Copy the connection string
4. **Important:** Add `?sslmode=require` to the end
5. Test locally:
   ```bash
   psql "your-neon-connection-string?sslmode=require"
   ```

**Tables auto-create** on first server start via `initDb()` in `db.js`.

---

### Step 3: Deploy Backend to AWS EC2

#### A. Launch EC2 Instance

| Setting | Value |
|---------|-------|
| **AMI** | **Ubuntu Server 24.04 LTS** (Noble Numbat) — *Latest LTS version* |
| **Instance Type** | `t3.micro` or `t4g.micro` (Graviton-based, extremely fast and cost-efficient) |
| **Storage** | 20 GB |
| **Security Group** | Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), and 3001 (backend fallback) |

#### B. SSH into Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

#### C. Install Dependencies & Node.js 22 LTS (Modern GPG Keyring Method)
Modern Ubuntu versions require GPG keyring verification for third-party software repositories. Run these commands to install **Node.js 22 LTS**:

```bash
# 1. Update package list and install baseline utilities
sudo apt update
sudo apt install -y ca-certificates curl gnupg git nginx

# 2. Download the official NodeSource GPG signing key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# 3. Add the NodeSource repository for Node.js 22 (Active LTS)
NODE_MAJOR=22
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# 4. Update the package lists and install Node.js
sudo apt update
sudo apt install -y nodejs

# 5. Verify versions
node -v  # Should output v22.x.x
npm -v   # Should output v10.x.x or higher
```

#### D. Clone & Setup Backend
```bash
git clone https://github.com/YOUR_USERNAME/Bata-Takbo---A-Survival-Game.git
cd Bata-Takbo---A-Survival-Game/server
npm install
```

#### E. Create .env File
```bash
nano .env
# Paste your env vars, then save & exit (Ctrl+O, Enter, Ctrl+X)
```

#### F. Start and Daemonize with PM2 (Process Manager)
PM2 ensures the Express application stays running 24/7 and restarts automatically if it crashes or the server reboots.

```bash
sudo npm install -g pm2
pm2 start server.js --name "bata-takbo-api"

# Configure PM2 to start on system boot
pm2 startup systemd
# IMPORTANT: The command above will output a specific 'sudo env PATH=...' command.
# You MUST copy that command from the terminal, paste it, and press Enter to execute it!

pm2 save
```

#### G. Setup Nginx Reverse Proxy
Nginx acts as a high-performance web server that intercepts incoming web requests on Port 80 (HTTP) and forwards them to your Node app on Port 3001.

```bash
sudo nano /etc/nginx/sites-available/bata-takbo
```

Add the server block config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com your-ec2-public-ip;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/bata-takbo /etc/nginx/sites-enabled/
# Remove the default Nginx welcome configuration to prevent collisions
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 3.5: Configure SSL Certificate (Required for Production)

> [!IMPORTANT]
> **Why is HTTPS / SSL Required?**
> Cloudflare Pages serves your frontend over secure HTTPS. If your backend uses plain `http://your-ec2-ip`, modern web browsers will trigger a **Mixed Content Block** and completely restrict any login, registration, or game-saving requests.
>
> To resolve this, you **must** assign a domain/subdomain to your EC2 instance and secure it with Let's Encrypt.

1. **Point your domain:** Go to your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy) and add an **A Record** pointing `api.yourdomain.com` to your EC2 Public IP address.
2. **Install Certbot:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
3. **Generate and Install SSL Certificate:**
   Run Certbot. It will scan your Nginx configuration, find `api.yourdomain.com`, and prompt you to set up automatic SSL redirection.
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```
4. **Test Renewal:**
   Let's Encrypt certificates are valid for 90 days. Certbot automatically schedules auto-renewals, verify it is configured correctly:
   ```bash
   sudo certbot renew --dry-run
   ```

---

### Step 4: Deploy Frontend to Cloudflare Pages

> [!WARNING]
> **Workers vs. Pages Distinction:** In the Cloudflare Dashboard under **Workers & Pages**, do **NOT** use the default **Workers** tab or "Workers Builds" (which asks for Wrangler commands like `npx wrangler deploy`, `npx wrangler versions upload`, and API tokens). 
> 
> Because **Bata-Takbo**'s frontend is a static Vite + Phaser site, you **MUST** select the **Pages** tab. Pages handles build orchestration automatically without requiring Wrangler commands, deploy tokens, or manual script execution.

> [!IMPORTANT]
> **Routing / Reverse Proxy Configuration (`_redirects`):**
> Because our frontend makes relative API requests (like `/auth/login`), these will fail in production on Cloudflare Pages (which only hosts static assets).
> To route these requests to your AWS EC2 API seamlessly (and completely avoid CORS errors and cookie/session loss), we have configured a `web/public/_redirects` file in this repository.
> 
> BEFORE building/deploying, open [web/public/_redirects](file:///c:/Users/Lawrence/Documents/PROJECTS/BATA-TAKBO/web/public/_redirects) and replace `https://api.yourdomain.com` with your actual backend API domain or EC2 Public IP address.
> Save the file, commit, and push it to GitHub!

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and navigate to **Workers & Pages** in the sidebar.
2. Click **Create Application** and select the **Pages** tab (located next to the Workers tab).
3. Click **Connect to Git** → Connect GitHub → Select your repository (`Bata-Takbo---A-Survival-Game`).
4. Configure your **Build Settings** screen exactly as follows:

   * **Project name:** `bata-takbo` *(Must be completely lowercase)*
   * **Production branch:** `main` *(Or `master` depending on your repository's primary branch)*

5. **Set Root Directory First:**
   * Scroll down and click on the **Root directory (advanced)** dropdown.
   * In the **Path** field, enter: `web`
   *(This tells Cloudflare that your frontend project lives in the `/web` subdirectory)*

6. **Set Framework & Build Commands:**
   * Set **Framework preset** to: `None`
   *(Do **NOT** select "VitePress". VitePress is a documentation generator and will cause build failures. Since there is no generic "Vite" preset, choose "None")*
   * In the **Build command** field, enter: `npm run build`
   * In the **Build output directory** field, enter: `dist`

7. Click **Save and Deploy**. Cloudflare Pages will build and deploy the frontend, providing you with a secure `https://bata-takbo.pages.dev` URL.

**Note:** Since Cloudflare Pages uses HTTPS by default, make sure your EC2 backend has been configured with an SSL certificate using Certbot (Step 3.5) to avoid browser **Mixed Content** connection blocks.

---

### Step 5: Update CORS & Security

#### After getting Cloudflare Pages URL:

1. SSH to EC2: `ssh -i key.pem ubuntu@your-ec2-ip`
2. Edit `.env`:
   ```bash
   nano ~/Bata-Takbo---A-Survival-Game/server/.env
   ```
3. Update `FRONTEND_URL` to your actual Cloudflare URL:
   ```
   FRONTEND_URL=https://bata-takbo.pages.dev
   ```
4. Restart server:
   ```bash
   cd ~/Bata-Takbo---A-Survival-Game/server
   pm2 restart bata-takbo-api
   ```

---

## Common Production Bugs & Fixes

### 1. CORS Errors in Browser
**Symptom:** `Access-Control-Allow-Origin` error in console
**Fix:** Ensure `FRONTEND_URL` env var matches your actual Cloudflare URL exactly (including `https://`)

### 2. Database Connection Failed
**Symptom:** Server crashes on start with DB error
**Fix:** 
- Check `DATABASE_URL` has `?sslmode=require`
- Verify Neon project is active (not paused due to inactivity)
- Test connection: `psql "your-connection-string"`

### 3. 502 Bad Gateway from Nginx
**Symptom:** Nginx error page
**Fix:**
```bash
pm2 status              # Check if Node is running
pm2 logs bata-takbo-api # Check app logs
sudo nginx -t           # Validate nginx config
```

### 4. Audio Not Loading (404)
**Symptom:** Game loads but no sound
**Fix:** 
- Verify OGG files are in the repo: `web/public/assets/audio/sd/`
- Check case sensitivity (Linux servers are case-sensitive)

### 5. Service Worker Caching Old Version
**Symptom:** Changes not showing after deploy
**Fix:** Bump version in `sw.js` cache name (already at v7)

### 6. WebSocket/Gesture Recognition Fails
**Symptom:** Camera/gestures don't work on HTTPS
**Fix:** MediaPipe requires HTTPS for camera access. Cloudflare Pages gives you HTTPS automatically.

### 7. Email Not Sending
**Symptom:** Password reset emails don't arrive
**Fix:**
- Gmail: Use App Password, not your main password
- Check spam folders
- Verify SMTP credentials in env vars

### 8. Session/Login Not Persisting
**Symptom:** Have to log in repeatedly
**Fix:** JWT cookie `secure` flag. On HTTP (not HTTPS), cookies may not persist.

---

## Security Checklist

- [ ] JWT_SECRET is 64+ random hex characters
- [ ] AES_SECRET_KEY is exactly 64 hex characters (32 bytes)
- [ ] `.env` file is NOT committed to Git (check `.gitignore`)
- [ ] Admin passwords are strong (12+ chars, mixed case, numbers, symbols)
- [ ] EC2 security group only opens ports 22, 80, 443, 3001
- [ ] Database connection uses SSL (`sslmode=require`)
- [ ] Rate limiting is active (already in `server.js`)

---

## AWS Free Tier Limits

| Resource | Free Tier | Your Usage |
|----------|-----------|------------|
| EC2 t3.micro | 750 hrs/month | ~$0 (750 hrs = full month) |
| Data transfer OUT | 100 GB/month | ~30-50 GB for your game |
| EBS storage | 30 GB | ~20 GB |

**Estimated monthly cost after free trial:** ~$8-15 for t3.micro if you exceed free tier

---

## Post-Deploy Verification

1. **Test registration** → New account created
2. **Test login** → JWT cookie set
3. **Test gameplay** → Audio plays, gestures work
4. **Test progression save** → Chapter unlocks persist after refresh
5. **Test password reset** → Email received (check spam)
6. **Check server logs:** `pm2 logs bata-takbo-api`

---

## Emergency Rollback

If something breaks:

```bash
ssh -i key.pem ubuntu@your-ec2-ip
cd ~/Bata-Takbo---A-Survival-Game
git log --oneline -5
git checkout <previous-commit-hash>
pm2 restart bata-takbo-api
```

---

## Quick Reference Commands

```bash
# SSH to server
ssh -i key.pem ubuntu@EC2_IP

# View logs
pm2 logs bata-takbo-api

# Restart server
pm2 restart bata-takbo-api

# Check server status
pm2 status

# Update code and restart
cd ~/Bata-Takbo---A-Survival-Game
git pull origin master
pm2 restart bata-takbo-api
```

---

**Last Updated:** 2024-05-19
**Stack:** Node.js + Express + PostgreSQL (Neon) + Phaser 4 + MediaPipe
