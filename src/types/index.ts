/**
 * @fileoverview Type definitions for Mini-MCP
 * @module types
 * @description Central type definitions used throughout the Mini-MCP application.
 * Includes configuration types, table metadata, query results, and parser interfaces.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Security configuration settings.
 * Controls file access, path restrictions, and size limits.
 *
 * @interface SecurityConfig
 * @property {boolean} readOnly - When true, blocks all write operations
 * @property {string[]} allowedPaths - List of paths where files can be loaded from
 * @property {boolean} allowNetworkPaths - Whether to allow network/remote paths
 * @property {number} maxFileSizeMB - Maximum file size in megabytes
 */
export interface SecurityConfig {
	readOnly: boolean;
	allowedPaths: string[];
	allowNetworkPaths: boolean;
	maxFileSizeMB: number;
}

/**
 * Resource limits configuration.
 * Prevents excessive resource usage and controls output size.
 *
 * @interface LimitsConfig
 * @property {number} maxRowsOutput - Maximum rows returned in query results
 * @property {number} maxOutputChars - Maximum characters in output strings
 * @property {number} queryTimeoutMs - Query timeout in milliseconds
 * @property {number} maxTablesLoaded - Maximum tables that can be loaded simultaneously
 */
export interface LimitsConfig {
	maxRowsOutput: number;
	maxOutputChars: number;
	queryTimeoutMs: number;
	maxTablesLoaded: number;
}

/**
 * DuckDB engine configuration.
 * Controls memory allocation and parallelism.
 *
 * @interface DuckDBConfig
 * @property {number} memoryLimitMB - Maximum memory DuckDB can use in megabytes
 * @property {number} threads - Number of threads for parallel query execution
 */
export interface DuckDBConfig {
	memoryLimitMB: number;
	threads: number;
}

/**
 * Output formatting configuration.
 * Controls default output format and metadata inclusion.
 *
 * @interface OutputConfig
 * @property {'csv' | 'json' | 'markdown'} defaultFormat - Default export format
 * @property {boolean} includeRowCount - Whether to include row count in output
 */
export interface OutputConfig {
	defaultFormat: "csv" | "json" | "markdown";
	includeRowCount: boolean;
}

/**
 * Complete application configuration.
 * Aggregates all configuration sections.
 *
 * @interface Config
 * @property {SecurityConfig} security - Security settings
 * @property {LimitsConfig} limits - Resource limits
 * @property {DuckDBConfig} duckdb - DuckDB engine settings
 * @property {OutputConfig} output - Output formatting settings
 */
export interface Config {
	security: SecurityConfig;
	limits: LimitsConfig;
	duckdb: DuckDBConfig;
	output: OutputConfig;
}

// ============================================================================
// Table Metadata Types
// ============================================================================

/**
 * Metadata about a loaded table.
 * Stored in the DuckDB store for tracking loaded data.
 *
 * @interface TableMetadata
 * @property {string} name - Table name (used in SQL queries)
 * @property {string} filePath - Original file path the data was loaded from
 * @property {number} rowCount - Total number of rows in the table
 * @property {ColumnInfo[]} columns - Array of column information
 * @property {Date} loadedAt - Timestamp when the table was loaded
 */
export interface TableMetadata {
	name: string;
	filePath: string;
	rowCount: number;
	columns: ColumnInfo[];
	loadedAt: Date;
}

/**
 * Information about a single column.
 *
 * @interface ColumnInfo
 * @property {string} name - Column name
 * @property {string} type - DuckDB data type (VARCHAR, INTEGER, DOUBLE, etc.)
 * @property {boolean} nullable - Whether the column allows NULL values
 */
export interface ColumnInfo {
	name: string;
	type: string;
	nullable: boolean;
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * Result of executing a SQL query.
 * Contains the data and metadata about the result set.
 *
 * @interface QueryResult
 * @property {string[]} columns - Column names in order
 * @property {unknown[][]} rows - 2D array of row data
 * @property {number} rowCount - Total rows (may be more than rows.length if truncated)
 * @property {boolean} truncated - Whether results were truncated due to limits
 *
 * @example
 * const result: QueryResult = {
 *   columns: ['name', 'age'],
 *   rows: [['Alice', 30], ['Bob', 25]],
 *   rowCount: 2,
 *   truncated: false
 * };
 */
export interface QueryResult {
	columns: string[];
	rows: unknown[][];
	rowCount: number;
	truncated: boolean;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Statistical information about a single column.
 * Used by the describe_data tool.
 *
 * @interface ColumnStats
 * @property {string} name - Column name
 * @property {string} type - DuckDB data type
 * @property {number} nullCount - Number of NULL values
 * @property {number} distinctCount - Number of unique values
 * @property {string | number} [min] - Minimum value (for numeric/date columns)
 * @property {string | number} [max] - Maximum value (for numeric/date columns)
 * @property {number} [mean] - Mean value (for numeric columns only)
 * @property {number} [stddev] - Standard deviation (for numeric columns only)
 */
export interface ColumnStats {
	name: string;
	type: string;
	nullCount: number;
	distinctCount: number;
	min?: string | number;
	max?: string | number;
	mean?: number;
	stddev?: number;
}

/**
 * Aggregated statistics for an entire table.
 *
 * @interface TableStats
 * @property {string} tableName - Name of the table
 * @property {number} rowCount - Total number of rows
 * @property {number} columnCount - Number of columns
 * @property {ColumnStats[]} columns - Per-column statistics
 */
export interface TableStats {
	tableName: string;
	rowCount: number;
	columnCount: number;
	columns: ColumnStats[];
}

// ============================================================================
// Visualization & Export Types
// ============================================================================

/**
 * Supported chart types for visualization.
 * @typedef {'bar' | 'pie' | 'line'} ChartType
 */
export type ChartType = "bar" | "pie" | "line";

/**
 * Supported chart output formats.
 * - `ascii`: Text-based charts for terminal display
 * - `mermaid`: Mermaid.js syntax for rich rendering
 * @typedef {'ascii' | 'mermaid'} ChartFormat
 */
export type ChartFormat = "ascii" | "mermaid";

/**
 * Supported data export formats.
 * @typedef {'csv' | 'json' | 'markdown'} ExportFormat
 */
export type ExportFormat = "csv" | "json" | "markdown";

// ============================================================================
// Parser Interfaces
// ============================================================================

/**
 * Interface for data parsers.
 * Implement this interface to add support for new file formats.
 *
 * @interface DataParser
 * @example
 * class XMLParser implements DataParser {
 *   canParse(filePath: string): boolean {
 *     return filePath.endsWith('.xml');
 *   }
 *   async parse(content: string | Buffer): Promise<ParsedData> {
 *     // Parse XML and return structured data
 *   }
 * }
 */
export interface DataParser {
	/**
	 * Parse file content into structured data.
	 * @param {string | Buffer} content - Raw file content
	 * @returns {Promise<ParsedData>} Parsed data with columns, rows, and inferred types
	 */
	parse(content: string | Buffer): Promise<ParsedData>;

	/**
	 * Check if this parser can handle the given file.
	 * @param {string} filePath - Path to the file
	 * @returns {boolean} True if this parser supports the file format
	 */
	canParse(filePath: string): boolean;
}

/**
 * Result of parsing a data file.
 *
 * @interface ParsedData
 * @property {string[]} columns - Column names extracted from the file
 * @property {unknown[][]} rows - 2D array of parsed row data
 * @property {Record<string, string>} inferredTypes - Map of column names to inferred DuckDB types
 */
export interface ParsedData {
	columns: string[];
	rows: unknown[][];
	inferredTypes: Record<string, string>;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Result of a security validation check.
 * Used by path and query validators.
 *
 * @interface SecurityCheckResult
 * @property {boolean} allowed - Whether the operation is permitted
 * @property {string} [reason] - Explanation if operation was denied
 * @property {string} [warning] - Optional warning message (operation allowed but with caveats)
 *
 * @example
 * // Denied operation
 * { allowed: false, reason: 'Path traversal detected' }
 *
 * // Allowed with warning
 * { allowed: true, warning: 'Network paths enabled - use with caution' }
 */
export interface SecurityCheckResult {
	allowed: boolean;
	reason?: string;
	warning?: string;
}
