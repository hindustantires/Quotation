import React, { useState } from 'react';
import type { Quotation, CompanyDetails } from '../types.ts';
import { QuotationPreview } from './QuotationPreview.tsx';
import { generateSinglePageA4Pdf, printSinglePageA4, formatWhatsAppPhone } from '../utils/pdfGenerator.ts';

interface QuotationPreviewModalProps {
  quote: Quotation;
  companyDetails: CompanyDetails;
  onClose: () => void;
}

export const QuotationPreviewModal: React.FC<QuotationPreviewModalProps> = ({
  quote,
  companyDetails,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const grossTotal = quote.lineItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0);
  const totalAfterDiscount = grossTotal - (quote.isOptionQuote ? 0 : quote.discount);
  const grandTotal = Math.round(totalAfterDiscount);

  // 1. WHATSAPP (Option B: Convert to single A4 PDF, download it, and open WhatsApp directly to customer's phone)
  const handleWhatsApp = async () => {
    try {
      setIsGenerating(true);
      setFeedback({ text: 'Converting quotation to single-page A4 PDF...', type: 'info' });

      // Step 1: Generate and download single-page A4 PDF
      const { fileName } = await generateSinglePageA4Pdf(quote, companyDetails, true);

      // Step 2: Format recipient's phone number
      let recipientPhone = formatWhatsAppPhone(quote.customerPhone);
      if (!recipientPhone) {
        const inputPhone = window.prompt(
          'Customer phone number is not listed in this quotation.\nPlease enter customer phone number (10-digit mobile or with country code):',
          ''
        );
        if (inputPhone) {
          recipientPhone = formatWhatsAppPhone(inputPhone);
        }
      }

      // Step 3: Compose polite, professional WhatsApp message
      const totalText = quote.isOptionQuote
        ? 'Comparative Options (See attached PDF)'
        : `₹${grandTotal.toLocaleString('en-IN')}`;

      const messageText = 
`Hello ${quote.customerName || 'Customer'},

Here is your quotation from *${companyDetails.name}*.

📄 *Quote No:* ${quote.quoteNumber}
📅 *Date:* ${new Date(quote.date).toLocaleDateString('en-GB')}
🚗 *Vehicle:* ${quote.vehicleMake || ''} ${quote.vehicleModel || ''}${quote.vehicleNo ? ` (No: ${quote.vehicleNo})` : ''}
💰 *Grand Total:* ${totalText}

📎 *Your official single-page quotation PDF has been downloaded as:*
_${fileName}_

Please find it in your downloads and attach it to this chat.

Thank you,
*${companyDetails.name}*
📞 ${companyDetails.phone}
📍 ${companyDetails.address}`;

      const waUrl = recipientPhone
        ? `https://wa.me/${recipientPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

      // Step 4: Open WhatsApp chat
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setFeedback({
        text: `✅ Single-page A4 PDF downloaded (${fileName})! WhatsApp opened${recipientPhone ? ` for +${recipientPhone}` : ''}. Please attach the downloaded PDF and tap Send.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('WhatsApp PDF error:', err);
      setFeedback({ text: 'Failed to generate PDF. Please try again.', type: 'warning' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. EMAIL (Option 2: Convert to single A4 PDF, download it, and open mail draft directly with customer email & body)
  const handleEmail = async () => {
    let recipientEmail = quote.customerEmail?.trim();
    if (!recipientEmail) {
      const inputEmail = window.prompt(
        'Customer email is not listed in this quotation.\nPlease enter the customer email address:',
        ''
      );
      if (inputEmail && inputEmail.trim()) {
        recipientEmail = inputEmail.trim();
      } else {
        return;
      }
    }

    try {
      setIsGenerating(true);
      setFeedback({ text: 'Converting quotation to single-page A4 PDF...', type: 'info' });

      // Step 1: Generate and download single-page A4 PDF
      const { fileName } = await generateSinglePageA4Pdf(quote, companyDetails, true);

      // Step 2: Compose Email
      const totalText = quote.isOptionQuote
        ? 'Comparative Options (See attached PDF)'
        : `₹${grandTotal.toLocaleString('en-IN')}`;

      const subject = `Quotation #${quote.quoteNumber} from ${companyDetails.name}`;
      const body = 
`Dear ${quote.customerName || 'Valued Customer'},

Thank you for choosing ${companyDetails.name}. Please find your quotation #${quote.quoteNumber} attached.

---
QUOTATION SUMMARY
---
* Quote Number: ${quote.quoteNumber}
* Date: ${new Date(quote.date).toLocaleDateString('en-GB')}
* Vehicle: ${quote.vehicleMake || ''} ${quote.vehicleModel || ''}${quote.vehicleNo ? ` (No: ${quote.vehicleNo})` : ''}
* Grand Total: ${totalText}

---

The official single-page A4 quotation PDF has been downloaded to your device as:
${fileName}

Please find the file in your Downloads folder and attach it to this email before sending.

Warm regards,
${companyDetails.name}
Phone: ${companyDetails.phone}
Email: ${companyDetails.email}
Address: ${companyDetails.address}`;

      const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;

      setFeedback({
        text: `✅ Single-page A4 PDF downloaded (${fileName})! Email draft opened for ${recipientEmail}. Please attach the downloaded PDF and click Send.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Email PDF error:', err);
      setFeedback({ text: 'Failed to generate PDF for email.', type: 'warning' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. PRINT (Single A4 page guaranteed print preview)
  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      setFeedback({ text: 'Preparing single-page A4 print preview...', type: 'info' });
      await printSinglePageA4(quote, companyDetails);
      setFeedback({ text: 'Print dialog opened.', type: 'info' });
    } catch (err) {
      console.error('Print failed:', err);
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. DIRECT DOWNLOAD PDF (Single-click single A4 page download)
  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      setFeedback({ text: 'Generating single-page A4 PDF...', type: 'info' });
      const { fileName } = await generateSinglePageA4Pdf(quote, companyDetails, true);
      setFeedback({ text: `✅ Single-page A4 PDF downloaded (${fileName})!`, type: 'success' });
    } catch (err) {
      console.error('Download PDF error:', err);
      setFeedback({ text: 'Failed to download PDF.', type: 'warning' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
      <div className="bg-slate-100 w-full max-w-4xl h-full max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        {/* Top Action Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap gap-2 justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Quotation Preview</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-mono font-semibold px-2 py-0.5 rounded">
                #{quote.quoteNumber}
              </span>
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">
              Single-page A4 PDF ready for WhatsApp, Email, or Print
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* WhatsApp Option B Button */}
            <button
              onClick={handleWhatsApp}
              disabled={isGenerating}
              title="Convert to PDF, download and open customer WhatsApp chat"
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1.5" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.761.808 2.791.808 3.182 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.794-5.768-5.794zm3.385 8.188c-.144.405-.837.774-1.17.824-.312.045-.694.06-2.18-.553-1.614-.666-2.613-2.316-2.694-2.424-.079-.108-.646-.86-.646-1.639 0-.779.406-1.163.55-1.321.144-.158.312-.198.416-.198.104 0 .208.002.299.006.096.004.225-.036.352.269.13.312.443 1.077.482 1.156.039.079.065.172.013.277-.052.106-.079.172-.157.264-.079.092-.165.205-.236.276-.079.079-.161.165-.069.323.092.158.409.675.877 1.092.603.537 1.111.704 1.269.783.158.079.25.066.342-.04.092-.105.395-.461.5-.619.105-.158.21-.132.355-.079.145.053.921.435 1.079.514.158.079.263.118.302.184.039.066.039.382-.105.787z" />
              </svg>
              <span>WhatsApp</span>
            </button>

            {/* Email Option 2 Button */}
            <button
              onClick={handleEmail}
              disabled={isGenerating}
              title="Convert to PDF, download and open customer email draft"
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>Email</span>
            </button>

            {/* Direct Single-Page A4 PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              title="Download single-page A4 PDF directly"
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              title="Print single-page A4 quotation"
              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-slate-700 hover:bg-slate-800 text-white rounded-md shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
              title="Close Preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Feedback / Notification Banner */}
        {feedback && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {isGenerating && (
                <svg className="animate-spin h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline ml-2 opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Preview Container */}
        <div className="overflow-y-auto flex-grow p-3 sm:p-6 bg-slate-200/50">
          <QuotationPreview quote={quote} companyDetails={companyDetails} />
        </div>
      </div>
    </div>
  );
};
