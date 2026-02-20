/**
 * @fileoverview Security validators for Mini-MCP
 * @module security/validator
 * @description Validates file paths and SQL queries against security rules.
 * Implements the 3-level security model:
 *
 * - 🔴 HARDCODED: Always enforced, cannot be disabled
 * - 🟡 CONFIGURABLE: Can be adjusted via config (with warnings)
 * - 🟢 FLEXIBLE: User-controllable limits
 *
 * @see {@link ./constants.ts} for hardcoded security rules
 * @see {@link ../config/schema.ts} for configurable security options
 */

import { existsSync, statSync } from "fs";
import { extname, resolve } from "path";
import { getConfig } from "../config/loader.js";
import type { SecurityCheckResult } from "../types/index.js";
import {
	ABSOLUTE_MAX_FILE_SIZE_MB,
	ALLOWED_EXTENSIONS,
	BLOCKED_PATH_PATTERNS,
	BLOCKED_SQL_KEYWORDS,
} from "./constants.js";

/**
 * Validates a file path for loading data.
 * Checks against both hardcoded rules and configurable rules.
 *
 * Validation Order:
 * 1. 🔴 Block dangerous path patterns (traversal, system dirs)
 * 2. 🔴 Check file extension is allowed
 * 3. Check file exists
 * 4. 🟡 Check path is within allowed directories
 * 5. 🟡 Check network path restrictions
 * 6. 🔴/🟡 Check file size against limits
 *
 * @param {string} filePath - Path to the file to validate
 * @returns {SecurityCheckResult} Result indicating if path is allowed
 *
 * @example
 * const result = validateFilePath('./data/sales.csv');
 * if (!result.allowed) {
 *   console.error(`Access denied: ${result.reason}`);
 * }
 */
export function validateFilePath(filePath: string): SecurityCheckResult {
	const config = getConfig();
	const absolutePath = resolve(filePath);

	// 🔴 HARDCODED: Block dangerous path patterns
	for (const pattern of BLOCKED_PATH_PATTERNS) {
		if (pattern.test(filePath) || pattern.test(absolutePath)) {
			return {
				allowed: false,
				reason: `Path blocked by security rules: matches forbidden pattern`,
			};
		}
	}

	// 🔴 HARDCODED: Check file extension
	const ext = extname(filePath).toLowerCase();
	if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
		return {
			allowed: false,
			reason: `File extension '${ext}' not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
		};
	}

	// Check if file exists
	if (!existsSync(absolutePath)) {
		return {
			allowed: false,
			reason: `File not found: ${absolutePath}`,
		};
	}

	// 🟡 CONFIGURABLE: Check allowed paths
	const isInAllowedPath = config.security.allowedPaths.some((allowedPath) => {
		const resolvedAllowed = resolve(allowedPath);
		return absolutePath.startsWith(resolvedAllowed);
	});

	if (!isInAllowedPath) {
		return {
			allowed: false,
			reason: `Path '${filePath}' is not within allowed paths: ${config.security.allowedPaths.join(", ")}`,
		};
	}

	// 🟡 CONFIGURABLE: Check network paths
	if (
		!config.security.allowNetworkPaths &&
		(filePath.startsWith("//") || filePath.startsWith("smb://") || filePath.startsWith("http"))
	) {
		return {
			allowed: false,
			reason: "Network paths are not allowed (allowNetworkPaths = false)",
			warning: "⚠️ Enable allowNetworkPaths in config to allow network access",
		};
	}

	// Check file size
	try {
		const stats = statSync(absolutePath);
		const sizeMB = stats.size / (1024 * 1024);

		// 🔴 HARDCODED: Absolute maximum
		if (sizeMB > ABSOLUTE_MAX_FILE_SIZE_MB) {
			return {
				allowed: false,
				reason: `File size (${sizeMB.toFixed(1)}MB) exceeds absolute maximum (${ABSOLUTE_MAX_FILE_SIZE_MB}MB)`,
			};
		}

		// 🟡 CONFIGURABLE: Configured maximum
		if (sizeMB > config.security.maxFileSizeMB) {
			return {
				allowed: false,
				reason: `File size (${sizeMB.toFixed(1)}MB) exceeds configured maximum (${config.security.maxFileSizeMB}MB)`,
			};
		}
	} catch {
		return {
			allowed: false,
			reason: `Cannot read file stats: ${absolutePath}`,
		};
	}

	return { allowed: true };
}

/**
 * Validates a SQL query against security rules.
 * Blocks dangerous operations based on hardcoded rules and readOnly mode.
 *
 * Validation Order:
 * 1. 🔴 Block dangerous SQL keywords (DROP, DELETE, INSERT, etc.)
 * 2. 🔴 Block COPY TO operations
 * 3. 🟡 Block export/write functions in readOnly mode
 *
 * @param {string} query - SQL query to validate
 * @returns {SecurityCheckResult} Result indicating if query is allowed
 *
 * @example
 * const result = validateQuery('SELECT * FROM sales');
 * // result.allowed === true
 *
 * const result2 = validateQuery('DROP TABLE sales');
 * // result2.allowed === false
 * // result2.reason === "SQL operation 'DROP' is not allowed"
 */
export function validateQuery(query: string): SecurityCheckResult {
	const config = getConfig();
	const upperQuery = query.toUpperCase();

	// 🔴 HARDCODED: Always block these regardless of readOnly setting
	// (since we're doing in-memory analysis, these make no sense anyway)
	for (const keyword of BLOCKED_SQL_KEYWORDS) {
		// Check for keyword as a word boundary
		const regex = new RegExp(`\\b${keyword}\\b`, "i");
		if (regex.test(query)) {
			return {
				allowed: false,
				reason: `SQL operation '${keyword}' is not allowed`,
			};
		}
	}

	// Check for suspicious patterns
	if (upperQuery.includes("COPY") && upperQuery.includes("TO")) {
		return {
			allowed: false,
			reason: "COPY TO operations are not allowed",
		};
	}

	// 🟡 CONFIGURABLE: Additional restrictions in readOnly mode
	if (config.security.readOnly) {
		// In read-only mode, we're extra cautious
		// DuckDB might have functions that write - block them
		if (upperQuery.includes("EXPORT_") || upperQuery.includes("WRITE_")) {
			return {
				allowed: false,
				reason: "Export/write functions not allowed in readOnly mode",
				warning: "⚠️ Set readOnly: false in config to enable write operations",
			};
		}
	}

	return { allowed: true };
}
