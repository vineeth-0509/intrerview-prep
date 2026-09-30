import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string; // user id
}

const TOKEN_TTL = "7d";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies JwtPayload, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token: string): JwtPayload {

  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
