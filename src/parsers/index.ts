/**
 * @fileoverview Parsers Module
 * @module parsers
 * @description Exports data file parsers for different formats.
 * Supports CSV, TSV, JSON, and Parquet files.
 *
 * @example
 * import { getParser } from './parsers/index.js';
 *
 * const parser = getParser('./data/file.csv');
 * if (parser) {
 *   const data = await parser.parse(content);
 * }
 */

export * from "./csv-parser.js";
export * from "./json-parser.js";
export * from "./parser-factory.js";
