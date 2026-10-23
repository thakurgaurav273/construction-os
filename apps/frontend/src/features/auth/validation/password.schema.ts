import { z } from 'zod';

/** Matches the backend's MIN_PASSWORD_LENGTH. */
export const MIN_PASSWORD_LENGTH = 8;

const passwordRules = z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(128);

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** New people choose a name and password; people with an account confirm with their existing password. */
export const acceptInvitationSchema = (hasAccount: boolean) =>
  hasAccount
    ? z.object({ name: z.string(), password: z.string().min(1, 'Enter your password'), confirmPassword: z.string() })
    : z
      .object({
        name: z.string().trim().min(2, 'Enter your name').max(100),
        password: passwordRules,
        confirmPassword: z.string(),
      })
      .refine((values) => values.password === values.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      });

export interface AcceptInvitationValues {
  name: string;
  password: string;
  confirmPassword: string;
}
