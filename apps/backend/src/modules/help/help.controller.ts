import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import type { HelpProgress } from '@sitepilot/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/permissions';
import { HelpService } from './help.service';
import { TourParamDto, UpdateChecklistDto, UpdateTourProgressDto } from './dto/help.dto';

interface AuthUser { id: string; organizationId: string }

/** A member's own help progress; nobody can read or change another member's. */
@Controller('help')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HelpController {
  constructor(private readonly help: HelpService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: AuthUser): Promise<HelpProgress> {
    return this.help.getProgress(user.id, user.organizationId);
  }

  @Put('tours/:tour')
  updateTour(@CurrentUser() user: AuthUser, @Param() params: TourParamDto, @Body() dto: UpdateTourProgressDto): Promise<HelpProgress> {
    return this.help.setTourStatus(user.id, user.organizationId, params.tour, dto.status);
  }

  @Delete('tours/:tour')
  restartTour(@CurrentUser() user: AuthUser, @Param() params: TourParamDto): Promise<HelpProgress> {
    return this.help.restartTours(user.id, user.organizationId, params.tour);
  }

  @Delete('tours')
  restartAllTours(@CurrentUser() user: AuthUser): Promise<HelpProgress> {
    return this.help.restartTours(user.id, user.organizationId);
  }

  @Put('checklist')
  updateChecklist(@CurrentUser() user: AuthUser, @Body() dto: UpdateChecklistDto): Promise<HelpProgress> {
    return this.help.setChecklistDismissed(user.id, user.organizationId, dto.dismissed);
  }
}
