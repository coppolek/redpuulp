import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserDoc, Category, Banner } from '../types';
import { Save, Trash2, Plus, Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'banners'>('categories');
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
          {(['categories', 'banners', 'users'] as const).map((tab) => (
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
