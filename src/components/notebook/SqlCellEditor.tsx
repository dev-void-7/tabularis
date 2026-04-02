import { SqlEditorWrapper } from "../ui/SqlEditorWrapper";

interface SqlCellEditorProps {
  cellId: string;
  content: string;
  onContentChange: (content: string) => void;
  onRun: () => void;
}

export function SqlCellEditor({
  cellId,
  content,
  onContentChange,
  onRun,
}: SqlCellEditorProps) {
  return (
    <div className="h-[150px]">
      <SqlEditorWrapper
        height="100%"
        initialValue={content}
        onChange={onContentChange}
        onRun={onRun}
        editorKey={`notebook-${cellId}`}
        options={{
          padding: { top: 8, bottom: 8 },
          lineNumbers: "off",
        }}
      />
    </div>
  );
}
