import type { NotebookCell } from "../types/notebook";
import type { NotebookFile } from "../types/notebook";
import { generateCellId } from "./notebook";

export function serializeNotebook(
  title: string,
  cells: NotebookCell[],
): NotebookFile {
  return {
    version: 1,
    title,
    createdAt: new Date().toISOString(),
    cells: cells.map((c) => ({
      type: c.type,
      content: c.content,
    })),
  };
}

export function validateNotebookFile(data: unknown): data is NotebookFile {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== "number") return false;
  if (typeof obj.title !== "string") return false;
  if (!Array.isArray(obj.cells)) return false;
  return obj.cells.every(
    (cell: unknown) =>
      typeof cell === "object" &&
      cell !== null &&
      typeof (cell as Record<string, unknown>).type === "string" &&
      ((cell as Record<string, unknown>).type === "sql" ||
        (cell as Record<string, unknown>).type === "markdown") &&
      typeof (cell as Record<string, unknown>).content === "string",
  );
}

export function deserializeNotebook(json: string): {
  title: string;
  cells: NotebookCell[];
} {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (!validateNotebookFile(data)) {
    throw new Error("Invalid notebook file format");
  }

  return {
    title: data.title,
    cells: data.cells.map((c) => ({
      id: generateCellId(),
      type: c.type,
      content: c.content,
      result: null,
      error: undefined,
      executionTime: null,
      isLoading: false,
      isPreview: c.type === "markdown" ? true : undefined,
    })),
  };
}
