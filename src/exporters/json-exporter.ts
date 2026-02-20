/**
 * @fileoverview JSON Exporter
 * @module exporters/json-exporter
 * @description Exports query results to JSON array format.
 * Converts row-based data to an array of objects.
 *
 * @todo Implement in Phase 6
 */

import type { QueryResult } from "../types/index.js";

/**
 * Exports query results to JSON format.
 * Converts from row arrays to array of objects keyed by column name.
 *
 * @param {QueryResult} result - Query result to export
 * @returns {string} Pretty-printed JSON array of row objects
 *
 * @example
 * const json = exportToJSON({
 *   columns: ['name', 'age'],
 *   rows: [['Alice', 30], ['Bob', 25]],
 *   rowCount: 2,
 *   truncated: false
 * });
 * // Output:
 * // [
 * //   { "name": "Alice", "age": 30 },
 * //   { "name": "Bob", "age": 25 }
 * // ]
 */
export function exportToJSON(result: QueryResult): string {
	const { columns, rows } = result;

	const objects = rows.map((row) => {
		const obj: Record<string, unknown> = {};
		columns.forEach((col, i) => {
			obj[col] = row[i];
		});
		return obj;
	});

	return JSON.stringify(objects, null, 2);
}
