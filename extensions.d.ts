declare module 'express-jwt' {
  interface AuthInfo {
    userID?: string;
    lastActive?: string;
    sessionInfo?: {
      device?: string;
      ip?: string;
    };
    signedIn?: string;
  }
}

declare global {
  namespace Express {
    export interface Request {
      session?: AuthInfo;
    }
  }
}
// to make the file a module and avoid the TypeScript error
export {};
