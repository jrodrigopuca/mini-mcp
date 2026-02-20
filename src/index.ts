/**
 * Mini-MCP: A natural language CSV/data analysis MCP server
 *
 * Entry point for the MCP server using DuckDB for analytics
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getStore } from "./store/duckdb-store.js";
import { loadData } from "./tools/load-data.js";
import { queryData } from "./tools/query-data.js";
import { describeData } from "./tools/describe-data.js";
import { listTables } from "./tools/list-tables.js";
import { exportDataTool } from "./tools/export-data.js";
import { visualizeData } from "./tools/visualize-data.js";
import type { ExportFormat, ChartType, ChartFormat } from "./types/index.js";

// Server instance
const server = new Server(
	{
		name: "mini-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Tool definitions (will be expanded in Phase 5)
const TOOLS = [
	{
		name: "load_data",
		description:
			"Load a CSV, JSON, TSV, or Parquet file into an in-memory DuckDB table for analysis",
		inputSchema: {
			type: "object",
			properties: {
				filePath: {
					type: "string",
					description: "Path to the data file to load",
				},
				tableName: {
					type: "string",
					description: "Optional name for the table (defaults to filename)",
				},
			},
			required: ["filePath"],
		},
	},
	{
		name: "query_data",
		description: "Query loaded data using SQL or natural language",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "SQL query or natural language question",
				},
				tableName: {
					type: "string",
					description: "Table to query (optional if only one table loaded)",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "describe_data",
		description: "Get schema and statistics for a loaded table",
		inputSchema: {
			type: "object",
			properties: {
				tableName: {
					type: "string",
					description: "Name of the table to describe",
				},
			},
			required: ["tableName"],
		},
	},
	{
		name: "list_tables",
		description: "List all currently loaded tables",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "export_data",
		description: "Export query results or tables to different formats",
		inputSchema: {
			type: "object",
			properties: {
				source: {
					type: "string",
					description: "Table name or SQL query to export",
				},
				format: {
					type: "string",
					enum: ["csv", "json", "jsonl", "markdown"],
					description: "Output format",
				},
				outputPath: {
					type: "string",
					description:
						"Optional file path to write output (requires readOnly: false)",
				},
			},
			required: ["source", "format"],
		},
	},
	{
		name: "visualize_data",
		description: "Create ASCII or Mermaid chart visualizations",
		inputSchema: {
			type: "object",
			properties: {
				source: {
					type: "string",
					description: "Table name or SQL query for visualization",
				},
				chartType: {
					type: "string",
					enum: ["bar", "pie", "line"],
					description: "Type of chart to generate",
				},
				format: {
					type: "string",
					enum: ["ascii", "mermaid"],
					description: "Output format for the chart",
				},
			},
			required: ["source", "chartType"],
		},
	},
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case "load_data": {
				const result = await loadData({
					filePath: args?.filePath as string,
					tableName: args?.tableName as string | undefined,
				});
				return {
					content: [
						{
							type: "text",
							text: `${result.message}\n\nColumns: ${result.columns.join(", ")}\nTypes: ${JSON.stringify(result.types, null, 2)}`,
						},
					],
				};
			}

			case "query_data": {
				const result = await queryData({
					query: args?.query as string,
					tableName: args?.tableName as string | undefined,
					format: (args?.format as ExportFormat) || "markdown",
				});
				let text = result.data;
				if (result.wasNaturalLanguage && result.executedSQL) {
					text = `_Executed SQL: \`${result.executedSQL}\`_\n\n${text}`;
				}
				if (result.truncated) {
					text += `\n\n_Results truncated. Total rows: ${result.rowCount}_`;
				}
				return {
					content: [{ type: "text", text }],
				};
			}

			case "describe_data": {
				const result = await describeData({
					tableName: args?.tableName as string,
					column: args?.column as string | undefined,
				});
				return {
					content: [
						{
							type: "text",
							text: `${result.schema}\n\n${result.statistics}\n\n${result.sampleData}`,
						},
					],
				};
			}

			case "list_tables": {
				const result = await listTables();
				if (result.tables.length === 0) {
					return {
						content: [{ type: "text", text: result.message }],
					};
				}
				const tableList = result.tables
					.map(
						(t) =>
							`- **${t.name}**: ${t.rowCount} rows, ${t.columnCount} columns (${t.columns.join(", ")})`,
					)
					.join("\n");
				return {
					content: [
						{
							type: "text",
							text: `${result.message}\n\n${tableList}`,
						},
					],
				};
			}

			case "export_data": {
				const result = await exportDataTool({
					source: args?.source as string,
					format: args?.format as ExportFormat,
					outputPath: args?.outputPath as string | undefined,
				});
				let text = result.data;
				if (result.outputPath) {
					text = `Exported ${result.rowCount} rows to ${result.outputPath} (${result.fileSize} bytes)`;
				}
				return {
					content: [{ type: "text", text }],
				};
			}

			case "visualize_data": {
				const result = await visualizeData({
					source: args?.source as string,
					chartType: args?.chartType as ChartType,
					format: (args?.format as ChartFormat) || "ascii",
					labelColumn: args?.labelColumn as string | undefined,
					valueColumn: args?.valueColumn as string | undefined,
				});
				return {
					content: [{ type: "text", text: result.chart }],
				};
			}

			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			content: [{ type: "text", text: `Error: ${message}` }],
			isError: true,
		};
	}
});

// Start the server
async function main() {
	// Initialize DuckDB store
	const store = getStore();
	await store.initialize();

	// Connect MCP server
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Mini-MCP server started");
}

main().catch(console.error);
