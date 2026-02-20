/**
 * @fileoverview query_data MCP Tool Implementation
 * @module tools/query-data
 * @description Handles querying loaded data using SQL or natural language.
 * Automatically detects query type and translates NL to SQL when needed.
 *
 * Process Flow:
 * 1. Detect if query is SQL or natural language
 * 2. If NL, translate to SQL using pattern matching
 * 3. Validate SQL against security rules
 * 4. Execute query against DuckDB
 * 5. Format and truncate results
 * 6. Return formatted output
 */

import { exportData } from "../exporters/exporter-factory.js";
import { exportToMarkdown } from "../exporters/markdown-exporter.js";
import { validateQuery } from "../security/validator.js";
import { getStore } from "../store/duckdb-store.js";
import type { ExportFormat } from "../types/index.js";

/**
 * Arguments for the query_data tool.
 *
 * @interface QueryDataArgs
 * @property {string} query - SQL query or natural language question
 * @property {string} [tableName] - Target table for NL queries
 * @property {ExportFormat} [format] - Output format (default: markdown)
 */
export interface QueryDataArgs {
	query: string;
	tableName?: string;
	format?: ExportFormat;
}

/**
 * Result from the query_data tool.
 *
 * @interface QueryDataResult
 * @property {boolean} success - Whether the query succeeded
 * @property {string} data - Formatted query results
 * @property {number} rowCount - Number of rows in results
 * @property {boolean} truncated - True if results were truncated
 * @property {boolean} wasNaturalLanguage - True if input was NL
 * @property {string} [executedSQL] - The actual SQL that was executed
 */
export interface QueryDataResult {
	success: boolean;
	data: string;
	rowCount: number;
	truncated: boolean;
	wasNaturalLanguage: boolean;
	executedSQL?: string;
}

/**
 * Detects if a query is SQL or natural language.
 * SQL queries typically start with SELECT, WITH, or other SQL keywords.
 */
function isSQLQuery(query: string): boolean {
	const sqlKeywords = /^\s*(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN|PRAGMA)\b/i;
	return sqlKeywords.test(query.trim());
}

/**
 * Translates a natural language query to SQL.
 * Uses simple pattern matching for common query patterns.
 */
function translateToSQL(nlQuery: string, tableName: string): string {
	const q = nlQuery.toLowerCase().trim();

	// "show all" / "show everything"
	if (/^(show|get|display)\s+(all|everything|data)/.test(q)) {
		return `SELECT * FROM ${tableName}`;
	}

	// "count" patterns
	if (/^(count|how many)/.test(q)) {
		const groupByMatch = q.match(/by\s+(\w+)/);
		if (groupByMatch) {
			return `SELECT ${groupByMatch[1]}, COUNT(*) as count FROM ${tableName} GROUP BY ${groupByMatch[1]} ORDER BY count DESC`;
		}
		return `SELECT COUNT(*) as total FROM ${tableName}`;
	}

	// "top N by column"
	const topMatch = q.match(/top\s+(\d+)\s+(?:by\s+)?(\w+)/);
	if (topMatch) {
		return `SELECT * FROM ${tableName} ORDER BY ${topMatch[2]} DESC LIMIT ${topMatch[1]}`;
	}

	// "average/sum/min/max of column"
	const aggMatch = q.match(/(average|avg|sum|total|min|max)\s+(?:of\s+)?(\w+)/);
	if (aggMatch) {
		const agg =
			aggMatch[1] === "average"
				? "AVG"
				: aggMatch[1] === "total"
					? "SUM"
					: aggMatch[1].toUpperCase();
		const groupByMatch = q.match(/by\s+(\w+)/);
		if (groupByMatch) {
			return `SELECT ${groupByMatch[1]}, ${agg}(${aggMatch[2]}) as ${aggMatch[1]} FROM ${tableName} GROUP BY ${groupByMatch[1]}`;
		}
		return `SELECT ${agg}(${aggMatch[2]}) as ${aggMatch[1]} FROM ${tableName}`;
	}

	// "where column = value"
	const whereMatch = q.match(/where\s+(\w+)\s*(=|>|<|>=|<=|contains)\s*['"]?([^'"]+)['"]?/);
	if (whereMatch) {
		const op = whereMatch[2] === "contains" ? "LIKE" : whereMatch[2];
		const val =
			whereMatch[2] === "contains"
				? `'%${whereMatch[3]}%'`
				: isNaN(Number(whereMatch[3]))
					? `'${whereMatch[3]}'`
					: whereMatch[3];
		return `SELECT * FROM ${tableName} WHERE ${whereMatch[1]} ${op} ${val}`;
	}

	// Default: show limited data
	return `SELECT * FROM ${tableName} LIMIT 100`;
}

/**
 * Queries loaded data using SQL or natural language.
 *
 * @param {QueryDataArgs} args - Query arguments
 * @returns {Promise<QueryDataResult>} Query results
 * @throws {Error} If query validation fails or execution errors occur
 *
 * @example
 * // SQL query
 * const result = await queryData({ query: 'SELECT * FROM sales LIMIT 10' });
 *
 * // Natural language query
 * const result = await queryData({ query: 'show top 5 by revenue', tableName: 'sales' });
 * // result.wasNaturalLanguage === true
 * // result.executedSQL === 'SELECT * FROM sales ORDER BY revenue DESC LIMIT 5'
 */
export async function queryData(args: QueryDataArgs): Promise<QueryDataResult> {
	const store = getStore();
	const format = args.format || "markdown";

	let sql: string;
	let wasNaturalLanguage = false;

	// 1. Detect if query is SQL or NL
	if (isSQLQuery(args.query)) {
		sql = args.query;
	} else {
		wasNaturalLanguage = true;
		// Need a table name for NL queries
		const tables = Array.from(store.getTableMetadata().keys());
		const tableName = args.tableName || tables[0];

		if (!tableName) {
			throw new Error("No tables loaded. Use load_data first.");
		}

		sql = translateToSQL(args.query, tableName);
	}

	// 2. Validate query
	const queryCheck = validateQuery(sql);
	if (!queryCheck.allowed) {
		throw new Error(`Security: ${queryCheck.reason}`);
	}

	// 3. Execute query
	const result = await store.executeQuery(sql);

	// 4. Format output
	const data = format === "markdown" ? exportToMarkdown(result) : exportData(result, format);

	return {
		success: true,
		data,
		rowCount: result.rowCount,
		truncated: result.truncated,
		wasNaturalLanguage,
		executedSQL: wasNaturalLanguage ? sql : undefined,
	};
}
