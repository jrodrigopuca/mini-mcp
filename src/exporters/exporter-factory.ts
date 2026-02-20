/**
 * @fileoverview Exporter Factory
 * @module exporters/exporter-factory
 * @description Factory function for selecting the appropriate exporter
 * based on the requested output format.
 */

import type { ExportFormat, QueryResult } from "../types/index.js";
import { exportToCSV } from "./csv-exporter.js";
import { exportToJSON } from "./json-exporter.js";
import { exportToJSONL } from "./jsonl-exporter.js";
import { exportToMarkdown } from "./markdown-exporter.js";

/**
 * Exports data in the specified format.
 * Routes to the appropriate exporter based on format parameter.
 *
 * @param {QueryResult} result - Query result to export
 * @param {ExportFormat} format - Target format ('csv', 'json', 'markdown')
 * @returns {string} Formatted string in the requested format
 * @throws {Error} If format is not recognized
 *
 * @example
 * const data = { columns: ['a'], rows: [[1]], rowCount: 1, truncated: false };
 * const csv = exportData(data, 'csv');      // "a\n1"
 * const json = exportData(data, 'json');    // '[{"a": 1}]'
 * const md = exportData(data, 'markdown');  // "| a |\n| --- |\n| 1 |\n_1 row_"
 */
export function exportData(result: QueryResult, format: ExportFormat): string {
	switch (format) {
		case "csv":
			return exportToCSV(result);
		case "json":
			return exportToJSON(result);
		case "jsonl":
			return exportToJSONL(result);
		case "markdown":
			return exportToMarkdown(result);
		default:
			throw new Error(`Unknown export format: ${format}`);
	}
}

/**
 * Gets list of supported export formats.
 *
 * @returns {ExportFormat[]} Array of supported format names
 */
export function getSupportedExportFormats(): ExportFormat[] {
	return ["csv", "json", "jsonl", "markdown"];
}
