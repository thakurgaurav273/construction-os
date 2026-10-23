import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { PASSWORD_RESET_TTL_MINUTES } from './auth.constants';
import { AuthService, PASSWORD_HASH_ROUNDS } from './auth.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { TokenService, generateOpaqueToken, hashToken } from './token.service';
import { escapeHtml } from '../../common/utils/escape-html';

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.';

/**
 * Forgot-password by email link. The response never reveals whether an email has an account, links are
 * single-use and expire after an hour, and setting a new password signs the user out everywhere.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async requestReset(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.auth.findUserByEmail(dto.email);
    if (!user || user.status !== 'ACTIVE') return;

    const token = generateOpaqueToken();
    await this.prisma.$transaction([
      // Only the newest link works.
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await this.mail.sendEmail({
      to: user.email,
      subject: 'Reset your SitePilot password',
      html: `<p>Hi ${escapeHtml(user.name)},</p>
<p>We received a request to reset your SitePilot password. This link works once and expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`,
    });
    if (!sent) this.logger.warn(`Password reset email for user ${user.id} was not delivered.`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: { select: { id: true, name: true, status: true } } },
    });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.user.status !== 'ACTIVE') {
      throw new BadRequestException(INVALID_LINK);
    }

    const password = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    await this.prisma.$transaction(async (tx) => {
      // Claim the link first so two submissions can't both use it.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count === 0) throw new BadRequestException(INVALID_LINK);
      await tx.user.update({ where: { id: record.userId }, data: { password } });
    });
    await this.tokens.revokeAll(record.userId);
    await this.audit.recordForAllMemberships(record.userId, {
      action: 'auth.password_reset',
      actorId: record.userId,
      actorName: record.user.name,
      entityId: record.userId,
    });
  }
}
