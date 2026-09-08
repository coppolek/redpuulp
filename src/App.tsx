import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Post, Category, Banner } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';

import AddPost from './components/AddPost';
import PostCard from './components/PostCard';
import CommentSection from './components/CommentSection';
import { AdminPanel } from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import { Flame, Clock, TrendingUp, Loader2, Settings, Search } from 'lucide-react';

function AppContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'createdAt'>('score');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [currentView, setCurrentView] = useState<'feed' | 'admin' | 'profile'>('feed');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, userDoc, signIn, logOut } = useAuth();

  useEffect(() => {
    // Check initial URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const c = searchParams.get('c');
    const u = searchParams.get('u');
    if (c) setActiveCategory(c);
    if (u) {
      setViewedUserId(u);
      setCurrentView('profile');
    }

    // Listen to real-time posts
    const q = query(collection(db, 'posts'), orderBy(sortBy, 'desc'));
    const unsubscribePosts = onSnapshot(q, async (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(fetched);
      setLoading(false);
      
      // Auto-open post from URL if present
      const searchParams = new URLSearchParams(window.location.search);
      const p = searchParams.get('p');
      if (p) {
        const found = fetched.find(post => post.id === p);
        if (found) {
          setActivePost(found);
        } else {
          // If not in the current snapshot, try to fetch it directly
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const postDoc = await getDoc(doc(db, 'posts', p));
            if (postDoc.exists()) {
              setActivePost({ id: postDoc.id, ...postDoc.data() } as Post);
            }
          } catch (e) {
            console.error('Error fetching deep linked post', e);
          }
        }
      }
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    // Listen to categories
    const qCats = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    // Listen to active banners
    const qBanners = query(collection(db, 'banners'), where('isActive', '==', true));
    const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
      const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(fetchedBanners.sort((a, b) => a.order - b.order));
    });

    return () => {
      unsubscribePosts();
      unsubscribeCats();
      unsubscribeBanners();
    };
  }, [sortBy]);

  useEffect(() => {
    // Helper function to update meta tags dynamically
    const updateMetaTags = (post: Post | null) => {
      const titleTag = document.getElementById('meta-title');
      const descTag = document.getElementById('meta-description');
      const ogTitleTag = document.getElementById('og-title');
      const ogDescTag = document.getElementById('og-description');
      const ogImageTag = document.getElementById('og-image');
      const ogUrlTag = document.getElementById('og-url');

      if (post) {
        if (titleTag) titleTag.innerText = `${post.title} - Newswire`;
        if (descTag) descTag.setAttribute('content', post.description || 'Check out this post on Newswire');
        if (ogTitleTag) ogTitleTag.setAttribute('content', post.title);
        if (ogDescTag) ogDescTag.setAttribute('content', post.description || 'Check out this post on Newswire');
        if (ogImageTag) ogImageTag.setAttribute('content', post.imageUrl || '');
        if (ogUrlTag) ogUrlTag.setAttribute('content', window.location.href);
      } else {
        if (titleTag) titleTag.innerText = 'Newswire';
        if (descTag) descTag.setAttribute('content', 'A platform for sharing and discussing news links.');
        if (ogTitleTag) ogTitleTag.setAttribute('content', 'Newswire');
        if (ogDescTag) ogDescTag.setAttribute('content', 'A platform for sharing and discussing news links.');
        if (ogImageTag) ogImageTag.setAttribute('content', '');
        if (ogUrlTag) ogUrlTag.setAttribute('content', window.location.origin);
      }
    };

    updateMetaTags(activePost);
  }, [activePost]);

  const handleOpenComments = (p: Post) => {
    setActivePost(p);
    window.history.pushState({}, '', `?p=${p.id}`);
  };

  const handleCloseComments = () => {
    setActivePost(null);
    window.history.pushState({}, '', '/');
  };

  const handleViewProfile = (uid: string) => {
    setViewedUserId(uid);
    setCurrentView('profile');
    window.history.pushState({}, '', `?u=${uid}`);
  };

  const filteredPosts = posts.filter(post => {
    if (activeCategory && post.categoryId !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (post.title && post.title.toLowerCase().includes(lowerQuery)) ||
      (post.description && post.description.toLowerCase().includes(lowerQuery))
    );
  });

  const handleShareCategory = () => {
    if (!activeCategory) return;
    const url = new URL(window.location.href);
    url.search = `?c=${activeCategory}`;
    navigator.clipboard.writeText(url.toString());
    toast.success('Category link copied to clipboard!');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <nav className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 bg-white border-b border-slate-200 z-10 gap-4">
        <div className="flex items-center gap-8 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('feed')}>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-bold text-xl tracking-tight hidden lg:block">NEWSWIRE</span>
          </div>
          {currentView === 'feed' && (
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-500">
              <button onClick={() => setSortBy('createdAt')} className={sortBy === 'createdAt' ? 'text-orange-500' : 'hover:text-slate-800'}>Home</button>
              <button onClick={() => setSortBy('score')} className={sortBy === 'score' ? 'text-orange-500' : 'hover:text-slate-800'}>Popular</button>
              <button className="hover:text-slate-800">All</button>
            </div>
          )}
        </div>

        {currentView === 'feed' && (
          <div className="flex-1 max-w-2xl flex items-center gap-4">
            <div className="relative flex-1 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-slate-100 rounded-full pl-10 pr-4 text-sm border-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none text-slate-900 placeholder-slate-400"
              />
            </div>
            <div className="flex-1 md:max-w-[400px]">
              <AddPost onAdd={() => setSortBy('createdAt')} categories={categories} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 shrink-0">
          {userDoc?.role === 'admin' && (
            <button 
              onClick={() => setCurrentView(currentView === 'feed' ? 'admin' : 'feed')}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{currentView === 'feed' ? 'Admin' : 'Exit Admin'}</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 border border-slate-300 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-300 transition-colors"
                onClick={() => setCurrentView(currentView === 'profile' ? 'feed' : 'profile')}
                title="View Profile"
              >
                {user.email?.[0] || user.uid.slice(0, 2)}
              </div>
              <button onClick={logOut} className="text-xs text-slate-500 hover:text-slate-900 font-medium hidden sm:block">Sign out</button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full hover:bg-orange-600 transition-colors shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {currentView === 'admin' ? (
        <AdminPanel />
      ) : currentView === 'profile' ? (
        <UserProfile onOpenComments={handleOpenComments} categories={categories} userId={viewedUserId || undefined} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar */}
          <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-white p-6 flex-col gap-8 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feeds</span>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setSortBy('score'); setActiveCategory(null); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm w-full text-left transition-colors ${sortBy === 'score' && !activeCategory ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span>🔥</span> Popular</button>
                <button onClick={() => { setSortBy('createdAt'); setActiveCategory(null); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm w-full text-left transition-colors ${sortBy === 'createdAt' && !activeCategory ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span>🆕</span> Newest</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communities</span>
              <div className="flex flex-col gap-2">
                {categories.length > 0 ? categories.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center justify-between text-sm px-3 py-1.5 rounded cursor-pointer transition-colors ${activeCategory === cat.id ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{cat.name}</span>
                  </div>
                )) : (
                  <div className="text-xs text-slate-400 px-3">No communities found.</div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto bg-slate-50 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">
                  {activeCategory ? categories.find(c => c.id === activeCategory)?.name : 'Latest Imports'}
                </h2>
                {activeCategory && (
                  <button 
                    onClick={handleShareCategory}
                    className="text-xs text-orange-500 font-bold hover:underline"
                  >
                    Share
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1 border border-slate-200 rounded text-xs font-semibold ${viewMode === 'card' ? 'bg-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}
                >Card</button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 border border-slate-200 rounded text-xs font-semibold ${viewMode === 'list' ? 'bg-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}
                >List</button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-xl">
                {searchQuery.trim() ? "No links found matching your search." : activeCategory ? "No links in this category yet." : "No links have been imported yet."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-12">
                {filteredPosts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    categories={categories}
                    viewMode={viewMode}
                    onCommentClick={(p) => handleOpenComments(p)} 
                    onProfileClick={() => handleViewProfile(post.authorId)}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:flex w-80 shrink-0 p-6 flex-col gap-6 bg-slate-50 overflow-y-auto border-l border-slate-200">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trending Now</h4>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-800">#SpaceXLaunch</div>
                  <div className="text-[11px] text-slate-400">14.2k imports today</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">#AIFederalRules</div>
                  <div className="text-[11px] text-slate-400">8.5k imports today</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">#GreenEnergyTax</div>
                  <div className="text-[11px] text-slate-400">3.1k imports today</div>
                </div>
              </div>
            </div>
            
            {/* Dynamic Banners */}
            {banners.map(banner => (
              <div key={banner.id} className="w-full overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
                {banner.link ? (
                  <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block w-full">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title} className="w-full object-cover" />
                    ) : (
                      <div className="p-4 font-bold text-center text-slate-700">{banner.title}</div>
                    )}
                  </a>
                ) : banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="w-full object-cover" />
                ) : banner.code ? (
                  <div dangerouslySetInnerHTML={{ __html: banner.code }} className="w-full" />
                ) : (
                  <div className="p-4 text-sm text-center text-slate-500 border border-dashed border-slate-200">{banner.title}</div>
                )}
              </div>
            ))}

            {banners.length === 0 && (
              <div className="bg-indigo-600 rounded-xl p-5 text-white">
                <h4 className="font-bold mb-2">Go Pro</h4>
                <p className="text-xs text-indigo-100 mb-4">Enable auto-import for your favorite RSS feeds and unlock advanced analytics.</p>
                <button className="w-full py-2 bg-white text-indigo-600 text-xs font-bold rounded-lg shadow-lg hover:bg-slate-50 transition-colors">UPGRADE</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {activePost && (
        <CommentSection 
          post={activePost} 
          onClose={handleCloseComments} 
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" />
      <AppContent />
    </AuthProvider>
  );
}
