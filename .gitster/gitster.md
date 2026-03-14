# Tabularis

**Version:** 0.9.9

## What is Tabularis?

Tabularis is a lightweight, developer-focused database management tool built with Tauri, Rust, and React. It provides a fast, native desktop experience for connecting, exploring, querying, and managing databases — with no cloud, no sign-up, and no telemetry. Extensible through a plugin system.

## Key Features

### 🔌 Multi-Database Support

- Native drivers for **PostgreSQL** (multi-schema), **MySQL / MariaDB** (multi-database), and **SQLite**
- Manage multiple connection profiles with secure local storage
- Passwords and API keys stored in the OS keychain (Keychain Access, Windows Credential Manager, libsecret)
- Read-only mode to protect production databases at the application layer
- Connection groups for organising profiles in the sidebar

### 🔒 SSH Tunneling

- Full SSH tunneling implementation in Rust with two automatic backends: **russh** (password auth) and **system SSH** (key-based, honours `~/.ssh/config`)
- Dynamic ephemeral port assignment — no manual port configuration
- Reusable SSH profiles shared across multiple database connections
- Supports ProxyJump / multi-hop chains via `~/.ssh/config`

### ✍️ SQL Editor

- Monaco-based editor with syntax highlighting, autocomplete, and multiple tabs
- DataGrip-style execution: run selected text, run all, or run single statement
- Saved queries panel for frequently used snippets
- Each tab maintains its own independent connection context

### 🎨 Visual Query Builder

- Drag-and-drop table canvas — connect columns to define JOINs visually
- Add filters, sorting, limits, and aggregate functions (COUNT, SUM, AVG…) without writing SQL
- Live SQL preview updates as you build
- Export the generated query directly to the SQL Editor

### 📊 Data Grid

- High-performance virtualised grid for large result sets
- Inline cell editing, row insertion and deletion
- Multi-row copy to clipboard; one-click export to CSV or JSON
- Smart read-only mode for aggregated queries

### 🗄️ Schema Management

- Inline editing of table and column properties directly from the sidebar
- GUI wizards for creating tables, modifying columns, and managing indexes and foreign keys
- Interactive **ER Diagram** with auto-layout — visualise relationships across the whole schema

### 🤖 AI Assistant (Experimental)

- Generate SQL from natural language and get plain-English explanations of complex queries
- Supports **OpenAI**, **Anthropic (Claude)**, **OpenRouter**, and **Ollama** for fully local inference
- Context-aware: sends only the relevant schema to the AI, never raw data

### 🔌 MCP Server

- Built-in **Model Context Protocol** server — expose database schemas and run queries directly from Claude, Cursor, Windsurf, or any MCP-compatible agent
- One-click setup wizard generates ready-to-paste config for Claude Desktop and Claude Code

### 📦 SQL Dump & Import

- Export full or schema-level database dumps to `.sql` with table selection
- Re-import `.sql` files with real-time progress tracking and cancellation support
- Streaming write — works on large databases without memory pressure

### 🪟 Split View

- Open two or more connections side-by-side in resizable panes
- Each pane has its own SQL editor, data grid, and independent connection state
- Useful for comparing environments, migrating data, or cross-database work

### 📈 Task Manager

- Monitor Tabularis and plugin processes in real time
- Per-process CPU, RAM, and disk usage; child process tree inspection
- Force-kill or restart any plugin without leaving the app

### 🎨 Themes

- 10+ built-in themes including Dracula, Nord, Monokai, Solarized, and One Dark Pro
- Syntax highlighting is auto-generated from the active UI theme
- Switch themes instantly without restarting

### 🌍 Internationalisation

- Available in **English**, **Italian**, and **Spanish**
- Automatic language detection with manual override in Settings

### 🔄 Seamless Updates

- Startup check against GitHub Releases API with one-click install
- Package-manager-aware: shows a reminder for AUR, Snap, Homebrew, and winget installs instead of the built-in updater

### 🧩 Plugin System

- Install and manage third-party database drivers without rebuilding the app
- Plugin registry with one-click install; plugins run in isolated processes
- Built-in Task Manager for monitoring plugin resource usage

## Supported Databases

| Database | Support |
|---|---|
| MySQL / MariaDB | Full (multi-database) |
| PostgreSQL | Full (multi-schema) |
| SQLite | Full |
| Additional drivers | Via plugins (DuckDB, Redis, ClickHouse, and more) |

## Available On

- **macOS** — Universal Binary (Intel + Apple Silicon); Homebrew cask available
- **Windows** — 64-bit installer (requires WebView2)
- **Linux** — AppImage, `.deb`, `.rpm`, Snap, AUR (`tabularis-bin`)

## Links

- **Website:** [tabularis.dev](https://tabularis.dev)
- **Download:** [GitHub Releases](https://github.com/debba/tabularis/releases)
- **Wiki:** [tabularis.dev/wiki](https://tabularis.dev/wiki)
- **Community:** [Discord Server](https://discord.gg/YrZPHAwMSG)
- **Source Code:** [GitHub Repository](https://github.com/debba/tabularis)
