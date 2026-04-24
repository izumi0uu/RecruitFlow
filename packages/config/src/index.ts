import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

export const DEFAULT_API_HOST = "0.0.0.0";
export const DEFAULT_API_PORT = 4001;
export const DEFAULT_WEB_PORT = 3001;
export const SESSION_COOKIE_NAME = "session";

let envLoaded = false;
let cachedWorkspaceRoot: string | null = null;

function resolveWorkspaceRoot(startDir = process.cwd()) {
  if (cachedWorkspaceRoot) {
    return cachedWorkspaceRoot;
  }

  let currentDir = startDir;

  while (true) {
    if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
      cachedWorkspaceRoot = currentDir;
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      cachedWorkspaceRoot = startDir;
      return startDir;
    }

    currentDir = parentDir;
  }
}

function readRequiredEnv(name: string, rawValue: string | undefined) {
  const value = rawValue?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}

function readPort(name: string, rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} environment variable must be a positive integer`);
  }

  return parsedValue;
}

function readUrl(name: string, rawValue: string | undefined) {
  const value = readRequiredEnv(name, rawValue);

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} environment variable must be a valid URL`);
  }
}

function normalizeServerHost(host: string) {
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }

  return host;
}

export function loadRootEnv() {
  if (envLoaded) {
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();
  const envPath = path.join(workspaceRoot, ".env");

  dotenv.config({ path: envPath });
  envLoaded = true;
}

export function getWebRuntimeConfig(env = process.env) {
  return {
    packageName: "@recruitflow/web",
    sourceBoundary: "repo-root-next-shell",
    port: readPort("PORT", env.PORT, DEFAULT_WEB_PORT),
  } as const;
}

export function getApiRuntimeConfig(env = process.env) {
  return {
    packageName: "@recruitflow/api",
    serviceName: "RecruitFlow API",
    host: env.API_HOST?.trim() || DEFAULT_API_HOST,
    port: readPort("API_PORT", env.API_PORT, DEFAULT_API_PORT),
  } as const;
}

export function getInternalApiOrigin(env = process.env) {
  const explicitApiBaseUrl = env.API_BASE_URL?.trim();

  if (explicitApiBaseUrl) {
    return readUrl("API_BASE_URL", explicitApiBaseUrl);
  }

  const apiRuntimeConfig = getApiRuntimeConfig(env);

  return `http://${normalizeServerHost(apiRuntimeConfig.host)}:${apiRuntimeConfig.port}`;
}

export function getDatabaseConfig(env = process.env) {
  return {
    connectionString: readRequiredEnv("POSTGRES_URL", env.POSTGRES_URL),
  } as const;
}

export function getAuthConfig(env = process.env) {
  return {
    cookieName: SESSION_COOKIE_NAME,
    secret: readRequiredEnv("AUTH_SECRET", env.AUTH_SECRET),
  } as const;
}

export function getStripeConfig(env = process.env) {
  return {
    baseUrl: readUrl("BASE_URL", env.BASE_URL),
    secretKey: readRequiredEnv("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
    webhookSecret: readRequiredEnv(
      "STRIPE_WEBHOOK_SECRET",
      env.STRIPE_WEBHOOK_SECRET,
    ),
  } as const;
}
