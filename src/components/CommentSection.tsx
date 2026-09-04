import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { X, Send, Loader2 } from 'lucide-react';

export default function CommentSection({ post, onClose }: { post: Post, onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 line-clamp-1">
            Discussion: {post.title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
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
        
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
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
  );
}
