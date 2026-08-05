import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Letter = {
  id: string;
  title: string;
  sender: string;
  date: string;
  preview: string;
  body: string;
};

type Reply = {
  id: string;
  letterId: string;
  body: string;
  status: string;
  createdAt: string;
};

type SavedState = {
  favorites: string[];
  read: string[];
  replies: Reply[];
  theme: 'day' | 'night';
};

const STORAGE_KEY = 'nono-letterbox-oss:v1';

const letters: Letter[] = [
  {
    id: 'welcome',
    title: '欢迎来到公开版信笺小屋',
    sender: 'Letterbox Demo',
    date: '2026-08-05',
    preview: '一封完全虚构、只保存在当前设备里的演示信件。',
    body: '这封信只用于展示公开版的阅读体验。收藏、已读状态和回信会保存在当前浏览器的 localStorage 中，不会自动上传到任何服务器。',
  },
  {
    id: 'privacy',
    title: '一封关于隐私的小纸条',
    sender: 'Local-first Garden',
    date: '2026-08-04',
    preview: '默认不联网，也不偷偷发送你的文字。',
    body: '公开预览版不包含 Gmail、OAuth、分析统计或远程同步。未来任何网络功能都应明确说明用途，并由用户主动开启。',
  },
  {
    id: 'roadmap',
    title: '下一站：可导入的信件档案',
    sender: 'Open-source Workshop',
    date: '2026-08-03',
    preview: '先把一条小而完整的本地体验做好。',
    body: '后续计划包括通用 JSON 导入、附件保险箱、可选的 Android 包装和更完整的无障碍支持。真实邮箱连接不会默认开启。',
  },
];

const initialState: SavedState = {
  favorites: [],
  read: [],
  replies: [],
  theme: 'day',
};

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const value = JSON.parse(raw) as Partial<SavedState>;
    return {
      favorites: Array.isArray(value.favorites) ? value.favorites : [],
      read: Array.isArray(value.read) ? value.read : [],
      replies: Array.isArray(value.replies) ? value.replies : [],
      theme: value.theme === 'night' ? 'night' : 'day',
    };
  } catch {
    return initialState;
  }
}

export default function App() {
  const [saved, setSaved] = useState<SavedState>(loadState);
  const [selectedId, setSelectedId] = useState(letters[0].id);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'letters' | 'replies'>('letters');
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState('想一想');
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    document.documentElement.dataset.theme = saved.theme;
  }, [saved]);

  const filteredLetters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return letters;
    return letters.filter((letter) =>
      [letter.title, letter.sender, letter.preview, letter.body]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query]);

  const selected = letters.find((letter) => letter.id === selectedId) ?? letters[0];

  function openLetter(id: string) {
    setSelectedId(id);
    setSaved((current) => ({
      ...current,
      read: current.read.includes(id) ? current.read : [...current.read, id],
    }));
  }

  function toggleFavorite(id: string) {
    setSaved((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((item) => item !== id)
        : [...current.favorites, id],
    }));
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body) return;
    const reply: Reply = {
      id: crypto.randomUUID(),
      letterId: selected.id,
      body,
      status: replyStatus,
      createdAt: new Date().toISOString(),
    };
    setSaved((current) => ({ ...current, replies: [reply, ...current.replies] }));
    setReplyBody('');
    setTab('replies');
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, saved }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `letterbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { saved?: SavedState };
      if (!parsed.saved || !Array.isArray(parsed.saved.replies)) throw new Error('Invalid backup');
      setSaved({
        favorites: Array.isArray(parsed.saved.favorites) ? parsed.saved.favorites : [],
        read: Array.isArray(parsed.saved.read) ? parsed.saved.read : [],
        replies: parsed.saved.replies,
        theme: parsed.saved.theme === 'night' ? 'night' : 'day',
      });
    } catch {
      window.alert('无法读取这份备份。请确认它来自 Nono Letterbox OSS。');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">&gt;_ local-first ✿</p>
          <h1>Nono Letterbox OSS</h1>
          <p className="subtitle">一间不偷偷把文字带走的公开信笺小屋。</p>
        </div>
        <button
          type="button"
          className="round-button"
          aria-label="切换明暗主题"
          onClick={() =>
            setSaved((current) => ({
              ...current,
              theme: current.theme === 'day' ? 'night' : 'day',
            }))
          }
        >
          {saved.theme === 'day' ? '☾' : '☀'}
        </button>
      </header>

      <section className="privacy-banner">
        <span aria-hidden="true">⌂</span>
        <div>
          <strong>公开预览 · Demo only</strong>
          <p>没有 Gmail、OAuth 或远程同步。所有操作默认只保存在这台设备。</p>
        </div>
      </section>

      <nav className="tabs" aria-label="主要页面">
        <button className={tab === 'letters' ? 'active' : ''} onClick={() => setTab('letters')}>
          来信 <span>{letters.length}</span>
        </button>
        <button className={tab === 'replies' ? 'active' : ''} onClick={() => setTab('replies')}>
          回信 <span>{saved.replies.length}</span>
        </button>
      </nav>

      {tab === 'letters' ? (
        <div className="workspace">
          <aside className="letter-list">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、寄件人或正文"
              />
            </label>
            <div className="cards">
              {filteredLetters.map((letter) => (
                <button
                  type="button"
                  key={letter.id}
                  className={`letter-card ${selected.id === letter.id ? 'selected' : ''}`}
                  onClick={() => openLetter(letter.id)}
                >
                  <span className={`read-dot ${saved.read.includes(letter.id) ? 'read' : ''}`} />
                  <span className="letter-card-copy">
                    <strong>{letter.title}</strong>
                    <small>{letter.sender} · {letter.date}</small>
                    <span>{letter.preview}</span>
                  </span>
                  <span aria-label={saved.favorites.includes(letter.id) ? '已收藏' : '未收藏'}>
                    {saved.favorites.includes(letter.id) ? '★' : '☆'}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <article className="reader">
            <div className="reader-heading">
              <div>
                <p>{selected.sender} · {selected.date}</p>
                <h2>{selected.title}</h2>
              </div>
              <button className="favorite-button" type="button" onClick={() => toggleFavorite(selected.id)}>
                {saved.favorites.includes(selected.id) ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>

            <div className="letter-paper">
              <p>{selected.body}</p>
              <p className="signature">愿每封信都有一个安静的落脚处。✿</p>
            </div>

            <form className="reply-form" onSubmit={submitReply}>
              <div className="reply-form-title">
                <div>
                  <p>回复这封信</p>
                  <small>回信只保存在当前浏览器。</small>
                </div>
                <select value={replyStatus} onChange={(event) => setReplyStatus(event.target.value)}>
                  <option>想一想</option>
                  <option>学习中</option>
                  <option>放松一下</option>
                  <option>需要帮助</option>
                  <option>忙碌中</option>
                </select>
              </div>
              <textarea
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="写一点此刻想留下的话……"
                rows={5}
              />
              <button className="primary-button" type="submit">收进回信册</button>
            </form>
          </article>
        </div>
      ) : (
        <section className="reply-page">
          <div className="reply-toolbar">
            <div>
              <h2>回信册</h2>
              <p>按时间保存的本地记录，可以随时导出备份。</p>
            </div>
            <div className="toolbar-actions">
              <button type="button" onClick={exportBackup}>导出备份</button>
              <button type="button" onClick={() => importRef.current?.click()}>导入备份</button>
              <input
                ref={importRef}
                hidden
                type="file"
                accept="application/json"
                onChange={(event) => {
                  void importBackup(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>

          {saved.replies.length === 0 ? (
            <div className="empty-state">
              <span>✉</span>
              <h3>回信册还是空的</h3>
              <p>回到来信页，挑一封信写下第一条本地回信。</p>
              <button className="primary-button" onClick={() => setTab('letters')}>去写回信</button>
            </div>
          ) : (
            <div className="reply-grid">
              {saved.replies.map((reply) => {
                const linkedLetter = letters.find((letter) => letter.id === reply.letterId);
                return (
                  <article className="reply-card" key={reply.id}>
                    <div>
                      <span>{reply.status}</span>
                      <time>{new Date(reply.createdAt).toLocaleString()}</time>
                    </div>
                    <p>{reply.body}</p>
                    <small>关联来信：{linkedLetter?.title ?? '未指定'}</small>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <footer>
        <span>MIT Licensed · v0.1 local demo</span>
        <span>不会自动读取或上传真实邮箱内容</span>
      </footer>
    </main>
  );
}
