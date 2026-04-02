import { useTranslation } from "react-i18next";
import { Plus, Play, Download, Upload, Loader2 } from "lucide-react";

interface NotebookToolbarProps {
  onAddSqlCell: () => void;
  onAddMarkdownCell: () => void;
  onRunAll: () => void;
  onExport: () => void;
  onImport: () => void;
  isRunning: boolean;
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

export function NotebookToolbar({
  onAddSqlCell,
  onAddMarkdownCell,
  onRunAll,
  onExport,
  onImport,
  isRunning,
}: NotebookToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="h-10 bg-elevated border-b border-default flex items-center px-2 gap-0.5 shrink-0">
      <ToolbarButton onClick={onAddSqlCell} title={t("editor.notebook.addSqlCell")}>
        <Plus size={14} />
        <span className="font-semibold text-green-400">SQL</span>
      </ToolbarButton>

      <ToolbarButton onClick={onAddMarkdownCell} title={t("editor.notebook.addMarkdownCell")}>
        <Plus size={14} />
        <span className="font-semibold text-blue-400">MD</span>
      </ToolbarButton>

      <Separator />

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

      <Separator />

      <ToolbarButton onClick={onExport} title={t("editor.notebook.export")}>
        <Download size={14} />
        <span>{t("editor.notebook.export")}</span>
      </ToolbarButton>

      <ToolbarButton onClick={onImport} title={t("editor.notebook.import")}>
        <Upload size={14} />
        <span>{t("editor.notebook.import")}</span>
      </ToolbarButton>
    </div>
  );
}
