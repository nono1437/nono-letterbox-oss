import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type LetterKind = 'letter' | 'task' | 'conversation';
type KindFilter = 'all' | LetterKind;
type MainView = 'letters' | 'replies' | 'categories' | 'settings';
type LetterScope = 'all' | 'starred' | 'unread';

type Category = {
  id: string;
  name: string;
  builtIn?: boolean;
};

type Letter = {
  id: string;
  kind: LetterKind;
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
  categoryId: string;
  createdAt: string;
};

type SavedState = {
  favorites: string[];
  read: string[];
  replies: Reply[];
  letterCategories: Record<string, string>;
  categories: Category[];
  theme: 'day' | 'night';
};

const STORAGE_KEY = 'nono-letterbox-oss:v3';
const LEGACY_KEYS = ['nono-letterbox-oss:v2', 'nono-letterbox-oss:v1'];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'important', name: '重要', builtIn: true },
  { id: 'later', name: '稍后', builtIn: true },
  { id: 'inspiration', name: '灵感', builtIn: true },
  { id: 'other', name: '其他', builtIn: true },
];

const KIND_META: Record<LetterKind, { label: string; icon: string }> = {
  letter: { label: '来信', icon: '✉' },
  task: { label: '任务', icon: '✓' },
  conversation: { label: '对话', icon: '◌' },
};

const letters: Letter[] = [
  {
    id: 'welcome',
    kind: 'letter',
    title: '欢迎来到公开版信笺小屋',
    sender: 'Letterbox Demo',
    date: '2026-08-05',
    preview: '这是一封只保存在当前设备里的演示来信。',
    body: '这里不连接真实邮箱，也不会把你的分类、收藏或回信上传到远程服务器。公开版先把阅读、分类与回信体验做好，再决定是否接入需要审核的网络功能。',
  },
  {
    id: 'privacy',
    kind: 'conversation',
    title: '关于隐私的一次小对话',
    sender: 'Local-first Garden',
    date: '2026-08-04',
    preview: '默认不联网，也不偷偷发送你的文字。',
    body: '来信类型由应用标记；重要、稍后、灵感等私人分类由你自己决定。两套分类彼此独立，而且都只保存在这台设备。',
  },
  {
    id: 'roadmap',
    kind: 'task',
    title: '下一站：整理可导入的信件档案',
    sender: 'Open-source Workshop',
    date: '2026-08-03',
    preview: '先把一条小而完整的本地体验做好。',
    body: '这是一条演示任务。你可以把它归入“重要”或自建的“项目”分类，写一封回信，再通过 JSON 备份把记录带走。',
  },
  {
    id: 'quiet-evening',
    kind: 'letter',
    title: '今晚也可以慢一点',
    sender: 'Codex Demo',
    date: '2026-08-02',
    preview: '信不会跑掉，挑一封想看的就好。',
    body: '公开版没有假装已经接入 ChatGPT 或 Gmail。这封温柔一点的演示信，只是为了让阅读页不再像一张空白的功能表。',
  },
  {
    id: 'category-note',
    kind: 'conversation',
    title: '类型不是重要程度',
    sender: 'Letterbox Notes',
    date: '2026-08-01',
    preview: '任务也可以不重要，对话也可以珍藏。',
    body: '“来信、任务、对话、回信”描述内容是什么；“重要、稍后、灵感、自定义分类”描述它对你意味着什么。',
  },
];

const initialState: SavedState = {
  favorites: [],
  read: [],
  replies: [],
  letterCategories: {},
  categories: DEFAULT_CATEGORIES,
  theme: 'night',
};

function normalizeCategories(value: unknown): Category[] {
  const custom = Array.isArray(value)
    ? value.filter(
        (item): item is Category =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as Category).id === 'string' &&
          typeof (item as Category).name === 'string',
      )
    : [];

  const categoryMap = new Map<string, Category>();
  DEFAULT_CATEGORIES.forEach((category) => categoryMap.set(category.id, category));
  custom.forEach((category) => {
    if (!categoryMap.has(category.id)) {
      categoryMap.set(category.id, { id: category.id, name: category.name.slice(0, 18) });
    }
  });
  return [...categoryMap.values()];
}

function normalizeReplies(value: unknown): Reply[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Reply => {
      if (!item || typeof item !== 'object') return false;
      const reply = item as Partial<Reply>;
      return (
        typeof reply.id === 'string' &&
        typeof reply.letterId === 'string' &&
        typeof reply.body === 'string' &&
        typeof reply.status === 'string' &&
        typeof reply.createdAt === 'string'
      );
    })
    .map((reply) => ({ ...reply, categoryId: reply.categoryId ?? '' }));
}

function loadState(): SavedState {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return initialState;
    const value = JSON.parse(raw) as Partial<SavedState>;
    return {
      favorites: Array.isArray(value.favorites) ? value.favorites : [],
      read: Array.isArray(value.read) ? value.read : [],
      replies: normalizeReplies(value.replies),
      letterCategories:
        value.letterCategories && typeof value.letterCategories === 'object'
          ? value.letterCategories
          : {},
      categories: normalizeCategories(value.categories),
      theme: value.theme === 'day' ? 'day' : 'night',
    };
  } catch {
    return initialState;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，慢慢读。';
  if (hour < 11) return '早上好，欢迎回来。';
  if (hour < 18) return '下午好，来小屋坐一会儿。';
  return '晚上好，欢迎回家。';
}

export default function App() {
  const [saved, setSaved] = useState<SavedState>(loadState);
  const [view, setView] = useState<MainView>('letters');
  const [readerId, setReaderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<LetterScope>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState('想一想');
  const [replyCategoryId, setReplyCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    document.documentElement.dataset.theme = saved.theme;
  }, [saved]);

  const unreadCount = letters.filter((letter) => !saved.read.includes(letter.id)).length;
  const readCount = letters.length - unreadCount;

  const filteredLetters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return letters.filter((letter) => {
      const matchesScope =
        scope === 'all' ||
        (scope === 'starred' && saved.favorites.includes(letter.id)) ||
        (scope === 'unread' && !saved.read.includes(letter.id));
      const matchesKind = kindFilter === 'all' || letter.kind === kindFilter;
      const matchesCategory =
        categoryFilter === 'all' || saved.letterCategories[letter.id] === categoryFilter;
      const matchesQuery =
        !needle ||
        [letter.title, letter.sender, letter.preview, letter.body]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesScope && matchesKind && matchesCategory && matchesQuery;
    });
  }, [categoryFilter, kindFilter, query, saved.favorites, saved.letterCategories, saved.read, scope]);

  const selectedLetter = readerId ? letters.find((letter) => letter.id === readerId) : undefined;
  const selectedIndex = selectedLetter ? letters.findIndex((letter) => letter.id === selectedLetter.id) : -1;

  const filteredReplies = useMemo(() => {
    if (categoryFilter === 'all') return saved.replies;
    return saved.replies.filter((reply) => reply.categoryId === categoryFilter);
  }, [categoryFilter, saved.replies]);

  function getCategoryName(id: string) {
    return saved.categories.find((category) => category.id === id)?.name ?? '';
  }

  function openLetter(id: string) {
    setSaved((current) => ({
      ...current,
      read: current.read.includes(id) ? current.read : [...current.read, id],
    }));
    setReaderId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateReader(offset: number) {
    if (selectedIndex < 0) return;
    const nextIndex = Math.max(0, Math.min(letters.length - 1, selectedIndex + offset));
    openLetter(letters[nextIndex].id);
  }

  function toggleFavorite(id: string) {
    setSaved((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((item) => item !== id)
        : [...current.favorites, id],
    }));
  }

  function setLetterCategory(letterId: string, categoryId: string) {
    setSaved((current) => ({
      ...current,
      letterCategories: { ...current.letterCategories, [letterId]: categoryId },
    }));
  }

  function setReplyCategory(replyId: string, categoryId: string) {
    setSaved((current) => ({
      ...current,
      replies: current.replies.map((reply) =>
        reply.id === replyId ? { ...reply, categoryId } : reply,
      ),
    }));
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategoryName.trim().replace(/\s+/g, ' ').slice(0, 18);
    if (!name) return;
    const duplicate = saved.categories.find(
      (category) => category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) {
      setCategoryFilter(duplicate.id);
      setNewCategoryName('');
      return;
    }
    const category: Category = { id: `custom-${crypto.randomUUID()}`, name };
    setSaved((current) => ({ ...current, categories: [...current.categories, category] }));
    setNewCategoryName('');
  }

  function removeCategory(categoryId: string) {
    const category = saved.categories.find((item) => item.id === categoryId);
    if (!category || category.builtIn) return;
    setSaved((current) => ({
      ...current,
      categories: current.categories.filter((item) => item.id !== categoryId),
      letterCategories: Object.fromEntries(
        Object.entries(current.letterCategories).map(([key, value]) => [
          key,
          value === categoryId ? '' : value,
        ]),
      ),
      replies: current.replies.map((reply) =>
        reply.categoryId === categoryId ? { ...reply, categoryId: '' } : reply,
      ),
    }));
    if (categoryFilter === categoryId) setCategoryFilter('all');
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLetter) return;
    const body = replyBody.trim();
    if (!body) return;
    const reply: Reply = {
      id: crypto.randomUUID(),
      letterId: selectedLetter.id,
      body,
      status: replyStatus,
      categoryId: replyCategoryId,
      createdAt: new Date().toISOString(),
    };
    setSaved((current) => ({ ...current, replies: [reply, ...current.replies] }));
    setReplyBody('');
    setReaderId(null);
    setView('replies');
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 3, saved }, null, 2)], {
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
      const parsed = JSON.parse(await file.text()) as { saved?: Partial<SavedState> };
      if (!parsed.saved || !Array.isArray(parsed.saved.replies)) throw new Error('Invalid backup');
      setSaved({
        favorites: Array.isArray(parsed.saved.favorites) ? parsed.saved.favorites : [],
        read: Array.isArray(parsed.saved.read) ? parsed.saved.read : [],
        replies: normalizeReplies(parsed.saved.replies),
        letterCategories:
          parsed.saved.letterCategories && typeof parsed.saved.letterCategories === 'object'
            ? parsed.saved.letterCategories
            : {},
        categories: normalizeCategories(parsed.saved.categories),
        theme: parsed.saved.theme === 'day' ? 'day' : 'night',
      });
    } catch {
      window.alert('无法读取这份备份。请确认它来自 Nono Letterbox OSS。');
    }
  }

  function switchView(nextView: MainView) {
    setReaderId(null);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className={`app-shell ${readerId ? 'reader-open' : ''}`}>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => switchView('letters')}>
          <img src="./app-icon.svg" alt="" />
          <span>
            <strong>信笺小屋 OSS</strong>
            <small>LOCAL DEMO · NO GMAIL</small>
          </span>
        </button>
        <div className="top-actions">
          <button className="status-orb" type="button" onClick={() => switchView('settings')} aria-label="本地模式设置">
            <i />
          </button>
          <button className="spark-button" type="button" onClick={() => switchView('categories')} aria-label="打开分类">
            ✦
          </button>
          <button
            className="theme-button"
            type="button"
            onClick={() =>
              setSaved((current) => ({
                ...current,
                theme: current.theme === 'night' ? 'day' : 'night',
              }))
            }
            aria-label="切换主题"
          >
            {saved.theme === 'night' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {selectedLetter ? (
        <section className="reader-screen">
          <button className="reader-back" type="button" onClick={() => setReaderId(null)}>
            ← 返回来信
          </button>
          <article className="reader-card">
            <div className="reader-card-top">
              <div className="badge-row">
                <span className={`type-badge ${selectedLetter.kind}`}>
                  {KIND_META[selectedLetter.kind].icon} {KIND_META[selectedLetter.kind].label}
                </span>
                {saved.letterCategories[selectedLetter.id] && (
                  <span className="category-badge">
                    {getCategoryName(saved.letterCategories[selectedLetter.id])}
                  </span>
                )}
              </div>
              <button className="reader-star" type="button" onClick={() => toggleFavorite(selectedLetter.id)}>
                {saved.favorites.includes(selectedLetter.id) ? '★' : '☆'}
              </button>
            </div>
            <p className="reader-sender">{selectedLetter.sender} · {selectedLetter.date}</p>
            <h1>{selectedLetter.title}</h1>
            <div className="reader-body">
              <p>{selectedLetter.body}</p>
              <p className="signature">FROM<br /><strong>Letterbox ✿</strong></p>
              <span className="signature-mark">&gt;_</span>
            </div>
            <label className="reader-category">
              <span>归入我的分类</span>
              <select
                value={saved.letterCategories[selectedLetter.id] ?? ''}
                onChange={(event) => setLetterCategory(selectedLetter.id, event.target.value)}
              >
                <option value="">未分类</option>
                {saved.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <form className="reply-composer" onSubmit={submitReply}>
              <div className="reply-composer-heading">
                <div>
                  <span>WRITE BACK</span>
                  <strong>回复这封{KIND_META[selectedLetter.kind].label}</strong>
                </div>
                <select value={replyStatus} onChange={(event) => setReplyStatus(event.target.value)} aria-label="回信状态">
                  <option>想一想</option>
                  <option>学习中</option>
                  <option>放松一下</option>
                  <option>需要帮助</option>
                  <option>忙碌中</option>
                </select>
              </div>
              <textarea
                rows={5}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="写一点此刻想留下的话……"
              />
              <div className="reply-composer-actions">
                <select value={replyCategoryId} onChange={(event) => setReplyCategoryId(event.target.value)} aria-label="回信分类">
                  <option value="">回信未分类</option>
                  {saved.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <button type="submit">收进回信册</button>
              </div>
            </form>
          </article>
          <div className="reader-navigation">
            <button type="button" disabled={selectedIndex <= 0} onClick={() => navigateReader(-1)}>← 上一封</button>
            <button type="button" onClick={() => openLetter(letters[Math.floor(Math.random() * letters.length)].id)}>✦ 随机重逢</button>
            <button type="button" disabled={selectedIndex >= letters.length - 1} onClick={() => navigateReader(1)}>下一封 →</button>
          </div>
        </section>
      ) : (
        <>
          {view === 'letters' && (
            <section className="home-view">
              <header className="welcome-block">
                <span>WELCOME BACK</span>
                <h1>{getGreeting()}</h1>
                <p>这里会收好演示来信、任务、对话与本地回信。</p>
                <div className="welcome-stats">
                  <span><b>{readCount}</b> 已读</span>
                  <span><b>{unreadCount}</b> 待读</span>
                </div>
              </header>

              <section className="codex-welcome">
                <div className="codex-heading">
                  <span>CODEX WELCOME</span>
                  <button type="button" aria-label="刷新欢迎语">↻</button>
                </div>
                <p>公开小屋已经认得这阵脚步声啦。还有 {unreadCount} 封内容等你慢慢看。</p>
                <small>✦ 从门边探出云朵脑袋，挥两下手</small>
                <div className="codex-stats">
                  <span>本机 <b>1</b></span>
                  <span>回信 <b>{saved.replies.length}</b></span>
                </div>
                <button className="level-button" type="button" onClick={() => switchView('categories')}>
                  <span className="level-icon">⌂</span>
                  <span><strong>LV.1 · 本地信柜</strong><small>{saved.read.length + saved.replies.length * 2} XP</small></span>
                  <i>›</i>
                </button>
              </section>

              <nav className="scope-tabs" aria-label="来信范围">
                <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>全部来信</button>
                <button className={scope === 'starred' ? 'active' : ''} onClick={() => setScope('starred')}>星星收藏</button>
                <button className={scope === 'unread' ? 'active' : ''} onClick={() => setScope('unread')}>还没读过</button>
              </nav>

              <section className="source-card">
                <div>
                  <span>MAIL SOURCE</span>
                  <strong>Local Demo · 已连接本机</strong>
                  <small>不读取 Gmail；收藏、分类与回信只保存在这台设备。</small>
                </div>
                <button type="button" onClick={() => importRef.current?.click()}>导入备份</button>
              </section>

              <label className="search-box">
                <span>⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="找一封信，或一段记忆……" />
              </label>

              <div className="filter-strip">
                <div className="chip-row">
                  <button className={kindFilter === 'all' ? 'active' : ''} onClick={() => setKindFilter('all')}>全部类型</button>
                  {(Object.keys(KIND_META) as LetterKind[]).map((kind) => (
                    <button key={kind} className={kindFilter === kind ? 'active' : ''} onClick={() => setKindFilter(kind)}>
                      {KIND_META[kind].icon} {KIND_META[kind].label}
                    </button>
                  ))}
                </div>
                <div className="chip-row categories">
                  <button className={categoryFilter === 'all' ? 'active' : ''} onClick={() => setCategoryFilter('all')}>全部分类</button>
                  {saved.categories.map((category) => (
                    <button key={category.id} className={categoryFilter === category.id ? 'active' : ''} onClick={() => setCategoryFilter(category.id)}>
                      {category.id === 'important' ? '★ ' : ''}{category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section-heading">
                <div><span>LETTER ARCHIVE</span><h2>小屋来信</h2></div>
                <b>{filteredLetters.length} 封</b>
              </div>

              <div className="letter-list">
                {filteredLetters.length === 0 ? (
                  <div className="empty-state compact">
                    <span>⌁</span>
                    <strong>这里暂时没有符合筛选条件的内容</strong>
                    <button type="button" onClick={() => { setScope('all'); setKindFilter('all'); setCategoryFilter('all'); setQuery(''); }}>清空筛选</button>
                  </div>
                ) : (
                  filteredLetters.map((letter) => {
                    const categoryName = getCategoryName(saved.letterCategories[letter.id] ?? '');
                    return (
                      <article className="letter-card" key={letter.id}>
                        <button className="letter-open" type="button" onClick={() => openLetter(letter.id)}>
                          <div className="letter-topline">
                            <div className="badge-row">
                              <span className={`type-badge ${letter.kind}`}>{KIND_META[letter.kind].icon} {KIND_META[letter.kind].label}</span>
                              {categoryName && <span className="category-badge">{categoryName}</span>}
                            </div>
                            <time>{letter.date}</time>
                          </div>
                          <h3>{letter.title}</h3>
                          <p>{letter.preview}</p>
                          <small>{letter.sender}</small>
                        </button>
                        <button className="letter-star" type="button" onClick={() => toggleFavorite(letter.id)} aria-label="切换收藏">
                          {saved.favorites.includes(letter.id) ? '★' : '☆'}
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {view === 'replies' && (
            <section className="page-view">
              <header className="page-heading">
                <span>REPLY JOURNAL</span>
                <h1>回信册</h1>
                <p>每封回信都记录时间、状态和用户自己的分类。</p>
              </header>
              <div className="chip-row categories standalone">
                <button className={categoryFilter === 'all' ? 'active' : ''} onClick={() => setCategoryFilter('all')}>全部回信</button>
                {saved.categories.map((category) => (
                  <button key={category.id} className={categoryFilter === category.id ? 'active' : ''} onClick={() => setCategoryFilter(category.id)}>{category.name}</button>
                ))}
              </div>
              {saved.replies.length === 0 ? (
                <div className="empty-state">
                  <span>✉</span>
                  <h2>回信册还是空的</h2>
                  <p>从来信页打开一封内容，写下第一封本地回信。</p>
                  <button type="button" onClick={() => switchView('letters')}>去读一封信</button>
                </div>
              ) : filteredReplies.length === 0 ? (
                <div className="empty-state">
                  <span>⌁</span>
                  <h2>这个分类里还没有回信</h2>
                  <button type="button" onClick={() => setCategoryFilter('all')}>查看全部</button>
                </div>
              ) : (
                <div className="reply-list">
                  {filteredReplies.map((reply) => {
                    const linkedLetter = letters.find((letter) => letter.id === reply.letterId);
                    return (
                      <article className="reply-card" key={reply.id}>
                        <div className="reply-meta"><span className="type-badge reply">回信</span><time>{new Date(reply.createdAt).toLocaleString()}</time></div>
                        <h3>{linkedLetter?.title ?? '未指定来信'}</h3>
                        <p>{reply.body}</p>
                        <div className="reply-footer">
                          <span>{reply.status}</span>
                          <select value={reply.categoryId} onChange={(event) => setReplyCategory(reply.id, event.target.value)}>
                            <option value="">未分类</option>
                            {saved.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {view === 'categories' && (
            <section className="page-view">
              <header className="page-heading">
                <span>MY LABELS</span>
                <h1>我的分类</h1>
                <p>内容类型说明“它是什么”，私人分类说明“它对我意味着什么”。</p>
              </header>
              <form className="category-form" onSubmit={addCategory}>
                <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：学校、项目、珍藏" maxLength={18} />
                <button type="submit">添加分类</button>
              </form>
              <div className="category-grid">
                {saved.categories.map((category) => {
                  const letterCount = Object.values(saved.letterCategories).filter((value) => value === category.id).length;
                  const replyCount = saved.replies.filter((reply) => reply.categoryId === category.id).length;
                  return (
                    <article className="category-card" key={category.id}>
                      <span>{category.id === 'important' ? '★' : '✦'}</span>
                      <h2>{category.name}</h2>
                      <p>{letterCount} 条内容 · {replyCount} 封回信</p>
                      <button type="button" onClick={() => { setCategoryFilter(category.id); switchView('letters'); }}>查看内容</button>
                      {!category.builtIn && <button className="delete-category" type="button" onClick={() => removeCategory(category.id)}>删除</button>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {view === 'settings' && (
            <section className="page-view">
              <header className="page-heading">
                <span>LOCAL FIRST</span>
                <h1>小屋设置</h1>
                <p>公开体验版不含 Gmail、OAuth、分析统计或远程同步。</p>
              </header>
              <section className="settings-card privacy">
                <span>● ONLINE</span>
                <h2>其实这里只有静态应用本身在线</h2>
                <p>来信演示、收藏、分类与回信都保存在当前设备的浏览器存储里，不会自动传到 GitHub。</p>
              </section>
              <section className="settings-card">
                <span>BACKUP</span>
                <h2>带走这台设备上的记录</h2>
                <div className="settings-actions">
                  <button type="button" onClick={exportBackup}>导出 JSON 备份</button>
                  <button type="button" onClick={() => importRef.current?.click()}>导入 JSON 备份</button>
                </div>
              </section>
              <section className="settings-card">
                <span>APPEARANCE</span>
                <h2>夜灯与晨光</h2>
                <button type="button" onClick={() => setSaved((current) => ({ ...current, theme: current.theme === 'night' ? 'day' : 'night' }))}>
                  切换到{saved.theme === 'night' ? '晨光' : '夜灯'}模式
                </button>
              </section>
            </section>
          )}
        </>
      )}

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

      <nav className="bottom-nav" aria-label="手机底部导航">
        <button className={view === 'letters' && !readerId ? 'active' : ''} onClick={() => switchView('letters')}><span>来信</span><b>{letters.length}</b></button>
        <button className={view === 'replies' && !readerId ? 'active' : ''} onClick={() => switchView('replies')}><span>回信</span><b>{saved.replies.length}</b></button>
        <button className={view === 'categories' && !readerId ? 'active' : ''} onClick={() => switchView('categories')}><span>分类</span><b>{saved.categories.length}</b></button>
        <button className={view === 'settings' && !readerId ? 'active' : ''} onClick={() => switchView('settings')}><span>设置</span><b>⌂</b></button>
      </nav>
    </main>
  );
}
