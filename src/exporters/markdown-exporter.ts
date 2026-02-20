/**
 * @fileoverview Markdown Table Exporter
 * @module exporters/markdown-exporter
 * @description Exports query results to GitHub-Flavored Markdown tables.
 * Includes row count footer and truncation notices.
 *
 * @todo Implement in Phase 6
 */

import type { QueryResult } from "../types/index.js";

/**
 * Exports query results to Markdown table format.
 * Creates a GFM-compatible table with header, separator, and data rows.
 *
 * @param {QueryResult} result - Query result to export
 * @returns {string} Markdown formatted table with footer
 *
 * @example
 * const md = exportToMarkdown({
 *   columns: ['name', 'age'],
 *   rows: [['Alice', 30], ['Bob', 25]],
 *   rowCount: 2,
 *   truncated: false
 * });
 * // Output:
 * // | name | age |
 * // | --- | --- |
 * // | Alice | 30 |
 * // | Bob | 25 |
 * // _2 rows_
 */
export function exportToMarkdown(result: QueryResult): string {
	const { columns, rows, rowCount, truncated } = result;

	if (columns.length === 0) {
		return "_No data_";
	}

	// Header
	const header = `| ${columns.join(" | ")} |`;
	const separator = `| ${columns.map(() => "---").join(" | ")} |`;

	// Rows
	const dataRows = rows.map(
		(row) => `| ${row.map((cell) => formatCell(cell)).join(" | ")} |`,
	);

	const table = [header, separator, ...dataRows].join("\n");

	// Footer with row count
	const footer = truncated
		? `\n_Showing ${rows.length} of ${rowCount} rows (truncated)_`
		: `\n_${rowCount} row${rowCount !== 1 ? "s" : ""}_`;

	return table + footer;
}

/**
 * Formats a cell value for Markdown table display.
 * Handles null values and escapes special characters.
 *
 * @param {unknown} value - Cell value to format
 * @returns {string} Formatted cell value safe for Markdown
 */
function formatCell(value: unknown): string {
	if (value === null || value === undefined) {
		return "_null_";
	}
	const str = String(value);
	// Escape pipe characters in markdown
	return str.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
