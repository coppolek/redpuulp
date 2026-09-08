import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { X, Send, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function CommentSection({ post, onClose, onProfileClick }: { post: Post, onClose: () => void, onProfileClick?: (userId: string) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, userDoc } = useAuth();
  const canDelete = user && (user.uid === post.authorId || userDoc?.role === 'admin');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const q = query(
          collection(db, 'comments'),
          where('postId', '==', post.id),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        setComments(fetched);
      } catch (err) {
        console.error("Error fetching comments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: user.uid,
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      
      const optimisticComment: Comment = {
        id: docRef.id,
        postId: post.id,
        authorId: user.uid,
        text: newComment.trim(),
        createdAt: { toDate: () => new Date() } as any
      };
      
      setComments([optimisticComment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
        toast.success("Post deleted successfully");
        onClose();
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error("Failed to delete the post.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-full max-h-[95vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 line-clamp-1">
              Discussion
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button 
                onClick={handleDeletePost}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Content Preview (Left on Desktop, Top on Mobile) */}
          <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200 bg-white overflow-y-auto min-h-[300px] flex flex-col relative">
            {post.imageUrl && (
              <div className="w-full h-48 sm:h-72 bg-slate-100 shrink-0">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 md:p-8 flex flex-col flex-1 max-w-3xl mx-auto w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">
                {post.title}
              </h1>
              {post.isArticle && post.content ? (
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                  <Markdown>{post.content}</Markdown>
                </div>
              ) : post.description && (
                <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed">
                  {post.description}
                </p>
              )}
              {!post.isArticle && post.url && (
                <div className="mt-8 flex flex-col items-center">
                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-colors shadow-sm w-full sm:w-auto"
                  >
                    Read full article <ExternalLink className="w-5 h-5" />
                  </a>
                  <p className="text-xs text-slate-400 mt-3 font-medium">
                    Opens in a new tab
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Comments Section (Right on Desktop, Bottom on Mobile) */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <span className="font-bold text-slate-900">
                    User {comment.authorId.slice(0, 6)}
                  </span>
                  <span>•</span>
                  <span>
                    {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {comment.text}
                </p>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-white">
          {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="What are your thoughts?"
                disabled={submitting}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="inline-flex justify-center items-center px-4 py-2 shadow-sm text-sm font-bold rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <div className="text-center text-sm text-slate-500">
              Please sign in to participate in this discussion.
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
