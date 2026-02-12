#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
SERVER_IP="103.103.138.171"
SERVER_USER="sift"
DOCKER_USER="satriaadi9"
PROJECT_DIR="/home/$SERVER_USER/leaderboard-app"
# API_URL="http://$SERVER_IP:3000"
# Use relative API path so Nginx on port 80 handles the proxying
API_URL="/api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Deployment Process...${NC}"

# Ensure we are in the root directory (parent of deployment folder)
if [ -d "deployment" ]; then
    echo "Filesystem check: OK"
else
    echo "Error: Please run this script from the project root directory (e.g., ./deployment/deploy.sh)"
    exit 1
fi

# 1. Build and Push Backend
echo -e "${GREEN}📦 Building Backend Image...${NC}"
docker build --no-cache --platform linux/amd64 -t $DOCKER_USER/leaderboard-app-backend:latest ./backend

echo -e "${GREEN}⬆️ Pushing Backend Image...${NC}"
docker push $DOCKER_USER/leaderboard-app-backend:latest

# 2. Build and Push Frontend
echo -e "${GREEN}📦 Building Frontend Image...${NC}"
# Pass API_URL as build argument
docker build --platform linux/amd64 \
    --build-arg VITE_API_URL=$API_URL \
    -f frontend/Dockerfile.prod \
    -t $DOCKER_USER/leaderboard-app-frontend:latest ./frontend

echo -e "${GREEN}⬆️ Pushing Frontend Image...${NC}"
docker push $DOCKER_USER/leaderboard-app-frontend:latest

# 3. Deploy to Server
echo -e "${BLUE}🚀 Connecting to Server ($SERVER_IP)...${NC}"

# Create project directory
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "mkdir -p $PROJECT_DIR"

# Copy production compose file
echo -e "${GREEN}📄 Copying configuration...${NC}"
scp -o StrictHostKeyChecking=no deployment/docker-compose.prod.yml $SERVER_USER@$SERVER_IP:$PROJECT_DIR/docker-compose.yml

# Execute remote commands
echo -e "${GREEN}🔄 Updating stack on server...${NC}"
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << EOF
    cd $PROJECT_DIR
    
    echo "📥 Pulling latest images..."
    docker compose pull
    
    echo "🔄 Generating Prisma Client..."
    docker compose run --rm backend npx prisma generate

    echo "🔄 Restarting services..."
    docker compose up -d --remove-orphans
    
    echo "🧹 Cleaning up..."
    docker image prune -f
    
    echo "✨ Production deployment successful!"
    docker compose ps
EOF

echo -e "${BLUE}✅ Deployment Finished!${NC}"
echo "Frontend: http://$SERVER_IP"
echo "Backend:  $API_URL"
