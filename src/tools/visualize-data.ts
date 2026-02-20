/**
 * @fileoverview visualize_data MCP Tool Implementation
 * @module tools/visualize-data
 * @description Creates chart visualizations from query results.
 * Supports ASCII charts for terminal display and Mermaid for rich rendering.
 *
 * Supported Charts:
 * - Bar chart: Categorical comparisons
 * - Pie chart: Part-of-whole relationships
 * - Line chart: Time series and trends
 * - Auto: Automatically selects best chart type
 *
 * Output Formats:
 * - ASCII: Text-based charts for terminal
 * - Mermaid: Markdown-compatible diagrams
 */

import { validateQuery } from "../security/validator.js";
import { getStore } from "../store/duckdb-store.js";
import type { ChartFormat, ChartType } from "../types/index.js";

/**
 * Arguments for the visualize_data tool.
 *
 * @interface VisualizeDataArgs
 * @property {string} source - Table name or SQL query for data
 * @property {ChartType | 'auto'} chartType - Type of chart ('bar', 'pie', 'line', 'auto')
 * @property {ChartFormat} [format='ascii'] - Output format ('ascii', 'mermaid')
 * @property {string} [labelColumn] - Column to use for labels (default: first column)
 * @property {string} [valueColumn] - Column to use for values (default: second column)
 */
export interface VisualizeDataArgs {
	source: string;
	chartType: ChartType | "auto";
	format?: ChartFormat;
	labelColumn?: string;
	valueColumn?: string;
}

/**
 * Result from the visualize_data tool.
 *
 * @interface VisualizeDataResult
 * @property {boolean} success - Whether visualization succeeded
 * @property {string} chart - The generated chart
 * @property {ChartType} chartType - Type of chart generated
 * @property {ChartFormat} format - Format of the output
 */
export interface VisualizeDataResult {
	success: boolean;
	chart: string;
	chartType: ChartType;
	format: ChartFormat;
}

/**
 * Checks if source is a SQL query or table name.
 */
function isSQLQuery(source: string): boolean {
	const sqlKeywords = /^\s*(SELECT|WITH)\b/i;
	return sqlKeywords.test(source.trim());
}

/**
 * Renders an ASCII horizontal bar chart.
 */
function renderASCIIBar(
	labels: string[],
	values: number[],
	title?: string,
): string {
	const maxValue = Math.max(...values);
	const maxLabelLen = Math.max(...labels.map((l) => String(l).length));
	const barWidth = 40;

	const lines: string[] = [];
	if (title) lines.push(`${title}\n`);

	for (let i = 0; i < labels.length; i++) {
		const label = String(labels[i]).padStart(maxLabelLen);
		const value = values[i];
		const barLen = Math.round((value / maxValue) * barWidth);
		const bar = "█".repeat(barLen);
		lines.push(`${label} │ ${bar} ${value}`);
	}

	return lines.join("\n");
}

/**
 * Renders an ASCII pie chart (using text representation).
 */
function renderASCIIPie(labels: string[], values: number[]): string {
	const total = values.reduce((a, b) => a + b, 0);
	const maxLabelLen = Math.max(...labels.map((l) => String(l).length));

	const lines: string[] = ["Distribution:\n"];

	for (let i = 0; i < labels.length; i++) {
		const label = String(labels[i]).padEnd(maxLabelLen);
		const value = values[i];
		const pct = ((value / total) * 100).toFixed(1);
		const barLen = Math.round((value / total) * 20);
		const bar = "●".repeat(barLen);
		lines.push(`${label}  ${bar} ${pct}% (${value})`);
	}

	lines.push(`\nTotal: ${total}`);
	return lines.join("\n");
}

/**
 * Renders a Mermaid pie chart.
 */
function renderMermaidPie(
	labels: string[],
	values: number[],
	title?: string,
): string {
	const lines: string[] = ["```mermaid"];
	lines.push("pie showData");
	if (title) lines.push(`    title ${title}`);

	for (let i = 0; i < labels.length; i++) {
		lines.push(`    "${labels[i]}" : ${values[i]}`);
	}

	lines.push("```");
	return lines.join("\n");
}

/**
 * Renders a Mermaid bar chart.
 */
function renderMermaidBar(
	labels: string[],
	values: number[],
	title?: string,
): string {
	const lines: string[] = ["```mermaid"];
	lines.push("xychart-beta horizontal");
	if (title) lines.push(`    title "${title}"`);
	lines.push(`    x-axis [${labels.map((l) => `"${l}"`).join(", ")}]`);
	lines.push(`    bar [${values.join(", ")}]`);
	lines.push("```");
	return lines.join("\n");
}

/**
 * Renders an ASCII line chart (simple text representation).
 */
function renderASCIILine(
	labels: string[],
	values: number[],
	title?: string,
): string {
	const height = 10;
	const maxValue = Math.max(...values);
	const minValue = Math.min(...values);
	const range = maxValue - minValue || 1;

	const lines: string[] = [];
	if (title) lines.push(`${title}\n`);

	// Create grid
	const grid: string[][] = [];
	for (let i = 0; i < height; i++) {
		grid.push(new Array(values.length).fill(" "));
	}

	// Plot points
	for (let i = 0; i < values.length; i++) {
		const normalized = (values[i] - minValue) / range;
		const y = height - 1 - Math.round(normalized * (height - 1));
		grid[y][i] = "●";

		// Draw line to next point
		if (i < values.length - 1) {
			const nextNormalized = (values[i + 1] - minValue) / range;
			const nextY = height - 1 - Math.round(nextNormalized * (height - 1));
			if (nextY !== y) {
				const step = nextY > y ? 1 : -1;
				for (let yi = y + step; yi !== nextY; yi += step) {
					if (grid[yi][i] === " ") grid[yi][i] = "│";
				}
			}
		}
	}

	// Render grid with y-axis
	const maxLabel = maxValue.toFixed(0);
	const minLabel = minValue.toFixed(0);
	const padLen = Math.max(maxLabel.length, minLabel.length);

	for (let i = 0; i < height; i++) {
		let yLabel = "";
		if (i === 0) yLabel = maxLabel.padStart(padLen);
		else if (i === height - 1) yLabel = minLabel.padStart(padLen);
		else yLabel = " ".repeat(padLen);
		lines.push(`${yLabel} │${grid[i].join("")}`);
	}

	// X-axis
	lines.push(" ".repeat(padLen) + " └" + "─".repeat(values.length));

	// Labels (abbreviated)
	const labelLine = labels.map((l) => String(l).charAt(0)).join("");
	lines.push(" ".repeat(padLen + 2) + labelLine);

	return lines.join("\n");
}

/**
 * Renders a Mermaid line chart.
 */
function renderMermaidLine(
	labels: string[],
	values: number[],
	title?: string,
): string {
	const lines: string[] = ["```mermaid"];
	lines.push("xychart-beta");
	if (title) lines.push(`    title "${title}"`);
	lines.push(`    x-axis [${labels.map((l) => `"${l}"`).join(", ")}]`);
	lines.push(`    line [${values.join(", ")}]`);
	lines.push("```");
	return lines.join("\n");
}

/**
 * Auto-selects the best chart type based on data characteristics.
 */
function autoSelectChartType(labels: string[], values: number[]): ChartType {
	// Check for time series patterns (dates, months, years, sequential)
	const timePatterns =
		/^(\d{4}|\d{1,2}\/\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|week|day|month)/i;
	const isTimeSeries = labels.some((l) => timePatterns.test(String(l)));

	if (isTimeSeries || labels.length > 8) {
		return "line";
	}

	// Check for part-of-whole (values sum to ~100 or percentages)
	const total = values.reduce((a, b) => a + b, 0);
	const isPctLike = total >= 99 && total <= 101;
	const hasSmallSet = labels.length <= 6;

	if (isPctLike || (hasSmallSet && labels.length >= 2)) {
		return "pie";
	}

	return "bar";
}

/**
 * Creates a chart visualization from data.
 *
 * @param {VisualizeDataArgs} args - Visualization arguments
 * @returns {Promise<VisualizeDataResult>} Generated chart
 * @throws {Error} If data is unsuitable for chart type
 *
 * @example
 * // ASCII bar chart
 * const result = await visualizeData({
 *   source: 'SELECT category, SUM(amount) FROM sales GROUP BY category',
 *   chartType: 'bar',
 *   format: 'ascii'
 * });
 *
 * // Mermaid pie chart
 * const result = await visualizeData({
 *   source: 'SELECT region, COUNT(*) FROM customers GROUP BY region',
 *   chartType: 'pie',
 *   format: 'mermaid'
 * });
 */
export async function visualizeData(
	args: VisualizeDataArgs,
): Promise<VisualizeDataResult> {
	const { source, chartType, labelColumn, valueColumn } = args;
	const format = args.format || "ascii";
	const store = getStore();

	// Build query
	let sql: string;
	if (isSQLQuery(source)) {
		sql = source;
	} else {
		const metadata = store.getTableMetadata();
		if (!metadata.has(source)) {
			const available = Array.from(metadata.keys()).join(", ") || "none";
			throw new Error(`Table '${source}' not found. Available: ${available}`);
		}
		sql = `SELECT * FROM ${source}`;
	}

	// Validate and execute
	const queryCheck = validateQuery(sql);
	if (!queryCheck.allowed) {
		throw new Error(`Security: ${queryCheck.reason}`);
	}

	const result = await store.executeQuery(sql);

	// Need at least 2 columns (label and value)
	if (result.columns.length < 2) {
		throw new Error(
			"Visualization requires at least 2 columns (label and value)",
		);
	}

	// Determine which columns to use
	const labelIdx = labelColumn ? result.columns.indexOf(labelColumn) : 0;
	const valueIdx = valueColumn ? result.columns.indexOf(valueColumn) : 1;

	if (labelIdx === -1) {
		throw new Error(`Label column '${labelColumn}' not found`);
	}
	if (valueIdx === -1) {
		throw new Error(`Value column '${valueColumn}' not found`);
	}

	// Extract data
	const labels = result.rows.map((row) => String(row[labelIdx]));
	const values = result.rows.map((row) => Number(row[valueIdx]));

	// Check for valid numeric values
	if (values.some((v) => isNaN(v))) {
		throw new Error(
			`Value column '${result.columns[valueIdx]}' must contain numeric data`,
		);
	}

	// Auto-select chart type if requested
	const finalChartType =
		chartType === "auto" ? autoSelectChartType(labels, values) : chartType;

	// Generate chart
	let chart: string;

	if (format === "ascii") {
		switch (finalChartType) {
			case "bar":
				chart = renderASCIIBar(labels, values);
				break;
			case "line":
				chart = renderASCIILine(labels, values);
				break;
			case "pie":
			default:
				chart = renderASCIIPie(labels, values);
				break;
		}
	} else {
		switch (finalChartType) {
			case "bar":
				chart = renderMermaidBar(labels, values);
				break;
			case "line":
				chart = renderMermaidLine(labels, values);
				break;
			case "pie":
			default:
				chart = renderMermaidPie(labels, values);
				break;
		}
	}

	return {
		success: true,
		chart,
		chartType: finalChartType,
		format,
	};
}
