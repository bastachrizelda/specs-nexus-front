/**
 * Export financial records to an xlsx file
 * @param {Array} records - Array of membership/financial records
 * @returns {void} - Downloads the file directly
 */
export const exportFinancialRecordsToXlsx = async (records) => {
  if (!records || records.length === 0) {
    return;
  }

  // Filter to only include paid students
  const paidRecords = records.filter(
    (record) => record.payment_status?.toLowerCase() === 'paid'
  );

  if (paidRecords.length === 0) {
    alert('No paid records to export.');
    return;
  }

  // Dynamic import to avoid webpack initialization issues
  const XLSX = await import('xlsx-js-style');

  // Format date for filename
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Format payment date for export (Philippine Time)
  const formatPaymentDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });
  };

  // Prepare financial data with all required fields
  const financialData = paidRecords.map((record, index) => ({
    'No.': index + 1,
    'Full Name': record.user?.full_name || 'Unknown',
    'Year': record.user?.year ? record.user.year.replace(' year', '').replace(' Year', '') : 'N/A',
    'Block': record.user?.block || 'N/A',
    'Semester': record.requirement || 'N/A',
    'Amount': record.amount ? `₱${parseFloat(record.amount).toFixed(2)}` : '₱0.00',
    'Payment Method': record.payment_method ? record.payment_method.toUpperCase() : 'N/A',
    'Reference Number': record.reference_number || record.receipt_number || '-',
    'Receipt': record.receipt_path || (record.receipt_number ? `Cash Receipt: ${record.receipt_number}` : 'No receipt'),
    'Payment Date': formatPaymentDate(record.payment_date),
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(financialData);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // No.
    { wch: 25 },  // Full Name
    { wch: 10 },  // Year
    { wch: 8 },   // Block
    { wch: 24 },  // Semester
    { wch: 12 },  // Amount
    { wch: 15 },  // Payment Method
    { wch: 20 },  // Reference Number
    { wch: 50 },  // Receipt URL
    { wch: 22 },  // Payment Date
  ];

  // Style header row - matching attendance report style
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2D5641' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  const dataStyle = {
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    },
  };

  const centerDataStyle = {
    ...dataStyle,
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const amountStyle = {
    ...dataStyle,
    alignment: { horizontal: 'right', vertical: 'center' },
    font: { bold: true, color: { rgb: '059669' } },
  };

  const linkStyle = {
    ...dataStyle,
    font: { color: { rgb: '0066CC' }, underline: true },
  };

  // Apply header styles (A1 to J1)
  const headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  headers.forEach(col => {
    const cell = ws[`${col}1`];
    if (cell) {
      cell.s = headerStyle;
    }
  });

  // Apply data row styles
  for (let i = 0; i < financialData.length; i++) {
    const rowNum = i + 2;
    
    headers.forEach((col, colIndex) => {
      const cell = ws[`${col}${rowNum}`];
      if (cell) {
        if (colIndex === 0 || colIndex === 2 || colIndex === 3 || colIndex === 6) {
          // No., Year, Block, Payment Method - centered
          cell.s = centerDataStyle;
        } else if (colIndex === 5) {
          // Amount - right aligned, green, bold
          cell.s = amountStyle;
        } else if (colIndex === 7) {
          // Reference Number - centered
          cell.s = centerDataStyle;
        } else if (colIndex === 8) {
          // Receipt URL - link style
          cell.s = linkStyle;
        } else {
          cell.s = dataStyle;
        }
      }
    });
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Records');

  // Create summary sheet
  const totalAmount = paidRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const firstSemCount = paidRecords.filter(r => r.requirement?.includes('1st')).length;
  const secondSemCount = paidRecords.filter(r => r.requirement?.includes('2nd')).length;

  const summaryData = [
    { 'Metric': 'Report Title', 'Value': 'Financial Records - Membership Payments' },
    { 'Metric': 'Export Date', 'Value': new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) },
    { 'Metric': 'Total Paid Members', 'Value': paidRecords.length },
    { 'Metric': '1st Semester Payments', 'Value': firstSemCount },
    { 'Metric': '2nd Semester Payments', 'Value': secondSemCount },
    { 'Metric': 'Total Amount Collected', 'Value': `₱${totalAmount.toFixed(2)}` },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 22 }, { wch: 45 }];

  // Style summary header
  ['A1', 'B1'].forEach(cell => {
    if (summaryWs[cell]) {
      summaryWs[cell].s = headerStyle;
    }
  });

  // Style summary data rows
  for (let i = 2; i <= summaryData.length + 1; i++) {
    ['A', 'B'].forEach(col => {
      const cell = summaryWs[`${col}${i}`];
      if (cell) {
        cell.s = dataStyle;
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Generate and download the file
  const fileName = `Financial_Records_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
