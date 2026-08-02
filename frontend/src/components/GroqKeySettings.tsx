import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const getLocalGroqKey = () => localStorage.getItem('custom_groq_api_key');
export const setLocalGroqKey = (key: string) => localStorage.setItem('custom_groq_api_key', key);
export const removeLocalGroqKey = () => localStorage.removeItem('custom_groq_api_key');

const GroqKeySettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = getLocalGroqKey();
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-groq-settings', handleOpen);
    return () => window.removeEventListener('open-groq-settings', handleOpen);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      setLocalGroqKey(apiKey.trim());
      toast.success('API Key saved locally');
    } else {
      removeLocalGroqKey();
      toast.success('API Key removed. System will use default key.');
    }
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn-secondary py-1 px-3 text-[9px] tracking-widest flex items-center gap-1.5 whitespace-nowrap"
      >
        ⚙️ AI Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-md w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
            >
              &times;
            </button>
            <h3 className="text-xl font-sans font-bold text-foreground mb-2">Groq AI Configuration</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Our AI analysis features are powered by Groq. If the system's default key has expired or is unconfigured, you can provide your own.
            </p>

            <div className="bg-muted/30 border border-border p-3 rounded mb-4 text-xs space-y-2 text-foreground/80">
              <p className="font-bold uppercase tracking-widest text-[9px] text-muted-foreground">How to get a key:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Visit <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">console.groq.com/keys</a></li>
                <li>Create an account or log in</li>
                <li>Click <strong>"Create API Key"</strong></li>
                <li>Copy the key and paste it below</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Your Groq API Key
              </label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                Stored locally in your browser. Leave blank to use the system default.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsOpen(false)} className="btn-secondary py-1.5 px-4 text-xs">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary py-1.5 px-4 text-xs">
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroqKeySettings;
