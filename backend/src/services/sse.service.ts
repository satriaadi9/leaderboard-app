import { Response } from 'express';
import Redis from 'ioredis';

// Separate connection for subscribing
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const subscriber = new Redis(redisUrl);

// Map classId -> Set of Clients
const clients = new Map<string, Set<Response>>();

// Subscribe to global updates channel
subscriber.subscribe('leaderboard-updates', (err) => {
    if (err) console.error('Failed to subscribe to leaderboard-updates', err);
});

subscriber.on('message', (channel, message) => {
    if (channel === 'leaderboard-updates') {
        const { classId } = JSON.parse(message);
        const classClients = clients.get(classId);
        
        if (classClients && classClients.size > 0) {
            const data = `data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
            classClients.forEach(client => client.write(data));
        }
    }
});

export const sseService = {
    addClient(classId: string, res: Response) {
        // Prepare headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Nginx specific
        });

        res.write(`data: {"status": "connected"}\n\n`);

        if (!clients.has(classId)) {
            clients.set(classId, new Set());
        }
        clients.get(classId)!.add(res);

        // Remove on close
        res.on('close', () => {
            const classClients = clients.get(classId);
            if (classClients) {
                classClients.delete(res);
                if (classClients.size === 0) {
                    clients.delete(classId);
                }
            }
        });
    },
    
    // cleanup if needed
    shutdown() {
        subscriber.disconnect();
    }
};
