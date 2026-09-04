import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, addDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserDoc, Category, Banner } from '../types';
import { Save, Trash2, Plus, Edit2, X, Loader2, Rss } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'banners' | 'rss'>('categories');
  const { userDoc } = useAuth();
  
  if (userDoc?.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-500">
        Access Denied. You must be an admin to view this page.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>
        
        <div className="flex gap-4 border-b border-slate-200 mb-8">
          {(['categories', 'banners', 'users', 'rss'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-sm font-bold capitalize transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-orange-500 text-orange-500' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Manage {tab}
            </button>
          ))}
        </div>

        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'banners' && <BannerManager />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'rss' && <RSSManager />}
      </div>
    </div>
  );
};

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats.sort((a, b) => a.order - b.order));
    });
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newDocRef = doc(collection(db, 'categories'));
    await setDoc(newDocRef, {
      name: newCatName.trim(),
      order: categories.length
    });
    setNewCatName('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Categories</h2>
      
      <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
        <input 
          type="text" 
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          placeholder="New category name (e.g. Technology)"
          className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <ul className="space-y-3">
        {categories.map(cat => (
          <li key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-medium text-slate-700">{cat.name}</span>
            <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </li>
        ))}
        {categories.length === 0 && <p className="text-sm text-slate-500">No categories found.</p>}
      </ul>
    </div>
  );
};

const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'banners'), (snapshot) => {
      const bs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(bs.sort((a, b) => a.order - b.order));
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title) return;
    
    if (editingBanner.id) {
      await updateDoc(doc(db, 'banners', editingBanner.id), { ...editingBanner });
    } else {
      const newRef = doc(collection(db, 'banners'));
      await setDoc(newRef, {
        ...editingBanner,
        order: banners.length,
        isActive: editingBanner.isActive ?? true
      });
    }
    setEditingBanner(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this banner?')) {
      await deleteDoc(doc(db, 'banners', id));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Ad Banners</h2>
        {!editingBanner && (
          <button 
            onClick={() => setEditingBanner({ title: '', imageUrl: '', link: '', code: '', isActive: true })}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        )}
      </div>

      {editingBanner && (
        <form onSubmit={handleSave} className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-900">{editingBanner.id ? 'Edit Banner' : 'New Banner'}</h3>
            <button type="button" onClick={() => setEditingBanner(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          
          <input type="text" placeholder="Internal Title" required value={editingBanner.title || ''} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="url" placeholder="Image URL (optional)" value={editingBanner.imageUrl || ''} onChange={e => setEditingBanner({...editingBanner, imageUrl: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="url" placeholder="Target Link (optional)" value={editingBanner.link || ''} onChange={e => setEditingBanner({...editingBanner, link: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          
          <textarea placeholder="Custom HTML Code (optional, e.g. AdSense code)" value={editingBanner.code || ''} onChange={e => setEditingBanner({...editingBanner, code: e.target.value})} className="w-full h-24 border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-mono"></textarea>
          
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={editingBanner.isActive ?? true} onChange={e => setEditingBanner({...editingBanner, isActive: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500" />
            Active
          </label>

          <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg hover:bg-slate-800 transition-colors">
            Save Banner
          </button>
        </form>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(banner => (
          <li key={banner.id} className={`p-4 border rounded-lg ${banner.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="font-bold text-slate-900">{banner.title}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingBanner(banner)} className="text-slate-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(banner.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {banner.imageUrl && <img src={banner.imageUrl} alt={banner.title} className="w-full h-24 object-cover rounded mb-2 bg-slate-100" />}
            {banner.code && <div className="text-xs font-mono text-slate-500 bg-slate-100 p-2 rounded truncate">{banner.code}</div>}
          </li>
        ))}
        {banners.length === 0 && <p className="text-sm text-slate-500 col-span-2">No banners found.</p>}
      </ul>
    </div>
  );
};

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserDoc[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc)));
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (confirm(`Change this user's role to ${newRole}?`)) {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">Users</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">User ID</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{u.email || 'Anonymous'}</td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{u.id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleRole(u.id, u.role)}
                    className="text-orange-500 hover:text-orange-600 font-bold text-xs"
                  >
                    Make {u.role === 'admin' ? 'User' : 'Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RSSManager: React.FC = () => {
  const [feedUrl, setFeedUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [automations, setAutomations] = useState<RssAutomation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const qCats = query(collection(db, 'categories'));
    const unCats = onSnapshot(qCats, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats.sort((a, b) => a.order - b.order));
    });

    const qAuto = query(collection(db, 'rss_automations'));
    const unAuto = onSnapshot(qAuto, (snapshot) => {
      const autos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RssAutomation));
      setAutomations(autos);
    });

    return () => { unCats(); unAuto(); };
  }, []);

  const handleAddAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl || !categoryId || !user) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/parse-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl }),
      });

      if (!res.ok) throw new Error('Failed to validate RSS feed URL');

      await addDoc(collection(db, 'rss_automations'), {
        feedUrl,
        categoryId,
        intervalMinutes: Number(intervalMinutes),
        lastRunAt: null,
        isActive: true,
        createdAt: serverTimestamp()
      });

      setFeedUrl('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error validating RSS feed');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'rss_automations', id), { isActive: !currentStatus });
  };

  const deleteAutomation = async (id: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      await deleteDoc(doc(db, 'rss_automations', id));
    }
  };

  // Background Daemon to process active automations while Admin panel is open
  useEffect(() => {
    if (!user) return;

    const processAutomations = async () => {
      const now = Date.now();
      for (const auto of automations) {
        if (!auto.isActive) continue;
        
        const lastRun = auto.lastRunAt || 0;
        const intervalMs = (auto.intervalMinutes || 10) * 60 * 1000;

        if (now - lastRun >= intervalMs) {
          console.log(`[Daemon] Running RSS automation for ${auto.feedUrl}`);
          
          try {
            // Update lastRunAt immediately to prevent duplicate runs
            await updateDoc(doc(db, 'rss_automations', auto.id), { lastRunAt: now });

            const res = await fetch('/api/parse-rss', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedUrl: auto.feedUrl }),
            });

            if (res.ok) {
              const data = await res.json();
              
              // Only import top 5 to avoid spam on every loop
              for (const item of data.items.slice(0, 5)) {
                if (!item.link) continue;

                // Check if post already exists to prevent duplicates
                const q = query(collection(db, 'posts'), where('url', '==', item.link));
                const existing = await getDocs(q);
                if (!existing.empty) continue;

                await addDoc(collection(db, 'posts'), {
                  url: item.link,
                  title: item.title || item.link,
                  description: item.contentSnippet || item.description || '',
                  imageUrl: item.extractedImageUrl || '',
                  domain: new URL(item.link).hostname,
                  siteName: data.title || '',
                  authorId: user.uid,
                  categoryId: auto.categoryId,
                  createdAt: serverTimestamp(),
                  upvotes: 0,
                  downvotes: 0,
                  score: 0,
                });
              }
            }
          } catch (e) {
            console.error(`[Daemon] Error processing automation ${auto.id}`, e);
          }
        }
      }
    };

    const interval = setInterval(processAutomations, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [automations, user]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Rss className="w-5 h-5 text-orange-500" /> RSS Automations
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Automatically import articles from RSS feeds at regular intervals. 
          <br/><span className="text-orange-500 font-bold text-xs bg-orange-50 px-2 py-1 rounded inline-block mt-2">Note: Auto-import runs in the background while this Admin Dashboard remains open.</span>
        </p>
      </div>

      <form onSubmit={handleAddAutomation} className="space-y-4 max-w-xl mb-8 border-b border-slate-200 pb-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">RSS Feed URL</label>
          <input 
            type="url" 
            required
            value={feedUrl}
            onChange={e => setFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Target Category</label>
            <select 
              required
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="" disabled>Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Interval (Minutes)</label>
            <input 
              type="number" 
              required
              min="1"
              value={intervalMinutes}
              onChange={e => setIntervalMinutes(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
        
        <button 
          type="submit" 
          disabled={loading || !feedUrl || !categoryId}
          className="w-full bg-orange-500 text-white font-bold py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Automation'}
        </button>
      </form>

      <div>
        <h3 className="font-bold text-slate-900 mb-4">Active Automations</h3>
        <ul className="space-y-3">
          {automations.map(auto => {
            const catName = categories.find(c => c.id === auto.categoryId)?.name || 'Unknown';
            return (
              <li key={auto.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg ${auto.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <div className="mb-3 sm:mb-0">
                  <div className="font-bold text-slate-900 truncate max-w-xs">{auto.feedUrl}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{catName}</span>
                    <span>•</span>
                    <span>Every {auto.intervalMinutes}m</span>
                    {auto.lastRunAt && (
                      <>
                        <span>•</span>
                        <span>Last run: {new Date(auto.lastRunAt).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAutomation(auto.id, auto.isActive)} className={`px-3 py-1 text-xs font-bold rounded ${auto.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    {auto.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => deleteAutomation(auto.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            );
          })}
          {automations.length === 0 && <p className="text-sm text-slate-500">No automations configured yet.</p>}
        </ul>
      </div>
    </div>
  );
};
