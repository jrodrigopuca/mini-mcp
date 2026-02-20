/**
 * @fileoverview Tests for CSV Parser
 * @module tests/csv-parser.test
 */

import { describe, it, expect } from "vitest";
import { CSVParser } from "../src/parsers/csv-parser.js";

describe("CSVParser", () => {
	const parser = new CSVParser();

	describe("canParse", () => {
		it("should return true for .csv files", () => {
			expect(parser.canParse("data.csv")).toBe(true);
			expect(parser.canParse("path/to/file.CSV")).toBe(true);
		});

		it("should return true for .tsv files", () => {
			expect(parser.canParse("data.tsv")).toBe(true);
			expect(parser.canParse("path/to/file.TSV")).toBe(true);
		});

		it("should return false for other file types", () => {
			expect(parser.canParse("data.json")).toBe(false);
			expect(parser.canParse("data.txt")).toBe(false);
			expect(parser.canParse("data.parquet")).toBe(false);
		});
	});

	describe("parse", () => {
		it("should parse simple CSV with headers", async () => {
			const content = `name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago`;

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age", "city"]);
			expect(result.rows).toHaveLength(3);
			expect(result.rows[0]).toEqual(["Alice", "30", "New York"]);
			expect(result.rows[1]).toEqual(["Bob", "25", "Los Angeles"]);
			expect(result.rows[2]).toEqual(["Charlie", "35", "Chicago"]);
		});

		it("should detect and parse semicolon-delimited CSV", async () => {
			const content = `name;age;city
Alice;30;New York
Bob;25;Los Angeles`;

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age", "city"]);
			expect(result.rows).toHaveLength(2);
		});

		it("should parse TSV files", async () => {
			parser.canParse("data.tsv"); // Set the file path context
			const content = `name\tage\tcity
Alice\t30\tNew York
Bob\t25\tLos Angeles`;

			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age", "city"]);
			expect(result.rows).toHaveLength(2);
		});

		it("should handle quoted fields with commas", async () => {
			parser.canParse("data.csv"); // Set CSV context for comma delimiter
			const content = `name,description,price
"Widget A","A nice, shiny widget",19.99
"Widget B","Another widget",29.99`;

			const result = await parser.parse(content);

			expect(result.rows[0]).toEqual([
				"Widget A",
				"A nice, shiny widget",
				"19.99",
			]);
		});

		it("should handle empty content", async () => {
			const content = "";

			const result = await parser.parse(content);

			expect(result.columns).toEqual([]);
			expect(result.rows).toHaveLength(0);
		});

		it("should infer column types", async () => {
			parser.canParse("data.csv"); // Set CSV context
			const content = `name,age,salary,active
Alice,30,50000.50,true
Bob,25,60000.75,false`;

			const result = await parser.parse(content);

			expect(result.inferredTypes).toBeDefined();
			// inferredTypes is Record<string, string> with column name as key
			expect(result.inferredTypes["name"]).toBe("VARCHAR");
			expect(result.inferredTypes["age"]).toBe("INTEGER");
			expect(result.inferredTypes["salary"]).toBe("DOUBLE");
			expect(result.inferredTypes["active"]).toBe("BOOLEAN");
		});

		it("should handle CSV without headers", async () => {
			parser.canParse("data.csv"); // Set CSV context
			const content = `Alice,30,New York
Bob,25,Los Angeles`;

			const result = await parser.parse(content, { hasHeaders: false });

			// Without headers, first row determines columns and all rows are data
			expect(result.columns).toEqual(["column_1", "column_2", "column_3"]);
			expect(result.rows).toHaveLength(2);
			expect(result.rows[0]).toEqual(["Alice", "30", "New York"]);
		});

		it("should skip empty lines", async () => {
			const content = `name,age

Alice,30

Bob,25
`;

			const result = await parser.parse(content);

			expect(result.rows).toHaveLength(2);
		});

		it("should handle Buffer input", async () => {
			const content = Buffer.from("name,age\nAlice,30");

			// First set up canParse to establish file context
			parser.canParse("data.csv");
			const result = await parser.parse(content);

			expect(result.columns).toEqual(["name", "age"]);
			expect(result.rows).toHaveLength(1);
		});
	});
});
