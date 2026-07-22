/**
 * Application UI: connection, enrollments, filters, notifications, conflict modal.
 */

import { CLASS_TYPES, DEFAULT_CONFIG } from "./config.js";
import * as dataStore from "./dataStore.js";
import { exportBackup, readBackupFile } from "./exportJson.js";
import * as githubApi from "./githubApi.js";

const appState = {
  lastLoadedAt: null,
  lastSavedAt: null,
  editingId: null,
  offline: !navigator.onLine,
  /** Remembered after each successful add/edit so the next add keeps class context. */
  lastClassType: "",
  lastClassDate: "",
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function cacheElements() {
  els.offlineBanner = $("offline-banner");
  els.toast = $("toast");
  els.headerActions = $("header-actions");
  els.connectionPanel = $("connection-panel");
  els.connectionForm = $("connection-form");
  els.connectionMessage = $("connection-message");
  els.connOwner = $("conn-owner");
  els.connRepo = $("conn-repo");
  els.connBranch = $("conn-branch");
  els.connPath = $("conn-path");
  els.connToken = $("conn-token");
  els.connRemember = $("conn-remember");
  els.btnTest = $("btn-test");
  els.btnDisconnectConn = $("btn-disconnect-conn");
  els.dashboard = $("dashboard");
  els.statusRepo = $("status-repo");
  els.statusBranch = $("status-branch");
  els.statusPath = $("status-path");
  els.statusLoaded = $("status-loaded");
  els.statusSaved = $("status-saved");
  els.statusDirty = $("status-dirty");
  els.statTotal = $("stat-total");
  els.statPaid = $("stat-paid");
  els.statUnpaid = $("stat-unpaid");
  els.statPeople = $("stat-people");
  els.statUpcoming = $("stat-upcoming");
  els.enrollmentForm = $("enrollment-form");
  els.formTitle = $("form-title");
  els.enrollId = $("enroll-id");
  els.enrollFirst = $("enroll-first");
  els.enrollLast = $("enroll-last");
  els.enrollEmail = $("enroll-email");
  els.enrollType = $("enroll-type");
  els.enrollDate = $("enroll-date");
  els.enrollPaid = $("enroll-paid");
  els.enrollMessage = $("enroll-message");
  els.btnEnrollSubmit = $("btn-enroll-submit");
  els.btnEnrollCancel = $("btn-enroll-cancel");
  els.filterFirst = $("filter-first");
  els.filterLast = $("filter-last");
  els.filterEmail = $("filter-email");
  els.filterType = $("filter-type");
  els.filterDate = $("filter-date");
  els.filterPaid = $("filter-paid");
  els.btnClearFilters = $("btn-clear-filters");
  els.enrollmentsBody = $("enrollments-body");
  els.tableCount = $("table-count");
  els.tableEmpty = $("table-empty");
  els.btnReload = $("btn-reload");
  els.btnSave = $("btn-save");
  els.btnExport = $("btn-export");
  els.inputImport = $("input-import");
  els.btnDisconnect = $("btn-disconnect");
  els.conflictModal = $("conflict-modal");
  els.conflictMessage = $("conflict-message");
  els.btnConflictReload = $("btn-conflict-reload");
  els.btnConflictCancel = $("btn-conflict-cancel");
}

function formatTime(date) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

let toastTimer = null;

function showToast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden", "is-error", "is-success");
  if (type === "error") els.toast.classList.add("is-error");
  if (type === "success") els.toast.classList.add("is-success");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 4500);
}

function setConnectionMessage(message, type = "") {
  els.connectionMessage.textContent = message || "";
  els.connectionMessage.classList.remove("is-error", "is-success");
  if (type === "error") els.connectionMessage.classList.add("is-error");
  if (type === "success") els.connectionMessage.classList.add("is-success");
}

function setEnrollMessage(message, type = "") {
  els.enrollMessage.textContent = message || "";
  els.enrollMessage.classList.remove("is-error", "is-success");
  if (type === "error") els.enrollMessage.classList.add("is-error");
  if (type === "success") els.enrollMessage.classList.add("is-success");
}

function clearFieldErrors() {
  ["firstName", "lastName", "email", "classType", "classDate"].forEach((key) => {
    const el = $(`error-${key}`);
    if (el) el.textContent = "";
  });
}

function showFieldErrors(errors) {
  clearFieldErrors();
  Object.entries(errors).forEach(([key, msg]) => {
    const el = $(`error-${key}`);
    if (el) el.textContent = msg;
  });
}

function populateClassTypeSelects() {
  const fill = (select, includeAll) => {
    select.textContent = "";
    if (includeAll) {
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "All types";
      select.appendChild(all);
    }
    CLASS_TYPES.forEach((type) => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      select.appendChild(opt);
    });
  };
  fill(els.enrollType, false);
  fill(els.filterType, true);
}

function fillConnectionDefaults() {
  els.connOwner.value = DEFAULT_CONFIG.owner;
  els.connRepo.value = DEFAULT_CONFIG.repository;
  els.connBranch.value = DEFAULT_CONFIG.branch;
  els.connPath.value = DEFAULT_CONFIG.filePath;
}

function readConnectionForm() {
  return {
    owner: els.connOwner.value,
    repository: els.connRepo.value,
    branch: els.connBranch.value,
    filePath: els.connPath.value,
    token: els.connToken.value,
    remember: els.connRemember.checked,
  };
}

function updateOfflineUI() {
  appState.offline = !navigator.onLine;
  els.offlineBanner.classList.toggle("hidden", !appState.offline);
  els.btnSave.disabled = appState.offline || !dataStore.isDirty() || !githubApi.isConnected();
  els.btnReload.disabled = appState.offline || !githubApi.isConnected();
}

function updateStatusPanel() {
  const conn = githubApi.getConnection();
  if (!conn) return;
  els.statusRepo.textContent = `${conn.owner}/${conn.repository}`;
  els.statusBranch.textContent = conn.branch;
  els.statusPath.textContent = conn.filePath;
  els.statusLoaded.textContent = formatTime(appState.lastLoadedAt);
  els.statusSaved.textContent = formatTime(appState.lastSavedAt);

  if (dataStore.isDirty()) {
    els.statusDirty.textContent = "Unsaved changes";
    els.statusDirty.classList.add("status-dirty");
    els.statusDirty.classList.remove("status-clean");
  } else {
    els.statusDirty.textContent = "Saved";
    els.statusDirty.classList.add("status-clean");
    els.statusDirty.classList.remove("status-dirty");
  }

  els.btnSave.disabled = appState.offline || !dataStore.isDirty();
}

function updateStats() {
  const stats = dataStore.getStatistics();
  els.statTotal.textContent = String(stats.total);
  els.statPaid.textContent = String(stats.paid);
  els.statUnpaid.textContent = String(stats.unpaid);
  els.statPeople.textContent = String(stats.uniquePeople);
  els.statUpcoming.textContent = String(stats.upcomingClasses);
}

function getFilters() {
  return {
    searchFirst: els.filterFirst.value,
    searchLast: els.filterLast.value,
    searchEmail: els.filterEmail.value,
    classType: els.filterType.value,
    classDate: els.filterDate.value,
    paidStatus: els.filterPaid.value,
  };
}

function renderTable() {
  const rows = dataStore.filterEnrollments(getFilters());
  els.enrollmentsBody.textContent = "";
  els.tableCount.textContent = `${rows.length} shown`;
  els.tableEmpty.classList.toggle("hidden", rows.length > 0);

  rows.forEach((enrollment) => {
    const tr = document.createElement("tr");

    const cells = [
      enrollment.classDate,
      enrollment.classType,
      enrollment.firstName,
      enrollment.lastName,
      enrollment.email,
    ];
    cells.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });

    const paidTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = enrollment.paid ? "badge badge-paid" : "badge badge-unpaid";
    badge.textContent = enrollment.paid ? "Paid" : "Unpaid";
    paidTd.appendChild(badge);
    tr.appendChild(paidTd);

    const actionsTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-small btn-ghost";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(enrollment));

    const paidBtn = document.createElement("button");
    paidBtn.type = "button";
    paidBtn.className = "btn btn-small btn-ghost";
    paidBtn.textContent = enrollment.paid ? "Mark unpaid" : "Mark paid";
    paidBtn.addEventListener("click", () => togglePaid(enrollment.id, !enrollment.paid));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-small btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => confirmDelete(enrollment));

    actions.append(editBtn, paidBtn, deleteBtn);
    actionsTd.appendChild(actions);
    tr.appendChild(actionsTd);

    els.enrollmentsBody.appendChild(tr);
  });
}

function refreshDashboard() {
  updateStats();
  renderTable();
  updateStatusPanel();
  updateOfflineUI();
}

function showDashboard() {
  els.connectionPanel.classList.add("hidden");
  els.dashboard.classList.remove("hidden");
  els.headerActions.classList.remove("hidden");
  refreshDashboard();
}

function showConnectionScreen() {
  els.dashboard.classList.add("hidden");
  els.headerActions.classList.add("hidden");
  els.connectionPanel.classList.remove("hidden");
  els.connToken.value = "";
  hideConflictModal();
  resetEnrollmentForm();
}

function startEdit(enrollment) {
  appState.editingId = enrollment.id;
  els.enrollId.value = enrollment.id;
  els.enrollFirst.value = enrollment.firstName;
  els.enrollLast.value = enrollment.lastName;
  els.enrollEmail.value = enrollment.email;
  els.enrollType.value = enrollment.classType;
  els.enrollDate.value = enrollment.classDate;
  els.enrollPaid.checked = enrollment.paid;
  els.formTitle.textContent = "Edit enrollment";
  els.btnEnrollSubmit.textContent = "Save enrollment";
  els.btnEnrollCancel.classList.remove("hidden");
  clearFieldErrors();
  setEnrollMessage("");
  els.enrollmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetEnrollmentForm({ keepMessage = false } = {}) {
  appState.editingId = null;
  els.enrollmentForm.reset();
  els.enrollId.value = "";
  els.formTitle.textContent = "Add enrollment";
  els.btnEnrollSubmit.textContent = "Add enrollment";
  els.btnEnrollCancel.classList.add("hidden");
  clearFieldErrors();
  if (!keepMessage) setEnrollMessage("");

  // Keep last chosen class type and date for quick consecutive enrollments.
  if (appState.lastClassType) {
    els.enrollType.value = appState.lastClassType;
  }
  if (appState.lastClassDate) {
    els.enrollDate.value = appState.lastClassDate;
  }
}

async function togglePaid(id, paid) {
  const result = dataStore.setPaidStatus(id, paid);
  if (!result.ok) {
    showToast(result.message || "Could not update payment status.", "error");
    return;
  }
  refreshDashboard();
  showToast(paid ? "Marked as paid." : "Marked as unpaid.", "success");
}

function confirmDelete(enrollment) {
  const label = `${enrollment.firstName} ${enrollment.lastName} — ${enrollment.classType} on ${enrollment.classDate}`;
  const ok = window.confirm(`Delete this enrollment?\n\n${label}`);
  if (!ok) return;
  const result = dataStore.deleteEnrollment(enrollment.id);
  if (!result.ok) {
    showToast(result.message || "Could not delete.", "error");
    return;
  }
  if (appState.editingId === enrollment.id) {
    resetEnrollmentForm();
  }
  refreshDashboard();
  showToast("Enrollment deleted.", "success");
}

function showConflictModal(message) {
  els.conflictMessage.textContent =
    message ||
    "The database was changed on another device. Reload the latest version before saving.";
  els.conflictModal.classList.remove("hidden");
}

function hideConflictModal() {
  els.conflictModal.classList.add("hidden");
}

async function connectAndLoad(options = {}) {
  const { fromSession = false } = options;

  if (!fromSession) {
    const form = readConnectionForm();
    if (!form.owner.trim() || !form.repository.trim() || !form.token.trim()) {
      setConnectionMessage("Owner, repository, and token are required.", "error");
      return;
    }
    try {
      githubApi.setCredentials(form);
    } catch (err) {
      setConnectionMessage(err.message || "Could not store credentials.", "error");
      return;
    }
  }

  setConnectionMessage("Loading data…");
  const result = await githubApi.loadDataFile();
  if (!result.ok) {
    setConnectionMessage(result.message, "error");
    showToast(result.message, "error");
    if (!githubApi.isConnected()) {
      showConnectionScreen();
    }
    return;
  }

  dataStore.loadData(result.data);
  appState.lastLoadedAt = new Date();
  els.connToken.value = "";
  setConnectionMessage("");
  showDashboard();
  showToast("Data loaded from GitHub.", "success");
}

async function handleTestConnection() {
  try {
    githubApi.setCredentials(readConnectionForm());
  } catch (err) {
    setConnectionMessage(err.message || "Invalid connection details.", "error");
    return;
  }
  setConnectionMessage("Testing connection…");
  const result = await githubApi.testConnection();
  setConnectionMessage(result.message, result.ok ? "success" : "error");
}

function handleDisconnect() {
  githubApi.disconnect();
  dataStore.clearStore();
  appState.lastLoadedAt = null;
  appState.lastSavedAt = null;
  showConnectionScreen();
  setConnectionMessage("Disconnected. Token removed from memory and this session.", "success");
}

async function handleReload({ confirmIfDirty = true } = {}) {
  if (appState.offline) {
    showToast("You are offline. Cannot reload from GitHub.", "error");
    return;
  }
  if (confirmIfDirty && dataStore.isDirty()) {
    const ok = window.confirm(
      "You have unsaved changes. Reloading will discard them. Continue?"
    );
    if (!ok) return;
  }

  const result = await githubApi.loadDataFile();
  if (!result.ok) {
    showToast(result.message, "error");
    if (!githubApi.isConnected()) {
      handleDisconnect();
    }
    return;
  }

  dataStore.loadData(result.data);
  appState.lastLoadedAt = new Date();
  resetEnrollmentForm();
  hideConflictModal();
  refreshDashboard();
  showToast("Latest data loaded from GitHub.", "success");
}

async function handleSave() {
  if (appState.offline) {
    showToast("You are offline. Saving to GitHub is disabled.", "error");
    return;
  }
  if (!dataStore.isDirty()) {
    showToast("No changes to save.", "info");
    return;
  }

  els.btnSave.disabled = true;
  const data = dataStore.getData();
  const result = await githubApi.saveDataFile(data);

  if (!result.ok) {
    if (result.conflict) {
      showConflictModal(result.message);
    } else {
      showToast(result.message, "error");
    }
    if (!githubApi.isConnected()) {
      handleDisconnect();
      return;
    }
    updateOfflineUI();
    updateStatusPanel();
    return;
  }

  dataStore.loadData(data);
  dataStore.markClean();
  appState.lastSavedAt = new Date();
  refreshDashboard();
  showToast("Changes saved to GitHub.", "success");
}

async function handleEnrollmentSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  setEnrollMessage("");

  const formValues = {
    firstName: els.enrollFirst.value,
    lastName: els.enrollLast.value,
    email: els.enrollEmail.value,
    classType: els.enrollType.value,
    classDate: els.enrollDate.value,
    paid: els.enrollPaid.checked,
  };

  const editingId = els.enrollId.value || null;
  const result = editingId
    ? await dataStore.updateEnrollment(editingId, formValues)
    : await dataStore.addEnrollment(formValues);

  if (!result.ok) {
    if (result.errors && Object.keys(result.errors).length) {
      showFieldErrors(result.errors);
    }
    setEnrollMessage(result.message || "Please fix the form errors.", "error");
    return;
  }

  appState.lastClassType = formValues.classType;
  appState.lastClassDate = formValues.classDate;
  resetEnrollmentForm({ keepMessage: true });
  refreshDashboard();
  setEnrollMessage(editingId ? "Enrollment updated." : "Enrollment added.", "success");
}

function handleExport() {
  if (!githubApi.isConnected() && dataStore.getEnrollments().length === 0) {
    showToast("Nothing to export yet.", "error");
    return;
  }
  const filename = exportBackup(dataStore.getData());
  showToast(`Backup downloaded as ${filename}.`, "success");
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  const result = await readBackupFile(file);
  if (!result.ok) {
    showToast(result.message, "error");
    return;
  }

  const ok = window.confirm(
    `Import ${result.count} enrollment(s) into the working copy?\n\nThis will replace your current local data. Changes are not saved to GitHub until you click Save changes.`
  );
  if (!ok) return;

  dataStore.loadData(result.data, { clearDirty: false });
  dataStore.markDirty();
  resetEnrollmentForm();
  refreshDashboard();
  showToast(`Imported ${result.count} enrollment(s). Remember to save to GitHub.`, "success");
}

function bindEvents() {
  els.connectionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    connectAndLoad();
  });
  els.btnTest.addEventListener("click", handleTestConnection);
  els.btnDisconnectConn.addEventListener("click", handleDisconnect);
  els.btnDisconnect.addEventListener("click", handleDisconnect);
  els.btnReload.addEventListener("click", () => handleReload());
  els.btnSave.addEventListener("click", handleSave);
  els.btnExport.addEventListener("click", handleExport);
  els.inputImport.addEventListener("change", handleImport);
  els.enrollmentForm.addEventListener("submit", handleEnrollmentSubmit);
  els.btnEnrollCancel.addEventListener("click", resetEnrollmentForm);
  els.btnClearFilters.addEventListener("click", () => {
    els.filterFirst.value = "";
    els.filterLast.value = "";
    els.filterEmail.value = "";
    els.filterType.value = "";
    els.filterDate.value = "";
    els.filterPaid.value = "";
    renderTable();
  });

  ["filter-first", "filter-last", "filter-email", "filter-type", "filter-date", "filter-paid"].forEach(
    (id) => {
      $(id).addEventListener("input", renderTable);
      $(id).addEventListener("change", renderTable);
    }
  );

  els.btnConflictReload.addEventListener("click", () => handleReload({ confirmIfDirty: true }));
  els.btnConflictCancel.addEventListener("click", hideConflictModal);
  els.conflictModal.querySelector("[data-close-modal]")?.addEventListener("click", hideConflictModal);

  window.addEventListener("online", () => {
    updateOfflineUI();
    showToast("Back online.", "success");
  });
  window.addEventListener("offline", () => {
    updateOfflineUI();
    showToast("You are offline.", "error");
  });

  window.addEventListener("beforeunload", (e) => {
    if (dataStore.isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swUrl = new URL("./service-worker.js", window.location.href);
  navigator.serviceWorker.register(swUrl.href).catch(() => {
    /* ignore SW registration failures in file:// or restricted contexts */
  });
}

async function init() {
  cacheElements();
  populateClassTypeSelects();
  fillConnectionDefaults();
  bindEvents();
  updateOfflineUI();
  registerServiceWorker();

  const restored = githubApi.restoreSessionCredentials();
  if (restored) {
    els.connOwner.value = restored.owner;
    els.connRepo.value = restored.repository;
    els.connBranch.value = restored.branch;
    els.connPath.value = restored.filePath;
    els.connRemember.checked = true;
    setConnectionMessage("Restoring session…");
    await connectAndLoad({ fromSession: true });
  }
}

init();
