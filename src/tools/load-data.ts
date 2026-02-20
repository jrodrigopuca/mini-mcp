/**
 * @fileoverview load_data MCP Tool Implementation
 * @module tools/load-data
 * @description Handles loading data files into DuckDB tables.
 * Supports CSV, TSV, JSON, and JSONL formats.
 *
 * Process Flow:
 * 1. Validate file path against security rules
 * 2. Select appropriate parser based on file extension
 * 3. Parse file content
 * 4. Infer schema from data
 * 5. Create table in DuckDB
 * 6. Return metadata about loaded table
 */

import { readFileSync } from "fs";
import { basename, extname, resolve } from "path";
import { getConfig } from "../config/loader.js";
import { getParser } from "../parsers/parser-factory.js";
import { validateFilePath } from "../security/validator.js";
import { getStore } from "../store/duckdb-store.js";

/**
 * Arguments for the load_data tool.
 *
 * @interface LoadDataArgs
 * @property {string} filePath - Path to the data file to load
 * @property {string} [tableName] - Optional table name (defaults to filename)
 * @property {object} [options] - Optional parsing options
 */
export interface LoadDataArgs {
	filePath: string;
	tableName?: string;
	options?: {
		delimiter?: string;
		hasHeaders?: boolean;
	};
}

/**
 * Result from the load_data tool.
 *
 * @interface LoadDataResult
 * @property {boolean} success - Whether the load operation succeeded
 * @property {string} tableName - Name of the created table
 * @property {number} rowCount - Number of rows loaded
 * @property {string[]} columns - List of column names
 * @property {Record<string, string>} types - Column types
 * @property {string} message - Human-readable result message
 */
export interface LoadDataResult {
	success: boolean;
	tableName: string;
	rowCount: number;
	columns: string[];
	types: Record<string, string>;
	message: string;
}

/**
 * Loads a data file into a DuckDB table.
 *
 * @param {LoadDataArgs} args - Load arguments
 * @returns {Promise<LoadDataResult>} Result of the load operation
 * @throws {Error} If file validation fails or parsing errors occur
 *
 * @example
 * const result = await loadData({ filePath: './data/sales.csv' });
 * // result.tableName === 'sales'
 * // result.rowCount === 1000
 * // result.columns === ['id', 'date', 'amount']
 */
export async function loadData(args: LoadDataArgs): Promise<LoadDataResult> {
	const config = getConfig();
	const absolutePath = resolve(args.filePath);

	// 1. Validate file path
	const pathCheck = validateFilePath(absolutePath);
	if (!pathCheck.allowed) {
		throw new Error(`Security: ${pathCheck.reason}`);
	}

	// 2. Check table limit
	const store = getStore();
	const metadata = store.getTableMetadata();
	if (metadata.size >= config.limits.maxTablesLoaded) {
		throw new Error(
			`Maximum table limit reached (${config.limits.maxTablesLoaded}). Use list_tables to see loaded tables.`,
		);
	}

	// 3. Get appropriate parser
	const ext = extname(absolutePath).toLowerCase();
	const parser = getParser(ext);
	if (!parser) {
		throw new Error(`Unsupported file format: ${ext}`);
	}

	// 4. Parse file
	const content = readFileSync(absolutePath, "utf-8");
	const parseResult = await parser.parse(content);

	// 5. Generate table name
	const name = args.tableName || basename(absolutePath, ext).replace(/[^a-zA-Z0-9_]/g, "_");

	// 6. Load into DuckDB
	const tableMeta = await store.loadTable(
		name,
		parseResult.columns,
		parseResult.rows,
		absolutePath,
	);

	return {
		success: true,
		tableName: tableMeta.name,
		rowCount: tableMeta.rowCount,
		columns: parseResult.columns,
		types: parseResult.inferredTypes,
		message: `Loaded ${tableMeta.rowCount} rows into table '${tableMeta.name}' (${parseResult.columns.length} columns)`,
	};
}
