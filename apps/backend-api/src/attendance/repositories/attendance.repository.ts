// src/attendance/repositories/attendance.repository.ts
import { DatabaseService } from '../../database/database.service';
import { AttendanceLog } from '@chronos/database';

export class AttendanceRepository {
  private lastSyncTimestamp: Date | null = null;

  constructor(private db: DatabaseService) {}

  async findMany(params: {
    where?: any;
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: any;
  }): Promise<AttendanceLog[]> {
    return this.db.attendanceLog.findMany(params);
  }

  async findUnique(params: { where: any }): Promise<AttendanceLog | null> {
    return this.db.attendanceLog.findUnique(params);
  }

  async update(params: {
    where: any;
    data: any;
  }): Promise<AttendanceLog> {
    return this.db.attendanceLog.update(params);
  }

  async create(params: { data: any }): Promise<AttendanceLog> {
    return this.db.attendanceLog.create(params);
  }

  async delete(params: { where: any }): Promise<AttendanceLog> {
    return this.db.attendanceLog.delete(params);
  }

  async count(params: { where?: any }): Promise<number> {
    return this.db.attendanceLog.count(params);
  }

  // Alternative implementation without isSynced field
  async findPendingAttendances(): Promise<AttendanceLog[]> {
    // Get records since last sync (or last 7 days if first sync)
    const since = this.lastSyncTimestamp || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const records = await this.db.attendanceLog.findMany({
      where: {
        timestamp: {
          gt: since,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: 1000, // Limit batch size
    });
    
    // Update the last sync timestamp to the latest record's timestamp
    if (records.length > 0) {
      this.lastSyncTimestamp = records[records.length - 1].timestamp;
    }
    
    return records;
  }

  // Helper method to reset sync tracking
  resetSyncTracking() {
    this.lastSyncTimestamp = null;
  }
}