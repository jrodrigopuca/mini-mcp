/**
 * @fileoverview Parquet Parser
 * @module parsers/parquet-parser
 * @description Parses Parquet files using DuckDB's native Parquet support.
 * DuckDB has built-in efficient Parquet reading capabilities.
 */

import { DuckDBInstance } from "@duckdb/node-api";
import type { DataParser, ParsedData } from "../types/index.js";
import { inferColumnTypes } from "../validators/schema-validator.js";

/**
 * Parser for Parquet files using DuckDB.
 * DuckDB provides efficient, memory-mapped Parquet reading.
 *
 * @class ParquetParser
 * @implements {DataParser}
 *
 * @example
 * const parser = new ParquetParser();
 * if (parser.canParse('data.parquet')) {
 *   const data = await parser.parse(fileContent);
 * }
 */
export class ParquetParser implements DataParser {
	/**
	 * Checks if this parser can handle the given file.
	 *
	 * @param {string} filePath - Path to the file
	 * @returns {boolean} True if file is Parquet
	 */
	canParse(filePath: string): boolean {
		const ext = filePath.toLowerCase();
		return ext.endsWith(".parquet") || ext.endsWith(".pq");
	}

	/**
	 * Parses Parquet content using DuckDB.
	 * Note: For Parquet files, we need the actual file path, not content buffer.
	 *
	 * @param {string | Buffer} content - File path for Parquet (not content)
	 * @param {object} options - Parsing options
	 * @param {string} options.filePath - Actual file path (required for Parquet)
	 * @returns {Promise<ParsedData>} Parsed data with columns, rows, and inferred types
	 * @throws {Error} If parsing fails
	 */
	async parse(
		content: string | Buffer,
		options?: { filePath?: string },
	): Promise<ParsedData> {
		// For Parquet, the content should be a file path
		const filePath =
			options?.filePath ?? (Buffer.isBuffer(content) ? "" : content);

		if (!filePath || filePath.length === 0) {
			throw new Error(
				"Parquet parser requires a file path. Pass the file path in options.filePath or as the content string.",
			);
		}

		// Create a temporary DuckDB instance for parsing
		const instance = await DuckDBInstance.create(":memory:");
		const connection = await instance.connect();

		try {
			// Read Parquet file using DuckDB
			// Escape single quotes in file path
			const escapedPath = filePath.replace(/'/g, "''");
			const query = `SELECT * FROM read_parquet('${escapedPath}')`;

			const reader = await connection.runAndReadAll(query);
			const columnNames = reader.columnNames();
			const allRows = reader.getRows();

			// Convert to our format
			const columns = columnNames;
			const rows = allRows.map((row) =>
				row.map((val) => {
					if (val === null || val === undefined) return null;
					if (typeof val === "bigint") return Number(val);
					if (typeof val === "object" && val !== null) {
						if ("toString" in val && typeof val.toString === "function") {
							return val.toString();
						}
						return String(val);
					}
					return val as string | number | boolean | null;
				}),
			);

			// Get column types from DuckDB
			const typeQuery = `DESCRIBE SELECT * FROM read_parquet('${escapedPath}')`;
			const typeReader = await connection.runAndReadAll(typeQuery);
			const typeRows = typeReader.getRows();

			const inferredTypes: Record<string, string> = {};
			for (const row of typeRows) {
				const colName = String(row[0]);
				const colType = this.mapDuckDBType(String(row[1]));
				inferredTypes[colName] = colType;
			}

			return {
				columns,
				rows,
				inferredTypes,
			};
		} finally {
			connection.closeSync();
		}
	}

	/**
	 * Maps DuckDB type names to our standard type names.
	 *
	 * @param {string} duckdbType - DuckDB type name
	 * @returns {string} Standard type name
	 */
	private mapDuckDBType(duckdbType: string): string {
		const upperType = duckdbType.toUpperCase();

		if (upperType.includes("INT")) return "INTEGER";
		if (upperType.includes("BIGINT")) return "BIGINT";
		if (
			upperType.includes("DOUBLE") ||
			upperType.includes("FLOAT") ||
			upperType.includes("REAL")
		) {
			return "DOUBLE";
		}
		if (upperType.includes("BOOL")) return "BOOLEAN";
		if (upperType.includes("DATE")) return "DATE";
		if (upperType.includes("TIME")) return "TIMESTAMP";
		if (upperType.includes("DECIMAL")) return "DOUBLE";

		return "VARCHAR";
	}
}
