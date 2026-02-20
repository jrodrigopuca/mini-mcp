# Mini-MCP Architecture

This document describes the internal architecture of Mini-MCP, how components interact, and the data flow through the system.

## Overview

Mini-MCP is a Model Context Protocol (MCP) server that enables natural language data analysis using DuckDB as an in-memory analytical database. It follows a modular architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP Client                                     │
│                    (Claude Desktop / VS Code Copilot)                       │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ JSON-RPC over stdio
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Mini-MCP Server                                  │
│                              (index.ts)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │     Config      │   │    Security     │   │   Validators    │           │
│  │    (loader)     │   │  (validator,    │   │    (schema)     │           │
│  │                 │   │  path-validator)│   │                 │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 │                                           │
│                                 ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                            Tools Layer                                 │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐         │ │
│  │  │ load_data  │ │ query_data │ │  describe  │ │   export   │         │ │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘         │ │
│  │        │              │              │              │                 │ │
│  │  ┌────────────┐ ┌────────────┐                                       │ │
│  │  │ list_tables│ │ visualize  │                                       │ │
│  │  └─────┬──────┘ └─────┬──────┘                                       │ │
│  └────────┼──────────────┼──────────────────────────────────────────────┘ │
│           │              │                                                 │
│           ▼              ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          Core Components                               │ │
│  │                                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │   Parsers    │  │  DuckDB      │  │  Exporters   │                │ │
│  │  │              │  │  Store       │  │              │                │ │
│  │  │ • CSV        │  │              │  │ • CSV        │                │ │
│  │  │ • JSON       │──│  (in-memory) │──│ • JSON       │                │ │
│  │  │ • Parquet    │  │              │  │ • JSONL      │                │ │
│  │  └──────────────┘  └──────────────┘  │ • Markdown   │                │ │
│  │                           │          └──────────────┘                │ │
│  │                           │                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                                  │ │
│  │  │     NLP      │  │ Visualizers  │                                  │ │
│  │  │              │  │              │                                  │ │
│  │  │ NL → SQL     │  │ • ASCII      │                                  │ │
│  │  │ translation  │  │ • Mermaid    │                                  │ │
│  │  └──────────────┘  └──────────────┘                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interactions

### 1. Entry Point (`src/index.ts`)

The server entry point:

- Creates the MCP server instance using `@modelcontextprotocol/sdk`
- Registers all 6 tools with their schemas
- Handles JSON-RPC communication over stdio
- Routes tool calls to appropriate handlers

```typescript
// Simplified flow
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	switch (request.params.name) {
		case "load_data":
			return await loadData(args);
		case "query_data":
			return await queryData(args);
		// ... other tools
	}
});
```

### 2. Configuration System (`src/config/`)

**Components:**

- `loader.ts` - Loads and caches configuration
- `schema.ts` - Zod schema with defaults
- `defaults.ts` - Default configuration values

**Flow:**

```
mini-mcp.config.json → Zod validation → Merged with defaults → Config object
```

**Interaction:** All components access config via `getConfig()` singleton.

### 3. Security Layer (`src/security/`)

**Components:**

- `hardcoded.ts` - Immutable security rules (blocked SQL keywords, dangerous paths)
- `validator.ts` - SQL query validation
- `path-validator.ts` - File path security checks

**Validation Flow:**

```
User Input → Hardcoded Rules → Config Rules → Allowed/Denied
```

**Security Levels:**
| Level | Source | Examples |
|-------|--------|----------|
| 🔴 Hardcoded | Code | DROP, DELETE, /etc/passwd |
| 🟡 Configurable | Config | allowedPaths, maxFileSizeMB |
| 🟢 Flexible | Config | maxRowsOutput, threads |

### 4. DuckDB Store (`src/store/duckdb-store.ts`)

**Singleton Pattern:** One DuckDB instance shared across all operations.

**Responsibilities:**

- Initialize DuckDB with memory limits and thread config
- Load parsed data into tables with type inference
- Execute SQL queries with security validation
- Maintain table metadata registry
- Generate statistics

**Data Flow:**

```
Parsed Data → Type Inference → CREATE TABLE → INSERT → Ready for queries
```

**API:**

```typescript
interface DuckDBStore {
	initialize(): Promise<void>;
	loadTable(name, columns, rows, filePath): Promise<TableMetadata>;
	executeQuery(sql): Promise<QueryResult>;
	getTableStats(tableName): Promise<TableStats>;
	listTables(): TableMetadata[];
	dropTable(tableName): Promise<boolean>;
}
```

### 5. Parsers (`src/parsers/`)

**Interface:** All parsers implement `DataParser`:

```typescript
interface DataParser {
	canParse(filePath: string): boolean;
	parse(content: string | Buffer, options?): Promise<ParsedData>;
}
```

**Available Parsers:**
| Parser | Formats | Features |
|--------|---------|----------|
| CSVParser | .csv, .tsv | Auto-delimiter detection, quoted fields |
| JSONParser | .json, .jsonl | Array and line-delimited JSON |
| ParquetParser | .parquet, .pq | DuckDB native reading |

**Factory Pattern:**

```typescript
// parser-factory.ts
const parser = getParser("data.csv"); // Returns CSVParser
const format = detectFormat("data.json"); // Returns "json"
```

### 6. Exporters (`src/exporters/`)

**Interface:**

```typescript
interface DataExporter {
	readonly format: ExportFormat;
	export(data: QueryResult): string;
}
```

**Available Exporters:**
| Exporter | Output | Use Case |
|----------|--------|----------|
| CSVExporter | RFC 4180 CSV | Spreadsheet import |
| JSONExporter | Pretty JSON | API responses |
| JSONLExporter | Line-delimited | Streaming, large data |
| MarkdownExporter | GFM tables | Documentation |

**File Writer:** Handles secure file output when `readOnly: false`.

### 7. NLP Module (`src/nlp/query-builder.ts`)

Translates natural language to SQL queries.

**Pattern Matching:**

```
"show all from sales" → SELECT * FROM sales
"top 10 by revenue" → SELECT * FROM {table} ORDER BY revenue DESC LIMIT 10
"count by region" → SELECT region, COUNT(*) FROM {table} GROUP BY region
```

**Flow:**

```
Natural Language → Pattern Matching → SQL Template → Substitution → SQL Query
```

### 8. Visualizers (`src/visualizers/` + `src/tools/visualize-data.ts`)

**Chart Types:**
| Type | ASCII | Mermaid |
|------|-------|---------|
| Bar | ✅ | ✅ |
| Pie | ✅ | ✅ |
| Line | ✅ | ✅ |

**Auto-Selection Logic:**

```typescript
function autoSelectChartType(labels, values): ChartType {
	if (isTimeSeries(labels)) return "line";
	if (isPercentage(values)) return "pie";
	return "bar";
}
```

### 9. Validators (`src/validators/`)

**Schema Inference:**

```typescript
// Analyzes sample data to infer DuckDB types
inferColumnTypes(columns, rows) → ColumnInfo[]
```

**Type Detection Priority:**

```
BOOLEAN → INTEGER → BIGINT → DOUBLE → DATE → TIMESTAMP → VARCHAR
```

## Data Flow Examples

### Loading a CSV File

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ load_data   │────▶│ Path         │────▶│ Read File   │
│ tool call   │     │ Validation   │     │             │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐            │
                    │ Return       │◀───────────┤
                    │ Metadata     │            │
                    └──────────────┘            ▼
                           ▲          ┌─────────────┐
                           │          │ CSV Parser  │
                    ┌──────┴───────┐  │ (csv-parse) │
                    │ DuckDB Store │  └──────┬──────┘
                    │ loadTable()  │         │
                    └──────────────┘◀────────┘
                           ▲          Columns, Rows
                           │
                    ┌──────┴───────┐
                    │ Type         │
                    │ Inference    │
                    └──────────────┘
```

### Executing a Query

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ query_data  │────▶│ NLP Check    │────▶│ SQL         │
│ tool call   │     │ (if needed)  │     │ Validation  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐            │
                    │ Format &     │◀───────────┤
                    │ Return       │            │
                    └──────────────┘            ▼
                           ▲          ┌─────────────┐
                           │          │ DuckDB      │
                    ┌──────┴───────┐  │ Execute     │
                    │ Apply Limits │  └──────┬──────┘
                    │ & Truncate   │         │
                    └──────────────┘◀────────┘
```

## Module Dependencies

```
index.ts
├── config/loader.ts
│   └── config/schema.ts
│       └── config/defaults.ts
├── tools/*.ts
│   ├── security/validator.ts
│   │   └── security/hardcoded.ts
│   ├── security/path-validator.ts
│   ├── store/duckdb-store.ts
│   │   └── validators/schema-validator.ts
│   ├── parsers/parser-factory.ts
│   │   ├── parsers/csv-parser.ts
│   │   ├── parsers/json-parser.ts
│   │   └── parsers/parquet-parser.ts
│   ├── exporters/exporter-factory.ts
│   │   ├── exporters/csv-exporter.ts
│   │   ├── exporters/json-exporter.ts
│   │   ├── exporters/jsonl-exporter.ts
│   │   └── exporters/markdown-exporter.ts
│   └── nlp/query-builder.ts
└── types/index.ts (shared types)
```

## Error Handling

Errors propagate through the MCP protocol with structured responses:

```typescript
// Tool error response
{
  content: [{
    type: "text",
    text: "Error: Table 'sales' not found. Available: customers, orders"
  }],
  isError: true
}
```

**Error Categories:**

- **Security Errors**: Blocked paths, dangerous SQL
- **Validation Errors**: Invalid file format, schema mismatch
- **Runtime Errors**: Query timeout, memory limits
- **Not Found Errors**: Missing tables, columns

## Performance Considerations

1. **DuckDB Singleton**: One instance reused across requests
2. **Batch Inserts**: Data loaded in 1000-row batches
3. **Type Inference Sampling**: Only first 100 rows analyzed
4. **Query Limits**: Automatic LIMIT clause injection
5. **Memory Limits**: Configurable via `duckdb.memoryLimitMB`

## Extending the System

### Adding a New Parser

1. Create `src/parsers/my-parser.ts` implementing `DataParser`
2. Register in `src/parsers/parser-factory.ts`
3. Export from `src/parsers/index.ts`

### Adding a New Exporter

1. Create `src/exporters/my-exporter.ts` implementing `DataExporter`
2. Register in `src/exporters/exporter-factory.ts`
3. Export from `src/exporters/index.ts`

### Adding a New Tool

1. Create `src/tools/my-tool.ts` with handler function
2. Register in `src/index.ts` under `ListToolsRequestSchema`
3. Add case in `CallToolRequestSchema` handler
