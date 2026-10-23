import { Controller, Delete, Get, Param, Patch, Post, Query, Body, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsDashboardService } from './materials-dashboard.service';
import { MaterialView } from './material.mapper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MaterialQueryDto } from './dto/material-query.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('materials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly dashboardService: MaterialsDashboardService,
  ) {}

  @RequirePermission('material.manage')
  @Audit('material.created')
  @Post()
  create(@Body() dto: CreateMaterialDto, @CurrentUser() user: AuthUser): Promise<MaterialView> {
    return this.materialsService.create(user.organizationId, dto);
  }

  @Get()
  findAll(@Query() query: MaterialQueryDto, @CurrentUser() user: AuthUser) {
    return this.materialsService.findAll(user.organizationId, query);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getDashboard(user.organizationId);
  }

  @Get('categories')
  getCategories(@CurrentUser() user: AuthUser) {
    return this.materialsService.getCategories(user.organizationId);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: AuthUser) {
    return this.materialsService.getLowStock(user.organizationId);
  }

  @Get('movements')
  getMovements(@Query() query: MovementQueryDto, @CurrentUser() user: AuthUser) {
    return this.materialsService.getMovements(user.organizationId, query);
  }

  @Get('suppliers')
  getSuppliers(@CurrentUser() user: AuthUser) {
    return this.materialsService.getSuppliers(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.materialsService.findOne(id, user.organizationId);
  }

  @RequirePermission('material.manage')
  @Audit('material.updated')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialDto, @CurrentUser() user: AuthUser): Promise<MaterialView> {
    return this.materialsService.update(id, user.organizationId, dto);
  }

  @RequirePermission('material.manage')
  @Audit('material.archived')
  @Delete(':id')
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.materialsService.archive(id, user.organizationId);
  }
}
