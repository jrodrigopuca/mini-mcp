/**
 * @fileoverview list_tables MCP Tool Implementation
 * @module tools/list-tables
 * @description Lists all currently loaded tables and their metadata.
 * Provides a quick overview of available data for querying.
 *
 * @todo Implement in Phase 5
 */

/**
 * Result from the list_tables tool.
 *
 * @interface ListTablesResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {Object[]} tables - Array of table information
 * @property {string} tables[].name - Table name
 * @property {number} tables[].rowCount - Number of rows
 * @property {number} tables[].columnCount - Number of columns
 * @property {string} tables[].loadedAt - ISO timestamp when loaded
 * @property {string} message - Human-readable summary
 */
export interface ListTablesResult {
	success: boolean;
	tables: Array<{
		name: string;
		rowCount: number;
		columnCount: number;
		loadedAt: string;
	}>;
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
 *
 * @todo Implement in Phase 5
 */
export async function listTables(): Promise<ListTablesResult> {
	// TODO: Implement
	// 1. Get tables from store
	// 2. Format output
	throw new Error("Not implemented yet - Phase 5");
}
