import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Quotation, CompanyDetails } from '../types.ts';

/**
 * Normalizes Indian and international phone numbers for WhatsApp direct chat
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  
  // If user entered 0 prefix before 10 digit Indian number (e.g. 09335333302)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  // If 10 digits (standard Indian mobile format), prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Parses and renders notes into a perfectly aligned list with structured numbers/bullets
 */
function renderFormattedNotesHtml(notes?: string): string {
  const defaultNotes = '1. All prices are inclusive of taxes.\n2. Warranty as per manufacturer terms.\n3. This quotation is valid for 7 days.';
  const rawNotes = (notes && notes.trim().length > 0) ? notes : defaultNotes;
  const lines = rawNotes.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) return '';

  return lines.map(line => {
    // Check if line starts with a number like "1.", "1)", or bullet "•", "-", "*"
    const match = line.match(/^(\d+[\.\)]|\•|\-|\*)\s*(.*)/);
    if (match) {
      const marker = match[1];
      const text = match[2];
      return `
        <div style="display: flex; align-items: flex-start; margin-bottom: 4px; font-size: 11px; line-height: 1.45; color: #334155;">
          <span style="font-weight: 700; color: #0f172a; width: 22px; flex-shrink: 0; text-align: left;">${marker}</span>
          <span style="flex: 1; text-align: left; word-break: break-word;">${text}</span>
        </div>
      `;
    }
    return `
      <div style="display: flex; align-items: flex-start; margin-bottom: 4px; font-size: 11px; line-height: 1.45; color: #334155;">
        <span style="font-weight: 700; color: #0f172a; width: 14px; flex-shrink: 0; text-align: left;">•</span>
        <span style="flex: 1; text-align: left; word-break: break-word;">${line}</span>
      </div>
    `;
  }).join('');
}

/**
 * Creates a clean, standardized single-page A4 printable HTML element
 */
function createSinglePageA4Element(quote: Quotation, companyDetails: CompanyDetails): HTMLElement {
  const taxDivisor = 1 + (quote.taxRate > 0 ? quote.taxRate / 100 : 0);
  const grossTotal = quote.lineItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0);
  const subtotal = taxDivisor > 1 ? grossTotal / taxDivisor : grossTotal;
  const totalTax = grossTotal - subtotal;
  const totalAfterDiscount = grossTotal - (quote.isOptionQuote ? 0 : quote.discount);
  const grandTotal = Math.round(totalAfterDiscount);
  const roundOff = grandTotal - totalAfterDiscount;

  const container = document.createElement('div');
  container.id = 'temp-pdf-render-root';
  // Standard A4 width at 96 DPI is 794px, height is 1123px
  container.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: 794px;
    min-height: 1115px;
    max-height: 1120px;
    background-color: #ffffff;
    color: #0f172a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    padding: 34px 40px 24px 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: -9999;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `;

  // Format currency
  const formatINR = (num: number) => {
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const lineItemsRows = quote.lineItems.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; font-weight: 500; color: #1e293b;">${item.description || '-'}</td>
      <td style="padding: 8px 10px; text-align: center; color: #475569;">${item.quantity}</td>
      <td style="padding: 8px 10px; text-align: right; color: #475569;">${formatINR(item.unitAmount)}</td>
      <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatINR(item.quantity * item.unitAmount)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column;">
      <!-- HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2.5px solid #0f172a;">
        <div style="max-width: 480px;">
          <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">
            ${companyDetails.name || 'HINDUSTAN TYRES'}
          </h1>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #475569; line-height: 1.4;">
            ${companyDetails.address || ''}
          </p>
          <p style="margin: 0; font-size: 12px; color: #475569; font-weight: 500;">
            <span style="color: #0f172a; font-weight: 600;">Phone:</span> ${companyDetails.phone || ''} &nbsp;|&nbsp; 
            <span style="color: #0f172a; font-weight: 600;">Email:</span> ${companyDetails.email || ''}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #f1f5f9; padding: 4px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">
            <span style="font-size: 15px; font-weight: 800; color: #334155; letter-spacing: 1px; text-transform: uppercase;">QUOTATION</span>
          </div>
          <div style="margin-top: 6px; font-size: 14px; font-family: monospace; font-weight: 700; color: #0f172a;">
            #${quote.quoteNumber}
          </div>
          <div style="margin-top: 2px; font-size: 12px; color: #64748b;">
            Date: <strong style="color: #1e293b;">${new Date(quote.date).toLocaleDateString('en-GB')}</strong>
          </div>
        </div>
      </div>

      <!-- BILL TO & VEHICLE INFO (WITH GENEROUS VERTICAL SPACE FOR VEHICLE NUMBER) -->
      <div style="display: flex; justify-content: space-between; align-items: stretch; margin-top: 14px; margin-bottom: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <div style="width: 54%;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 4px;">
            CUSTOMER DETAILS (BILL TO)
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${quote.customerName || 'Valued Customer'}
          </div>
          ${quote.customerAddress ? `<div style="font-size: 12px; color: #475569; margin-bottom: 2px; line-height: 1.3;">${quote.customerAddress}</div>` : ''}
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">
            ${quote.customerPhone ? `<span style="font-weight: 600; color: #334155;">Mob:</span> ${quote.customerPhone}` : ''}
            ${quote.customerPhone && quote.customerEmail ? ' &nbsp;|&nbsp; ' : ''}
            ${quote.customerEmail ? `<span style="font-weight: 600; color: #334155;">Email:</span> ${quote.customerEmail}` : ''}
          </div>
        </div>

        <div style="width: 44%; text-align: right; border-left: 1px solid #e2e8f0; padding-left: 16px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 3px;">
            VEHICLE INFORMATION
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            ${quote.vehicleMake || ''} ${quote.vehicleModel || 'General Vehicle'}
          </div>
          ${quote.vehicleNo ? `
            <div style="margin-top: 2px; margin-bottom: 6px; display: inline-flex; align-items: center; padding: 4px 10px; font-size: 12px; font-weight: 700; line-height: 1.5; color: #1d4ed8; background-color: #eff6ff; border-radius: 4px; border: 1.5px solid #bfdbfe; box-sizing: border-box;">
              Vehicle No: ${quote.vehicleNo}
            </div>
          ` : ''}
          <div style="font-size: 11px; color: #64748b;">
            Status: <span style="font-weight: 700; color: #0f172a;">${quote.status || 'Draft'}</span>
          </div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <div style="margin-bottom: 12px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 8px 10px; font-weight: 700; border-top-left-radius: 4px;">Item Description</th>
              <th style="padding: 8px 10px; text-align: center; font-weight: 700; width: 60px;">Qty</th>
              <th style="padding: 8px 10px; text-align: right; font-weight: 700; width: 110px;">Unit Rate</th>
              <th style="padding: 8px 10px; text-align: right; font-weight: 700; width: 120px; border-top-right-radius: 4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsRows}
          </tbody>
        </table>
      </div>

      <!-- SUMMARY TOTALS -->
      ${quote.isOptionQuote ? `
        <div style="margin-top: 10px; padding: 10px 14px; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; text-align: right;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #854d0e;">
            * Comparative Options Quotation: Amounts are for independent options and not summed.
          </p>
        </div>
      ` : `
        <div style="display: flex; justify-content: flex-end; margin-top: 6px; margin-bottom: 12px;">
          <div style="width: 290px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
              <span>Subtotal (Pre-Tax):</span>
              <span style="font-weight: 600; color: #1e293b;">${formatINR(subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
              <span>Tax (${quote.taxRate}%):</span>
              <span style="font-weight: 600; color: #1e293b;">${formatINR(totalTax)}</span>
            </div>
            ${quote.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                <span>Discount:</span>
                <span style="font-weight: 600;">-${formatINR(quote.discount)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
              <span>Round Off:</span>
              <span style="font-weight: 500;">${formatINR(roundOff)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 2px solid #0f172a; margin-top: 4px; font-size: 15px; font-weight: 800; color: #0f172a;">
              <span>Grand Total:</span>
              <span style="color: #1e3a8a;">${formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      `}
    </div>

    <!-- FOOTER / PAYMENT & NOTES (PROPERLY ALIGNED NOTES & TERMS) -->
    <div style="border-top: 1.5px solid #cbd5e1; padding-top: 12px; margin-top: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: stretch; gap: 16px;">
        <!-- Bank & Payment Details -->
        <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; letter-spacing: 0.5px;">
            Bank / Payment Details
          </div>
          <div style="display: grid; grid-template-columns: 85px 1fr; row-gap: 2.5px; color: #334155;">
            <span style="color: #64748b; font-weight: 500;">Bank Name:</span>
            <span style="font-weight: 600;">${companyDetails.bankName || '-'}</span>
            
            <span style="color: #64748b; font-weight: 500;">A/C Holder:</span>
            <span style="font-weight: 600;">${companyDetails.accountHolder || '-'}</span>

            <span style="color: #64748b; font-weight: 500;">A/C Number:</span>
            <span style="font-weight: 700; font-family: monospace; color: #0f172a;">${companyDetails.accountNumber || '-'}</span>

            <span style="color: #64748b; font-weight: 500;">IFSC Code:</span>
            <span style="font-weight: 700; font-family: monospace; color: #0f172a;">${companyDetails.ifscCode || '-'}</span>

            <span style="color: #64748b; font-weight: 500;">UPI ID:</span>
            <span style="font-weight: 600; color: #2563eb;">${companyDetails.upiId || 'N/A'}</span>
          </div>
        </div>

        ${companyDetails.upiQrCode ? `
          <!-- Scan to Pay QR -->
          <div style="text-align: center; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background-color: #ffffff; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 3px;">Scan & Pay</div>
            <img src="${companyDetails.upiQrCode}" alt="UPI QR" style="width: 76px; height: 76px; object-fit: contain; display: block;" />
          </div>
        ` : ''}

        <!-- Terms & Signature (100% PERFECTLY ALIGNED NOTES & TERMS) -->
        <div style="flex: 1.2; font-size: 11px; color: #475569; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 7px; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
              Notes &amp; Terms
            </div>
            <div style="display: flex; flex-direction: column;">
              ${renderFormattedNotesHtml(quote.notes)}
            </div>
          </div>
          <div style="margin-top: 10px; text-align: right; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            <span style="font-size: 11px; font-weight: 700; color: #0f172a;">For ${companyDetails.name}</span>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">Authorized Signatory</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 8px; text-align: center; font-size: 10.5px; font-weight: 500; color: #94a3b8; letter-spacing: 0.5px;">
        Thank you for choosing ${companyDetails.name}!
      </div>
    </div>
  `;

  return container;
}

export interface GeneratedPdfResult {
  pdf: jsPDF;
  blob: Blob;
  fileName: string;
}

/**
 * Generates an exact single-page A4 PDF from a quotation and downloads it.
 * Captures at 300 DPI high resolution and uses lossless PNG for maximum quality.
 */
export async function generateSinglePageA4Pdf(
  quote: Quotation,
  companyDetails: CompanyDetails,
  autoDownload: boolean = true
): Promise<GeneratedPdfResult> {
  const container = createSinglePageA4Element(quote, companyDetails);
  document.body.appendChild(container);

  try {
    // Wait for fonts and all assets to be fully ready
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Capture at scale: 3 (300 DPI) for ultra crisp, razor-sharp text and borders
    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    const margin = 6; // 6mm margin
    const usableWidth = a4Width - margin * 2; // 198mm
    const usableHeight = a4Height - margin * 2; // 285mm

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate proportional fit
    const imgWidth = usableWidth;
    const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

    let finalWidth = imgWidth;
    let finalHeight = imgHeight;

    // MATHEMATICAL GUARANTEE: If canvas height exceeds usable A4 height,
    // scale down proportionally so that it strictly fits within 1 SINGLE A4 PAGE!
    if (imgHeight > usableHeight) {
      finalHeight = usableHeight;
      finalWidth = (canvasWidth * usableHeight) / canvasHeight;
    }

    const xOffset = margin + (usableWidth - finalWidth) / 2;
    const yOffset = margin;

    // Use lossless PNG to maintain maximum quality without JPEG compression artifacts
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

    // Clean filename
    const safeQuoteNumber = (quote.quoteNumber || 'Draft').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCustomer = (quote.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Quotation_${safeQuoteNumber}_${safeCustomer}.pdf`;

    if (autoDownload) {
      pdf.save(fileName);
    }

    const blob = pdf.output('blob');

    return {
      pdf,
      blob,
      fileName,
    };
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Triggers Single-Page A4 print preview
 */
export async function printSinglePageA4(quote: Quotation, companyDetails: CompanyDetails): Promise<void> {
  const { pdf } = await generateSinglePageA4Pdf(quote, companyDetails, false);
  const blobUrl = pdf.output('bloburl');

  const printWindow = window.open(blobUrl.toString(), '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl.toString();
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 60000);
    };
  }
}
