declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: {
        userId: string;
        email: string;
        type: string;
      };
    }
  }
}

export {};
