#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
# Load environment variables from .env.deploy if it exists
if [ -f ".env.deploy" ]; then
    export $(grep -v '^#' .env.deploy | xargs)
fi

if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ] || [ -z "$DOCKER_USER" ] || [ -z "$PROJECT_DIR" ]; then
    echo -e "\033[0;31mError: Missing required variables in .env.deploy.\033[0m"
    echo -e "Please ensure \033[1mSERVER_IP, SERVER_USER, DOCKER_USER, and PROJECT_DIR\033[0m are all set."
    exit 1
fi
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

# Source frontend env to get VITE_GOOGLE_CLIENT_ID
if [ -f "frontend/.env" ]; then
    export $(grep -v '^#' frontend/.env | xargs)
fi

# Pass variables as build arguments
docker build --no-cache --platform linux/amd64 \
    --build-arg VITE_API_URL=$API_URL \
    --build-arg VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
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
    docker compose run -T --rm backend npx prisma generate

    echo "🔄 Restarting services..."
    docker compose up -d --remove-orphans --force-recreate
    
    echo "🧹 Cleaning up..."
    docker image prune -f
    
    echo "✨ Production deployment successful!"
    docker compose ps
EOF

echo -e "${BLUE}✅ Deployment Finished!${NC}"
echo "Frontend: http://$SERVER_IP"
echo "Backend:  $API_URL"
