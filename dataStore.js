/**
 * In-memory working copy of enrollments with dirty tracking and statistics.
 */

import { createPersonId } from "./cryptoUtils.js";
import {
  isDuplicateEnrollment,
  normalizeText,
  validateEnrollmentForm,
} from "./validation.js";

function emptyData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    enrollments: [],
  };
}

let workingCopy = emptyData();
let dirty = false;

function touchUpdatedAt() {
  workingCopy.updatedAt = new Date().toISOString();
}

function cloneData(data) {
  return structuredClone(data);
}

export function getData() {
  return cloneData(workingCopy);
}

export function getEnrollments() {
  return cloneData(workingCopy.enrollments);
}

export function isDirty() {
  return dirty;
}

export function markClean() {
  dirty = false;
}

export function markDirty() {
  dirty = true;
}

/** Replace working copy from loaded or imported data. Clears dirty by default. */
export function loadData(data, { clearDirty = true } = {}) {
  workingCopy = cloneData(data);
  if (clearDirty) dirty = false;
  else dirty = true;
}

export function clearStore() {
  workingCopy = emptyData();
  dirty = false;
}

/**
 * @param {object} formValues
 * @returns {Promise<{ ok: true, enrollment: object } | { ok: false, errors: object, message?: string }>}
 */
export async function addEnrollment(formValues) {
  const result = validateEnrollmentForm(formValues);
  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }

  const { firstName, lastName, email, classType, classDate, paid } = result.normalized;
  const personId = await createPersonId(
    normalizeText(firstName),
    normalizeText(lastName),
    email
  );

  if (isDuplicateEnrollment(workingCopy.enrollments, personId, classType, classDate)) {
    return {
      ok: false,
      errors: {},
      message: "This person is already enrolled in this class on this date.",
    };
  }

  const now = new Date().toISOString();
  const enrollment = {
    id: crypto.randomUUID(),
    personId,
    firstName,
    lastName,
    email,
    classType,
    classDate,
    paid,
    createdAt: now,
    updatedAt: now,
  };

  workingCopy.enrollments.push(enrollment);
  touchUpdatedAt();
  dirty = true;
  return { ok: true, enrollment: cloneData(enrollment) };
}

/**
 * @returns {Promise<{ ok: true, enrollment: object } | { ok: false, errors: object, message?: string }>}
 */
export async function updateEnrollment(id, formValues) {
  const index = workingCopy.enrollments.findIndex((e) => e.id === id);
  if (index === -1) {
    return { ok: false, errors: {}, message: "Enrollment not found." };
  }

  const result = validateEnrollmentForm(formValues);
  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }

  const { firstName, lastName, email, classType, classDate, paid } = result.normalized;
  const personId = await createPersonId(
    normalizeText(firstName),
    normalizeText(lastName),
    email
  );

  if (isDuplicateEnrollment(workingCopy.enrollments, personId, classType, classDate, id)) {
    return {
      ok: false,
      errors: {},
      message: "This person is already enrolled in this class on this date.",
    };
  }

  const existing = workingCopy.enrollments[index];
  const updated = {
    ...existing,
    personId,
    firstName,
    lastName,
    email,
    classType,
    classDate,
    paid,
    updatedAt: new Date().toISOString(),
  };

  workingCopy.enrollments[index] = updated;
  touchUpdatedAt();
  dirty = true;
  return { ok: true, enrollment: cloneData(updated) };
}

export function deleteEnrollment(id) {
  const before = workingCopy.enrollments.length;
  workingCopy.enrollments = workingCopy.enrollments.filter((e) => e.id !== id);
  if (workingCopy.enrollments.length === before) {
    return { ok: false, message: "Enrollment not found." };
  }
  touchUpdatedAt();
  dirty = true;
  return { ok: true };
}

export function setPaidStatus(id, paid) {
  const enrollment = workingCopy.enrollments.find((e) => e.id === id);
  if (!enrollment) {
    return { ok: false, message: "Enrollment not found." };
  }
  enrollment.paid = Boolean(paid);
  enrollment.updatedAt = new Date().toISOString();
  touchUpdatedAt();
  dirty = true;
  return { ok: true, enrollment: cloneData(enrollment) };
}

export function getStatistics(today = new Date()) {
  const enrollments = workingCopy.enrollments;
  const paid = enrollments.filter((e) => e.paid).length;
  const unpaid = enrollments.length - paid;
  const uniquePeople = new Set(enrollments.map((e) => e.personId)).size;

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const upcomingClasses = new Set(
    enrollments.filter((e) => e.classDate >= todayStr).map((e) => `${e.classDate}|${e.classType}`)
  ).size;

  return {
    total: enrollments.length,
    paid,
    unpaid,
    uniquePeople,
    upcomingClasses,
  };
}

/**
 * Filter enrollments by search and filter criteria.
 */
export function filterEnrollments(filters) {
  const {
    searchFirst = "",
    searchLast = "",
    searchEmail = "",
    classType = "",
    classDate = "",
    paidStatus = "",
  } = filters;

  const firstQ = searchFirst.trim().toLowerCase();
  const lastQ = searchLast.trim().toLowerCase();
  const emailQ = searchEmail.trim().toLowerCase();

  return workingCopy.enrollments
    .filter((e) => {
      if (firstQ && !e.firstName.toLowerCase().includes(firstQ)) return false;
      if (lastQ && !e.lastName.toLowerCase().includes(lastQ)) return false;
      if (emailQ && !e.email.toLowerCase().includes(emailQ)) return false;
      if (classType && e.classType !== classType) return false;
      if (classDate && e.classDate !== classDate) return false;
      if (paidStatus === "paid" && !e.paid) return false;
      if (paidStatus === "unpaid" && e.paid) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (a.classDate !== b.classDate) return a.classDate.localeCompare(b.classDate);
      return a.lastName.localeCompare(b.lastName);
    });
}
