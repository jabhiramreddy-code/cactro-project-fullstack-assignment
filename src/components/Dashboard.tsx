'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Trash2, Edit2, MessageSquare, Sparkles, Save, X } from 'lucide-react';
import { fetcher } from '@/lib/api';

interface Note {
    _id: string;
    content: string;
    tags: string[];
    createdAt: string;
}

interface YoutubeComment {
    id: string;
    snippet: {
        topLevelComment: {
            id: string;
            snippet: {
                textDisplay: string;
                authorDisplayName: string;
                authorProfileImageUrl: string;
                publishedAt: string;
            };
        };
        totalReplyCount: number;
    };
    replies?: {
        comments: {
            id: string;
            snippet: {
                textDisplay: string;
                authorDisplayName: string;
                authorProfileImageUrl: string;
                publishedAt: string;
            };
        }[];
    };
}

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [videoId, setVideoId] = useState('');
    const [video, setVideo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Video Management State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isSavingVideo, setIsSavingVideo] = useState(false);

    // Notes State
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [searchNote, setSearchNote] = useState('');
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);

    // AI State
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Comments State
    const [comments, setComments] = useState<YoutubeComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [isLoadingComments, setIsLoadingComments] = useState(false);


    // --- Video Fetching ---
    async function fetchVideoDetails(inputIndex = videoId) {
        if (!inputIndex || !session?.accessToken) return;

        // Extract ID if URL is pasted
        let id = inputIndex;
        try {
            if (inputIndex.includes('youtube.com') || inputIndex.includes('youtu.be')) {
                const url = new URL(inputIndex.includes('://') ? inputIndex : `https://${inputIndex}`);
                if (url.hostname.includes('youtu.be')) {
                    id = url.pathname.slice(1);
                } else {
                    id = url.searchParams.get('v') || id;
                }
            }
        } catch (e) { /* ignore invalid URL parsing */ }

        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${id}`,
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            const data = await res.json();
            if (data.items?.length > 0) {
                setVideo(data.items[0]);
                setEditTitle(data.items[0].snippet.title);
                setEditDesc(data.items[0].snippet.description);
                // Load other data
                fetchNotes(id);
                fetchComments(id);
            } else {
                setError('Video not found.');
            }
        } catch (err) {
            setError('Failed to fetch video.');
        } finally {
            setIsLoading(false);
        }
    }

    // --- Video Management ---
    async function updateVideo() {
        if (!video || !session?.accessToken) return;
        setIsSavingVideo(true);
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: video.id,
                        snippet: {
                            categoryId: video.snippet.categoryId,
                            title: editTitle,
                            description: editDesc,
                        },
                    }),
                }
            );
            if (!res.ok) throw new Error('Failed to update');
            const updated = await res.json();
            setVideo({ ...video, snippet: updated.snippet });
            setIsEditing(false);
            toast.success('Video updated successfully!');
        } catch (e) {
            toast.error('Failed to update video. Ensure you have the right permissions.');
        } finally {
            setIsSavingVideo(false);
        }
    }

    // --- Notes ---
    async function fetchNotes(vidId: string) {
        try {
            const data = await fetcher<Note[]>(`/api/notes?videoId=${vidId}&search=${searchNote}`);
            setNotes(data);
        } catch (e) { console.error(e); }
    }

    // Search effect
    useEffect(() => {
        if (video) fetchNotes(video.id);
    }, [searchNote]);

    async function createNote() {
        if (!newNote.trim() || !video) return;
        try {
            await fetcher('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId: video.id, content: newNote })
            });
            setNewNote('');
            fetchNotes(video.id);
            toast.success('Note added!');
        } catch (e) { toast.error('Failed to save note'); }
    }

    async function deleteNote(id: string) {
        if (!confirm('Delete this note?')) return;
        try {
            await fetcher(`/api/notes/${id}`, { method: 'DELETE' });
            fetchNotes(video.id);
            toast.success('Note deleted');
        } catch (e) { toast.error('Failed to delete note'); }
    }

    // --- AI Suggestions ---
    async function generateTitles() {
        if (!video) return;
        setIsGeneratingAI(true);
        try {
            const data = await fetcher<{ suggestions: string[] }>('/api/ai/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: video.snippet.title, description: video.snippet.description })
            });
            setAiSuggestions(data.suggestions);
            toast.success('AI Suggestions generated!');
        } catch (e) { toast.error('AI Request Failed'); }
        finally { setIsGeneratingAI(false); }
    }

    const [commentsDisabled, setCommentsDisabled] = useState(false);

    // --- Comments ---
    async function fetchComments(vidId: string) {
        if (!session?.accessToken) return;
        setIsLoadingComments(true);
        setCommentsDisabled(false);
        try {
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${vidId}&maxResults=20`,
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            const data = await res.json();

            if (data.error?.errors?.[0]?.reason === 'commentsDisabled') {
                setCommentsDisabled(true);
                setComments([]);
                return;
            }

            setComments(data.items || []);
        } catch (e) { console.error('Comments error', e); }
        finally { setIsLoadingComments(false); }
    }

    async function postComment() {
        if (!newComment.trim() || !video || !session?.accessToken) return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticComment: YoutubeComment = {
            id: tempId,
            snippet: {
                topLevelComment: {
                    id: tempId,
                    snippet: {
                        textDisplay: newComment,
                        authorDisplayName: session.user?.name || 'You',
                        authorProfileImageUrl: session.user?.image || '',
                        publishedAt: new Date().toISOString()
                    }
                },
                totalReplyCount: 0
            }
        };
        setComments([optimisticComment, ...comments]);
        setNewComment('');

        try {
            await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        snippet: {
                            videoId: video.id,
                            topLevelComment: { snippet: { textOriginal: newComment } }
                        }
                    })
                }
            );
            // Re-fetch to normalize ID and data. YouTube API is slow (eventual consistency), so we wait longer.
            setTimeout(() => fetchComments(video.id), 10000);
            toast.success('Comment posted!');
        } catch (e) {
            toast.error('Failed to post comment');
            setComments(current => current.filter(c => c.id !== tempId)); // Rollback
        }
    }

    async function replyToComment(parentId: string) {
        const text = replyText[parentId];
        if (!text?.trim() || !session?.accessToken) return;

        // Optimistic Reply
        const tempId = Date.now().toString();
        const optimisticReply = {
            id: tempId,
            snippet: {
                textDisplay: text,
                authorDisplayName: session.user?.name || 'You',
                authorProfileImageUrl: session.user?.image || '',
                publishedAt: new Date().toISOString()
            }
        };

        const updatedComments = comments.map(c => {
            if (c.id === parentId) {
                return {
                    ...c,
                    replies: {
                        comments: [...(c.replies?.comments || []), optimisticReply]
                    }
                };
            }
            return c;
        });
        setComments(updatedComments);
        setReplyText({ ...replyText, [parentId]: '' });
        setActiveReplyId(null);

        try {
            await fetch(
                `https://www.googleapis.com/youtube/v3/comments?part=snippet`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        snippet: {
                            parentId: parentId,
                            textOriginal: text
                        }
                    })
                }
            );
            setTimeout(() => fetchComments(video.id), 10000);
            toast.success('Reply posted!');
        } catch (e) {
            toast.error('Failed to reply');
            fetchComments(video.id); // Revert/Reload
        }
    }

    // --- My Videos & History ---
    const [myVideos, setMyVideos] = useState<any[]>([]);
    const [historyVideos, setHistoryVideos] = useState<any[]>([]);

    async function fetchMyVideos() {
        if (!session?.accessToken) return;
        try {
            // 1. Fetch Uploads (Search method for simplicity)
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=10&order=date`,
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            const data = await res.json();
            setMyVideos(data.items || []);

            // 2. Fetch History (Videos with Notes)
            const notesRes = await fetcher<Note[]>('/api/notes?limit=10'); // Need to update API to support distinct videos or just map client side
            // For now, let's just stick to "My Videos" and maybe generic "Recent" from local storage if needed.
            // Actually, let's use the Notes API to find unique Video IDs the user has worked on.
            // Simplified: Just showing 'My Videos' covers the user's need to "select from them".
        } catch (e) { console.error('Fetch videos error', e); }
    }

    useEffect(() => {
        if (session) fetchMyVideos();
    }, [session]);


    async function deleteComment(commentId: string) {
        if (!confirm('Delete this comment?') || !session?.accessToken) return;

        // Optimistic Delete (Top Level)
        const previousComments = [...comments];
        setComments(current => current.map(c => {
            // Check if it's a top level delete
            if (c.snippet.topLevelComment.id === commentId) return null;

            // Check if it's a replay delete
            if (c.replies?.comments) {
                return {
                    ...c,
                    replies: {
                        comments: c.replies.comments.filter(r => r.id !== commentId)
                    }
                };
            }
            return c;
        }).filter(Boolean) as any[]);

        try {
            await fetch(
                `https://www.googleapis.com/youtube/v3/comments?id=${commentId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${session.accessToken}` }
                }
            );
            // Sync with YouTube after delay
            setTimeout(() => fetchComments(video.id), 10000);
            toast.success('Comment deleted');
        } catch (e) {
            toast.error('Failed to delete comment');
            setComments(previousComments); // Rollback
        }
    }


    if (status === 'loading') return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-4xl font-bold mb-8">YouTube Companion</h1>
                <Button onClick={() => signIn('google')}>Sign in with Google</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {session.user?.name}</p>
                </div>
                <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
            </div>

            {/* Video Selector */}
            {/* Video Selector & My Videos */}
            {!video && (
                <div className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Load Video</CardTitle></CardHeader>
                        <CardContent className="flex gap-4">
                            <Input
                                placeholder="Enter YouTube Video ID or URL"
                                value={videoId}
                                onChange={(e) => setVideoId(e.target.value)}
                            />
                            <Button onClick={() => fetchVideoDetails()} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Load
                            </Button>
                        </CardContent>
                        {error && <div className="text-red-500 px-6 pb-4">{error}</div>}
                    </Card>

                    {/* My Videos Grid */}
                    {myVideos.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold mb-4">My Recent Uploads</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myVideos.map(item => (
                                    <Card key={item.id.videoId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => fetchVideoDetails(item.id.videoId)}>
                                        <CardContent className="p-4 flex gap-4">
                                            <img
                                                src={item.snippet.thumbnails.default.url}
                                                alt="Thumb"
                                                className="w-24 h-18 object-cover rounded"
                                            />
                                            <div className="overflow-hidden">
                                                <h3 className="font-semibold truncate">{item.snippet.title}</h3>
                                                <p className="text-xs text-gray-500">{new Date(item.snippet.publishedAt).toLocaleDateString()}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            {video && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar / Main Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-start gap-6 p-6 border rounded-xl bg-card text-card-foreground shadow-sm">
                            <img
                                src={video.snippet.thumbnails.medium.url}
                                alt="Thumbnail"
                                className="rounded-lg w-48 object-cover shadow-sm"
                            />
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-2xl font-bold leading-tight">{video.snippet.title}</h2>
                                    <Button variant="ghost" size="icon" onClick={() => setVideo(null)}><X className="w-5 h-5" /></Button>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-500">
                                    <span>{Number(video.statistics.viewCount).toLocaleString()} views</span>
                                    <span>{Number(video.statistics.likeCount).toLocaleString()} likes</span>
                                    <span>{Number(video.statistics.commentCount).toLocaleString()} comments</span>
                                </div>
                                <p className="text-gray-600 line-clamp-2">{video.snippet.description}</p>
                            </div>
                        </div>

                        <Tabs defaultValue="manage" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="manage">Manage Video</TabsTrigger>
                                <TabsTrigger value="ai">AI Tools</TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                                <TabsTrigger value="comments">Comments</TabsTrigger>
                            </TabsList>

                            {/* --- MANAGE TAB --- */}
                            <TabsContent value="manage">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Edit Video Details</CardTitle>
                                        <CardDescription>Update your video title and description directly.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Video Title</Label>
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                className="h-40"
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="justify-end gap-2">
                                        {!isEditing ? (
                                            <Button onClick={() => setIsEditing(true)}>
                                                <Edit2 className="w-4 h-4 mr-2" /> Edit Mode
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                                <Button onClick={updateVideo} disabled={isSavingVideo}>
                                                    {isSavingVideo && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                                                    Save Changes
                                                </Button>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            </TabsContent>

                            {/* --- AI TAB --- */}
                            <TabsContent value="ai">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Sparkles className="text-purple-500" /> AI Optimization
                                        </CardTitle>
                                        <CardDescription>Get AI-powered suggestions to improve your video performance.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <Button
                                            onClick={generateTitles}
                                            className="w-full bg-purple-600 hover:bg-purple-700"
                                            disabled={isGeneratingAI}
                                        >
                                            {isGeneratingAI ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 w-4 h-4" />}
                                            Generate 3 Optimized Titles
                                        </Button>

                                        <div className="space-y-4">
                                            {aiSuggestions.map((suggestion, i) => (
                                                <div key={i} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center group">
                                                    <span className="font-medium text-lg">{suggestion}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => {
                                                            setEditTitle(suggestion);
                                                            toast.success('Copied to "Manage Video" tab!');
                                                        }}
                                                    >
                                                        Use
                                                    </Button>
                                                </div>
                                            ))}
                                            {aiSuggestions.length === 0 && !isGeneratingAI && (
                                                <div className="text-center text-gray-400 py-8">Click generate to see magic happen.</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- NOTES TAB --- */}
                            <TabsContent value="notes">
                                <Card>
                                    <CardHeader><CardTitle>Research & Notes</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                                <Input
                                                    placeholder="Search notes..."
                                                    className="pl-9"
                                                    value={searchNote}
                                                    onChange={(e) => setSearchNote(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                                            {notes.map(note => (
                                                <div key={note._id} className="p-4 flex justify-between group hover:bg-gray-50">
                                                    <p>{note.content}</p>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-red-500" onClick={() => deleteNote(note._id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {notes.length === 0 && <div className="p-4 text-center text-gray-400">No notes found.</div>}
                                        </div>
                                        <div className="flex gap-2 pt-4">
                                            <Input
                                                placeholder="Add a new note..."
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && createNote()}
                                            />
                                            <Button onClick={createNote}>Add Note</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- COMMENTS TAB --- */}
                            <TabsContent value="comments">
                                <Card>
                                    <CardHeader><CardTitle>Comments Manager</CardTitle></CardHeader>
                                    <CardContent>
                                        {commentsDisabled ? (
                                            <div className="text-center p-8 text-gray-500 space-y-4">
                                                <p>Comments are disabled for this video.</p>
                                                <Button variant="outline" onClick={() => window.open(`https://studio.youtube.com/video/${video.id}/edit`, '_blank')}>
                                                    Enable in YouTube Studio
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-6 flex gap-2">
                                                    <Input
                                                        placeholder="Write a public comment..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                    />
                                                    <Button onClick={postComment}><MessageSquare className="w-4 h-4 mr-2" /> Post</Button>
                                                </div>

                                                <div className="space-y-6">
                                                    {isLoadingComments ? <div className="text-center p-4">Loading comments...</div> : null}
                                                    {comments.map(thread => (
                                                        <div key={thread.id} className="flex gap-4 p-4 border rounded-lg bg-gray-50/50">
                                                            <img
                                                                src={thread.snippet.topLevelComment.snippet.authorProfileImageUrl}
                                                                className="w-10 h-10 rounded-full"
                                                                alt="Avatar"
                                                            />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex justify-between">
                                                                    <span className="font-bold text-sm">
                                                                        {thread.snippet.topLevelComment.snippet.authorDisplayName}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        {new Date(thread.snippet.topLevelComment.snippet.publishedAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm">{thread.snippet.topLevelComment.snippet.textDisplay}</p>

                                                                <div className="flex gap-2 mt-2">
                                                                    <Button
                                                                        variant="ghost" size="sm"
                                                                        className="h-8 text-xs text-blue-600"
                                                                        onClick={() => setActiveReplyId(activeReplyId === thread.id ? null : thread.id)}
                                                                    >
                                                                        Reply
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost" size="sm"
                                                                        className="h-8 text-xs text-red-500 hover:text-red-700"
                                                                        onClick={() => deleteComment(thread.snippet.topLevelComment.id)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>

                                                                {/* Replies List */}
                                                                {thread.replies?.comments && (
                                                                    <div className="ml-4 mt-2 space-y-3 pl-4 border-l-2">
                                                                        {thread.replies.comments.map(reply => (
                                                                            <div key={reply.id} className="flex flex-col gap-1 bg-white p-2 rounded">
                                                                                <div className="flex gap-2">
                                                                                    <img src={reply.snippet.authorProfileImageUrl} className="w-6 h-6 rounded-full" />
                                                                                    <div>
                                                                                        <div className="text-xs font-bold">{reply.snippet.authorDisplayName}</div>
                                                                                        <div className="text-xs">{reply.snippet.textDisplay}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-2 pl-8">
                                                                                    <Button
                                                                                        variant="ghost" size="sm"
                                                                                        className="h-6 text-[10px] text-blue-600 px-1"
                                                                                        onClick={() => {
                                                                                            setActiveReplyId(thread.id);
                                                                                            setReplyText(prev => ({ ...prev, [thread.id]: `@${reply.snippet.authorDisplayName} ` }));
                                                                                        }}
                                                                                    >
                                                                                        Reply
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost" size="sm"
                                                                                        className="h-6 text-[10px] text-red-500 hover:text-red-700 px-1"
                                                                                        onClick={() => deleteComment(reply.id)}
                                                                                    >
                                                                                        Delete
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Reply Box */}
                                                                {activeReplyId === thread.id && (
                                                                    <div className="flex gap-2 mt-3 pl-4 border-l-2">
                                                                        <Input
                                                                            placeholder={`Reply to ${thread.snippet.topLevelComment.snippet.authorDisplayName}...`}
                                                                            size={30}
                                                                            className="h-8 text-sm"
                                                                            value={replyText[thread.id] || ''}
                                                                            onChange={(e) => setReplyText({ ...replyText, [thread.id]: e.target.value })}
                                                                        />
                                                                        <Button size="sm" className="h-8" onClick={() => replyToComment(thread.id)}>Send</Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            )}
        </div>
    );
}
