
import React from 'react';

interface HeaderProps {
    currentView: 'list' | 'form';
    onCreateNew: () => void;
    onViewList: () => void;
    onOpenSettings: () => void;
    isPasswordSet: boolean;
    onLogout: () => void;
    onRefresh: () => void;
    isSyncing: boolean;
    lastSyncTime: Date | null;
}

export const Header: React.FC<HeaderProps> = ({ 
    currentView, 
    onCreateNew, 
    onViewList, 
    onOpenSettings, 
    isPasswordSet, 
    onLogout,
    onRefresh,
    isSyncing,
    lastSyncTime
}) => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
        <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-800" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-7a.75.75 0 00-.75.75v3.16L6.97 9.03a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 10-1.06-1.06l-2.22 2.22V3.75A.75.75 0 0010 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-800">Tyre Quotation Pro</h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Sync Status & Button */}
            <div className="flex flex-col items-end mr-2">
                <div className="flex items-center">
                    <button 
                        onClick={onRefresh} 
                        disabled={isSyncing}
                        className={`p-2 rounded-full text-slate-600 hover:bg-slate-100 transition focus:outline-none ${isSyncing ? 'animate-spin' : ''}`}
                        title="Sync with Google Sheets"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    {lastSyncTime && (
                         <span className="text-xs text-slate-400 hidden sm:inline-block ml-1">
                            {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            <nav className="flex items-center space-x-2 sm:space-x-4">
                {currentView === 'form' ? (
                     <button
                        onClick={onViewList}
                        className="flex items-center bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        View All
                    </button>
                ) : (
                    <button
                        onClick={onCreateNew}
                        className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        New Quote
                    </button>
                )}
                {isPasswordSet && (
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-full text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        aria-label="Logout"
                        title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                )}
                 <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-full text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    aria-label="Open settings"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </nav>
        </div>
      </div>
    </header>
  );
};
