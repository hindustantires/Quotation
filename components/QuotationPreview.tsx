
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
    const totalAfterDiscount = grossTotal - quote.discount;
    const grandTotal = Math.round(totalAfterDiscount);
    const roundOff = grandTotal - totalAfterDiscount;

    return (
        <div className="bg-white p-8 md:p-12 font-sans">
            <header className="flex justify-between items-start pb-8 border-b-2 border-slate-900">
                <div>
                     <h1 className="text-4xl font-bold text-slate-900">{companyDetails.name}</h1>
                     <p className="text-sm text-slate-500">{companyDetails.address}</p>
                     <p className="text-sm text-slate-500">{companyDetails.phone} | {companyDetails.email}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-bold uppercase text-slate-500 tracking-wider">Quotation</h2>
                    <p className="text-sm font-mono text-slate-600 mt-1">{quote.quoteNumber}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-8 my-8">
                <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Bill To</h3>
                    <p className="font-bold text-slate-800">{quote.customerName}</p>
                    <p className="text-sm text-slate-600">{quote.customerAddress}</p>
                    <p className="text-sm text-slate-600">{quote.customerPhone}</p>
                    <p className="text-sm text-slate-600">{quote.customerEmail}</p>
                </div>
                <div className="text-right">
                    <p><strong className="text-slate-600">Date:</strong> {new Date(quote.date).toLocaleDateString()}</p>
                    <p><strong className="text-slate-600">Status:</strong> {quote.status}</p>
                    <div className="mt-2">
                        <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-1">Vehicle</h3>
                        <p className="text-sm text-slate-600">
                             {quote.vehicleMake} {quote.vehicleModel}
                             {quote.vehicleNo && <span className="block text-slate-500 text-xs mt-1">No: {quote.vehicleNo}</span>}
                        </p>
                    </div>
                </div>
            </section>
            
            <section>
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                        <tr>
                            <th className="p-3 font-semibold uppercase text-sm">Description</th>
                            <th className="p-3 text-center font-semibold uppercase text-sm">Qty</th>
                            <th className="p-3 text-right font-semibold uppercase text-sm">Unit Amount</th>
                            <th className="p-3 text-right font-semibold uppercase text-sm">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quote.lineItems.map(item => (
                            <tr key={item.id} className="border-b border-slate-200">
                                <td className="p-3 text-slate-800">{item.description}</td>
                                <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                                <td className="p-3 text-right text-slate-600">₹{item.unitAmount.toFixed(2)}</td>
                                <td className="p-3 text-right font-medium text-slate-800">₹{(item.quantity * item.unitAmount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            {quote.isOptionQuote ? (
                 <section className="mt-8 text-right">
                     <p className="text-sm text-slate-500 italic">This quotation lists independent options. Amounts are not summed.</p>
                 </section>
            ) : (
                <section className="flex justify-end mt-8">
                    <div className="w-full max-w-xs text-sm">
                        <div className="flex justify-between py-1">
                            <span className="text-slate-600">Subtotal (Pre-Tax):</span>
                            <span className="text-slate-800">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-slate-600">Tax ({quote.taxRate}%):</span>
                            <span className="text-slate-800">₹{totalTax.toFixed(2)}</span>
                        </div>
                        {quote.discount > 0 && (
                            <div className="flex justify-between py-1 border-t mt-1 pt-1">
                                <span className="text-slate-600">Discount:</span>
                                <span className="text-slate-800">-₹{quote.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-1">
                            <span className="text-slate-600">Round Off:</span>
                            <span className="text-slate-800">₹{roundOff.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 mt-2 font-bold text-lg border-t-2 border-slate-900">
                            <span className="text-slate-900">Grand Total:</span>
                            <span className="text-slate-900">₹{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-12 pt-8 border-t border-slate-200">
                 <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Payment Details</h4>
                        <div className="text-xs text-slate-600 space-y-1">
                            <p><strong>Bank:</strong> {companyDetails.bankName}</p>
                            <p><strong>A/C Holder:</strong> {companyDetails.accountHolder}</p>
                            <p><strong>A/C Number:</strong> {companyDetails.accountNumber}</p>
                            <p><strong>IFSC Code:</strong> {companyDetails.ifscCode}</p>
                            <p><strong>UPI ID:</strong> {companyDetails.upiId}</p>
                        </div>
                    </div>
                    {companyDetails.upiQrCode && (
                        <div className="text-center ml-4">
                            <h4 className="font-semibold text-slate-800 mb-2">Scan to Pay</h4>
                            <img src={companyDetails.upiQrCode} alt="UPI QR Code" className="w-28 h-28 object-contain border p-1 rounded-md bg-white" />
                        </div>
                    )}
                </div>
            </section>

            <footer className="mt-8 pt-8 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Notes & Terms</h4>
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
                <p className="text-center text-xs text-slate-400 mt-8">Thank you for your business!</p>
            </footer>

        </div>
    );
};
