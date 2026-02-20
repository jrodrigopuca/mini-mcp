/**
 * @fileoverview Validators Module
 * @module validators
 * @description Exports schema inference and validation utilities.
 * Used to determine data types before loading into DuckDB.
 *
 * @example
 * import { inferColumnTypes, validateSchema } from './validators/index.js';
 *
 * const types = inferColumnTypes(columns, rows);
 * const result = validateSchema(data, expectedSchema);
 */

export * from "./schema-validator.js";
