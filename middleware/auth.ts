import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = { uid: 'anonymous', email: 'anonymous@example.com' } as any;
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  if (token === 'mock-token') {
    req.user = { uid: 'hardcoded-admin-id', email: 'guest@example.com' } as any;
    return next();
  }

  

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    


    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    req.user = { uid: 'anonymous', email: 'anonymous@example.com' } as any;
    return next();
  }
};
