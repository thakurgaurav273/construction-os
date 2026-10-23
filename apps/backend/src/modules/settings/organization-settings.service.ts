import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { UpdateOrganizationSettingsDto } from './dto/organization.dto';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Raster formats only: an uploaded SVG could carry script. */
const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Signed logo links are refreshed whenever settings are read, well before they expire. */
const LOGO_URL_TTL_SECONDS = 24 * 60 * 60;

export interface OrganizationSettingsView {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  gstNumber: string | null;
  currency: string;
  timezone: string;
}

@Injectable()
export class OrganizationSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async get(organizationId: string): Promise<OrganizationSettingsView> {
    return this.toView(await this.find(organizationId));
  }

  async update(organizationId: string, dto: UpdateOrganizationSettingsDto): Promise<OrganizationSettingsView> {
    await this.find(organizationId);
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name?.trim(),
        address: dto.address,
        gstNumber: dto.gstNumber,
        currency: dto.currency,
        timezone: dto.timezone,
      },
    });
    return this.toView(organization);
  }

  async uploadLogo(organizationId: string, file: Express.Multer.File | undefined): Promise<OrganizationSettingsView> {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const extension = LOGO_TYPES[file.mimetype];
    if (!extension) throw new BadRequestException('Upload a PNG, JPG or WebP image.');
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException('The logo must be 2 MB or smaller.');

    const previous = await this.find(organizationId);
    const key = `organizations/${organizationId}/branding/logo-${uuidv4()}.${extension}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const organization = await this.prisma.organization.update({ where: { id: organizationId }, data: { logo: key } });
    await this.deleteStoredLogo(previous.logo);
    return this.toView(organization);
  }

  async removeLogo(organizationId: string): Promise<OrganizationSettingsView> {
    const previous = await this.find(organizationId);
    const organization = await this.prisma.organization.update({ where: { id: organizationId }, data: { logo: null } });
    await this.deleteStoredLogo(previous.logo);
    return this.toView(organization);
  }

  private async find(organizationId: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  private async toView(organization: Organization): Promise<OrganizationSettingsView> {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: await this.logoUrl(organization.logo),
      address: organization.address,
      gstNumber: organization.gstNumber,
      currency: organization.currency,
      timezone: organization.timezone,
    };
  }

  /** Older logos may be stored as full URLs; new ones are storage keys served through signed links. */
  private async logoUrl(logo: string | null): Promise<string | null> {
    if (!logo) return null;
    if (/^https?:\/\//.test(logo)) return logo;
    return this.storage.getSignedDownloadUrl(logo, LOGO_URL_TTL_SECONDS);
  }

  private async deleteStoredLogo(logo: string | null): Promise<void> {
    if (!logo || /^https?:\/\//.test(logo)) return;
    // A leftover file is harmless; don't fail the request over it.
    await this.storage.delete(logo).catch(() => undefined);
  }
}
