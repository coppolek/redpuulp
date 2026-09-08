import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Post, UserDoc } from '../types';
import PostCard from './PostCard';
import { Loader2, Calendar, TrendingUp, FileText, Share2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Category } from '../types';
import toast from 'react-hot-toast';

export default function UserProfile({ onOpenComments, categories = [], userId }: { onOpenComments: (post: Post) => void, categories?: Category[], userId?: string }) {
  const { user: currentUser, userDoc: currentUserDoc } = useAuth();
  
  const [profileUser, setProfileUser] = useState<{ uid: string, email: string } | null>(null);
  const [profileUserDoc, setProfileUserDoc] = useState<UserDoc | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      
      let targetUid = userId;
      let targetEmail = 'Hidden';
      
      // If no userId provided, default to current logged-in user
      if (!targetUid && currentUser) {
        targetUid = currentUser.uid;
        targetEmail = currentUser.email || 'Hidden';
        setProfileUser({ uid: targetUid, email: targetEmail });
        setProfileUserDoc(currentUserDoc);
      } else if (targetUid) {
        // Fetch specific user
        if (currentUser && targetUid === currentUser.uid) {
          setProfileUser({ uid: currentUser.uid, email: currentUser.email || 'Hidden' });
          setProfileUserDoc(currentUserDoc);
        } else {
          try {
            const docRef = doc(db, 'users', targetUid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as UserDoc;
              setProfileUserDoc(data);
              setProfileUser({ uid: targetUid, email: data.email || 'Hidden' });
            }
          } catch (e) {
            console.error("Error fetching user", e);
          }
        }
      }

      if (!targetUid) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', targetUid)
        );
        const snapshot = await getDocs(q);
        const fetchedPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
        
        fetchedPosts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        
        setPosts(fetchedPosts);
        
        const totalRep = fetchedPosts.reduce((sum, post) => sum + (post.score || 0), 0);
        setReputation(totalRep);
      } catch (err) {
        console.error("Error fetching user posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser, currentUserDoc]);

  const handleShare = () => {
    if (!profileUser) return;
    const url = new URL(window.location.href);
    url.search = `?u=${profileUser.uid}`;
    navigator.clipboard.writeText(url.toString());
    toast.success('Profile link copied to clipboard!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profileUser || !profileUserDoc) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-slate-500">
        User not found.
      </div>
    );
  }

  const joinDate = profileUserDoc.createdAt?.toDate ? format(profileUserDoc.createdAt.toDate(), 'MMMM yyyy') : 'Unknown';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 relative">
          <button 
            onClick={handleShare}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-orange-500 flex items-center gap-2"
            title="Share Profile"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
          </button>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-3xl font-bold uppercase shrink-0 border-4 border-white shadow-md">
              {profileUser.email?.[0] || profileUser.uid.slice(0, 2)}
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  User {profileUser.uid.slice(0, 8)}
                </h1>
                <p className="text-slate-500">{profileUser.email}</p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Joined</div>
                    <div className="font-semibold">{joinDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reputation</div>
                    <div className="font-semibold">{reputation}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Posts</div>
                    <div className="font-semibold">{posts.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Posts */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {profileUser.uid === currentUser?.uid ? 'Your Submissions' : 'Submissions'}
          </h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
              No posts submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-12">
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  categories={categories}
                  onCommentClick={onOpenComments} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
