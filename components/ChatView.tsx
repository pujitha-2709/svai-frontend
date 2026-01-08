import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ExchangeRequest } from '../types';
import { dbService } from '../services/dbService';
import { Send, Search, MessageSquare, Lock, UserPlus, Video, ExternalLink, CheckCircle2, X, Star } from 'lucide-react';

interface ChatViewProps {
  currentUser: User;
  initialChatUserId?: string; // Optional: ID of user to start/open chat with
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, initialChatUserId }) => {
  const [conversations, setConversations] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundFriends, setFoundFriends] = useState<User[]>([]);
  const [exchangeRequest, setExchangeRequest] = useState<ExchangeRequest | null>(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackStars, setFeedbackStars] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations and optionally set initial active user
  useEffect(() => {
    const loadData = async () => {
      let convs = await dbService.getConversations(currentUser.id);
      
      // If we are starting a chat with someone new who isn't in conversations list yet
      if (initialChatUserId) {
         const target = await dbService.getUserById(initialChatUserId);
         if (target) {
            // Check if already in list
            if (!convs.find(u => u.id === target.id)) {
                convs = [target, ...convs];
            }
            setActiveUser(target);
         }
      }
      setConversations(convs);
    };
    loadData();
  }, [currentUser.id, initialChatUserId]);

  // Load messages when active user changes via Real-time Listener
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (activeUser) {
      // Mark as read immediately on open
      dbService.markAsRead(currentUser.id, activeUser.id);
      
      unsubscribe = dbService.subscribeToConversation(currentUser.id, activeUser.id, (msgs) => {
          setMessages(msgs);
          // Mark new incoming messages as read if chat is open
          dbService.markAsRead(currentUser.id, activeUser.id);
          scrollToBottom();
      });
    } else {
        setMessages([]);
    }

    return () => unsubscribe();
  }, [activeUser, currentUser.id]);

  useEffect(() => {
    const loadExchange = async () => {
      if (!activeUser) {
        setExchangeRequest(null);
        return;
      }

      setExchangeLoading(true);
      try {
        const requests = await dbService.getRequestsForUser(currentUser.id);
        const relevant = requests
          .filter((r) =>
            (r.fromUserId === currentUser.id && r.toUserId === activeUser.id) ||
            (r.fromUserId === activeUser.id && r.toUserId === currentUser.id)
          )
          .sort((a, b) => b.createdAt - a.createdAt);
        setExchangeRequest(relevant[0] || null);
      } finally {
        setExchangeLoading(false);
      }
    };

    loadExchange();
  }, [activeUser, currentUser.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    // Send async
    const tempContent = newMessage;
    setNewMessage(''); // Clear immediately for UX
    
    await dbService.sendMessage(currentUser.id, activeUser.id, tempContent);
    scrollToBottom();
    
    // If this was the first message, refresh conversations list
    if (messages.length === 0) {
        const convs = await dbService.getConversations(currentUser.id);
        setConversations(convs);
    }
  };

  const handleStartNewChat = (user: User) => {
      // Add to conversations locally if not present
      if (!conversations.find(u => u.id === user.id)) {
          setConversations([user, ...conversations]);
      }
      setActiveUser(user);
      setSearchQuery(''); 
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openDiscordCall = () => {
    if (!activeUser) return;
    if (!activeUser.discordLink) {
      alert(`${activeUser.name.split(' ')[0]} has not added a Discord link yet.`);
      return;
    }

    const raw = activeUser.discordLink.trim();
    if (raw.startsWith('discord://')) {
      window.location.href = raw;
      return;
    }

    const inviteMatch = raw.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([A-Za-z0-9-]+)/i);
    const deepLink = inviteMatch ? `discord://discord.com/invite/${inviteMatch[1]}` : null;

    if (deepLink) {
      window.location.href = deepLink;
      window.setTimeout(() => {
        window.open(raw, '_blank', 'noreferrer');
      }, 900);
      return;
    }

    window.open(raw, '_blank', 'noreferrer');
  };

  const shareMyDiscordLink = async () => {
    if (!activeUser) return;
    if (!currentUser.discordLink) {
      alert('Please add your Discord link in Profile first.');
      return;
    }
    await dbService.sendMessage(currentUser.id, activeUser.id, `Discord link: ${currentUser.discordLink}`);
  };

  const handleUpdateExchangeStatus = async (status: ExchangeRequest['status']) => {
    if (!exchangeRequest || !activeUser) return;
    const result = await dbService.updateExchangeRequestStatus(exchangeRequest.id, status);
    setExchangeRequest({
      ...exchangeRequest,
      status: result.status,
      completedAt: result.completedAt,
    });

    if (status === 'accepted') {
      await dbService.sendMessage(currentUser.id, activeUser.id, 'I accepted the skill exchange. Let\'s schedule a session!');
    }
    if (status === 'rejected') {
      await dbService.sendMessage(currentUser.id, activeUser.id, 'I cannot do this exchange right now. Maybe another time.');
    }
  };

  const submitFeedbackAndComplete = async () => {
    if (!activeUser || !exchangeRequest) return;
    setSubmittingFeedback(true);
    try {
      if (exchangeRequest.status !== 'completed') {
        const result = await dbService.updateExchangeRequestStatus(exchangeRequest.id, 'completed');
        setExchangeRequest({
          ...exchangeRequest,
          status: result.status,
          completedAt: result.completedAt,
        });
      }

      await dbService.submitExchangeFeedback({
        requestId: exchangeRequest.id,
        fromUserId: currentUser.id,
        toUserId: activeUser.id,
        stars: feedbackStars,
        comment: feedbackComment.trim() ? feedbackComment.trim() : undefined,
      });

      await dbService.sendMessage(currentUser.id, activeUser.id, `Feedback submitted: ${feedbackStars}/5 ⭐`);
      setShowFeedbackModal(false);
      setFeedbackStars(5);
      setFeedbackComment('');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Filter Logic
  const filteredConversations = conversations.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Search "Friends" - needs to be async now
  useEffect(() => {
    const searchGlobalUsers = async () => {
        if (searchQuery.trim().length > 0) {
            const allUsers = await dbService.getUsers();
            const friends = allUsers.filter(u => 
                u.id !== currentUser.id && 
                !conversations.some(c => c.id === u.id) && 
                u.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFoundFriends(friends);
        } else {
            setFoundFriends([]);
        }
    };
    // Debounce this slightly in production, direct call for now
    searchGlobalUsers();
  }, [searchQuery, currentUser.id, conversations]);


  return (
    <>
    {showFeedbackModal && activeUser && exchangeRequest && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Finish Skill Trade</h3>
            <button
              onClick={() => (submittingFeedback ? null : setShowFeedbackModal(false))}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
              disabled={submittingFeedback}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Rate your experience with {activeUser.name}.</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`p-2 rounded-lg border transition ${
                      feedbackStars >= v
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    onClick={() => setFeedbackStars(v)}
                    disabled={submittingFeedback}
                    title={`${v} star${v === 1 ? '' : 's'}`}
                  >
                    <Star className="w-5 h-5" />
                  </button>
                ))}
                <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">{feedbackStars}/5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Comment (optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 h-28 resize-none"
                placeholder="Share quick feedback..."
                disabled={submittingFeedback}
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowFeedbackModal(false)}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              disabled={submittingFeedback}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitFeedbackAndComplete}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition disabled:opacity-50"
              disabled={submittingFeedback}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="h-[calc(100vh-8rem)] flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col ${activeUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search chats or friends..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {/* 1. Existing Conversations */}
            {filteredConversations.length > 0 && (
                filteredConversations.map(u => {
                    // Note: Unread count here isn't live for *all* chats to save reads, just visual placeholder or need logic upgrade
                    // For now, we omit the unread badge on the list unless we subscribe to ALL conversations (expensive).
                    
                    return (
                    <button
                        key={u.id}
                        onClick={() => setActiveUser(u)}
                        className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition border-b border-slate-200 dark:border-slate-800/50 ${
                            activeUser?.id === u.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''
                        }`}
                    >
                        <div className="relative">
                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                            {/* Simple Online indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <div className="flex justify-between items-center">
                                <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{u.name}</h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Click to view chat</p>
                        </div>
                    </button>
                    );
                })
            )}

            {/* 2. Global Search Results (Friends) */}
            {searchQuery.trim().length > 0 && foundFriends.length > 0 && (
                <>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/80 text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider sticky top-0">
                        Start New Chat
                    </div>
                    {foundFriends.map(u => (
                        <button
                            key={u.id}
                            onClick={() => handleStartNewChat(u)}
                            className="w-full p-4 flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition border-b border-slate-200 dark:border-slate-800/50 group"
                        >
                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 opacity-70 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 text-left min-w-0">
                                <h3 className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">{u.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.bio || 'No bio'}</p>
                            </div>
                            <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </>
            )}

            {/* Empty States */}
            {searchQuery.trim().length > 0 && filteredConversations.length === 0 && foundFriends.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm">No users found.</p>
                </div>
            )}

            {searchQuery.trim().length === 0 && conversations.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet.</p>
                    <p className="text-xs mt-1">Find a peer or search above to chat!</p>
                </div>
            )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-950 ${!activeUser ? 'hidden md:flex' : 'flex'}`}>
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <button onClick={() => setActiveUser(null)} className="md:hidden text-slate-500 dark:text-slate-400 mr-2">
                    ←
                </button>
                <img src={activeUser.avatar} alt={activeUser.name} className="w-10 h-10 rounded-full" />
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{activeUser.name}</h3>
                    <p className="text-xs text-green-400 flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                        Online
                    </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={openDiscordCall}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition"
                  title="Open Discord"
                  type="button"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={shareMyDiscordLink}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition"
                  title="Share my Discord link"
                  type="button"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <div className="hidden sm:flex items-center text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                  <Lock className="w-3 h-3 mr-1.5 text-indigo-500" />
                  <span>End-to-end encrypted</span>
                </div>
              </div>
            </div>

            {exchangeLoading ? (
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 text-xs text-slate-500">
                Loading exchange...
              </div>
            ) : exchangeRequest ? (
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Skill Trade:</span>{' '}
                    <span className="text-slate-700 dark:text-slate-300">{exchangeRequest.offeredSkill} ↔ {exchangeRequest.requestedSkill}</span>
                    <span className="ml-2 text-xs text-slate-600 dark:text-slate-500">({exchangeRequest.status})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {exchangeRequest.status === 'pending' && exchangeRequest.toUserId === currentUser.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateExchangeStatus('accepted')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center transition"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateExchangeStatus('rejected')}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center transition"
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {exchangeRequest.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center transition"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Finish Skill Trade
                      </button>
                    )}

                    {exchangeRequest.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center transition"
                      >
                        <Star className="w-4 h-4 mr-1.5" />
                        Leave / Update Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30">
              <div className="flex justify-center my-6">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-xs px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 flex items-center shadow-sm">
                       <Lock className="w-3 h-3 mr-2 text-indigo-500" />
                       Messages are secured with end-to-end encryption.
                  </div>
              </div>

              {messages.length === 0 ? (
                  <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Start the conversation with {activeUser.name.split(' ')[0]}!</p>
                      <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Send a message to begin learning together</p>
                  </div>
              ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`max-w-[70%] lg:max-w-[60%] ${
                                isMe 
                                ? 'order-2' 
                                : 'order-1'
                            }`}>
                                <div className={`relative rounded-2xl px-5 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${
                                    isMe 
                                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm hover:from-indigo-600 hover:to-indigo-700' 
                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                                }`}>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <div className={`absolute bottom-0 ${
                                        isMe 
                                        ? 'right-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-indigo-600 border-t-[8px] border-t-indigo-600' 
                                        : 'left-0 w-0 h-0 border-l-[8px] border-l-white dark:border-l-slate-800 border-r-[8px] border-r-transparent border-t-[8px] border-t-white dark:border-t-slate-800'
                                    } transform translate-y-1`}></div>
                                </div>
                                <div className={`mt-1 flex items-center justify-end space-x-2 px-1 ${
                                    isMe ? 'justify-end' : 'justify-start'
                                }`}>
                                    <span className={`text-xs ${
                                        isMe 
                                        ? 'text-indigo-100' 
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                  })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800">
              <div className="flex space-x-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a secure message..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <button 
                    type="submit"
                    disabled={!newMessage.trim()} 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-center mt-3">
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-1">
                  <Lock className="w-3 h-3 text-indigo-500" />
                  <span>End-to-end encrypted</span>
                  <span className="text-slate-400">•</span>
                  <span>Messages are private and secure</span>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <MessageSquare className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Your Messages</h3>
            <p className="max-w-md text-center text-slate-600 dark:text-slate-400 leading-relaxed">Select a conversation from the sidebar or search for a friend to start learning together.</p>
            <div className="mt-8 flex flex-col items-center space-y-2">
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 space-x-1">
                <Lock className="w-3 h-3 text-indigo-500" />
                <span>All conversations are private and secure</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};