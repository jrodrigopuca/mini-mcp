/**
 * @fileoverview Path validation for write operations
 * @module security/path-validator
 * @description Validates output file paths against security rules.
 * Used by file-writer to ensure exports go to safe locations.
 */

import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { getConfig } from "../config/loader.js";
import { BLOCKED_PATH_PATTERNS } from "./constants.js";
import type { SecurityCheckResult } from "../types/index.js";

/**
 * Validates an output path for writing exported data.
 * Ensures the path is safe and within allowed directories.
 *
 * Checks:
 * 1. Path doesn't match dangerous patterns
 * 2. Path is within allowed directories
 * 3. Parent directory exists
 *
 * @param {string} outputPath - Path where data will be written
 * @returns {SecurityCheckResult} Result indicating if path is allowed
 *
 * @example
 * const result = validatePath('./exports/report.csv');
 * if (!result.allowed) {
 *   throw new Error(result.reason);
 * }
 */
export function validatePath(outputPath: string): SecurityCheckResult {
	const config = getConfig();
	const absolutePath = resolve(outputPath);

	// Check for dangerous path patterns
	for (const pattern of BLOCKED_PATH_PATTERNS) {
		if (pattern.test(outputPath) || pattern.test(absolutePath)) {
			return {
				allowed: false,
				reason: `Output path blocked by security rules: matches forbidden pattern`,
			};
		}
	}

	// Check if path is within allowed directories
	const isInAllowedPath = config.security.allowedPaths.some((allowedPath) => {
		const resolvedAllowed = resolve(allowedPath);
		return absolutePath.startsWith(resolvedAllowed);
	});

	if (!isInAllowedPath) {
		return {
			allowed: false,
			reason: `Output path '${outputPath}' is not within allowed paths: ${config.security.allowedPaths.join(", ")}`,
		};
	}

	// Check if parent directory exists
	const parentDir = dirname(absolutePath);
	if (!existsSync(parentDir)) {
		return {
			allowed: false,
			reason: `Parent directory does not exist: ${parentDir}`,
		};
	}

	return { allowed: true };
}
