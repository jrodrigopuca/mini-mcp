# Mini-MCP

A natural language CSV/data analysis MCP server powered by DuckDB.

## Features

- **Load data files**: CSV, TSV, JSON, JSONL formats
- **SQL queries**: Full DuckDB SQL support
- **Natural language queries**: Ask questions in plain English
- **Data visualization**: ASCII and Mermaid charts
- **Export data**: Multiple output formats
- **Security**: Configurable path restrictions and read-only mode

## Installation

```bash
npm install
npm run build
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

## License

ISC
