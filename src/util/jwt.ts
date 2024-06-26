import type { Request } from 'express';
import type { JWTHeaderParameters, JWTPayload, JWTVerifyOptions } from 'jose';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

import config from '../config';
import AppError from './app-error';

/**
 * Signs a JWT token with EdDSA algorithm, will transform the JWT into JWS.
 *
 * @param jti - Random JSON Token Identifier.
 * @param ID - A user ID.
 * @param expiration - minutes.
 * @returns Signed JWS.
 */
export const signJWS = async (jti: string, ID: string, expiration: number) => {
  const privateKey = await importPKCS8(config.JWT_PRIVATE_KEY, 'EdDSA');

  const payload: JWTPayload = {
    aud: config.JWT_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + expiration * 60,
    iat: Math.floor(Date.now() / 1000),
    iss: config.JWT_ISSUER,
    jti,
    nbf: Math.floor(Date.now() / 1000),
    sub: ID,
  };

  const headers: JWTHeaderParameters = {
    alg: 'EdDSA',
    typ: 'JWT',
  };

  return new SignJWT(payload).setProtectedHeader(headers).sign(privateKey);
};

/**
 * This function is used to verify the current token from user's cookie.
 * We will also check the supposed 'audience' and 'issuer'.
 *
 * @param token - JWT token
 * @returns A promise object that contains our JWT.
 */
export const verifyToken = async (token: string) => {
  const publicKey = await importSPKI(config.JWT_PUBLIC_KEY, 'EdDSA');

  const options: JWTVerifyOptions = {
    audience: config.JWT_AUDIENCE,
    issuer: config.JWT_ISSUER,
  };

  return jwtVerify(token, publicKey, options);
};

/**
 * Extracts a token from either Authorization header.
 * Will prioritize token from Authorization header.
 *
 * @param req - Express.js's request object.
 * @returns Extracted JWT token.
 */
export const extractJWT = (req: Request) => {
  const { authorization } = req.headers;

  if (authorization?.startsWith('Bearer ')) {
    return authorization.split(' ')[1];
  }

  return authorization;
};

/**
 * Extracts a token from a given header by parameter.
 *
 * @param req - Express.js's request object.
 * @returns Extracted JWT token.
 */
export const extractJWTFromHeader = (req: Request, header: string) => {
  const jwt = req.headers[header];

  const validateJWTInHeader = z.string();
  const validatedJWT = validateJWTInHeader.safeParse(jwt);

  if (validatedJWT.success) return validatedJWT.data;

  return undefined;
};

/**
 * Json Web Tokens Payload validator.
 *
 * @param jwtPayload - JWTPayload to validate.
 * @returns validated JWTPayload object.
 */
export const validateJWTPayload = (jwtPayload: JWTPayload) => {
  const JWTPayloadDataSchema = z.object({
    aud: z.string(),
    exp: z.number(),
    iat: z.number(),
    iss: z.string(),
    jti: z.string(),
    nbf: z.number(),
    sub: z.string(),
  });
  const validateJWTPayload = JWTPayloadDataSchema.safeParse(jwtPayload);
  if (!validateJWTPayload.success)
    throw new AppError('Invalid JWTPayload!', 401);

  return validateJWTPayload.data;
};
