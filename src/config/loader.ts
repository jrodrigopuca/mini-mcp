/**
 * @fileoverview Configuration loader for Mini-MCP
 * @module config/loader
 * @description Handles loading configuration from JSON files with fallback to defaults.
 * Implements a singleton pattern for caching the loaded configuration.
 *
 * Search Order:
 * 1. Explicit path passed to loadConfig()
 * 2. mini-mcp.config.json in current or parent directories
 * 3. .mini-mcp.json in current or parent directories
 * 4. mini-mcp.json in current or parent directories
 * 5. Default values from schema
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ConfigSchema, type Config } from "./schema.js";

/**
 * List of config filenames to search for, in priority order.
 * @constant {readonly string[]}
 */
const CONFIG_FILENAMES = [
	"mini-mcp.config.json",
	".mini-mcp.json",
	"mini-mcp.json",
];

/**
 * Cached configuration singleton.
 * @type {Config | null}
 */
let cachedConfig: Config | null = null;

/**
 * Searches for a config file starting from the given directory and moving up.
 * Stops at the filesystem root.
 *
 * @param {string} [startDir=process.cwd()] - Directory to start searching from
 * @returns {string | null} Absolute path to config file, or null if not found
 *
 * @example
 * // Search from current directory
 * const configPath = findConfigFile();
 *
 * // Search from specific directory
 * const configPath = findConfigFile('/path/to/project');
 */
function findConfigFile(startDir: string = process.cwd()): string | null {
	let currentDir = startDir;

	while (currentDir !== "/") {
		for (const filename of CONFIG_FILENAMES) {
			const configPath = resolve(currentDir, filename);
			if (existsSync(configPath)) {
				return configPath;
			}
		}
		currentDir = resolve(currentDir, "..");
	}

	return null;
}

/**
 * Loads and validates configuration from file or returns defaults.
 * The result is cached for subsequent calls.
 *
 * @param {string} [configPath] - Optional explicit path to config file
 * @returns {Config} Validated configuration object
 * @throws {never} Does not throw - returns defaults on error
 *
 * @example
 * // Load from default locations
 * const config = loadConfig();
 *
 * // Load from specific file
 * const config = loadConfig('./custom-config.json');
 */
export function loadConfig(configPath?: string): Config {
	if (cachedConfig) {
		return cachedConfig;
	}

	const resolvedPath = configPath || findConfigFile();

	if (resolvedPath && existsSync(resolvedPath)) {
		try {
			const rawConfig = JSON.parse(readFileSync(resolvedPath, "utf-8"));
			cachedConfig = ConfigSchema.parse(rawConfig);
			console.error(`Loaded config from: ${resolvedPath}`);
		} catch (error) {
			console.error(`Failed to load config from ${resolvedPath}:`, error);
			cachedConfig = ConfigSchema.parse({});
		}
	} else {
		console.error("No config file found, using defaults");
		cachedConfig = ConfigSchema.parse({});
	}

	return cachedConfig;
}

/**
 * Gets the current configuration, loading it if not already loaded.
 * Use this function for read access to config throughout the application.
 *
 * @returns {Config} The current configuration object
 *
 * @example
 * const { security, limits } = getConfig();
 * if (security.readOnly) {
 *   // Handle read-only mode
 * }
 */
export function getConfig(): Config {
	if (!cachedConfig) {
		return loadConfig();
	}
	return cachedConfig;
}

/**
 * Resets the cached configuration.
 * Primarily used for testing to allow reloading config between tests.
 *
 * @returns {void}
 *
 * @example
 * // In test setup
 * beforeEach(() => {
 *   resetConfig();
 * });
 */
export function resetConfig(): void {
	cachedConfig = null;
}
