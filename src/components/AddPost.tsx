import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, Link as LinkIcon } from 'lucide-react';

export default function AddPost({ onAdd }: { onAdd: () => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !user) return;
    
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch metadata from our backend
      const res = await fetch('/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const metadata = await res.json();

      // Add to Firestore
      await addDoc(collection(db, 'posts'), {
        url,
        title: metadata.title || url,
        description: metadata.description || '',
        imageUrl: metadata.imageUrl || '',
        domain: metadata.domain || new URL(url).hostname,
        siteName: metadata.siteName || '',
        authorId: user.uid,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        score: 0,
      });

      setUrl('');
      onAdd();
    } catch (err: any) {
      console.error(err);
      setError('Could not import the link. Please try another one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center w-full">
      <input
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError('');
        }}
        placeholder={user ? "Paste news link to import..." : "Sign in to import news links..."}
        className="w-full h-10 bg-slate-100 rounded-full px-5 py-2 text-sm border-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none text-slate-900 placeholder-slate-400 disabled:opacity-70 disabled:bg-slate-200"
        required
        disabled={loading || !user}
      />
      <button
        type="submit"
        disabled={loading || !url || !user}
        className="absolute right-1 h-8 px-4 bg-orange-500 text-white text-xs font-bold rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'IMPORT'}
      </button>
      {error && (
        <p className="absolute -bottom-6 left-4 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </form>
  );
}
