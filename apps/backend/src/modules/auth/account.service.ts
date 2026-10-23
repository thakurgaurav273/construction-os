import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { PASSWORD_HASH_ROUNDS, PublicUser, toPublicUser } from './auth.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/account.dto';
import { SessionsService } from './sessions.service';

export interface PasswordChangeResult {
  /** Other devices signed out by the change. */
  endedSessions: number;
}

/** The signed-in member's own account: profile and password. Sessions live in SessionsService. */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { name: dto.name } });
    return toPublicUser(user);
  }

  /**
   * Requires the current password so an unattended, signed-in browser can't be used to take over the
   * account. Every other session is signed out; this one stays signed in.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, currentRefreshToken: string | undefined): Promise<PasswordChangeResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new NotFoundException('Account not found.');
    // 400 rather than 401: the client treats 401 as an expired session and would sign the member out.
    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Your current password is incorrect.');
    }
    if (await bcrypt.compare(dto.newPassword, user.password)) {
      throw new BadRequestException('Choose a password different from your current one.');
    }

    const password = await bcrypt.hash(dto.newPassword, PASSWORD_HASH_ROUNDS);
    // Ending the other sessions first also confirms this one is still valid before anything changes.
    const endedSessions = await this.sessions.endOthers(userId, currentRefreshToken);
    await this.prisma.user.update({ where: { id: userId }, data: { password } });
    return { endedSessions };
  }
}
