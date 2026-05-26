import jwt, { type Algorithm, type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../types/db';

export interface TokenPayload {
  sub: string; // user id
  username: string;
  role: UserRole;
}

// CHỈ cho phép HS256 — chặn key-confusion attack (alg:none, alg:RS256 với public key
// được dùng làm HMAC secret). Nếu không pin algorithm, jsonwebtoken sẽ chấp nhận
// bất kỳ thuật toán nào được khai báo trong header token.
const ALGO: Algorithm = 'HS256';

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    algorithm: ALGO,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  const opts: VerifyOptions = { algorithms: [ALGO] };
  const decoded = jwt.verify(token, env.JWT_SECRET, opts);
  if (typeof decoded === 'string') {
    throw new Error('Token payload không hợp lệ');
  }
  return decoded as unknown as TokenPayload;
}
