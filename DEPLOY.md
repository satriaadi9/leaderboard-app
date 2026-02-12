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

### 2. Automated Deployment
Use the helper script to build images, push to Docker Hub, and update the remote server.

```bash
# Run from project root
./deployment/deploy.sh
```

**What this script does:**
1. Builds backend & frontend images (platform: `linux/amd64`).
2. Pushes images to Docker Hub.
3. Copies `docker-compose.prod.yml` to the server.
4. SSHs into the server, pulls new images, and restarts containers.
5. Generates the Prisma Client on the server to ensure schema sync.

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
