import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, collection, query, where, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post } from '../types';
import { ArrowBigUp, ArrowBigDown, ExternalLink, MessageSquare, PenSquare, Trash2, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

export default function PostCard({ post, onCommentClick, onProfileClick, categories = [] }: { post: Post, onCommentClick: (post: Post) => void, onProfileClick?: () => void, categories?: { id: string, name: string }[] }) {
  const { user, userDoc } = useAuth();
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [score, setScore] = useState(post.score);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');
  const [editImageUrl, setEditImageUrl] = useState(post.imageUrl || '');
  const [editCategory, setEditCategory] = useState(post.categoryId || '');
  const [isSaving, setIsSaving] = useState(false);

  const category = categories.find(c => c.id === post.categoryId);

  const canEdit = user && (user.uid === post.authorId || userDoc?.role === 'admin') && post.isArticle;
  const canDelete = user && (user.uid === post.authorId || userDoc?.role === 'admin');

  useEffect(() => {
    if (!user) return;
    
    // Check if user has already voted
    const fetchVote = async () => {
      const voteId = `${user.uid}_${post.id}`;
      const voteDoc = await getDoc(doc(db, 'votes', voteId));
      if (voteDoc.exists()) {
        setUserVote(voteDoc.data().vote as 1 | -1);
      }
    };
    
    fetchVote();
  }, [user, post.id]);

  const handleVote = async (voteValue: 1 | -1) => {
    if (!user) return;
    
    const voteId = `${user.uid}_${post.id}`;
    const voteRef = doc(db, 'votes', voteId);
    const postRef = doc(db, 'posts', post.id);

    // If user clicks the same vote again, remove it
    if (userVote === voteValue) {
      await deleteDoc(voteRef);
      await updateDoc(postRef, {
        [voteValue === 1 ? 'upvotes' : 'downvotes']: increment(-1),
        score: increment(-voteValue)
      });
      setUserVote(0);
      setScore(s => s - voteValue);
    } 
    // If user changes vote (e.g. from up to down)
    else if (userVote !== 0) {
      await setDoc(voteRef, { userId: user.uid, postId: post.id, vote: voteValue });
      
      const upvoteChange = voteValue === 1 ? 1 : -1;
      const downvoteChange = voteValue === -1 ? 1 : -1;
      
      await updateDoc(postRef, {
        upvotes: increment(upvoteChange),
        downvotes: increment(downvoteChange),
        score: increment(voteValue * 2) // +2 or -2
      });
      setUserVote(voteValue);
      setScore(s => s + (voteValue * 2));
    }
    // New vote
    else {
      await setDoc(voteRef, { userId: user.uid, postId: post.id, vote: voteValue });
      await updateDoc(postRef, {
        [voteValue === 1 ? 'upvotes' : 'downvotes']: increment(1),
        score: increment(voteValue)
      });
      setUserVote(voteValue);
      setScore(s => s + voteValue);
    }
  };

  const domainDisplay = post.siteName || post.domain;
  
  // Format relative time safely
  let timeAgo = '';
  try {
    if (post.createdAt?.toDate) {
      timeAgo = formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true });
    }
  } catch (e) {
    timeAgo = 'just now';
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?p=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description || 'Check out this post on LinkFeed',
          url: shareUrl,
        });
      } catch (err) {
        console.log('User cancelled share or error:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete the post.");
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle || !editContent || !editCategory) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        title: editTitle,
        content: editContent,
        description: editContent.substring(0, 150) + (editContent.length > 150 ? '...' : ''),
        imageUrl: editImageUrl,
        categoryId: editCategory
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving article:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col items-center gap-1 w-12 bg-slate-50 rounded-lg py-2 shrink-0">
          <motion.button 
            whileTap={{ scale: 0.7 }}
            animate={userVote === 1 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleVote(1)}
            className={`hover:text-orange-500 transition-colors ${userVote === 1 ? 'text-orange-500' : 'text-slate-400'}`}
          >
            ▲
          </motion.button>
          <span className="font-bold text-sm text-slate-900">
            {score}
          </span>
          <motion.button 
            whileTap={{ scale: 0.7 }}
            animate={userVote === -1 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleVote(-1)}
            className={`hover:text-indigo-500 transition-colors ${userVote === -1 ? 'text-indigo-500' : 'text-slate-400'}`}
          >
            ▼
          </motion.button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-1">
            {category && (
              <span className="font-bold text-orange-500 uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded">
                {category.name}
              </span>
            )}
            {post.isArticle ? (
              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                Article
              </span>
            ) : domainDisplay ? (
              <a href={`https://${post.domain}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:underline">
                {domainDisplay}
              </a>
            ) : null}
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
              className="hover:text-slate-700 hover:underline transition-colors"
            >
              by User {post.authorId.slice(0, 8)}
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div onClick={() => onCommentClick(post)} className="block group mb-3 cursor-pointer">
                <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 group-hover:text-orange-500 transition-colors">
                  {post.title}
                </h3>
                {post.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {post.description}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4">
                <button 
                  onClick={() => onCommentClick(post)}
                  className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  <span>💬</span> Discuss
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  <span>🚀</span> Share
                </button>
                {!post.isArticle && post.url && (
                  <a 
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    <span>🔗</span> Source
                  </a>
                )}
                {canEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-blue-600 transition-colors"
                  >
                    <PenSquare className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canDelete && (
                  <button 
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
            
            {post.imageUrl && (
              <div onClick={() => onCommentClick(post)} className="shrink-0 cursor-pointer">
                <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Edit Article</h2>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={e => setEditImageUrl(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                  <select
                    required
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
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
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full flex-1 border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 resize-none font-sans"
                  />
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editTitle || !editContent || !editCategory}
                  className="px-6 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
