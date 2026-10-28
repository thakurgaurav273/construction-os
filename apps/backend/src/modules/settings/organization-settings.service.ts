import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { MAX_IMAGE_BYTES, readRasterImage } from '../../common/storage/image-uploads';
import { StorageService } from '../../common/storage/storage.service';
import { UpdateBrandingDto, UpdateOrganizationSettingsDto } from './dto/organization.dto';
import { MIN_BRAND_CONTRAST, contrastRatio } from '../../common/branding/brand-color';

export const MAX_LOGO_BYTES = MAX_IMAGE_BYTES;

/** Signed logo links are refreshed whenever settings are read, well before they expire. */
const LOGO_URL_TTL_SECONDS = 24 * 60 * 60;

export interface OrganizationSettingsView {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
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

  /**
   * The brand colour must be readable as text and icons on white; the app derives button text colour and a
   * dark-mode variant from it, so only one colour is stored.
   */
  async updateBranding(organizationId: string, dto: UpdateBrandingDto): Promise<OrganizationSettingsView> {
    await this.find(organizationId);
    const brandColor = dto.brandColor ? dto.brandColor.toUpperCase() : null;
    if (brandColor && contrastRatio(brandColor, '#FFFFFF') < MIN_BRAND_CONTRAST) {
      throw new BadRequestException(`${brandColor} is too light to read on white. Pick a darker shade (contrast at least ${MIN_BRAND_CONTRAST}:1).`);
    }
    const organization = await this.prisma.organization.update({ where: { id: organizationId }, data: { brandColor } });
    return this.toView(organization);
  }

  async uploadLogo(organizationId: string, file: Express.Multer.File | undefined): Promise<OrganizationSettingsView> {
    const image = readRasterImage(file, 'logo');

    const previous = await this.find(organizationId);
    const key = `organizations/${organizationId}/branding/logo-${uuidv4()}.${image.extension}`;
    await this.storage.upload(key, image.buffer, image.mimeType);
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
      brandColor: organization.brandColor,
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
