# KU Badminton Reservation System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)](#contributing)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-blue)](https://www.prisma.io/)

A robust, secure, and scalable badminton court reservation system built for Kasetsart University. This platform enables students, staff, and guests to book courts, manage payments, and allows administrators to oversee facility operations with ease.

---

## 📖 Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Maintenance & Scripts](#maintenance--scripts)
- [Contributing](#contributing)
- [License](#license)

---

## 📸 Screenshots

> *Add your project screenshots here to showcase the UI.*

| Student Dashboard | Admin Management | Booking Flow |
| :---: | :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/300x200?text=Dashboard) | ![Admin Placeholder](https://via.placeholder.com/300x200?text=Admin+Panel) | ![Booking Placeholder](https://via.placeholder.com/300x200?text=Booking+Flow) |

---

## ✨ Features

- **Multi-Role Authentication:** Support for Students, Demonstration Students, Staff, Admins, and Super Admins via NextAuth.js.
- **Dynamic Booking System:** Flexible slot management, blackout dates, and advanced booking policies.
- **Pricing Engine:** Rule-based pricing based on user role, membership status, and peak/off-peak hours.
- **Payment Processing:** Support for multiple methods (QR, Bank Transfer, Cash) with administrative verification.
- **Admin Dashboard:** Real-time analytics, booking reports, user management, and audit logs.
- **Security First:** Rate limiting, account lockout, reCAPTCHA v3, data encryption, and comprehensive API logging.
- **Audit Logs:** Track every critical action and API request for accountability.
- **Export/Import:** Integrated Excel support for student migrations and reporting.

---

## 🛠 Tech Stack

- **Frontend:** [Next.js 15 (App Router)](https://nextjs.org/), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [PrimeReact](https://primereact.org/)
- **State Management:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Backend:** Next.js API Routes, [Prisma ORM](https://www.prisma.io/)
- **Database:** MySQL
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Infrastructure:** Docker, Nginx, Prometheus (Monitoring)
- **Testing:** Cypress

---

## 🏗 Architecture

The project follows a modular Next.js architecture:

```text
src/
├── app/             # Next.js App Router (Routes & API)
├── components/      # UI Components (Atomic Design)
├── lib/             # Core Logic (Booking, Encryption, Auth)
├── hooks/           # Custom React Hooks
├── providers/       # React Context Providers
├── types/           # TypeScript Definitions
scripts/             # Maintenance & Migration Scripts
prisma/              # Database Schema & Migrations
docker/              # Containerization Config
```

---

## 🚀 Installation

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- MySQL 8.0+
- Docker (Optional)

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/ku-badminton-reservation.git
   cd ku-badminton-reservation
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your credentials.
   ```bash
   cp .env.example .env
   ```

4. **Database Migration:**
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

---

## 🏃 Quick Start

### Development Mode
```bash
pnpm dev
```
The application will be available at `http://localhost:3000`.

### Production Build
```bash
pnpm build
pnpm start
```

### Run with Docker
```bash
docker-compose up -d
```

---

## ⚙️ Configuration

Key environment variables in `.env`:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_SECRET` | Secret for session encryption |
| `SECRET_KEY` | 32-byte hex key for data encryption |
| `SMTP_USER/PASS` | Credentials for automated emails |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 Site Key |

---

## 📡 API Documentation

API endpoints are located in `src/app/api/`. 

- **Auth:** `/api/auth/*`
- **Bookings:** `/api/bookings` (GET, POST)
- **Facilities:** `/api/facilities`
- **Admin:** `/api/admin/*` (Protected)

*Detailed Swagger/OpenAPI documentation coming soon.*

---

## 🧪 Testing

The project uses [Cypress](https://www.cypress.io/) for End-to-End (E2E) testing, including specialized tests for reCAPTCHA and authentication flows.

- **Open Cypress UI:** `pnpm cypress`
- **Run All Tests (Headless):** `pnpm cypress:headless`
- **Generate Test Report:** `pnpm test:all`
- **reCAPTCHA Specific Test:** `pnpm test:recaptcha`

---

## 🧹 Maintenance & Scripts

The project includes several utility scripts for system administration:

- **User Management:**
  - `pnpm create-super_admin`: Initializes the first super administrator.
  - `pnpm migrate-students`: Import/Sync student data from Excel files.
- **System Cleanup:**
  - `pnpm cleanup-logs`: Rotates and cleans up old API/Auth logs to save space.
- **Security:**
  - `./scripts/check-security.sh`: Runs a security audit on the codebase and dependencies.
- **Database:**
  - `pnpm prisma studio`: Visual interface to explore and edit data.

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed for Kasetsart University.**
