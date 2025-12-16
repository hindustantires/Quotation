
import type { Quotation, LineItem } from './types.ts';

// Helper to safely parse line items if they come as a string
const parseLineItems = (items: any): LineItem[] => {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch (e) {
      console.warn("Failed to parse lineItems string:", items);
      return [];
    }
  }
  return [];
};

// Robust hashing function to generate stable IDs from content
const generateStableId = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return 'unknown';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base36 for a shorter string
  return Math.abs(hash).toString(36);
};

// Helper to normalize backend data to frontend interface
const normalizeQuote = (data: any): Quotation => {
  // 1. CLEAN UP INPUTS
  const quoteNum = String(data.quoteNumber || data.quote_number || '').trim();
  const customer = String(data.customerName || data.customer_name || '').trim();
  
  // 2. NORMALIZE DATE (Handle YYYY-MM-DD vs DD/MM/YYYY vs ISO)
  let dateStr = String(data.date || data.Date || '').trim();
  // If it's an ISO string (2023-10-25T...), split it
  if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
  }
  if (!dateStr) dateStr = new Date().toISOString().split('T')[0];

  // 3. IDENTIFY OR GENERATE ID
  // CRITICAL FIX: Trust the backend ID if it exists. 
  // Do NOT overwrite 'gen_' IDs if they come from the sheet. 
  // Only generate if the ID is strictly missing or null.
  let id = String(data.id || data.Id || '').trim();
  
  // Treat 'undefined', 'null', or empty string as missing.
  const isMissingId = !id || id === 'undefined' || id === 'null';
  
  if (isMissingId) {
     // Create a unique signature: "CustomerName|Date|QuoteNum"
     const signature = `${customer.toLowerCase()}|${dateStr}|${quoteNum.toLowerCase()}`;
     id = `gen_${generateStableId(signature)}`;
  }

  return {
    id: id,
    quoteNumber: quoteNum,
    date: dateStr,
    customerName: customer,
    customerPhone: data.customerPhone || data.customer_phone || '',
    customerEmail: data.customerEmail || data.customer_email || '',
    customerAddress: data.customerAddress || data.customer_address || '',
    vehicleMake: data.vehicleMake || data.vehicle_make || '',
    vehicleModel: data.vehicleModel || data.vehicle_model || '',
    vehicleNo: data.vehicleNo || data.vehicle_no || '',
    lineItems: parseLineItems(data.lineItems || data.line_items),
    discount: Number(data.discount || 0),
    taxRate: Number(data.taxRate !== undefined ? data.taxRate : (data.tax_rate !== undefined ? data.tax_rate : 18)),
    notes: data.notes || '',
    status: data.status || 'Draft',
    isOptionQuote: !!(data.isOptionQuote || data.is_option_quote)
  };
};

export class GoogleSheetsService {
  private webAppUrl: string;

  constructor(webAppUrl: string) {
    this.webAppUrl = webAppUrl.trim();
  }

  public async init(): Promise<void> { return Promise.resolve(); }
  public async signIn(): Promise<void> { return Promise.resolve(); }

  public async fetchQuotes(): Promise<Quotation[]> {
    try {
      const cacheBuster = `${new Date().getTime()}`;
      const url = `${this.webAppUrl}?action=read&t=${cacheBuster}`;
      
      const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          credentials: 'omit', 
          cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      
      if (text.trim().startsWith('<')) {
          console.error("Received HTML instead of JSON. Check Web App permissions.");
          throw new Error("Server returned HTML. Ensure the Google Script is deployed as 'Anyone' access.");
      }

      let result;
      try {
          result = JSON.parse(text);
      } catch (e) {
          console.error("JSON Parse Error:", text.substring(0, 100));
          throw new Error("Invalid response format from server.");
      }

      let rawData = [];
      if (result.status === 'success' && Array.isArray(result.data)) {
          rawData = result.data;
      } else if (Array.isArray(result)) {
          rawData = result;
      } else if (result.data && Array.isArray(result.data)) {
          rawData = result.data;
      }

      return rawData
        .map(normalizeQuote)
        // STRICT FILTER: Always hide items marked as Deleted from the backend
        .filter(q => q.status !== 'Deleted');

    } catch (error) {
      console.error('Error fetching quotes from Sheets:', error);
      throw error;
    }
  }

  public async saveQuote(quote: Quotation): Promise<void> {
    try {
      const safeQuote = { ...quote, id: String(quote.id) };
      const url = `${this.webAppUrl}?action=save`;
      
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        credentials: 'omit',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'save', quote: safeQuote })
      });

      const text = await response.text();
      try {
          const result = JSON.parse(text);
          if (result.status !== 'success') {
             console.warn("Save response status:", result);
          }
      } catch (e) {
          if (text.trim().startsWith('<')) { 
             throw new Error("Server returned HTML (Permission/Script Error)");
          }
      }
    } catch (error) {
      console.error('Error saving quote to Sheets:', error);
      throw error;
    }
  }

  // DELETE STRATEGY: Prioritize "Soft Delete" (Update Status) over Hard Delete
  // This is safer and more likely to succeed if the backend script logic is complex.
  public async deleteQuote(quote: Quotation): Promise<void> {
     const url = `${this.webAppUrl}`;
     
     // 1. Prepare Soft Delete Payload (Mark as Deleted)
     // We include every possible casing for ID and Quote Number to ensure matching.
     const softDeleteQuote = { 
        ...quote, 
        status: 'Deleted',
        // Redundant keys for backend compatibility
        Id: quote.id,
        ID: quote.id,
        quote_number: quote.quoteNumber
     };

     const savePayload = JSON.stringify({ 
         action: 'save', 
         quote: softDeleteQuote 
     });

     // 2. Prepare Hard Delete Payload (Optional, but we send it as backup)
     const deletePayload = JSON.stringify({ 
         action: 'delete', 
         id: quote.id,
         Id: quote.id,
         ID: quote.id,
         quote_number: quote.quoteNumber,
         quoteNumber: quote.quoteNumber
     });

     // 3. EXECUTE REQUESTS
     // We send the "Update Status to Deleted" request first. 
     // This is the most important one.
     
     try {
        await fetch(`${url}?action=save`, {
            method: 'POST',
            redirect: 'follow',
            credentials: 'omit',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: savePayload
        });
        
        // Optionally send hard delete as well, but fire-and-forget
        fetch(`${url}?action=delete`, {
            method: 'POST',
            redirect: 'follow',
            credentials: 'omit',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: deletePayload
        }).catch(() => {}); // Ignore errors on hard delete if soft delete worked

     } catch (e) {
         console.error("Backend delete failed", e);
         // If standard save failed, try the hard delete endpoint as a fallback
         try {
            await fetch(`${url}?action=delete`, {
                method: 'POST',
                redirect: 'follow',
                credentials: 'omit',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: deletePayload
            });
         } catch (e2) {
             console.error("Hard delete also failed", e2);
         }
     }
  }
}
