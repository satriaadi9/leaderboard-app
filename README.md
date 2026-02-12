# Class Points Leaderboard App

A real-time leaderboard application for managing student points in classes. Built with React, Node.js (Express), PostgreSQL, and Redis.

## Features

### Role-Based Access Control
- **Super Admin**: Full system access (manage all classes, users).
- **Class Owner (Teacher)**:
  - Create, edit, and delete classes.
  - Manage student enrollments (import/add/remove).
  - Assign **Student Assistants**.
  - Configure public/private visibility and custom slugs.
- **Student Assistant**:
  - View assigned classes in Dashboard.
  - **Constraints**: Cannot create or delete classes. Cannot add/remove other assistants.
  - **Capabilities**: Can adjust student points (add/remove) for day-to-day management.

### Class Management
- **Dashboard**: Centralized view of all classes.
- **Settings**:
  - Toggle **Public Access** (allow/deny viewing without login).
  - Set **Custom Public Slug** for easy sharing (e.g., `leaderboard.com/p/my-class`).
  - Manage **Student Assistants** list.

### Points System & Leaderboard
- **Real-time Leaderboard**: Instant updates using WebSocket/SSE (Server-Sent Events).
- **Point Adjustment**:
  - Add or remove points with a required reason.
  - **Audit Trail**: All point changes are logged with the user who made the change.
- **Badges**:
  - 🥇 **Top 1**: Current leader.
  - 🔥 **Most Improved**: Highest point gain in the last 7 days.
  - 📈 **Biggest Climber**: Most ranks climbed in the last 7 days.
- **Statistics**: View total points, average points, and student count.

### Student Management
- **Enrollment**: Add students individually or bulk import.
- **History**: View detailed point history for each student.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, TanStack Query.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (Prisma ORM).
- **Caching**: Redis (for high-performance public leaderboard views).
- **Containerization**: Docker & Docker Compose.

## Quick Start

For detailed setup instructions, including **Development Environment** and **Production Deployment**, please refer to the [Deployment Guide](DEPLOY.md).

### Development (Docker Compose)

The fastest way to run the app locally is using Docker Compose:

1. **Start the Stack**:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Access the App**:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - Prisma Studio: [http://localhost:5555](http://localhost:5555)

3. **Database Management**:
   To access the database GUI (Prisma Studio):
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npx prisma studio
   ```

## 📚 Documentation
- [Deployment Guide (Dev & Prod)](DEPLOY.md)
- [User Guide](docs/USER_GUIDE.md)
- [Agent Behavior Guidelines](docs/AGENT_CODE_BEHAVIOR.md)

