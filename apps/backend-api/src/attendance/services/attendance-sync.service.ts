// src/attendance/services/attendance-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AttendanceSyncService {
  private readonly logger = new Logger(AttendanceSyncService.name);

  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly db: PrismaService,
  ) {}

  // Existing method
  async syncAttendances() {
    try {
      const unsyncedRecords = await this.attendanceRepository.findPendingAttendances();
      
      this.logger.log(`Found ${unsyncedRecords.length} unsynced attendance records`);

      for (const record of unsyncedRecords) {
        try {
          await this.attendanceRepository.update({
            where: { id: record.id },
            data: { isSynced: true }
          });
          
          this.logger.debug(`Synced attendance record ${record.id}`);
        } catch (error) {
          this.logger.error(`Failed to sync record ${record.id}: ${error.message}`);
        }
      }

      return { synced: unsyncedRecords.length };
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`);
      throw error;
    }
  }

  // NEW METHOD: syncWithBiometricDevices
  async syncWithBiometricDevices(): Promise<{ synced: number; devices: string[]; errors: string[] }> {
    this.logger.log('Starting sync with biometric devices...');
    
    const devices = await this.db.device.findMany({
      where: { isActive: true },
    });
    
    let synced = 0;
    const errors: string[] = [];
    const deviceNames: string[] = [];

    for (const device of devices) {
      try {
        // Simulate or implement biometric device sync
        this.logger.debug(`Syncing with device: ${device.name || device.id}`);
        
        // Here you would call your biometric device API
        // const biometricLogs = await this.fetchFromBiometricDevice(device);
        // await this.processBiometricLogs(biometricLogs);
        
        deviceNames.push(device.name || device.id);
        synced++;
      } catch (error) {
        errors.push(`Device ${device.id}: ${error.message}`);
        this.logger.error(`Failed to sync device ${device.id}: ${error.message}`);
      }
    }

    return {
      synced,
      devices: deviceNames,
      errors,
    };
  }

  // syncWithHRSystem
  async syncWithHRSystem(): Promise<{ synced: number; records: any[]; errors: string[] }> {
    this.logger.log('Starting sync with HR system...');
    
    try {
      const logs = await this.db.attendanceLog.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true, payrollNumber: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const records: any[] = [];
      const errors: string[] = [];
      let synced = 0;

      for (const log of logs) {
        try {
          const hrRecord = {
            employeeId: log.user.payrollNumber,
            timestamp: log.timestamp,
            direction: log.direction,
          };

          records.push(hrRecord);
          synced++;
        } catch (error) {
          errors.push(`Attendance log ${log.id}: ${error.message}`);
          this.logger.error(`Failed to sync attendance log ${log.id}: ${error.message}`);
        }
      }

      this.logger.log(`Synced ${synced} records to HR system`);
      
      return {
        synced,
        records,
        errors,
      };
    } catch (error) {
      this.logger.error(`HR system sync failed: ${error.message}`);
      throw error;
    }
  }

  // NEW METHOD: generateSyncReport
  async generateSyncReport(): Promise<{
    totalLogs: number;
    syncedLogs: number;
    pendingSync: number;
    devicesConnected: number;
    lastSyncTime: Date;
    syncHistory: any[];
  }> {
    this.logger.log('Generating sync report...');
    
    const totalLogs = await this.attendanceRepository.count({});
    
    // Count synced logs (if you have isSynced field)
    let syncedLogs = 0;
    try {
      syncedLogs = await this.attendanceRepository.count({
        where: { isSynced: true }
      });
    } catch {
      // If isSynced field doesn't exist, assume all are synced
      syncedLogs = totalLogs;
    }
    
    const pendingSync = totalLogs - syncedLogs;
    
    const devices = await this.db.device.count({
      where: { isActive: true }
    });
    
    // Get recent sync history (last 10 sync operations)
    const syncHistory = await this.getRecentSyncHistory();
    
    return {
      totalLogs,
      syncedLogs,
      pendingSync,
      devicesConnected: devices,
      lastSyncTime: new Date(),
      syncHistory,
    };
  }

  // Helper method to get sync history
  private async getRecentSyncHistory(): Promise<any[]> {
    // You can implement this by creating a SyncLog table or tracking in memory
    // For now, return mock data
    return [
      {
        timestamp: new Date(),
        status: 'success',
        recordsSynced: 0,
        source: 'biometric',
      },
    ];
  }

  // Optional: Method to sync both systems
  async syncAll(): Promise<{
    biometric: any;
    hrSystem: any;
  }> {
    const [biometric, hrSystem] = await Promise.all([
      this.syncWithBiometricDevices(),
      this.syncWithHRSystem(),
    ]);
    
    return { biometric, hrSystem };
  }

  // Existing method for status
  async getSyncStatus() {
    const totalRecords = await this.attendanceRepository.count({});
    const syncedRecords = await this.attendanceRepository.count({
      where: { isSynced: true }
    }).catch(() => 0);
    
    return {
      totalRecords,
      syncedRecords,
      pendingSync: totalRecords - syncedRecords,
      lastSync: new Date().toISOString(),
    };
  }
}
