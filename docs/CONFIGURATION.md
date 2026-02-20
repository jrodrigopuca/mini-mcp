# Mini-MCP Configuration Guide

Complete reference for configuring Mini-MCP behavior, security, and performance.

## Configuration File

Create `mini-mcp.config.json` in your working directory or the directory where you run the MCP server.

```json
{
	"security": {
		"readOnly": true,
		"allowedPaths": ["./data"],
		"maxFileSizeMB": 100
	},
	"limits": {
		"maxRowsOutput": 1000,
		"maxTablesLoaded": 10,
		"maxOutputChars": 50000,
		"queryTimeoutMs": 30000
	},
	"duckdb": {
		"memoryLimitMB": 512,
		"threads": 2
	},
	"operations": {
		"blockedSQLKeywords": []
	}
}
```

## Configuration Sections

### Security

Controls access restrictions and file system security.

| Option          | Type     | Default | Description                          |
| --------------- | -------- | ------- | ------------------------------------ |
| `readOnly`      | boolean  | `true`  | Prevent file writes (export to file) |
| `allowedPaths`  | string[] | `["."]` | Directories where files can be read  |
| `maxFileSizeMB` | number   | `100`   | Maximum file size to load            |

#### Path Security

```json
{
	"security": {
		"allowedPaths": [
			"./data", // Relative to working directory
			"/Users/you/Documents/data", // Absolute path
			"~/Projects" // Home directory expansion
		]
	}
}
```

**Hardcoded Blocked Paths** (cannot be overridden):

- `../` - Path traversal
- `/etc/passwd`, `/etc/shadow` - System files
- `~/.ssh` - SSH keys
- `.env` - Environment files
- `node_modules` - Dependencies

#### Read-Write Mode

To enable file exports:

```json
{
	"security": {
		"readOnly": false,
		"allowedPaths": ["./data", "./exports"]
	}
}
```

⚠️ **Warning**: Enabling write mode allows the `export_data` tool to create files.

### Limits

Controls resource usage and output size.

| Option            | Type   | Default | Description                     |
| ----------------- | ------ | ------- | ------------------------------- |
| `maxRowsOutput`   | number | `1000`  | Max rows returned per query     |
| `maxTablesLoaded` | number | `10`    | Max concurrent tables in memory |
| `maxOutputChars`  | number | `50000` | Max characters in response      |
| `queryTimeoutMs`  | number | `30000` | Query timeout in milliseconds   |

#### Output Limits

```json
{
	"limits": {
		"maxRowsOutput": 5000, // For large result sets
		"maxOutputChars": 100000 // For verbose outputs
	}
}
```

When limits are exceeded:

- Results are truncated
- Response includes `truncated: true`

#### Table Management

```json
{
	"limits": {
		"maxTablesLoaded": 20 // Allow more concurrent tables
	}
}
```

Old tables must be dropped before loading new ones when limit is reached.

### DuckDB

Controls the in-memory DuckDB instance.

| Option          | Type   | Default | Description               |
| --------------- | ------ | ------- | ------------------------- |
| `memoryLimitMB` | number | `512`   | Maximum memory for DuckDB |
| `threads`       | number | `2`     | Number of worker threads  |

#### Memory Configuration

```json
{
	"duckdb": {
		"memoryLimitMB": 1024, // 1GB for large datasets
		"threads": 4 // More threads for complex queries
	}
}
```

**Recommendations:**

- Small datasets (<100MB): 256-512 MB memory
- Medium datasets (100MB-1GB): 512-1024 MB memory
- Large datasets (>1GB): 1024-2048 MB memory

### Operations

Additional SQL restrictions.

| Option               | Type     | Default | Description                      |
| -------------------- | -------- | ------- | -------------------------------- |
| `blockedSQLKeywords` | string[] | `[]`    | Additional SQL keywords to block |

```json
{
	"operations": {
		"blockedSQLKeywords": ["COPY", "EXPORT"]
	}
}
```

**Always Blocked** (hardcoded, cannot be allowed):

```
DROP, DELETE, TRUNCATE, ALTER, CREATE, INSERT, UPDATE,
ATTACH, DETACH, EXEC, EXECUTE, PRAGMA, VACUUM, REINDEX
```

## Security Levels

Mini-MCP uses a three-tier security model:

| Level     | Icon | Configurable | Examples                  |
| --------- | ---- | ------------ | ------------------------- |
| Critical  | 🔴   | Never        | Blocked SQL, system paths |
| Sensitive | 🟡   | With Warning | allowedPaths, readOnly    |
| Flexible  | 🟢   | Freely       | Output limits, threads    |

### 🔴 Hardcoded Protections

These cannot be changed via configuration:

**Blocked SQL Keywords:**

```typescript
[
	"DROP",
	"DELETE",
	"TRUNCATE",
	"ALTER",
	"CREATE",
	"INSERT",
	"UPDATE",
	"ATTACH",
	"DETACH",
	"EXEC",
	"EXECUTE",
	"PRAGMA",
	"VACUUM",
	"REINDEX",
];
```

**Blocked Paths:**

```typescript
[
	"../",
	"..\\",
	"/etc/passwd",
	"/etc/shadow",
	"~/.ssh",
	".env",
	"node_modules",
	".git",
];
```

## Example Configurations

### Development (Permissive)

```json
{
	"security": {
		"readOnly": false,
		"allowedPaths": ["."],
		"maxFileSizeMB": 500
	},
	"limits": {
		"maxRowsOutput": 10000,
		"maxTablesLoaded": 20,
		"queryTimeoutMs": 60000
	},
	"duckdb": {
		"memoryLimitMB": 1024,
		"threads": 4
	}
}
```

### Production (Restrictive)

```json
{
	"security": {
		"readOnly": true,
		"allowedPaths": ["/data/approved"],
		"maxFileSizeMB": 50
	},
	"limits": {
		"maxRowsOutput": 500,
		"maxTablesLoaded": 5,
		"queryTimeoutMs": 10000
	},
	"duckdb": {
		"memoryLimitMB": 256,
		"threads": 1
	}
}
```

### Analytics Workstation

```json
{
	"security": {
		"readOnly": true,
		"allowedPaths": ["~/Documents/datasets", "~/Downloads", "/shared/data"],
		"maxFileSizeMB": 1000
	},
	"limits": {
		"maxRowsOutput": 50000,
		"maxTablesLoaded": 50,
		"maxOutputChars": 500000,
		"queryTimeoutMs": 120000
	},
	"duckdb": {
		"memoryLimitMB": 4096,
		"threads": 8
	}
}
```

## Environment Variables

Configuration can also come from environment variables (prefix with `MINI_MCP_`):

```bash
export MINI_MCP_MEMORY_LIMIT_MB=1024
export MINI_MCP_READ_ONLY=false
```

**Note:** Config file values take precedence over environment variables.

## Validation

On startup, Mini-MCP validates the configuration:

```
✓ Loaded config from: /Users/you/project/mini-mcp.config.json
✓ Security: readOnly=true, allowedPaths=["./data"]
✓ DuckDB: memory=512MB, threads=2
```

Invalid configurations will show warnings:

```
⚠️ Warning: maxFileSizeMB (2000) exceeds recommended limit (1000)
⚠️ Warning: allowedPaths includes potentially sensitive path: /etc
```

## Default Configuration

If no config file is found, these defaults are used:

```json
{
	"security": {
		"readOnly": true,
		"allowedPaths": ["."],
		"maxFileSizeMB": 100
	},
	"limits": {
		"maxRowsOutput": 1000,
		"maxTablesLoaded": 10,
		"maxOutputChars": 50000,
		"queryTimeoutMs": 30000
	},
	"duckdb": {
		"memoryLimitMB": 512,
		"threads": 2
	},
	"operations": {
		"blockedSQLKeywords": []
	}
}
```
