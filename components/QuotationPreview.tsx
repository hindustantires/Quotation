import React from 'react';
import type { Quotation, CompanyDetails } from '../types.ts';

interface QuotationPreviewProps {
  quote: Quotation;
  companyDetails: CompanyDetails;
}

export const QuotationPreview: React.FC<QuotationPreviewProps> = ({ quote, companyDetails }) => {
  const taxDivisor = 1 + (quote.taxRate > 0 ? quote.taxRate / 100 : 0);
  const grossTotal = quote.lineItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0);
  const subtotal = taxDivisor > 1 ? grossTotal / taxDivisor : grossTotal;
  const totalTax = grossTotal - subtotal;
  const totalAfterDiscount = grossTotal - (quote.isOptionQuote ? 0 : quote.discount);
  const grandTotal = Math.round(totalAfterDiscount);
  const roundOff = grandTotal - totalAfterDiscount;

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderNotesList = (notes?: string) => {
    const defaultNotes = '1. All prices are inclusive of taxes.\n2. Warranty as per manufacturer terms.\n3. This quotation is valid for 7 days.';
    const rawNotes = (notes && notes.trim().length > 0) ? notes : defaultNotes;
    const lines = rawNotes.split('\n').map(l => l.trim()).filter(Boolean);

    return lines.map((line, idx) => {
      const match = line.match(/^(\d+[\.\)]|\•|\-|\*)\s*(.*)/);
      if (match) {
        return (
          <div key={idx} className="flex items-start mb-1 text-[11px] leading-relaxed text-slate-700">
            <span className="font-bold text-slate-900 w-5 shrink-0 text-left">{match[1]}</span>
            <span className="flex-1 text-left">{match[2]}</span>
          </div>
        );
      }
      return (
        <div key={idx} className="flex items-start mb-1 text-[11px] leading-relaxed text-slate-700">
          <span className="font-bold text-slate-900 w-4 shrink-0 text-left">•</span>
          <span className="flex-1 text-left">{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="bg-white p-6 sm:p-10 font-sans max-w-4xl mx-auto shadow-sm rounded-lg border border-slate-200 single-a4-page">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
            {companyDetails.name || 'HINDUSTAN TYRES'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed">{companyDetails.address}</p>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            <span className="font-semibold text-slate-800">Phone:</span> {companyDetails.phone} &nbsp;|&nbsp; 
            <span className="font-semibold text-slate-800">Email:</span> {companyDetails.email}
          </p>
        </div>
        <div className="sm:text-right shrink-0">
          <span className="inline-block bg-slate-100 text-slate-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border border-slate-300">
            Quotation
          </span>
          <p className="text-sm font-mono font-bold text-slate-900 mt-1.5">#{quote.quoteNumber}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Date: <strong className="text-slate-700">{new Date(quote.date).toLocaleDateString('en-GB')}</strong>
          </p>
        </div>
      </header>

      {/* Bill To & Vehicle Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Customer Details (Bill To)</h3>
          <p className="font-bold text-base text-slate-900">{quote.customerName || 'Valued Customer'}</p>
          {quote.customerAddress && <p className="text-xs text-slate-600 mt-0.5">{quote.customerAddress}</p>}
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-2">
            {quote.customerPhone && (
              <span><strong className="text-slate-700">Phone:</strong> {quote.customerPhone}</span>
            )}
            {quote.customerEmail && (
              <span><strong className="text-slate-700">Email:</strong> {quote.customerEmail}</span>
            )}
          </div>
        </div>
        <div className="sm:text-right sm:border-l sm:border-slate-200 sm:pl-4 flex flex-col justify-center sm:items-end">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Vehicle Details</h3>
          <p className="text-sm font-bold text-slate-800">
            {quote.vehicleMake || ''} {quote.vehicleModel || 'General Vehicle'}
          </p>
          {quote.vehicleNo && (
            <div className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded border border-blue-200 mt-1.5 mb-1 leading-normal">
              Vehicle No: {quote.vehicleNo}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            Status: <span className="font-semibold text-slate-800">{quote.status}</span>
          </p>
        </div>
      </section>

      {/* Line Items Table */}
      <section className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <th className="p-2.5 font-bold rounded-tl">Item Description</th>
              <th className="p-2.5 text-center font-bold w-16">Qty</th>
              <th className="p-2.5 text-right font-bold w-28">Unit Rate</th>
              <th className="p-2.5 text-right font-bold w-28 rounded-tr">Total</th>
            </tr>
          </thead>
          <tbody className="text-xs sm:text-sm">
            {quote.lineItems.map((item, idx) => (
              <tr key={item.id || idx} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="p-2.5 font-medium text-slate-800">{item.description || '-'}</td>
                <td className="p-2.5 text-center text-slate-600">{item.quantity}</td>
                <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.unitAmount)}</td>
                <td className="p-2.5 text-right font-semibold text-slate-900">{formatCurrency(item.quantity * item.unitAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Total Calculations */}
      {quote.isOptionQuote ? (
        <section className="mt-4 p-3 bg-amber-50 rounded border border-amber-200 text-right">
          <p className="text-xs sm:text-sm text-amber-800 font-medium">
            * Comparative Options Quotation: Amounts are for independent options and not summed.
          </p>
        </section>
      ) : (
        <section className="flex justify-end mt-4">
          <div className="w-full sm:w-72 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs sm:text-sm">
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Subtotal (Pre-Tax):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Tax ({quote.taxRate}%):</span>
              <span className="font-semibold text-slate-800">{formatCurrency(totalTax)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between py-0.5 text-red-600 border-t border-dashed border-slate-300 mt-1 pt-1">
                <span>Discount:</span>
                <span className="font-semibold">-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-0.5 text-slate-500">
              <span>Round Off:</span>
              <span>{formatCurrency(roundOff)}</span>
            </div>
            <div className="flex justify-between py-1.5 mt-1 border-t-2 border-slate-900 font-bold text-base text-slate-900">
              <span>Grand Total:</span>
              <span className="text-blue-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Payment Details & Notes Footer */}
      <section className="mt-6 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-700 flex-1 w-full">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-1.5">Payment Details</h4>
            <div className="grid grid-cols-2 gap-y-1">
              <span className="text-slate-500">Bank:</span>
              <span className="font-medium">{companyDetails.bankName}</span>
              <span className="text-slate-500">A/C Holder:</span>
              <span className="font-medium">{companyDetails.accountHolder}</span>
              <span className="text-slate-500">A/C Number:</span>
              <span className="font-mono font-bold text-slate-900">{companyDetails.accountNumber}</span>
              <span className="text-slate-500">IFSC Code:</span>
              <span className="font-mono font-bold text-slate-900">{companyDetails.ifscCode}</span>
              <span className="text-slate-500">UPI ID:</span>
              <span className="font-semibold text-blue-600">{companyDetails.upiId}</span>
            </div>
          </div>

          {companyDetails.upiQrCode && (
            <div className="text-center p-2 bg-white border border-slate-200 rounded-md shrink-0 mx-auto sm:mx-0">
              <h4 className="font-bold text-slate-700 text-[10px] uppercase mb-1">Scan to Pay</h4>
              <img src={companyDetails.upiQrCode} alt="UPI QR Code" className="w-20 h-20 object-contain mx-auto" />
            </div>
          )}

          <div className="flex-1 w-full text-xs text-slate-600 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2 border-b border-slate-200 pb-1">
                Notes &amp; Terms
              </h4>
              <div className="space-y-0.5">
                {renderNotesList(quote.notes)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-dashed border-slate-200 text-right">
              <p className="font-bold text-slate-800 text-xs">For {companyDetails.name}</p>
              <p className="text-[10px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-4 pt-3 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">Thank you for your business!</p>
      </footer>
    </div>
  );
};
