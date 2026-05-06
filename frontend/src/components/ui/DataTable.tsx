import { cn } from "@/lib/utils";

interface Column<T> {
  key:       string;
  header:    React.ReactNode;
  render:    (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns:   Column<T>[];
  data:      T[];
  keyFn:     (row: T) => string | number;
  emptyText?: string;
  className?: string;
}

export function DataTable<T>({ columns, data, keyFn, emptyText = "No data", className }: Props<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-left px-3.5 py-2.5 text-[10px] font-medium uppercase tracking-wide",
                  "text-[#4a4a68] border-b border-[rgba(255,255,255,0.06)] bg-[#111118]",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-10 text-[#4a4a68] text-[11px]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyFn(row)}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1c1c28] transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-3.5 py-2.5 text-[#eeeef5]", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
