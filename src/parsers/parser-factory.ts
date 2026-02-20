/**
 * @fileoverview Parser Factory
 * @module parsers/parser-factory
 * @description Factory module for selecting the appropriate parser
 * based on file extension. Provides a central registry of available parsers.
 */

import type { DataParser } from "../types/index.js";
import { CSVParser } from "./csv-parser.js";
import { JSONParser } from "./json-parser.js";
import { ParquetParser } from "./parquet-parser.js";

/**
 * Supported file format types.
 */
export type FileFormat = "csv" | "tsv" | "json" | "jsonl" | "parquet" | "unknown";

/**
 * Registry of available parsers.
 * Each parser is instantiated once and reused.
 *
 * @constant {DataParser[]}
 */
const parsers: DataParser[] = [new CSVParser(), new JSONParser(), new ParquetParser()];

/**
 * Detects file format from extension.
 *
 * @param {string} filePath - Path to the file
 * @returns {FileFormat} Detected file format
 *
 * @example
 * detectFormat('data.csv');      // 'csv'
 * detectFormat('data.json');     // 'json'
 * detectFormat('data.parquet');  // 'parquet'
 * detectFormat('data.txt');      // 'unknown'
 */
export function detectFormat(filePath: string): FileFormat {
	const ext = filePath.toLowerCase();

	if (ext.endsWith(".csv")) return "csv";
	if (ext.endsWith(".tsv")) return "tsv";
	if (ext.endsWith(".json")) return "json";
	if (ext.endsWith(".jsonl")) return "jsonl";
	if (ext.endsWith(".parquet") || ext.endsWith(".pq")) return "parquet";

	return "unknown";
}

/**
 * Gets the appropriate parser for a file.
 * Checks each registered parser in order until one claims the file.
 *
 * @param {string} filePath - Path to the file to parse
 * @returns {DataParser | null} Parser instance or null if no parser found
 *
 * @example
 * const parser = getParser('data.csv');
 * if (parser) {
 *   const data = await parser.parse(content);
 * }
 */
export function getParser(filePath: string): DataParser | null {
	for (const parser of parsers) {
		if (parser.canParse(filePath)) {
			return parser;
		}
	}
	return null;
}

/**
 * Gets list of supported file extensions.
 *
 * @returns {string[]} Array of supported extensions including the dot
 *
 * @example
 * getSupportedExtensions(); // ['.csv', '.tsv', '.json', '.jsonl', '.parquet', '.pq']
 */
export function getSupportedExtensions(): string[] {
	return [".csv", ".tsv", ".json", ".jsonl", ".parquet", ".pq"];
}
