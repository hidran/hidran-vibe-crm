import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

// Register fonts if needed, otherwise use default Helvetica
// Font.register({ ... });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 20,
  },
  invoiceInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#6B7280',
    textAlign: 'right',
    marginRight: 8,
  },
  infoValue: {
    width: 100,
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 8,
    color: '#374151',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col2: { width: '50%' },
  col3: { width: '33.33%' },
  
  // Table
  table: {
    width: 'auto',
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#F9FAFB',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 4,
    paddingRight: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 4,
    paddingRight: 4,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 10,
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  totalsBox: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#6B7280',
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#111827',
  },

  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
});

interface InvoiceDocumentProps {
  invoice: Tables<"invoices"> & {
    invoice_line_items: Tables<"invoice_line_items">[];
    client: Tables<"clients"> | null;
    organizations: Tables<"organizations"> | null;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const InvoiceDocument = ({ invoice }: InvoiceDocumentProps) => {
  // Sort line items by position to ensure correct order in PDF
  const sortedLineItems = [...invoice.invoice_line_items].sort((a, b) => {
    const posA = a.position ?? Infinity;
    const posB = b.position ?? Infinity;
    return posA - posB;
  });

  const subtotal = sortedLineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
  const total = subtotal; // Tax can be added here if needed

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.subtitle}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.headerRight}>
             <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{invoice.organizations?.name || 'Organization Name'}</Text>
             <Text>Status: {invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={{ flexDirection: 'row', marginBottom: 30 }}>
            {/* Bill To */}
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Bill To</Text>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{invoice.client?.name}</Text>
                <Text>{invoice.client?.email}</Text>
                <Text>{invoice.client?.address}</Text>
                {invoice.client?.vat_number && <Text>VAT: {invoice.client?.vat_number}</Text>}
            </View>

            {/* Invoice Details */}
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Issue Date:</Text>
                    <Text style={styles.infoValue}>{invoice.issue_date && format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Due Date:</Text>
                    <Text style={styles.infoValue}>{invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'On Receipt'}</Text>
                </View>
            </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
            <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colDesc]}>Description</Text>
                <Text style={[styles.th, styles.colQty]}>Qty</Text>
                <Text style={[styles.th, styles.colPrice]}>Price</Text>
                <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </View>
            
            {sortedLineItems.map((item, index) => (
                <View key={item.id || index} style={styles.tableRow}>
                    <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                    <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.td, styles.colPrice]}>{formatCurrency(Number(item.unit_price))}</Text>
                    <Text style={[styles.td, styles.colTotal]}>{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</Text>
                </View>
            ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
            <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                </View>
                {/* Add Tax/Discount rows here if needed */}
                <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 4, paddingTop: 4 }]}>
                    <Text style={[styles.totalLabel, { fontSize: 14, color: '#111827' }]}>Total:</Text>
                    <Text style={[styles.totalValue, { fontSize: 14 }]}>{formatCurrency(total)}</Text>
                </View>
            </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
            <View style={{ marginTop: 40 }}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.5 }}>
                    {invoice.notes}
                </Text>
            </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
            <Text>Thank you for your business.</Text>
        </View>

      </Page>
    </Document>
  );
};
