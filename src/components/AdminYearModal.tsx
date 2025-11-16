'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useYear } from '@/context/YearContext';
import { mutate } from 'swr';

type Mode = 'init' | 'edit';

type AdminYearModalProps = {
  onClose: () => void;
};

export default function AdminYearModal({ onClose }: AdminYearModalProps) {
  const { year: currentYear, years, currentYearSettings } = useYear();
  const [mode, setMode] = useState<Mode>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [copyFrom, setCopyFrom] = useState<number | ''>('');
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [address, setAddress] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');

  // Load current year settings when modal opens or currentYearSettings changes
  useEffect(() => {
    if (mode === 'edit' && currentYearSettings) {
      setAirbnbUrl(currentYearSettings.airbnbUrl || '');
      setImageUrl(currentYearSettings.imageUrl || '');
      setAddress(currentYearSettings.address || '');
      setTripStartDate(currentYearSettings.tripStartDate || '');
      setTripEndDate(currentYearSettings.tripEndDate || '');
    }
  }, [currentYearSettings, mode]);

  // Update form when switching modes
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'edit') {
      setAirbnbUrl(currentYearSettings?.airbnbUrl || '');
      setImageUrl(currentYearSettings?.imageUrl || '');
      setAddress(currentYearSettings?.address || '');
      setTripStartDate(currentYearSettings?.tripStartDate || '');
      setTripEndDate(currentYearSettings?.tripEndDate || '');
    } else {
      // Reset to empty when switching to init mode
      setAirbnbUrl('');
      setImageUrl('');
      setAddress('');
      setTripStartDate('');
      setTripEndDate('');
    }
  };
  
  const handleInitYear = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        year: newYear,
        copyAttendeesFrom: copyFrom === '' ? undefined : copyFrom,
        settings: {
          airbnbUrl: airbnbUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          address: address.trim() || undefined,
          tripStartDate: tripStartDate || undefined,
          tripEndDate: tripEndDate || undefined,
        },
      };
      
      const response = await fetch('/api/admin/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize year');
      }
      
      // Refresh years list
      await mutate('/api/admin/years');
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateYear = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        year: currentYear,
        settings: {
          airbnbUrl: airbnbUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          address: address.trim() || undefined,
          tripStartDate: tripStartDate || undefined,
          tripEndDate: tripEndDate || undefined,
        },
      };
      
      const response = await fetch('/api/admin/years', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update year');
      }
      
      // Refresh years list
      await mutate('/api/admin/years');
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'init') {
      handleInitYear();
    } else {
      handleUpdateYear();
    }
  };
  
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-2">Admin: Year Management</h2>
          <p className="text-slate-400">Initialize a new year or update settings for the current year</p>
        </div>
        
        <div className="p-6">
          {/* Mode selector */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('init')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mode === 'init'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Initialize New Year
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('edit')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mode === 'edit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Edit Current Year ({currentYear})
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'init' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Year to Initialize
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    min={2000}
                    max={2100}
                    required
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Copy Attendees From Year (Optional)
                  </label>
                  <select
                    value={copyFrom}
                    onChange={(e) => setCopyFrom(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="">None</option>
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>
                        {y.year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="border-t border-slate-700 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Trip Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Airbnb URL
                  </label>
                  <input
                    type="url"
                    value={airbnbUrl}
                    onChange={(e) => setAirbnbUrl(e.target.value)}
                    placeholder="https://www.airbnb.com/..."
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="15 Goldring Drive, Highland Lake, NY 12743"
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Trip Start Date
                    </label>
                    <input
                      type="date"
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Trip End Date
                    </label>
                    <input
                      type="date"
                      value={tripEndDate}
                      onChange={(e) => setTripEndDate(e.target.value)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? 'Saving...' : mode === 'init' ? 'Initialize Year' : 'Update Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

