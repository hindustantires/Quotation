
import React, { useState, useMemo, useEffect } from 'react';
import type { Quotation } from '../types.ts';

interface SavedQuotesListProps {
  quotes: Quotation[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void; 
  onCreateNew: () => void;
}

const statusColorMap = {
    Draft: 'bg-slate-200 text-slate-800',
    Sent: 'bg-blue-200 text-blue-800',
    Accepted: 'bg-green-200 text-green-800',
    Rejected: 'bg-red-200 text-red-800',
    Deleted: 'bg-gray-200 text-gray-800',
};

const QuoteCard: React.FC<{ quote: Quotation, onEdit: () => void, onDelete: () => void }> = ({ quote, onEdit, onDelete }) => {
    // Internal state to hide the card immediately when delete is clicked
    const [isDeleted, setIsDeleted] = useState(false);
    // 0: Idle, 1: Confirming
    const [deleteStep, setDeleteStep] = useState(0);
    
    const grossTotal = quote.lineItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0);
    const totalAfterDiscount = grossTotal - quote.discount;
    const grandTotal = Math.round(totalAfterDiscount);

    // Reset delete confirmation if user doesn't click within 3 seconds
    useEffect(() => {
        if (deleteStep === 1) {
            const timer = setTimeout(() => setDeleteStep(0), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteStep]);

    const handleDeleteClick = (e: React.MouseEvent) => {
        // Force stop propagation to ensure no parent elements catch the click
        e.stopPropagation();
        e.preventDefault();
        
        if (deleteStep === 0) {
            // First click: Ask for confirmation
            setDeleteStep(1);
            return;
        }

        if (deleteStep === 1) {
            // Second click: Execute "Scorched Earth" delete
            setIsDeleted(true);
            setTimeout(() => {
                onDelete();
            }, 0);
        }
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit();
    };

    // If marked as deleted, render nothing.
    if (isDeleted) return null;

    return (
        <div className="bg-white shadow-md rounded-lg p-4 flex flex-col transition hover:shadow-lg border border-transparent hover:border-slate-200">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-bold text-lg text-slate-800">{quote.customerName}</p>
                    <p className="text-sm text-slate-500 font-mono">{quote.quoteNumber}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColorMap[quote.status]}`}>{quote.status}</span>
            </div>
            <div className="text-sm text-slate-600 mb-4 flex-grow">
                <p><strong>Vehicle:</strong> {quote.vehicleMake} {quote.vehicleModel}</p>
                {quote.vehicleNo && <p><strong>Vehicle No:</strong> {quote.vehicleNo}</p>}
                <p><strong>Date:</strong> {new Date(quote.date).toLocaleDateString()}</p>
                {quote.isOptionQuote && (
                    <p className="mt-2 text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded">Option Quote</p>
                )}
            </div>
            <div className="border-t pt-2">
                {quote.isOptionQuote ? (
                     <p className="text-right text-sm font-medium text-slate-500">Multiple Options</p>
                ) : (
                     <p className="text-right text-2xl font-bold text-slate-900">₹{grandTotal.toFixed(2)}</p>
                )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
                <button 
                    type="button"
                    onClick={handleEditClick} 
                    className="text-sm px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium"
                >
                    Edit
                </button>
                <button 
                    type="button"
                    onClick={handleDeleteClick} 
                    className={`text-sm px-3 py-1.5 rounded-md transition font-medium border ${
                        deleteStep === 1 
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-md transform scale-105' 
                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700'
                    }`}
                >
                    {deleteStep === 1 ? 'Confirm?' : 'Delete'}
                </button>
            </div>
        </div>
    );
};

export const SavedQuotesList: React.FC<SavedQuotesListProps> = ({ quotes, onEdit, onDelete, onCreateNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const sortedQuotes = useMemo(() => 
    [...quotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [quotes]);

  const filteredQuotes = useMemo(() => {
    return sortedQuotes.filter(quote => {
        const nameMatch = quote.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const dateMatch = searchDate ? quote.date === searchDate : true;
        return nameMatch && dateMatch;
    });
  }, [sortedQuotes, searchTerm, searchDate]);

  if (quotes.length === 0) {
      return (
          <div className="text-center py-20 bg-white rounded-lg shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-xl font-medium text-slate-900">No quotations found</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by creating a new quotation.</p>
              <div className="mt-6">
                  <button
                      type="button"
                      onClick={onCreateNew}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                       <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                       </svg>
                      Create New Quote
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-slate-800">All Quotations</h2>
        </div>

        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex items-center gap-4 flex-wrap">
            <div className="relative flex-grow min-w-[200px]">
                <input
                    type="text"
                    placeholder="Search by customer name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-100 hover:bg-slate-200 transition-colors placeholder-slate-500"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            </div>
            <div className="relative flex-grow min-w-[150px]">
                <input
                    type="date"
                    value={searchDate}
                    onChange={e => setSearchDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                />
            </div>
            {(searchTerm || searchDate) && (
                 <button 
                    onClick={() => { setSearchTerm(''); setSearchDate(''); }}
                    className="px-4 py-2 text-sm border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition"
                >
                    Clear
                </button>
            )}
        </div>

        {filteredQuotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuotes.map(quote => (
                    <QuoteCard 
                        key={quote.id} 
                        quote={quote}
                        onEdit={() => onEdit(quote.id)}
                        onDelete={() => onDelete(quote.id)}
                    />
                ))}
            </div>
        ) : (
             <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-slate-900">No quotations match your search</h3>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your search terms or clearing the filters.</p>
            </div>
        )}
    </div>
  );
};
