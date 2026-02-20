/**
 * @fileoverview JSONL (JSON Lines) Exporter
 * @module exporters/jsonl-exporter
 * @description Exports query results to JSON Lines format.
 * Each row becomes a separate JSON object on its own line.
 * Ideal for streaming and large datasets.
 *
 * @see https://jsonlines.org/
 */

import type { QueryResult } from "../types/index.js";

/**
 * Exports query results to JSONL format.
 * Each row is converted to a JSON object on a separate line.
 *
 * @param {QueryResult} result - Query result to export
 * @returns {string} JSONL formatted string (one JSON object per line)
 *
 * @example
 * const jsonl = exportToJSONL({
 *   columns: ['name', 'age'],
 *   rows: [['Alice', 30], ['Bob', 25]],
 *   rowCount: 2,
 *   truncated: false
 * });
 * // Output:
 * // {"name":"Alice","age":30}
 * // {"name":"Bob","age":25}
 */
export function exportToJSONL(result: QueryResult): string {
	const { columns, rows } = result;

	const lines = rows.map((row) => {
		const obj: Record<string, unknown> = {};
		columns.forEach((col, i) => {
			obj[col] = row[i];
		});
		return JSON.stringify(obj);
	});

	return lines.join("\n");
}
