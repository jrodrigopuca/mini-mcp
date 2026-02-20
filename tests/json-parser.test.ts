/**
 * @fileoverview Tests for JSON Parser
 * @module tests/json-parser.test
 */

import { describe, it, expect } from "vitest";
import { JSONParser } from "../src/parsers/json-parser.js";

describe("JSONParser", () => {
	const parser = new JSONParser();

	describe("canParse", () => {
		it("should return true for .json files", () => {
			expect(parser.canParse("data.json")).toBe(true);
			expect(parser.canParse("path/to/file.JSON")).toBe(true);
		});

		it("should return true for .jsonl files", () => {
			expect(parser.canParse("data.jsonl")).toBe(true);
			expect(parser.canParse("path/to/file.JSONL")).toBe(true);
		});

		it("should return false for other file types", () => {
			expect(parser.canParse("data.csv")).toBe(false);
			expect(parser.canParse("data.txt")).toBe(false);
			expect(parser.canParse("data.parquet")).toBe(false);
		});
	});

	describe("parse JSON array", () => {
		it("should parse simple JSON array", async () => {
			const content = JSON.stringify([
				{ name: "Alice", age: 30, city: "New York" },
				{ name: "Bob", age: 25, city: "Los Angeles" },
			]);

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age", "city"]);
			expect(result.rows).toHaveLength(2);
			expect(result.rows[0]).toEqual(["Alice", 30, "New York"]);
			expect(result.rows[1]).toEqual(["Bob", 25, "Los Angeles"]);
		});

		it("should handle objects with different keys", async () => {
			const content = JSON.stringify([
				{ name: "Alice", age: 30 },
				{ name: "Bob", city: "LA" },
				{ name: "Charlie", age: 35, city: "Chicago" },
			]);

			const result = await parser.parse(content);

			// Should include all unique keys
			expect(result.columns).toContain("name");
			expect(result.columns).toContain("age");
			expect(result.columns).toContain("city");
		});

		it("should handle nested objects", async () => {
			const content = JSON.stringify([
				{ name: "Alice", metadata: { role: "admin" } },
				{ name: "Bob", metadata: { role: "user" } },
			]);

			const result = await parser.parse(content);

			expect(result.columns).toContain("metadata");
			// Nested objects are kept as objects (not stringified)
			expect(typeof result.rows[0][1]).toBe("object");
		});

		it("should handle arrays in values", async () => {
			const content = JSON.stringify([
				{ name: "Alice", tags: ["admin", "active"] },
				{ name: "Bob", tags: ["user"] },
			]);

			const result = await parser.parse(content);

			expect(result.columns).toContain("tags");
			expect(Array.isArray(result.rows[0][1])).toBe(true);
		});

		it("should infer column types", async () => {
			const content = JSON.stringify([
				{ name: "Alice", age: 30, salary: 50000.5, active: true },
				{ name: "Bob", age: 25, salary: 60000.75, active: false },
			]);

			const result = await parser.parse(content);

			expect(result.inferredTypes).toBeDefined();
			expect(result.inferredTypes?.name).toBe("VARCHAR");
			expect(result.inferredTypes?.age).toBe("INTEGER");
			expect(result.inferredTypes?.salary).toBe("DOUBLE");
			expect(result.inferredTypes?.active).toBe("BOOLEAN");
		});
	});

	describe("parse JSON Lines (JSONL)", () => {
		it("should parse JSONL format", async () => {
			const content = `{"name": "Alice", "age": 30}
{"name": "Bob", "age": 25}
{"name": "Charlie", "age": 35}`;

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age"]);
			expect(result.rows).toHaveLength(3);
			expect(result.rows[0]).toEqual(["Alice", 30]);
		});

		it("should handle JSONL with different keys per line", async () => {
			const content = `{"name": "Alice", "age": 30}
{"name": "Bob", "city": "LA"}`;

			const result = await parser.parse(content);

			expect(result.columns).toContain("name");
			expect(result.columns).toContain("age");
			expect(result.columns).toContain("city");
		});
	});

	describe("error handling", () => {
		it("should throw on invalid JSON", async () => {
			const content = "not valid json";

			await expect(parser.parse(content)).rejects.toThrow();
		});

		it("should wrap single object in array", async () => {
			const content = JSON.stringify({ name: "Alice" });

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name"]);
			expect(result.rows).toHaveLength(1);
		});

		it("should return empty result for empty array", async () => {
			const content = "[]";

			const result = await parser.parse(content);

			expect(result.columns).toEqual([]);
			expect(result.rows).toHaveLength(0);
		});

		it("should handle Buffer input", async () => {
			const content = Buffer.from(JSON.stringify([{ name: "Alice" }]));

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name"]);
		});
	});
});
