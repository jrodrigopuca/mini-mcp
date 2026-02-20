/**
 * @fileoverview Tests for DuckDB Store
 * @module tests/duckdb-store.test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getStore } from "../src/store/duckdb-store.js";

describe("DuckDBStore", () => {
	const store = getStore();

	beforeAll(async () => {
		await store.initialize();
	});

	describe("initialize", () => {
		it("should initialize without errors", async () => {
			// Store is already initialized in beforeAll
			// Calling again should be idempotent
			await expect(store.initialize()).resolves.not.toThrow();
		});
	});

	describe("loadTable", () => {
		it("should load a simple table", async () => {
			const columns = ["name", "age", "city"];
			const rows = [
				["Alice", 30, "New York"],
				["Bob", 25, "Los Angeles"],
				["Charlie", 35, "Chicago"],
			];

			const metadata = await store.loadTable(
				"test_users",
				columns,
				rows,
				"./test.csv",
			);

			expect(metadata.name).toBe("test_users");
			expect(metadata.columns).toHaveLength(3);
			expect(metadata.rowCount).toBe(3);
		});

		it("should infer correct column types", async () => {
			const columns = ["id", "name", "price", "active", "created_date"];
			const rows = [
				[1, "Product A", 19.99, true, "2024-01-15"],
				[2, "Product B", 29.99, false, "2024-02-20"],
			];

			const metadata = await store.loadTable(
				"test_products",
				columns,
				rows,
				"./products.csv",
			);

			const idCol = metadata.columns.find((c) => c.name === "id");
			const priceCol = metadata.columns.find((c) => c.name === "price");
			const activeCol = metadata.columns.find((c) => c.name === "active");
			const dateCol = metadata.columns.find((c) => c.name === "created_date");

			expect(idCol?.type).toBe("INTEGER");
			expect(priceCol?.type).toBe("DOUBLE");
			expect(activeCol?.type).toBe("BOOLEAN");
			expect(dateCol?.type).toBe("DATE");
		});

		it("should handle tables with special characters in names", async () => {
			const columns = ["value"];
			const rows = [[1], [2]];

			const metadata = await store.loadTable(
				"test-with-dashes",
				columns,
				rows,
				"./test.csv",
			);

			expect(metadata.name).toBe("test_with_dashes"); // Sanitized
		});
	});

	describe("executeQuery", () => {
		it("should execute a simple SELECT query", async () => {
			const result = await store.executeQuery("SELECT * FROM test_users");

			expect(result.columns).toContain("name");
			expect(result.rows).toHaveLength(3);
		});

		it("should execute a query with WHERE clause", async () => {
			const result = await store.executeQuery(
				"SELECT * FROM test_users WHERE age > 28",
			);

			expect(result.rows).toHaveLength(2);
		});

		it("should execute aggregate queries", async () => {
			const result = await store.executeQuery(
				"SELECT AVG(age) as avg_age FROM test_users",
			);

			expect(result.rows).toHaveLength(1);
			expect(Number(result.rows[0][0])).toBe(30); // (30 + 25 + 35) / 3
		});

		it("should handle query errors gracefully", async () => {
			await expect(
				store.executeQuery("SELECT * FROM nonexistent_table"),
			).rejects.toThrow();
		});

		it("should respect row limits", async () => {
			// Create a larger table
			const columns = ["id"];
			const rows = Array.from({ length: 100 }, (_, i) => [i]);
			await store.loadTable("test_large", columns, rows, "./large.csv");

			// Query with explicit limit
			const result = await store.executeQuery(
				"SELECT * FROM test_large LIMIT 10",
			);
			expect(result.rows).toHaveLength(10);
		});
	});

	describe("getTableStats", () => {
		it("should return statistics for a table", async () => {
			const stats = await store.getTableStats("test_users");

			expect(stats.tableName).toBe("test_users");
			expect(stats.rowCount).toBe(3);
			expect(stats.columns).toHaveLength(3);
		});

		it("should include column statistics", async () => {
			const stats = await store.getTableStats("test_users");
			const ageStats = stats.columns.find((c) => c.name === "age");

			expect(ageStats).toBeDefined();
			expect(ageStats?.min).toBe(25);
			expect(ageStats?.max).toBe(35);
			expect(ageStats?.nullCount).toBe(0);
		});

		it("should throw for nonexistent table", async () => {
			await expect(store.getTableStats("nonexistent")).rejects.toThrow();
		});
	});

	describe("listTables", () => {
		it("should list all loaded tables", () => {
			const tables = store.listTables();

			// listTables returns TableMetadata[], not strings
			const tableNames = tables.map((t) => t.name);
			expect(tableNames).toContain("test_users");
			expect(tableNames).toContain("test_products");
		});
	});

	describe("dropTable", () => {
		it("should drop an existing table", async () => {
			await store.loadTable("test_to_drop", ["x"], [[1]], "./drop.csv");
			expect(store.listTables().map((t) => t.name)).toContain("test_to_drop");

			const dropped = await store.dropTable("test_to_drop");
			expect(dropped).toBe(true);
			expect(store.listTables().map((t) => t.name)).not.toContain(
				"test_to_drop",
			);
		});

		it("should return false for nonexistent table", async () => {
			const dropped = await store.dropTable("nonexistent");
			expect(dropped).toBe(false);
		});
	});

	describe("getTable", () => {
		it("should return metadata for existing table", () => {
			const metadata = store.getTable("test_users");

			expect(metadata).toBeDefined();
			expect(metadata?.name).toBe("test_users");
			expect(metadata?.columns).toHaveLength(3);
		});

		it("should return undefined for nonexistent table", () => {
			const metadata = store.getTable("nonexistent");
			expect(metadata).toBeUndefined();
		});
	});
});
