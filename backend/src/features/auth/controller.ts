import type { Request, Response, NextFunction } from 'express';
import {
  SendPhoneSchema,
  VerifyCodeSchema,
  PasswordSchema,
  PasscodeSchema,
} from './dto.js';
import { telegramService } from './telegram-client.js';
import { dashboardAuth } from './dashboard-auth.js';
import { createSuccessEnvelope } from '../../common/index.js';

export async function sendPhoneController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = SendPhoneSchema.parse(req.body);
    const result = await telegramService.sendCode(validated.phoneNumber);
    res.status(200).json(createSuccessEnvelope(result));
  } catch (error) {
    next(error);
  }
}

export async function verifyCodeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = VerifyCodeSchema.parse(req.body);
    const result = await telegramService.verifyCode(
      validated.phoneNumber,
      validated.phoneCodeHash,
      validated.code
    );
    res.status(200).json(createSuccessEnvelope(result));
  } catch (error) {
    next(error);
  }
}

export async function verifyPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = PasswordSchema.parse(req.body);
    const account = await telegramService.verifyPassword(validated.password);
    res.status(200).json(
      createSuccessEnvelope({
        status: 'CONNECTED',
        account,
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getStatusController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (telegramService.getState() === 'DISCONNECTED') {
      await telegramService.initialize();
    }
    const status = telegramService.getState();
    const account = telegramService.getAccount();
    res.status(200).json(
      createSuccessEnvelope({
        status,
        account,
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function disconnectController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await telegramService.disconnect();
    await dashboardAuth.resetPasscode();
    res.status(200).json(
      createSuccessEnvelope({
        status: 'DISCONNECTED',
        message: 'Account disconnected successfully. Master passcode reset.',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function cancelAuthController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    telegramService.cancelAuth();
    res.status(200).json(
      createSuccessEnvelope({
        status: 'DISCONNECTED',
        message: 'Pending authorization cancelled.',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await dashboardAuth.loadPasscode();
    const token =
      (req.headers['x-dashboard-token'] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/, '') as string) ||
      null;

    const isPasscodeSet = dashboardAuth.isPasscodeSet();
    const isUnlocked = isPasscodeSet ? dashboardAuth.isUnlocked(token) : true;
    const telegramState = telegramService.getState();

    res.status(200).json(
      createSuccessEnvelope({
        isPasscodeSet,
        isUnlocked,
        telegramState,
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function setupPasscodeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = PasscodeSchema.parse(req.body);
    const token = await dashboardAuth.setupPasscode(validated.passcode);
    res.status(200).json(
      createSuccessEnvelope({
        isPasscodeSet: true,
        isUnlocked: true,
        token,
        message: 'Dashboard master passcode configured successfully.',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function unlockDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = PasscodeSchema.parse(req.body);
    const token = await dashboardAuth.verifyPasscode(validated.passcode);
    res.status(200).json(
      createSuccessEnvelope({
        isPasscodeSet: true,
        isUnlocked: true,
        token,
        message: 'Dashboard unlocked successfully.',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function dashboardLogoutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token =
      (req.headers['x-dashboard-token'] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/, '') as string) ||
      null;

    await dashboardAuth.revokeToken(token);
    res.status(200).json(
      createSuccessEnvelope({
        isUnlocked: false,
        message: 'Dashboard locked successfully. Telegram session preserved.',
      })
    );
  } catch (error) {
    next(error);
  }
}
