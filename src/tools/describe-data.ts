/**
 * @fileoverview describe_data MCP Tool Implementation
 * @module tools/describe-data
 * @description Provides schema and statistics for loaded tables.
 * Uses DuckDB's SUMMARIZE function for efficient statistics.
 *
 * Output includes:
 * - Table schema (column names and types)
 * - Per-column statistics (count, nulls, min, max, mean)
 * - Sample data rows
 */

import { getStore } from "../store/duckdb-store.js";
import { exportToMarkdown } from "../exporters/markdown-exporter.js";

/**
 * Arguments for the describe_data tool.
 *
 * @interface DescribeDataArgs
 * @property {string} tableName - Name of the table to describe
 * @property {string} [column] - Optional specific column to describe
 */
export interface DescribeDataArgs {
	tableName: string;
	column?: string;
}

/**
 * Result from the describe_data tool.
 *
 * @interface DescribeDataResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} tableName - Name of the described table
 * @property {string} schema - Formatted schema information
 * @property {string} statistics - Formatted statistics
 * @property {string} sampleData - Sample rows from the table
 */
export interface DescribeDataResult {
	success: boolean;
	tableName: string;
	schema: string;
	statistics: string;
	sampleData: string;
}

/**
 * Formats column statistics into a readable markdown format.
 */
function formatColumnStats(
	stats: Awaited<ReturnType<typeof getStore>>["getTableStats"] extends (
		n: string,
	) => Promise<infer R>
		? R
		: never,
): string {
	const lines: string[] = ["## Column Statistics\n"];
	lines.push("| Column | Type | Distinct | Nulls | Min | Max |");
	lines.push("| --- | --- | --- | --- | --- | --- |");

	for (const col of stats.columns) {
		const min = col.min !== null ? String(col.min).substring(0, 20) : "-";
		const max = col.max !== null ? String(col.max).substring(0, 20) : "-";
		lines.push(
			`| ${col.name} | ${col.type} | ${col.distinctCount} | ${col.nullCount} | ${min} | ${max} |`,
		);
	}

	return lines.join("\n");
}

/**
 * Gets schema and statistics for a loaded table.
 *
 * @param {DescribeDataArgs} args - Describe arguments
 * @returns {Promise<DescribeDataResult>} Table description
 * @throws {Error} If table not found
 *
 * @example
 * const result = await describeData({ tableName: 'sales' });
 * // result.schema contains column names and types
 * // result.statistics contains min, max, mean, etc.
 * // result.sampleData contains first few rows
 */
export async function describeData(
	args: DescribeDataArgs,
): Promise<DescribeDataResult> {
	const store = getStore();
	const { tableName, column } = args;

	// Check if table exists
	const metadata = store.getTableMetadata();
	const tableMeta = metadata.get(tableName);
	if (!tableMeta) {
		const available = Array.from(metadata.keys()).join(", ") || "none";
		throw new Error(
			`Table '${tableName}' not found. Available tables: ${available}`,
		);
	}

	// Get table statistics
	const stats = await store.getTableStats(tableName);

	// Format schema
	const schemaLines = ["## Schema\n"];
	schemaLines.push(`**Table:** ${tableName}`);
	schemaLines.push(`**Rows:** ${tableMeta.rowCount}`);
	schemaLines.push(`**Columns:** ${tableMeta.columns.length}`);
	schemaLines.push(`**Source:** ${tableMeta.filePath}`);
	schemaLines.push(`**Loaded:** ${tableMeta.loadedAt.toISOString()}\n`);
	schemaLines.push("| Column | Type |");
	schemaLines.push("| --- | --- |");
	for (const col of tableMeta.columns) {
		schemaLines.push(`| ${col.name} | ${col.type} |`);
	}
	const schema = schemaLines.join("\n");

	// Format statistics (optionally filter to single column)
	let columnStats = stats;
	if (column) {
		const filtered = stats.columns.filter((c) => c.name === column);
		if (filtered.length === 0) {
			throw new Error(`Column '${column}' not found in table '${tableName}'`);
		}
		columnStats = { ...stats, columns: filtered };
	}
	const statistics = formatColumnStats(columnStats);

	// Get sample data
	const sampleQuery = column
		? `SELECT ${column} FROM ${tableName} LIMIT 5`
		: `SELECT * FROM ${tableName} LIMIT 5`;
	const sampleResult = await store.executeQuery(sampleQuery);
	const sampleData = "## Sample Data\n\n" + exportToMarkdown(sampleResult);

	return {
		success: true,
		tableName,
		schema,
		statistics,
		sampleData,
	};
}
