/**
 * Form validation, normalization, duplicate detection, import schema checks.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, lowercase, collapse repeated spaces. */
export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Validate enrollment form fields.
 * @returns {{ valid: boolean, errors: Record<string, string>, normalized: object|null }}
 */
export function validateEnrollmentForm(raw) {
  const errors = {};
  const firstName = normalizeName(raw.firstName);
  const lastName = normalizeName(raw.lastName);
  const email = normalizeEmail(raw.email);
  const classType = String(raw.classType ?? "").trim();
  const classDate = String(raw.classDate ?? "").trim();
  const paid = Boolean(raw.paid);

  if (!firstName) errors.firstName = "First name is required.";
  if (!lastName) errors.lastName = "Last name is required.";
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!classType) errors.classType = "Class type is required.";
  if (!classDate) {
    errors.classDate = "Class date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(classDate)) {
    errors.classDate = "Use a valid date.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, normalized: null };
  }

  return {
    valid: true,
    errors: {},
    normalized: { firstName, lastName, email, classType, classDate, paid },
  };
}

/**
 * Duplicate = same personId + classType + classDate (excluding optional excludeId).
 */
export function isDuplicateEnrollment(enrollments, personId, classType, classDate, excludeId = null) {
  return enrollments.some(
    (e) =>
      e.id !== excludeId &&
      e.personId === personId &&
      e.classType === classType &&
      e.classDate === classDate
  );
}

function isEnrollmentRecord(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.personId === "string" &&
    typeof item.firstName === "string" &&
    typeof item.lastName === "string" &&
    typeof item.email === "string" &&
    typeof item.classType === "string" &&
    typeof item.classDate === "string" &&
    typeof item.paid === "boolean" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

/**
 * Validate root JSON database shape.
 * @returns {{ valid: boolean, error: string|null, data: object|null }}
 */
export function validateDataStructure(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "The JSON root must be an object.", data: null };
  }
  if (typeof data.version !== "number") {
    return { valid: false, error: "Missing or invalid version field.", data: null };
  }
  if (typeof data.updatedAt !== "string") {
    return { valid: false, error: "Missing or invalid updatedAt field.", data: null };
  }
  if (!Array.isArray(data.enrollments)) {
    return { valid: false, error: "enrollments must be an array.", data: null };
  }
  for (let i = 0; i < data.enrollments.length; i += 1) {
    if (!isEnrollmentRecord(data.enrollments[i])) {
      return {
        valid: false,
        error: `Enrollment at index ${i} has an invalid structure.`,
        data: null,
      };
    }
  }
  return { valid: true, error: null, data };
}
