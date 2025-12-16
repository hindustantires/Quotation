
import React, { useState, useRef } from 'react';
import type { CompanyDetails } from '../types.ts';

interface SettingsModalProps {
  details: CompanyDetails;
  onSave: (details: CompanyDetails) => void;
  onClose: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

const FormField: React.FC<{label: string, children: React.ReactNode, fullWidth?: boolean}> = ({ label, children, fullWidth }) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full px-3 py-2 border bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${props.className}`} />
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ details, onSave, onClose, onBackup, onRestore }) => {
  const [currentDetails, setCurrentDetails] = useState<CompanyDetails>(details);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCurrentDetails(prev => ({ ...prev, [name]: checked }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDetails(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
  };

  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentDetails(prev => ({ ...prev, upiQrCode: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(currentDetails);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-50 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Company Settings</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-grow">
          <div className="p-6 space-y-6">
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Company Name" fullWidth={true}><Input type="text" name="name" value={currentDetails.name} onChange={handleChange} required /></FormField>
                    <FormField label="Address" fullWidth={true}><Input type="text" name="address" value={currentDetails.address} onChange={handleChange} /></FormField>
                    <FormField label="Phone Number"><Input type="tel" name="phone" value={currentDetails.phone} onChange={handleChange} /></FormField>
                    <FormField label="Email Address"><Input type="email" name="email" value={currentDetails.email} onChange={handleChange} /></FormField>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M7 11v13h2v-5h2v3h2v-7h2v9h2v-13h6v15h-19v-15h3z"/></svg>
                    Google Sheets Database
                </h3>
                <div className="space-y-4">
                     <div className="flex items-center mb-4">
                        <input
                            id="useGoogleSheets"
                            name="useGoogleSheets"
                            type="checkbox"
                            checked={currentDetails.useGoogleSheets || false}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="useGoogleSheets" className="ml-2 block text-sm font-medium text-slate-700">
                            Enable Google Sheets Storage
                        </label>
                    </div>
                    
                    {currentDetails.useGoogleSheets && (
                        <div className="grid grid-cols-1 gap-4">
                             <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                                <strong>Setup Instructions:</strong>
                                <ol className="list-decimal ml-4 mt-1 space-y-1">
                                    <li>Create a Google Sheet and rename the first tab to <code>Quotations</code>.</li>
                                    <li>Add Headers (Row 1): <code>id</code>, <code>data</code>, <code>quote_number</code>, <code>customer_name</code>, <code>date</code>, <code>amount</code>, <code>status</code>.</li>
                                    <li>In Sheets, go to <strong>Extensions &gt; Apps Script</strong>.</li>
                                    <li>Paste the Backend Script code.</li>
                                    <li><strong>Deploy &gt; New Deployment &gt; Web App</strong>.</li>
                                    <li>Set <strong>Who has access</strong> to "Anyone".</li>
                                    <li>Copy the generated Web App URL below.</li>
                                </ol>
                            </div>
                            <FormField label="Google Web App URL" fullWidth={true}>
                                <Input 
                                    type="text" 
                                    name="googleWebAppUrl" 
                                    value={currentDetails.googleWebAppUrl || ''} 
                                    onChange={handleChange} 
                                    placeholder="https://script.google.com/macros/s/......./exec"
                                />
                            </FormField>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700">Quotation Defaults</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Default Tax Rate (%)">
                        <Input
                            type="number"
                            name="defaultTaxRate"
                            value={currentDetails.defaultTaxRate ?? ''}
                            onChange={handleNumericChange}
                            placeholder="e.g., 18"
                        />
                    </FormField>
                    <FormField label="Default Notes / Terms" fullWidth={true}>
                        <textarea
                            name="defaultNotes"
                            value={currentDetails.defaultNotes || ''}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
                            placeholder="Enter default terms and conditions that will appear on new quotations."
                        />
                    </FormField>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700">Security</h3>
                <div className="grid grid-cols-1">
                    <FormField label="App Password" fullWidth={true}>
                        <Input 
                            type="password" 
                            name="password" 
                            value={currentDetails.password || ''} 
                            onChange={handleChange} 
                            placeholder="Leave blank for no password"
                        />
                        <p className="text-xs text-slate-500 mt-1">Set a password to protect access to the application. You will be asked for it when you start a new session.</p>
                    </FormField>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700">Payment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Bank Name"><Input type="text" name="bankName" value={currentDetails.bankName} onChange={handleChange} /></FormField>
                    <FormField label="Account Holder"><Input type="text" name="accountHolder" value={currentDetails.accountHolder} onChange={handleChange} /></FormField>
                    <FormField label="Account Number"><Input type="text" name="accountNumber" value={currentDetails.accountNumber} onChange={handleChange} /></FormField>
                    <FormField label="IFSC Code"><Input type="text" name="ifscCode" value={currentDetails.ifscCode} onChange={handleChange} /></FormField>
                    <FormField label="UPI ID" ><Input type="text" name="upiId" value={currentDetails.upiId} onChange={handleChange} /></FormField>
                    
                    <FormField label="UPI QR Code" fullWidth={true}>
                        <div className="flex items-center space-x-4">
                            {currentDetails.upiQrCode ? (
                                <img src={currentDetails.upiQrCode} alt="UPI QR Code Preview" className="w-24 h-24 object-contain border rounded-md" />
                            ) : (
                                <div className="w-24 h-24 bg-slate-100 border rounded-md flex items-center justify-center text-xs text-slate-500">No Image</div>
                            )}
                            <div>
                                <input
                                    type="file"
                                    id="qrCodeUpload"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/gif"
                                    onChange={handleQrCodeUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('qrCodeUpload')?.click()}
                                    className="px-4 py-2 text-sm border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition"
                                >
                                    Upload QR Code
                                </button>
                                {currentDetails.upiQrCode && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentDetails(prev => ({ ...prev, upiQrCode: '' }))}
                                        className="ml-2 px-4 py-2 text-sm border border-transparent rounded-md text-red-700 hover:bg-red-100 transition"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </FormField>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 text-slate-700">Data Management</h3>
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <button
                        type="button"
                        onClick={onBackup}
                        className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Backup Data
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                        Restore Data
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                onRestore(file);
                                e.target.value = '';
                            }
                        }}
                    />
                </div>
                <p className="text-xs text-slate-500 mt-2">Download a backup of all quotations and settings, or restore from a previously saved file.</p>
            </div>
            
          </div>
        </form>
        <div className="p-5 border-t bg-slate-100 rounded-b-lg flex justify-end items-center space-x-4">
          <button type="button" onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-200 transition">Cancel</button>
          <button type="button" onClick={handleSubmit} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
