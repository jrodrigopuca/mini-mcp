/**
 * @fileoverview Configuration schema definitions using Zod
 * @module config/schema
 * @description Defines the validation schemas for Mini-MCP configuration.
 * Uses Zod for runtime type validation and TypeScript type inference.
 *
 * Configuration Hierarchy:
 * 1. Default values (defined here)
 * 2. Config file (mini-mcp.config.json)
 * 3. Environment variables (future)
 *
 * @see {@link ../types/index.ts} for the corresponding TypeScript interfaces
 */

import { z } from "zod";

/**
 * Security configuration schema.
 * Validates security-related settings with sensible defaults.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @property {boolean} readOnly - Blocks write operations (default: true)
 * @property {string[]} allowedPaths - Allowed file paths (default: ['./data', './'])
 * @property {boolean} allowNetworkPaths - Allow network paths (default: false)
 * @property {number} maxFileSizeMB - Max file size 1-1000 MB (default: 100)
 */
export const SecurityConfigSchema = z.object({
	readOnly: z.boolean().default(true),
	allowedPaths: z.array(z.string()).default(["./data", "./"]),
	allowNetworkPaths: z.boolean().default(false),
	maxFileSizeMB: z.number().min(1).max(1000).default(100),
});

/**
 * Resource limits configuration schema.
 * Prevents excessive resource usage.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @property {number} maxRowsOutput - Max rows in output 1-100000 (default: 1000)
 * @property {number} maxOutputChars - Max output chars 1000-500000 (default: 50000)
 * @property {number} queryTimeoutMs - Query timeout 1000-300000 ms (default: 30000)
 * @property {number} maxTablesLoaded - Max loaded tables 1-100 (default: 10)
 */
export const LimitsConfigSchema = z.object({
	maxRowsOutput: z.number().min(1).max(100000).default(1000),
	maxOutputChars: z.number().min(1000).max(500000).default(50000),
	queryTimeoutMs: z.number().min(1000).max(300000).default(30000),
	maxTablesLoaded: z.number().min(1).max(100).default(10),
});

/**
 * DuckDB engine configuration schema.
 * Controls DuckDB resource allocation.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @property {number} memoryLimitMB - Memory limit 64-8192 MB (default: 512)
 * @property {number} threads - Worker threads 1-16 (default: 2)
 */
export const DuckDBConfigSchema = z.object({
	memoryLimitMB: z.number().min(64).max(8192).default(512),
	threads: z.number().min(1).max(16).default(2),
});

/**
 * Output formatting configuration schema.
 * Controls default output behavior.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @property {'csv' | 'json' | 'markdown'} defaultFormat - Default export format (default: 'markdown')
 * @property {boolean} includeRowCount - Include row count in output (default: true)
 */
export const OutputConfigSchema = z.object({
	defaultFormat: z.enum(["csv", "json", "markdown"]).default("markdown"),
	includeRowCount: z.boolean().default(true),
});

/**
 * Complete configuration schema.
 * Aggregates all configuration sections.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Validate a config object
 * const config = ConfigSchema.parse({
 *   security: { readOnly: true },
 *   limits: { maxRowsOutput: 500 }
 * });
 */
export const ConfigSchema = z.object({
	security: SecurityConfigSchema.default({}),
	limits: LimitsConfigSchema.default({}),
	duckdb: DuckDBConfigSchema.default({}),
	output: OutputConfigSchema.default({}),
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

/** Security configuration type inferred from schema */
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

/** Resource limits type inferred from schema */
export type LimitsConfig = z.infer<typeof LimitsConfigSchema>;

/** DuckDB configuration type inferred from schema */
export type DuckDBConfig = z.infer<typeof DuckDBConfigSchema>;

/** Output configuration type inferred from schema */
export type OutputConfig = z.infer<typeof OutputConfigSchema>;

/** Complete configuration type inferred from schema */
export type Config = z.infer<typeof ConfigSchema>;
