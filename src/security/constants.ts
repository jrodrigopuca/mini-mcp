/**
 * @fileoverview Security constants for Mini-MCP
 * @module security/constants
 * @description Defines hardcoded security rules that CANNOT be overridden by configuration.
 * These represent the absolute security boundaries of the application.
 *
 * Security Level Legend:
 * - 🔴 HARDCODED: Cannot be changed by any configuration
 * - 🟡 CONFIGURABLE: Can be adjusted via config file (with warnings)
 * - 🟢 FLEXIBLE: User-controllable limits
 *
 * All constants in this file are 🔴 HARDCODED.
 */

// ============================================================================
// 🔴 BLOCKED SQL OPERATIONS
// ============================================================================

/**
 * SQL keywords that are ALWAYS blocked, regardless of configuration.
 * These operations could modify data or database structure.
 *
 * @constant {readonly string[]}
 * @example
 * // These will always be rejected:
 * // "DROP TABLE users"
 * // "DELETE FROM sales"
 * // "INSERT INTO logs VALUES (...)"
 */
export const BLOCKED_SQL_KEYWORDS = [
	"DROP",
	"DELETE",
	"TRUNCATE",
	"ALTER",
	"CREATE",
	"INSERT",
	"UPDATE",
	"GRANT",
	"REVOKE",
	"ATTACH",
	"DETACH",
] as const;

// ============================================================================
// 🔴 BLOCKED PATH PATTERNS
// ============================================================================

/**
 * Path patterns that are ALWAYS blocked for security reasons.
 * Prevents access to system files, credentials, and sensitive directories.
 *
 * @constant {readonly RegExp[]}
 * @example
 * // These paths will always be rejected:
 * // "../../../etc/passwd" (path traversal)
 * // "/etc/shadow" (system config)
 * // "~/.ssh/id_rsa" (SSH keys)
 */
export const BLOCKED_PATH_PATTERNS = [
	/\.\./, // Path traversal
	/^\/etc\//, // System config
	/^\/var\//, // System var
	/^\/usr\//, // System usr
	/^\/bin\//, // System bin
	/^\/sbin\//, // System sbin
	/^\/root/, // Root home
	/^~\/\./, // Hidden folders in home
	/\/\.ssh\//, // SSH keys
	/\/\.aws\//, // AWS credentials
	/\/\.env/, // Environment files
	/\/node_modules\//, // Node modules (usually unwanted)
] as const;

// ============================================================================
// 🔴 ALLOWED FILE EXTENSIONS
// ============================================================================

/**
 * File extensions that can be loaded.
 * Only data file formats are permitted.
 *
 * @constant {readonly string[]}
 */
export const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".json", ".parquet", ".txt"] as const;

// ============================================================================
// 🔴 ABSOLUTE LIMITS
// ============================================================================

/**
 * Maximum file size in MB that can NEVER be exceeded.
 * Even if config specifies a higher value, this is the absolute ceiling.
 *
 * @constant {number}
 */
export const ABSOLUTE_MAX_FILE_SIZE_MB = 1000;

/**
 * Maximum query timeout in milliseconds that can NEVER be exceeded.
 * Prevents runaway queries from blocking the system indefinitely.
 *
 * @constant {number}
 * @default 300000 (5 minutes)
 */
export const ABSOLUTE_MAX_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Maximum rows that can NEVER be exceeded in output.
 * Prevents memory exhaustion from large result sets.
 *
 * @constant {number}
 */
export const ABSOLUTE_MAX_ROWS = 100000;
