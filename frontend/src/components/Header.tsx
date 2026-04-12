import { useData } from '../hooks/useData'
import { useRefresh } from '../hooks/useRefresh'

export default function Header() {
  const { data } = useData()
  const refresh = useRefresh()

  const refreshedAt = data?.snapshot.refreshedAt
    ? new Date(data.snapshot.refreshedAt).toLocaleTimeString()
    : null

  return (
    <div style={{ background: 'linear-gradient(135deg,#fff 0%,#f0f4ff 50%,#fdf2f8 100%)', borderBottom: '1px solid #e5e7eb' }} className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', margin: 0 }}>
                Glow Fashion Idol
              </h1>
              <span style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
                Multiplayer Services
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              Cross-project status — GGS / CLPLG / SST2
            </p>
          </div>
          <div className="flex items-center gap-3">
            {refreshedAt && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{refreshedAt}</span>
            )}
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              style={{
                background: refresh.isPending
                  ? '#e0e7ff'
                  : 'linear-gradient(135deg,#7c3aed,#db2777)',
                color: refresh.isPending ? '#6366f1' : '#fff',
                border: 'none',
                cursor: refresh.isPending ? 'wait' : 'pointer',
                borderRadius: 12,
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: refresh.isPending ? 'none' : '0 4px 14px rgba(124,58,237,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={refresh.isPending ? { display: 'inline-block', animation: 'spin 1s linear infinite' } : {}}>
                ⟳
              </span>
              {refresh.isPending ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Refresh status banners */}
        {refresh.isPending && (
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 20 }}>⟳</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>Refreshing JIRA + Slack data...</div>
              <div style={{ fontSize: 12, color: '#6366f1' }}>Fetching from Atlassian and Slack via API</div>
            </div>
          </div>
        )}
        {refresh.isError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Refresh failed</div>
              <div style={{ fontSize: 12, color: '#b91c1c' }}>{refresh.error?.message}</div>
            </div>
            <button
              onClick={() => refresh.reset()}
              style={{ background: '#fee2e2', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
