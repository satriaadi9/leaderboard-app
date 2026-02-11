# Class Points Leaderboard App

A real-time leaderboard application for managing student points in classes. Built with React, Node.js (Express), PostgreSQL, and Redis.

## Features

- **Class Management**: Create and manage classes.
- **Student Enrollment**: Enroll students via email (generates unique NIM if new) or ID.
- **Leaderboard**: Real-time points ranking.
- **Points System**: flexible point adjustments (add/remove) with reasons.
- **Caching**: High-performance Redis caching for leaderboard views.

## Quick Start within Dev Container

1. **Start the Stack**:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Access the App**:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

3. **Database Management**:
   To access Prisma Studio:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npx prisma studio
   ```
   Then open [http://localhost:5555](http://localhost:5555)

For detailed deployment instructions on a new machine, see [DEPLOY.md](DEPLOY.md).
