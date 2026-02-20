/**
 * @fileoverview File Writer for Exporters
 * @module exporters/file-writer
 * @description Handles writing exported data to files while respecting
 * security configuration (readOnly mode).
 */

import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { getConfig } from "../config/loader.js";
import { validatePath } from "../security/path-validator.js";

/**
 * Result of a file export operation.
 *
 * @interface ExportResult
 * @property {string} outputPath - Path where file was written
 * @property {number} rowCount - Number of rows exported
 * @property {number} byteSize - File size in bytes
 */
export interface ExportResult {
	outputPath: string;
	rowCount: number;
	byteSize: number;
}

/**
 * Writes content to a file, respecting security configuration.
 *
 * @param {string} content - Content to write
 * @param {string} outputPath - Target file path
 * @param {number} rowCount - Number of rows in the data
 * @returns {Promise<ExportResult>} Export result with file info
 * @throws {Error} If readOnly mode is enabled or path is not allowed
 *
 * @example
 * const result = await writeExport(csvContent, '/data/output.csv', 100);
 * console.log(`Wrote ${result.byteSize} bytes to ${result.outputPath}`);
 */
export async function writeExport(
	content: string,
	outputPath: string,
	rowCount: number,
): Promise<ExportResult> {
	const config = getConfig();

	// Check if writes are allowed
	if (config.security.readOnly) {
		throw new Error(
			"Cannot write files: readOnly mode is enabled. Use serialize() to get data as string instead.",
		);
	}

	// Validate the output path is in allowed directories
	const pathCheck = validatePath(outputPath);
	if (!pathCheck.allowed) {
		throw new Error(`Cannot write to path: ${pathCheck.reason}`);
	}

	// Ensure directory exists
	const dir = dirname(outputPath);
	await mkdir(dir, { recursive: true });

	// Write the file
	const buffer = Buffer.from(content, "utf-8");
	await writeFile(outputPath, buffer);

	return {
		outputPath,
		rowCount,
		byteSize: buffer.byteLength,
	};
}

/**
 * Checks if file exports are currently allowed.
 *
 * @returns {boolean} True if file writing is permitted
 */
export function canWriteFiles(): boolean {
	const config = getConfig();
	return !config.security.readOnly;
}
