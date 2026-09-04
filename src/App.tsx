import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Post, Category, Banner } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AddPost from './components/AddPost';
import PostCard from './components/PostCard';
import CommentSection from './components/CommentSection';
import { AdminPanel } from './components/AdminPanel';
import { Flame, Clock, TrendingUp, Loader2, Settings } from 'lucide-react';

function AppContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'createdAt'>('score');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [currentView, setCurrentView] = useState<'feed' | 'admin'>('feed');
  const { user, userDoc, signIn, logOut } = useAuth();

  useEffect(() => {
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

  const handleOpenComments = (p: Post) => {
    setActivePost(p);
    window.history.pushState({}, '', `?p=${p.id}`);
  };

  const handleCloseComments = () => {
    setActivePost(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <nav className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('feed')}>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">NEWSWIRE</span>
          </div>
          {currentView === 'feed' && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
              <button onClick={() => setSortBy('createdAt')} className={sortBy === 'createdAt' ? 'text-orange-500' : 'hover:text-slate-800'}>Home</button>
              <button onClick={() => setSortBy('score')} className={sortBy === 'score' ? 'text-orange-500' : 'hover:text-slate-800'}>Popular</button>
              <button className="hover:text-slate-800">All</button>
            </div>
          )}
        </div>

        {currentView === 'feed' && (
          <div className="flex-1 max-w-xl mx-4 md:mx-12 flex items-center">
            <AddPost onAdd={() => setSortBy('createdAt')} />
          </div>
        )}

        <div className="flex items-center gap-4">
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
            <div 
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 border border-slate-300 text-xs font-bold text-slate-600 uppercase cursor-pointer hover:bg-slate-300 transition-colors"
              onClick={logOut}
              title="Sign Out"
            >
              {user.email?.[0] || user.uid.slice(0, 2)}
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
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar */}
          <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-white p-6 flex-col gap-8 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feeds</span>
              <div className="flex flex-col gap-1">
                <button onClick={() => setSortBy('score')} className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm w-full text-left transition-colors ${sortBy === 'score' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span>🔥</span> Popular</button>
                <button className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm w-full text-left transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900`}><span>📈</span> Trending</button>
                <button onClick={() => setSortBy('createdAt')} className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm w-full text-left transition-colors ${sortBy === 'createdAt' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span>🆕</span> Newest</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communities</span>
              <div className="flex flex-col gap-2">
                {categories.length > 0 ? categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between text-sm text-slate-600 px-3 py-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
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
              <h2 className="text-lg font-bold">Latest Imports</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold shadow-sm">Card</button>
                <button className="px-3 py-1 bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-600">List</button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-xl">
                No links have been imported yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-12">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onCommentClick={(p) => handleOpenComments(p)} 
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
      <AppContent />
    </AuthProvider>
  );
}
