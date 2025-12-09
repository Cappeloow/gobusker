import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        user_metadata?: {
          name?: string;
          [key: string]: any;
        };
      };
    }
  }
}

export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata
    };

    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        };
      }
    }

    next();
  } catch (err) {
    console.error('Optional auth error:', err);
    next();
  }
}
