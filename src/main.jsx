import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  Bell,
  Download,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Users,
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:9090/api';
const TAB_IDS = ['dashboard', 'members', 'add-member', 'posts', 'alerts'];

function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return TAB_IDS.includes(hash) ? hash : 'dashboard';
}

function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    partyRole: 'Campaign Volunteer',
    district: '',
    constituency: '',
    phone: '',
    email: '',
    instagramUsername: '',
    xUsername: '',
  });

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams({ q: query, limit: '150' });
    if (platform) params.set('platform', platform);

    const [statsResponse, membersResponse, postsResponse] = await Promise.all([
      fetch(`${API_BASE}/dashboard/stats`),
      fetch(`${API_BASE}/members`),
      fetch(`${API_BASE}/posts?${params}`),
    ]);

    setStats(await statsResponse.json());
    setMembers(await membersResponse.json());
    setPosts(await postsResponse.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setActiveTab(getTabFromHash());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData().catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, platform]);

  async function syncNow() {
    await fetch(`${API_BASE}/dashboard/sync`, { method: 'POST' });
    await loadData();
  }

  async function addMember(event) {
    event.preventDefault();
    setSaving(true);
    await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({
      name: '',
      partyRole: 'Campaign Volunteer',
      district: '',
      constituency: '',
      phone: '',
      email: '',
      instagramUsername: '',
      xUsername: '',
    });
    setSaving(false);
    await loadData();
  }

  async function mockConnect(memberId, platformToConnect) {
    await fetch(`${API_BASE}/members/${memberId}/mock-connect/${platformToConnect}`, {
      method: 'POST',
    });
    await loadData();
  }

  function exportCsv() {
    const header = [
      'Member',
      'District',
      'Constituency',
      'Platform',
      'Username',
      'Caption',
      'Posted At',
      'Likes',
      'Comments',
      'Shares',
      'Views',
    ];
    const rows = posts.map((post) => [
      post.memberName,
      post.district,
      post.constituency,
      post.platform,
      post.username,
      post.caption,
      post.postedAt,
      post.likeCount,
      post.commentCount,
      post.shareCount,
      post.viewCount,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'social-monitor-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const connectedPercent = useMemo(() => {
    if (!stats) return 0;
    const total = stats.connectedAccounts + stats.pendingAccounts;
    return total ? Math.round((stats.connectedAccounts / total) * 100) : 0;
  }, [stats]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, title: 'Official Social Activity Dashboard' },
    { id: 'members', label: 'Members', icon: Users, title: 'Party Members' },
    { id: 'add-member', label: 'Add Member', icon: Plus, title: 'Add Party Member' },
    { id: 'posts', label: 'Posts', icon: Activity, title: 'Social Posts' },
    { id: 'alerts', label: 'Alerts', icon: Bell, title: 'Alerts & Notifications' },
  ];
  const activeTitle = tabs.find((tab) => tab.id === activeTab)?.title || tabs[0].title;

  function openTab(tabId) {
    setActiveTab(tabId);
    window.location.hash = tabId;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div>
            <h1>Congress Tracker</h1>
            <p>Social media command center</p>
          </div>
        </div>
        <nav>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => openTab(tab.id)}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Monitoring 100 party members</p>
            <h2>{activeTitle}</h2>
          </div>
          <div className="actions">
            <button className="icon-button" title="Refresh data" onClick={loadData}>
              <RefreshCcw size={18} />
            </button>
            <button className="primary" onClick={syncNow}>
              <RefreshCcw size={17} /> Sync mock data
            </button>
          </div>
        </header>

        {loading && !stats ? (
          <div className="empty-state">Loading dashboard from Spring Boot...</div>
        ) : stats ? (
          <>
            {activeTab === 'dashboard' && (
              <>
                <section className="stat-grid">
                  <StatCard icon={<Users />} label="Members" value={stats.totalMembers} note="seeded and ready" />
                  <StatCard icon={<Activity />} label="Posts today" value={stats.postsToday} note={`${stats.postsThisWeek} this week`} />
                  <StatCard icon={<BarChart3 />} label="Connected accounts" value={stats.connectedAccounts} note={`${connectedPercent}% active`} />
                  <StatCard icon={<Bell />} label="Pending accounts" value={stats.pendingAccounts} note="awaiting OAuth" />
                </section>
                <DashboardPanels
                  stats={stats}
                  posts={posts}
                  query={query}
                  platform={platform}
                  setQuery={setQuery}
                  setPlatform={setPlatform}
                  exportCsv={exportCsv}
                  form={form}
                  updateForm={updateForm}
                  addMember={addMember}
                  saving={saving}
                />
              </>
            )}
            {activeTab === 'members' && (
              <MembersView
                members={members}
                form={form}
                updateForm={updateForm}
                addMember={addMember}
                saving={saving}
                mockConnect={mockConnect}
              />
            )}
            {activeTab === 'add-member' && (
              <AddMemberView
                form={form}
                updateForm={updateForm}
                addMember={addMember}
                saving={saving}
              />
            )}
            {activeTab === 'posts' && (
              <section className="workspace-grid">
                <PostsPanel
                  posts={posts}
                  query={query}
                  platform={platform}
                  setQuery={setQuery}
                  setPlatform={setPlatform}
                  exportCsv={exportCsv}
                  wide
                />
              </section>
            )}
            {activeTab === 'alerts' && <AlertsView notifications={stats.notifications} />}
          </>
        ) : (
          <div className="empty-state">Could not reach the Spring Boot API at {API_BASE}.</div>
        )}
      </section>
    </main>
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
}

function StatCard({ icon, label, value, note }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{Number(value).toLocaleString()}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}

function DashboardPanels({
  stats,
  posts,
  query,
  platform,
  setQuery,
  setPlatform,
  exportCsv,
  form,
  updateForm,
  addMember,
  saving,
}) {
  return (
    <section className="workspace-grid">
      <PostsPanel
        posts={posts}
        query={query}
        platform={platform}
        setQuery={setQuery}
        setPlatform={setPlatform}
        exportCsv={exportCsv}
        wide
      />

      <div className="panel">
        <div className="panel-header compact">
          <h3>Most Active</h3>
        </div>
        <RankingList rows={stats.mostActiveMembers} />
      </div>

      <div className="panel">
        <div className="panel-header compact">
          <h3>Needs Follow-up</h3>
        </div>
        <RankingList rows={stats.leastActiveMembers} quiet />
      </div>

      <div className="panel">
        <div className="panel-header compact">
          <h3>Platform Split</h3>
        </div>
        <PlatformBars platformPosts={stats.platformPosts} />
      </div>

      <AddMemberPanel
        form={form}
        updateForm={updateForm}
        addMember={addMember}
        saving={saving}
      />

      <NotificationsPanel notifications={stats.notifications} wide />
    </section>
  );
}

function PostsPanel({ posts, query, platform, setQuery, setPlatform, exportCsv, wide = false }) {
  return (
    <div className={wide ? 'panel wide' : 'panel'}>
      <div className="panel-header">
        <div>
          <h3>Recent Posts</h3>
          <p>Search by member, district, constituency, or username.</p>
        </div>
        <button className="secondary" onClick={exportCsv}>
          <Download size={17} /> Export CSV
        </button>
      </div>
      <div className="filters">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity"
          />
        </label>
        <label className="select-box">
          <Filter size={17} />
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="">All platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="X">X</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Platform</th>
              <th>Post</th>
              <th>Engagement</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <strong>{post.memberName}</strong>
                  <span>{post.district} / {post.constituency}</span>
                </td>
                <td><Badge value={post.platform} /></td>
                <td>
                  <strong>{post.caption}</strong>
                  <span>{formatDate(post.postedAt)} by @{post.username}</span>
                </td>
                <td>{post.engagement.toLocaleString()}</td>
                <td>{post.viewCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MembersView({ members, form, updateForm, addMember, saving, mockConnect }) {
  return (
    <section className="workspace-grid">
      <div className="panel wide">
        <div className="panel-header compact">
          <h3>Member Directory</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Location</th>
                <th>Instagram</th>
                <th>X</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const instagram = member.accounts.find((account) => account.platform === 'INSTAGRAM');
                const xAccount = member.accounts.find((account) => account.platform === 'X');
                return (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                      <span>{member.email || member.phone}</span>
                    </td>
                    <td>{member.partyRole}</td>
                    <td>
                      <strong>{member.district}</strong>
                      <span>{member.constituency}</span>
                    </td>
                    <td>
                      <AccountStatus
                        account={instagram}
                        memberId={member.id}
                        platform="INSTAGRAM"
                        label="Instagram"
                        onMockConnect={mockConnect}
                      />
                    </td>
                    <td>
                      <AccountStatus
                        account={xAccount}
                        memberId={member.id}
                        platform="X"
                        label="X/Twitter"
                        onMockConnect={mockConnect}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddMemberPanel
        form={form}
        updateForm={updateForm}
        addMember={addMember}
        saving={saving}
      />
    </section>
  );
}

function AlertsView({ notifications }) {
  return (
    <section className="workspace-grid">
      <NotificationsPanel notifications={notifications} wide />
    </section>
  );
}

function AddMemberView({ form, updateForm, addMember, saving }) {
  return (
    <section className="workspace-grid">
      <div className="panel wide">
        <div className="panel-header">
          <div>
            <h3>Add Member</h3>
            <p>Create a member and optionally add mock Instagram and X usernames.</p>
          </div>
        </div>
        <form className="member-form expanded" onSubmit={addMember}>
          <input required placeholder="Name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
          <input placeholder="Party role" value={form.partyRole} onChange={(event) => updateForm('partyRole', event.target.value)} />
          <input placeholder="District" value={form.district} onChange={(event) => updateForm('district', event.target.value)} />
          <input placeholder="Constituency" value={form.constituency} onChange={(event) => updateForm('constituency', event.target.value)} />
          <input placeholder="Phone" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
          <input placeholder="Email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
          <input placeholder="Instagram username" value={form.instagramUsername} onChange={(event) => updateForm('instagramUsername', event.target.value)} />
          <input placeholder="X/Twitter username" value={form.xUsername} onChange={(event) => updateForm('xUsername', event.target.value)} />
          <button className="primary form-submit" disabled={saving}>
            <Plus size={17} /> {saving ? 'Adding...' : 'Add member'}
          </button>
        </form>
      </div>
    </section>
  );
}

function AddMemberPanel({ form, updateForm, addMember, saving }) {
  return (
    <div className="panel">
      <div className="panel-header compact">
        <h3>Add Member</h3>
      </div>
      <form className="member-form" onSubmit={addMember}>
        <input required placeholder="Name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
        <input placeholder="District" value={form.district} onChange={(event) => updateForm('district', event.target.value)} />
        <input placeholder="Constituency" value={form.constituency} onChange={(event) => updateForm('constituency', event.target.value)} />
        <input placeholder="Instagram username" value={form.instagramUsername} onChange={(event) => updateForm('instagramUsername', event.target.value)} />
        <input placeholder="X username" value={form.xUsername} onChange={(event) => updateForm('xUsername', event.target.value)} />
        <button className="primary" disabled={saving}>
          <Plus size={17} /> {saving ? 'Adding...' : 'Add member'}
        </button>
      </form>
    </div>
  );
}

function NotificationsPanel({ notifications, wide = false }) {
  return (
    <div className={wide ? 'panel wide' : 'panel'}>
      <div className="panel-header compact">
        <h3>Alerts</h3>
      </div>
      <div className="notifications">
        {notifications.map((notification) => (
          <article key={notification.id}>
            <Bell size={17} />
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PlatformBars({ platformPosts }) {
  return (
    <div className="platform-bars">
      {Object.entries(platformPosts).map(([name, count]) => (
        <div key={name}>
          <div className="bar-label"><span>{name}</span><strong>{count}</strong></div>
          <div className="bar-track">
            <div style={{ width: `${Math.min(100, count)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountStatus({ account, memberId, platform, label, onMockConnect }) {
  if (!account) {
    return (
      <div className="account-cell">
        <span className="status-pill missing">Not added</span>
        <button className="mini-action" type="button" onClick={() => onMockConnect(memberId, platform)}>
          Mock connect {label}
        </button>
      </div>
    );
  }

  return (
    <div className="account-cell">
      <span className={`status-pill ${account.status.toLowerCase().replace('_', '-')}`}>
        @{account.username} / {account.status.replace('_', ' ')}
      </span>
      {account.status !== 'CONNECTED' && (
        <button className="mini-action" type="button" onClick={() => onMockConnect(memberId, platform)}>
          Mock connect {label}
        </button>
      )}
    </div>
  );
}

function Badge({ value }) {
  return <span className={`badge ${value.toLowerCase()}`}>{value}</span>;
}

function RankingList({ rows, quiet = false }) {
  return (
    <div className="ranking-list">
      {rows.map((row, index) => (
        <article key={row.memberId}>
          <div className={quiet ? 'rank quiet' : 'rank'}>{index + 1}</div>
          <div>
            <strong>{row.memberName}</strong>
            <span>{row.postCount} posts / {row.engagement.toLocaleString()} engagement</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

createRoot(document.getElementById('root')).render(<App />);
