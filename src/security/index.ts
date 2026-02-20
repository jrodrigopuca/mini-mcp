/**
 * @fileoverview Security Module
 * @module security
 * @description Exports security validation utilities.
 * Handles path validation, query sanitization, and security checks.
 *
 * Security Levels:
 * - 🔴 HARDCODED: Cannot be overridden (see constants.ts)
 * - 🟡 CONFIGURABLE: Adjustable via config (readOnly, allowedPaths)
 * - 🟢 FLEXIBLE: User-controllable limits
 *
 * @example
 * import { validateFilePath, validateQuery } from './security/index.js';
 *
 * const pathResult = validateFilePath('./data/file.csv');
 * if (!pathResult.allowed) {
 *   throw new Error(pathResult.reason);
 * }
 */

export * from "./validator.js";
export * from "./constants.js";
export * from "./path-validator.js";
