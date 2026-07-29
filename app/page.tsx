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

  // Fetch History & Collections
  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/proxy/history');
      setHistoryList(res.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/collections');
      setCollectionList(res.data);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCollections();
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
  const handleDeleteHistory = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`http://localhost:8080/api/proxy/history/${id}`);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleDeleteCollection = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`http://localhost:8080/api/collections/${id}`);
      setCollectionList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete collection item:', err);
    }
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

    const headerObject: Record<string, string> = {};
    currentTab.headers.forEach((h) => {
      if (h.key.trim() !== '') {
        headerObject[replaceVariables(h.key.trim())] = replaceVariables(h.value);
      }
    });

    if (currentTab.authType === 'bearer' && currentTab.token.trim() !== '') {
      headerObject['Authorization'] = `Bearer ${replaceVariables(currentTab.token.trim())}`;
    }

    try {
      let processedBody = null;
      if (currentTab.body.trim()) {
        try {
          processedBody = JSON.parse(replaceVariables(currentTab.body));
        } catch {
          processedBody = replaceVariables(currentTab.body);
        }
      }

      const res = await axios.post('http://localhost:8080/api/proxy/execute', {
        method: currentTab.method,
        url: processedUrl,
        headers: headerObject,
        body: processedBody,
        tests: currentTab.tests || [],
      });

      const autoResponseTab = res.data.testResults && res.data.testResults.length > 0 ? 'tests' : 'body';

      updateCurrentTab({ 
        response: res.data,
        responseTab: autoResponseTab 
      });
    } catch (err: any) {
      updateCurrentTab({
        response: {
          statusCode: err.response?.status || 500,
          responseTime: 0,
          body: err.message || 'Error executing request',
        },
      });
    } finally {
      setLoading(false);
      fetchHistory();
    }
  };

  // Save Collection Handler
  const handleSaveToCollection = async () => {
    if (!requestName.trim() || !currentTab.url.trim()) {
      alert("Please enter a Request Name and URL");
      return;
    }

    const headerObject: Record<string, string> = {};
    currentTab.headers.forEach((h) => {
      if (h.key.trim() !== '') headerObject[h.key.trim()] = h.value;
    });

    let bodyString = '';
    if (currentTab.body) {
      bodyString = typeof currentTab.body === 'object' 
        ? JSON.stringify(currentTab.body) 
        : currentTab.body.toString();
    }

    try {
      await axios.post('http://localhost:8080/api/collections', {
        name: requestName.trim(),
        method: currentTab.method,
        url: currentTab.url,
        headers: JSON.stringify(headerObject),
        body: bodyString,
      });

      updateCurrentTab({ name: requestName });
      setShowSaveModal(false);
      setRequestName('');
      fetchCollections();
    } catch (err: any) {
      console.error('Failed to save collection:', err);
      alert('Failed to save request: ' + (err.response?.data?.message || err.message));
    }
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
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-950 text-white font-sans relative overflow-x-hidden w-full max-w-full">
      
      {/* MOBILE TOP BAR */}
      <div className="flex md:hidden items-center justify-between p-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 w-full">
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
        } md:block md:static w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col shrink-0`}
      >
        <h2 className="hidden md:flex text-lg font-bold mb-3 items-center gap-2">
          <span>⚡</span> API Tester
        </h2>

        {/* Search Input Bar */}
        <div className="relative mb-3">
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
        <div className="flex border-b border-slate-800 mb-3 text-xs">
          <button
            onClick={() => setSidebarTab('history')}
            className={`pb-2 flex-1 font-semibold transition-colors relative ${
              sidebarTab === 'history' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            History
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
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[calc(100vh-160px)] md:max-h-none">
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
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto">
        {/* MULTI-TAB HEADER BAR */}
        <div className="flex items-center bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1 overflow-x-auto w-full">
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

        <div className="p-3 md:p-6 flex-1 flex flex-col w-full">
          {/* Environment & Code Button Bar */}
          <div className="flex justify-between items-center gap-2 mb-3">
            <span className="text-xs text-slate-400 font-medium">Request Builder</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCodeModal(true)}
                className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded text-emerald-400 font-medium transition"
              >
                <Code size={13} />
                <span>Code</span>
              </button>
              <button
                onClick={() => setShowEnvModal(true)}
                className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded text-indigo-400 font-medium transition"
              >
                <Settings size={13} />
                <span>Env ({envVars.length})</span>
              </button>
            </div>
          </div>

          {/* URL Input Area (STACKED FOR MOBILE) */}
          <div className="flex flex-col md:flex-row gap-2 mb-4 w-full">
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={currentTab.method}
                onChange={(e) => updateCurrentTab({ method: e.target.value })}
                className="bg-slate-800 border border-slate-700 text-white text-xs md:text-sm rounded px-2.5 py-2 outline-none font-bold text-blue-400 cursor-pointer"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                placeholder="e.g. {{baseUrl}}/todos/1"
                value={currentTab.url}
                onChange={(e) => updateCurrentTab({ url: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-800 text-white text-xs md:text-sm rounded px-3 py-2 outline-none focus:border-blue-500 font-mono transition min-w-0"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded text-xs md:text-sm transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>

              <button
                onClick={() => {
                  if (!requestName) setRequestName(currentTab.name !== 'Untitled Request' ? currentTab.name : '');
                  setShowSaveModal(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded text-xs md:text-sm transition"
              >
                Save
              </button>
            </div>
          </div>

          {/* Dynamic Request Builder & Response Area */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 w-full">
            
            {/* Request Builder Box */}
            <div className="bg-slate-900 rounded border border-slate-800 p-3 md:p-4 flex flex-col min-h-[200px]">
              <div className="flex border-b border-slate-800 mb-3 gap-3 text-xs font-medium overflow-x-auto">
                {[
                  { id: 'headers', label: `Headers (${currentTab.headers.length})` },
                  { id: 'auth', label: `Auth` },
                  { id: 'body', label: 'Body' },
                  { id: 'tests', label: `Tests` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => updateCurrentTab({ activeTab: tab.id as any })}
                    className={`pb-2 relative whitespace-nowrap ${
                      currentTab.activeTab === tab.id ? 'text-indigo-400 font-semibold border-b-2 border-indigo-500' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-[140px]">
                {currentTab.activeTab === 'headers' && (
                  <div className="space-y-2 max-h-48 md:max-h-none overflow-y-auto pr-1">
                    {currentTab.headers.map((h, idx) => (
                      <div key={idx} className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Key"
                          value={h.key}
                          onChange={(e) => handleHeaderChange(idx, e.target.value, h.value)}
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={h.value}
                          onChange={(e) => handleHeaderChange(idx, h.key, e.target.value)}
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs outline-none"
                        />
                        <button onClick={() => removeHeaderRow(idx)} className="text-red-400 text-xs px-1">
                          ✕
                        </button>
                      </div>
                    ))}
                    <button onClick={addHeaderRow} className="text-xs text-indigo-400 hover:underline inline-block font-medium">
                      + Add Header
                    </button>
                  </div>
                )}

                {currentTab.activeTab === 'auth' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Type</label>
                      <select
                        value={currentTab.authType}
                        onChange={(e) => updateCurrentTab({ authType: e.target.value as any })}
                        className="bg-slate-950 border border-slate-800 rounded p-1.5 text-white w-full outline-none"
                      >
                        <option value="none">No Auth</option>
                        <option value="bearer">Bearer Token</option>
                      </select>
                    </div>
                    {currentTab.authType === 'bearer' && (
                      <textarea
                        value={currentTab.token}
                        onChange={(e) => updateCurrentTab({ token: e.target.value })}
                        placeholder="Paste JWT token..."
                        className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 font-mono text-xs outline-none text-yellow-300"
                      />
                    )}
                  </div>
                )}

                {currentTab.activeTab === 'body' && (
                  <textarea
                    value={currentTab.body}
                    onChange={(e) => updateCurrentTab({ body: e.target.value })}
                    placeholder='{\n  "key": "value"\n}'
                    className="w-full h-28 md:h-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-emerald-400 outline-none"
                  />
                )}

                {currentTab.activeTab === 'tests' && (
                  <div className="space-y-2 text-xs">
                    {[
                      { id: 'STATUS_200', label: 'Status Code is 200 OK' },
                      { id: 'RESPONSE_TIME_500MS', label: 'Response time < 500ms' },
                      { id: 'HAS_BODY', label: 'Response body is present' },
                    ].map((test) => (
                      <label key={test.id} className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded cursor-pointer">
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
                          className="rounded accent-indigo-500"
                        />
                        <span className="text-slate-200">{test.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Response Box */}
            <div className="bg-slate-900 rounded border border-slate-800 p-3 md:p-4 flex flex-col min-h-[200px]">
              <div className="flex justify-between items-center gap-2 mb-3">
                <h3 className="text-xs md:text-sm font-semibold">Response</h3>

                {currentTab.response && (
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        currentTab.response.statusCode >= 200 && currentTab.response.statusCode < 300
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {currentTab.response.statusCode}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {currentTab.response.responseTime} ms
                    </span>
                    <button onClick={handleCopyResponse} className="bg-slate-800 p-1 rounded text-slate-300">
                      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Response Content View */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded p-2.5 overflow-y-auto font-mono text-xs min-h-[140px] max-h-60 md:max-h-none">
                {!currentTab.response ? (
                  <p className="text-slate-600">Click Send to get a response</p>
                ) : (
                  <div>
                    {renderPrettyJson(currentTab.response.body)}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Code Snippet Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-white">Code Snippet</h3>
                <button onClick={() => setShowCodeModal(false)} className="text-slate-400">✕</button>
              </div>
              <div className="bg-slate-950 p-2.5 rounded font-mono text-xs text-emerald-300 overflow-x-auto max-h-48 mb-3">
                <pre>{generateCodeSnippet()}</pre>
              </div>
              <div className="flex justify-between">
                <button onClick={handleCopyCode} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded">
                  {codeCopied ? 'Copied!' : 'Copy Code'}
                </button>
                <button onClick={() => setShowCodeModal(false)} className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Request Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 w-full max-w-xs">
              <h3 className="text-xs font-bold mb-2">Save Request</h3>
              <input
                type="text"
                placeholder="Request Name"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white mb-3 outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button onClick={() => setShowSaveModal(false)} className="px-3 py-1 bg-slate-800 text-slate-300 rounded">
                  Cancel
                </button>
                <button onClick={handleSaveToCollection} className="px-3 py-1 bg-indigo-600 text-white rounded">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}