import { useTranslation } from "react-i18next";
import {
  Plus,
  Play,
  Download,
  Upload,
  Loader2,
  OctagonX,
  FileCode,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";

interface NotebookToolbarProps {
  onAddSqlCell: () => void;
  onAddMarkdownCell: () => void;
  onRunAll: () => void;
  onExport: () => void;
  onExportHtml: () => void;
  onImport: () => void;
  isRunning: boolean;
  stopOnError: boolean;
  onToggleStopOnError: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

function ToolbarButton({
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
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-secondary hover:text-primary hover:bg-surface-secondary rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-default mx-1" />;
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

export function NotebookToolbar({
  onAddSqlCell,
  onAddMarkdownCell,
  onRunAll,
  onExport,
  onExportHtml,
  onImport,
  isRunning,
  stopOnError,
  onToggleStopOnError,
  onCollapseAll,
  onExpandAll,
}: NotebookToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="h-10 bg-elevated border-b border-default flex items-center px-2 gap-0.5 shrink-0">
      <div className="flex items-center bg-surface-secondary rounded overflow-hidden">
        <span className="pl-2 text-muted">
          <Plus size={14} />
        </span>
        <button
          type="button"
          onClick={onAddSqlCell}
          title={t("editor.notebook.addSqlCell")}
          className="px-2 py-1 text-xs font-semibold text-green-400 hover:bg-green-500/15 transition-colors"
        >
          SQL
        </button>
        <div className="w-px h-4 bg-default" />
        <button
          type="button"
          onClick={onAddMarkdownCell}
          title={t("editor.notebook.addMarkdownCell")}
          className="px-2 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/15 transition-colors"
        >
          MD
        </button>
      </div>

      <Separator />

      <ToolbarGroup>
        <ToolbarButton
          onClick={onRunAll}
          disabled={isRunning}
          title={t("editor.notebook.runAllTooltip")}
        >
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} className="text-green-400" />
          )}
          <span>{t("editor.notebook.runAll")}</span>
        </ToolbarButton>

        <button
          type="button"
          onClick={onToggleStopOnError}
          title={t("editor.notebook.stopOnErrorTooltip")}
          className={`flex items-center gap-1 px-1.5 py-1 text-[10px] rounded transition-colors ${
            stopOnError
              ? "bg-red-500/15 text-red-400 font-semibold"
              : "text-muted hover:text-secondary hover:bg-surface-secondary"
          }`}
        >
          <OctagonX size={12} />
          <span>{t("editor.notebook.stopOnError")}</span>
        </button>
      </ToolbarGroup>

      <Separator />

      <ToolbarGroup>
        <ToolbarButton
          onClick={onCollapseAll}
          title={t("editor.notebook.collapseAll")}
        >
          <ChevronsDownUp size={14} />
          <span>{t("editor.notebook.collapseAll")}</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={onExpandAll}
          title={t("editor.notebook.expandAll")}
        >
          <ChevronsUpDown size={14} />
          <span>{t("editor.notebook.expandAll")}</span>
        </ToolbarButton>
      </ToolbarGroup>

      <div className="flex-1" />

      <ToolbarGroup>
        <ToolbarButton onClick={onExport} title={t("editor.notebook.export")}>
          <Download size={14} />
          <span>{t("editor.notebook.export")}</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={onExportHtml}
          title={t("editor.notebook.exportHtml")}
        >
          <FileCode size={14} />
          <span>HTML</span>
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={onImport} title={t("editor.notebook.import")}>
          <Upload size={14} />
          <span>{t("editor.notebook.import")}</span>
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}
