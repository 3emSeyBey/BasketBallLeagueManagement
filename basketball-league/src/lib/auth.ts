import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: number;
  role: "admin" | "team_manager";
  teamId: number | null;
};

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signSession(p: SessionPayload): Promise<string> {
  return await new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret());
  return {
    userId: payload.userId as number,
    role: payload.role as SessionPayload["role"],
    teamId: (payload.teamId as number | null) ?? null,
  };
}
