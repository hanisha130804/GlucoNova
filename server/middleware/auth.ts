import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'gluconova-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    isApproved: boolean;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole; isApproved: boolean };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin' && !req.user.isApproved) {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
}

export function approvalMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Allow admins regardless of approval status
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // TEMPORARY FIX: Allow skip-auth users for testing
  // This allows users who clicked "Skip for now" to upload medical reports during onboarding
  const skipAuthBypass = req.user.userId && req.user.userId.toString().startsWith('skip-auth');
  if (skipAuthBypass) {
    console.log('⚠️ APPROVAL BYPASS: Skip-auth user allowed for onboarding', req.user.userId);
    next();
    return;
  }

  // Check approval status for non-admin users
  if (!req.user.isApproved) {
    console.log('❌ APPROVAL DENIED:', {
      userId: req.user.userId,
      role: req.user.role,
      isApproved: req.user.isApproved
    });
    return res.status(403).json({ 
      message: 'Account pending approval',
      details: 'Your account needs to be approved by an administrator before you can upload files. Please contact support.'
    });
  }

  next();
}

// Optional auth middleware - allows unauthenticated requests but validates token if provided
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole; isApproved: boolean };
        req.user = decoded;
      } catch (error) {
        // Token invalid, but that's okay for optional auth
        console.log('Invalid token in optional auth middleware:', error);
      }
    }
    // Generate a temporary user ID for unauthenticated requests
    if (!req.user) {
      req.user = {
        userId: `skip-auth-${Date.now()}`,
        role: 'patient',
        isApproved: true,
      };
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication error' });
  }
}

// Optional approval middleware - allows access even if not approved (for skip-auth mode)
export function optionalApprovalMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Always allow access - authentication and approval are optional
  next();
}

export const authWithApproval = [authMiddleware, approvalMiddleware];
export const optionalAuthWithApproval = [optionalAuthMiddleware, optionalApprovalMiddleware];

export function generateToken(userId: string, role: UserRole, isApproved: boolean): string {
  return jwt.sign(
    { userId, role, isApproved },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
