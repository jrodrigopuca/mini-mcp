/**
 * @fileoverview JSON Parser
 * @module parsers/json-parser
 * @description Parses JSON array files into structured data.
 * Supports both standard JSON arrays and JSON Lines (JSONL) format.
 *
 * Supported formats:
 * - JSON array: [{...}, {...}, ...]
 * - JSON Lines: {...}\n{...}\n...
 */

import type { DataParser, ParsedData } from "../types/index.js";
import { inferColumnTypes } from "../validators/schema-validator.js";

/**
 * Parser for JSON and JSONL files.
 * Implements the DataParser interface for modular parsing.
 *
 * @class JSONParser
 * @implements {DataParser}
 *
 * @example
 * const parser = new JSONParser();
 * if (parser.canParse('data.json')) {
 *   const data = await parser.parse(fileContent);
 * }
 */
export class JSONParser implements DataParser {
	/**
	 * Checks if this parser can handle the given file.
	 *
	 * @param {string} filePath - Path to the file
	 * @returns {boolean} True if file is JSON or JSONL
	 */
	canParse(filePath: string): boolean {
		const ext = filePath.toLowerCase();
		return ext.endsWith(".json") || ext.endsWith(".jsonl");
	}

	/**
	 * Detects if content is JSON Lines format.
	 *
	 * @param {string} content - File content
	 * @returns {boolean} True if JSONL format
	 */
	private isJSONLines(content: string): boolean {
		const trimmed = content.trim();
		// JSONL starts with { and has multiple lines starting with {
		if (!trimmed.startsWith("{")) {
			return false;
		}
		const lines = trimmed.split("\n").filter((l) => l.trim());
		return lines.length > 1 && lines.every((l) => l.trim().startsWith("{"));
	}

	/**
	 * Parses JSON Lines format.
	 *
	 * @param {string} content - JSONL content
	 * @returns {Record<string, unknown>[]} Array of parsed objects
	 */
	private parseJSONLines(content: string): Record<string, unknown>[] {
		const lines = content
			.trim()
			.split("\n")
			.filter((l) => l.trim());
		return lines.map((line, idx) => {
			try {
				return JSON.parse(line);
			} catch (e) {
				throw new Error(`Failed to parse JSON at line ${idx + 1}: ${e}`);
			}
		});
	}

	/**
	 * Extracts all unique keys from an array of objects.
	 *
	 * @param {Record<string, unknown>[]} objects - Array of objects
	 * @returns {string[]} Unique keys in order of first appearance
	 */
	private extractColumns(objects: Record<string, unknown>[]): string[] {
		const seen = new Set<string>();
		const columns: string[] = [];

		for (const obj of objects) {
			for (const key of Object.keys(obj)) {
				if (!seen.has(key)) {
					seen.add(key);
					columns.push(key);
				}
			}
		}

		return columns;
	}

	/**
	 * Parses JSON content into structured data.
	 * Automatically detects JSON array vs JSON Lines format.
	 *
	 * @param {string | Buffer} content - Raw file content
	 * @returns {Promise<ParsedData>} Parsed data with columns, rows, and inferred types
	 * @throws {Error} If content is not valid JSON or not an array of objects
	 */
	async parse(content: string | Buffer): Promise<ParsedData> {
		const strContent: string = Buffer.isBuffer(content) ? content.toString("utf-8") : content;
		const trimmed = strContent.trim();

		if (!trimmed) {
			return {
				columns: [],
				rows: [],
				inferredTypes: {},
			};
		}

		let objects: Record<string, unknown>[];

		try {
			if (this.isJSONLines(trimmed)) {
				objects = this.parseJSONLines(trimmed);
			} else {
				const parsed = JSON.parse(trimmed);

				// Handle JSON array
				if (Array.isArray(parsed)) {
					objects = parsed;
				} else if (typeof parsed === "object" && parsed !== null) {
					// Single object - wrap in array
					objects = [parsed];
				} else {
					throw new Error("JSON must be an array of objects or a single object");
				}
			}
		} catch (e) {
			if (e instanceof SyntaxError) {
				throw new Error(`Invalid JSON: ${e.message}`);
			}
			throw e;
		}

		if (objects.length === 0) {
			return {
				columns: [],
				rows: [],
				inferredTypes: {},
			};
		}

		// Extract columns from all objects
		const columns = this.extractColumns(objects);

		// Convert objects to rows
		const rows = objects.map((obj) => columns.map((col) => obj[col] ?? null));

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
