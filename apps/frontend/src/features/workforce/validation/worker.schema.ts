import { z } from 'zod';
import type { Worker, WorkerInput } from '@/hooks/api/use-workforce';

/** Radix Select can't hold an empty value, so "no project" uses a sentinel. */
export const UNASSIGNED_PROJECT = 'unassigned';

export const workerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the worker's full name").max(120),
    role: z.string().trim().min(2, 'Enter a role, e.g. Mason').max(80),
    trade: z.string().trim().min(1, 'Pick or type a trade').max(60),
    type: z.enum(['EMPLOYEE', 'SUBCONTRACTOR']),
    shift: z.enum(['DAY', 'NIGHT']),
    phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Use digits, spaces, +, ( ) or -'),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
    experienceYears: z.coerce
      .number({ invalid_type_error: 'Enter years of experience' })
      .int('Whole years only')
      .min(0, "Can't be negative")
      .max(60, 'Max 60 years'),
    projectId: z.string(),
    supervisor: z.string().trim().max(120),
    skills: z.string().max(500),
    ppeCompliant: z.boolean(),
    emergencyName: z.string().trim().max(120),
    emergencyPhone: z.string().trim().max(30),
    emergencyRelation: z.string().trim().max(40),
  })
  .superRefine((values, ctx) => {
    const filled = [values.emergencyName, values.emergencyPhone, values.emergencyRelation].filter(Boolean).length;
    if (filled > 0 && filled < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emergencyName'],
        message: 'Fill in name, phone and relation, or leave all three empty.',
      });
    }
  });

export type WorkerFormValues = z.infer<typeof workerSchema>;

export function toWorkerFormValues(worker?: Worker): WorkerFormValues {
  return {
    name: worker?.name ?? '',
    role: worker?.role ?? '',
    trade: worker?.trade ?? '',
    type: worker?.type ?? 'EMPLOYEE',
    shift: worker?.shift ?? 'DAY',
    phone: worker?.phone ?? '',
    email: worker?.email ?? '',
    experienceYears: worker?.experienceYears ?? 0,
    projectId: worker?.projectId ?? UNASSIGNED_PROJECT,
    supervisor: worker?.supervisor ?? '',
    skills: worker?.skills.join(', ') ?? '',
    ppeCompliant: worker?.ppeCompliant ?? true,
    emergencyName: worker?.emergencyContact?.name ?? '',
    emergencyPhone: worker?.emergencyContact?.phone ?? '',
    emergencyRelation: worker?.emergencyContact?.relation ?? '',
  };
}

export function toWorkerInput(values: WorkerFormValues): WorkerInput {
  const hasEmergencyContact = values.emergencyName !== '';
  return {
    name: values.name,
    role: values.role,
    trade: values.trade,
    type: values.type,
    shift: values.shift,
    phone: values.phone || null,
    email: values.email || null,
    experienceYears: values.experienceYears,
    supervisor: values.supervisor || null,
    projectId: values.projectId === UNASSIGNED_PROJECT ? null : values.projectId,
    skills: values.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
    ppeCompliant: values.ppeCompliant,
    emergencyContact: hasEmergencyContact
      ? { name: values.emergencyName, phone: values.emergencyPhone, relation: values.emergencyRelation }
      : null,
  };
}
