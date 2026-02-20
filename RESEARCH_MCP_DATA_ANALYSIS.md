# Investigación: MCPs para Análisis de Datos, CSV, SQL y Bases de Datos

**Fecha:** 19 de febrero de 2026  
**Objetivo:** Evaluar MCPs existentes y comparar con nuestro enfoque propuesto

---

## 1. MCPs Similares Encontrados

### 1.1 Servidores de Bases de Datos / SQL

#### **SQLite MCP (Oficial de Anthropic)**

- **URL:** https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sqlite
- **Estado:** Archivado (Mayo 2025)
- **Funcionalidades:**
  - `read_query`: Ejecuta SELECT queries
  - `write_query`: INSERT, UPDATE, DELETE
  - `create_table`: Creación de tablas
  - `list_tables`, `describe-table`: Inspección de schema
  - `append_insight`: Agrega insights para business intelligence
- **Motor:** SQLite
- **NL to SQL:** No (depende del LLM)
- **Visualización:** No
- **Archivos de datos:** Solo bases de datos SQLite existentes

#### **MotherDuck/DuckDB MCP** ⭐ (421 stars)

- **URL:** https://github.com/motherduckdb/mcp-server-motherduck
- **Funcionalidades:**
  - `execute_query`: SQL queries (DuckDB dialect)
  - `list_databases`, `list_tables`, `list_columns`
  - `switch_database_connection`: Cambiar entre DBs
- **Motor:** DuckDB (analítico, columnar)
- **Fuentes de datos:**
  - Archivos DuckDB locales
  - Bases de datos en S3
  - MotherDuck cloud
  - CSV y Parquet (vía DuckDB)
- **NL to SQL:** No
- **Visualización:** No
- **Notas:** Read-only por defecto, muy robusto para producción

#### **mcp-server-duckdb** (172 stars)

- **URL:** https://github.com/ktanaka101/mcp-server-duckdb
- **Funcionalidades:** Solo `query` (ejecuta cualquier SQL)
- **Motor:** DuckDB
- **Enfoque:** Minimalista - un solo tool para todo
- **Notas:** Soporta readonly mode

#### **anyquery** (Go, 40+ apps)

- **URL:** https://github.com/julien040/anyquery
- **Funcionalidades:** Query 40+ apps con SQL (GitHub, Notion, Airtable, etc.)
- **Motor:** SQLite compatible
- **Notas:** También conecta a PostgreSQL, MySQL, SQLite

---

### 1.2 Servidores de Análisis de Datos

#### **Zaturn** ⭐ (72 stars)

- **URL:** https://github.com/kdqed/zaturn
- **Funcionalidades:**
  - Conexión a múltiples fuentes (PostgreSQL, SQLite, DuckDB, MySQL, ClickHouse, SQL Server, BigQuery)
  - Carga de CSV y Parquet
  - Visualizaciones (Scatter, Line, Histogram, Box, Bar, Density Heatmap, Polar)
- **Motor:** Múltiples
- **NL to SQL:** No directamente (depende del LLM)
- **Visualización:** ✅ Sí (Plotly-based)
- **UI:** Web interface tipo Jupyter Notebook
- **Roadmap:** Dashboards, ML features

#### **mcp-server-data-exploration** (522 stars) ⭐

- **URL:** https://github.com/reading-plus-ai/mcp-server-data-exploration
- **Funcionalidades:**
  - `load-csv`: Carga CSV a DataFrame
  - `run-script`: Ejecuta Python scripts arbitrarios
  - Prompt template `explore-data`
- **Motor:** Python/Pandas
- **Notas:**
  - Ejecuta código Python arbitrario (⚠️ inseguro)
  - Enfocado en exploración autónoma
  - Maneja archivos grandes (2M+ rows)

#### **CSV Editor** ⭐ (21 stars)

- **URL:** https://github.com/santoshray02/csv-editor
- **Funcionalidades (40+ tools):**
  - **Load/Export:** CSV, JSON, Excel, Parquet, HTML, Markdown
  - **Transform:** filter_rows, sort, group_by_aggregate, join, pivot
  - **Clean:** remove_duplicates, fill_missing_values, change_column_type
  - **Analyze:** get_statistics, get_correlation_matrix, detect_outliers
  - **Validate:** validate_schema, check_data_quality
  - **Auto-save:** con undo/redo y historial
- **Motor:** Pandas
- **Visualización:** No (en roadmap)
- **NL to SQL:** No
- **Notas:**
  - Maneja archivos GB+ con chunking
  - Multi-session support
  - FastMCP framework

#### **AutoML MCP (Data Science)**

- **URL:** https://github.com/emircansoftware/MCP_Server_DataScience
- **Funcionalidades:** Data analysis workflows, preprocessing, feature engineering, model selection

---

### 1.3 Servidores de Visualización

#### **MCP ECharts** ⭐ (209 stars)

- **URL:** https://github.com/hustcc/mcp-echarts
- **Funcionalidades:**
  - Genera gráficos ECharts
  - Export a PNG, SVG, option JSON
  - Integración con MinIO para almacenar imágenes
- **Tipos de charts:** Todos los de ECharts (15+ tipos)
- **Notas:** Zero dependencies, totalmente local, muy maduro

#### **MCP Vega-Lite** (96 stars)

- **URL:** https://github.com/isaacwasserman/mcp-vegalite-server
- **Funcionalidades:**
  - `save_data`: Guarda datos para visualización
  - `visualize_data`: Genera charts con spec Vega-Lite
- **Output:** PNG (base64) o JSON spec
- **Notas:** Más flexible que ECharts, declarativo

#### **Vizro MCP** (McKinsey)

- **URL:** https://github.com/mckinsey/vizro/tree/main/vizro-mcp
- **Funcionalidades:** Dashboards y charts validados/mantenibles
- **Notas:** Enterprise-grade, McKinsey-backed

---

## 2. Análisis Comparativo

### Lo que hacen bien (a adoptar):

| Aspecto               | MCP         | Lo que hace bien                                |
| --------------------- | ----------- | ----------------------------------------------- |
| **Modularidad**       | CSV Editor  | 40+ tools granulares, cada operación es un tool |
| **Múltiples fuentes** | Zaturn      | PostgreSQL, MySQL, SQLite, DuckDB, CSV, Parquet |
| **Motor analítico**   | MotherDuck  | DuckDB es columnar y muy rápido para analytics  |
| **Visualización**     | ECharts MCP | Output PNG/SVG, integración cloud storage       |
| **Auto-save/History** | CSV Editor  | Undo/redo, versioning, snapshots                |
| **Seguridad**         | MotherDuck  | Read-only por defecto, tokens, SaaS mode        |
| **Archivos grandes**  | CSV Editor  | Chunking para GB+ files                         |
| **Schema validation** | CSV Editor  | Validación de tipos, patrones, required fields  |

### Lo que falta en los existentes:

| Carencia                                 | MCPs que la tienen     | Notas                        |
| ---------------------------------------- | ---------------------- | ---------------------------- |
| **NL to SQL nativo**                     | Ninguno                | Todos dependen del LLM       |
| **ASCII charts**                         | Ninguno                | Solo PNG/SVG/HTML            |
| **Mermaid diagrams**                     | mcp-mermaid (separado) | No integrado con data        |
| **SQLite en memoria**                    | SQLite MCP (parcial)   | No carga CSV automáticamente |
| **Transformación entre formatos**        | CSV Editor (parcial)   | No JSONL nativo              |
| **Estadísticas descriptivas integradas** | CSV Editor             | La mejor opción actual       |

---

## 3. Comparación con Nuestro Enfoque

### Nuestro Plan vs. Existentes

| Característica        | Nuestro Plan     | Mejor Alternativa                      | Diferenciador                           |
| --------------------- | ---------------- | -------------------------------------- | --------------------------------------- |
| **Parsers modulares** | CSV, JSON, TSV   | CSV Editor (CSV, JSON, Excel, Parquet) | Nosotros más simple, ellos más formatos |
| **SQLite en memoria** | ✅ Sí            | MotherDuck (DuckDB)                    | Similar, DuckDB más rápido              |
| **Exporters**         | CSV, JSON, JSONL | CSV Editor                             | JSONL es diferenciador                  |
| **`load_data`**       | ✅               | `load-csv` (data-exploration)          | Similar                                 |
| **`query_data`**      | SQL + NL         | `execute_query` (solo SQL)             | **NL es nuestro diferenciador**         |
| **`describe_data`**   | ✅               | `get_statistics` (CSV Editor)          | Similar                                 |
| **`export_data`**     | ✅               | CSV Editor                             | Similar                                 |
| **`visualize_data`**  | ASCII + Mermaid  | ECharts/Vega-Lite (PNG/SVG)            | **ASCII es diferenciador único**        |
| **NL → SQL**          | Pattern matching | Ninguno (todos usan LLM)               | **Diferenciador clave**                 |

### Nuestras Ventajas Únicas

1. **ASCII Charts:** Ningún MCP existente ofrece visualización en texto puro
2. **Mermaid Integration:** Charts como código, versionsables
3. **NL → SQL sin LLM:** Pattern matching local, más predecible
4. **JSONL export:** Formato común para pipelines que otros no tienen
5. **Simplicidad:** 5-6 tools vs 40+ (CSV Editor) - menos confusión para el LLM
6. **Zero dependencies pesadas:** No Pandas, no Plotly

---

## 4. Recomendaciones

### 4.1 Funcionalidades a Agregar

| Funcionalidad         | Prioridad | Razón                      | Referencia         |
| --------------------- | --------- | -------------------------- | ------------------ |
| **Parquet support**   | Media     | Formato analítico estándar | Zaturn, CSV Editor |
| **Excel read**        | Baja      | Muy solicitado en empresas | CSV Editor         |
| **Schema validation** | Alta      | Data quality es crítico    | CSV Editor         |
| **Undo/history**      | Media     | Operaciones destructivas   | CSV Editor         |
| **Read-only mode**    | Alta      | Seguridad básica           | MotherDuck         |
| **Session isolation** | Media     | Multi-user support         | CSV Editor         |

### 4.2 Tools Adicionales Sugeridos

```
# Sugeridos basados en lo que funciona bien en otros
validate_schema(data_id, schema)  # De CSV Editor
get_correlation(data_id, columns)  # De CSV Editor
detect_outliers(data_id, method)   # De CSV Editor
preview_data(data_id, rows=10)     # Útil para debugging
```

### 4.3 Errores Comunes a Evitar

| Error                            | Quién lo comete  | Cómo evitarlo                       |
| -------------------------------- | ---------------- | ----------------------------------- |
| **Ejecutar Python arbitrario**   | data-exploration | Solo SQL, nunca `eval()`            |
| **No limitar resultados**        | Varios           | Siempre `--max-rows`, `--max-chars` |
| **Write por defecto**            | SQLite antiguo   | Read-only por defecto               |
| **Cargar todo en memoria**       | Pandas-based     | Streaming/chunking                  |
| **Demasiados tools**             | CSV Editor (40+) | Mantener < 10 tools                 |
| **Sin validación de input**      | Varios           | Zod/JSON Schema siempre             |
| **Base64 para imágenes grandes** | ECharts          | Ofrecer URLs o ASCII                |

---

## 5. Conclusiones

### ✅ Nuestro enfoque es viable porque:

1. No hay competidor directo con NL → SQL + ASCII visualization
2. La simplicidad (5-6 tools) es una ventaja, no desventaja
3. Zero-dependency es valioso para edge deployment

### ⚠️ Consideraciones:

1. DuckDB podría ser mejor que SQLite para analytics (más rápido)
2. Parquet support sería un buen adicional
3. Schema validation es casi obligatorio para uso profesional

### 🎯 Diferenciadores Clave a Mantener:

1. **NL → SQL con pattern matching** (único)
2. **ASCII charts** (único)
3. **Mermaid diagrams** (diferenciador)
4. **Simplicidad** (counter-positioning vs CSV Editor)

---

## 6. Referencias Clave

| Recurso                       | URL                                                    |
| ----------------------------- | ------------------------------------------------------ |
| Awesome MCP Servers           | https://github.com/punkpeye/awesome-mcp-servers        |
| Official MCP Servers          | https://github.com/modelcontextprotocol/servers        |
| CSV Editor (mejor referencia) | https://github.com/santoshray02/csv-editor             |
| Zaturn (visualización)        | https://github.com/kdqed/zaturn                        |
| MotherDuck MCP                | https://github.com/motherduckdb/mcp-server-motherduck  |
| MCP ECharts                   | https://github.com/hustcc/mcp-echarts                  |
| NPM MCP packages              | https://www.npmjs.com/search?q=%40modelcontextprotocol |

---

_Documento generado como parte de investigación de mercado para mini-mcp_
