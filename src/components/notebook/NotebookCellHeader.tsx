import { useTranslation } from "react-i18next";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Play,
  Eye,
  Pencil,
  Loader2,
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
}: NotebookCellHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-elevated border-b border-default">
      <div className="flex items-center gap-2">
        <CellTypeBadge cellType={cellType} />
        <span className="text-[10px] text-muted">#{index + 1}</span>
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
