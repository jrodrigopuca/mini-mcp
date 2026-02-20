/**
 * @fileoverview CSV Exporter
 * @module exporters/csv-exporter
 * @description Exports query results to CSV format with proper escaping.
 * Follows RFC 4180 for CSV formatting.
 *
 * @todo Implement in Phase 6
 */

import type { QueryResult } from "../types/index.js";

/**
 * Exports query results to CSV format.
 * Handles proper escaping of commas, quotes, and newlines.
 *
 * @param {QueryResult} result - Query result to export
 * @returns {string} CSV formatted string with header row and data rows
 *
 * @example
 * const csv = exportToCSV({
 *   columns: ['name', 'city'],
 *   rows: [['Alice', 'New York'], ['Bob', 'Los Angeles']],
 *   rowCount: 2,
 *   truncated: false
 * });
 * // Output:
 * // name,city
 * // Alice,New York
 * // Bob,Los Angeles
 */
export function exportToCSV(result: QueryResult): string {
	const { columns, rows } = result;

	// Header
	const header = columns.map(escapeCSV).join(",");

	// Rows
	const dataRows = rows.map((row) => row.map((cell) => escapeCSV(String(cell ?? ""))).join(","));

	return [header, ...dataRows].join("\n");
}

/**
 * Escapes a value for CSV format per RFC 4180.
 * Wraps in quotes and escapes internal quotes if needed.
 *
 * @param {string} value - Value to escape
 * @returns {string} Escaped value safe for CSV
 */
function escapeCSV(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
