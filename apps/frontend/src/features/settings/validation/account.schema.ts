import { z } from 'zod';

/** Same minimum as the backend (MIN_PASSWORD_LENGTH). */
const MIN_PASSWORD_LENGTH = 8;

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(128),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from your current one',
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
