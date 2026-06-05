import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { HierarchyRegistryService } from './service/hierarchy-registry.service';
import { CostCenterMapperService } from './service/cost-center-mapper.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly hierarchyRegistry: HierarchyRegistryService,
    private readonly costCenterMapper: CostCenterMapperService,
  ) {}

  // ========== BASIC CRUD ==========
  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    return this.departmentService.create(dto, req.user.tenantId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.departmentService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.departmentService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: any,
  ) {
    return this.departmentService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.departmentService.delete(id, req.user.tenantId);
  }

  // ========== HIERARCHY REGISTRY (PDF Requirement) ==========
  @Get('hierarchy/tree')
  getHierarchy(@Req() req: any) {
    return this.hierarchyRegistry.getHierarchy(req.user.tenantId);
  }

  @Get('hierarchy/roots')
  getRootDepartments(@Req() req: any) {
    return this.hierarchyRegistry.getRootDepartments(req.user.tenantId);
  }

  @Get(':id/children')
  getChildren(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.hierarchyRegistry.getChildren(id, req.user.tenantId);
  }

  // ========== COST CENTER MAPPER (PDF Requirement) ==========
  @Get(':id/cost-center')
  getCostCenter(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.costCenterMapper.getCostCenterCode(id, req.user.tenantId);
  }

  @Patch(':id/cost-center')
  updateCostCenter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('costCenterCode') costCenterCode: string,
    @Req() req: any,
  ) {
    return this.costCenterMapper.updateCostCenterCode(id, costCenterCode, req.user.tenantId);
  }

  @Get('cost-centers/all')
  getAllCostCenters(@Req() req: any) {
    return this.costCenterMapper.getAllCostCenters(req.user.tenantId);
  }
}