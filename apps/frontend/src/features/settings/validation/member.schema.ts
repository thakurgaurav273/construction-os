import { z } from 'zod';
import { ORG_ROLES } from '../constants';

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  role: z.enum(ORG_ROLES),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
