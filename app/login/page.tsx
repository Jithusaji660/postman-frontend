'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // ഡെമോ ലോഗിൻ സക്‌സസ് ആക്കാൻ
    const mockUser = { name: 'Java Developer', email: email || 'user@test.com' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'mock-jwt-token-12345');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-6 rounded-lg w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>⚡</span> Sign In to API Tester</h2>
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@test.com"
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-indigo-500"
            required
          />
        </div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-xs font-medium transition">
          Login
        </button>
      </form>
    </div>
  );
}