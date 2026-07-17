import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const slug = this.generateSlug(dto.organizationName);

    // Ensure slug is unique
    const slugExists = await this.prisma.organization.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          status: 'ACTIVE',
        },
      });

      const newOrg = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: finalSlug,
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        },
      });

      await tx.userOrganization.create({
        data: {
          userId: newUser.id,
          organizationId: newOrg.id,
          role: 'OWNER',
        },
      });

      return { user: newUser, organization: newOrg };
    });

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: 'OWNER',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      organization,
      accessToken,
      refreshToken,
    };
  }

  async updateOrganization(organizationId: string, dto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.gstNumber !== undefined && { gstNumber: dto.gstNumber }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });

    return { success: true, organization };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive');
    }

    const defaultOrg = user.organizations[0];
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: defaultOrg?.organizationId || '',
      role: defaultOrg?.role || 'VIEWER',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { password, organizations, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      organization: defaultOrg?.organization ?? null,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      await this.prisma.$transaction([
        this.prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revoked: true },
        }),
        this.prisma.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: payload.sub,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true },
    });
    return { success: true };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  }
}
