import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { VendorView } from './vendor.mapper';
import { VendorsService } from './vendors.service';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<VendorView[]> {
    return this.vendors.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<VendorView> {
    return this.vendors.findOne(id, user.organizationId);
  }

  @RequirePermission('vendor.manage')
  @Post()
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: AuthUser): Promise<VendorView> {
    return this.vendors.create(user.organizationId, dto);
  }

  @RequirePermission('vendor.manage')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: AuthUser,
  ): Promise<VendorView> {
    return this.vendors.update(id, user.organizationId, dto);
  }

  @RequirePermission('vendor.manage')
  @Post(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<VendorView> {
    return this.vendors.setStatus(id, user.organizationId, 'INACTIVE');
  }

  @RequirePermission('vendor.manage')
  @Post(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<VendorView> {
    return this.vendors.setStatus(id, user.organizationId, 'ACTIVE');
  }
}
