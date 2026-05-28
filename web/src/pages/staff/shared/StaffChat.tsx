import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { useAuth } from '../../../auth/AuthContext';

interface Conversation {
  peer_id: string;
  peer_name: string;
  peer_role: string;
  last_message?: string;
  last_at?: string;
  unread?: number;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export default function StaffChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeer, setActivePeer] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data.conversations ?? res.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadConversations(); }, []);

  async function openChat(c: Conversation) {
    setActivePeer(c);
    setMsgLoading(true);
    try {
      const res = await api.get(`/chat/with/${c.peer_id}`);
      setMessages(res.data.messages ?? res.data.data ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    } catch { /* ignore */ }
    finally { setMsgLoading(false); }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activePeer) return;
    setSending(true);
    try {
      await api.post('/chat/messages', { receiver_id: activePeer.peer_id, content: text.trim() });
      setText('');
      // Reload messages
      const res = await api.get(`/chat/with/${activePeer.peer_id}`);
      setMessages(res.data.messages ?? res.data.data ?? []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const ROLE_LABEL: Record<string, string> = { doctor: 'BS', technician: 'KTV', manager: 'QL', receptionist: 'TT', cashier: 'TN', patient: 'BN' };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-700">Hội thoại</div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-400">Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Chưa có hội thoại.</div>
          ) : conversations.map((c) => (
            <button key={c.peer_id} onClick={() => openChat(c)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${activePeer?.peer_id === c.peer_id ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 truncate">{c.peer_name}</span>
                <span className="text-[10px] text-gray-400">{ROLE_LABEL[c.peer_role] ?? c.peer_role}</span>
              </div>
              {c.last_message && <div className="text-xs text-gray-500 truncate mt-0.5">{c.last_message}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activePeer ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chọn hội thoại để bắt đầu</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-900">
              {activePeer.peer_name}
              <span className="ml-2 text-xs text-gray-400">{ROLE_LABEL[activePeer.peer_role] ?? activePeer.peer_role}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="text-sm text-gray-400">Đang tải...</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-400 text-center">Chưa có tin nhắn.</div>
              ) : messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <div>{m.content}</div>
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>{formatDateTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="border-t border-gray-200 p-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Nhập tin nhắn..." className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
              <button type="submit" disabled={sending || !text.trim()} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                Gửi
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
