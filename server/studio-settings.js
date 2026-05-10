const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moltbot"];
const NEW_STATE_DIRNAME = ".openclaw";

const resolveUserPath = (input) => {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
};

const resolveDefaultHomeDir = () => {
  const home = os.homedir();
  if (home) {
    try {
      if (fs.existsSync(home)) return home;
    } catch {}
  }
  return os.tmpdir();
};

const resolveStateDir = (env = process.env) => {
  const override =
    env.OPENCLAW_STATE_DIR?.trim() ||
    env.MOLTBOT_STATE_DIR?.trim() ||
    env.CLAWDBOT_STATE_DIR?.trim();
  if (override) return resolveUserPath(override);

  const home = resolveDefaultHomeDir();
  const newDir = path.join(home, NEW_STATE_DIRNAME);
  const legacyDirs = LEGACY_STATE_DIRNAMES.map((dir) => path.join(home, dir));
  try {
    if (fs.existsSync(newDir)) return newDir;
  } catch {}
  for (const dir of legacyDirs) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {}
  }
  return newDir;
};

const resolveStudioSettingsPath = (env = process.env) => {
  return path.join(resolveStateDir(env), "claw3d", "settings.json");
};

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const DEFAULT_GATEWAY_URL = "ws://localhost:18789";
const OPENCLAW_CONFIG_FILENAME = "openclaw.json";

const isRecord = (value) => Boolean(value && typeof value === "object");

const readOpenclawGatewayDefaults = (env = process.env) => {
  try {
    const stateDir = resolveStateDir(env);
    const configPath = path.join(stateDir, OPENCLAW_CONFIG_FILENAME);
    const parsed = readJsonFile(configPath);
    if (!isRecord(parsed)) return null;
    const gateway = isRecord(parsed.gateway) ? parsed.gateway : null;
    if (!gateway) return null;
    const auth = isRecord(gateway.auth) ? gateway.auth : null;
    const token = typeof auth?.token === "string" ? auth.token.trim() : "";
    const port =
      typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
    if (!token) return null;
    const url = port ? `ws://localhost:${port}` : "";
    if (!url) return null;
    return { url, token, adapterType: "openclaw" };
  } catch {
    return null;
  }
};

const loadUpstreamGatewaySettings = (env = process.env) => {
  // ── Environment variable overrides (e.g. Railway deployment) ──────────────
  // If HERMES_API_URL and HERMES_GATEWAY_TOKEN are set, use them directly
  // without reading any local settings file. This allows Railway (and other
  // cloud deployments) to configure the upstream gateway purely via env vars.
  const envUrl = (
    env.HERMES_API_URL ||
    env.NEXT_PUBLIC_HERMES_API_URL ||
    env.API_SERVER_URL ||
    ""
  ).trim();

  const envToken = (
    env.HERMES_GATEWAY_TOKEN ||
    env.STUDIO_ACCESS_TOKEN ||
    env.GATEWAY_TOKEN ||
    ""
  ).trim();

  const envAdapterType = (env.GATEWAY_ADAPTER_TYPE || "openclaw").trim();

  if (envUrl && envToken) {
    // Normalize wss:// / https:// → ws:// / http:// for the upstream WS client.
    // The gateway-proxy connects server-side where TLS termination is handled
    // by Railway's edge, so we use ws:// internally even if the public URL
    // is wss://.
    const normalizedUrl = envUrl
      .replace(/^wss:\/\//, "wss://")   // keep wss as-is — Node's ws lib handles TLS
      .replace(/^https:\/\//, "wss://") // https → wss
      .replace(/^http:\/\//, "ws://");  // http  → ws

    // Append /gateway path if not already present
    const upstreamUrl = normalizedUrl.endsWith("/gateway")
      ? normalizedUrl
      : `${normalizedUrl}/gateway`;

    console.info(`[studio-settings] Using env-configured upstream: ${upstreamUrl}`);

    return {
      url: upstreamUrl,
      token: envToken,
      adapterType: envAdapterType,
      settingsPath: null,
    };
  }
  // ── End env var overrides ─────────────────────────────────────────────────

  const settingsPath = resolveStudioSettingsPath(env);
  const parsed = readJsonFile(settingsPath);
  const gateway = parsed && typeof parsed === "object" ? parsed.gateway : null;
  const url = typeof gateway?.url === "string" ? gateway.url.trim() : "";
  const token = typeof gateway?.token === "string" ? gateway.token.trim() : "";
  const adapterType =
    typeof gateway?.adapterType === "string" && gateway.adapterType.trim()
      ? gateway.adapterType.trim()
      : "openclaw";
  if (!token && adapterType === "openclaw") {
    const defaults = readOpenclawGatewayDefaults(env);
    if (defaults) {
      return {
        url: url || defaults.url,
        token: defaults.token,
        adapterType,
        settingsPath,
      };
    }
  }
  return {
    url: url || DEFAULT_GATEWAY_URL,
    token,
    adapterType,
    settingsPath,
  };
};

module.exports = {
  resolveStateDir,
  resolveStudioSettingsPath,
  loadUpstreamGatewaySettings,
};