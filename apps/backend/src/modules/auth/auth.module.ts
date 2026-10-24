import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../../database/database.module';
import { MailService } from '../../common/mail/mail.service';
import { PasswordResetService } from './password-reset.service';
import { TokenService } from './token.service';
import { InvitationAcceptanceService } from './invitation-acceptance.service';
import { InvitationsController } from './invitations.controller';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { SessionsService } from './sessions.service';
import { OrganizationSwitchService } from './organization-switch.service';

@Module({
  // Secrets are passed per call by TokenService, so access and refresh tokens never share one.
  imports: [DatabaseModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController, InvitationsController, AccountController],
  providers: [
    AuthService, TokenService, SessionsService, AccountService, PasswordResetService, InvitationAcceptanceService, OrganizationSwitchService,
    JwtStrategy, MailService,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
