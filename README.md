# BATA, TAKBO! 🏃‍♂️💨
An interactive, high-performance web-based running and dodging game featuring immersive gesture-recognition, campaign levels, real-time leaderboard battles, and automated anti-cheat systems.

---

## 🎮 Deployment Links
* **Frontend (Cloudflare Pages)**: [https://bata-takbo.pages.dev](https://bata-takbo.pages.dev)

---

## 📝 Project Description
**BATA, TAKBO!** is an endless-runner and level-based arcade game designed for modern web browsers. Players guide their character through crowded pathways, dodging static and dynamic obstacles. 

What sets the game apart is its **hybrid input mechanism**: players can either run using standard keyboard controls (D-Pad) or use their web camera to control the character with **real-time hand gesture recognition**, powered by live-trained local computer vision models. 

The game includes a level-based campaign mode, a highly competitive endless survival mode, secure user profiles, detailed user history, and a robust administrative panel featuring automated statistical and temporal anti-cheat protection.

---

## 👥 Group Members
* **Jechris Cavite** - Lead Frontend Developer / UI Specialist
* **Lawrence Dayo** - Lead Backend Developer / Database Engineer
* **Lee Xymon Barret** - QA Tester 

---

## 🛠️ Technologies Used

### Frontend (Client App)
* **Game Engine**: Phaser 3 (Physics, Rendering, Sprite Animations)
* **Computer Vision**: TensorFlow.js / Custom In-Browser Gesture Recognizer
* **Build System**: Vite (High-speed module bundling)
* **Styling**: Vanilla CSS3 (Glassmorphism design language)
* **Charts**: Chart.js (Interactive server usage metrics inside Admin Dashboard)

### Backend (API Server)
* **Runtime**: Node.js & Express
* **Database**: PostgreSQL (With automatic compatibility wrappers for pg pool)
* **Authentication**: JSON Web Tokens (JWT) stored in HTTP-Only, Secure, SameSite=None cookies
* **Security & Encryption**: BcryptJS, Helmet (Strict CSP policies), AES-256 (User data encryption), Express-Rate-Limit
* **Push Notifications**: Web-Push (Service Worker integration)

### Infrastructure & Deployment
* **Frontend Hosting**: Cloudflare Pages (Static Assets + High-Performance Reverse Proxy)
* **Backend Hosting**: AWS EC2 Instance (Ubuntu)
* **SSL/TLS**: Let's Encrypt (Certbot)
* **Process Manager**: PM2 (For zero-downtime server operations)

---

## 🚀 Installation & Local Setup

Follow these steps to run **BATA, TAKBO!** completely on your local machine.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or higher recommended)
* [PostgreSQL](https://www.postgresql.org/) (Running locally, or a remote host instance like Neon)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/BATA-TAKBO.git
cd BATA-TAKBO
```

---

### Step 2: Configure & Run the Backend Server

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create your local environment configuration file:
   ```bash
   copy .env.example .env
   ```
   Open the `.env` file and configure your local Postgres database details:
   ```env
   NODE_ENV=development
   PORT=3001
   JWT_SECRET=your_jwt_signing_secret
   AES_SECRET_KEY=your_64_character_hex_aes_key
   DATABASE_URL=postgresql://postgres:password@localhost:5432/bata_takbo
   FRONTEND_URL=http://localhost:5173
   ```
4. Start the server in development mode:
   ```bash
   npm start
   ```
   *(The database tables, indices, and admin seeds will migrate/initialize automatically on boot).*

---

### Step 3: Configure & Run the Frontend Client

1. Open a new terminal window and navigate to the `web` directory:
   ```bash
   cd web
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the address displayed in the terminal (usually [http://localhost:5173](http://localhost:5173)).

---

## 🛡️ Anti-Cheat & Exploit Protection
To protect our Endless Survival Leaderboard, the game uses a server-validated security system:
1. **Single-Use Session Tokens**: Sessions are initiated on game start. Replaying or spoofing runs via manual API injection is prevented.
2. **Clock Correlation**: Enforces that real-world clock time elapsed matches the claimed survival duration.
3. **Statistical Limits**: Enforces a speed ceiling (<3.0s/wave) and score rate ceiling (<6000 pts/s) to catch memory modification and speed hacks.
4. **Auto-Bans**: Automated bans occur if validation thresholds are broken, hiding cheaters instantly from the public rankings while preserving logs inside the **Admin Panel** for quick moderation.
