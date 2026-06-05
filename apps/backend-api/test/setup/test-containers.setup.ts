// Location: apps/backend-api/test/setup/test-containers.setup.ts

// ============================================
// IMPORTS
// ============================================

import { GenericContainer, StartedTestContainer } from 'testcontainers';

// ============================================
// REDIS CONNECTION DETAILS INTERFACE
// ============================================

/**
 * Redis connection configuration
 */
export interface RedisConnectionDetails {
  host: string;
  port: number;
  url: string;
}

/**
 * PostgreSQL connection configuration
 */
export interface PostgresConnectionDetails {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  url: string;
}

// ============================================
// TEST CONTAINERS MANAGER
// ============================================

/**
 * Test container manager for integration tests
 * 
 * Manages Docker containers for:
 * - Redis (queue storage)
 * - PostgreSQL (database)
 * 
 * Why Docker containers?
 * - Isolated test environment
 * - No conflicts with local services
 * - Automatic cleanup after tests
 * - Consistent across all environments
 * 
 * Usage:
 * ```typescript
 * const manager = new TestContainersManager();
 * 
 * // Start containers
 * const redis = await manager.startRedis();
 * const postgres = await manager.startPostgres();
 * 
 * // Run tests...
 * 
 * // Cleanup
 * await manager.stopAll();
 * ```
 */
export class TestContainersManager {
  
  // ==========================================
  // PROPERTIES
  // ==========================================
  
  /**
   * Running Redis container instance
   * Null if not started
   */
  private redisContainer: StartedTestContainer | null = null;

  /**
   * Running PostgreSQL container instance
   * Null if not started
   */
  private postgresContainer: StartedTestContainer | null = null;

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  /**
   * Start Redis container for queue tests
   * 
   * Container specs:
   * - Image: redis:7.2-alpine (latest stable)
   * - Exposed port: 6379 (default Redis port)
   * - Startup timeout: 2 minutes
   * 
   * @returns Connection details for Redis
   * 
   * @throws Error if container fails to start
   * 
   * Example:
   * ```typescript
   * const redis = await manager.startRedis();
   * console.log(`Redis URL: ${redis.url}`);
   * ```
   */
  async startRedis(): Promise<RedisConnectionDetails> {
    
    console.log('🐳 Starting Redis test container...');

    try {
      
      // Start Redis 7.2 container
      // alpine = lightweight Linux distribution (~5MB vs ~100MB)
      this.redisContainer = await new GenericContainer('redis:7.2-alpine')
        .withExposedPorts(6379) // Expose Redis default port
        .withStartupTimeout(120000) // 2 minutes timeout
        .start();

      // Get dynamically assigned host and port
      // Host: usually 'localhost' or Docker network IP
      // Port: random high port (e.g., 55001)
      const host = this.redisContainer.getHost();
      const port = this.redisContainer.getMappedPort(6379);

      console.log(`✅ Redis started: ${host}:${port}`);

      return {
        host,
        port,
        url: `redis://${host}:${port}`,
      };

    } catch (error) {
      console.error('❌ Failed to start Redis container:', error);
      throw error;
    }
  }

  /**
   * Start PostgreSQL container for database tests
   * 
   * Container specs:
   * - Image: postgres:15-alpine (PostgreSQL 15)
   * - Database: chronos_test
   * - User: test_user
   * - Password: test_password
   * - Exposed port: 5432 (default PostgreSQL port)
   * 
   * @returns Connection details for PostgreSQL
   * 
   * @throws Error if container fails to start
   * 
   * Example:
   * ```typescript
   * const db = await manager.startPostgres();
   * console.log(`Database URL: ${db.url}`);
   * ```
   */
  async startPostgres(): Promise<PostgresConnectionDetails> {
    
    console.log('🐳 Starting PostgreSQL test container...');

    const dbName = 'chronos_test';
    const username = 'test_user';
    const password = 'test_password';

    try {
      
      // Start PostgreSQL 15 container with environment variables
      this.postgresContainer = await new GenericContainer('postgres:15-alpine')
        .withExposedPorts(5432) // Expose PostgreSQL default port
        .withEnvironment({
          POSTGRES_DB: dbName,       // Create database
          POSTGRES_USER: username,   // Create user
          POSTGRES_PASSWORD: password, // Set password
        })
        .withStartupTimeout(120000) // 2 minutes timeout
        .start();

      const host = this.postgresContainer.getHost();
      const port = this.postgresContainer.getMappedPort(5432);

      console.log(`✅ PostgreSQL started: ${host}:${port}`);

      return {
        host,
        port,
        database: dbName,
        username,
        password,
        url: `postgresql://${username}:${password}@${host}:${port}/${dbName}`,
      };

    } catch (error) {
      console.error('❌ Failed to start PostgreSQL container:', error);
      throw error;
    }
  }

  /**
   * Stop all running containers and cleanup
   * 
   * Stops:
   * - Redis container (if running)
   * - PostgreSQL container (if running)
   * 
   * Automatically called in afterAll() hook
   * 
   * Safe to call multiple times (idempotent)
   * 
   * Example:
   * ```typescript
   * afterAll(async () => {
   *   await manager.stopAll();
   * });
   * ```
   */
  async stopAll(): Promise<void> {
    
    console.log('🧹 Stopping test containers...');

    // Stop Redis
    if (this.redisContainer) {
      try {
        await this.redisContainer.stop();
        console.log('✅ Redis container stopped');
      } catch (error) {
        console.error('⚠️  Failed to stop Redis container:', error);
      }
      this.redisContainer = null;
    }

    // Stop PostgreSQL
    if (this.postgresContainer) {
      try {
        await this.postgresContainer.stop();
        console.log('✅ PostgreSQL container stopped');
      } catch (error) {
        console.error('⚠️  Failed to stop PostgreSQL container:', error);
      }
      this.postgresContainer = null;
    }
  }

  /**
   * Check if Redis container is running
   * 
   * @returns true if Redis container is active
   */
  isRedisRunning(): boolean {
    return this.redisContainer !== null;
  }

  /**
   * Check if PostgreSQL container is running
   * 
   * @returns true if PostgreSQL container is active
   */
  isPostgresRunning(): boolean {
    return this.postgresContainer !== null;
  }
}