import type { QueryResult } from "./editor";

export type NotebookCellType = "sql" | "markdown";

export interface NotebookCell {
  id: string;
  type: NotebookCellType;
  content: string;
  schema?: string; // SQL only: per-cell database override
  result?: QueryResult | null;
  error?: string;
  executionTime?: number | null;
  isLoading?: boolean;
  isPreview?: boolean; // Markdown only: true = rendered, false = editing
}

export interface NotebookState {
  cells: NotebookCell[];
}

// File format for .tabularis-notebook export/import
export interface NotebookFile {
  version: number;
  title: string;
  createdAt: string;
  cells: Array<{
    type: NotebookCellType;
    content: string;
    schema?: string;
  }>;
}
