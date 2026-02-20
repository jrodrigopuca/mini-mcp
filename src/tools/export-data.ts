/**
 * @fileoverview export_data MCP Tool Implementation
 * @module tools/export-data
 * @description Exports query results or tables to different formats.
 * Supports CSV, JSON, JSONL, and Markdown output formats.
 * Can optionally write to a file (if readOnly is false).
 *
 * Process Flow:
 * 1. Determine if source is table name or SQL query
 * 2. Execute query if needed
 * 3. Apply output limits
 * 4. Format using appropriate exporter
 * 5. Optionally write to file
 * 6. Return formatted data
 */

import { exportData, getSupportedExportFormats } from "../exporters/exporter-factory.js";
import { canWriteFiles, writeExport } from "../exporters/file-writer.js";
import { validateQuery } from "../security/validator.js";
import { getStore } from "../store/duckdb-store.js";
import type { ExportFormat } from "../types/index.js";

/**
 * Arguments for the export_data tool.
 *
 * @interface ExportDataArgs
 * @property {string} source - Table name or SQL query to export
 * @property {ExportFormat} format - Output format ('csv', 'json', 'jsonl', 'markdown')
 * @property {string} [outputPath] - Optional file path to write (requires readOnly: false)
 */
export interface ExportDataArgs {
	source: string;
	format: ExportFormat;
	outputPath?: string;
}

/**
 * Result from the export_data tool.
 *
 * @interface ExportDataResult
 * @property {boolean} success - Whether the export succeeded
 * @property {string} data - Exported data in requested format
 * @property {ExportFormat} format - The format used
 * @property {number} rowCount - Number of rows exported
 * @property {string} [outputPath] - File path if written to disk
 * @property {number} [fileSize] - File size in bytes if written
 */
export interface ExportDataResult {
	success: boolean;
	data: string;
	format: ExportFormat;
	rowCount: number;
	outputPath?: string;
	fileSize?: number;
}

/**
 * Determines if the source is a SQL query or a table name.
 */
function isSQLQuery(source: string): boolean {
	const sqlKeywords = /^\s*(SELECT|WITH)\b/i;
	return sqlKeywords.test(source.trim());
}

/**
 * Exports data to the specified format.
 *
 * @param {ExportDataArgs} args - Export arguments
 * @returns {Promise<ExportDataResult>} Exported data
 * @throws {Error} If source not found or export fails
 *
 * @example
 * // Export table as CSV
 * const result = await exportDataTool({ source: 'sales', format: 'csv' });
 *
 * // Export query result as JSON
 * const result = await exportDataTool({
 *   source: 'SELECT * FROM sales WHERE amount > 100',
 *   format: 'json'
 * });
 *
 * // Export to file
 * const result = await exportDataTool({
 *   source: 'sales',
 *   format: 'csv',
 *   outputPath: './exports/sales.csv'
 * });
 */
export async function exportDataTool(args: ExportDataArgs): Promise<ExportDataResult> {
	const { source, format, outputPath } = args;
	const store = getStore();

	// Validate format
	const supportedFormats = getSupportedExportFormats();
	if (!supportedFormats.includes(format)) {
		throw new Error(`Unsupported format '${format}'. Supported: ${supportedFormats.join(", ")}`);
	}

	// Build query
	let sql: string;
	if (isSQLQuery(source)) {
		sql = source;
	} else {
		// Assume it's a table name
		const metadata = store.getTableMetadata();
		if (!metadata.has(source)) {
			const available = Array.from(metadata.keys()).join(", ") || "none";
			throw new Error(`Table '${source}' not found. Available: ${available}`);
		}
		sql = `SELECT * FROM ${source}`;
	}

	// Validate query
	const queryCheck = validateQuery(sql);
	if (!queryCheck.allowed) {
		throw new Error(`Security: ${queryCheck.reason}`);
	}

	// Execute query
	const result = await store.executeQuery(sql);

	// Export to format
	const data = exportData(result, format);

	// Optionally write to file
	if (outputPath) {
		if (!canWriteFiles()) {
			throw new Error(
				"File export disabled (readOnly: true). Set readOnly: false in config to enable.",
			);
		}

		const writeResult = await writeExport(data, outputPath, result.rowCount);

		return {
			success: true,
			data,
			format,
			rowCount: result.rowCount,
			outputPath: writeResult.outputPath,
			fileSize: writeResult.byteSize,
		};
	}

	return {
		success: true,
		data,
		format,
		rowCount: result.rowCount,
	};
}
