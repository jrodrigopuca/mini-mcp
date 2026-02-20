/**
 * @fileoverview list_tables MCP Tool Implementation
 * @module tools/list-tables
 * @description Lists all currently loaded tables and their metadata.
 * Provides a quick overview of available data for querying.
 */

import { getConfig } from "../config/loader.js";
import { getStore } from "../store/duckdb-store.js";

/**
 * Result from the list_tables tool.
 *
 * @interface ListTablesResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {Object[]} tables - Array of table information
 * @property {string} tables[].name - Table name
 * @property {number} tables[].rowCount - Number of rows
 * @property {number} tables[].columnCount - Number of columns
 * @property {string[]} tables[].columns - Column names
 * @property {string} tables[].sourcePath - Original file path
 * @property {string} tables[].loadedAt - ISO timestamp when loaded
 * @property {Object} limits - Current vs max table limits
 * @property {string} message - Human-readable summary
 */
export interface ListTablesResult {
	success: boolean;
	tables: Array<{
		name: string;
		rowCount: number;
		columnCount: number;
		columns: string[];
		sourcePath: string;
		loadedAt: string;
	}>;
	limits: {
		current: number;
		max: number;
	};
	message: string;
}

/**
 * Lists all currently loaded tables.
 *
 * @returns {Promise<ListTablesResult>} List of tables with metadata
 *
 * @example
 * const result = await listTables();
 * // result.tables === [
 * //   { name: 'sales', rowCount: 1000, columnCount: 5, loadedAt: '2024-...' },
 * //   { name: 'products', rowCount: 50, columnCount: 3, loadedAt: '2024-...' }
 * // ]
 * // result.message === '2 tables loaded'
 */
export async function listTables(): Promise<ListTablesResult> {
	const store = getStore();
	const config = getConfig();
	const metadata = store.getTableMetadata();

	const tables = Array.from(metadata.values()).map((table) => ({
		name: table.name,
		rowCount: table.rowCount,
		columnCount: table.columns.length,
		columns: table.columns.map((c) => c.name),
		sourcePath: table.filePath,
		loadedAt: table.loadedAt.toISOString(),
	}));

	const current = tables.length;
	const max = config.limits.maxTablesLoaded;

	let message: string;
	if (current === 0) {
		message = "No tables loaded. Use load_data to load a file.";
	} else if (current === 1) {
		message = `1 table loaded (${max - current} slots remaining)`;
	} else {
		message = `${current} tables loaded (${max - current} slots remaining)`;
	}

	return {
		success: true,
		tables,
		limits: { current, max },
		message,
	};
}
