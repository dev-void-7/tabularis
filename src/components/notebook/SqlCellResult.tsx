import { useTranslation } from "react-i18next";
import { DataGrid } from "../ui/DataGrid";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import type { QueryResult } from "../../types/editor";

interface SqlCellResultProps {
  result: QueryResult | null;
  error?: string;
  executionTime?: number | null;
  isLoading?: boolean;
}

export function SqlCellResult({
  result,
  error,
  executionTime,
  isLoading,
}: SqlCellResultProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-4">
        <div className="w-4 h-4 border-2 border-surface-secondary border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-muted">{t("editor.executingQuery")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-h-[120px] overflow-auto">
        <ErrorDisplay error={error} t={t} />
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="border-t border-default">
      <div className="px-3 py-1 bg-elevated text-xs text-muted flex items-center gap-2">
        <span>
          {t("editor.notebook.cellResult", {
            count: result.rows.length,
            time: executionTime != null ? Math.round(executionTime) : "—",
          })}
        </span>
      </div>
      <div className="h-[300px] overflow-hidden">
        <DataGrid
          columns={result.columns}
          data={result.rows}
          tableName={null}
          pkColumn={null}
          readonly
        />
      </div>
    </div>
  );
}
