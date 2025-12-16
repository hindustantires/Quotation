
import React, { useState, useMemo, useRef } from 'react';
import type { Quotation, LineItem, CompanyDetails } from '../types.ts';
import { QuotationPreview } from './QuotationPreview.tsx';

interface QuotationFormProps {
  initialData: Quotation | null;
  onSave: (quote: Quotation) => void;
  onCancel: () => void;
  companyDetails: CompanyDetails;
  quotes: Quotation[];
}

const generateQuoteNumber = (existingQuotes: Quotation[]) => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear(); // Use full year (YYYY)
    const datePrefix = `${day}${month}${year}`;

    // Calculate next global serial number (Continuous across days)
    let maxSerial = 0;
    existingQuotes.forEach(q => {
        if (!q.quoteNumber) return;
        
        // Split by '-' to get the serial part (assumed to be at the end)
        const parts = q.quoteNumber.split('-');
        if (parts.length >= 2) {
             const lastPart = parts[parts.length - 1];
             // Parse integer base 10
             const potentialSerial = parseInt(lastPart, 10);
             if (!isNaN(potentialSerial)) {
                 if (potentialSerial > maxSerial) {
                     maxSerial = potentialSerial;
                 }
             }
        }
    });

    const nextSerial = maxSerial + 1;
    // Pad to 3 digits (e.g., 001, 002) based on user requirement
    const serialNumber = nextSerial.toString().padStart(3, '0');

    return `${datePrefix}-${serialNumber}`;
};

const emptyLineItem: LineItem = { id: '', description: '', quantity: 1, unitAmount: 0 };

// Helper components moved outside of QuotationForm to prevent them from being
// recreated on every render, which was causing the input focus issue.
const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-slate-700">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

const FormField: React.FC<{label: string, children: React.ReactNode, fullWidth?: boolean}> = ({ label, children, fullWidth }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
);
  
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full px-3 py-2 border bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${props.className}`} />
);

export const QuotationForm: React.FC<QuotationFormProps> = ({ initialData, onSave, onCancel, companyDetails, quotes }) => {
  const [quote, setQuote] = useState<Quotation>(
    initialData || {
      id: crypto.randomUUID(),
      quoteNumber: generateQuoteNumber(quotes),
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleNo: '', // Initialize vehicleNo
      lineItems: [{ ...emptyLineItem, id: crypto.randomUUID(), description: 'E.g., Michelin Primacy 4 - 205/55 R16', unitAmount: 0 }],
      discount: 0,
      taxRate: companyDetails.defaultTaxRate ?? 18,
      notes: companyDetails.defaultNotes || '1. All prices are inclusive of taxes.\n2. Warranty as per manufacturer terms.\n3. This quotation is valid for 7 days.',
      status: 'Draft',
      isOptionQuote: false,
    }
  );
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuote(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuote(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedLineItems = [...quote.lineItems];
    const item = updatedLineItems[index];
    if (field === 'quantity' || field === 'unitAmount') {
        (item[field] as number) = value === '' ? 0 : Number(value);
    } else {
        (item[field] as string) = String(value);
    }
    setQuote(prev => ({ ...prev, lineItems: updatedLineItems }));
  };

  const addLineItem = () => {
    setQuote(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { ...emptyLineItem, id: crypto.randomUUID() }],
    }));
  };

  const removeLineItem = (index: number) => {
    if (quote.lineItems.length <= 1) return; // Keep at least one line
    const updatedLineItems = quote.lineItems.filter((_, i) => i !== index);
    setQuote(prev => ({ ...prev, lineItems: updatedLineItems }));
  };
  
  const { subtotal, totalTax, roundOff, grandTotal } = useMemo(() => {
    const taxDivisor = 1 + (quote.taxRate > 0 ? quote.taxRate / 100 : 0);
    
    const grossTotal = quote.lineItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0);
    
    const subtotal = taxDivisor > 1 ? grossTotal / taxDivisor : grossTotal;
    const totalTax = grossTotal - subtotal;
    
    const totalAfterDiscount = grossTotal - (quote.isOptionQuote ? 0 : quote.discount);
    const grandTotal = Math.round(totalAfterDiscount);
    const roundOff = grandTotal - totalAfterDiscount;

    return { subtotal, totalTax, roundOff, grandTotal };
  }, [quote.lineItems, quote.discount, quote.taxRate, quote.isOptionQuote]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(quote);
  };

  const handleShareWhatsApp = () => {
    const totalText = quote.isOptionQuote ? 'See attached for options' : `₹${grandTotal.toFixed(2)}`;
    const text = `Hello ${quote.customerName},\n\nHere is your quotation from ${companyDetails.name}.\n\n*Quote Number:* ${quote.quoteNumber}\n*Date:* ${new Date(quote.date).toLocaleDateString()}\n*Vehicle:* ${quote.vehicleMake} ${quote.vehicleModel}\n*Grand Total:* ${totalText}\n\nPlease find the full details in the attached document. We recommend printing this page to PDF to share.\n\nThank you,\n${companyDetails.name}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    if (!quote.customerEmail) return;
    const totalText = quote.isOptionQuote ? 'See attached for options' : `₹${grandTotal.toFixed(2)}`;
    const subject = `Quotation from ${companyDetails.name} - #${quote.quoteNumber}`;
    const body = `Dear ${quote.customerName},\n\nThank you for your inquiry. Please find your quotation from ${companyDetails.name} attached.\n\n---\nQuotation Summary\n---\n* Quote Number: ${quote.quoteNumber}\n* Date: ${new Date(quote.date).toLocaleDateString()}\n* Vehicle: ${quote.vehicleMake} ${quote.vehicleModel}\n* Grand Total: ${totalText}\n\n---\n\nWe have attached a detailed breakdown of the costs. Please print this quotation to PDF to attach it to this email.\n\nIf you have any questions, please feel free to contact us.\n\nBest regards,\n\nThe team at ${companyDetails.name}\n${companyDetails.phone}\n${companyDetails.email}`;
    const url = `mailto:${quote.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=800');

    if (printWindow) {
      printWindow.document.write('<html><head><title>Quotation</title>');
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      printWindow.document.write('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">');
      printWindow.document.write('<style>body { font-family: "Inter", sans-serif; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(content);
      printWindow.document.write('</body></html>');
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 250); // Small delay to allow styles to load
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-bold text-slate-800">{initialData ? 'Edit Quotation' : 'Create New Quotation'}</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                 <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">{quote.quoteNumber}</span>
                    <select name="status" value={quote.status} onChange={handleChange} className="px-3 py-1.5 border bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                 <label className="inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={quote.isOptionQuote || false} 
                        onChange={e => setQuote(prev => ({ ...prev, isOptionQuote: e.target.checked }))} 
                        className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ms-3 text-sm font-medium text-slate-700">Separate Items (Options Mode)</span>
                 </label>
            </div>
        </div>
      
        <FormSection title="Customer & Vehicle Details">
            <FormField label="Customer Name"><Input type="text" name="customerName" value={quote.customerName} onChange={handleChange} required /></FormField>
            <FormField label="Phone Number"><Input type="tel" name="customerPhone" value={quote.customerPhone} onChange={handleChange} /></FormField>
            <FormField label="Email Address"><Input type="email" name="customerEmail" value={quote.customerEmail} onChange={handleChange} /></FormField>
            <FormField label="Address"><Input type="text" name="customerAddress" value={quote.customerAddress} onChange={handleChange} /></FormField>
            <FormField label="Vehicle Make"><Input type="text" name="vehicleMake" value={quote.vehicleMake} onChange={handleChange} /></FormField>
            <FormField label="Vehicle Model"><Input type="text" name="vehicleModel" value={quote.vehicleModel} onChange={handleChange} /></FormField>
            <FormField label="Vehicle No"><Input type="text" name="vehicleNo" value={quote.vehicleNo || ''} onChange={handleChange} placeholder="Optional" /></FormField>
            <FormField label="Quotation Date"><Input type="date" name="date" value={quote.date} onChange={handleChange} required /></FormField>
        </FormSection>

        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-slate-700">Items & Services</h3>
            <div className="space-y-4">
            {quote.lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 sm:col-span-6">
                        <label className="text-sm font-medium text-slate-600 mb-1 sr-only">Description</label>
                        <Input type="text" placeholder="Item Description (e.g., Tyre Brand, Service)" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} required />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                         <label className="text-sm font-medium text-slate-600 mb-1 sr-only">Quantity</label>
                        <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} min="1" required />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                         <label className="text-sm font-medium text-slate-600 mb-1 sr-only">Unit Amount (incl. Tax)</label>
                        <Input type="number" placeholder="Unit Amount (incl. Tax)" value={item.unitAmount} onChange={(e) => handleLineItemChange(index, 'unitAmount', e.target.value)} min="0" step="0.01" required />
                    </div>
                    <div className="col-span-3 sm:col-span-1 text-right">
                        <p className="font-medium text-slate-700">{(item.quantity * item.unitAmount).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                        <button type="button" onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={quote.lineItems.length <= 1}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
            ))}
            </div>
            <button type="button" onClick={addLineItem} className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                Add Item
            </button>

            <div className="mt-6 border-t pt-4 flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                    {quote.isOptionQuote ? (
                         <div className="text-right p-4 bg-yellow-50 rounded-md border border-yellow-100">
                             <p className="text-sm text-yellow-800 font-medium">Comparison Mode Active</p>
                             <p className="text-xs text-yellow-600 mt-1">Items are calculated separately. No grand total will be displayed on the quotation.</p>
                         </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Subtotal (Pre-Tax):</span>
                                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Total Tax:</span>
                                <span className="font-medium">₹{totalTax.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <label htmlFor="discount" className="text-slate-600">Discount:</label>
                                <Input id="discount" name="discount" type="number" value={quote.discount} onChange={handleNumericChange} className="w-32 text-right" min="0" step="0.01" />
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <label htmlFor="taxRate" className="text-slate-600">Tax (%):</label>
                                <Input id="taxRate" name="taxRate" type="number" value={quote.taxRate} onChange={handleNumericChange} className="w-32 text-right" min="0" />
                            </div>

                            <div className="flex justify-between items-center text-slate-600">
                                <span >Round Off:</span>
                                <span className="font-medium">₹{roundOff.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xl font-bold border-t pt-2 mt-2">
                                <span className="text-slate-800">Grand Total:</span>
                                <span className="text-indigo-600">₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        <FormSection title="Notes / Terms">
            <FormField label="" fullWidth={true}>
                <textarea name="notes" value={quote.notes} onChange={handleChange} rows={4} className="w-full px-3 py-2 border bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"></textarea>
            </FormField>
        </FormSection>

        <div className="flex justify-end items-center space-x-4 pt-4 border-t">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition">Cancel</button>
            <button type="button" onClick={() => setShowPreview(true)} className="px-6 py-2 border border-transparent rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition">Preview</button>
            <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition">Save Quotation</button>
        </div>
    </form>
    
    {showPreview && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-100 w-full max-w-4xl h-full max-h-[90vh] rounded-lg shadow-2xl flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Quotation Preview</h2>
            <div className="flex items-center space-x-2">
                <button onClick={handleShareWhatsApp} title="Share on WhatsApp" className="flex items-center px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 mr-1.5" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.75 13.96c.25.5.12 1.08-.29 1.48-.37.37-.84.58-1.33.58h-.02c-.55 0-1.11-.23-1.53-.62l-1.4-1.39c-.19-.19-.39-.32-.61-.43-.4-.2-.84-.31-1.3-.31-.59 0-1.15.22-1.57.59l-.49.49c-.19.19-.44.29-.7.29-.22 0-.44-.07-.63-.21-.33-.24-.54-.62-.54-1.03 0-.31.11-.6.3-.83l.07-.07c.29-.29.47-.68.47-1.1 0-.49-.24-.95-.63-1.25l-.49-.39c-.43-.34-.95-.53-1.5-.53-.59 0-1.14.23-1.54.62l-.4.4c-.4.4-.63.95-.63-1.54 0-1.02.4-2.04 1.2-2.83.79-.79 1.8-1.2 2.83-1.2.95 0 1.83.33 2.54.95l.07.07c.66.58 1.08 1.4 1.12 2.3.02.6-.14 1.18-.5 1.68l-.42.59c-.29.41-.46.9-.46 1.42 0 .4.11.78.33 1.1l1.45 1.45c.19.19.45.29.71.29.39 0 .76-.22.95-.58.19-.36.21-.78.05-1.16l-.21-.51c-.16-.39-.15-.83.05-1.2.2-.37.54-.62.94-.68.6-.09 1.18.15 1.53.62l.29.41c.21.3.33.65.33 1.02 0 .5-.21 1-.61 1.36l-.07.07z"/></svg>
                    WhatsApp
                </button>
                 <button 
                    onClick={handleShareEmail} 
                    title={!quote.customerEmail ? "Enter a customer email to enable sharing" : "Share via Email"} 
                    className="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={!quote.customerEmail}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                    Email
                </button>
                <button onClick={handlePrint} className="px-4 py-2 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700">Print</button>
                <button onClick={() => setShowPreview(false)} className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-grow p-2" ref={printRef}>
            <QuotationPreview quote={quote} companyDetails={companyDetails} />
          </div>
        </div>
      </div>
    )}
    </>
  );
};
