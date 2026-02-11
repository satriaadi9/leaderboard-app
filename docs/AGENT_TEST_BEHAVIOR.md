# AI Agent Test Behavior - Quick Reference

**Project**: Web Application  
**Framework**: Vitest for E2E tests  
**Approach**: E2E only, no unit/integration tests  
**Environment**: Clone test database from dev

## Testing Philosophy

**ONLY E2E tests:**

- Test complete API flows end-to-end
- Real database operations (test DB clone)
- Real HTTP requests to backend
- No mocking, no unit tests, no integration tests

**Why E2E Only:**

- Tests real user scenarios
- Catches integration issues
- Validates complete request/response cycle
- Tests database transactions
- Verifies authentication/authorization

## Test Environment

### Architecture

```
Host Machine (E2E Tests)
  ↓ HTTP requests
Docker Container (backend-test service)
  ↓ connects to
Docker Container (postgres-test with cloned data)
```

### Database Setup

**Test database is cloned from dev:**

1. Development database runs normally
2. Test script clones dev database → test database
3. E2E tests run against test database
4. Test database reset after tests

**Never test against:**

- ❌ Development database (pollutes data)
- ❌ Production database (dangerous)
- ❌ In-memory database (not realistic)

## Test Structure

### File Organization

```
backend/test/
├── api/                    # E2E API tests
│   ├── auth.e2e.test.ts   # Authentication flows
│   ├── item.e2e.test.ts   # Item CRUD operations
│   ├── task.e2e.test.ts   # Task operations
│   └── admin.e2e.test.ts  # Admin operations
├── helpers/                # Test utilities
│   ├── setup.ts           # Global setup/teardown
│   ├── factories.ts       # Test data factories
│   └── api-client.ts      # HTTP client wrapper
├── setup-test-db.sh       # Clone dev DB → test DB
├── teardown-test-db.sh    # Cleanup test DB
└── run-tests.sh           # Run all E2E tests
```

### Naming Convention

```
<feature>.e2e.test.ts  # E2E test file
```

Examples:

- `auth.e2e.test.ts`
- `item.e2e.test.ts`
- `task.e2e.test.ts`
- `data.e2e.test.ts`

## Vitest Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // E2E test settings
    include: ['test/api/**/*.e2e.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Run tests sequentially (avoid DB conflicts)
    threads: false,

    // Timeout for E2E tests (longer than unit tests)
    testTimeout: 30000,
    hookTimeout: 30000,

    // Global setup/teardown
    globalSetup: ['./test/helpers/setup.ts'],

    // Environment
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://dbuser:dbpass@localhost:5433/app_db_test',
      JWT_SECRET: 'test-secret-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Key Settings

| Setting              | Value               | Reason                           |
| -------------------- | ------------------- | -------------------------------- |
| `threads: false`     | Sequential          | Avoid database conflicts         |
| `testTimeout: 30000` | 30 seconds          | E2E tests slower than unit tests |
| `include`            | `**/*.e2e.test.ts`  | Only E2E tests                   |
| `DATABASE_URL`       | Test DB (port 5433) | Separate from dev DB (5432)      |

## Test Template

### Complete E2E Test Pattern

```typescript
// test/api/item.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { apiClient } from '../helpers/api-client';
import { createUser, createItem } from '../helpers/factories';
import { prisma } from '@/config/prisma';

describe('Item API (E2E)', () => {
  let adminToken: string;
  let userToken: string;
  let adminId: string;

  // Setup: Create test users
  beforeAll(async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const user = await createUser({ role: 'USER' });

    adminId = admin.id;

    adminToken = await apiClient.login(admin.email, 'password');
    userToken = await apiClient.login(user.email, 'password');
  });

  // Cleanup: Delete test data after each test
  beforeEach(async () => {
    await prisma.item.deleteMany({});
  });

  // Cleanup: Close connections
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/admin/items', () => {
    it('should create item with valid data', async () => {
      // Arrange
      const itemData = {
        title: 'New Item',
        description: 'Item description',
        priority: 5,
        details: [
          {
            content: 'Detail content',
            type: 'text',
            order: 0,
          },
        ],
      };

      // Act
      const response = await apiClient.post('/api/admin/items', itemData, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toMatchObject({
        title: itemData.title,
        priority: itemData.priority,
        ownerId: adminId,
      });
      expect(response.data.data.details).toHaveLength(1);

      // Verify in database
      const savedItem = await prisma.item.findUnique({
        where: { id: response.data.data.id },
        include: { details: true },
      });
      expect(savedItem).not.toBeNull();
      expect(savedItem!.details).toHaveLength(1);
    });

    it('should reject item without authentication', async () => {
      const itemData = { title: 'Test', priority: 5, details: [] };

      const response = await apiClient.post('/api/admin/items', itemData, {
        validateStatus: () => true, // Don't throw on 401
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    it('should reject item with invalid data', async () => {
      const itemData = {
        title: '', // Invalid: empty title
        priority: 0, // Invalid: zero priority
        details: [], // Invalid: no details
      };

      const response = await apiClient.post('/api/admin/items', itemData, {
        headers: { Authorization: `Bearer ${adminToken}` },
        validateStatus: () => true,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.errors).toBeDefined();
    });

    it('should reject user creating item', async () => {
      const itemData = { title: 'Test', priority: 5, details: [] };

      const response = await apiClient.post('/api/admin/items', itemData, {
        headers: { Authorization: `Bearer ${userToken}` },
        validateStatus: () => true,
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('GET /api/admin/items', () => {
    it('should list admin items', async () => {
      // Arrange: Create test items
      await createItem({ ownerId: adminId, title: 'Item 1' });
      await createItem({ ownerId: adminId, title: 'Item 2' });

      // Act
      const response = await apiClient.get('/api/admin/items', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data[0]).toHaveProperty('title');
      expect(response.data.data[0]).toHaveProperty('priority');
    });
  });
});
```

## Test Helpers

### API Client Wrapper

```typescript
// test/helpers/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      validateStatus: status => status < 500, // Don't throw on 4xx
    });
  }

  async get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.post('/api/auth/login', { email, password });
    return response.data.data.token;
  }
}

export const apiClient = new ApiClient();
```

### Test Data Factories

```typescript
// test/helpers/factories.ts
import { prisma } from '@/config/prisma';
import bcrypt from 'bcrypt';

export async function createUser(data: {
  email?: string;
  name?: string;
  role?: 'ADMIN' | 'USER';
}) {
  const email = data.email || `test-${Date.now()}@example.com`;
  const hashedPassword = await bcrypt.hash('password', 10);

  return await prisma.user.create({
    data: {
      email,
      name: data.name || 'Test User',
      password: hashedPassword,
      role: data.role || 'USER',
    },
  });
}

export async function createItem(data: { ownerId: string; title?: string; priority?: number }) {
  return await prisma.item.create({
    data: {
      title: data.title || 'Test Item',
      description: 'Test description',
      priority: data.priority || 5,
      ownerId: data.ownerId,
      details: {
        create: [
          {
            content: 'Test detail',
            type: 'text',
            order: 0,
          },
        ],
      },
    },
  });
}

export async function createTask(data: { itemId: string; userId: string }) {
  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  return await prisma.task.create({
    data: {
      itemId: data.itemId,
      userId: data.userId,
      startTime,
      endTime,
      status: 'IN_PROGRESS',
    },
  });
}
```

### Global Setup/Teardown

```typescript
// test/helpers/setup.ts
import { execSync } from 'child_process';

export async function setup() {
  console.log('Setting up test environment...');

  // Clone dev database to test database
  try {
    execSync('bash test/setup-test-db.sh', { stdio: 'inherit' });
    console.log('Test database ready');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function teardown() {
  console.log('Cleaning up test environment...');

  // Optional: Clean up test database
  try {
    execSync('bash test/teardown-test-db.sh', { stdio: 'inherit' });
    console.log('Test database cleaned up');
  } catch (error) {
    console.error('Failed to teardown test database:', error);
  }
}
```

## Database Scripts

### Setup Test Database

```bash
#!/bin/bash
# test/setup-test-db.sh

set -e

echo "Setting up test database..."

# Drop existing test database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U dbuser -d postgres -c "DROP DATABASE IF EXISTS app_db_test;"

# Create test database by cloning dev database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U dbuser -d postgres -c "CREATE DATABASE app_db_test WITH TEMPLATE app_db;"

echo "Test database ready (cloned from dev)"
```

### Teardown Test Database

```bash
#!/bin/bash
# test/teardown-test-db.sh

set -e

echo "Cleaning up test database..."

# Drop test database
docker compose -f docker-compose.dev.yml exec -T postgres psql -U dbuser -d postgres -c "DROP DATABASE IF EXISTS app_db_test;"

echo "Test database cleaned up"
```

### Run Tests Script

```bash
#!/bin/bash
# test/run-tests.sh

set -e

echo "Running E2E tests..."

# 1. Setup test database
bash test/setup-test-db.sh

# 2. Run tests on host (connects to Docker services)
cd backend
npm run test:e2e

# 3. Cleanup (optional)
# bash test/teardown-test-db.sh

echo "E2E tests complete"
```

## Running Tests

### Commands

```bash
# Run all E2E tests (from project root)
cd backend && npm run test:e2e

# Run specific test file
cd backend && npx vitest test/api/item.e2e.test.ts

# Run tests in watch mode
cd backend && npx vitest --watch

# Run tests with coverage
cd backend && npx vitest --coverage

# Run tests matching pattern
cd backend && npx vitest -t "should create exam"
```

### package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "bash test/setup-test-db.sh && vitest run",
    "test:e2e:watch": "vitest --watch",
    "test:e2e:coverage": "vitest run --coverage"
  }
}
```

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should create item', async () => {
  // Arrange: Setup test data
  const itemData = { title: 'Test', priority: 5, details: [] };

  // Act: Execute the operation
  const response = await apiClient.post('/api/admin/items', itemData, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Assert: Verify the result
  expect(response.status).toBe(201);
  expect(response.data.data.title).toBe('Test');
});
```

### Test CRUD Operations

```typescript
describe('Item CRUD', () => {
  it('should CREATE item', async () => {
    const response = await apiClient.post('/api/admin/items', data, { headers });
    expect(response.status).toBe(201);
  });

  it('should READ item', async () => {
    const response = await apiClient.get(`/api/admin/items/${itemId}`, { headers });
    expect(response.status).toBe(200);
  });

  it('should UPDATE item', async () => {
    const response = await apiClient.put(`/api/admin/items/${itemId}`, updates, { headers });
    expect(response.status).toBe(200);
  });

  it('should DELETE item', async () => {
    const response = await apiClient.delete(`/api/admin/items/${itemId}`, { headers });
    expect(response.status).toBe(204);
  });
});
```

### Test Authentication/Authorization

```typescript
describe('Authorization', () => {
  it('should reject unauthenticated request', async () => {
    const response = await apiClient.get('/api/admin/items', {
      validateStatus: () => true,
    });
    expect(response.status).toBe(401);
  });

  it('should reject user accessing admin endpoint', async () => {
    const response = await apiClient.get('/api/admin/items', {
      headers: { Authorization: `Bearer ${userToken}` },
      validateStatus: () => true,
    });
    expect(response.status).toBe(403);
  });

  it('should allow admin accessing admin endpoint', async () => {
    const response = await apiClient.get('/api/admin/items', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.status).toBe(200);
  });
});
```

### Test Validation

```typescript
describe('Validation', () => {
  it('should reject empty title', async () => {
    const response = await apiClient.post(
      '/api/admin/items',
      { title: '', priority: 5, details: [] },
      { headers, validateStatus: () => true }
    );
    expect(response.status).toBe(400);
    expect(response.data.errors).toBeDefined();
  });

  it('should reject invalid priority', async () => {
    const response = await apiClient.post(
      '/api/admin/items',
      { title: 'Test', priority: 0, details: [] },
      { headers, validateStatus: () => true }
    );
    expect(response.status).toBe(400);
  });

  it('should reject item without details', async () => {
    const response = await apiClient.post(
      '/api/admin/items',
      { title: 'Test', priority: 5, details: [] },
      { headers, validateStatus: () => true }
    );
    expect(response.status).toBe(400);
  });
});
```

### Test Complete Flows

```typescript
describe('Complete Item Flow', () => {
  it('should complete full item lifecycle', async () => {
    // 1. Admin creates item
    const createResponse = await apiClient.post('/api/admin/items', itemData, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const itemId = createResponse.data.data.id;

    // 2. User starts task
    const startResponse = await apiClient.post(
      `/api/user/items/${itemId}/start`,
      {},
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    const taskId = startResponse.data.data.id;

    // 3. User submits task
    const submitResponse = await apiClient.post(
      `/api/user/tasks/${taskId}/submit`,
      { data: { status: 'completed' } },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(submitResponse.status).toBe(200);

    // 4. Admin views results
    const resultsResponse = await apiClient.get(`/api/admin/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.data.data.status).toBe('COMPLETED');
  });
});
```

## Critical Rules

1. **E2E Only**: Never write unit or integration tests
2. **Clone Test DB**: Always clone from dev, never use dev DB
3. **Run on Host**: E2E tests run on host, connect to Docker services
4. **Sequential Tests**: Use `threads: false` to avoid DB conflicts
5. **Clean Data**: Use `beforeEach` to clean test data
6. **Close Connections**: Always `$disconnect()` in `afterAll`
7. **Factories**: Use factories for consistent test data
8. **Real Requests**: Use HTTP client, no mocking
9. **Verify in DB**: Check database state after operations
10. **Descriptive Names**: Use `should <behavior>` pattern

## Quick Decision Tree

**Need to test API endpoint?**
→ Create E2E test with real HTTP requests

**Need test data?**
→ Use factory functions in `helpers/factories.ts`

**Need to authenticate?**
→ Use `apiClient.login()` to get token

**Test failing intermittently?**
→ Check `threads: false` and clean data in `beforeEach`

**Need to verify database state?**
→ Query Prisma directly in test assertions

**Tests too slow?**
→ Reduce test data, use `describe.only()` for debugging

## Summary

**E2E testing approach:**

- Only E2E tests (no unit/integration)
- Clone dev database to test database
- Run tests on host (connect to Docker)
- Use Vitest with sequential execution
- Real HTTP requests, no mocking
- Factories for test data
- AAA pattern (Arrange-Act-Assert)
- Test CRUD, auth, validation, complete flows

**Every test validates real API behavior end-to-end.**
