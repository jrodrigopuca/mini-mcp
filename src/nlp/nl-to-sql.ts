/**
 * @fileoverview Natural Language to SQL Translator
 * @module nlp/nl-to-sql
 * @description Pattern-based translator that converts natural language queries
 * into SQL statements. Uses regex patterns to match common query intents.
 *
 * Supported Patterns:
 * - "show all data" → SELECT * FROM table LIMIT 100
 * - "count rows" → SELECT COUNT(*) FROM table
 * - "average of column" → SELECT AVG(column) FROM table
 * - "top N by column" → SELECT * FROM table ORDER BY column DESC LIMIT N
 * - "group by column" → SELECT column, COUNT(*) FROM table GROUP BY column
 *
 * @todo Implement in Phase 6
 */

import type { TableMetadata } from "../types/index.js";

/**
 * Result of translating a natural language query.
 *
 * @interface TranslationResult
 * @property {boolean} isNaturalLanguage - True if input was NL, false if already SQL
 * @property {string} sql - The resulting SQL query
 * @property {number} confidence - Confidence score (0-1) of the translation
 * @property {string} [explanation] - Human-readable explanation of the translation
 */
interface TranslationResult {
	isNaturalLanguage: boolean;
	sql: string;
	confidence: number;
	explanation?: string;
}

/**
 * Pattern definition for NL to SQL translation.
 * @interface NLPattern
 */
interface NLPattern {
	/** Regex pattern to match against input */
	pattern: RegExp;
	/** Function to generate SQL from regex matches */
	template: (
		matches: RegExpMatchArray,
		table: string,
		columns: string[],
	) => string;
	/** Human-readable description of what this pattern does */
	description: string;
}

/**
 * Common natural language patterns and their SQL templates.
 * Patterns are checked in order, first match wins.
 *
 * @constant {NLPattern[]}
 */
const PATTERNS: NLPattern[] = [
	{
		pattern: /^(show|display|list|get)\s+(all|everything|the data)$/i,
		template: (_m, table) => `SELECT * FROM ${table} LIMIT 100`,
		description: "Show all data",
	},
	{
		pattern: /^(show|display|list|get)\s+(\d+)\s+(rows?|records?|entries?)$/i,
		template: (m, table) => `SELECT * FROM ${table} LIMIT ${m[2]}`,
		description: "Show N rows",
	},
	{
		pattern: /^(count|how many)\s+(rows?|records?|entries?|total)$/i,
		template: (_m, table) => `SELECT COUNT(*) as count FROM ${table}`,
		description: "Count rows",
	},
	{
		pattern: /^(average|avg|mean)\s+(of\s+)?(.+)$/i,
		template: (m, table) =>
			`SELECT AVG(${sanitizeColumn(m[3])}) as average FROM ${table}`,
		description: "Calculate average",
	},
	{
		pattern: /^(sum|total)\s+(of\s+)?(.+)$/i,
		template: (m, table) =>
			`SELECT SUM(${sanitizeColumn(m[3])}) as total FROM ${table}`,
		description: "Calculate sum",
	},
	{
		pattern: /^(max|maximum|highest|largest)\s+(of\s+)?(.+)$/i,
		template: (m, table) =>
			`SELECT MAX(${sanitizeColumn(m[3])}) as maximum FROM ${table}`,
		description: "Find maximum",
	},
	{
		pattern: /^(min|minimum|lowest|smallest)\s+(of\s+)?(.+)$/i,
		template: (m, table) =>
			`SELECT MIN(${sanitizeColumn(m[3])}) as minimum FROM ${table}`,
		description: "Find minimum",
	},
	{
		pattern: /^(group|aggregate)\s+by\s+(.+)$/i,
		template: (m, table) =>
			`SELECT ${sanitizeColumn(m[2])}, COUNT(*) as count FROM ${table} GROUP BY ${sanitizeColumn(m[2])}`,
		description: "Group by column",
	},
	{
		pattern: /^(top|first)\s+(\d+)\s+by\s+(.+)$/i,
		template: (m, table) =>
			`SELECT * FROM ${table} ORDER BY ${sanitizeColumn(m[3])} DESC LIMIT ${m[2]}`,
		description: "Top N by column",
	},
	{
		pattern: /^(bottom|last)\s+(\d+)\s+by\s+(.+)$/i,
		template: (m, table) =>
			`SELECT * FROM ${table} ORDER BY ${sanitizeColumn(m[3])} ASC LIMIT ${m[2]}`,
		description: "Bottom N by column",
	},
	{
		pattern: /^(sort|order)\s+by\s+(.+)$/i,
		template: (m, table) =>
			`SELECT * FROM ${table} ORDER BY ${sanitizeColumn(m[2])}`,
		description: "Sort by column",
	},
	{
		pattern: /^(unique|distinct)\s+(.+)$/i,
		template: (m, table) =>
			`SELECT DISTINCT ${sanitizeColumn(m[2])} FROM ${table}`,
		description: "Get unique values",
	},
];

/**
 * Sanitizes a column name for safe use in SQL.
 * Removes special characters and wraps in quotes.
 *
 * @param {string} col - Raw column name from user input
 * @returns {string} Sanitized column name wrapped in double quotes
 *
 * @example
 * sanitizeColumn('sales amount') // Returns '"sales_amount"'
 * sanitizeColumn('user@email')   // Returns '"useremail"'
 */
function sanitizeColumn(col: string): string {
	// Remove common words and clean up
	const cleaned = col
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_]/g, "");
	return `"${cleaned}"`;
}

/**
 * Checks if a query appears to be SQL rather than natural language.
 *
 * @param {string} query - The query string to check
 * @returns {boolean} True if the query starts with SQL keywords
 *
 * @example
 * looksLikeSQL('SELECT * FROM users') // Returns true
 * looksLikeSQL('show me all users')   // Returns false
 */
function looksLikeSQL(query: string): boolean {
	const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|FROM|WHERE)\b/i;
	return sqlKeywords.test(query.trim());
}

/**
 * Translates a natural language query to SQL.
 * If the input already looks like SQL, it's returned as-is.
 *
 * @param {string} query - Natural language query or SQL
 * @param {TableMetadata} tableMetadata - Metadata about the target table
 * @returns {TranslationResult} Translation result with SQL and confidence
 *
 * @example
 * // Natural language translation
 * const result = translateToSQL('show all data', tableMetadata);
 * // result.sql === 'SELECT * FROM tableName LIMIT 100'
 * // result.isNaturalLanguage === true
 * // result.confidence === 0.8
 *
 * // SQL passthrough
 * const result2 = translateToSQL('SELECT id FROM users', tableMetadata);
 * // result2.sql === 'SELECT id FROM users'
 * // result2.isNaturalLanguage === false
 * // result2.confidence === 1.0
 */
export function translateToSQL(
	query: string,
	tableMetadata: TableMetadata,
): TranslationResult {
	const trimmedQuery = query.trim();

	// If it already looks like SQL, return as-is
	if (looksLikeSQL(trimmedQuery)) {
		return {
			isNaturalLanguage: false,
			sql: trimmedQuery,
			confidence: 1.0,
		};
	}

	// Try to match against patterns
	for (const { pattern, template, description } of PATTERNS) {
		const match = trimmedQuery.match(pattern);
		if (match) {
			const columns = tableMetadata.columns.map((c) => c.name);
			const sql = template(match, tableMetadata.name, columns);
			return {
				isNaturalLanguage: true,
				sql,
				confidence: 0.8,
				explanation: description,
			};
		}
	}

	// Fallback: Try simple column references
	const columns = tableMetadata.columns.map((c) => c.name.toLowerCase());
	for (const col of columns) {
		if (trimmedQuery.toLowerCase().includes(col)) {
			return {
				isNaturalLanguage: true,
				sql: `SELECT "${col}" FROM ${tableMetadata.name}`,
				confidence: 0.5,
				explanation: `Selected column that matches: ${col}`,
			};
		}
	}

	// No match found - return as potential SQL
	return {
		isNaturalLanguage: false,
		sql: trimmedQuery,
		confidence: 0.3,
		explanation: "Could not interpret as natural language, treating as SQL",
	};
}
