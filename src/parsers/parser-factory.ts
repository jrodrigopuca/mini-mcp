/**
 * @fileoverview Parser Factory
 * @module parsers/parser-factory
 * @description Factory module for selecting the appropriate parser
 * based on file extension. Provides a central registry of available parsers.
 *
 * @todo Implement in Phase 4
 */

import type { DataParser } from "../types/index.js";
import { CSVParser } from "./csv-parser.js";
import { JSONParser } from "./json-parser.js";

/**
 * Registry of available parsers.
 * Each parser is instantiated once and reused.
 *
 * @constant {DataParser[]}
 */
const parsers: DataParser[] = [new CSVParser(), new JSONParser()];

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
 * getSupportedExtensions(); // ['.csv', '.tsv', '.json', '.parquet']
 */
export function getSupportedExtensions(): string[] {
	return [".csv", ".tsv", ".json", ".parquet"];
}
