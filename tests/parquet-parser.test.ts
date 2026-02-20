/**
 * @fileoverview Tests for Parquet Parser
 * @module tests/parquet-parser.test
 */

import { describe, it, expect } from "vitest";
import { ParquetParser } from "../src/parsers/parquet-parser.js";

describe("ParquetParser", () => {
	const parser = new ParquetParser();

	describe("canParse", () => {
		it("should return true for .parquet files", () => {
			expect(parser.canParse("data.parquet")).toBe(true);
			expect(parser.canParse("path/to/file.PARQUET")).toBe(true);
		});

		it("should return true for .pq files", () => {
			expect(parser.canParse("data.pq")).toBe(true);
			expect(parser.canParse("path/to/file.PQ")).toBe(true);
		});

		it("should return false for other file types", () => {
			expect(parser.canParse("data.csv")).toBe(false);
			expect(parser.canParse("data.json")).toBe(false);
			expect(parser.canParse("data.txt")).toBe(false);
		});
	});

	describe("parse", () => {
		it("should throw error when no file path provided", async () => {
			await expect(parser.parse("")).rejects.toThrow("requires a file path");
		});

		it("should throw error for non-existent file", async () => {
			await expect(
				parser.parse("/nonexistent/path/data.parquet", {
					filePath: "/nonexistent/path/data.parquet",
				}),
			).rejects.toThrow();
		});
	});
});
