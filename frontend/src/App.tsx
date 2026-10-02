import { useEffect, useState } from 'react'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(
  /\/$/,
  '',
)

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; body: string }
  | { kind: 'error'; message: string }

function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${apiBaseUrl}/api/health`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.text()).trim()
        if (!response.ok) {
          throw new Error(`${response.status} ${body}`)
        }
        setHealth({ kind: 'ok', body })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        const message = error instanceof Error ? error.message : 'unknown error'
        setHealth({ kind: 'error', message })
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>メモアプリ</h1>
      <p>ローカル開発用のフロントエンドです。API のベース URL は環境変数から読みます。</p>
      <dl>
        <div>
          <dt>API base URL</dt>
          <dd>
            <code>{apiBaseUrl}</code>
          </dd>
        </div>
        <div>
          <dt>GET /api/health</dt>
          <dd>
            {health.kind === 'loading' && '確認中…'}
            {health.kind === 'ok' && <code>{health.body}</code>}
            {health.kind === 'error' && <span className="error">{health.message}</span>}
          </dd>
        </div>
      </dl>
    </main>
  )
}

export default App
