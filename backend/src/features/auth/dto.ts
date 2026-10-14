import { z } from 'zod';
import { AUTH_DEFAULTS } from '../../common/index.js';

export const SendPhoneSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{6,14}$/,
      'Phone number must be in valid international E.164 format (e.g. +989123456789 or +12025550123)'
    ),
});

export type SendPhoneDto = z.infer<typeof SendPhoneSchema>;

export const VerifyCodeSchema = z.object({
  phoneNumber: z.string().trim(),
  phoneCodeHash: z.string().trim().min(1, 'Phone code hash is required'),
  code: z.string().trim().min(3, 'Verification code must be at least 3 characters'),
});

export type VerifyCodeDto = z.infer<typeof VerifyCodeSchema>;

export const PasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type PasswordDto = z.infer<typeof PasswordSchema>;

export const PasscodeSchema = z.object({
  passcode: z
    .string()
    .min(
      AUTH_DEFAULTS.MIN_PASSCODE_LENGTH,
      `Passcode must be at least ${AUTH_DEFAULTS.MIN_PASSCODE_LENGTH} characters long`
    ),
});

export type PasscodeDto = z.infer<typeof PasscodeSchema>;

