import { ConfigService } from '@nestjs/config';

/** Platform super admins, by email, from PLATFORM_ADMIN_EMAILS (comma separated). Never granted from inside the app. */
export function platformAdminEmails(config: ConfigService): string[] {
  return (config.get<string>('PLATFORM_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(config: ConfigService, email: string | undefined): boolean {
  return !!email && platformAdminEmails(config).includes(email.toLowerCase());
}
