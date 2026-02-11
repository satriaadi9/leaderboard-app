# Deployment Guide

This guide describes how to pull and run the Leaderboard App on a new machine.

## Prerequisites

- **Git**: To clone the repository.
- **Docker Desktop** (or Docker Engine + Docker Compose): To run the application containers.

## Steps

### 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone <your-repo-url>
cd leaderboard-app
```

### 2. Startup

The application is containerized. You strictly use `docker-compose` to run it.

Run the following command to build and start the services:

```bash
docker-compose -f docker-compose.dev.yml up --build -d
```
*-d runs it in detached mode (background).*

### 3. Initialize Database

On the **first run only**, you need to ensure the database schema is pushed.

```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name init
```

### 4. Verify Installation

- **Frontend**: Open `http://localhost:5173` in your browser.
- **Backend Health**: Visit `http://localhost:3000/health` (if implemented) or check logs.

### 5. Managing the App

- **Stop the app**:
  ```bash
  docker-compose -f docker-compose.dev.yml down
  ```

- **View Logs**:
  ```bash
  docker-compose -f docker-compose.dev.yml logs -f
  ```

- **Restart Backend** (after code changes if not engaging hot-reload):
  ```bash
  docker-compose -f docker-compose.dev.yml restart backend
  ```

## Troubleshooting

- **Ports already in use**: ensure ports `3000` (API), `5173` (Frontend), `5432` (Postgres), and `6379` (Redis) are free.
- **Permission errors**: Ensure Docker is running with appropriate permissions.
