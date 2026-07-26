const REQUIRED_KEYS = [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "MERGE_AGENT_HANDLER_KEY",
  "MERGE_TOOL_PACK_ID",
  "MERGE_USER_ID_SECRET",
] as const;

const ALLOWED_CALENDAR_TOOLS = new Set([
  "list_events",
  "google-calendar__list_events",
  "google_calendar__list_events",
]);

type Env = Record<string, string | undefined>;

export interface MergeDemoConfig {
  authSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  agentHandlerKey: string;
  toolPackId: string;
  userIdSecret: string;
  agentHandlerBaseUrl: string;
  calendarToolName?: string;
}

export class MergeDemoConfigurationError extends Error {
  constructor(message = "Merge demo is not configured") {
    super(message);
    this.name = "MergeDemoConfigurationError";
  }
}

function hasRequiredConfig(env: Env): boolean {
  return REQUIRED_KEYS.every((key) => Boolean(env[key]?.trim()));
}

export function isMergeDemoConfigured(env: Env = process.env): boolean {
  try {
    getMergeDemoConfig(env);
    return true;
  } catch {
    return false;
  }
}

export function getMergeDemoConfig(
  env: Env = process.env
): MergeDemoConfig {
  if (!hasRequiredConfig(env)) {
    throw new MergeDemoConfigurationError();
  }

  const authSecret = env.AUTH_SECRET!.trim();
  const userIdSecret = env.MERGE_USER_ID_SECRET!.trim();
  if (authSecret.length < 32 || userIdSecret.length < 32) {
    throw new MergeDemoConfigurationError(
      "AUTH_SECRET and MERGE_USER_ID_SECRET must be at least 32 characters"
    );
  }

  const rawBase =
    env.MERGE_AGENT_HANDLER_BASE_URL?.trim() || "https://ah-api.merge.dev";
  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBase);
  } catch {
    throw new MergeDemoConfigurationError(
      "Merge Agent Handler base URL must be a valid HTTPS URL"
    );
  }
  if (baseUrl.protocol !== "https:") {
    throw new MergeDemoConfigurationError(
      "Merge Agent Handler base URL must use HTTPS"
    );
  }
  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "");
  baseUrl.search = "";
  baseUrl.hash = "";

  const calendarToolName = env.MERGE_CALENDAR_TOOL_NAME?.trim() || undefined;
  if (
    calendarToolName &&
    !ALLOWED_CALENDAR_TOOLS.has(calendarToolName)
  ) {
    throw new MergeDemoConfigurationError(
      "Calendar tool override is not allow-listed"
    );
  }

  const publicOrigin = env.NEXTAUTH_URL?.trim();
  if (publicOrigin) {
    let parsedPublicOrigin: URL;
    try {
      parsedPublicOrigin = new URL(publicOrigin);
    } catch {
      throw new MergeDemoConfigurationError(
        "NEXTAUTH_URL must be a valid public origin"
      );
    }
    if (
      (parsedPublicOrigin.protocol !== "https:" &&
        !(
          parsedPublicOrigin.protocol === "http:" &&
          parsedPublicOrigin.hostname === "localhost"
        )) ||
      parsedPublicOrigin.username ||
      parsedPublicOrigin.password ||
      parsedPublicOrigin.pathname !== "/" ||
      parsedPublicOrigin.search ||
      parsedPublicOrigin.hash
    ) {
      throw new MergeDemoConfigurationError(
        "NEXTAUTH_URL must be an HTTPS origin (or localhost for development)"
      );
    }
  }

  return {
    authSecret,
    googleClientId: env.AUTH_GOOGLE_ID!.trim(),
    googleClientSecret: env.AUTH_GOOGLE_SECRET!.trim(),
    agentHandlerKey: env.MERGE_AGENT_HANDLER_KEY!.trim(),
    toolPackId: env.MERGE_TOOL_PACK_ID!.trim(),
    userIdSecret,
    agentHandlerBaseUrl: baseUrl.toString().replace(/\/$/, ""),
    calendarToolName,
  };
}

export function isAllowedCalendarTool(name: string): boolean {
  return ALLOWED_CALENDAR_TOOLS.has(name);
}
