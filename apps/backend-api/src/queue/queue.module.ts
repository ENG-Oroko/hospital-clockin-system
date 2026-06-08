import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueConfig } from './queue.config';
import { QueueHealthService } from './queue.health.service';
import { FallbackDiskWriterService } from './fallback-disk-writer.service';
// Constants
import { QUEUE_NAMES } from './constants/queue-names.constants';

@Module({
    imports: [
        ConfigModule,  
        BullModule.forRootAsync({
      
      // Inject ConfigService for environment variables
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        
        // Extract Redis connection details from environment
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisDb = configService.get<number>('REDIS_DB', 0);

        // Log Redis connection (hide password)
        console.log(
          `🔌 Connecting to Redis:\n` +
          `   Host: ${redisHost}\n` +
          `   Port: ${redisPort}\n` +
          `   Database: ${redisDb}\n` +
          `   Password: ${redisPassword ? '***' : 'none'}`,
        );

        return {
        
          redis: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            db: redisDb,

            
            retryStrategy: (times: number) => {
              
              // Give up after 10 attempts
              if (times > 10) {
                console.error(
                  `❌ Failed to connect to Redis after ${times} attempts. Giving up.`,
                );
                return null; // Stop retrying
              }

              // Exponential backoff with max 3 seconds
              // Attempt 1: 1s, 2: 2s, 3: 3s, 4: 3s, ...
              const delay = Math.min(times * 1000, 3000);
              
              console.warn(
                `⚠️  Redis connection failed. Retry ${times}/10 in ${delay}ms...`,
              );
              
              return delay;
            },

            enableReadyCheck: true,
            keepAlive: 30000, // 30 seconds

            maxRetriesPerRequest: 3,

            enableOfflineQueue: false,
          },

          defaultJobOptions: {      
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000, // 2 seconds base delay
            },

            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),

    BullModule.registerQueue({
    
      name: QUEUE_NAMES.ATTENDANCE_PROCESSING,
      limiter: {
        max: 100,
        duration: 10000,
      },

      defaultJobOptions: {
      },
    }),
  ],
  providers: [
   
    QueueService,
    QueueConfig,
    QueueHealthService,
    FallbackDiskWriterService,
  ],

  exports: [
    
    QueueService,

    QueueHealthService,
  ],
})
export class QueueModule {}
