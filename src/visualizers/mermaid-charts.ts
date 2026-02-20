/**
 * @fileoverview Mermaid Chart Generator
 * @module visualizers/mermaid-charts
 * @description Generates Mermaid.js diagram syntax for rich visualizations.
 * Outputs can be rendered in Markdown-compatible environments.
 *
 * Supported Charts:
 * - Pie charts (native Mermaid)
 * - Bar charts (using xychart-beta)
 * - Line charts (using xychart-beta)
 *
 * @see {@link https://mermaid.js.org/syntax/pie.html} Mermaid Pie Chart Docs
 * @see {@link https://mermaid.js.org/syntax/xyChart.html} Mermaid XY Chart Docs
 *
 * @todo Implement in Phase 7
 */

/**
 * Data structure for chart generation.
 *
 * @interface ChartData
 * @property {string[]} labels - Category labels
 * @property {number[]} values - Numeric values
 */
interface ChartData {
	labels: string[];
	values: number[];
}

/**
 * Generates a Mermaid pie chart.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @param {string} [title] - Optional chart title
 * @returns {string} Mermaid pie chart syntax wrapped in code fence
 *
 * @example
 * const chart = mermaidPieChart(
 *   { labels: ['A', 'B', 'C'], values: [40, 35, 25] },
 *   'Market Share'
 * );
 * // Output:
 * // ```mermaid
 * // pie showData
 * //     title Market Share
 * //     "A" : 40
 * //     "B" : 35
 * //     "C" : 25
 * // ```
 */
export function mermaidPieChart(data: ChartData, title?: string): string {
	const { labels, values } = data;

	const lines = ["```mermaid", "pie showData", title ? `    title ${title}` : ""].filter(Boolean);

	labels.forEach((label, i) => {
		// Escape quotes in labels
		const safeLabel = label.replace(/"/g, '\\"');
		lines.push(`    "${safeLabel}" : ${values[i]}`);
	});

	lines.push("```");
	return lines.join("\n");
}

/**
 * Generates a Mermaid bar chart using xychart-beta.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @param {Object} [options] - Chart options
 * @param {string} [options.title] - Chart title
 * @param {string} [options.xLabel] - X-axis label
 * @param {string} [options.yLabel] - Y-axis label
 * @returns {string} Mermaid xychart syntax wrapped in code fence
 *
 * @example
 * const chart = mermaidBarChart(
 *   { labels: ['Q1', 'Q2', 'Q3'], values: [100, 150, 120] },
 *   { title: 'Quarterly Sales', yLabel: 'Revenue ($K)' }
 * );
 */
export function mermaidBarChart(
	data: ChartData,
	options: { title?: string; xLabel?: string; yLabel?: string } = {},
): string {
	const { labels, values } = data;
	const { title, xLabel, yLabel } = options;

	const lines = [
		"```mermaid",
		"xychart-beta",
		title ? `    title "${title}"` : "",
		xLabel ? `    x-axis "${xLabel}"` : "",
		yLabel ? `    y-axis "${yLabel}"` : "",
		`    x-axis [${labels.map((l) => `"${l.replace(/"/g, '\\"')}"`).join(", ")}]`,
		`    bar [${values.join(", ")}]`,
		"```",
	].filter(Boolean);

	return lines.join("\n");
}

/**
 * Generates a Mermaid line chart using xychart-beta.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @param {Object} [options] - Chart options
 * @param {string} [options.title] - Chart title
 * @param {string} [options.xLabel] - X-axis label
 * @param {string} [options.yLabel] - Y-axis label
 * @returns {string} Mermaid xychart syntax wrapped in code fence
 *
 * @example
 * const chart = mermaidLineChart(
 *   { labels: ['Jan', 'Feb', 'Mar'], values: [10, 25, 18] },
 *   { title: 'Monthly Trend' }
 * );
 */
export function mermaidLineChart(
	data: ChartData,
	options: { title?: string; xLabel?: string; yLabel?: string } = {},
): string {
	const { labels, values } = data;
	const { title, xLabel, yLabel } = options;

	const lines = [
		"```mermaid",
		"xychart-beta",
		title ? `    title "${title}"` : "",
		xLabel ? `    x-axis "${xLabel}"` : "",
		yLabel ? `    y-axis "${yLabel}"` : "",
		`    x-axis [${labels.map((l) => `"${l.replace(/"/g, '\\"')}"`).join(", ")}]`,
		`    line [${values.join(", ")}]`,
		"```",
	].filter(Boolean);

	return lines.join("\n");
}
