/**
 * @fileoverview Configuration Module
 * @module config
 * @description Exports configuration schema and loader utilities.
 * Handles loading and validating mini-mcp configuration.
 *
 * @example
 * import { getConfig, loadConfig } from './config/index.js';
 *
 * // Get current config (lazy loads if needed)
 * const config = getConfig();
 *
 * // Or explicitly load from a specific path
 * const config = loadConfig('./custom-config.json');
 */

export * from "./schema.js";
export * from "./loader.js";
