/**
 * GitHub REST API: token handling, load/save data.json, SHA conflict detection.
 * Token stays in module scope; never exposed on window or logged.
 */

import {
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  SESSION_CONNECTION_KEY,
  SESSION_TOKEN_KEY,
} from "./config.js";
import { decodeBase64ToUnicode, encodeUnicodeToBase64 } from "./cryptoUtils.js";
import { validateDataStructure } from "./validation.js";

/** @type {string|null} */
let accessToken = null;

/** @type {{ owner: string, repository: string, branch: string, filePath: string }|null} */
let connection = null;

/** @type {string|null} */
let loadedFileSha = null;

export function getConnection() {
  return connection ? { ...connection } : null;
}

export function getLoadedFileSha() {
  return loadedFileSha;
}

export function isConnected() {
  return Boolean(accessToken && connection);
}

function authHeaders() {
  if (!accessToken) {
    throw new Error("Not connected.");
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

function contentsUrl(owner, repo, path, branch) {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const base = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
  return branch ? `${base}?ref=${encodeURIComponent(branch)}` : base;
}

/**
 * Map GitHub / network errors to user-friendly messages (never include token).
 */
export function mapGithubError(error, response = null, body = null) {
  if (!navigator.onLine || error?.name === "TypeError") {
    return "No internet connection. Check your network and try again.";
  }

  const status = response?.status;
  const message = (body?.message || "").toLowerCase();

  if (status === 401) {
    return "The token is invalid or expired.";
  }
  if (status === 403) {
    if (message.includes("rate limit")) {
      return "GitHub API rate limit reached. Try again later.";
    }
    return "Missing repository permission. Check that the token can read and write Contents.";
  }
  if (status === 404) {
    if (message.includes("not found") || !body) {
      return "The repository or JSON file could not be found.";
    }
    return "The JSON file could not be found.";
  }
  if (status === 409 || status === 422) {
    if (message.includes("sha") || message.includes("is at")) {
      return "Another device changed the database. Reload it before saving.";
    }
    return "The save was rejected by GitHub. Reload and try again.";
  }
  if (status === 429) {
    return "GitHub API rate limit reached. Try again later.";
  }

  return "Something went wrong talking to GitHub. Please try again.";
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Store token in memory; optionally sessionStorage when remember is true.
 */
export function setCredentials({ owner, repository, branch, filePath, token, remember }) {
  const trimmedToken = String(token || "").trim();
  if (!trimmedToken) {
    throw new Error("Access token is required.");
  }

  connection = {
    owner: String(owner || "").trim(),
    repository: String(repository || "").trim(),
    branch: String(branch || "main").trim() || "main",
    filePath: String(filePath || "data.json").trim() || "data.json",
  };
  accessToken = trimmedToken;

  if (remember) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, trimmedToken);
    sessionStorage.setItem(SESSION_CONNECTION_KEY, JSON.stringify(connection));
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_CONNECTION_KEY);
  }
}

/** Clear token from memory and sessionStorage. */
export function disconnect() {
  accessToken = null;
  connection = null;
  loadedFileSha = null;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_CONNECTION_KEY);
}

/** Restore session credentials if present. Does not load data. */
export function restoreSessionCredentials() {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  const raw = sessionStorage.getItem(SESSION_CONNECTION_KEY);
  if (!token || !raw) return null;
  try {
    const saved = JSON.parse(raw);
    connection = {
      owner: saved.owner,
      repository: saved.repository,
      branch: saved.branch || "main",
      filePath: saved.filePath || "data.json",
    };
    accessToken = token;
    return getConnection();
  } catch {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_CONNECTION_KEY);
    return null;
  }
}

/**
 * Verify repository access (lightweight contents GET or repo GET).
 */
export async function testConnection() {
  if (!connection || !accessToken) {
    return { ok: false, message: "Enter connection details and a token first." };
  }

  const { owner, repository, branch, filePath } = connection;
  let response;
  try {
    response = await fetch(contentsUrl(owner, repository, filePath, branch), {
      headers: authHeaders(),
    });
  } catch (error) {
    return { ok: false, message: mapGithubError(error) };
  }

  if (response.ok) {
    return { ok: true, message: "Connection successful. The JSON file is reachable." };
  }

  // File missing but repo may exist — try repo endpoint
  if (response.status === 404) {
    let repoResponse;
    try {
      repoResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
        { headers: authHeaders() }
      );
    } catch (error) {
      return { ok: false, message: mapGithubError(error) };
    }

    if (repoResponse.ok) {
      return {
        ok: false,
        message: "Repository found, but the JSON file could not be found. Check the file path and branch.",
      };
    }
    const body = await parseJsonSafe(repoResponse);
    return { ok: false, message: mapGithubError(null, repoResponse, body) };
  }

  const body = await parseJsonSafe(response);
  const message = mapGithubError(null, response, body);
  if (response.status === 401 || response.status === 403) {
    disconnect();
  }
  return { ok: false, message };
}

/**
 * Load and parse data.json. Sets loadedFileSha on success.
 */
export async function loadDataFile() {
  if (!connection || !accessToken) {
    return { ok: false, message: "Not connected." };
  }

  const { owner, repository, branch, filePath } = connection;
  let response;
  try {
    response = await fetch(contentsUrl(owner, repository, filePath, branch), {
      headers: authHeaders(),
    });
  } catch (error) {
    return { ok: false, message: mapGithubError(error) };
  }

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    const message = mapGithubError(null, response, body);
    if (response.status === 401) {
      disconnect();
    }
    if (response.status === 404) {
      return { ok: false, message: "The JSON file could not be found." };
    }
    return { ok: false, message };
  }

  if (!body?.content || !body?.sha) {
    return { ok: false, message: "Unexpected response from GitHub." };
  }

  let jsonText;
  try {
    jsonText = decodeBase64ToUnicode(body.content);
  } catch {
    return { ok: false, message: "Could not decode the JSON file content." };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, message: "The file is not valid JSON." };
  }

  const validation = validateDataStructure(parsed);
  if (!validation.valid) {
    return {
      ok: false,
      message: `Invalid JSON structure: ${validation.error}`,
    };
  }

  loadedFileSha = body.sha;
  return { ok: true, data: validation.data, sha: body.sha };
}

/**
 * Fetch current remote SHA without replacing working data.
 */
export async function fetchRemoteSha() {
  if (!connection || !accessToken) {
    return { ok: false, message: "Not connected." };
  }

  const { owner, repository, branch, filePath } = connection;
  let response;
  try {
    response = await fetch(contentsUrl(owner, repository, filePath, branch), {
      headers: authHeaders(),
    });
  } catch (error) {
    return { ok: false, message: mapGithubError(error) };
  }

  const body = await parseJsonSafe(response);
  if (!response.ok) {
    return { ok: false, message: mapGithubError(null, response, body) };
  }
  return { ok: true, sha: body.sha };
}

/**
 * Save working data to GitHub after SHA check.
 * @param {object} data - full data.json object
 * @returns {{ ok: true, sha: string } | { ok: false, conflict?: boolean, message: string }}
 */
export async function saveDataFile(data) {
  if (!connection || !accessToken) {
    return { ok: false, message: "Not connected." };
  }
  if (!navigator.onLine) {
    return { ok: false, message: "You are offline. Saving to GitHub is disabled until you reconnect." };
  }

  const remote = await fetchRemoteSha();
  if (!remote.ok) {
    return { ok: false, message: remote.message };
  }

  if (loadedFileSha && remote.sha !== loadedFileSha) {
    return {
      ok: false,
      conflict: true,
      message: "The database was changed on another device. Reload the latest version before saving.",
    };
  }

  const { owner, repository, branch, filePath } = connection;
  const jsonText = `${JSON.stringify(data, null, 2)}\n`;
  const content = encodeUnicodeToBase64(jsonText);

  let response;
  try {
    response = await fetch(contentsUrl(owner, repository, filePath), {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update dance class enrollments",
        content,
        sha: remote.sha,
        branch,
      }),
    });
  } catch (error) {
    return { ok: false, message: mapGithubError(error) };
  }

  const body = await parseJsonSafe(response);
  if (!response.ok) {
    const message = mapGithubError(null, response, body);
    const conflict =
      response.status === 409 ||
      response.status === 422 ||
      message.includes("another device");
    if (response.status === 401) {
      disconnect();
    }
    return { ok: false, conflict, message };
  }

  const newSha = body?.content?.sha || body?.commit?.sha;
  if (newSha) {
    loadedFileSha = newSha;
  } else {
    // Fall back: re-read would be ideal; use remote sha if content sha missing
    loadedFileSha = remote.sha;
  }

  return { ok: true, sha: loadedFileSha };
}

export function clearLoadedSha() {
  loadedFileSha = null;
}
