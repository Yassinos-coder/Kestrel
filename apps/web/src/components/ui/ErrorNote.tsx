export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>;
}
