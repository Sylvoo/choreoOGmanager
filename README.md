# Choreo OG Manager

Progressive Web App for managing dance class enrollments. The UI is static HTML/CSS/JavaScript hosted on **GitHub Pages**. Shared data lives in a `data.json` file in a GitHub repository and is read/written through the **GitHub REST API**.

No Supabase, Firebase, Node backend, or PHP. No external JavaScript dependencies.

> **Warning:** Names and email addresses are stored in `data.json`. If that file is in a **public** repository, the data is publicly accessible. Prefer a **private** data repository.

---

## Architecture overview

| Piece | Purpose |
| --- | --- |
| This frontend repository | App UI, PWA shell, GitHub Pages |
| Data repository (recommended private) | Contains only `data.json` |
| Fine-grained personal access token | Contents read/write on the data repo only |

The access token is entered when you open the app. It is kept in JavaScript memory, or optionally in `sessionStorage` for the current browser session. It is never committed, never written to `data.json`, and never stored in `localStorage`.

---

## 1. Create the frontend repository

1. Create a GitHub repository for the app (for example `choreoOGmanager` or `dance-class-app`).
2. Push these static files to the `main` branch (repository root):
   - `index.html`, `styles.css`, `app.js`, modules, `manifest.webmanifest`, `service-worker.js`, `icons/`
3. Do **not** put any personal access token in the repository.

---

## 2. Create the data repository

1. Create a separate repository, preferably **private**, for example `dance-class-data`.
2. Add a `data.json` file at the repository root (you can copy the sample [`data.json`](data.json) from this project).
3. Commit and push to `main`.

Minimal empty database:

```json
{
  "version": 1,
  "updatedAt": "2026-07-22T18:00:00.000Z",
  "enrollments": []
}
```

---

## 3. Create a fine-grained personal access token

1. Open GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Generate a new token.
3. Set an **expiration** date.
4. **Repository access:** Only select repositories → choose `dance-class-data` (your data repo).
5. **Repository permissions:**
   - **Contents** — **Read and write**
6. Do not grant any other repository permissions.
7. Generate the token and copy it once. Store it in a password manager.

If this token is ever exposed, **revoke it immediately** and create a new one.

---

## 4. Enable GitHub Pages

1. Open the **frontend** repository on GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
4. Save. After a minute or two the app is available at:

```text
https://YOUR_GITHUB_USERNAME.github.io/REPOSITORY-NAME/
```

All asset paths in this project are relative, so the app works under that subpath.

---

## 5. Open the application and connect

1. Open the GitHub Pages URL.
2. On the connection screen, enter:

| Field | Example |
| --- | --- |
| Owner | `YOUR_GITHUB_USERNAME` |
| Repository | `dance-class-data` |
| Branch | `main` |
| File path | `data.json` |
| Token | your fine-grained PAT |

3. Optionally check **Remember token for this browser session**.
4. Click **Test connection** to verify access, or **Connect** to load data.

Defaults are defined in [`config.js`](config.js) (non-secret values only). Update the owner placeholder to your username if you want.

---

## 6. Daily use

- **Add / edit / delete** enrollments and toggle payment status. Changes stay in a local working copy.
- An **Unsaved changes** indicator appears until you save.
- **Save changes** writes `data.json` to GitHub (creates a commit).
- **Reload from GitHub** fetches the newest file (discards unsaved local edits after confirmation).
- **Export backup** downloads `dance-class-backup-YYYY-MM-DD.json`.
- **Import backup** validates a JSON file, asks for confirmation, and loads it into the working copy without auto-saving.
- **Disconnect** clears the token from memory and `sessionStorage`.

### Conflict handling

Before saving, the app compares the remote file SHA with the SHA from the last load. If another device saved first, you will see:

> The database was changed on another device. Reload the latest version before saving.

Reload, then re-apply your edits if needed. There is no automatic merge in this version.

---

## 7. PWA install

The app includes a web app manifest and service worker. On supported browsers you can install it to the home screen. The shell can work offline; loading and saving still require internet access to GitHub.

---

## 8. Security notes

- Enter the token manually; never hard-code it.
- Do not paste the token into issues, chat, or screenshots.
- Prefer a private data repository.
- Revoke the token if it leaks.
- This app is for the owner / trusted administrators only. It is not a secure public multi-user system.
- User-provided names and emails are rendered with `textContent` (not `innerHTML`).
- A Content Security Policy restricts scripts to `'self'` and API calls to `https://api.github.com`.

---

## Local file map

```text
index.html            UI layout
styles.css            Styling
app.js                UI events and rendering
config.js             Non-secret defaults + class types
githubApi.js          Token handling, load/save, SHA checks
dataStore.js          Working copy, CRUD, statistics
validation.js         Forms, duplicates, JSON schema
cryptoUtils.js        personId (SHA-256) + Unicode Base64
exportJson.js         Backup export/import
manifest.webmanifest  PWA manifest
service-worker.js     Offline app shell cache
icons/                PWA icons
data.json             Sample / seed for the data repository
```

### Adding class types

Edit the `CLASS_TYPES` array in [`config.js`](config.js):

```javascript
export const CLASS_TYPES = ["Hip-hop", "Commercial", "Contemporary"];
```

---

## Prototype note

For a quick prototype you may keep `data.json` in the same public frontend repository. Be aware that enrollment PII would then be public. The recommended setup remains two repositories with a private data repo and a token scoped only to that repo.
