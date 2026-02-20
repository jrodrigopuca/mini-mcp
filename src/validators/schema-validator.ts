/**
 * @fileoverview Schema Validator
 * @module validators/schema-validator
 * @description Infers and validates data schemas before loading into DuckDB.
 * Performs type inference from sample data and validates data integrity.
 *
 * Type Inference Strategy:
 * 1. Sample first N rows (configurable)
 * 2. Attempt to parse each value as different types
 * 3. Choose the most specific type that fits all values
 *
 * Type Priority (most to least specific):
 * - BOOLEAN
 * - INTEGER
 * - BIGINT
 * - DOUBLE
 * - DATE
 * - TIMESTAMP
 * - VARCHAR (fallback)
 */

import type { ColumnInfo } from "../types/index.js";

// ============================================================================
// Type Detection Helpers
// ============================================================================

/** Pattern for ISO date format YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Pattern for ISO timestamp format */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

/** Boolean true values */
const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

/** Boolean false values */
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

/**
 * Checks if a value is null or undefined or empty string.
 */
function isNullish(value: unknown): boolean {
	return value === null || value === undefined || value === "";
}

/**
 * Checks if a value can be parsed as a boolean.
 */
function isBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return true;
	if (typeof value === "string") {
		const lower = value.toLowerCase();
		return TRUE_VALUES.has(lower) || FALSE_VALUES.has(lower);
	}
	return false;
}

/**
 * Checks if a value can be parsed as an integer.
 */
function isInteger(value: unknown): boolean {
	if (typeof value === "number") {
		return Number.isInteger(value);
	}
	if (typeof value === "string") {
		const num = Number(value);
		return !isNaN(num) && Number.isInteger(num);
	}
	return false;
}

/**
 * Checks if a value requires BIGINT (larger than 32-bit).
 */
function requiresBigInt(value: unknown): boolean {
	const num = Number(value);
	return (
		!isNaN(num) &&
		Number.isInteger(num) &&
		(num > 2147483647 || num < -2147483648)
	);
}

/**
 * Checks if a value can be parsed as a double.
 */
function isDouble(value: unknown): boolean {
	if (typeof value === "number") return true;
	if (typeof value === "string") {
		const num = Number(value);
		return !isNaN(num);
	}
	return false;
}

/**
 * Checks if a value matches the DATE pattern.
 */
function isDate(value: unknown): boolean {
	if (typeof value === "string") {
		return DATE_PATTERN.test(value);
	}
	return false;
}

/**
 * Checks if a value matches the TIMESTAMP pattern.
 */
function isTimestamp(value: unknown): boolean {
	if (typeof value === "string") {
		return TIMESTAMP_PATTERN.test(value);
	}
	return false;
}

// ============================================================================
// Type Inference
// ============================================================================

/**
 * Infers the best DuckDB type for an array of values.
 * Uses a priority-based system to find the most specific type.
 *
 * @param {unknown[]} values - Array of values to analyze
 * @returns {string} The inferred DuckDB type name
 *
 * @example
 * inferDuckDBType([1, 2, 3])          // 'INTEGER'
 * inferDuckDBType([1.5, 2.0, 3.14])   // 'DOUBLE'
 * inferDuckDBType(['a', 'b', 'c'])    // 'VARCHAR'
 * inferDuckDBType([true, false])      // 'BOOLEAN'
 */
export function inferDuckDBType(values: unknown[]): string {
	// Filter out nullish values for type detection
	const nonNullValues = values.filter((v) => !isNullish(v));

	// If all values are null, default to VARCHAR
	if (nonNullValues.length === 0) {
		return "VARCHAR";
	}

	// Check for BOOLEAN first (most specific)
	if (nonNullValues.every(isBoolean)) {
		return "BOOLEAN";
	}

	// Check for INTEGER/BIGINT
	if (nonNullValues.every(isInteger)) {
		// Check if any value requires BIGINT
		if (nonNullValues.some(requiresBigInt)) {
			return "BIGINT";
		}
		return "INTEGER";
	}

	// Check for DOUBLE (includes integers)
	if (nonNullValues.every(isDouble)) {
		return "DOUBLE";
	}

	// Check for DATE (YYYY-MM-DD only)
	if (nonNullValues.every(isDate)) {
		return "DATE";
	}

	// Check for TIMESTAMP
	if (nonNullValues.every(isTimestamp)) {
		return "TIMESTAMP";
	}

	// Default to VARCHAR for everything else
	return "VARCHAR";
}

/**
 * Infers column types from data.
 * Analyzes sample data to determine the best DuckDB type for each column.
 *
 * @param {string[]} columns - Array of column names
 * @param {unknown[][]} rows - 2D array of row data
 * @param {number} sampleSize - Number of rows to sample (default: all rows, max 1000)
 * @returns {ColumnInfo[]} Array of column info with inferred types
 *
 * @example
 * const info = inferColumnTypes(
 *   ['id', 'name', 'active'],
 *   [[1, 'Alice', true], [2, 'Bob', false]]
 * );
 * // Returns: [{ name: 'id', type: 'INTEGER', nullable: false }, ...]
 */
export function inferColumnTypes(
	columns: string[],
	rows: unknown[][],
	sampleSize: number = 1000,
): ColumnInfo[] {
	// Use a sample of rows for performance
	const sample = rows.slice(0, Math.min(sampleSize, rows.length));

	return columns.map((name, colIndex) => {
		// Extract all values for this column
		const values = sample.map((row) => row[colIndex]);

		// Check if column has any null values
		const hasNulls = values.some(isNullish);

		// Infer type
		const type = inferDuckDBType(values);

		return {
			name,
			type,
			nullable: hasNulls,
		};
	});
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validates a single value against an expected type.
 *
 * @param {unknown} value - Value to validate
 * @param {string} expectedType - Expected DuckDB type
 * @returns {boolean} True if value is valid for the type
 */
function validateValue(value: unknown, expectedType: string): boolean {
	// Null is always valid if nullable
	if (isNullish(value)) {
		return true;
	}

	switch (expectedType) {
		case "BOOLEAN":
			return isBoolean(value);
		case "INTEGER":
			return isInteger(value) && !requiresBigInt(value);
		case "BIGINT":
			return isInteger(value);
		case "DOUBLE":
			return isDouble(value);
		case "DATE":
			return isDate(value);
		case "TIMESTAMP":
			return isTimestamp(value);
		case "VARCHAR":
			return true; // Everything can be a string
		default:
			return true;
	}
}

/**
 * Validates data against an expected schema.
 * Checks that each row conforms to the expected column types.
 *
 * @param {unknown[][]} data - 2D array of row data to validate
 * @param {ColumnInfo[]} expectedSchema - Expected column schema
 * @param {number} maxErrors - Maximum number of errors to collect (default: 10)
 * @returns {{ valid: boolean; errors: string[] }} Validation result with any errors
 *
 * @example
 * const result = validateSchema(
 *   [[1, 'Alice'], ['invalid', 'Bob']],  // 'invalid' is not a number
 *   [{ name: 'id', type: 'INTEGER', nullable: false }, ...]
 * );
 * // Returns: { valid: false, errors: ['Row 2, column "id": expected INTEGER'] }
 */
export function validateSchema(
	data: unknown[][],
	expectedSchema: ColumnInfo[],
	maxErrors: number = 10,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	for (
		let rowIndex = 0;
		rowIndex < data.length && errors.length < maxErrors;
		rowIndex++
	) {
		const row = data[rowIndex];

		for (
			let colIndex = 0;
			colIndex < expectedSchema.length && errors.length < maxErrors;
			colIndex++
		) {
			const schema = expectedSchema[colIndex];
			const value = row[colIndex];

			// Check nullable constraint
			if (!schema.nullable && isNullish(value)) {
				errors.push(
					`Row ${rowIndex + 1}, column "${schema.name}": NULL not allowed`,
				);
				continue;
			}

			// Check type
			if (!validateValue(value, schema.type)) {
				errors.push(
					`Row ${rowIndex + 1}, column "${schema.name}": expected ${schema.type}, got "${value}"`,
				);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
