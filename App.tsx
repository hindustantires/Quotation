
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuotationForm } from './components/QuotationForm.tsx';
import { SavedQuotesList } from './components/SavedQuotesList.tsx';
import { Header } from './components/Header.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import type { Quotation, CompanyDetails } from './types.ts';
import { GoogleSheetsService } from './googleSheets.ts';

type View = 'list' | 'form';

const defaultCompanyDetails: CompanyDetails = {
  name: 'HINDUSTAN TYRES',
  address: 'S-18/02 RAJA BAZAR,NADESAR, VARANASI, 221002',
  phone: '+91 93353 33302',
  email: 'hindustantires@gmail.com',
  bankName: 'State Bank of India',
  accountHolder: 'HINDUSTAN TYRES',
  accountNumber: '3221883667',
  ifscCode: 'SBIN0007485',
  upiId: 'N/A',
  upiQrCode: '',
  defaultNotes: '1. All prices are inclusive of taxes.\n2. Warranty as per manufacturer terms.\n3. This quotation is valid for 7 days.',
  defaultTaxRate: 18,
  password: '12345', // Default passcode enforced
  
  // --- GOOGLE SHEETS CONFIGURATION ---
  useGoogleSheets: true, 
  googleWebAppUrl: 'https://script.google.com/macros/s/AKfycbxt1t7cRnEj1bOE3w91_hkg9IOyARAIpeisqEewFwuY8eVhoSLX1x14XtEryYfca-kZ8A/exec', 
};

// ULTRA-ROBUST NORMALIZATION
const normalize = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).toLowerCase().trim().replace(/\s+/g, ' '); // remove extra spaces
};

// Generate a fingerprint for the quote content
const getQuoteFingerprint = (q: Quotation) => {
    return normalize(`${q.date}_${q.customerName}_${q.quoteNumber}`);
};

// HELPER: Read directly from storage to ensure we always have the absolute latest blacklist
const getLocallyBlacklistedItems = () => {
    try {
        const ids = new Set(JSON.parse(localStorage.getItem('bl_ids') || '[]'));
        const numbers = new Set(JSON.parse(localStorage.getItem('bl_numbers') || '[]'));
        const fingerprints = new Set(JSON.parse(localStorage.getItem('bl_fingerprints') || '[]'));
        
        // Migrate legacy blacklists if they exist
        const legacyIds = JSON.parse(localStorage.getItem('blacklistedIds') || '[]');
        legacyIds.forEach((id: string) => ids.add(normalize(id)));

        return { ids, numbers, fingerprints };
    } catch (e) {
        console.error("Error reading blacklist", e);
        return { ids: new Set(), numbers: new Set(), fingerprints: new Set() };
    }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultCompanyDetails);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Google Sheets Service Instance & Sync State
  const [sheetsService, setSheetsService] = useState<GoogleSheetsService | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ref to pause sync temporarily after actions
  const pauseSyncRef = useRef<boolean>(false);

  // Initialize App and Load Data
  useEffect(() => {
    const initApp = async () => {
        try {
            // 1. Load Local Settings
            const savedDetails = localStorage.getItem('companyDetails');
            let details: CompanyDetails = defaultCompanyDetails;
            if (savedDetails) {
                const parsed = JSON.parse(savedDetails);
                parsed.useGoogleSheets = true;
                if (!parsed.googleWebAppUrl) parsed.googleWebAppUrl = defaultCompanyDetails.googleWebAppUrl;
                details = { ...defaultCompanyDetails, ...parsed };
            }

            // ENFORCE PASSWORD POLICY:
            // Ensure a password is set. If the user cleared it or it's missing, revert to default.
            if (!details.password || details.password.trim() === '') {
                details.password = '12345';
            }

            setCompanyDetails(details);

            // 2. Authentication Logic
            const sessionAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
            if (sessionAuthenticated) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }

            // 3. Data Loading Logic
            if (details.useGoogleSheets && details.googleWebAppUrl) {
                const service = new GoogleSheetsService(details.googleWebAppUrl);
                setSheetsService(service);
                await fetchRemoteQuotes(service);
            } else {
                loadFromLocalStorage();
            }
        } catch (error) {
            console.error("App initialization failed", error);
            loadFromLocalStorage();
        } finally {
            setIsAppReady(true);
        }
    };

    initApp();
  }, []); 

  // Automatic Background Sync
  useEffect(() => {
      let intervalId: any;
      if (companyDetails.useGoogleSheets && sheetsService) {
          intervalId = setInterval(() => {
              // Ensure we are not paused
              if (!isSyncing && !pauseSyncRef.current) {
                  fetchRemoteQuotes(sheetsService, true);
              }
          }, 30000); 
      }
      return () => {
          if (intervalId) clearInterval(intervalId);
      }
  }, [companyDetails.useGoogleSheets, sheetsService, isSyncing]);

  // Robust Fetch Function
  const fetchRemoteQuotes = async (service: GoogleSheetsService, isBackground = false) => {
      // 1. INITIAL GUARD
      if (pauseSyncRef.current) return; 
      
      if (!isBackground) setIsSyncing(true);
      setErrorMsg(null);
      try {
          const cloudQuotes = await service.fetchQuotes();
          
          // 2. SECONDARY GUARD (CRITICAL RACE CONDITION FIX)
          // If user clicked Delete while we were awaiting fetch(), stop here!
          if (pauseSyncRef.current) {
              console.log("Sync ignored due to pending user action");
              return; 
          }

          // CRITICAL: Read directly from storage right now
          const { ids, numbers, fingerprints } = getLocallyBlacklistedItems();

          // ULTIMATE FILTERING
          const validQuotes = cloudQuotes.filter(q => {
              // 1. Backend Status Check
              if (q.status === 'Deleted') return false;

              // 2. ID Check (Normalized)
              if (ids.has(normalize(q.id))) return false;

              // 3. Quote Number Check (Normalized)
              if (numbers.has(normalize(q.quoteNumber))) return false;

              // 4. Fingerprint Check (Content match)
              if (fingerprints.has(getQuoteFingerprint(q))) return false;
              
              return true;
          });
          
          setQuotes(validQuotes);
          // Update local cache with valid quotes only
          localStorage.setItem('tyreQuotes', JSON.stringify(validQuotes));
          setLastSyncTime(new Date());
      } catch (err: any) {
          console.error("Failed to sync with Google Sheets:", err);
          if (!isBackground) {
            setErrorMsg(err.message || "Failed to connect to Google Sheets");
          }
      } finally {
          if (!isBackground) setIsSyncing(false);
      }
  };

  const loadFromLocalStorage = () => {
      const savedQuotes = localStorage.getItem('tyreQuotes');
      if (savedQuotes) {
        setQuotes(JSON.parse(savedQuotes));
      }
  };
  
  const handleRefresh = useCallback(() => {
      pauseSyncRef.current = false;
      if (sheetsService && companyDetails.useGoogleSheets) {
          fetchRemoteQuotes(sheetsService);
      } else {
          loadFromLocalStorage();
          setLastSyncTime(new Date());
      }
  }, [sheetsService, companyDetails]);

  const handleSaveSettings = (details: CompanyDetails) => {
    try {
      const detailsToSave = { ...details };
      // Enforce password here as well just in case user tries to clear it
      if (!detailsToSave.password || detailsToSave.password.trim() === '') {
        detailsToSave.password = '12345';
        alert('Password cannot be empty. It has been reset to default: 12345');
      }
      detailsToSave.useGoogleSheets = true; // Enforce
      
      localStorage.setItem('companyDetails', JSON.stringify(detailsToSave));
      setCompanyDetails(detailsToSave);
      setIsSettingsOpen(false);
      
      if (details.googleWebAppUrl !== companyDetails.googleWebAppUrl) {
          window.location.reload();
      }
    } catch (error) {
      console.error("Failed to save company details to localStorage", error);
    }
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
    }
  };

  const handleSaveQuote = async (quote: Quotation) => {
    const existingIndex = quotes.findIndex(q => q.id === quote.id);
    let updatedQuotes;
    if (existingIndex > -1) {
      updatedQuotes = [...quotes];
      updatedQuotes[existingIndex] = quote;
    } else {
      updatedQuotes = [...quotes, quote];
    }
    setQuotes(updatedQuotes); 
    setView('list');
    setSelectedQuote(null);

    // Resurrection Logic: Remove from blacklists if we are re-saving it
    const { ids, numbers, fingerprints } = getLocallyBlacklistedItems();
    const qId = normalize(quote.id);
    const qNum = normalize(quote.quoteNumber);
    const qPrint = getQuoteFingerprint(quote);

    if (ids.has(qId) || numbers.has(qNum) || fingerprints.has(qPrint)) {
        const newIds = Array.from(ids).filter(i => i !== qId);
        const newNums = Array.from(numbers).filter(n => n !== qNum);
        const newPrints = Array.from(fingerprints).filter(f => f !== qPrint);

        localStorage.setItem('bl_ids', JSON.stringify(newIds));
        localStorage.setItem('bl_numbers', JSON.stringify(newNums));
        localStorage.setItem('bl_fingerprints', JSON.stringify(newPrints));
    }

    // Immediate local save
    localStorage.setItem('tyreQuotes', JSON.stringify(updatedQuotes));

    if (sheetsService && companyDetails.useGoogleSheets) {
        setIsSyncing(true);
        pauseSyncRef.current = true;
        try {
            await sheetsService.saveQuote(quote);
            setTimeout(() => {
                pauseSyncRef.current = false;
                fetchRemoteQuotes(sheetsService, true);
            }, 2000);
        } catch (err) {
            alert("Warning: Saved locally but failed to upload to Google Sheets. Check connection.");
            pauseSyncRef.current = false;
        } finally {
            setIsSyncing(false);
        }
    }
  };

  const handleCreateNew = () => {
    setSelectedQuote(null);
    setView('form');
  };

  const handleEditQuote = (id: string) => {
    const quoteToEdit = quotes.find(q => q.id === id);
    if (quoteToEdit) {
      setSelectedQuote(quoteToEdit);
      setView('form');
    }
  };

  // --- THE FIXED DELETE HANDLER ---
  const handleDeleteQuote = (id: string) => {
    // Note: Confirmation is now handled in the child component SavedQuotesList via the 2-step button.
    // If we reach here, the user has already confirmed.

    const quoteToDelete = quotes.find(q => q.id === id);
    if (!quoteToDelete) {
        // Fallback: Force remove by ID if object not found (rare race condition)
        setQuotes(prev => prev.filter(q => q.id !== id));
        return;
    }

    // 1. PAUSE SYNC IMMEDIATELY
    pauseSyncRef.current = true;
    
    // 2. ADD TO TRIPLE-LOCK BLACKLIST (TOMBSTONING)
    try {
        const { ids, numbers, fingerprints } = getLocallyBlacklistedItems();
        
        // Add ID
        if (quoteToDelete.id) ids.add(normalize(quoteToDelete.id));
        
        // Add Quote Number
        if (quoteToDelete.quoteNumber) numbers.add(normalize(quoteToDelete.quoteNumber));
        
        // Add Fingerprint (Customer|Date|Number)
        fingerprints.add(getQuoteFingerprint(quoteToDelete));

        localStorage.setItem('bl_ids', JSON.stringify(Array.from(ids)));
        localStorage.setItem('bl_numbers', JSON.stringify(Array.from(numbers)));
        localStorage.setItem('bl_fingerprints', JSON.stringify(Array.from(fingerprints)));
    } catch (e) {
        console.error("Critical error saving blacklist", e);
    }

    // 3. IMMEDIATE UI UPDATE (OPTIMISTIC)
    // Remove from UI state instantly
    const updatedQuotes = quotes.filter(q => q.id !== id);
    setQuotes([...updatedQuotes]); // New array reference to force re-render
    
    // Remove from Local Storage instantly
    localStorage.setItem('tyreQuotes', JSON.stringify(updatedQuotes));

    if (selectedQuote?.id === id) {
        setSelectedQuote(null);
        setView('list');
    }

    // 4. FIRE AND FORGET BACKEND REQUEST
    // We do NOT await this. We do not block the UI.
    if (sheetsService && companyDetails.useGoogleSheets) {
        sheetsService.deleteQuote(quoteToDelete)
            .then(() => console.log('Backend delete request sent'))
            .catch(err => console.warn('Backend delete error (ignored due to tombstone)', err))
            .finally(() => {
                // Wait a long time before allowing sync to resume, to let the backend settle
                setTimeout(() => {
                    pauseSyncRef.current = false;
                }, 8000); 
            });
    } else {
        pauseSyncRef.current = false;
    }
  };

  const handleViewList = () => {
      setSelectedQuote(null);
      setView('list');
  }

  const handleBackup = () => {
    const { ids, numbers } = getLocallyBlacklistedItems();
    const backupData = {
      version: '1.4', // incremented
      timestamp: new Date().toISOString(),
      companyDetails,
      quotes,
      blacklistedIds: Array.from(ids),
      blacklistedNumbers: Array.from(numbers)
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tyre_quotation_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (!data.quotes || !Array.isArray(data.quotes)) throw new Error('Invalid backup');
        
        if (window.confirm(`Restore data? This will overwrite current view.`)) {
            setQuotes(data.quotes);
            if (data.companyDetails) {
                setCompanyDetails(data.companyDetails);
                localStorage.setItem('companyDetails', JSON.stringify(data.companyDetails));
            }
            localStorage.setItem('tyreQuotes', JSON.stringify(data.quotes));
            
            alert('Data restored locally.');
            setIsSettingsOpen(false);
            window.location.reload();
        }
      } catch (err) {
        alert('Failed to restore data.');
      }
    };
    reader.readAsText(file);
  };

  if (!isAppReady) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading Application...</div>;
  if (!isAuthenticated) return <LoginScreen storedPassword={companyDetails.password!} onLoginSuccess={handleLoginSuccess} />;

  return (
    <>
      <div className="bg-slate-50 min-h-screen text-slate-800">
        <div className="relative">
             <Header 
              currentView={view}
              onCreateNew={handleCreateNew} 
              onViewList={handleViewList} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              isPasswordSet={!!companyDetails.password}
              onLogout={handleLogout}
              onRefresh={handleRefresh}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
            />
            {errorMsg && (
               <div className="bg-red-500 text-white text-xs text-center py-1">
                   {errorMsg}
               </div>
            )}
            {isSyncing && !errorMsg && (
                <div className="absolute top-full left-0 w-full bg-blue-500 text-white text-xs text-center py-1 transition-all z-10">
                    Syncing with Google Sheets...
                </div>
            )}
        </div>

        <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          {view === 'list' && (
            <SavedQuotesList
              quotes={quotes}
              onEdit={handleEditQuote}
              onDelete={handleDeleteQuote}
              onCreateNew={handleCreateNew}
            />
          )}
          {view === 'form' && (
            <QuotationForm
              initialData={selectedQuote}
              onSave={handleSaveQuote}
              onCancel={() => setView('list')}
              companyDetails={companyDetails}
              quotes={quotes}
            />
          )}
        </main>
      </div>
      {isSettingsOpen && (
        <SettingsModal 
          details={companyDetails}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          onBackup={handleBackup}
          onRestore={handleRestore}
        />
      )}
    </>
  );
};

export default App;
