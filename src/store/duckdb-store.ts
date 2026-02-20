/**
 * @fileoverview DuckDB Store for Mini-MCP
 * @module store/duckdb-store
 * @description Manages the in-memory DuckDB instance for data analysis.
 * Provides a singleton pattern for database access across the application.
 *
 * Features:
 * - In-memory DuckDB instance using @duckdb/node-api
 * - Table loading and management
 * - Query execution with result formatting
 * - Statistics generation
 */

import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import { getConfig } from "../config/loader.js";
import type {
	TableMetadata,
	QueryResult,
	TableStats,
	ColumnInfo,
	ColumnStats,
	Config,
} from "../types/index.js";

/**
 * DuckDB Store class.
 * Manages the in-memory DuckDB instance and provides methods for
 * data loading, querying, and statistics.
 *
 * @class DuckDBStore
 * @example
 * const store = getStore();
 * await store.initialize();
 * await store.loadTable('sales', columns, rows, './data/sales.csv');
 * const result = await store.executeQuery('SELECT * FROM sales');
 */
class DuckDBStore {
	/** Whether the store has been initialized */
	private initialized = false;

	/** Map of loaded tables by name */
	private tables = new Map<string, TableMetadata>();

	/** DuckDB instance */
	private instance: DuckDBInstance | null = null;

	/** DuckDB connection for queries */
	private connection: DuckDBConnection | null = null;

	/** Configuration reference */
	private config: Config;

	constructor() {
		this.config = getConfig();
	}

	/**
	 * Initializes the DuckDB instance with configuration settings.
	 * Must be called before any other operations.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If DuckDB initialization fails
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Create in-memory database with config settings
			this.instance = await DuckDBInstance.create(":memory:", {
				threads: String(this.config.duckdb.threads),
			});

			this.connection = await this.instance.connect();

			// Set memory limit via PRAGMA
			await this.connection.run(
				`SET memory_limit='${this.config.duckdb.memoryLimitMB}MB'`,
			);

			this.initialized = true;
			console.error(
				`DuckDB initialized: memory=${this.config.duckdb.memoryLimitMB}MB, threads=${this.config.duckdb.threads}`,
			);
		} catch (error) {
			throw new Error(`Failed to initialize DuckDB: ${error}`);
		}
	}

	/**
	 * Ensures the store is initialized before operations.
	 * @private
	 */
	private ensureInitialized(): void {
		if (!this.initialized || !this.connection) {
			throw new Error("DuckDB store not initialized. Call initialize() first.");
		}
	}

	/**
	 * Escapes a table or column name for safe SQL use.
	 * @param {string} name - Name to escape
	 * @returns {string} Escaped name
	 */
	private escapeName(name: string): string {
		// DuckDB uses double quotes for identifiers
		return `"${name.replace(/"/g, '""')}"`;
	}

	/**
	 * Infers DuckDB type from a sample of values.
	 * @param {unknown[]} values - Sample values to analyze
	 * @returns {string} Inferred DuckDB type
	 */
	private inferType(values: unknown[]): string {
		const nonNullValues = values.filter(
			(v) => v !== null && v !== undefined && v !== "",
		);

		if (nonNullValues.length === 0) {
			return "VARCHAR";
		}

		// Check if all values are booleans
		if (
			nonNullValues.every(
				(v) =>
					typeof v === "boolean" ||
					v === "true" ||
					v === "false" ||
					v === "1" ||
					v === "0",
			)
		) {
			return "BOOLEAN";
		}

		// Check if all values are integers
		if (
			nonNullValues.every((v) => {
				const num = Number(v);
				return !isNaN(num) && Number.isInteger(num);
			})
		) {
			const maxVal = Math.max(...nonNullValues.map((v) => Math.abs(Number(v))));
			if (maxVal > 2147483647) {
				return "BIGINT";
			}
			return "INTEGER";
		}

		// Check if all values are numbers
		if (nonNullValues.every((v) => !isNaN(Number(v)))) {
			return "DOUBLE";
		}

		// Check for date patterns
		const datePattern = /^\d{4}-\d{2}-\d{2}$/;
		if (nonNullValues.every((v) => datePattern.test(String(v)))) {
			return "DATE";
		}

		// Check for timestamp patterns
		const timestampPattern = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
		if (nonNullValues.every((v) => timestampPattern.test(String(v)))) {
			return "TIMESTAMP";
		}

		return "VARCHAR";
	}

	/**
	 * Loads data into a DuckDB table.
	 *
	 * @param {string} tableName - Name for the table (will be used in SQL queries)
	 * @param {string[]} columns - Array of column names
	 * @param {unknown[][]} rows - 2D array of row data
	 * @param {string} filePath - Original file path (for metadata)
	 * @returns {Promise<TableMetadata>} Metadata about the loaded table
	 * @throws {Error} If table creation or data insertion fails
	 */
	async loadTable(
		tableName: string,
		columns: string[],
		rows: unknown[][],
		filePath: string,
	): Promise<TableMetadata> {
		this.ensureInitialized();

		// Check table limit
		if (this.tables.size >= this.config.limits.maxTablesLoaded) {
			throw new Error(
				`Maximum tables (${this.config.limits.maxTablesLoaded}) already loaded. Drop a table first.`,
			);
		}

		// Sanitize table name
		const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, "_");

		// Infer column types from first 100 rows
		const sampleSize = Math.min(100, rows.length);
		const columnTypes: string[] = columns.map((_, colIdx) => {
			const sampleValues = rows.slice(0, sampleSize).map((row) => row[colIdx]);
			return this.inferType(sampleValues);
		});

		// Build column definitions
		const columnDefs = columns
			.map((col, idx) => {
				const escapedName = this.escapeName(col);
				return `${escapedName} ${columnTypes[idx]}`;
			})
			.join(", ");

		// Drop existing table if exists
		await this.connection!.run(
			`DROP TABLE IF EXISTS ${this.escapeName(safeName)}`,
		);

		// Create table
		const createSQL = `CREATE TABLE ${this.escapeName(safeName)} (${columnDefs})`;
		await this.connection!.run(createSQL);

		// Insert data in batches
		const BATCH_SIZE = 1000;
		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			const batch = rows.slice(i, i + BATCH_SIZE);
			const values = batch
				.map((row) => {
					const rowValues = row
						.map((val, colIdx) => {
							if (val === null || val === undefined || val === "") {
								return "NULL";
							}
							const type = columnTypes[colIdx];
							if (
								type === "VARCHAR" ||
								type === "DATE" ||
								type === "TIMESTAMP"
							) {
								return `'${String(val).replace(/'/g, "''")}'`;
							}
							if (type === "BOOLEAN") {
								const boolVal =
									val === true || val === "true" || val === "1" || val === 1;
								return boolVal ? "TRUE" : "FALSE";
							}
							return String(val);
						})
						.join(", ");
					return `(${rowValues})`;
				})
				.join(", ");

			const insertSQL = `INSERT INTO ${this.escapeName(safeName)} VALUES ${values}`;
			await this.connection!.run(insertSQL);
		}

		// Build column info
		const columnInfo: ColumnInfo[] = columns.map((name, idx) => ({
			name,
			type: columnTypes[idx],
			nullable: true,
		}));

		// Store metadata
		const metadata: TableMetadata = {
			name: safeName,
			filePath,
			rowCount: rows.length,
			columns: columnInfo,
			loadedAt: new Date(),
		};

		this.tables.set(safeName, metadata);

		console.error(
			`Table '${safeName}' created: ${rows.length} rows, ${columns.length} columns`,
		);

		return metadata;
	}

	/**
	 * Executes a SQL query against the DuckDB instance.
	 *
	 * @param {string} query - SQL query to execute
	 * @returns {Promise<QueryResult>} Query results with columns and rows
	 * @throws {Error} If query execution fails or times out
	 */
	async executeQuery(query: string): Promise<QueryResult> {
		this.ensureInitialized();

		const maxRows = this.config.limits.maxRowsOutput;
		const timeout = this.config.limits.queryTimeoutMs;

		// Add LIMIT if not present
		let finalQuery = query.trim();
		if (!/\bLIMIT\s+\d+/i.test(finalQuery)) {
			// Remove trailing semicolon if present
			finalQuery = finalQuery.replace(/;\s*$/, "");
			finalQuery = `${finalQuery} LIMIT ${maxRows + 1}`;
		}

		// Create a timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(
						`Query timed out after ${timeout}ms. Consider simplifying your query.`,
					),
				);
			}, timeout);
		});

		try {
			// Race between query and timeout
			const reader = await Promise.race([
				this.connection!.runAndReadAll(finalQuery),
				timeoutPromise,
			]);

			const columnNames = reader.columnNames();
			const allRows = reader.getRows();

			if (allRows.length === 0) {
				return {
					columns: columnNames,
					rows: [],
					rowCount: 0,
					truncated: false,
				};
			}

			// Check if we need to truncate
			const truncated = allRows.length > maxRows;
			const finalRows = truncated ? allRows.slice(0, maxRows) : allRows;

			// Convert values to JSON-safe format
			const rows = finalRows.map((row) =>
				row.map((val) => {
					if (val === null || val === undefined) return null;
					if (typeof val === "bigint") return Number(val);
					if (typeof val === "object" && val !== null) {
						// Handle DuckDB value objects (like Date, Timestamp, etc.)
						if ("toString" in val && typeof val.toString === "function") {
							return val.toString();
						}
						return String(val);
					}
					return val as string | number | boolean | null;
				}),
			);

			return {
				columns: columnNames,
				rows,
				rowCount: truncated ? allRows.length : rows.length,
				truncated,
			};
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(`Query error: ${error}`);
		}
	}

	/**
	 * Gets statistics for a loaded table.
	 * Uses DuckDB's aggregate functions for efficient stats calculation.
	 *
	 * @param {string} tableName - Name of the table to analyze
	 * @returns {Promise<TableStats>} Statistics including min, max, mean, etc.
	 * @throws {Error} If table not found
	 */
	async getTableStats(tableName: string): Promise<TableStats> {
		this.ensureInitialized();

		const metadata = this.tables.get(tableName);
		if (!metadata) {
			throw new Error(`Table '${tableName}' not found`);
		}

		// Get statistics for each column
		const columnStats: ColumnStats[] = [];

		for (const col of metadata.columns) {
			const escapedTable = this.escapeName(tableName);
			const escapedCol = this.escapeName(col.name);

			// Build stats query based on column type
			let statsQuery: string;
			const isNumeric = ["INTEGER", "BIGINT", "DOUBLE"].includes(col.type);

			if (isNumeric) {
				statsQuery = `
					SELECT 
						COUNT(*) - COUNT(${escapedCol}) as null_count,
						COUNT(DISTINCT ${escapedCol}) as distinct_count,
						MIN(${escapedCol}) as min_val,
						MAX(${escapedCol}) as max_val,
						AVG(${escapedCol}) as mean_val,
						STDDEV(${escapedCol}) as stddev_val
					FROM ${escapedTable}
				`;
			} else {
				statsQuery = `
					SELECT 
						COUNT(*) - COUNT(${escapedCol}) as null_count,
						COUNT(DISTINCT ${escapedCol}) as distinct_count,
						MIN(${escapedCol}) as min_val,
						MAX(${escapedCol}) as max_val
					FROM ${escapedTable}
				`;
			}

			const result = await this.executeQuery(statsQuery);

			if (result.rows.length > 0) {
				const row = result.rows[0];
				const stats: ColumnStats = {
					name: col.name,
					type: col.type,
					nullCount: Number(row[0]) || 0,
					distinctCount: Number(row[1]) || 0,
					min: row[2] as string | number | undefined,
					max: row[3] as string | number | undefined,
				};

				if (isNumeric && row.length > 4) {
					stats.mean = row[4] !== null ? Number(row[4]) : undefined;
					stats.stddev = row[5] !== null ? Number(row[5]) : undefined;
				}

				columnStats.push(stats);
			}
		}

		return {
			tableName,
			rowCount: metadata.rowCount,
			columnCount: metadata.columns.length,
			columns: columnStats,
		};
	}

	/**
	 * Lists all currently loaded tables.
	 *
	 * @returns {TableMetadata[]} Array of metadata for all loaded tables
	 */
	listTables(): TableMetadata[] {
		return Array.from(this.tables.values());
	}

	/**
	 * Gets metadata for a specific table.
	 *
	 * @param {string} tableName - Name of the table
	 * @returns {TableMetadata | undefined} Table metadata or undefined if not found
	 */
	getTable(tableName: string): TableMetadata | undefined {
		return this.tables.get(tableName);
	}

	/**
	 * Drops a table from the database.
	 *
	 * @param {string} tableName - Name of the table to drop
	 * @returns {Promise<boolean>} True if table was dropped, false if not found
	 */
	async dropTable(tableName: string): Promise<boolean> {
		this.ensureInitialized();

		if (!this.tables.has(tableName)) {
			return false;
		}

		await this.connection!.run(
			`DROP TABLE IF EXISTS ${this.escapeName(tableName)}`,
		);
		this.tables.delete(tableName);

		console.error(`Table '${tableName}' dropped`);
		return true;
	}

	/**
	 * Checks if a table exists.
	 *
	 * @param {string} tableName - Name of the table
	 * @returns {boolean} True if table exists
	 */
	hasTable(tableName: string): boolean {
		return this.tables.has(tableName);
	}

	/**
	 * Gets the default/only table name if only one table is loaded.
	 *
	 * @returns {string | null} Table name or null if zero or multiple tables
	 */
	getDefaultTable(): string | null {
		if (this.tables.size === 1) {
			return this.tables.keys().next().value ?? null;
		}
		return null;
	}

	/**
	 * Gets the metadata map for all loaded tables.
	 *
	 * @returns {Map<string, TableMetadata>} Map of table names to metadata
	 */
	getTableMetadata(): Map<string, TableMetadata> {
		return this.tables;
	}

	/**
	 * Closes the DuckDB connection and clears all loaded tables.
	 *
	 * @returns {Promise<void>}
	 */
	async close(): Promise<void> {
		if (this.connection) {
			this.connection.closeSync();
			this.connection = null;
		}
		this.instance = null;
		this.initialized = false;
		this.tables.clear();
		console.error("DuckDB store closed");
	}
}

// ============================================================================
// Singleton Pattern
// ============================================================================

/**
 * Singleton instance of the DuckDB store.
 * @type {DuckDBStore | null}
 */
let storeInstance: DuckDBStore | null = null;

/**
 * Gets the singleton DuckDB store instance.
 * Creates the instance if it doesn't exist.
 *
 * @returns {DuckDBStore} The DuckDB store instance
 *
 * @example
 * const store = getStore();
 * await store.initialize();
 */
export function getStore(): DuckDBStore {
	if (!storeInstance) {
		storeInstance = new DuckDBStore();
	}
	return storeInstance;
}

/**
 * Resets the store instance (for testing).
 */
export function resetStore(): void {
	if (storeInstance) {
		storeInstance.close();
	}
	storeInstance = null;
}

export { DuckDBStore };
