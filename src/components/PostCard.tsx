import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, collection, query, where, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post } from '../types';
import { ArrowBigUp, ArrowBigDown, ExternalLink, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export default function PostCard({ post, onCommentClick }: { post: Post, onCommentClick: (post: Post) => void }) {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [score, setScore] = useState(post.score);

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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center gap-1 w-12 bg-slate-50 rounded-lg py-2 shrink-0">
        <button 
          onClick={() => handleVote(1)}
          className={`hover:text-orange-500 transition-colors ${userVote === 1 ? 'text-orange-500' : 'text-slate-400'}`}
        >
          ▲
        </button>
        <span className="font-bold text-sm text-slate-900">
          {score}
        </span>
        <button 
          onClick={() => handleVote(-1)}
          className={`hover:text-indigo-500 transition-colors ${userVote === -1 ? 'text-indigo-500' : 'text-slate-400'}`}
        >
          ▼
        </button>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-1">
          {domainDisplay && (
            <a href={`https://${post.domain}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:underline">
              {domainDisplay}
            </a>
          )}
          <span>•</span>
          <span>Imported from {domainDisplay}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="block group mb-3">
              <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 group-hover:text-orange-500 transition-colors">
                {post.title}
              </h3>
              {post.description && (
                <p className="text-sm text-slate-500 line-clamp-2">
                  {post.description}
                </p>
              )}
            </a>
            
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
              <a 
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                <span>🔗</span> Source
              </a>
            </div>
          </div>
          
          {post.imageUrl && (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
