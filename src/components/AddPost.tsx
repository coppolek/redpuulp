import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, PenSquare, X } from 'lucide-react';
import { Category } from '../types';

export default function AddPost({ onAdd, categories = [] }: { onAdd: () => void, categories?: Category[] }) {
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleCategory, setArticleCategory] = useState('');
  const [articleImageUrl, setArticleImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !user || !categoryId) return;
    
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
        categoryId,
        isArticle: false,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        score: 0,
      });

      setUrl('');
      setCategoryId('');
      onAdd();
    } catch (err: any) {
      console.error(err);
      setError('Could not import the link. Please try another one.');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle || !articleContent || !articleCategory || !user) return;
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'posts'), {
        url: '', // No URL for articles
        title: articleTitle,
        description: articleContent.substring(0, 150) + (articleContent.length > 150 ? '...' : ''), // Snippet
        content: articleContent,
        imageUrl: articleImageUrl,
        domain: 'Article', // We can use this to distinguish or just use isArticle
        siteName: 'Newswire',
        authorId: user.uid,
        categoryId: articleCategory,
        isArticle: true,
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
        score: 0,
      });

      setArticleTitle('');
      setArticleContent('');
      setArticleCategory('');
      setArticleImageUrl('');
      setShowArticleModal(false);
      onAdd();
    } catch (err: any) {
      console.error(err);
      setError('Could not post article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center w-full bg-slate-100 rounded-full focus-within:ring-2 focus-within:ring-orange-500 focus-within:bg-white transition-all shadow-sm border border-transparent focus-within:border-orange-200">
          <select
            value={categoryId}
            onChange={e => { setCategoryId(e.target.value); setError(''); }}
            className="h-10 bg-transparent pl-4 pr-1 sm:pr-2 text-xs sm:text-sm border-none outline-none focus:ring-0 text-slate-700 cursor-pointer disabled:opacity-70 max-w-[90px] sm:max-w-[120px]"
            required
            disabled={loading || !user}
          >
            <option value="" disabled>Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <div className="w-px h-5 bg-slate-300 mx-1 sm:mx-2 shrink-0" />
          
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder={user ? "Paste link..." : "Sign in to import..."}
            className="flex-1 min-w-0 h-10 bg-transparent py-2 px-2 text-sm border-none focus:ring-0 outline-none text-slate-900 placeholder-slate-400 disabled:opacity-70"
            required
            disabled={loading || !user}
          />
          <button
            type="submit"
            disabled={loading || !url || !user || !categoryId}
            className="mr-1 h-8 px-3 sm:px-4 shrink-0 bg-orange-500 text-white text-xs font-bold rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'IMPORT'}
          </button>
          {error && !showArticleModal && (
            <p className="absolute -bottom-6 left-4 text-xs font-medium text-red-500 whitespace-nowrap">
              {error}
            </p>
          )}
        </form>
        
        <button
          onClick={() => setShowArticleModal(true)}
          disabled={!user}
          title="Write Article"
          className="h-10 w-10 shrink-0 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
        >
          <PenSquare className="w-5 h-5" />
        </button>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Write an Article</h2>
              <button 
                onClick={() => setShowArticleModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleArticleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={articleTitle}
                    onChange={e => setArticleTitle(e.target.value)}
                    placeholder="Article Title..."
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    value={articleImageUrl}
                    onChange={e => setArticleImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                  <select
                    required
                    value={articleCategory}
                    onChange={e => setArticleCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="" disabled>Select a category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Content (Markdown supported)</label>
                  <textarea
                    required
                    value={articleContent}
                    onChange={e => setArticleContent(e.target.value)}
                    placeholder="Write your article here..."
                    className="w-full flex-1 border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 resize-none font-sans"
                  />
                </div>
                
                {error && showArticleModal && (
                  <div className="text-sm text-red-500 font-medium">
                    {error}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !articleTitle || !articleContent || !articleCategory}
                  className="px-6 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
