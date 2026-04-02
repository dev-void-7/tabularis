import type { NotebookCell } from "../../types/notebook";
import { NotebookCellHeader } from "./NotebookCellHeader";
import { SqlCell } from "./SqlCell";
import { MarkdownCell } from "./MarkdownCell";

interface NotebookCellWrapperProps {
  cell: NotebookCell;
  index: number;
  totalCells: number;
  onUpdate: (partial: Partial<NotebookCell>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRun: () => void;
  activeSchema?: string;
  selectedDatabases?: string[];
  onSchemaChange?: (schema: string) => void;
}

export function NotebookCellWrapper({
  cell,
  index,
  totalCells,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRun,
  activeSchema,
  selectedDatabases,
  onSchemaChange,
}: NotebookCellWrapperProps) {
  return (
    <div className="bg-base border border-default rounded-lg overflow-hidden">
      <NotebookCellHeader
        cellType={cell.type}
        index={index}
        totalCells={totalCells}
        isPreview={cell.isPreview}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        onRun={cell.type === "sql" ? onRun : undefined}
        onTogglePreview={
          cell.type === "markdown"
            ? () => onUpdate({ isPreview: !cell.isPreview })
            : undefined
        }
        isLoading={cell.isLoading}
        activeSchema={activeSchema}
        selectedDatabases={selectedDatabases}
        onSchemaChange={onSchemaChange}
      />

      {cell.type === "sql" ? (
        <SqlCell
          cell={cell}
          onContentChange={(content) => onUpdate({ content })}
          onRun={onRun}
        />
      ) : (
        <MarkdownCell
          cell={cell}
          onContentChange={(content) => onUpdate({ content })}
          onTogglePreview={() => onUpdate({ isPreview: !cell.isPreview })}
        />
      )}
    </div>
  );
}
