import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { BookOpen } from "lucide-react";
import type { Tab, QueryResult } from "../../types/editor";
import type {
  NotebookCell,
  NotebookCellType,
  NotebookParam,
  RunAllResult,
} from "../../types/notebook";
import {
  updateCellInCells,
  addCellToCells,
  removeCellFromCells,
} from "../../utils/notebook";
import { reorderCells } from "../../utils/notebookDnd";
import {
  serializeNotebook,
  deserializeNotebook,
} from "../../utils/notebookFile";
import {
  getExecutableCells,
  createRunAllResult,
  addSuccess,
  addFailure,
  addSkipped,
} from "../../utils/notebookRunAll";
import { resolveQueryVariables } from "../../utils/notebookVariables";
import { resolveParams } from "../../utils/notebookParams";
import {
  addHistoryEntry,
  createHistoryEntry,
} from "../../utils/notebookHistory";
import { exportNotebookToHtml } from "../../utils/notebookHtmlExport";
import { useDatabase } from "../../hooks/useDatabase";
import { isMultiDatabaseCapable } from "../../utils/database";
import { useSettings } from "../../hooks/useSettings";
import { useAlert } from "../../hooks/useAlert";
import { useKeybindings } from "../../hooks/useKeybindings";
import { NotebookToolbar } from "./NotebookToolbar";
import { NotebookCellWrapper } from "./NotebookCellWrapper";
import { AddCellButton } from "./AddCellButton";
import { RunAllSummary } from "./RunAllSummary";
import { ParamsPanel } from "./ParamsPanel";
import { NotebookOutline } from "./NotebookOutline";

interface NotebookViewProps {
  tab: Tab;
  updateTab: (id: string, partial: Partial<Tab>) => void;
  connectionId: string;
}

export function NotebookView({
  tab,
  updateTab,
  connectionId,
}: NotebookViewProps) {
  const { t } = useTranslation();
  const { activeSchema, activeCapabilities, selectedDatabases } = useDatabase();
  const isMultiDb =
    isMultiDatabaseCapable(activeCapabilities) && selectedDatabases.length > 1;
  const effectiveSchema =
    tab.schema || activeSchema || (isMultiDb ? selectedDatabases[0] : null);
  const { settings } = useSettings();
  const { showAlert } = useAlert();
  const { matchesShortcut } = useKeybindings();
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllResult, setRunAllResult] = useState<RunAllResult | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const cellsRef = useRef(tab.notebookState?.cells ?? []);
  const cellRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  cellsRef.current = tab.notebookState?.cells ?? [];

  const cells = tab.notebookState?.cells ?? [];
  const stopOnError = tab.notebookState?.stopOnError ?? false;
  const params = tab.notebookState?.params ?? [];

  const updateNotebook = useCallback(
    (
      newCells: NotebookCell[],
      extraState?: {
        stopOnError?: boolean;
        params?: NotebookParam[];
      },
    ) => {
      cellsRef.current = newCells;
      updateTab(tab.id, {
        notebookState: {
          cells: newCells,
          stopOnError:
            extraState?.stopOnError !== undefined
              ? extraState.stopOnError
              : stopOnError,
          params: extraState?.params !== undefined ? extraState.params : params,
        },
      });
    },
    [tab.id, updateTab, stopOnError, params],
  );

  const updateCell = useCallback(
    (cellId: string, partial: Partial<NotebookCell>) => {
      updateNotebook(updateCellInCells(cellsRef.current, cellId, partial));
    },
    [updateNotebook],
  );

  const addCell = useCallback(
    (type: NotebookCellType, afterIndex?: number): string => {
      const newCells = addCellToCells(cellsRef.current, type, afterIndex);
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : newCells.length - 1;
      const newCellId = newCells[insertAt].id;
      updateNotebook(newCells);
      return newCellId;
    },
    [updateNotebook],
  );

  const deleteCell = useCallback(
    (cellId: string) => {
      updateNotebook(removeCellFromCells(cellsRef.current, cellId));
    },
    [updateNotebook],
  );

  const toggleStopOnError = useCallback(() => {
    updateNotebook(cellsRef.current, { stopOnError: !stopOnError });
  }, [updateNotebook, stopOnError]);

  const handleParamsChange = useCallback(
    (newParams: NotebookParam[]) => {
      updateNotebook(cellsRef.current, { params: newParams });
    },
    [updateNotebook],
  );

  const runCell = useCallback(
    async (cellId: string) => {
      const cell = cellsRef.current.find((c) => c.id === cellId);
      if (!cell || cell.type !== "sql" || !cell.content.trim()) return;

      updateCell(cellId, { isLoading: true, error: undefined, result: null });

      const pageSize =
        settings.resultPageSize && settings.resultPageSize > 0
          ? settings.resultPageSize
          : 100;

      const cellSchema = cell.schema || effectiveSchema;

      // Resolve notebook parameters first
      let sql = cell.content.trim();
      if (params.length > 0) {
        const paramResult = resolveParams(sql, params);
        if (paramResult.unresolvedParams.length > 0) {
          // Only warn, don't block — unresolved @params might be SQL variables
        }
        sql = paramResult.sql;
      }

      // Resolve cell variable references
      const { sql: resolvedSql, unresolvedRefs } = resolveQueryVariables(
        sql,
        cellsRef.current,
      );

      if (unresolvedRefs.length > 0) {
        const refLabels = unresolvedRefs
          .map((r) => `{{cell_${r.cellIndex + 1}}}`)
          .join(", ");
        updateCell(cellId, {
          error: `Unresolved cell references: ${refLabels}. Run the referenced cells first.`,
          isLoading: false,
          result: null,
        });
        return;
      }

      const start = performance.now();
      try {
        const res = await invoke<QueryResult>("execute_query", {
          connectionId,
          query: resolvedSql,
          limit: pageSize,
          page: 1,
          ...(cellSchema ? { schema: cellSchema } : {}),
        });
        const elapsed = performance.now() - start;

        const historyEntry = createHistoryEntry(
          cell.content.trim(),
          res,
          undefined,
          elapsed,
        );
        const newHistory = addHistoryEntry(cell.history ?? [], historyEntry);

        updateCell(cellId, {
          result: res,
          executionTime: elapsed,
          isLoading: false,
          error: undefined,
          history: newHistory,
        });
      } catch (e: unknown) {
        const elapsed = performance.now() - start;
        const errorMsg = e instanceof Error ? e.message : String(e);

        const historyEntry = createHistoryEntry(
          cell.content.trim(),
          null,
          errorMsg,
          elapsed,
        );
        const newHistory = addHistoryEntry(cell.history ?? [], historyEntry);

        updateCell(cellId, {
          error: errorMsg,
          executionTime: elapsed,
          isLoading: false,
          result: null,
          history: newHistory,
        });
      }
    },
    [
      connectionId,
      effectiveSchema,
      settings.resultPageSize,
      updateCell,
      params,
    ],
  );

  const runAll = useCallback(async () => {
    setIsRunningAll(true);
    setRunAllResult(null);

    const executable = getExecutableCells(cellsRef.current);
    let result = createRunAllResult();
    result = { ...result, total: executable.length };

    // Split into parallel and sequential groups
    const parallelCells = executable.filter(({ cell }) => cell.isParallel);
    const sequentialCells = executable.filter(({ cell }) => !cell.isParallel);

    // Run parallel cells concurrently
    if (parallelCells.length > 0) {
      const parallelResults = await Promise.allSettled(
        parallelCells.map(({ cell }) => runCell(cell.id)),
      );
      for (let i = 0; i < parallelCells.length; i++) {
        const { cell, index } = parallelCells[i];
        const updatedCell = cellsRef.current.find((c) => c.id === cell.id);
        if (updatedCell?.error || parallelResults[i].status === "rejected") {
          result = addFailure(
            result,
            cell.id,
            index,
            updatedCell?.error ?? "Execution failed",
          );
        } else {
          result = addSuccess(result);
        }
      }
    }

    // Run sequential cells one by one
    for (let i = 0; i < sequentialCells.length; i++) {
      const { cell, index } = sequentialCells[i];
      await runCell(cell.id);

      const updatedCell = cellsRef.current.find((c) => c.id === cell.id);
      if (updatedCell?.error) {
        result = addFailure(result, cell.id, index, updatedCell.error);
        if (stopOnError) {
          const remaining = sequentialCells.length - i - 1;
          if (remaining > 0) {
            result = addSkipped(result, remaining);
          }
          break;
        }
      } else {
        result = addSuccess(result);
      }
    }

    setRunAllResult(result);
    setIsRunningAll(false);
  }, [runCell, stopOnError]);

  const handleExport = useCallback(async () => {
    try {
      const notebook = serializeNotebook(tab.title, cellsRef.current, params);
      const safeName = tab.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = await save({
        defaultPath: `${safeName}.tabularis-notebook`,
        filters: [
          { name: "Tabularis Notebook", extensions: ["tabularis-notebook"] },
        ],
      });
      if (!filePath) return;

      await writeTextFile(filePath, JSON.stringify(notebook, null, 2));
      showAlert(t("editor.notebook.exportSuccess"), { kind: "info" });
    } catch (e) {
      console.error("Notebook export failed:", e);
      showAlert(
        t("editor.notebook.exportError") ||
          `Export failed: ${e instanceof Error ? e.message : String(e)}`,
        { kind: "error" },
      );
    }
  }, [tab.title, showAlert, t, params]);

  const handleExportHtml = useCallback(async () => {
    try {
      const html = exportNotebookToHtml(tab.title, cellsRef.current);
      const safeName = tab.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = await save({
        defaultPath: `${safeName}.html`,
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      if (!filePath) return;

      await writeTextFile(filePath, html);
      showAlert(t("editor.notebook.exportSuccess"), { kind: "info" });
    } catch (e) {
      console.error("HTML export failed:", e);
      showAlert(
        t("editor.notebook.exportError") ||
          `Export failed: ${e instanceof Error ? e.message : String(e)}`,
        { kind: "error" },
      );
    }
  }, [tab.title, showAlert, t]);

  const handleImport = useCallback(async () => {
    const filePath = await open({
      filters: [
        { name: "Tabularis Notebook", extensions: ["tabularis-notebook"] },
      ],
    });
    if (!filePath || typeof filePath !== "string") return;

    try {
      const content = await readTextFile(filePath);
      const { title, cells: importedCells, params: importedParams } = deserializeNotebook(content);
      updateTab(tab.id, {
        title,
        notebookState: {
          cells: importedCells,
          params: importedParams,
        },
      });
      showAlert(t("editor.notebook.importSuccess"), { kind: "info" });
    } catch {
      showAlert(t("editor.notebook.invalidFile"), { kind: "error" });
    }
  }, [tab.id, updateTab, showAlert, t]);

  // Drag & Drop handlers
  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [],
  );

  const handleDrop = useCallback(
    (toIndex: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = dragIndex;
      setDragIndex(null);
      setDragOverIndex(null);
      if (fromIndex === null || fromIndex === toIndex) return;
      updateNotebook(reorderCells(cellsRef.current, fromIndex, toIndex));
    },
    [dragIndex, updateNotebook],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const focusCell = useCallback((cellId: string) => {
    const tryFocus = (attempts: number) => {
      const el = cellRefsMap.current.get(cellId);
      if (!el) {
        if (attempts < 10) requestAnimationFrame(() => tryFocus(attempts + 1));
        return;
      }
      // SQL cell: Monaco editor textarea
      const monacoTextarea = el.querySelector<HTMLTextAreaElement>(".monaco-editor textarea");
      if (monacoTextarea) {
        monacoTextarea.focus();
        return;
      }
      // Markdown cell: plain textarea
      const textarea = el.querySelector<HTMLTextAreaElement>("textarea");
      if (textarea) {
        textarea.focus();
        return;
      }
      // Editor may not be mounted yet, retry
      if (attempts < 10) requestAnimationFrame(() => tryFocus(attempts + 1));
    };
    requestAnimationFrame(() => tryFocus(0));
  }, []);

  const scrollToCell = useCallback((cellId: string) => {
    const el = cellRefsMap.current.get(cellId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Keyboard shortcut: Ctrl+Shift+Enter → Run All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, "notebook_run_all")) {
        e.preventDefault();
        runAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchesShortcut, runAll]);

  const collapseAll = useCallback(() => {
    updateNotebook(cellsRef.current.map((c) => ({ ...c, isCollapsed: true })));
  }, [updateNotebook]);

  const expandAll = useCallback(() => {
    updateNotebook(cellsRef.current.map((c) => ({ ...c, isCollapsed: false })));
  }, [updateNotebook]);

  const toolbarProps = {
    onAddSqlCell: () => {
      const id = addCell("sql");
      scrollToBottom();
      focusCell(id);
    },
    onAddMarkdownCell: () => {
      const id = addCell("markdown");
      scrollToBottom();
      focusCell(id);
    },
    onRunAll: runAll,
    onExport: handleExport,
    onExportHtml: handleExportHtml,
    onImport: handleImport,
    isRunning: isRunningAll,
    stopOnError,
    onToggleStopOnError: toggleStopOnError,
    onCollapseAll: collapseAll,
    onExpandAll: expandAll,
  };

  // Empty state
  if (cells.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <NotebookToolbar {...toolbarProps} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
          <BookOpen size={32} className="opacity-40" />
          <p className="text-sm">{t("editor.notebook.emptyNotebook")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <NotebookToolbar {...toolbarProps} />
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4 space-y-0">
        <ParamsPanel params={params} onParamsChange={handleParamsChange} />
        <NotebookOutline
          cells={cells}
          onScrollToCell={scrollToCell}
          onCellNameGenerated={(cellId, name) => updateCell(cellId, { name })}
        />

        {runAllResult && (
          <RunAllSummary
            result={runAllResult}
            onDismiss={() => setRunAllResult(null)}
            onScrollToCell={scrollToCell}
          />
        )}

        {cells.map((cell, index) => (
          <div
            key={`${cell.id}-${index}`}
            ref={(el) => {
              if (el) cellRefsMap.current.set(cell.id, el);
              else cellRefsMap.current.delete(cell.id);
            }}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            className={`${
              dragOverIndex === index && dragIndex !== index
                ? "border-t-2 border-blue-500"
                : ""
            }`}
          >
            <NotebookCellWrapper
              cell={cell}
              index={index}
              totalCells={cells.length}
              onUpdate={(partial) => updateCell(cell.id, partial)}
              onDelete={() => deleteCell(cell.id)}
              onMoveUp={() => {
                if (index > 0)
                  updateNotebook(
                    reorderCells(cellsRef.current, index, index - 1),
                  );
              }}
              onMoveDown={() => {
                if (index < cells.length - 1)
                  updateNotebook(
                    reorderCells(cellsRef.current, index, index + 1),
                  );
              }}
              onRun={() => runCell(cell.id)}
              activeSchema={cell.schema || effectiveSchema || undefined}
              selectedDatabases={isMultiDb ? selectedDatabases : undefined}
              onSchemaChange={
                isMultiDb
                  ? (schema) => updateCell(cell.id, { schema })
                  : undefined
              }
              isDragging={dragIndex === index}
              dragHandleProps={{
                draggable: true,
                onDragStart: handleDragStart(index),
                onDragEnd: handleDragEnd,
              }}
            />
            <AddCellButton
              onAddSql={() => addCell("sql", index)}
              onAddMarkdown={() => addCell("markdown", index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
