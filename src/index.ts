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
					enum: ["csv", "json", "markdown"],
					description: "Output format",
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

// Handle tool calls (stub - will be implemented in phases 3-6)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	// Placeholder responses until tools are fully implemented
	switch (name) {
		case "load_data":
			return {
				content: [
					{
						type: "text",
						text: `[Stub] Would load file: ${args?.filePath}`,
					},
				],
			};
		case "query_data":
			return {
				content: [
					{
						type: "text",
						text: `[Stub] Would execute query: ${args?.query}`,
					},
				],
			};
		case "describe_data":
			return {
				content: [
					{
						type: "text",
						text: `[Stub] Would describe table: ${args?.tableName}`,
					},
				],
			};
		case "list_tables":
			return {
				content: [
					{
						type: "text",
						text: "[Stub] Would list all loaded tables",
					},
				],
			};
		case "export_data":
			return {
				content: [
					{
						type: "text",
						text: `[Stub] Would export ${args?.source} as ${args?.format}`,
					},
				],
			};
		case "visualize_data":
			return {
				content: [
					{
						type: "text",
						text: `[Stub] Would create ${args?.chartType} chart from ${args?.source}`,
					},
				],
			};
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Mini-MCP server started");
}

main().catch(console.error);
