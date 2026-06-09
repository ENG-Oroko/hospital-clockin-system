jest.mock('./document-compiler', () => ({
  DocumentCompiler: jest.fn().mockImplementation(() => ({})),
}));

import { ReportsController } from './reports.controller';
import { REPORT_TYPES, type ReportQueryDTO, type ReportListQueryDTO } from './reports.types';
import type { ReportsQueueService } from './reports-queue.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let mockReportsService: any;
  let mockReportsQueue: Partial<ReportsQueueService>;

  beforeEach(() => {
    mockReportsService = {
      generateReport: jest.fn(),
      listReports: jest.fn(),
      getReportById: jest.fn(),
      downloadReport: jest.fn(),
    };

    mockReportsQueue = {
      getJobStatus: jest.fn(),
    };

    controller = new ReportsController(mockReportsService, mockReportsQueue as ReportsQueueService);
  });

  it('should return 202 when the report is queued', async () => {
    const payload: ReportQueryDTO = {
      reportType: REPORT_TYPES.MONTHLY_ATTENDANCE,
      startDate: '2024-01-01',
      endDate: '2024-01-02',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockReportsService.generateReport.mockResolvedValue({ queued: true, jobId: 'job-123' });

    await controller.generate('tenant-1', { userId: 'user-1' } as any, payload, res);

    expect(mockReportsService.generateReport).toHaveBeenCalledWith('tenant-1', 'user-1', payload);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ jobId: 'job-123' });
  });

  it('should return the report payload when not queued', async () => {
    const payload: ReportQueryDTO = {
      reportType: REPORT_TYPES.MONTHLY_ATTENDANCE,
      startDate: '2024-01-01',
      endDate: '2024-01-02',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const reportPayload = { rows: [] };

    mockReportsService.generateReport.mockResolvedValue(reportPayload);

    await controller.generate('tenant-1', { userId: 'user-1' } as any, payload, res);

    expect(res.json).toHaveBeenCalledWith(reportPayload);
  });

  it('should list reports through the service', async () => {
    const query: ReportListQueryDTO = { page: 1, limit: 20 };
    mockReportsService.listReports.mockResolvedValue({ data: [] });

    const result = await controller.list('tenant-1', query);

    expect(mockReportsService.listReports).toHaveBeenCalledWith('tenant-1', query);
    expect(result).toEqual({ data: [] });
  });

  it('should return available report types', () => {
    const result = controller.getReportTypes();

    expect(result).toEqual({ reportTypes: Object.values(REPORT_TYPES) });
  });

  it('should fetch a report by id', async () => {
    const report = { id: 'r1' };
    mockReportsService.getReportById.mockResolvedValue(report);

    const result = await controller.getById('tenant-1', 'r1');

    expect(mockReportsService.getReportById).toHaveBeenCalledWith('tenant-1', 'r1');
    expect(result).toEqual(report);
  });

  it('should download a report and set headers', async () => {
    const buffer = Buffer.from('abc');
    mockReportsService.downloadReport.mockResolvedValue({
      buffer,
      mimeType: 'application/pdf',
      filename: 'report.pdf',
    });
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await controller.getDownload('tenant-1', 'r1', 'pdf', res);

    expect(mockReportsService.downloadReport).toHaveBeenCalledWith('tenant-1', 'r1', 'pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="report.pdf"');
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('should return job status if found', async () => {
    const status = { state: 'completed' };
    (mockReportsQueue.getJobStatus as jest.Mock).mockResolvedValue(status);

    const result = await controller.getJobStatus('job-1');

    expect(mockReportsQueue.getJobStatus).toHaveBeenCalledWith('job-1');
    expect(result).toEqual(status);
  });

  it('should return found false when job status is missing', async () => {
    (mockReportsQueue.getJobStatus as jest.Mock).mockResolvedValue(null);

    const result = await controller.getJobStatus('job-1');

    expect(result).toEqual({ found: false });
  });
});
