/** Non-secret defaults only. Never put a token here. */
export const DEFAULT_CONFIG = {
  owner: "YOUR_GITHUB_USERNAME",
  repository: "dance-class-data",
  branch: "main",
  filePath: "data.json",
};

/** Class types shown in the enrollment form. Add new entries here. */
export const CLASS_TYPES = ["Hip-hop", "Commercial"];

export const SESSION_TOKEN_KEY = "dc_session_token";
export const SESSION_CONNECTION_KEY = "dc_session_connection";

export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_API_BASE = "https://api.github.com";
