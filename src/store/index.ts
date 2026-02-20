/**
 * @fileoverview DuckDB Store Module
 * @module store
 * @description Exports DuckDB store for in-memory data management.
 * Provides singleton access to the database instance.
 *
 * @example
 * import { getStore } from './store/index.js';
 *
 * const store = getStore();
 * await store.initialize();
 * const result = await store.executeQuery('SELECT * FROM table');
 */

export * from "./duckdb-store.js";
