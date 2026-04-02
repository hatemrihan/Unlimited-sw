import { Order } from '../hooks/useOrders';

export const exportOrdersAsCSV = (orders: Order[]) => {
  const escapeCSV = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const headers = ['Customer', 'Order ID', 'Email', 'Phone', 'Shipping Address', 'Products', 'Colors', 'Promo Code', 'Discount', 'Payment Method', 'Total'];
  let csvContent = headers.map(escapeCSV).join(',') + '\n';

  // O(N) Single-pass memory concatenation stopping massive Browser Heap array explosions
  for (const order of orders) {
    const products = order.products.map(p => `${p.name}${p.size ? ` (${p.size})` : ''} x${p.quantity}`).join('; ');
    const colors = order.products.map(p => p.color || 'N/A').join('; ');

    const row = [
      order.customer.name,
      order.orderId,
      order.customer.email,
      order.customer.phone,
      order.customer.address,
      products,
      colors,
      order.promoCode || 'N/A',
      order.discountAmount || 0,
      order.paymentMethod === 'cashOnDelivery' ? 'COD' : 'InstaPay',
      `${order.totalAmount} L.E`
    ];
    csvContent += row.map(escapeCSV).join(',') + '\n';
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `shipping_orders_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportOrdersAsJSON = (orders: Order[]) => {
  const jsonData = orders.map(order => {
    const products = order.products.map(p => ({
      name: p.name,
      size: p.size || null,
      color: p.color || null,
      quantity: p.quantity,
      price: p.price
    }));

    return {
      customer: order.customer.name,
      orderId: order.orderId,
      email: order.customer.email,
      phone: order.customer.phone,
      shippingAddress: order.customer.address,
      products: products,
      promoCode: order.promoCode || 'N/A',
      paymentMethod: order.paymentMethod === 'cashOnDelivery' ? 'COD' : 'InstaPay',
      total: `${order.totalAmount} L.E`
    };
  });

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `shipping_orders_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportOrdersAsExcel = async (orders: Order[]) => {
  // Import xlsx dynamically to avoid SSR issues
  const XLSX = await import('xlsx');

  const excelData = orders.map(order => {
    const products = order.products.map(p => `${p.name}${p.size ? ` (${p.size})` : ''} x${p.quantity}`).join('; ');
    const colors = order.products.map(p => p.color || 'N/A').join('; ');
    return {
      'Customer': order.customer.name,
      'Order ID': order.orderId,
      'Email': order.customer.email,
      'Phone': order.customer.phone,
      'Shipping Address': order.customer.address,
      'Products': products,
      'Colors': colors,
      'Promo Code': order.promoCode || 'N/A',
      'Discount': order.discountAmount || 0,
      'Payment Method': order.paymentMethod === 'cashOnDelivery' ? 'COD' : 'InstaPay',
      'Total': `${order.totalAmount} L.E`
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  // Auto-size columns (ensure full address visibility while restricting compute depth preventing browser layout crash)
  const sampleData = excelData.slice(0, 50);
  const cols = [
    { wch: Math.max(12, ...sampleData.map(r => String(r['Customer']).length)) },
    { wch: 20 }, // Order ID
    { wch: Math.max(24, ...sampleData.map(r => String(r['Email']).length)) },
    { wch: 16 }, // Phone
    { wch: Math.min(120, Math.max(50, ...sampleData.map(r => String(r['Shipping Address']).length))) },
    { wch: Math.max(40, ...sampleData.map(r => String(r['Products']).length)) },
    { wch: 12 }, // Colors
    { wch: 12 }, // Promo Code
    { wch: 12 }, // Discount
    { wch: 12 }, // Payment
    { wch: 12 }, // Total
  ];
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, `shipping_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportOrdersAsPDF = async (orders: Order[]) => {
  // Import jsPDF dynamically to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text('Shipping Orders Report', 14, 22);
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Prepare data for table
  const tableData = orders.map(order => {
    const products = order.products.map(p => `${p.name}${p.size ? ` (${p.size})` : ''}${p.color ? ` - ${p.color}` : ''} x${p.quantity}`).join('; ');
    return [
      order.customer.name,
      order.orderId,
      order.customer.email,
      order.customer.phone,
      order.customer.address, // full address
      order.paymentMethod === 'cashOnDelivery' ? 'COD' : 'InstaPay',
      order.promoCode || 'N/A',
      `${order.totalAmount} L.E`
    ];
  });

  autoTable(doc, {
    head: [['Customer', 'Order ID', 'Email', 'Phone', 'Address', 'Payment', 'Promo Code', 'Total']],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      4: { cellWidth: 50 }, // Allow wrapping without hard overflowing bounds natively
      5: { cellWidth: 30 },  // Payment
      6: { cellWidth: 20 },  // Promo Code
      7: { cellWidth: 20 },  // Total
      // jspdf-autotable types don't expose columnStyles fully
    } as any,
  });

  doc.save(`shipping_orders_${new Date().toISOString().split('T')[0]}.pdf`);
};
