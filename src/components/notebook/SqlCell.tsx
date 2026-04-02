import type { NotebookCell } from "../../types/notebook";
import { SqlCellEditor } from "./SqlCellEditor";
import { SqlCellResult } from "./SqlCellResult";

interface SqlCellProps {
  cell: NotebookCell;
  onContentChange: (content: string) => void;
  onRun: () => void;
}

export function SqlCell({ cell, onContentChange, onRun }: SqlCellProps) {
  return (
    <div>
      <SqlCellEditor
        cellId={cell.id}
        content={cell.content}
        onContentChange={onContentChange}
        onRun={onRun}
      />
      <SqlCellResult
        result={cell.result ?? null}
        error={cell.error}
        executionTime={cell.executionTime}
        isLoading={cell.isLoading}
      />
    </div>
  );
}
