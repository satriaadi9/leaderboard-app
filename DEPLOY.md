# Leaderboard App Deployment Guide

This repository supports both local development and production deployment using Docker containers.

## 🛠 Prerequisites

- **Docker & Docker Compose**: Required for both environments.
- **Node.js 20+**: For running local scripts (optional but recommended).
- **SSH Access**: For production deployment to the remote server.

---

## 💻 Development Environment

Run the application locally with hot-reloading enabled.

### 1. Start the Stack
Run the development composition file. This starts Postgres, Redis, Backend (with Nodemon), and Frontend (Vite server).

```bash
docker compose -f docker-compose.dev.yml up --build
```
*Access:*
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000/api
- **Database**: localhost:5432

### 2. Database Migration (First Run)
Initialize the database schema:

```bash
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name init
```

// ...existing code...
### 3. Common Dev Commands

**Stop all services:**
```bash
docker compose -f docker-compose.dev.yml down
```

**Restart backend only:**
```bash
docker compose -f docker-compose.dev.yml restart backend
```

**View logs:**
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### 4. Troubleshooting Dev Environment

**Fix missing dependencies:**
If you see module not found errors after pulling changes:
```bash
docker compose -f docker-compose.dev.yml exec frontend npm install
# or
docker compose -f docker-compose.dev.yml up --build --force-recreate
```

---

## 🚀 Production Deployment
// ...existing code...

---

## 🚀 Production Deployment

The production environment runs on a simplified architecture behind an Nginx reverse proxy.
- **Frontend**: Nginx serving static files (Vue/React build).
- **Backend**: Node.js/Express API.
- **Infrastructure**: PostgreSQL + Redis.

### 1. Configuration
Production settings are managed in `deployment/docker-compose.prod.yml`.

To update **Superadmin Credentials** or other secrets, edit the `environment` section in that file:

```yaml
environment:
  - SUPERADMIN_EMAIL=isb@ciputra.ac.id
  - SUPERADMIN_PASSWORD=your_secure_password
  - JWT_SECRET=supersecretprodkey_change_me_in_prod
```

### 2. Deployment Options

You can deploy using the automated script (Option A) or manually by cloning the repository (Option B).

#### Option A: Automated Deployment (Recommended)
Use the helper script to build images locally, push to Docker Hub, and update the remote server.

```bash
# Run from your local machine
./deployment/deploy.sh
```

**What this script does:**
1. Builds backend & frontend images (platform: `linux/amd64`).
2. Pushes images to Docker Hub.
3. Copies `docker-compose.prod.yml` to the server.
4. SSHs into the server, pulls new images, and restarts containers.
5. Generates the Prisma Client on the server to ensure schema sync.

// ...existing code...
#### Option B: Manual Deployment (Git Clone)
If you prefer to manage the server manually or lack local Docker setup.

1.  **SSH into your server:**
    ```bash
    ssh user@your-server-ip
    ```

2.  **Clone the repository (first time):**
    ```bash
    git clone https://github.com/satriaadi9/leaderboard-app.git
    cd leaderboard-app
    ```

3.  **Update and deploy:**
    ```bash
    git pull
    docker compose -f deployment/docker-compose.prod.yml up -d --build --force-recreate
    ```
    *Note: The `--force-recreate` flag is important to ensure frontend containers pick up the latest build artifacts.*

### 3. Troubleshooting Production

**Caching Issues:**
If users see old versions of the site after deployment:
1. Ensure the `frontend/nginx.conf` has been updated with `Cache-Control: no-store` headers.
2. Force a full rebuild on the server:
   ```bash
   docker compose -f deployment/docker-compose.prod.yml down --rmi all
   docker compose -f deployment/docker-compose.prod.yml up -d --build --force-recreate
   ```

**Prisma/Foreign Key Constraints:**
If you make schema changes, ensure you run migrations:
```bash
docker compose -f deployment/docker-compose.prod.yml exec backend npx prisma migrate deploy
```


3.  **Pull latest changes (updates):**
    ```bash
    git pull origin main
    ```

4.  **Start the application:**
    This command pulls the latest pre-built images from Docker Hub and starts the services.
    ```bash
    docker compose -f deployment/docker-compose.prod.yml up -d --pull always
    ```

5.  **Sync Database Schema:**
    Required after every update to ensure the database matches the code.
    ```bash
    docker compose -f deployment/docker-compose.prod.yml exec backend npx prisma migrate deploy
    docker compose -f deployment/docker-compose.prod.yml exec backend npx prisma generate
    ```

6.  **Seed Database (Optional):**
    Only if you need to reset/update the Superadmin user.
    ```bash
    docker compose -f deployment/docker-compose.prod.yml exec backend npx prisma db seed
    ```

### 3. Database Management (Production)

**Seed/Update Superadmin:**
If you change the superadmin credentials in docker-compose, apply them by running:

```bash
ssh user@server_ip "cd leaderboard-app && docker compose exec backend npx prisma db seed"
```

**View Logs:**
```bash
ssh user@server_ip "docker logs -f leaderboard_backend --tail 100"
```

---

## ⚠️ Troubleshooting

**Issue: "Value 'SUPERADMIN' not found in enum..."**
*   **Cause**: The Prisma Client in the running container is out of sync with the database schema.
*   **Fix**: The `deploy.sh` script now handles this automatically by using `--no-cache` builds and enforcing `prisma generate` on the server. If it persists, force a backend rebuild:
    ```bash
    ./deployment/deploy.sh
    ```

**Issue: 500 Internal Server Error on Login**
*   **Fix**: Check if the database seed ran successfully. Ensure `SUPERADMIN_EMAIL` matches the user expected in the database.

**Issue: CORS Errors or 404 on /api**
*   **Fix**: The production frontend uses a relative path (`/api`) which is proxied by Nginx on port 80. Ensure you are accessing the site via port 80/443, not port 3000 directly.
