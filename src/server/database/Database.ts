import { config } from 'dotenv';
import { Pool, Client, PoolConfig } from 'pg';

config();

export class Database {
  private static instance: Database;
  private pool: Pool;
  private connected: boolean = false;

  private constructor() {
    // Don't initialize the pool in test environment unless specifically requested
    if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_TEST_MODE) {
      return;
    }

    const dbConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'othello',
      user: process.env.POSTGRES_USER || 'othello_user',
      password: process.env.POSTGRES_PASSWORD || 'secure_password',

      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),

      // SSL configuration for production
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    };

    this.pool = new Pool(dbConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      console.log('🔗 Database client connected');
    });

    this.pool.on('remove', () => {
      console.log('🔌 Database client removed');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Set DATABASE_TEST_MODE=true for testing.');
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      this.connected = true;
      console.log('✅ Database connected successfully at:', result.rows[0].now);
    } catch (error) {
      this.connected = false;
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Set DATABASE_TEST_MODE=true for testing.');
    }

    if (!this.connected) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('❌ Database query failed:', { text, params, error });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Set DATABASE_TEST_MODE=true for testing.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    if (!this.pool) {
      return {
        status: 'unhealthy',
        details: { error: 'Database pool not initialized' },
      };
    }

    try {
      const result = await this.query('SELECT version(), NOW() as current_time');
      return {
        status: 'healthy',
        details: {
          version: result.rows[0].version,
          currentTime: result.rows[0].current_time,
          poolTotalCount: this.pool.totalCount,
          poolIdleCount: this.pool.idleCount,
          poolWaitingCount: this.pool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log('🔌 Database connection pool closed');
    }
  }
}
