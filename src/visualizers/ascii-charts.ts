/**
 * @fileoverview ASCII Chart Generator
 * @module visualizers/ascii-charts
 * @description Generates text-based visualizations for terminal display.
 * Supports bar charts, pie charts (as percentage bars), and sparklines.
 *
 * @todo Implement in Phase 7
 */

/**
 * Data structure for chart generation.
 * Labels and values arrays must have the same length.
 *
 * @interface ChartData
 * @property {string[]} labels - Category labels for the data points
 * @property {number[]} values - Numeric values corresponding to each label
 */
interface ChartData {
	labels: string[];
	values: number[];
}

/**
 * Generates an ASCII horizontal bar chart.
 * Each bar is scaled relative to the maximum value in the dataset.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @param {Object} [options] - Chart options
 * @param {number} [options.maxWidth=40] - Maximum width of bars in characters
 * @returns {string} Multi-line ASCII bar chart
 *
 * @example
 * const chart = asciiBarChart({
 *   labels: ['Sales', 'Marketing', 'Engineering'],
 *   values: [100, 75, 150]
 * });
 * // Output:
 * // Sales       │ ███████████████████████████ 100
 * // Marketing   │ ████████████████████ 75
 * // Engineering │ ████████████████████████████████████████ 150
 */
export function asciiBarChart(data: ChartData, options: { maxWidth?: number } = {}): string {
	const { labels, values } = data;
	const maxWidth = options.maxWidth ?? 40;
	const maxValue = Math.max(...values);

	if (maxValue === 0) {
		return "No data to display";
	}

	const maxLabelLength = Math.max(...labels.map((l) => l.length));

	const lines = labels.map((label, i) => {
		const value = values[i];
		const barLength = Math.round((value / maxValue) * maxWidth);
		const bar = "█".repeat(barLength);
		const paddedLabel = label.padEnd(maxLabelLength);
		return `${paddedLabel} │ ${bar} ${value}`;
	});

	return lines.join("\n");
}

/**
 * Generates an ASCII pie chart as a percentage bar representation.
 * Shows each category with its percentage of the total.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @returns {string} Multi-line ASCII pie representation
 *
 * @example
 * const chart = asciiPieChart({
 *   labels: ['Chrome', 'Firefox', 'Safari'],
 *   values: [60, 25, 15]
 * });
 * // Output:
 * // Chrome  │ ●●●●●●●●●●●● 60.0% (60)
 * // Firefox │ ●●●●● 25.0% (25)
 * // Safari  │ ●●● 15.0% (15)
 */
export function asciiPieChart(data: ChartData): string {
	const { labels, values } = data;
	const total = values.reduce((a, b) => a + b, 0);

	if (total === 0) {
		return "No data to display";
	}

	const maxLabelLength = Math.max(...labels.map((l) => l.length));

	const lines = labels.map((label, i) => {
		const value = values[i];
		const percentage = ((value / total) * 100).toFixed(1);
		const paddedLabel = label.padEnd(maxLabelLength);
		const barLength = Math.round((value / total) * 20);
		const bar = "●".repeat(barLength);
		return `${paddedLabel} │ ${bar} ${percentage}% (${value})`;
	});

	return lines.join("\n");
}

/**
 * Generates an ASCII line chart as a sparkline.
 * Uses Unicode block characters to show value trends.
 *
 * @param {ChartData} data - Chart data with labels and values
 * @returns {string} Sparkline with min/max indicators
 *
 * @example
 * const chart = asciiLineChart({
 *   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
 *   values: [10, 25, 15, 30, 20]
 * });
 * // Output:
 * // Min: 10 | Max: 30
 * // ▂▆▃█▅
 * // Jan Feb Mar Apr May
 */
export function asciiLineChart(data: ChartData): string {
	const { labels, values } = data;
	const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;

	const sparkline = values
		.map((v) => {
			const normalized = (v - min) / range;
			const index = Math.round(normalized * (chars.length - 1));
			return chars[index];
		})
		.join("");

	return [
		`Min: ${min} | Max: ${max}`,
		sparkline,
		labels.length <= 10 ? labels.join(" ") : `${labels[0]} ... ${labels[labels.length - 1]}`,
	].join("\n");
}
