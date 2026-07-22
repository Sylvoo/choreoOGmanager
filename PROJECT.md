# Project Brief: Dance Class PWA Using GitHub JSON Storage

Build a simple Progressive Web Application for managing dance class enrollments.

The application must be hosted on GitHub Pages and store its shared data inside a `data.json` file in a GitHub repository.

Do not use Supabase, Firebase, Node.js, PHP or any external backend.

## Technology stack

Use:

* HTML
* CSS
* Vanilla JavaScript
* GitHub Pages
* GitHub REST API
* Fine-grained GitHub personal access token
* JSON file as the database
* Web App Manifest and service worker for PWA installation

Avoid React and other frameworks unless they become necessary.

## Important security model

The GitHub token must never be:

* hard-coded in JavaScript;
* committed to the repository;
* stored in `data.json`;
* included in GitHub Actions;
* saved permanently in `localStorage`;
* displayed after the user enters it.

The user must manually enter the token when opening the application.

Keep the token:

* in JavaScript memory by default;
* optionally in `sessionStorage` when the user selects “Remember for this browser session”;
* never in permanent browser storage.

Provide a `Disconnect` button that removes the token from memory and `sessionStorage`.

This application is intended only for the owner or trusted administrators. It must not be treated as a secure public multi-user system.

## Recommended repository structure

Use two GitHub repositories.

### Frontend repository

Example:

```text
dance-class-app
```

Contains:

* HTML;
* CSS;
* JavaScript;
* PWA files;
* GitHub Pages deployment.

This repository may be public.

### Data repository

Example:

```text
dance-class-data
```

Contains:

```text
data.json
```

This repository should preferably be private because the JSON file contains names and email addresses.

The fine-grained access token should have access only to the data repository.

For a basic prototype, the frontend and JSON file may be in the same repository, but then the JSON data may be publicly accessible when the repository is public.

## GitHub token configuration

The application should include setup instructions for creating a fine-grained personal access token.

Required token configuration:

```text
Repository access:
Only selected repositories

Selected repository:
dance-class-data

Repository permissions:
Contents — Read and write
```

Set an expiration date for the token.

No additional repository permissions should be requested.

## GitHub connection screen

When the application starts, show a connection form.

Required fields:

* GitHub repository owner;
* repository name;
* branch name;
* path to JSON file;
* GitHub access token;
* remember token for current session checkbox.

Default values may be:

```text
Owner: YOUR_GITHUB_USERNAME
Repository: dance-class-data
Branch: main
File path: data.json
```

Buttons:

* Connect
* Test connection
* Disconnect

The token input must use:

```html
<input type="password">
```

After connecting:

1. verify access to the repository;
2. load `data.json`;
3. validate the JSON structure;
4. display the enrollment dashboard;
5. show a clear error when access fails.

## JSON structure

Use a simple flat structure:

```json
{
  "version": 1,
  "updatedAt": "2026-07-22T18:00:00.000Z",
  "enrollments": [
    {
      "id": "7c249ff9-6676-4535-b3df-dcf9826785bd",
      "personId": "hashed-person-identifier",
      "firstName": "Anna",
      "lastName": "Nowak",
      "email": "anna@example.com",
      "classType": "Hip-hop",
      "classDate": "2026-07-22",
      "paid": false,
      "createdAt": "2026-07-22T17:50:00.000Z",
      "updatedAt": "2026-07-22T17:50:00.000Z"
    }
  ]
}
```

## Identifiers

Each enrollment should have a random UUID:

```javascript
crypto.randomUUID()
```

Each person should have a deterministic `personId` calculated from:

```text
normalized first name
+
normalized last name
+
normalized email
```

Normalize values by:

* trimming spaces;
* converting them to lowercase;
* replacing repeated spaces with one space.

Example input:

```text
anna|nowak|anna@example.com
```

Create the `personId` using SHA-256 through the Web Crypto API.

Use the same `personId` when the same person is enrolled in multiple classes.

When the name or email is edited, recalculate the `personId`.

## Main application features

The application must allow the user to:

* load records from GitHub;
* add an enrollment;
* edit an enrollment;
* remove an enrollment;
* change payment status;
* search records;
* filter records;
* save changes to GitHub;
* reload the newest data from GitHub;
* export a local JSON backup.

## Add enrollment form

Fields:

* first name;
* last name;
* email;
* class type;
* class date;
* paid status.

Class type should be a dropdown with initial options:

```text
Hip-hop
Commercial
```

Make it easy to add additional class types later.

Use a date input:

```html
<input type="date">
```

Use a checkbox or switch for payment status.

Validation requirements:

* first name is required;
* last name is required;
* email is required;
* email format must be valid;
* class type is required;
* class date is required;
* unnecessary spaces must be removed;
* email must be stored in lowercase;
* duplicate enrollment must be prevented.

A duplicate enrollment means the same `personId`, class type and class date.

## Enrollment table

Display columns:

```text
Class date
Class type
First name
Last name
Email
Payment status
Actions
```

Actions:

* Edit
* Delete
* Mark as paid or unpaid

Payment status should be shown as:

* checkbox;
* toggle;
* or Paid/Unpaid badge.

Ask for confirmation before deleting an enrollment.

## Filters and search

Provide:

* search by first name;
* search by last name;
* search by email;
* filter by class type;
* filter by date;
* filter by paid status;
* filter by unpaid status;
* clear filters button.

## Dashboard statistics

Display:

* total enrollments;
* paid enrollments;
* unpaid enrollments;
* number of unique people;
* number of upcoming classes.

## Local working copy

After loading `data.json`, keep a working copy in JavaScript memory.

Adding, editing, deleting or changing payment status should:

1. modify the working copy;
2. mark the application as having unsaved changes;
3. enable the `Save changes` button;
4. not immediately create a GitHub commit.

Display an unsaved changes indicator.

Example:

```text
Unsaved changes
```

This prevents every small edit from creating a separate Git commit.

## Loading data from GitHub

Use the GitHub REST API endpoint:

```text
GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
```

Send headers similar to:

```javascript
{
  "Accept": "application/vnd.github+json",
  "Authorization": `Bearer ${token}`,
  "X-GitHub-Api-Version": "2026-03-10"
}
```

The response provides:

* Base64-encoded file content;
* current file SHA;
* file metadata.

Decode the Base64 content and parse it with:

```javascript
JSON.parse()
```

Store the returned SHA as `loadedFileSha`.

## Saving data to GitHub

Use:

```text
PUT /repos/{owner}/{repo}/contents/{path}
```

Before saving:

1. fetch the newest version of the file;
2. compare its SHA with `loadedFileSha`;
3. stop saving when the SHA has changed;
4. inform the user that another device modified the file;
5. offer to reload the newest version.

Do not overwrite remote changes silently.

The request body should contain:

```json
{
  "message": "Update dance class enrollments",
  "content": "BASE64_ENCODED_JSON",
  "sha": "CURRENT_FILE_SHA",
  "branch": "main"
}
```

After a successful save:

* update `loadedFileSha`;
* replace the working copy with the saved data;
* clear the unsaved changes state;
* show a success notification.

Every successful save will create a commit in the data repository.

## Unicode-safe Base64 conversion

The JSON may contain Polish and other non-ASCII characters.

Do not use plain:

```javascript
btoa(jsonString)
```

Create Unicode-safe helper functions using:

* `TextEncoder`;
* `TextDecoder`;
* `Uint8Array`;
* Base64 conversion.

The application must correctly preserve characters such as:

```text
ą ć ę ł ń ó ś ź ż
```

## Conflict handling

Multiple devices may load the same JSON file.

Implement optimistic concurrency using the file SHA.

When another device saves first:

* GitHub returns a new SHA;
* the local SHA becomes outdated;
* the second device must not overwrite the file automatically.

Show a message such as:

```text
The database was changed on another device. Reload the latest version before saving.
```

Provide buttons:

* Reload data
* Cancel

Do not implement automatic merging in the first version.

## Error handling

Handle at least:

* invalid token;
* expired token;
* missing repository permission;
* repository not found;
* JSON file not found;
* invalid JSON structure;
* internet connection failure;
* GitHub API rate limit;
* outdated SHA;
* unsuccessful save;
* invalid form values.

Display user-friendly messages instead of raw API responses.

Examples:

```text
The token is invalid or expired.
```

```text
The JSON file could not be found.
```

```text
Another device changed the database. Reload it before saving.
```

## JSON backup

Add an `Export backup` button.

It should download the current working data as:

```text
dance-class-backup-YYYY-MM-DD.json
```

Also add an optional `Import backup` feature.

Before importing:

* validate the file structure;
* show how many records will be imported;
* ask for confirmation;
* do not save to GitHub automatically.

## PWA requirements

Create:

* `manifest.webmanifest`;
* service worker;
* application icons;
* installable PWA configuration.

The application shell may work offline, but GitHub loading and saving require an internet connection.

When offline:

* show an offline indicator;
* disable GitHub save operations;
* preserve unsaved working data during the open session;
* do not claim that data was saved remotely.

## User interface

Suggested layout:

```text
Header
Connection status
Dashboard statistics
Add enrollment form
Search and filters
Enrollment table
Save and reload controls
Backup controls
```

Header buttons:

* Reload from GitHub
* Save changes
* Export backup
* Disconnect

Display:

* connected repository;
* current branch;
* JSON file path;
* last successful load time;
* last successful save time;
* unsaved changes status.

## Security requirements

Do not:

* include the token in URLs;
* print the token to the console;
* include it in error messages;
* send it to analytics;
* send it to any server other than GitHub;
* use third-party scripts that could read it;
* use external analytics;
* expose the token through global variables;
* place the token in generated HTML.

Prefer no external JavaScript dependencies.

Use `textContent` instead of `innerHTML` when displaying user-provided values.

Add a restrictive Content Security Policy where practical.

Clear the token when:

* the user clicks Disconnect;
* the session ends;
* authentication fails repeatedly.

## Suggested file structure

```text
dance-class-app/
├── index.html
├── styles.css
├── app.js
├── config.js
├── githubApi.js
├── dataStore.js
├── validation.js
├── cryptoUtils.js
├── exportJson.js
├── manifest.webmanifest
├── service-worker.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

### File responsibilities

#### `app.js`

* initialize application;
* handle UI events;
* manage application state;
* display records and notifications.

#### `githubApi.js`

* connect to GitHub;
* load `data.json`;
* save `data.json`;
* handle GitHub API responses;
* manage file SHA.

#### `dataStore.js`

* hold the working copy;
* add records;
* update records;
* delete records;
* calculate statistics;
* manage unsaved state.

#### `validation.js`

* validate forms;
* normalize names;
* normalize email;
* detect duplicates;
* validate imported JSON.

#### `cryptoUtils.js`

* create deterministic person IDs;
* encode Unicode JSON to Base64;
* decode Base64 to Unicode JSON.

#### `exportJson.js`

* export local backup;
* import and validate backup files.

#### `config.js`

Store only non-secret defaults:

```javascript
export const DEFAULT_CONFIG = {
  owner: "YOUR_GITHUB_USERNAME",
  repository: "dance-class-data",
  branch: "main",
  filePath: "data.json"
};
```

Never place a token in this file.

## GitHub Pages deployment

Keep the frontend repository suitable for GitHub Pages.

For the simplest deployment:

1. push the static files to the repository;
2. enable GitHub Pages in repository settings;
3. deploy from the main branch;
4. use the repository root as the publishing directory.

Make sure all file paths work when the application is hosted under:

```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

Use relative paths for scripts, styles, icons and the service worker.

## README requirements

Create setup instructions covering:

1. creating the frontend repository;
2. creating the data repository;
3. creating the initial `data.json`;
4. creating a fine-grained token;
5. selecting only the data repository;
6. assigning Contents read-and-write permission;
7. enabling GitHub Pages;
8. opening the application;
9. entering connection details;
10. loading and saving records;
11. revoking the token if it is exposed.

Include a warning that storing names and emails in a public repository makes them publicly accessible.

## Development order

Implement the project in this order:

1. Create the basic HTML layout.
2. Create the sample `data.json`.
3. Implement token and repository connection form.
4. Implement loading through the GitHub API.
5. Implement Unicode-safe Base64 decoding.
6. Display enrollments.
7. Implement adding enrollments.
8. Implement editing and deletion.
9. Implement payment-status changes.
10. Implement filters and statistics.
11. Implement unsaved changes tracking.
12. Implement SHA conflict detection.
13. Implement GitHub saving.
14. Implement local JSON backup.
15. Add responsive styling.
16. Add PWA functionality.
17. Write README setup instructions.
18. Test on desktop and mobile.

## First task for Cursor

Generate the initial working version of this application.

Start with:

1. complete project file structure;
2. initial `data.json`;
3. connection screen;
4. GitHub API loading and saving functions;
5. enrollment form;
6. enrollment table;
7. editing and deleting;
8. paid-status toggle;
9. SHA conflict detection;
10. GitHub Pages-compatible paths.

Before generating the code, briefly explain:

* the state-management approach;
* how the token will be handled;
* how `data.json` will be loaded;
* how updates will be saved;
* how concurrent changes will be detected.

Generate complete files rather than isolated code fragments.
