import * as XLSX from 'xlsx';

/**
 * Sanitize and format data for Excel cells
 */
const sanitizeCellValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'نعم' : 'لا';
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
};

/**
 * Universal export function to download data as a styled Excel file (.xlsx)
 * 
 * @param {Object} options
 * @param {string} options.filename - The name of the downloaded file (without .xlsx extension)
 * @param {string} [options.sheetName='البيانات'] - Sheet name
 * @param {Array<{ key: string, header: string, width?: number, transform?: (val: any, row: any) => any }>} [options.columns] - Optional column definitions
 * @param {Array<Object>} options.data - The data array to export
 * @param {boolean} [options.rtl=true] - Enable right-to-left orientation for Arabic sheets
 */
export const exportToExcel = ({
  filename = 'تصدير_بيانات',
  sheetName = 'البيانات',
  columns,
  data = [],
  rtl = true
}) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('لا توجد بيانات متاحة للتصدير');
  }

  // 1. Transform data according to column specs if provided
  let formattedData = [];
  let colWidths = [];

  if (columns && columns.length > 0) {
    formattedData = data.map((row, idx) => {
      const formattedRow = {};
      columns.forEach((col) => {
        const rawVal = row[col.key];
        const val = col.transform ? col.transform(rawVal, row, idx) : rawVal;
        formattedRow[col.header] = sanitizeCellValue(val);
      });
      return formattedRow;
    });

    colWidths = columns.map((col) => {
      if (col.width) return { wch: col.width };
      // Auto-calculate width based on header length
      const headerLen = String(col.header).length;
      return { wch: Math.max(headerLen + 4, 15) };
    });
  } else {
    // If no columns specified, use raw object keys as headers
    formattedData = data.map((row) => {
      const formattedRow = {};
      Object.entries(row).forEach(([key, val]) => {
        formattedRow[key] = sanitizeCellValue(val);
      });
      return formattedRow;
    });

    const firstRow = formattedData[0] || {};
    colWidths = Object.keys(firstRow).map((k) => ({
      wch: Math.max(String(k).length + 4, 15)
    }));
  }

  // 2. Create SheetJS worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths
  worksheet['!cols'] = colWidths;

  // Set Right-To-Left view for Arabic if requested
  if (rtl) {
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'].push({ rightToLeft: true });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // 3. Trigger automatic browser download
  const cleanFilename = `${filename.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);

  return true;
};

/**
 * Export directly from an HTML <table> element or selector
 */
export const exportHtmlTableToExcel = (tableElementOrSelector, filename = 'جدول_بيانات', rtl = true) => {
  const table = typeof tableElementOrSelector === 'string' 
    ? document.querySelector(tableElementOrSelector) 
    : tableElementOrSelector;

  if (!table) {
    throw new Error('لم يتم العثور على عنصر الجدول المطلوب للتصدير');
  }

  const workbook = XLSX.utils.table_to_book(table, { raw: true });
  const sheetName = workbook.SheetNames[0];
  if (sheetName && rtl) {
    const ws = workbook.Sheets[sheetName];
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });
  }

  const cleanFilename = `${filename.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
  return true;
};
