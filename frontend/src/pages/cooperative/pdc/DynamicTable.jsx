import React from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

const DynamicTable = ({ columns, rows, onChange, readOnly = false, addLabel = 'Ajouter une ligne' }) => {
  const addRow = () => {
    const newRow = {};
    columns.forEach(col => { newRow[col.key] = col.defaultValue || ''; });
    onChange([...rows, newRow]);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex, key, value) => {
    const updated = rows.map((row, i) => i === rowIndex ? { ...row, [key]: value } : row);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[#E5E5E0] rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#E8F0EA]">
              {columns.map(col => (
                <th key={col.key} className="text-left px-3 py-2 text-xs font-semibold text-[#1A3622] border-b border-[#E5E5E0] whitespace-nowrap" style={{ minWidth: col.width || 'auto' }}>
                  {col.label}
                </th>
              ))}
              {!readOnly && <th className="w-10 border-b border-[#E5E5E0]" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="text-center py-6 text-[#6B7280] text-xs">
                  Aucune donnee. {!readOnly && 'Cliquez sur "Ajouter" pour commencer.'}
                </td>
              </tr>
            )}
            {rows.map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="border-b border-[#E5E5E0] last:border-0 hover:bg-[#FAF9F6]">
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-1.5">
                    {readOnly || col.readOnly ? (
                      <span className="text-sm text-[#374151]">{row[col.key] || '-'}</span>
                    ) : col.type === 'select' ? (
                      <select
                        value={row[col.key] || ''}
                        onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                        className="w-full border border-[#E5E5E0] rounded px-2 py-1 text-sm bg-white focus:ring-1 focus:ring-[#1A3622] focus:border-[#1A3622] outline-none"
                        data-testid={`dt-${col.key}-${rowIdx}`}
                      >
                        <option value="">--</option>
                        {(col.options || []).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : col.type === 'number' ? (
                      <Input
                        type="number"
                        value={row[col.key] || ''}
                        onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                        className="h-7 text-sm border-[#E5E5E0]"
                        data-testid={`dt-${col.key}-${rowIdx}`}
                      />
                    ) : (
                      <Input
                        type="text"
                        value={row[col.key] || ''}
                        onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                        className="h-7 text-sm border-[#E5E5E0]"
                        data-testid={`dt-${col.key}-${rowIdx}`}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1 py-1.5">
                    <Button variant="ghost" size="sm" onClick={() => removeRow(rowIdx)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" data-testid={`dt-remove-${rowIdx}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addRow} className="text-xs border-dashed border-[#1A3622] text-[#1A3622] hover:bg-[#E8F0EA]" data-testid="dt-add-row">
          <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
        </Button>
      )}
    </div>
  );
};

export default DynamicTable;
