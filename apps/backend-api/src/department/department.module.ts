import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmployeeModule } from '../employee/employee.module';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { HierarchyRegistryService } from './service/hierarchy-registry.service';
import { CostCenterMapperService } from './service/cost-center-mapper.service';

@Module({
  imports: [DatabaseModule, EmployeeModule],
  controllers: [DepartmentController],
  providers: [
    DepartmentService,
    HierarchyRegistryService,
    CostCenterMapperService,
  ],
  exports: [
    DepartmentService,
    HierarchyRegistryService,
    CostCenterMapperService,
  ],
})
export class DepartmentModule {}
