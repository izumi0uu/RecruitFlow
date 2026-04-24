import { SignJWT, jwtVerify } from "jose";

import { getAuthConfig } from "@recruitflow/config";

export type SessionData = {
  user: {
    id: number;
  };
  expires: string;
};

const getSessionKey = () => {
  const { secret } = getAuthConfig();

  return new TextEncoder().encode(secret);
};

export const signSessionToken = async (payload: SessionData) => {
  const key = getSessionKey();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1 day from now")
    .sign(key);
};

export const verifySessionToken = async (input: string) => {
  const key = getSessionKey();
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });

  return payload as SessionData;
};
