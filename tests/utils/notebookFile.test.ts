import { describe, it, expect } from 'vitest';
import {
  serializeNotebook,
  deserializeNotebook,
  validateNotebookFile,
} from '../../src/utils/notebookFile';
import type { NotebookCell } from '../../src/types/notebook';

function makeCells(): NotebookCell[] {
  return [
    {
      id: 'cell-1',
      type: 'sql',
      content: 'SELECT * FROM users',
      result: { columns: ['id'], rows: [[1]], affected_rows: 0 },
      error: undefined,
      executionTime: 123,
      isLoading: false,
    },
    {
      id: 'cell-2',
      type: 'markdown',
      content: '# Report',
      result: null,
      error: undefined,
      executionTime: null,
      isLoading: false,
      isPreview: true,
    },
  ];
}

describe('notebookFile utils', () => {
  describe('serializeNotebook', () => {
    it('should produce correct structure', () => {
      const result = serializeNotebook('My Notebook', makeCells());
      expect(result.version).toBe(1);
      expect(result.title).toBe('My Notebook');
      expect(result.createdAt).toBeTruthy();
      expect(result.cells).toHaveLength(2);
    });

    it('should strip runtime data from cells', () => {
      const result = serializeNotebook('Test', makeCells());
      const cell = result.cells[0];
      expect(cell).toEqual({ type: 'sql', content: 'SELECT * FROM users' });
      expect(cell).not.toHaveProperty('id');
      expect(cell).not.toHaveProperty('result');
      expect(cell).not.toHaveProperty('error');
      expect(cell).not.toHaveProperty('executionTime');
      expect(cell).not.toHaveProperty('isLoading');
    });

    it('should handle empty cells array', () => {
      const result = serializeNotebook('Empty', []);
      expect(result.cells).toHaveLength(0);
    });
  });

  describe('validateNotebookFile', () => {
    it('should return true for valid notebook file', () => {
      const data = {
        version: 1,
        title: 'Test',
        createdAt: '2026-01-01',
        cells: [
          { type: 'sql', content: 'SELECT 1' },
          { type: 'markdown', content: '# Title' },
        ],
      };
      expect(validateNotebookFile(data)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateNotebookFile(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateNotebookFile('string')).toBe(false);
      expect(validateNotebookFile(42)).toBe(false);
    });

    it('should return false for missing version', () => {
      expect(validateNotebookFile({ title: 'T', cells: [] })).toBe(false);
    });

    it('should return false for missing title', () => {
      expect(validateNotebookFile({ version: 1, cells: [] })).toBe(false);
    });

    it('should return false for missing cells', () => {
      expect(validateNotebookFile({ version: 1, title: 'T' })).toBe(false);
    });

    it('should return false for invalid cell type', () => {
      const data = {
        version: 1,
        title: 'T',
        createdAt: '',
        cells: [{ type: 'invalid', content: '' }],
      };
      expect(validateNotebookFile(data)).toBe(false);
    });

    it('should return false for cell without content', () => {
      const data = {
        version: 1,
        title: 'T',
        createdAt: '',
        cells: [{ type: 'sql' }],
      };
      expect(validateNotebookFile(data)).toBe(false);
    });
  });

  describe('deserializeNotebook', () => {
    it('should parse valid JSON and generate cell IDs', () => {
      const json = JSON.stringify({
        version: 1,
        title: 'My Notebook',
        createdAt: '2026-01-01',
        cells: [
          { type: 'sql', content: 'SELECT 1' },
          { type: 'markdown', content: '# Title' },
        ],
      });

      const result = deserializeNotebook(json);
      expect(result.title).toBe('My Notebook');
      expect(result.cells).toHaveLength(2);
      expect(result.cells[0].id).toMatch(/^cell_/);
      expect(result.cells[0].type).toBe('sql');
      expect(result.cells[0].content).toBe('SELECT 1');
      expect(result.cells[0].result).toBeNull();
      expect(result.cells[0].isLoading).toBe(false);
    });

    it('should set isPreview to true for markdown cells', () => {
      const json = JSON.stringify({
        version: 1,
        title: 'T',
        createdAt: '',
        cells: [{ type: 'markdown', content: '# Hi' }],
      });
      const result = deserializeNotebook(json);
      expect(result.cells[0].isPreview).toBe(true);
    });

    it('should set isPreview to undefined for SQL cells', () => {
      const json = JSON.stringify({
        version: 1,
        title: 'T',
        createdAt: '',
        cells: [{ type: 'sql', content: 'SELECT 1' }],
      });
      const result = deserializeNotebook(json);
      expect(result.cells[0].isPreview).toBeUndefined();
    });

    it('should throw on invalid JSON', () => {
      expect(() => deserializeNotebook('not json')).toThrow('Invalid JSON');
    });

    it('should throw on invalid notebook structure', () => {
      expect(() => deserializeNotebook('{}')).toThrow('Invalid notebook file format');
    });

    it('should throw on missing version', () => {
      const json = JSON.stringify({ title: 'T', cells: [] });
      expect(() => deserializeNotebook(json)).toThrow('Invalid notebook file format');
    });
  });

  describe('round-trip', () => {
    it('should preserve content through serialize → deserialize', () => {
      const cells = makeCells();
      const serialized = serializeNotebook('Round Trip', cells);
      const json = JSON.stringify(serialized);
      const { title, cells: restoredCells } = deserializeNotebook(json);

      expect(title).toBe('Round Trip');
      expect(restoredCells).toHaveLength(2);
      expect(restoredCells[0].type).toBe('sql');
      expect(restoredCells[0].content).toBe('SELECT * FROM users');
      expect(restoredCells[1].type).toBe('markdown');
      expect(restoredCells[1].content).toBe('# Report');
    });
  });
});
