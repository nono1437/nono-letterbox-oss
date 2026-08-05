import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type LetterKind = 'letter' | 'task' | 'conversation';
type KindFilter = 'all' | LetterKind;

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

const STORAGE_KEY = 'nono-letterbox-oss:v2';
const LEGACY_STORAGE_KEY = 'nono-letterbox-oss:v1';

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
    preview: '一封完全虚构、只保存在当前设备里的演示信件。',
    body: '这封信只用于展示公开版的阅读体验。收藏、已读状态、分类和回信会保存在当前浏览器的 localStorage 中，不会自动上传到任何服务器。',
  },
  {
    id: 'privacy',
    kind: 'conversation',
    title: '关于隐私的一次小对话',
    sender: 'Local-first Garden',
    date: '2026-08-04',
    preview: '默认不联网，也不偷偷发送你的文字。',
    body: '公开预览版不包含 Gmail、OAuth、分析统计或远程同步。未来任何网络功能都应明确说明用途，并由用户主动开启。',
  },
  {
    id: 'roadmap',
    kind: 'task',
    title: '下一站：整理可导入的信件档案',
    sender: 'Open-source Workshop',
    date: '2026-08-03',
    preview: '先把一条小而完整的本地体验做好。',
    body: '这是一条演示任务。后续计划包括通用 JSON 导入、附件保险箱、可选的 Android 包装和更完整的无障碍支持。真实邮箱连接不会默认开启。',
  },
];

const initialState: SavedState = {
  favorites: [],
  read: [],
  replies: [],
  letterCategories: {},
  categories: DEFAULT_CATEGORIES,
  theme: 'day',
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
  return value.filter((item): item is Reply => {
    if (!item || typeof item !== 'object') return false;
    const reply = item as Partial<Reply>;
    return (
      typeof reply.id === 'string' &&
      typeof reply.letterId === 'string' &&
      typeof reply.body === 'string' &&
      typeof reply.status === 'string' &&
      typeof reply.createdAt === 'string'
    );
  }).map((reply) => ({ ...reply, categoryId: reply.categoryId ?? '' }));
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
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
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState('想一想');
  const [replyCategoryId, setReplyCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    document.documentElement.dataset.theme = saved.theme;
  }, [saved]);

  const filteredLetters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return letters.filter((letter) => {
      const matchesQuery =
        !needle ||
        [letter.title, letter.sender, letter.preview, letter.body]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesKind = kindFilter === 'all' || letter.kind === kindFilter;
      const matchesCategory =
        categoryFilter === 'all' || saved.letterCategories[letter.id] === categoryFilter;
      return matchesQuery && matchesKind && matchesCategory;
    });
  }, [categoryFilter, kindFilter, query, saved.letterCategories]);

  const filteredReplies = useMemo(() => {
    if (categoryFilter === 'all') return saved.replies;
    return saved.replies.filter((reply) => reply.categoryId === categoryFilter);
  }, [categoryFilter, saved.replies]);

  const selected = letters.find((letter) => letter.id === selectedId) ?? letters[0];
  const selectedCategoryId = saved.letterCategories[selected.id] ?? '';

  function getCategoryName(id: string) {
    return saved.categories.find((category) => category.id === id)?.name ?? '';
  }

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
    setCategoryFilter(category.id);
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
    const body = replyBody.trim();
    if (!body) return;
    const reply: Reply = {
      id: crypto.randomUUID(),
      letterId: selected.id,
      body,
      status: replyStatus,
      categoryId: replyCategoryId,
      createdAt: new Date().toISOString(),
    };
    setSaved((current) => ({ ...current, replies: [reply, ...current.replies] }));
    setReplyBody('');
    setTab('replies');
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 2, saved }, null, 2)], {
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
          <p className="subtitle">系统区分来信、任务、对话与回信；你再决定什么最重要。</p>
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
          <p>类型和私人分类都只保存在这台设备；没有 Gmail、OAuth 或远程同步。</p>
        </div>
      </section>

      <nav className="tabs" aria-label="主要页面">
        <button className={tab === 'letters' ? 'active' : ''} onClick={() => setTab('letters')}>
          收件匣 <span>{letters.length}</span>
        </button>
        <button className={tab === 'replies' ? 'active' : ''} onClick={() => setTab('replies')}>
          回信 <span>{saved.replies.length}</span>
        </button>
      </nav>

      <section className="filter-stack" aria-label="内容筛选">
        {tab === 'letters' && (
          <div className="filter-row">
            <span className="filter-label">内容类型</span>
            <div className="filter-chips">
              <button className={kindFilter === 'all' ? 'active' : ''} onClick={() => setKindFilter('all')}>全部</button>
              {(Object.keys(KIND_META) as LetterKind[]).map((kind) => (
                <button key={kind} className={kindFilter === kind ? 'active' : ''} onClick={() => setKindFilter(kind)}>
                  {KIND_META[kind].icon} {KIND_META[kind].label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="filter-row">
          <span className="filter-label">我的分类</span>
          <div className="filter-chips">
            <button className={categoryFilter === 'all' ? 'active' : ''} onClick={() => setCategoryFilter('all')}>全部</button>
            {saved.categories.map((category) => (
              <button key={category.id} className={categoryFilter === category.id ? 'active' : ''} onClick={() => setCategoryFilter(category.id)}>
                {category.id === 'important' ? '★ ' : ''}{category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

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

            <details className="category-manager">
              <summary>管理我的分类</summary>
              <form className="category-form" onSubmit={addCategory}>
                <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="例如：学校、项目、珍藏" maxLength={18} />
                <button type="submit">添加</button>
              </form>
              <div className="category-list">
                {saved.categories.map((category) => (
                  <span key={category.id}>
                    {category.name}
                    {!category.builtIn && (
                      <button type="button" aria-label={`删除分类 ${category.name}`} onClick={() => removeCategory(category.id)}>×</button>
                    )}
                  </span>
                ))}
              </div>
            </details>

            <div className="cards">
              {filteredLetters.length === 0 && <p className="list-empty">这里暂时没有符合筛选条件的内容。</p>}
              {filteredLetters.map((letter) => {
                const categoryName = getCategoryName(saved.letterCategories[letter.id] ?? '');
                return (
                  <button
                    type="button"
                    key={letter.id}
                    className={`letter-card ${selected.id === letter.id ? 'selected' : ''}`}
                    onClick={() => openLetter(letter.id)}
                  >
                    <span className={`read-dot ${saved.read.includes(letter.id) ? 'read' : ''}`} />
                    <span className="letter-card-copy">
                      <span className="card-badges">
                        <span className={`type-badge ${letter.kind}`}>{KIND_META[letter.kind].label}</span>
                        {categoryName && <span className="category-badge">{categoryName}</span>}
                      </span>
                      <strong>{letter.title}</strong>
                      <small>{letter.sender} · {letter.date}</small>
                      <span>{letter.preview}</span>
                    </span>
                    <span aria-label={saved.favorites.includes(letter.id) ? '已收藏' : '未收藏'}>
                      {saved.favorites.includes(letter.id) ? '★' : '☆'}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="reader">
            <div className="reader-heading">
              <div>
                <div className="reader-meta">
                  <span className={`type-badge ${selected.kind}`}>{KIND_META[selected.kind].icon} {KIND_META[selected.kind].label}</span>
                  {selectedCategoryId && <span className="category-badge">{getCategoryName(selectedCategoryId)}</span>}
                </div>
                <p>{selected.sender} · {selected.date}</p>
                <h2>{selected.title}</h2>
              </div>
              <button className="favorite-button" type="button" onClick={() => toggleFavorite(selected.id)}>
                {saved.favorites.includes(selected.id) ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>

            <div className="classification-row">
              <label>
                <span>归入我的分类</span>
                <select value={selectedCategoryId} onChange={(event) => setLetterCategory(selected.id, event.target.value)}>
                  <option value="">未分类</option>
                  {saved.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <small>“来信 / 任务 / 对话”是内容类型；“重要 / 稍后 / 自定义”由你决定。</small>
            </div>

            <div className="letter-paper">
              <p>{selected.body}</p>
              <p className="signature">愿每封信都有一个安静的落脚处。✿</p>
            </div>

            <form className="reply-form" onSubmit={submitReply}>
              <div className="reply-form-title">
                <div>
                  <p>回复这封{KIND_META[selected.kind].label}</p>
                  <small>回信本身会被标为“回信”，也可以另外归类。</small>
                </div>
                <div className="reply-selects">
                  <select value={replyStatus} onChange={(event) => setReplyStatus(event.target.value)} aria-label="回信状态">
                    <option>想一想</option>
                    <option>学习中</option>
                    <option>放松一下</option>
                    <option>需要帮助</option>
                    <option>忙碌中</option>
                  </select>
                  <select value={replyCategoryId} onChange={(event) => setReplyCategoryId(event.target.value)} aria-label="回信分类">
                    <option value="">未分类</option>
                    {saved.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
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
              <p>所有记录的内容类型都是“回信”，私人分类仍可随时调整。</p>
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
              <p>回到收件匣，挑一条内容写下第一封本地回信。</p>
              <button className="primary-button" onClick={() => setTab('letters')}>去写回信</button>
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="empty-state">
              <span>⌁</span>
              <h3>这个分类里还没有回信</h3>
              <p>可以切换“我的分类”，或给已有回信重新归类。</p>
            </div>
          ) : (
            <div className="reply-grid">
              {filteredReplies.map((reply) => {
                const linkedLetter = letters.find((letter) => letter.id === reply.letterId);
                return (
                  <article className="reply-card" key={reply.id}>
                    <div className="reply-card-meta">
                      <span className="type-badge reply">回信</span>
                      <time>{new Date(reply.createdAt).toLocaleString()}</time>
                    </div>
                    <div className="reply-tags">
                      <span>{reply.status}</span>
                      {reply.categoryId && <span className="category-badge">{getCategoryName(reply.categoryId)}</span>}
                    </div>
                    <p>{reply.body}</p>
                    <small>关联{linkedLetter ? KIND_META[linkedLetter.kind].label : '内容'}：{linkedLetter?.title ?? '未指定'}</small>
                    <label className="reply-category-control">
                      <span>我的分类</span>
                      <select value={reply.categoryId} onChange={(event) => setReplyCategory(reply.id, event.target.value)}>
                        <option value="">未分类</option>
                        {saved.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </label>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <footer>
        <span>MIT Licensed · v0.2 local demo</span>
        <span>系统类型与私人分类彼此独立，均不会自动上传</span>
      </footer>
    </main>
  );
}
