'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, Lock, Unlock, Heart, Sparkles, ArrowRight, Shield, Activity, BarChart3, Download, X } from 'lucide-react';
import { encryptToEmojis, decryptFromEmojis, validateEmojiInput } from '@/lib/encryption';
import { activityLogger } from '@/lib/logger';
import { appsScriptLogger } from '@/lib/apps-script-logger';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');
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

  // Secret admin code detection
  const checkSecretCode = useCallback((password: string) => {
    return password === '$Hannan141';
  }, []);

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      console.log('Fetching admin data...');
      const response = await fetch('/api/logs', {
        headers: {
          'Authorization': 'Bearer 0502'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admin data received:', data);
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
        console.error('Failed to fetch admin data. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // Set default stats even if API fails
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
      
      // Log the activity (backend only)
      activityLogger.logActivity('encrypt', inputText, encrypted, !!password, true);
      
             // Log to Google Sheets via Apps Script if configured
       if (appsScriptLogger && appsScriptLogger.isConfigured()) {
         const logEntry = appsScriptLogger.createLogEntry('encrypt', inputText, encrypted, !!password, true);
         appsScriptLogger.logActivity(logEntry);
       }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed.';
      setError(errorMessage);
      
             // Log failed attempt
       activityLogger.logActivity('encrypt', inputText, '', !!password, false);
       
       // Log failed attempt to Google Sheets via Apps Script if configured
       if (appsScriptLogger && appsScriptLogger.isConfigured()) {
         const logEntry = appsScriptLogger.createLogEntry('encrypt', inputText, '', !!password, false);
         appsScriptLogger.logActivity(logEntry);
       }
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
      
      // Log the activity (backend only)
      activityLogger.logActivity('decrypt', inputText, decrypted, !!password, true);
      
             // Log to Google Sheets via Apps Script if configured
       if (appsScriptLogger && appsScriptLogger.isConfigured()) {
         const logEntry = appsScriptLogger.createLogEntry('decrypt', inputText, decrypted, !!password, true);
         appsScriptLogger.logActivity(logEntry);
       }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Decryption failed.';
      setError(errorMessage);
      
             // Log failed attempt
       activityLogger.logActivity('decrypt', inputText, '', !!password, false);
       
       // Log failed attempt to Google Sheets via Apps Script if configured
       if (appsScriptLogger && appsScriptLogger.isConfigured()) {
         const logEntry = appsScriptLogger.createLogEntry('decrypt', inputText, '', !!password, false);
         appsScriptLogger.logActivity(logEntry);
       }
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

  const switchTab = useCallback((tab: 'encrypt' | 'decrypt') => {
    setActiveTab(tab);
    setInputText('');
    setPassword('');
    setResult('');
    setError('');
  }, []);

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
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse mr-3" />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center gap-4">
              <span>Text</span>
              <div className={`arrow-rotate ${
                activeTab === 'encrypt' ? 'rotate-0' : 'rotate-180'
              }`}>
                <ArrowRight className="w-12 h-12 md:w-16 md:h-16 text-blue-400" />
              </div>
              <span>Emojis</span>
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse ml-3" />
          </div>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {activeTab === 'encrypt' 
              ? 'Encrypt your secret messages (English/Roman Urdu) into emojis with password protection. Share them safely and decrypt when needed.'
              : 'Decrypt your emoji messages back to original text (English/Roman Urdu) using your secret password.'
            }
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-effect rounded-3xl p-8 md:p-12 shadow-2xl animate-slide-up">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="flex bg-gray-800/50 p-2 rounded-xl border border-gray-700">
                <button
                  onClick={() => switchTab('encrypt')}
                  className={`tab-button flex items-center gap-2 ${
                    activeTab === 'encrypt' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Encrypt Text
                </button>
                <button
                  onClick={() => switchTab('decrypt')}
                  className={`tab-button flex items-center gap-2 ${
                    activeTab === 'decrypt' ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  Decrypt Emojis
                </button>
              </div>
            </div>

            {/* Input Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {activeTab === 'encrypt' ? '1. Type a message (English/Roman Urdu)' : '1. Paste encrypted emojis'}
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeTab === 'encrypt' 
                      ? 'Enter your secret message here... (English, Roman Urdu, or Urdu) - supports up to 1000 characters'
                      : 'Paste your encrypted emojis here...'
                  }
                  className="input-field h-32"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  2. Set a password
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
                  {activeTab === 'encrypt' ? '3. Encrypt message' : '3. Decrypt message'}
                </label>
                <button
                  onClick={activeTab === 'encrypt' ? handleEncrypt : handleDecrypt}
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {activeTab === 'encrypt' ? 'Encrypting...' : 'Decrypting...'}
                    </>
                  ) : (
                    <>
                      {activeTab === 'encrypt' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
                      {activeTab === 'encrypt' ? 'Encrypted Emojis:' : 'Decrypted Text:'}
                    </label>
                    <button
                      onClick={handleCopy}
                      className={`btn-secondary text-sm flex items-center gap-2 transition-all transform hover:scale-105 ${
                        copySuccess ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-600 hover:to-green-500 glow-effect' : ''
                      }`}
                    >
                      <Copy className="w-3 h-3" />
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  
                  <div className={`result-container min-h-[120px] max-h-[200px] overflow-y-auto ${activeTab === 'encrypt' ? 'emoji-display' : ''}`}>
                    <div className={`text-white break-all ${activeTab === 'encrypt' ? 'text-2xl leading-relaxed' : 'text-lg'}`}>
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
