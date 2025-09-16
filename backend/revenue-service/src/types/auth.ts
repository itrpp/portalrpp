// ========================================
// AUTHENTICATION INTERFACES
// ========================================

import { Request } from 'express';

// ========================================
// AUTHENTICATED REQUEST
// ========================================

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionToken?: string;
}
