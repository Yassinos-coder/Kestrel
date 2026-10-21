import { useHealthQuery } from '@/hooks/useHealthQueries';

export function App() {
  const { data, isError, isPending } = useHealthQuery();

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Kestrel</h1>
      {isPending && <p>Connecting to server…</p>}
      {isError && <p>Server unreachable</p>}
      {data && <p>Server {data.status}, up {data.uptimeSeconds}s</p>}
    </main>
  );
}
