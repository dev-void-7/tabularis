import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Play,
  Eye,
  Pencil,
  Loader2,
  Database,
} from "lucide-react";
import type { NotebookCellType } from "../../types/notebook";

interface NotebookCellHeaderProps {
  cellType: NotebookCellType;
  index: number;
  totalCells: number;
  isPreview?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onRun?: () => void;
  onTogglePreview?: () => void;
  isLoading?: boolean;
  activeSchema?: string;
  selectedDatabases?: string[];
  onSchemaChange?: (schema: string) => void;
}

function CellTypeBadge({ cellType }: { cellType: NotebookCellType }) {
  const { t } = useTranslation();

  if (cellType === "sql") {
    return (
      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
        {t("editor.notebook.sqlCell")}
      </span>
    );
  }

  return (
    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
      {t("editor.notebook.markdownCell")}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1 text-muted hover:text-primary hover:bg-surface-secondary rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export function NotebookCellHeader({
  cellType,
  index,
  totalCells,
  isPreview,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRun,
  onTogglePreview,
  isLoading,
  activeSchema,
  selectedDatabases,
  onSchemaChange,
}: NotebookCellHeaderProps) {
  const { t } = useTranslation();
  const [isDbOpen, setIsDbOpen] = useState(false);
  const showDbSelector = cellType === "sql" && selectedDatabases && selectedDatabases.length > 1 && activeSchema && onSchemaChange;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-elevated border-b border-default relative z-10">
      <div className="flex items-center gap-2">
        <CellTypeBadge cellType={cellType} />
        <span className="text-[10px] text-muted">#{index + 1}</span>
        {showDbSelector && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDbOpen((v) => !v)}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-secondary border border-strong rounded text-[10px] text-secondary hover:text-primary hover:bg-surface transition-colors"
              title={t("editor.activeDatabase")}
            >
              <Database size={10} className="text-muted shrink-0" />
              <span className="max-w-[100px] truncate">{activeSchema}</span>
              <ChevronDown size={10} className="text-muted shrink-0" />
            </button>
            {isDbOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDbOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-surface-secondary border border-strong rounded shadow-xl z-50 flex flex-col py-1">
                  {selectedDatabases.map((db) => (
                    <button
                      key={db}
                      type="button"
                      onClick={() => {
                        onSchemaChange(db);
                        setIsDbOpen(false);
                      }}
                      className={`text-left px-2.5 py-1 text-[11px] hover:bg-surface transition-colors flex items-center gap-1.5 ${
                        activeSchema === db
                          ? "text-white font-medium"
                          : "text-secondary"
                      }`}
                    >
                      <Database size={10} className="text-muted shrink-0" />
                      {db}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {cellType === "sql" && onRun && (
          <ActionButton onClick={onRun} title={t("editor.notebook.runCell")} disabled={isLoading}>
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
          </ActionButton>
        )}

        {cellType === "markdown" && onTogglePreview && (
          <ActionButton onClick={onTogglePreview} title={t("editor.notebook.togglePreview")}>
            {isPreview ? <Pencil size={14} /> : <Eye size={14} />}
          </ActionButton>
        )}

        <ActionButton
          onClick={onMoveUp}
          disabled={index === 0}
          title={t("editor.notebook.moveCellUp")}
        >
          <ChevronUp size={14} />
        </ActionButton>

        <ActionButton
          onClick={onMoveDown}
          disabled={index === totalCells - 1}
          title={t("editor.notebook.moveCellDown")}
        >
          <ChevronDown size={14} />
        </ActionButton>

        <ActionButton onClick={onDelete} title={t("editor.notebook.deleteCell")}>
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </div>
  );
}
