import { PDFViewer } from '@react-pdf/renderer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InvoiceDocument } from './InvoiceDocument';
import { Tables } from '@/integrations/supabase/types';

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Tables<"invoices"> & {
    invoice_line_items: Tables<"invoice_line_items">[];
    client: Tables<"clients"> | null;
    organizations: Tables<"organizations"> | null;
  };
}

export const InvoicePreview = ({ open, onOpenChange, invoice }: InvoicePreviewProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0">
        <PDFViewer width="100%" height="100%" className="rounded-md">
           <InvoiceDocument invoice={invoice} />
        </PDFViewer>
      </DialogContent>
    </Dialog>
  );
};
