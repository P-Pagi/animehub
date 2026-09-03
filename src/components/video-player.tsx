'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Server, Download, ExternalLink, HardDrive, ChevronDown, AlertTriangle, Wifi, Crown, Volume2, VolumeX, Maximize, Zap, Lock, MessageSquare, Send, X } from 'lucide-react';
import { DownloadQuality } from '@/types';

interface VideoPlayerProps {
  embedUrl: string;
  title: string;
  sourceUrl: string;
  availableServers?: { name: string; url: string }[];
  downloadOptions?: DownloadQuality[];
  isNobarActive?: boolean;
}

/** Returns true for URLs we should attempt to resolve to native stream */
const canResolveNative = (url: string) =>
  url.includes('wibufile.com') ||
  url.includes('wibufil') ||
  url.endsWith('.mp4') ||
  url.endsWith('.m3u8') ||
  url.includes('.m3u8?');

export function VideoPlayer({
  embedUrl,
  title,
  availableServers = [],
  downloadOptions = [],
  isNobarActive = false,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeUrl, setActiveUrl] = useState(embedUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverError, setServerError] = useState(false);

  // Native video state
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string | null>(null);
  const [nativeVideoType, setNativeVideoType] = useState<'hls' | 'mp4'>('mp4');
  const [nativeLoading, setNativeLoading] = useState(false);

  // Live Chat & Unread Badge state
  const [nobarMessages, setNobarMessages] = useState<any[]>([]);
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [fullscreenChatInput, setFullscreenChatInput] = useState<string>('');
  const [latestChatToast, setLatestChatToast] = useState<{ userName: string; text: string } | null>(null);

  // Dynamic Nobar state listener to instantly update UI when room is created/joined
  const [dynamicNobar, setDynamicNobar] = useState(() => {
    return isNobarActive || (typeof window !== 'undefined' && window.location.search.includes('nobar='));
  });
  const [isHost, setIsHost] = useState(false);
  const [showSpectatorToast, setShowSpectatorToast] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handleNobarStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.active === 'boolean') {
        setDynamicNobar(detail.active);
        if (typeof detail.isHost === 'boolean') {
          setIsHost(detail.isHost);
        }
        if (!detail.active) {
          // Reset active server URL to original embedUrl when leaving room
          setActiveUrl(embedUrl);
          setNativeVideoUrl(null);
          setIsHost(false);
        }
      }
    };

    const handleRole = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.isHost === 'boolean') {
        setIsHost(detail.isHost);
      }
    };

    window.addEventListener('nobar-room-status-changed', handleNobarStatus);
    window.addEventListener('nobar-user-role', handleRole);
    return () => {
      window.removeEventListener('nobar-room-status-changed', handleNobarStatus);
      window.removeEventListener('nobar-user-role', handleRole);
    };
  }, [embedUrl]);

  // Nobar sync: debounce ref for host reporting
  const lastHostReportRef = useRef<number>(0);
  const hlsRef = useRef<any>(null);

  const activeIndex = availableServers.findIndex((s) => s.url === activeUrl);

  // Auto-switch activeUrl to first syncable server when Nobar room starts
  useEffect(() => {
    if (dynamicNobar && availableServers.length > 0) {
      if (!canResolveNative(activeUrl)) {
        const syncableServer = availableServers.find((s) => canResolveNative(s.url));
        if (syncableServer) {
          setActiveUrl(syncableServer.url);
        }
      }
    }
  }, [dynamicNobar, availableServers, activeUrl]);

  // Reset state when embedUrl changes
  useEffect(() => {
    setActiveUrl(embedUrl);
    setServerError(false);
    setNativeVideoUrl(null);
  }, [embedUrl]);

  // ── Try to resolve Wibufile / direct stream to native player ──
  useEffect(() => {
    if (!canResolveNative(activeUrl)) {
      setNativeVideoUrl(null);
      setNativeLoading(false);
      return;
    }

    // Already a direct stream URL
    if (activeUrl.endsWith('.mp4')) {
      setNativeVideoUrl(activeUrl);
      setNativeVideoType('mp4');
      return;
    }
    if (activeUrl.endsWith('.m3u8') || activeUrl.includes('.m3u8?')) {
      setNativeVideoUrl(activeUrl);
      setNativeVideoType('hls');
      return;
    }

    let cancelled = false;
    setNativeLoading(true);
    setNativeVideoUrl(null);

    fetch(`/api/resolve-stream?url=${encodeURIComponent(activeUrl)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Stream resolver error status: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (d.videoUrl) {
          setNativeVideoUrl(d.videoUrl);
          setNativeVideoType(d.type || 'mp4');
          setServerError(false);
        } else {
          setServerError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setServerError(true);
      })
      .finally(() => { if (!cancelled) setNativeLoading(false); });

    return () => { cancelled = true; };
  }, [activeUrl]);

  // ── HLS.js: attach to native video element when nativeVideoUrl changes ──
  useEffect(() => {
    const video = nativeVideoRef.current;
    if (!video || !nativeVideoUrl) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (nativeVideoType === 'hls') {
      import('hls.js').then(({ default: Hls }) => {
        if (!nativeVideoRef.current || !nativeVideoUrl) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hls.loadSource(nativeVideoUrl);
          hls.attachMedia(nativeVideoRef.current);
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setServerError(true);
            }
          });
          hlsRef.current = hls;
        } else if (nativeVideoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          nativeVideoRef.current.src = nativeVideoUrl;
        }
      });
    } else {
      video.src = nativeVideoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [nativeVideoUrl, nativeVideoType]);

  // ── Nobar Sync: Viewer listens for sync commands from Host ──
  useEffect(() => {
    const handleNobarSync = (e: Event) => {
      const video = nativeVideoRef.current;
      const { isPlaying, currentTime } = (e as CustomEvent).detail as {
        isPlaying: boolean;
        currentTime: number;
      };

      if (video) {
        // Seek if drift > 2 seconds
        if (Math.abs(video.currentTime - currentTime) > 2) {
          video.currentTime = currentTime;
        }
        if (isPlaying && video.paused) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        } else if (!isPlaying && !video.paused) {
          video.pause();
        }
      }
    };

    window.addEventListener('nobar-sync-command', handleNobarSync);
    return () => window.removeEventListener('nobar-sync-command', handleNobarSync);
  }, []);

  // ── Nobar Sync: Host reports video events ──
  const dispatchHostReport = useCallback((isPlaying: boolean, currentTime: number) => {
    const now = Date.now();
    if (now - lastHostReportRef.current < 400) return;
    lastHostReportRef.current = now;
    window.dispatchEvent(new CustomEvent('nobar-host-report', {
      detail: { isPlaying, currentTime },
    }));
  }, []);

  // ── Fullscreen change ──
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(isFS);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ── Listen for Nobar Room Data Updates (Messages & Users) ──
  useEffect(() => {
    let prevMsgLength = 0;

    const handleRoomData = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && Array.isArray(detail.messages)) {
        const msgs = detail.messages;
        setNobarMessages(msgs);
        if (detail.code) setRoomCode(detail.code);
        if (Array.isArray(detail.users)) setRoomUsers(detail.users);

        if (msgs.length > prevMsgLength) {
          const newMsg = msgs[msgs.length - 1];
          if (newMsg && newMsg.userId !== 'system') {
            setIsChatDrawerOpen((open) => {
              if (!open) {
                setUnreadCount((c) => c + 1);
                setLatestChatToast({ userName: newMsg.userName, text: newMsg.text });
                setTimeout(() => setLatestChatToast(null), 3500);
              }
              return open;
            });
          }
          prevMsgLength = msgs.length;
        }
      }
    };

    window.addEventListener('nobar-room-data-updated', handleRoomData);
    return () => window.removeEventListener('nobar-room-data-updated', handleRoomData);
  }, []);

  // Auto scroll chat to bottom in fullscreen drawer
  useEffect(() => {
    if (isChatDrawerOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [nobarMessages, isChatDrawerOpen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (videoContainerRef.current) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(() => {});
      } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
        (videoContainerRef.current as any).webkitRequestFullscreen();
      }
    }
  };

  const handleSendFullscreenChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullscreenChatInput.trim()) return;
    const text = fullscreenChatInput.trim();
    setFullscreenChatInput('');
    window.dispatchEvent(
      new CustomEvent('nobar-send-chat-command', {
        detail: { text },
      })
    );
  };

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const bodyText = (doc.body?.innerText || '').toLowerCase();
      const titleText = (doc.title || '').toLowerCase();
      if (
        bodyText.includes('access denied') ||
        bodyText.includes('embed access restricted') ||
        titleText.includes('error') ||
        titleText.includes('restricted')
      ) {
        setServerError(true);
      }
    } catch {}
  };

  const switchServer = (url: string) => {
    setActiveUrl(url);
    setServerError(false);
    // Notify NobarRoom that Host changed the active server
    window.dispatchEvent(new CustomEvent('nobar-host-server-change', { detail: { serverUrl: url } }));
  };

  // Listen for server changes pushed from Host via NobarRoom
  useEffect(() => {
    const handleServerChange = (e: Event) => {
      const { serverUrl } = (e as CustomEvent).detail as { serverUrl: string };
      if (serverUrl && serverUrl !== activeUrl) {
        setActiveUrl(serverUrl);
        setServerError(false);
      }
    };
    window.addEventListener('nobar-server-change', handleServerChange);
    return () => window.removeEventListener('nobar-server-change', handleServerChange);
  }, [activeUrl]);

  const cleanServers = availableServers.filter(
    (srv) => !srv.name.toLowerCase().includes('blogspot') && !srv.url.toLowerCase().includes('blogspot')
  );

  const switchToNextServer = () => {
    if (cleanServers.length < 2) return;
    const currentCleanIndex = cleanServers.findIndex((s) => s.url === activeUrl);
    const nextIdx = (currentCleanIndex + 1) % cleanServers.length;
    switchServer(cleanServers[nextIdx].url);
  };

  // Use native player only when we have a resolved direct stream URL
  const showNativePlayer = !!nativeVideoUrl;

  return (
    <div className="space-y-4">
      {/* ── Video Container ── */}
      <div className="-mx-3 sm:mx-0">
        <div ref={videoContainerRef} className="relative w-full aspect-video bg-black rounded-none sm:rounded-2xl overflow-hidden border-y sm:border border-border/60 shadow-2xl">

          {/* ── Loading overlay ── */}
          {nativeLoading && !nativeVideoUrl && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950">
              <div className="w-10 h-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <p className="text-xs text-neutral-400">Memuat stream video...</p>
            </div>
          )}

          {/* ── Floating Chat Toast Notification (When Chat Drawer is Closed in Fullscreen) ── */}
          {latestChatToast && !isChatDrawerOpen && dynamicNobar && isFullscreen && (
            <div className="absolute top-3 left-3 z-40 px-3 py-2 rounded-xl bg-neutral-950/90 border border-amber-500/40 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2 max-w-xs pointer-events-none">
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-amber-300">{latestChatToast.userName}: </span>
                <span className="text-neutral-200">{latestChatToast.text}</span>
              </div>
            </div>
          )}

          {serverError ? (
            /* ── Native Player Error Display (Clean & Human-Made) ── */
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-center px-4">
              <p className="text-sm font-medium text-neutral-300">
                Video tidak dapat diputar dari server ini.
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Silakan pilih server lain pada opsi di bawah.
              </p>
              {availableServers.length > 1 && (
                <button
                  onClick={switchToNextServer}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  Ganti Server
                </button>
              )}
            </div>
          ) : showNativePlayer ? (
            /* ── Native HTML5 Video Player (Nobar Sync Enabled) ── */
            <>
              {/* Sync indicator */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/70 text-emerald-400 text-[10px] font-bold pointer-events-none">
                <Wifi className="w-3 h-3" />
                <span>{dynamicNobar ? (isHost ? 'Host Control' : 'Penonton (Synced)') : 'Sync Aktif'}</span>
              </div>

              {/* Spectator lock overlay */}
              {dynamicNobar && !isHost && (
                <div
                  className="absolute inset-0 z-20 cursor-pointer flex flex-col justify-between p-3"
                  onClick={() => {
                    setShowSpectatorToast(true);
                    setTimeout(() => setShowSpectatorToast(false), 2500);
                  }}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/30 text-amber-400 text-[11px] font-extrabold shadow-lg">
                      <Crown className="w-3.5 h-3.5 fill-current text-amber-400" />
                      <span>Dikontrol Host</span>
                    </div>
                  </div>

                  {/* Center Toast notification */}
                  {showSpectatorToast && (
                    <div className="self-center px-4 py-2 rounded-2xl bg-neutral-950/95 border border-amber-500/40 text-amber-300 text-xs font-black shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-150 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>DIBATASI: KENDALI VIDEO SEPENUHNYA DI TANGAN HOST</span>
                    </div>
                  )}

                  {/* Bottom spectator tools (Volume, Live Chat [Fullscreen only] & Fullscreen) */}
                  <div className="flex items-center justify-end gap-2 pointer-events-auto">
                    {isFullscreen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChatDrawerOpen((prev) => !prev);
                          setUnreadCount(0);
                        }}
                        className="relative p-2 rounded-xl bg-black/80 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-700 transition-all backdrop-blur-md flex items-center gap-1.5"
                        title="Live Chat Nobar"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <span>Chat</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (nativeVideoRef.current) {
                          nativeVideoRef.current.muted = !nativeVideoRef.current.muted;
                          setIsMuted(nativeVideoRef.current.muted);
                        }
                      }}
                      className="p-2 rounded-xl bg-black/80 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-700 transition-all backdrop-blur-md flex items-center gap-1.5"
                      title="Toggle Suara"
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-4 h-4 text-red-400" />
                          <span>Unmute</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span>Mute</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                      }}
                      className="p-2 rounded-xl bg-black/80 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-700 transition-all backdrop-blur-md flex items-center gap-1.5"
                      title="Layar Penuh"
                    >
                      <Maximize className="w-4 h-4 text-amber-400" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                </div>
              )}

              <video
                ref={nativeVideoRef}
                controls={!dynamicNobar || isHost}
                controlsList="nodownload"
                className="w-full h-full object-contain bg-black"
                onError={() => setServerError(true)}
                onPlay={(e) => {
                  if (isHost) {
                    dispatchHostReport(true, (e.target as HTMLVideoElement).currentTime);
                  }
                }}
                onPause={(e) => {
                  if (isHost) {
                    dispatchHostReport(false, (e.target as HTMLVideoElement).currentTime);
                  }
                }}
                onSeeked={(e) => {
                  if (isHost) {
                    const v = e.target as HTMLVideoElement;
                    dispatchHostReport(!v.paused, v.currentTime);
                  }
                }}
              />
            </>
          ) : (
            /* ── Iframe Embed (Blogspot & unsupported servers) ── */
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <iframe
                ref={iframeRef}
                src={activeUrl}
                onLoad={handleIframeLoad}
                className={`border-0 absolute top-0 left-0 transform-gpu will-change-transform ${
                  isFullscreen
                    ? 'w-full h-full scale-100 transform-none'
                    : 'w-[128%] h-[128%] sm:w-full sm:h-full scale-[0.78125] sm:scale-100 origin-top-left'
                }`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                title={title}
                scrolling="no"
              />
            </div>
          )}

          {/* ── Fullscreen & Floating Live Chat Drawer (Samping Kanan - FULLSCREEN ONLY) ── */}
          {isChatDrawerOpen && dynamicNobar && isFullscreen && (
            <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 z-50 bg-neutral-950/95 border-l border-neutral-800/90 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-200 pointer-events-auto">
              {/* Drawer Header */}
              <div className="px-3.5 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Live Chat Nobar</span>
                  {roomUsers.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px]">
                      {roomUsers.length} Peserta
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatDrawerOpen(false)}
                  className="p-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="Tutup Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 custom-scrollbar text-xs">
                {nobarMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-1">
                    <MessageSquare className="w-6 h-6 text-neutral-600 mb-1" />
                    <p className="text-xs font-bold text-neutral-400">Belum Ada Pesan</p>
                    <p className="text-[10px]">Kirim pesan pertama di room ini!</p>
                  </div>
                ) : (
                  nobarMessages.map((m) => {
                    const isSys = m.userId === 'system';
                    let isMe = false;
                    try {
                      const localUser = localStorage.getItem('animehub_user');
                      if (localUser) {
                        const parsed = JSON.parse(localUser);
                        isMe = m.userId === parsed.id || m.userId === parsed.email;
                      }
                    } catch {}

                    if (isSys) {
                      return (
                        <div key={m.id} className="text-center my-1 text-[10px] text-neutral-500 italic">
                          {m.text}
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-neutral-400">
                          <span className="font-bold text-neutral-300">{m.userName}</span>
                          <span>•</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words ${
                            isMe
                              ? 'bg-amber-400 text-neutral-950 font-semibold rounded-tr-none'
                              : 'bg-neutral-800 text-neutral-200 border border-neutral-700/60 rounded-tl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Send Chat Bar */}
              <form onSubmit={handleSendFullscreenChat} className="p-2.5 bg-neutral-900/90 border-t border-neutral-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={fullscreenChatInput}
                  onChange={(e) => setFullscreenChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!fullscreenChatInput.trim()}
                  className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold transition-all disabled:opacity-50 shrink-0"
                  title="Kirim Pesan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}


        </div>
      </div>

      {/* ── Server Switcher Bar ── */}
      {(() => {
        const activeNobar = isNobarActive || dynamicNobar;

        // Hide Blogspot servers globally per user preference
        const nonBlogspotServers = availableServers.filter(
          (srv) => !srv.name.toLowerCase().includes('blogspot') && !srv.url.toLowerCase().includes('blogspot')
        );

        // In Nobar mode, filter to only syncable servers (Wibufile/Direct) to prevent out-of-sync issues
        const displayedServers = activeNobar
          ? nonBlogspotServers.filter((srv) => canResolveNative(srv.url))
          : nonBlogspotServers;

        const serverList = displayedServers.length > 0 ? displayedServers : nonBlogspotServers;
        if (serverList.length <= 1) return null;

        return (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border/80 shadow-md space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Server className="w-4 h-4 text-accent" />
              <span>
                Pilih Server &amp; Kualitas Streaming
                {activeNobar && (
                  <span className="ml-2 text-[10px] text-amber-400 font-normal">
                    (Menampilkan Server Streaming)
                  </span>
                )}
              </span>
              {showNativePlayer && (
                <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <Wifi className="w-3 h-3" />
                  Nobar Sync
                </span>
              )}
            </div>

            {activeNobar && !showNativePlayer && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Server ini menggunakan Player Embed. Chat Nobar tetap aktif, namun fitur Play/Pause otomatis terbatas. Pilih server dengan tanda <strong>Sync</strong> untuk kontrol penuh.
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {serverList.map((srv, idx) => {
                const isActive = srv.url === activeUrl;
                const isSyncable = canResolveNative(srv.url);
                return (
                  <button
                    key={idx}
                    onClick={() => switchServer(srv.url)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-background font-extrabold shadow-md scale-105'
                        : 'bg-surface-secondary border border-border text-secondary hover:text-primary hover:border-accent'
                    }`}
                  >
                    {srv.name}
                    {isSyncable && !isActive && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold">
                        <Zap className="w-2.5 h-2.5 fill-current" /> Sync
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Download Links ── */}
      {downloadOptions.length > 0 && (
        <DownloadPanel downloadOptions={downloadOptions} />
      )}
    </div>
  );
}

function DownloadPanel({ downloadOptions }: { downloadOptions: DownloadQuality[] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-surface border border-border/80 shadow-md overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 hover:bg-surface-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-primary">
          <Download className="w-4 h-4 text-accent shrink-0" />
          <span>Download Episode — 360p, 480p, 720p, 1080p Full HD</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-secondary shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 sm:px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {downloadOptions.map((opt, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-background/60 border border-border/70 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-accent uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{opt.resolution}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {opt.servers.map((s, sIdx) => (
                  <a
                    key={sIdx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[11px] font-semibold text-secondary hover:text-primary hover:border-accent transition-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
