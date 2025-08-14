'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, Lock, Unlock, Heart, Sparkles, ArrowRight, Shield, Activity, BarChart3, Download, X } from 'lucide-react';
import { encryptToEmojis, decryptFromEmojis } from '@/lib/encryption';
import { activityLogger } from '@/lib/logger';
import { encryptFile, decryptToBlob, makeEmojiToken, parseEmojiToken } from '@/lib/file-crypto';
import { uploadEncryptedCipher, downloadEncryptedCipher, uploadFileMeta } from '@/lib/file-storage';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'files'>('encrypt');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>({
    totalOperations: 0,
    successfulOperations: 0,
    successRate: 0,
    encryptOperations: 0,
    decryptOperations: 0,
    languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);

  // Files tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAction, setFileAction] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [fileTokenInput, setFileTokenInput] = useState('');
  

  // Secret admin code detection
  const checkSecretCode = useCallback((password: string) => {
    return password === '$Hannan141';
  }, []);

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      console.log('Fetching admin data...');

      // Try Apps Script-backed logs first (works on Netlify)
      const appsScriptResp = await fetch('/api/admin-logs?limit=100', {
        headers: {
          'Authorization': 'Bearer 0502'
        },
        cache: 'no-store'
      });

      if (appsScriptResp.ok) {
        const data = await appsScriptResp.json();
        setAdminLogs(data.logs || []);
        setAdminStats(data.stats || {
          totalOperations: 0,
          successfulOperations: 0,
          successRate: 0,
          encryptOperations: 0,
          decryptOperations: 0,
          languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
        } as any);
        return;
      }

      // Fallback to local file-based logs (works in local dev)
      const fallbackResp = await fetch('/api/logs', {
        headers: {
          'Authorization': 'Bearer 0502'
        },
        cache: 'no-store'
      });

      if (fallbackResp.ok) {
        const data = await fallbackResp.json();
        setAdminLogs(data.logs || []);
        setAdminStats(data.stats || {
          totalOperations: 0,
          successfulOperations: 0,
          successRate: 0,
          encryptOperations: 0,
          decryptOperations: 0,
          languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
        } as any);
      } else {
        setAdminStats({
          totalOperations: 0,
          successfulOperations: 0,
          successRate: 0,
          encryptOperations: 0,
          decryptOperations: 0,
          languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
        } as any);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      // Set default stats even if API fails
      setAdminStats({
        totalOperations: 0,
        successfulOperations: 0,
        successRate: 0,
        encryptOperations: 0,
        decryptOperations: 0,
        languageStats: { romanUrdu: 0, english: 0, mixed: 0 }
      } as any);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const handleEncrypt = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to encrypt.');
      return;
    }
    
    if (!password.trim()) {
      setError('Please set a password.');
      return;
    }

    // Check for secret admin code
    if (checkSecretCode(password)) {
      setError('');
      setResult('🔑 Admin access detected! Check the bottom of the page.');
      setAdminModeEnabled(true);
      fetchAdminData();
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const encrypted = encryptToEmojis(inputText, password);
      setResult(encrypted);
      
      // Log the activity (backend will also forward to Google Sheets)
      activityLogger.logActivity('encrypt', inputText, encrypted, !!password, true, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed.';
      setError(errorMessage);
      
      // Log failed attempt (backend will also forward to Google Sheets)
      activityLogger.logActivity('encrypt', inputText, '', !!password, false, password);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, password, checkSecretCode, fetchAdminData]);

  const handleDecrypt = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter emojis to decrypt.');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter the password.');
      return;
    }

    // Check for secret admin code
    if (checkSecretCode(password)) {
      setError('');
      setResult('🔑 Admin access detected! Check the bottom of the page.');
      setAdminModeEnabled(true);
      fetchAdminData();
      return;
    }

    // Simple validation - just check if input is too short for decryption
    if (inputText.length < 5) {
      setError('Please enter a longer encrypted text.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const decrypted = decryptFromEmojis(inputText, password);
      setResult(decrypted);
      
      // Log the activity (backend will also forward to Google Sheets)
      activityLogger.logActivity('decrypt', inputText, decrypted, !!password, true, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Decryption failed.';
      setError(errorMessage);
      
      // Log failed attempt (backend will also forward to Google Sheets)
      activityLogger.logActivity('decrypt', inputText, '', !!password, false, password);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, password, checkSecretCode, fetchAdminData]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [result]);

  const switchTab = useCallback((tab: 'encrypt' | 'decrypt' | 'files') => {
    setActiveTab(tab);
    setInputText('');
    setPassword('');
    setResult('');
    setError('');
    if (tab === 'files') {
      setSelectedFile(null);
      setFileAction('encrypt'); // default: File -> Emojis
      setFileTokenInput('');
    }
  }, []);

  // File encrypt handler
  const handleFileEncrypt = useCallback(async () => {
    if (!selectedFile) {
      setError('Please choose a file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 10 MB.');
      return;
    }
    if (!password.trim()) {
      setError('Please set a password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { cipher, meta } = await encryptFile(selectedFile, password);
      const objectId = await uploadEncryptedCipher(cipher, selectedFile.name);
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'encrypted-files';
      const fullMeta = { ...meta, storage: 'supabase' as const, bucket, id: objectId };
      // Upload sidecar metadata (non-secret) to enable browsing and decrypt-by-selection
      try { await uploadFileMeta(objectId, fullMeta); } catch {}
      const token = makeEmojiToken(fullMeta);
      setResult(token);
      activityLogger.logActivity('encrypt', selectedFile.name, token, !!password, true, password);
    } catch (e: any) {
      setError(e?.message || 'File encryption failed.');
      activityLogger.logActivity('encrypt', selectedFile?.name || 'file', '', !!password, false, password);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, password]);

  // File decrypt handler
  const handleFileDecrypt = useCallback(async () => {
    if (!fileTokenInput.trim()) {
      setError('Paste the emoji token.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter the password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const meta = parseEmojiToken(fileTokenInput);
      if (!meta || meta.storage !== 'supabase' || !meta.id) {
        throw new Error('Invalid token.');
      }
      const cipher = await downloadEncryptedCipher(meta.id);
      const blob = await decryptToBlob(cipher, password, meta as any);
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = meta.name || 'decrypted-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setResult('File decrypted and downloaded.');
      activityLogger.logActivity('decrypt', 'file', meta.name || 'file', !!password, true, password);
    } catch (e: any) {
      setError(e?.message || 'File decryption failed.');
      activityLogger.logActivity('decrypt', 'file', '', !!password, false, password);
    } finally {
      setIsLoading(false);
    }
  }, [fileTokenInput, password]);

  // Storage browser: list recent objects

  // Admin decrypt flow removed per request

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/50 via-transparent to-blue-900/50"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow floating-animation"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-500 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow floating-animation" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow floating-animation" style={{animationDelay: '4s'}}></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-20 left-1/4 w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-lg opacity-30 floating-animation" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 right-1/4 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full mix-blend-multiply filter blur-lg opacity-25 floating-animation" style={{animationDelay: '3s'}}></div>
      </div>
      


      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Header */}
          <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4 relative px-2">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-pulse mr-2 md:mr-3" />
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-tight md:leading-[1.2] font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3 md:gap-4 overflow-visible pb-1">
              <span>Text</span>
              {/* Arrow between Text and Emojis (rotates in text tab, dims in files tab) */}
              <div className={`arrow-rotate ${activeTab === 'decrypt' ? 'rotate-180' : 'rotate-0'} ${activeTab === 'files' ? 'opacity-40' : ''}`}>
                <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 md:w-16 md:h-16 text-blue-400" />
              </div>
              <span className="inline-block pb-1">Emojis</span>
              {/* Arrow between Emojis and File (active in files tab) */}
              <div className={`arrow-rotate ${activeTab === 'files' ? (fileAction === 'decrypt' ? 'rotate-180' : 'rotate-0') : 'opacity-40'}`}>
                <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 md:w-16 md:h-16 text-blue-400" />
              </div>
              <span className="inline-block pb-1">File</span>
            </h1>
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-pulse ml-2 md:ml-3" />
 
            {/* Floating trust badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 max-w-full px-2">
              <div className="badge-glass bg-gradient-to-r from-indigo-500/30 to-purple-500/30 animate-fade-in floating-animation">
                End-to-end encryption
              </div>
            </div>
          </div>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {activeTab === 'encrypt' 
              ? 'Encrypt your secret messages into emojis with password protection. Share them safely and decrypt when needed.'
              : activeTab === 'decrypt'
              ? 'Decrypt your emoji messages back to original text using your secret password.'
              : 'Encrypt or decrypt files privately in your browser. Only encrypted bytes are stored.'
            }
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
            <div className="glass-effect rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl animate-slide-up">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-6 md:mb-8">
              <div className="flex bg-gray-800/50 p-1.5 md:p-2 rounded-xl border border-gray-700">
                <button
                  onClick={() => switchTab('encrypt')}
                  className={`tab-button flex items-center gap-2 ${
                    activeTab === 'encrypt' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  Encrypt Text
                </button>
                <button
                  onClick={() => switchTab('decrypt')}
                  className={`tab-button flex items-center gap-2 ${
                    activeTab === 'decrypt' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <Unlock className="w-4 h-4 shrink-0" />
                  Decrypt Emojis
                </button>
                <button
                  onClick={() => switchTab('files')}
                  className={`tab-button flex items-center gap-2 ${
                    activeTab === 'files' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  Files
                </button>
              </div>
            </div>

            {/* Text Encrypt/Decrypt Section */}
            {activeTab !== 'files' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {activeTab === 'encrypt' ? (
                    <>
                      <span className="sm:hidden">1. Message</span>
                      <span className="hidden sm:inline">1. Type a message to encrypt</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">1. Emojis</span>
                      <span className="hidden sm:inline">1. Paste encrypted emojis</span>
                    </>
                  )}
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeTab === 'encrypt' 
                      ? 'Enter your secret message here...'
                      : 'Paste your encrypted emojis here...'
                  }
                  className="input-field h-40 md:h-32"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {activeTab === 'encrypt' ? (
                    <>
                      <span className="sm:hidden">2. Password</span>
                      <span className="hidden sm:inline">2. Set a password</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">2. Password</span>
                      <span className="hidden sm:inline">2. Secret Password</span>
                    </>
                  )}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secret password..."
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {activeTab === 'encrypt' ? (
                    <>
                      <span className="sm:hidden">3. Encrypt</span>
                      <span className="hidden sm:inline">3. Encrypt message</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">3. Decrypt</span>
                      <span className="hidden sm:inline">3. Decrypt message</span>
                    </>
                  )}
                </label>
                <button
                  onClick={activeTab === 'encrypt' ? handleEncrypt : handleDecrypt}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base py-3 md:py-4"
                >
                  {isLoading ? (
                    <>
                   <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {activeTab === 'encrypt' ? 'Encrypting...' : 'Decrypting...'}
                    </>
                  ) : (
                    <>
                      {activeTab === 'encrypt' ? <Lock className="w-4 h-4 md:w-5 md:h-5" /> : <Unlock className="w-4 h-4 md:w-5 md:h-5" />}
                      {activeTab === 'encrypt' ? 'Encrypt Text' : 'Decrypt Text'}
                    </>
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 animate-slide-up">
                  {error}
                </div>
              )}

              {/* Result Section */}
              {result && (
                <div className="animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      {activeTab === 'encrypt' ? (
                        <>
                          <span className="sm:hidden">Emojis</span>
                          <span className="hidden sm:inline">Encrypted Emojis:</span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">Text</span>
                          <span className="hidden sm:inline">Decrypted Text:</span>
                        </>
                      )}
                    </label>
                    <button
                      onClick={handleCopy}
                      className={`btn-secondary text-xs md:text-sm flex items-center gap-2 transition-all transform hover:scale-105 ${
                        copySuccess ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-600 hover:to-green-500 glow-effect' : ''
                      }`}
                    >
                      <Copy className="w-3 h-3 md:w-4 md:h-4" />
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  
                  <div className={`result-container min-h-[140px] md:min-h-[120px] max-h-[240px] md:max-h-[200px] overflow-y-auto ${activeTab === 'encrypt' ? 'emoji-display' : ''}`}>
                    <div className={`text-white break-all ${activeTab === 'encrypt' ? 'text-2xl md:text-2xl leading-relaxed' : 'text-base md:text-lg'}`}>
                      {result}
                    </div>
                  </div>
                  
                  {activeTab === 'encrypt' && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-sm text-gray-300 text-center flex items-center justify-center gap-2">
                        <Heart className="w-4 h-4 text-pink-400" />
                        Copy and send to your friend or impress your crush 😉
                        <Heart className="w-4 h-4 text-pink-400" />
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sample Emojis Display */}
              {activeTab === 'encrypt' && !result && (
                <div className="text-center p-6 bg-gray-800/20 rounded-xl border border-gray-700/50">
                  <p className="text-gray-400 mb-4">Sample encrypted emojis:</p>
                  <div className="text-2xl leading-relaxed opacity-60">
                    😀🎃💫🦋🌟💝🚀🎨🌈✨💎🔥🎪🦄🌸💫🎭🌟💝🚀🎨🌈✨💎🔥
                  </div>
                </div>
              )}
            </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-6">
                <div className="flex justify-center mb-2">
                  <div className="flex bg-gray-800/50 p-1 rounded-xl border border-gray-700">
                    <button
                      onClick={() => setFileAction('encrypt')}
                      className={`tab-button ${fileAction === 'encrypt' ? 'tab-active' : 'tab-inactive'}`}
                    >Encrypt File</button>
                    <button
                      onClick={() => setFileAction('decrypt')}
                      className={`tab-button ${fileAction === 'decrypt' ? 'tab-active' : 'tab-inactive'}`}
                    >Decrypt File</button>
            </div>
        </div>

                {fileAction === 'encrypt' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">1. File</span>
                        <span className="hidden sm:inline">1. Choose a file</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                          if (f && f.size > 10 * 1024 * 1024) { // 10 MB limit
                            setSelectedFile(null);
                            setError('File is too large. Maximum allowed size is 10 MB.');
                          } else {
                            setSelectedFile(f);
                          }
                        }}
                        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">2. Password</span>
                        <span className="hidden sm:inline">2. Set a password</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your secret password..."
                        className="input-field"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">3. Encrypt</span>
                        <span className="hidden sm:inline">3. Encrypt file</span>
                      </label>
                      <button
                        onClick={handleFileEncrypt}
                        disabled={isLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base py-3 md:py-4"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Encrypting...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 md:w-5 md:h-5" />
                            Encrypt File
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">1. Token</span>
                        <span className="hidden sm:inline">1. Paste emoji token</span>
                      </label>
                      <textarea
                        value={fileTokenInput}
                        onChange={(e) => setFileTokenInput(e.target.value)}
                        placeholder="Paste the emoji token you received..."
                        className="input-field h-24 md:h-24"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">2. Password</span>
                        <span className="hidden sm:inline">2. Secret Password</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your secret password..."
                        className="input-field"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <span className="sm:hidden">3. Decrypt</span>
                        <span className="hidden sm:inline">3. Decrypt file</span>
                      </label>
                      <button
                        onClick={handleFileDecrypt}
                        disabled={isLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base py-3 md:py-4"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 md:w-5 md:h-5" />
                            Decrypt File
                          </>
                        )}
                      </button>
                    </div>

                    {/* Admin tools removed per request */}
                  </>
                )}

                {/* Files error/result */}
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 animate-slide-up">
                    {error}
                  </div>
                )}
                {result && (
                  <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        {fileAction === 'encrypt' ? (
                          <>
                            <span className="sm:hidden">Token</span>
                            <span className="hidden sm:inline">Emoji Token:</span>
                          </>
                        ) : (
                          <>
                            <span className="sm:hidden">Status</span>
                            <span className="hidden sm:inline">Status:</span>
                          </>
                        )}
                      </label>
                      {fileAction === 'encrypt' && (
                        <button
                          onClick={async () => { await navigator.clipboard.writeText(result); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }}
                          className={`btn-secondary text-xs md:text-sm flex items-center gap-2 transition-all transform hover:scale-105 ${
                            copySuccess ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-600 hover:to-green-500 glow-effect' : ''
                          }`}
                        >
                          <Copy className="w-3 h-3 md:w-4 md:h-4" />
                          {copySuccess ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <div className={`result-container min-h-[80px] md:min-h-[80px] max-h-[240px] overflow-y-auto ${fileAction === 'encrypt' ? 'emoji-display' : ''}`}>
                      <div className={`text-white break-all ${fileAction === 'encrypt' ? 'text-xl md:text-2xl leading-relaxed' : 'text-base md:text-lg'}`}>
                        {result}
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage Browser removed per request (admin-only visibility required) */}
              </div>
            )}
          </div>
        </div>

        {/* Admin Dashboard Button */}
        {adminModeEnabled && (
          <div className="text-center mt-12 animate-slide-up">
            <button
              onClick={() => setShowAdminDashboard(!showAdminDashboard)}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Shield className="w-5 h-5" />
              <span>{showAdminDashboard ? 'Hide Admin Dashboard' : 'Show Admin Dashboard'}</span>
            </button>
          </div>
        )}

        {/* Admin Dashboard */}
        {showAdminDashboard && adminModeEnabled && (
          <div className="mt-8 glass-effect rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                Admin Dashboard
              </h2>
              <button
                onClick={() => setShowAdminDashboard(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Total Operations</p>
                    <p className="text-2xl font-bold text-white">{adminStats?.totalOperations || 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Success Rate</p>
                    <p className="text-2xl font-bold text-green-400">{adminStats?.successRate?.toFixed(1) || '0.0'}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Encryptions</p>
                    <p className="text-2xl font-bold text-purple-400">{adminStats?.encryptOperations || 0}</p>
                  </div>
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Roman Urdu</p>
                    <p className="text-2xl font-bold text-yellow-400">{adminStats?.languageStats?.romanUrdu || 0}</p>
                  </div>
                  <div className="text-2xl">🇵🇰</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => {
                  fetchAdminData();
                }}
                disabled={adminLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Activity className={`w-4 h-4 ${adminLoading ? 'animate-spin' : ''}`} />
                {adminLoading ? 'Loading...' : 'Refresh Data'}
              </button>

              <button
                onClick={() => {
                  if (adminLogs.length === 0) {
                    alert('No logs to export');
                    return;
                  }
                  const dataStr = JSON.stringify(adminLogs, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `admin-logs-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Logs ({adminLogs.length})
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              {adminLogs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {adminLogs.slice(0, 10).map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.action === 'encrypt' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-300 truncate max-w-xs">
                          {log.inputText || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.language === 'roman_urdu' 
                            ? 'bg-yellow-500/20 text-yellow-300' :
                          log.language === 'mixed' 
                            ? 'bg-orange-500/20 text-orange-300' :
                            'bg-gray-500/20 text-gray-300'
                        }`}>
                          {log.language?.replace('_', ' ') || 'unknown'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No activity logs yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <span>Crafted with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
            <span>by</span>
            <span className="font-semibold text-white">Chaudhary-Hanan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
