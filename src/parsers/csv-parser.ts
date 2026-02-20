/**
 * @fileoverview CSV/TSV Parser
 * @module parsers/csv-parser
 * @description Parses CSV and TSV files into structured data.
 * Uses the csv-parse library for robust parsing with proper handling
 * of quotes, escapes, and edge cases.
 */

import { parse } from "csv-parse/sync";
import type { DataParser, ParsedData } from "../types/index.js";
import { inferColumnTypes } from "../validators/schema-validator.js";

/**
 * Options for CSV parsing.
 */
interface CSVParseOptions {
	/** Delimiter character (auto-detected if not provided) */
	delimiter?: string;
	/** Whether first row contains headers (default: true) */
	hasHeaders?: boolean;
	/** Skip empty lines (default: true) */
	skipEmptyLines?: boolean;
}

/**
 * Parser for CSV and TSV files.
 * Implements the DataParser interface for modular parsing.
 *
 * @class CSVParser
 * @implements {DataParser}
 *
 * @example
 * const parser = new CSVParser();
 * if (parser.canParse('data.csv')) {
 *   const data = await parser.parse(fileContent);
 * }
 */
export class CSVParser implements DataParser {
	private filePath: string = "";

	/**
	 * Checks if this parser can handle the given file.
	 *
	 * @param {string} filePath - Path to the file
	 * @returns {boolean} True if file is CSV or TSV
	 */
	canParse(filePath: string): boolean {
		this.filePath = filePath;
		const ext = filePath.toLowerCase();
		return ext.endsWith(".csv") || ext.endsWith(".tsv");
	}

	/**
	 * Detects the delimiter used in CSV content.
	 * Checks for common delimiters: comma, semicolon, tab, pipe.
	 *
	 * @param {string} content - First few lines of the CSV
	 * @returns {string} Detected delimiter
	 */
	private detectDelimiter(content: string): string {
		const firstLine = content.split("\n")[0] || "";
		const delimiters = [",", ";", "\t", "|"];
		const counts = delimiters.map((d) => ({
			delimiter: d,
			count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
		}));

		// TSV files default to tab
		if (this.filePath.toLowerCase().endsWith(".tsv")) {
			return "\t";
		}

		// Return the delimiter with the highest count
		counts.sort((a, b) => b.count - a.count);
		return counts[0].count > 0 ? counts[0].delimiter : ",";
	}

	/**
	 * Parses CSV/TSV content into structured data.
	 *
	 * @param {string | Buffer} content - Raw file content
	 * @param {CSVParseOptions} options - Parsing options
	 * @returns {Promise<ParsedData>} Parsed data with columns, rows, and inferred types
	 * @throws {Error} If parsing fails
	 */
	async parse(
		content: string | Buffer,
		options: CSVParseOptions = {},
	): Promise<ParsedData> {
		const strContent: string = Buffer.isBuffer(content)
			? content.toString("utf-8")
			: content;

		// Detect delimiter if not provided
		const delimiter = options.delimiter ?? this.detectDelimiter(strContent);
		const hasHeaders = options.hasHeaders ?? true;

		// Extract columns and rows
		let columns: string[];
		let rows: unknown[][];

		if (hasHeaders) {
			// When columns: true, records are objects
			const records = parse(strContent, {
				delimiter,
				columns: true,
				skip_empty_lines: options.skipEmptyLines ?? true,
				trim: true,
				relax_column_count: true,
				relax_quotes: true,
			}) as Record<string, unknown>[];

			if (records.length === 0) {
				return { columns: [], rows: [], inferredTypes: {} };
			}

			columns = Object.keys(records[0]);
			rows = records.map((record) => columns.map((col) => record[col]));
		} else {
			// When columns: false, records are arrays
			const rawRecords = parse(strContent, {
				delimiter,
				columns: false,
				skip_empty_lines: options.skipEmptyLines ?? true,
				trim: true,
				relax_column_count: true,
				relax_quotes: true,
			}) as string[][];

			if (rawRecords.length === 0) {
				return { columns: [], rows: [], inferredTypes: {} };
			}

			columns = rawRecords[0].map((_: unknown, i: number) => `column_${i + 1}`);
			rows = rawRecords;
		}

		// Infer types for each column
		const columnInfo = inferColumnTypes(columns, rows);
		const inferredTypes: Record<string, string> = {};
		for (const col of columnInfo) {
			inferredTypes[col.name] = col.type;
		}

		return {
			columns,
			rows,
			inferredTypes,
		};
	}
}
