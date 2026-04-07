import { splitQuery, postgreSplitterOptions } from 'dbgate-query-splitter';

export function splitQueries(sql: string): string[] {
  return splitQuery(sql, postgreSplitterOptions).map(item => typeof item == "string" ? item : item.text);
}

/**
 * Extracts the table name from a SELECT query.
 * Handles quotes: `table`, "table", 'table', and unquoted table names.
 * Returns null if no table is found or if it's not a SELECT query.
 * Returns null for aggregate queries (COUNT, SUM, etc.) since they don't return table rows.
 */
export function extractTableName(sql: string): string | null {
  // Remove comments and normalize whitespace
  const cleaned = sql
    .replace(/--[^\n]*/g, '') // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Check if it's a SELECT query
  if (!/^\s*SELECT\s+/i.test(cleaned)) {
    return null;
  }

  // DISTINCT removes duplicates - editing a row could affect deduplication
  if (/\bSELECT\s+DISTINCT\b/i.test(cleaned)) {
    return null;
  }

  // Check if it's an aggregate query (COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING)
  // These don't return table rows, so we shouldn't fetch PK
  if (/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(cleaned) || /\bGROUP\s+BY\b/i.test(cleaned) || /\bHAVING\b/i.test(cleaned)) {
    return null;
  }

  // JOINs produce rows from multiple tables - not safely editable against a single table
  if (/\bJOIN\b/i.test(cleaned)) {
    return null;
  }

  // Set operations combine results from multiple queries
  if (/\b(UNION|INTERSECT|EXCEPT)\b/i.test(cleaned)) {
    return null;
  }

  // Subquery in FROM clause (derived table)
  if (/\bFROM\s*\(/i.test(cleaned)) {
    return null;
  }

  // Match FROM clause with optional quotes
  // Matches: FROM table, FROM `table`, FROM "table", FROM 'table'
  const fromMatch = cleaned.match(/\bFROM\s+([`"']?)(\w+)\1/i);
  
  if (fromMatch && fromMatch[2]) {
    return fromMatch[2];
  }

  return null;
}
