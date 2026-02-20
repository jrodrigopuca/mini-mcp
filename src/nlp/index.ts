/**
 * @fileoverview NLP Module
 * @module nlp
 * @description Exports natural language processing utilities.
 * Handles translation from natural language to SQL.
 *
 * @example
 * import { translateToSQL } from './nlp/index.js';
 *
 * const result = translateToSQL('show top 5 by sales', tableMetadata);
 * // result.sql === 'SELECT * FROM table ORDER BY sales DESC LIMIT 5'
 */

export * from "./nl-to-sql.js";
