# Mini-MCP

A Model Context Protocol (MCP) server for natural language data analysis powered by DuckDB.

[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)]()
[![Vulnerabilities](https://img.shields.io/badge/vulnerabilities-0-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20.19.0-blue)]()

## Features

- **Multi-format data loading**: CSV, TSV, JSON, JSONL, Parquet
- **Full SQL support**: DuckDB analytical queries with JOINs, window functions, CTEs
- **Natural language queries**: Ask questions in plain English
- **Data visualization**: ASCII and Mermaid charts (bar, pie, line)
- **Multiple export formats**: CSV, JSON, JSONL, Markdown
- **Security first**: Configurable path restrictions, read-only mode, query validation

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Usage Example

Once configured with Claude Desktop or VS Code, you can interact naturally:

```
You: "Load sales.csv and show me the top 10 products by revenue"

Claude: I'll load the file and analyze it.

[Calls load_data with filePath: "./sales.csv"]
✓ Table 'sales' created: 1500 rows, 8 columns

[Calls query_data with query: "SELECT product, SUM(revenue) as total
FROM sales GROUP BY product ORDER BY total DESC LIMIT 10"]

| product     | total     |
|-------------|-----------|
| Widget Pro  | 45,230.00 |
| Gadget X    | 38,120.00 |
...

You: "Now show that as a bar chart"

[Calls visualize_data with chartType: "bar"]

Widget Pro │ ████████████████████████████████████████ 45230
  Gadget X │ ████████████████████████████████ 38120
 Device Y  │ ██████████████████████████████ 35890
```

## Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
	"mcpServers": {
		"mini-mcp": {
			"command": "node",
			"args": ["/path/to/mini-mcp/dist/index.js"],
			"env": {}
		}
	}
}
```

## VS Code with GitHub Copilot

Add to your VS Code settings (`settings.json`):

```json
{
	"github.copilot.chat.mcpServers": {
		"mini-mcp": {
			"command": "node",
			"args": ["/path/to/mini-mcp/dist/index.js"]
		}
	}
}
```

Or create `.vscode/mcp.json` in your workspace:

```json
{
	"servers": {
		"mini-mcp": {
			"command": "node",
			"args": ["${workspaceFolder}/../mini-mcp/dist/index.js"]
		}
	}
}
```

## Configuration

Create `mini-mcp.config.json` in your working directory:

```json
{
	"security": {
		"readOnly": true,
		"allowedPaths": ["./data", "/Users/you/Documents"],
		"maxFileSizeMB": 100
	},
	"limits": {
		"maxRowsOutput": 1000,
		"maxTablesLoaded": 10
	},
	"duckdb": {
		"memoryLimitMB": 512,
		"threads": 2
	}
}
```

## Available Tools

### `load_data`

Load a CSV, JSON, TSV file into an in-memory DuckDB table.

```
load_data({ filePath: "./data/sales.csv", tableName: "sales" })
```

### `query_data`

Query loaded data using SQL or natural language.

```
query_data({ query: "SELECT * FROM sales WHERE amount > 100" })
query_data({ query: "show top 5 by revenue", tableName: "sales" })
```

### `describe_data`

Get schema and statistics for a loaded table.

```
describe_data({ tableName: "sales" })
```

### `list_tables`

List all currently loaded tables.

```
list_tables()
```

### `export_data`

Export query results or tables to different formats (csv, json, jsonl, markdown).

```
export_data({ source: "sales", format: "csv" })
export_data({ source: "SELECT * FROM sales WHERE region='North'", format: "json" })
```

### `visualize_data`

Create ASCII or Mermaid chart visualizations.

```
visualize_data({
  source: "SELECT region, SUM(amount) FROM sales GROUP BY region",
  chartType: "bar"
})
```

## Security Model

- **🔴 Hardcoded**: Always enforced (dangerous SQL blocked, system paths blocked)
- **🟡 Configurable**: Can be adjusted via config (allowedPaths, readOnly, maxFileSizeMB)
- **🟢 Flexible**: User-controllable limits (maxRowsOutput, maxTablesLoaded)

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and component interactions
- **[API Reference](docs/API.md)** - Complete tool documentation
- **[Configuration](docs/CONFIGURATION.md)** - All configuration options

## Project Structure

```
mini-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config/           # Configuration loading & validation
│   ├── security/         # Path & query validation
│   ├── store/            # DuckDB store (singleton)
│   ├── parsers/          # CSV, JSON, Parquet parsers
│   ├── exporters/        # CSV, JSON, JSONL, Markdown exporters
│   ├── tools/            # MCP tool implementations
│   ├── nlp/              # Natural language → SQL
│   ├── validators/       # Schema inference & validation
│   └── types/            # TypeScript interfaces
├── tests/                # Vitest unit tests
├── docs/                 # Documentation
└── dist/                 # Compiled JavaScript
```

## License

ISC
