# PatientHub 2 — Patient-Centric Hospital Management System

PatientHub 2 is a comprehensive, full-stack hospital management platform designed to streamline clinical workflows, patient engagement, and administrative operations. The system combines an **Express 5 + TypeScript** RESTful backend, a **PostgreSQL** relational database with field-level encryption for sensitive health data, a **React 18 + Vite** frontend web portal, and **Python-based AI/ML engines** for symptom-based disease triage and reinforcement-learning-driven laboratory test scheduling.

---

## Architecture & Technology Stack

The platform is architected with modern, scalable technologies across all layers:

### 1. Backend (RESTful API Server)
- **Runtime**: Node.js (>= 22)
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: PostgreSQL (>= 14, recommended 17)
- **Driver**: `pg` (node-postgres connection pooling)
- **Security & Cryptography**:
  - JSON Web Tokens (JWT) for role-based authentication (RBAC)
  - `bcryptjs` for secure password hashing
  - AES-256 field-level encryption for personal health information (phone numbers, insurance IDs)
  - `express-rate-limit` for API abuse and brute-force mitigation
- **Payment Gateways**:
  - Integrated with **PayOS** (checksum verification and webhook handling)
  - Integrated with **VNPay** (IPN signature validation)

### 2. Frontend (Web Portal)
- **Framework & Bundler**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios with automatic 401 token interceptor

### 3. AI / Machine Learning Engines
- **Language**: Python (>= 3.10)
- **Disease Prediction Model (Random Forest)**:
  - Built with `scikit-learn`, `pandas`, `numpy`, and `joblib` to analyze patient symptom vectors and recommend potential diagnoses and departments.
  - Deployed as a microservice via **FastAPI** & **Uvicorn** (`model ai/ml random forest/`).
- **Clinical Scheduling Optimization (Reinforcement Learning)**:
  - Uses Q-Learning with linear function approximation (Gym-style environment) to optimize room assignments and sequence laboratory orders (blood tests, ultrasounds, X-rays, ECG) to minimize patient waiting times (`model ai/rl scheduling/`).

### 4. DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose (multi-container orchestration for PostgreSQL, backend API, and web frontend with Nginx).

---

## Core System Modules

| Workspace / Module | Target Users | Key Capabilities |
|---|---|---|
| **Patient Portal** | Patients & Relatives | Self-service appointment booking, clinical consultation history, test order tracking, digital prescriptions, online payment settlement via PayOS / VNPay, and system support reports. |
| **Doctor Suite** | Physicians | Daily appointment roster, clinical examination management, diagnostic notes, electronic medical history lookup, laboratory test ordering, and prescription dispensing. |
| **Technician Workstation** | Lab Technicians | Department-specific test queue, sample processing status (`waiting` &rarr; `processing` &rarr; `completed`), and laboratory result entry. |
| **Reception Desk** | Front-Desk Staff | Patient intake and demographic registration, health insurance records, triage priority assignment, and appointment scheduling. |
| **Cashier & Billing Desk** | Cashiers | Invoice generation from completed consultations, co-pay and insurance discount calculations, cash payment receipts, and billing history. |
| **Operations Management** | Hospital Managers | Operational overview dashboard, staff account provisioning, clinical department management, laboratory facility configuration, and medical catalog reference library. |

---

## Getting Started

You can run the system using **Docker Compose** (recommended for quick evaluation) or set up services individually for **local development**.

### 1. Environment Configuration

Copy the template environment file and configure the required credentials:

```bash
# In the root repository directory
cp .env.example .env
```

Key environment variables in `.env`:

| Variable | Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:admin@localhost:5432/patient_hub_2` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Random string (minimum 16 characters) |
| `AES_KEY` | 64-character hex key for AES-256 encryption | Used for encrypting phone and insurance IDs (`openssl rand -hex 32`) |
| `PAYOS_CLIENT_ID` | PayOS integration Client ID | From PayOS developer portal |
| `PAYOS_API_KEY` | PayOS integration API Key | From PayOS developer portal |
| `PAYOS_CHECKSUM_KEY` | PayOS integration Checksum Key | From PayOS developer portal |
| `VNPAY_TMN_CODE` | VNPay Terminal Code | Optional, for VNPay sandbox/production |
| `VNPAY_HASH_SECRET` | VNPay Hash Secret | Optional, for VNPay sandbox/production |

---

### 2. Running with Docker Compose (Recommended)

Start all services (PostgreSQL, Backend API, and Frontend Web via Nginx) with a single command:

```bash
docker compose up -d --build
```

**Service Endpoints & Management:**
- **Web Portal**: [http://localhost:8080](http://localhost:8080) (Nginx automatically proxies `/api/*` requests to the backend)
- **Backend API Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **Container Status**: `docker compose ps`
- **Backend Logs**: `docker compose logs -f backend`
- **Stop Containers**: `docker compose down`

---

### 3. Local Development Setup

#### Step A: Database Setup (PostgreSQL)
1. Ensure PostgreSQL (>= 14, recommended 17) is installed and running locally.
2. Create the target database:
   ```sql
   CREATE DATABASE patient_hub_2;
   ```
3. Initialize the schema:
   ```bash
   npm run migrate
   ```

#### Step B: Backend API Server
1. In the project root, install Node dependencies:
   ```bash
   npm install
   ```
2. Run migrations and populate sample seed data:
   ```bash
   npm run migrate         # Apply database migrations
   npm run migrate:status  # Check migration status
   npm run seed            # Populate sample departments, staff, patients, and catalogs
   ```
3. Start the backend in development mode (hot-reload enabled):
   ```bash
   npm run dev
   ```
   * The API server runs at: [http://localhost:3000](http://localhost:3000)

**Useful Backend Scripts:**
```bash
npm run build           # Compile TypeScript to JavaScript in dist/
npm start               # Start production build from dist/
npm run typecheck       # Perform TypeScript type validation without emitting files
```

#### Step C: Frontend Web Portal
1. Navigate to the `web` directory and install dependencies:
   ```bash
   cd web
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * The Web portal runs at: [http://localhost:5173](http://localhost:5173)
   * Vite is configured to proxy `/api` requests directly to `http://localhost:3000`.

#### Step D: AI Microservices (Optional)
To run or train the AI models:
```bash
# Random Forest Disease Prediction
cd "model ai/ml random forest"
pip install -r requirements.txt
python train/train_model.py

# Reinforcement Learning Scheduler
cd "../rl scheduling"
pip install -r requirements.txt
python train/train_rl.py
python serve/scheduler.py --interactive
```

---

## Demo Accounts

When seeded via `npm run seed`, the database is populated with sample accounts across all roles. 

> **Default password for ALL demo accounts**: **`admin`**

| Role | Sample Username(s) | Typical Use Case |
|---|---|---|
| **Manager / Admin** | `admin` | Full operational oversight, dashboard, staff management, departments. |
| **Receptionist** | `letan1`, `letan2` | Patient registration, intake, and appointment booking. |
| **Doctor** | `bs.nguyenvana`, `bs.tranthib`, `bs.lequangc`, ... | Consultations, electronic medical records, prescriptions, test orders. |
| **Technician** | `ktv1` through `ktv8` | Laboratory testing queue and sample result entry. |
| **Cashier** | `thungan1`, `thungan2` | Invoice generation, cash receipts, and settlement. |
| **Patient** | `bn.phamthid`, `bn.nguyenvane`, ... (25 accounts with `bn.` prefix) | Appointment booking, test results, invoices, and AI health chatbot. |

---

## Directory Structure

```
Patienthub2/
├── caddy/                       # Caddy reverse proxy configurations
├── docker/                      # Container entrypoint and startup scripts
├── migrations/                  # PostgreSQL SQL migration files
├── ml/                          # Legacy ML dataset generation scripts
├── model ai/
│   ├── ml random forest/        # Disease prediction (Scikit-Learn, FastAPI)
│   └── rl scheduling/           # Lab scheduling optimizer (Q-Learning environment)
├── src/                         # Backend TypeScript application
│   ├── config/                  # Environment variable configuration
│   ├── db/                      # Database connection pool and query helpers
│   ├── integrations/            # Payment gateway clients (PayOS, VNPay)
│   ├── middleware/              # Auth (JWT), validation (Zod), rate limit, errors
│   ├── modules/                 # Feature modules (auth, appointments, exams, invoices, etc.)
│   ├── scheduler/               # Scheduled recurring cron tasks
│   ├── scripts/                 # Migration and seed scripts
│   ├── types/                   # TypeScript interfaces and database row types
│   ├── utils/                   # Crypto, JWT, password hashing, and logger utilities
│   ├── app.ts                   # Express application setup
│   └── server.ts                # HTTP server listener
├── web/                         # Frontend React + Vite application
│   ├── src/
│   │   ├── auth/                # AuthContext and ProtectedRoute
│   │   ├── components/          # Reusable UI components and icons
│   │   ├── layouts/             # Public, Patient, and Staff layouts
│   │   ├── lib/                 # API client and formatters
│   │   └── pages/               # Public, patient, and staff role pages
│   └── package.json
├── docker-compose.yml           # Multi-service Docker configuration
├── Dockerfile                   # Backend Dockerfile
├── package.json                 # Backend dependencies and npm scripts
└── tsconfig.json                # Backend TypeScript configuration
```

---

## License

This project is licensed under the [MIT License](LICENSE).
