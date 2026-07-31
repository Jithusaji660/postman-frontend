'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Settings, Copy, Check, Code, Plus, X, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

interface TabItem {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  authType: 'none' | 'bearer';
  token: string;
  body: string;
  tests: string[];
  response: any;
  activeTab: 'headers' | 'auth' | 'body' | 'tests';
  responseTab: 'body' | 'headers' | 'tests';
}

export default function PostmanDashboard() {
  // Mobile Sidebar Drawer Toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Tabs State
  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: 'tab-1',
      name: 'Untitled Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      authType: 'none',
      token: '',
      body: '',
      tests: [],
      response: null,
      activeTab: 'headers',
      responseTab: 'body',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Active Tab Utility Getter
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Sidebar Tab & Search State
  const [sidebarTab, setSidebarTab] = useState<'history' | 'collections'>('history');
  const [searchQuery, setSearchQuery] = useState('');

  // Response Copy State
  const [copied, setCopied] = useState(false);

  // Response & Sidebar Data State
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [collectionList, setCollectionList] = useState<any[]>([]);

  // Save Modal State
  const [requestName, setRequestName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Environment Variables State
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'baseUrl', value: 'https://jsonplaceholder.typicode.com' },
  ]);
  const [showEnvModal, setShowEnvModal] = useState(false);

  // Code Snippet Modal State
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [codeCopied, setCodeCopied] = useState(false);

  // --- LOCALSTORAGE DATA HANDLERS ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('api_tester_history');
    if (savedHistory) {
      try {
        setHistoryList(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }

    const savedCollections = localStorage.getItem('api_tester_collections');
    if (savedCollections) {
      try {
        setCollectionList(JSON.parse(savedCollections));
      } catch (e) {
        console.error('Failed to parse collections from localStorage', e);
      }
    }
  }, []);

  // Update Current Tab Helper Function
  const updateCurrentTab = (fields: Partial<TabItem>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...fields } : tab))
    );
  };

  // Add New Tab
  const handleAddNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: TabItem = {
      id: newId,
      name: 'Untitled Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      authType: 'none',
      token: '',
      body: '',
      tests: [],
      response: null,
      activeTab: 'headers',
      responseTab: 'body',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  // Close Tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filteredTabs = tabs.filter((t) => t.id !== id);
    setTabs(filteredTabs);
    if (activeTabId === id) {
      setActiveTabId(filteredTabs[filteredTabs.length - 1].id);
    }
  };

  // Copy Response Handler
  const handleCopyResponse = () => {
    if (currentTab.response?.body) {
      navigator.clipboard.writeText(JSON.stringify(currentTab.response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Replace {{var}} with Environment values
  const replaceVariables = (text: string) => {
    if (!text) return text;
    let result = text;
    envVars.forEach((item) => {
      if (item.key.trim() !== '') {
        const regex = new RegExp(`{{${item.key.trim()}}}`, 'g');
        result = result.replace(regex, item.value.trim());
      }
    });
    return result;
  };

  // JSON Syntax Highlighter Helper Component
  const renderPrettyJson = (data: any) => {
    if (data === null || data === undefined) return null;
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    const highlighted = jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-300';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-indigo-300 font-semibold';
          } else {
            cls = 'text-emerald-400';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-sky-400 font-bold';
        } else if (/null/.test(match)) {
          cls = 'text-rose-400 font-bold';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );

    return (
      <pre
        className="leading-relaxed font-mono whitespace-pre-wrap break-all"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  };

  // Code Snippet Generator
  const generateCodeSnippet = () => {
    const targetUrl = replaceVariables(currentTab.url) || 'https://api.example.com/data';
    const activeHeaders: Record<string, string> = {};
    currentTab.headers.forEach((h) => {
      if (h.key.trim()) activeHeaders[replaceVariables(h.key.trim())] = replaceVariables(h.value);
    });
    if (currentTab.authType === 'bearer' && currentTab.token.trim()) {
      activeHeaders['Authorization'] = `Bearer ${replaceVariables(currentTab.token.trim())}`;
    }

    if (codeLanguage === 'curl') {
      let cmd = `curl --location '${targetUrl}' \\\n--request ${currentTab.method}`;
      Object.entries(activeHeaders).forEach(([k, v]) => {
        cmd += ` \\\n--header '${k}: ${v}'`;
      });
      if (currentTab.body.trim() && currentTab.method !== 'GET') {
        cmd += ` \\\n--data '${currentTab.body.replace(/\n/g, '')}'`;
      }
      return cmd;
    }

    if (codeLanguage === 'javascript') {
      let js = `fetch('${targetUrl}', {\n  method: '${currentTab.method}',\n  headers: ${JSON.stringify(activeHeaders, null, 4)}`;
      if (currentTab.body.trim() && currentTab.method !== 'GET') {
        js += `,\n  body: JSON.stringify(${currentTab.body})`;
      }
      js += `\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Error:', error));`;
      return js;
    }

    if (codeLanguage === 'python') {
      let py = `import requests\n\nurl = "${targetUrl}"\nheaders = ${JSON.stringify(activeHeaders, null, 4)}\n`;
      if (currentTab.body.trim() && currentTab.method !== 'GET') {
        py += `payload = ${currentTab.body}\nresponse = requests.${currentTab.method.toLowerCase()}(url, headers=headers, json=payload)\n`;
      } else {
        py += `response = requests.${currentTab.method.toLowerCase()}(url, headers=headers)\n`;
      }
      py += `print(response.json())`;
      return py;
    }

    return '';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCodeSnippet());
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Delete Handlers
  const handleDeleteHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('api_tester_history', JSON.stringify(updated));
  };

  const handleDeleteCollection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = collectionList.filter((item) => item.id !== id);
    setCollectionList(updated);
    localStorage.setItem('api_tester_collections', JSON.stringify(updated));
  };

  // Header Handlers
  const handleHeaderChange = (index: number, key: string, value: string) => {
    const newHeaders = [...currentTab.headers];
    newHeaders[index] = { key, value };
    updateCurrentTab({ headers: newHeaders });
  };

  const addHeaderRow = () =>
    updateCurrentTab({ headers: [...currentTab.headers, { key: '', value: '' }] });

  const removeHeaderRow = (index: number) =>
    updateCurrentTab({
      headers: currentTab.headers.filter((_, i) => i !== index),
    });

  // Send Request
  const handleSendRequest = async () => {
    setLoading(true);
    updateCurrentTab({ response: null });

    const processedUrl = replaceVariables(currentTab.url);

    if (!processedUrl.trim()) {
      alert("Please enter a valid URL");
      setLoading(false);
      return;
    }

    const headerObject: Record<string, string> = {};
    currentTab.headers.forEach((h) => {
      if (h.key.trim() !== '') {
        headerObject[replaceVariables(h.key.trim())] = replaceVariables(h.value);
      }
    });

    if (currentTab.authType === 'bearer' && currentTab.token.trim() !== '') {
      headerObject['Authorization'] = `Bearer ${replaceVariables(currentTab.token.trim())}`;
    }

    let processedBody = null;
    if (currentTab.body.trim()) {
      try {
        processedBody = JSON.parse(replaceVariables(currentTab.body));
      } catch {
        processedBody = replaceVariables(currentTab.body);
      }
    }

    const startTime = Date.now();

    try {
      const res = await axios({
        method: currentTab.method,
        url: processedUrl,
        headers: headerObject,
        data: processedBody,
      });

      const responseTime = Date.now() - startTime;

      const testResults: TestResult[] = [];
      if ((currentTab.tests || []).includes('STATUS_200')) {
        testResults.push({
          testName: 'Status Code is 200 OK',
          passed: res.status === 200,
          message: `Received status ${res.status}`,
        });
      }
      if ((currentTab.tests || []).includes('RESPONSE_TIME_500MS')) {
        testResults.push({
          testName: 'Response time is less than 500ms',
          passed: responseTime < 500,
          message: `Response time was ${responseTime}ms`,
        });
      }
      if ((currentTab.tests || []).includes('HAS_BODY')) {
        testResults.push({
          testName: 'Response body is present',
          passed: Boolean(res.data),
          message: res.data ? 'Body present' : 'Body missing',
        });
      }

      const autoTab = testResults.length > 0 ? 'tests' : 'body';

      updateCurrentTab({
        response: {
          statusCode: res.status,
          responseTime,
          headers: res.headers,
          body: res.data,
          testResults,
        },
        responseTab: autoTab,
      });

      const newHistoryItem = {
        id: Date.now(),
        method: currentTab.method,
        url: processedUrl,
        responseTime,
        headers: JSON.stringify(headerObject),
        body: currentTab.body,
      };

      const newHistoryList = [newHistoryItem, ...historyList];
      setHistoryList(newHistoryList);
      localStorage.setItem('api_tester_history', JSON.stringify(newHistoryList));

    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      updateCurrentTab({
        response: {
          statusCode: err.response?.status || 500,
          responseTime,
          headers: err.response?.headers || {},
          body: err.response?.data || err.message || 'Error executing request',
          testResults: [],
        },
        responseTab: 'body',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save Collection Handler
  const handleSaveToCollection = () => {
    if (!requestName.trim() || !currentTab.url.trim()) {
      alert("Please enter a Request Name and URL");
      return;
    }

    const headerObject: Record<string, string> = {};
    currentTab.headers.forEach((h) => {
      if (h.key.trim() !== '') headerObject[h.key.trim()] = h.value;
    });

    const newCollectionItem = {
      id: Date.now(),
      name: requestName.trim(),
      method: currentTab.method,
      url: currentTab.url,
      headers: JSON.stringify(headerObject),
      body: currentTab.body || '',
    };

    const newCollectionList = [newCollectionItem, ...collectionList];
    setCollectionList(newCollectionList);
    localStorage.setItem('api_tester_collections', JSON.stringify(newCollectionList));

    updateCurrentTab({ name: requestName });
    setShowSaveModal(false);
    setRequestName('');
  };

  const handleSelectRequest = (item: any) => {
    let parsedHeaders = [{ key: 'Content-Type', value: 'application/json' }];
    if (item.headers) {
      try {
        const obj = typeof item.headers === 'string' ? JSON.parse(item.headers) : item.headers;
        parsedHeaders = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
      } catch (e) {
        console.error("Error parsing headers", e);
      }
    }

    updateCurrentTab({
      name: item.name || item.url,
      method: item.method,
      url: item.url,
      headers: parsedHeaders,
      body: item.body || '',
    });

    setMobileSidebarOpen(false);
  };

  const filteredHistory = historyList.filter((item) =>
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCollections = collectionList.filter(
    (item) =>
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-white font-sans relative overflow-hidden w-full max-w-full">
      
      {/* MOBILE TOP BAR */}
      <div className="flex md:hidden items-center justify-between p-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 w-full shrink-0">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <span>⚡</span> API Tester
        </h2>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 1. SIDEBAR */}
      <div
        className={`${
          mobileSidebarOpen ? 'block fixed inset-0 top-[49px] bg-slate-900 z-30 p-4' : 'hidden'
        } md:block md:static w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col h-full shrink-0 overflow-hidden`}
      >
        <h2 className="hidden md:flex text-lg font-bold mb-3 items-center gap-2 shrink-0">
          <span>⚡</span> API Tester
        </h2>

        {/* Search Input Bar */}
        <div className="relative mb-3 shrink-0">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search request..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Sidebar Toggle */}
        <div className="flex border-b border-slate-800 mb-3 text-xs shrink-0">
          <button
            onClick={() => setSidebarTab('history')}
            className={`pb-2 flex-1 font-semibold transition-colors relative ${
              sidebarTab === 'history' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            History ({historyList.length})
            {sidebarTab === 'history' && (
              <motion.div layoutId="sidebarTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          <button
            onClick={() => setSidebarTab('collections')}
            className={`pb-2 flex-1 font-semibold transition-colors relative ${
              sidebarTab === 'collections' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            Saved ({collectionList.length})
            {sidebarTab === 'collections' && (
              <motion.div layoutId="sidebarTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
          <AnimatePresence mode="wait">
            {sidebarTab === 'history' ? (
              <motion.div
                key="history-list"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-1"
              >
                {filteredHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 p-1">No items found</p>
                ) : (
                  filteredHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => handleSelectRequest(item)}
                      whileHover={{ x: 2 }}
                      className="group text-xs text-slate-300 hover:bg-slate-800/80 p-2 rounded cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <span
                          className={`font-bold text-[10px] ${
                            item.method === 'GET'
                              ? 'text-green-400'
                              : item.method === 'POST'
                              ? 'text-yellow-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {item.method}
                        </span>
                        <span className="truncate max-w-[140px] md:max-w-[90px]">{item.url}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 group-hover:hidden">
                          {item.responseTime}ms
                        </span>
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="hidden group-hover:block p-1 text-red-400 hover:text-red-300 transition"
                          title="Delete History"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="collections-list"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-1"
              >
                {filteredCollections.length === 0 ? (
                  <p className="text-xs text-slate-500 p-1">No items found</p>
                ) : (
                  filteredCollections.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => handleSelectRequest(item)}
                      whileHover={{ x: 2 }}
                      className="group text-xs text-slate-300 hover:bg-slate-800/80 p-2 rounded cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex flex-col gap-1 overflow-hidden pr-1">
                        <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-[10px] ${
                              item.method === 'GET' ? 'text-green-400' : 'text-yellow-400'
                            }`}
                          >
                            {item.method}
                          </span>
                          <span className="truncate max-w-[110px] text-slate-400">{item.url}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteCollection(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition"
                        title="Delete Collection"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* MULTI-TAB HEADER BAR */}
        <div className="flex items-center bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1 overflow-x-auto w-full shrink-0">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-medium cursor-pointer border-t border-x transition-all shrink-0 max-w-[160px] relative ${
                activeTabId === tab.id
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className={`font-bold text-[10px] ${
                  tab.method === 'GET'
                    ? 'text-green-400'
                    : tab.method === 'POST'
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`}
              >
                {tab.method}
              </span>
              <span className="truncate flex-1">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="hover:bg-slate-800 rounded p-0.5 text-slate-400 hover:text-red-400 transition"
                >
                  <X size={12} />
                </button>
              )}
            </motion.div>
          ))}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddNewTab}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition mb-1 shrink-0"
            title="New Tab"
          >
            <Plus size={16} />
          </motion.button>
        </div>

        <div className="p-3 md:p-5 flex-1 flex flex-col w-full overflow-hidden">
          {/* Environment & Code Button Bar */}
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Request Builder</span>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCodeModal(true)}
                className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded text-emerald-400 font-medium transition shadow"
              >
                <Code size={13} />
                <span>Generate Code</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowEnvModal(true)}
                className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded text-indigo-400 font-medium transition shadow"
              >
                <Settings size={13} />
                <span>Environments ({envVars.length})</span>
              </motion.button>
            </div>
          </div>

          {/* URL Input Area */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full shrink-0">
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={currentTab.method}
                onChange={(e) => updateCurrentTab({ method: e.target.value })}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded px-3 py-2 outline-none font-bold text-blue-400 cursor-pointer w-28 sm:w-auto"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSendRequest}
                disabled={loading}
                className="sm:hidden flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded text-sm transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {loading ? 'Sending...' : 'Send'}
              </motion.button>
            </div>

            <input
              type="text"
              placeholder="e.g. {{baseUrl}}/todos/1"
              value={currentTab.url}
              onChange={(e) => updateCurrentTab({ url: e.target.value })}
              className="w-full flex-1 bg-slate-900 border border-slate-800 text-white text-sm rounded px-4 py-2 outline-none focus:border-blue-500 font-mono transition min-w-0"
            />

            <div className="hidden sm:flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSendRequest}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded text-sm transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {loading ? 'Sending...' : 'Send'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!requestName) setRequestName(currentTab.name !== 'Untitled Request' ? currentTab.name : '');
                  setShowSaveModal(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded text-sm transition"
              >
                Save
              </motion.button>
            </div>

            {/* Mobile Save Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!requestName) setRequestName(currentTab.name !== 'Untitled Request' ? currentTab.name : '');
                setShowSaveModal(true);
              }}
              className="sm:hidden w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded text-sm transition"
            >
              Save Request
            </motion.button>
          </div>

          {/* Dynamic Request Builder & Response Area */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 min-h-0 overflow-hidden">
            
            {/* Request Builder Box */}
            <div className="bg-slate-900 rounded border border-slate-800 p-3 md:p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex border-b border-slate-800 mb-3 gap-4 text-xs font-medium relative overflow-x-auto shrink-0">
                {[
                  { id: 'headers', label: `Headers (${currentTab.headers.length})` },
                  { id: 'auth', label: `Auth ${currentTab.authType !== 'none' ? '•' : ''}` },
                  { id: 'body', label: 'Body' },
                  { id: 'tests', label: `Tests ${currentTab.tests?.length > 0 ? `(${currentTab.tests.length})` : ''}` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => updateCurrentTab({ activeTab: tab.id as any })}
                    className={`pb-2 relative transition-colors whitespace-nowrap ${
                      currentTab.activeTab === tab.id ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                    {currentTab.activeTab === tab.id && (
                      <motion.div layoutId="requestTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab.activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col"
                  >
                    {currentTab.activeTab === 'headers' && (
                      <div className="space-y-2 pr-1">
                        {currentTab.headers.map((h, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Key"
                              value={h.key}
                              onChange={(e) => handleHeaderChange(idx, e.target.value, h.value)}
                              className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-slate-700"
                            />
                            <input
                              type="text"
                              placeholder="Value"
                              value={h.value}
                              onChange={(e) => handleHeaderChange(idx, h.key, e.target.value)}
                              className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs outline-none focus:border-slate-700"
                            />
                            <button onClick={() => removeHeaderRow(idx)} className="text-red-400 hover:text-red-300 text-xs px-1">
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addHeaderRow}
                          className="text-xs text-indigo-400 hover:underline mt-2 inline-block font-medium"
                        >
                          + Add Header
                        </button>
                      </div>
                    )}

                    {currentTab.activeTab === 'auth' && (
                      <div className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Type</label>
                          <select
                            value={currentTab.authType}
                            onChange={(e) => updateCurrentTab({ authType: e.target.value as any })}
                            className="bg-slate-950 border border-slate-800 rounded p-2 text-white w-full outline-none"
                          >
                            <option value="none">No Auth</option>
                            <option value="bearer">Bearer Token</option>
                          </select>
                        </div>
                        {currentTab.authType === 'bearer' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Token</label>
                            <textarea
                              value={currentTab.token}
                              onChange={(e) => updateCurrentTab({ token: e.target.value })}
                              placeholder="Paste JWT token..."
                              className="w-full h-28 bg-slate-950 border border-slate-800 rounded p-2 font-mono text-xs outline-none text-yellow-300"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {currentTab.activeTab === 'body' && (
                      <div className="flex-1 flex flex-col h-full min-h-[140px]">
                        <textarea
                          value={currentTab.body}
                          onChange={(e) => updateCurrentTab({ body: e.target.value })}
                          placeholder='{\n  "key": "value"\n}'
                          className="w-full flex-1 bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-emerald-400 outline-none focus:border-slate-700 transition resize-none"
                        />
                      </div>
                    )}

                    {currentTab.activeTab === 'tests' && (
                      <div className="space-y-3 pr-1">
                        <p className="text-xs text-slate-400 mb-2">Select automated test assertions to run:</p>
                        {[
                          { id: 'STATUS_200', label: 'Status Code is 200 OK' },
                          { id: 'RESPONSE_TIME_500MS', label: 'Response time is less than 500ms' },
                          { id: 'HAS_BODY', label: 'Response body is present' },
                        ].map((test) => (
                          <motion.label
                            key={test.id}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded cursor-pointer hover:border-slate-700 transition"
                          >
                            <input
                              type="checkbox"
                              checked={(currentTab.tests || []).includes(test.id)}
                              onChange={(e) => {
                                const currentTests = currentTab.tests || [];
                                const updated = e.target.checked
                                  ? [...currentTests, test.id]
                                  : currentTests.filter((t) => t !== test.id);
                                updateCurrentTab({ tests: updated });
                              }}
                              className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs text-slate-200 font-medium">{test.label}</span>
                          </motion.label>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Response Box */}
            <div className="bg-slate-900 rounded border border-slate-800 p-3 md:p-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Response</h3>

                  {currentTab.response && (
                    <div className="flex text-xs bg-slate-950 p-0.5 rounded border border-slate-800 overflow-x-auto">
                      <button
                        onClick={() => updateCurrentTab({ responseTab: 'body' })}
                        className={`px-2 py-0.5 rounded transition ${
                          currentTab.responseTab === 'body'
                            ? 'bg-slate-800 text-indigo-400 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        Body
                      </button>
                      <button
                        onClick={() => updateCurrentTab({ responseTab: 'headers' })}
                        className={`px-2 py-0.5 rounded transition ${
                          currentTab.responseTab === 'headers'
                            ? 'bg-slate-800 text-indigo-400 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        Headers
                      </button>
                      {currentTab.response.testResults && currentTab.response.testResults.length > 0 && (
                        <button
                          onClick={() => updateCurrentTab({ responseTab: 'tests' })}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                            currentTab.responseTab === 'tests'
                              ? 'bg-slate-800 text-indigo-400 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          <span>Tests</span>
                          <span className="text-[10px] px-1 bg-indigo-500/20 text-indigo-300 rounded-full font-bold">
                            {currentTab.response.testResults.filter((r: TestResult) => r.passed).length}/
                            {currentTab.response.testResults.length}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {currentTab.response && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        currentTab.response.statusCode >= 200 && currentTab.response.statusCode < 300
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : currentTab.response.statusCode >= 400
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}
                    >
                      {currentTab.response.statusCode}{' '}
                      {currentTab.response.statusCode === 200 ? 'OK' : ''}
                    </span>

                    <span className="text-slate-400 font-mono text-[11px]">
                      {currentTab.response.responseTime} ms
                    </span>

                    <button
                      onClick={handleCopyResponse}
                      className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded transition"
                      title="Copy Response"
                    >
                      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Response Content View - STRICT OVERFLOW CONTROL */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded p-3 overflow-y-auto font-mono text-xs relative min-h-0">
                <AnimatePresence mode="wait">
                  {!currentTab.response ? (
                    <motion.p
                      key="no-response"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-slate-600"
                    >
                      Click Send to get a response
                    </motion.p>
                  ) : (
                    <motion.div
                      key={currentTab.responseTab}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      {currentTab.responseTab === 'body' && renderPrettyJson(currentTab.response.body)}

                      {/* Safe Headers Rendering */}
                      {currentTab.responseTab === 'headers' && (
                        <div className="space-y-1">
                          {currentTab.response.headers &&
                          Object.keys(currentTab.response.headers).length > 0 ? (
                            Object.entries(currentTab.response.headers).map(([k, v]: any) => (
                              <div key={k} className="flex gap-2 text-xs break-all">
                                <span className="text-indigo-400 font-semibold">{k}:</span>
                                <span className="text-slate-300">
                                  {typeof v === 'object' && v !== null
                                    ? JSON.stringify(v)
                                    : Array.isArray(v)
                                    ? v.join(', ')
                                    : String(v)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500">No response headers available</p>
                          )}
                        </div>
                      )}

                      {currentTab.responseTab === 'tests' && (
                        <motion.div 
                          className="space-y-2"
                          initial="hidden"
                          animate="show"
                          variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1, transition: { staggerChildren: 0.06 } }
                          }}
                        >
                          {currentTab.response.testResults && currentTab.response.testResults.length > 0 ? (
                            currentTab.response.testResults.map((result: TestResult, idx: number) => (
                              <motion.div
                                key={idx}
                                variants={{
                                  hidden: { opacity: 0, x: -10 },
                                  show: { opacity: 1, x: 0 }
                                }}
                                className={`flex items-center justify-between p-2.5 rounded border text-xs ${
                                  result.passed
                                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                                    : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      result.passed
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/20 text-rose-400'
                                    }`}
                                  >
                                    {result.passed ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="font-sans font-medium">{result.testName}</span>
                                </div>
                                <span className="text-[11px] opacity-80 font-sans">{result.message}</span>
                              </motion.div>
                            ))
                          ) : (
                            <p className="text-slate-500">No test results executed for this request.</p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippet Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-[550px] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code size={16} className="text-emerald-400" />
                  <span>Code Snippet</span>
                </h3>
                <button onClick={() => setShowCodeModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex border-b border-slate-800 mb-4 gap-2 text-xs overflow-x-auto">
                {[
                  { id: 'curl', label: 'cURL' },
                  { id: 'javascript', label: 'JavaScript (Fetch)' },
                  { id: 'python', label: 'Python (Requests)' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setCodeLanguage(lang.id as any)}
                    className={`pb-2 px-2 font-medium transition-colors whitespace-nowrap ${
                      codeLanguage === lang.id
                        ? 'border-b-2 border-emerald-500 text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Code Box */}
              <div className="relative bg-slate-950 border border-slate-800 rounded p-4 mb-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-64">
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded transition flex items-center gap-1 text-[11px]"
                >
                  {codeCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                </button>
                <pre>{generateCodeSnippet()}</pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Environment Variables Modal */}
      <AnimatePresence>
        {showEnvModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-[480px] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white">Environment Variables</h3>
                <button onClick={() => setShowEnvModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
                {envVars.map((v, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="VARIABLE (e.g. baseUrl)"
                      value={v.key}
                      onChange={(e) => {
                        const updated = [...envVars];
                        updated[idx].key = e.target.value;
                        setEnvVars(updated);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-yellow-400 font-mono outline-none"
                    />
                    <input
                      type="text"
                      placeholder="VALUE"
                      value={v.value}
                      onChange={(e) => {
                        const updated = [...envVars];
                        updated[idx].value = e.target.value;
                        setEnvVars(updated);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono outline-none"
                    />
                    <button
                      onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}
                      className="text-red-400 text-xs px-2 hover:bg-slate-800 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  + Add Variable
                </button>
                <button
                  onClick={() => setShowEnvModal(false)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Request Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-sm font-bold mb-3">Save Request</h3>
              <input
                type="text"
                placeholder="e.g. Get User Info API"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white mb-4 outline-none focus:border-indigo-500 transition"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToCollection}
                  className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}