/**
 * @fileoverview Tests for Parser Factory
 * @module tests/parser-factory.test
 */

import { describe, it, expect } from "vitest";
import {
	getParser,
	getSupportedExtensions,
	detectFormat,
} from "../src/parsers/parser-factory.js";
import { CSVParser } from "../src/parsers/csv-parser.js";
import { JSONParser } from "../src/parsers/json-parser.js";
import { ParquetParser } from "../src/parsers/parquet-parser.js";

describe("Parser Factory", () => {
	describe("detectFormat", () => {
		it("should detect CSV format", () => {
			expect(detectFormat("data.csv")).toBe("csv");
			expect(detectFormat("path/to/file.CSV")).toBe("csv");
		});

		it("should detect TSV format", () => {
			expect(detectFormat("data.tsv")).toBe("tsv");
			expect(detectFormat("path/to/file.TSV")).toBe("tsv");
		});

		it("should detect JSON format", () => {
			expect(detectFormat("data.json")).toBe("json");
			expect(detectFormat("path/to/file.JSON")).toBe("json");
		});

		it("should detect JSONL format", () => {
			expect(detectFormat("data.jsonl")).toBe("jsonl");
			expect(detectFormat("path/to/file.JSONL")).toBe("jsonl");
		});

		it("should detect Parquet format", () => {
			expect(detectFormat("data.parquet")).toBe("parquet");
			expect(detectFormat("data.pq")).toBe("parquet");
			expect(detectFormat("path/to/file.PARQUET")).toBe("parquet");
		});

		it("should return unknown for unsupported formats", () => {
			expect(detectFormat("data.txt")).toBe("unknown");
			expect(detectFormat("data.xlsx")).toBe("unknown");
			expect(detectFormat("data")).toBe("unknown");
		});
	});

	describe("getParser", () => {
		it("should return CSVParser for CSV files", () => {
			const parser = getParser("data.csv");
			expect(parser).toBeInstanceOf(CSVParser);
		});

		it("should return CSVParser for TSV files", () => {
			const parser = getParser("data.tsv");
			expect(parser).toBeInstanceOf(CSVParser);
		});

		it("should return JSONParser for JSON files", () => {
			const parser = getParser("data.json");
			expect(parser).toBeInstanceOf(JSONParser);
		});

		it("should return JSONParser for JSONL files", () => {
			const parser = getParser("data.jsonl");
			expect(parser).toBeInstanceOf(JSONParser);
		});

		it("should return ParquetParser for Parquet files", () => {
			const parser = getParser("data.parquet");
			expect(parser).toBeInstanceOf(ParquetParser);

			const parserPQ = getParser("data.pq");
			expect(parserPQ).toBeInstanceOf(ParquetParser);
		});

		it("should return null for unsupported files", () => {
			expect(getParser("data.txt")).toBeNull();
			expect(getParser("data.xlsx")).toBeNull();
		});
	});

	describe("getSupportedExtensions", () => {
		it("should return all supported extensions", () => {
			const extensions = getSupportedExtensions();

			expect(extensions).toContain(".csv");
			expect(extensions).toContain(".tsv");
			expect(extensions).toContain(".json");
			expect(extensions).toContain(".jsonl");
			expect(extensions).toContain(".parquet");
			expect(extensions).toContain(".pq");
		});

		it("should return extensions with leading dot", () => {
			const extensions = getSupportedExtensions();

			for (const ext of extensions) {
				expect(ext.startsWith(".")).toBe(true);
			}
		});
	});
});
