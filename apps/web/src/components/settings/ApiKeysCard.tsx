import { useState } from 'react';
import type { ApiKeyView, CreatedApiKey } from '@kestrel/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';

interface ApiKeysCardProps {
  keys: ApiKeyView[];
  created: CreatedApiKey | null;
  creating: boolean;
  revoking: boolean;
  error: unknown;
  onCreate: (name: string) => void;
  onRevoke: (id: string) => void;
}

export function ApiKeysCard({ keys, created, creating, revoking, error, onCreate, onRevoke }: ApiKeysCardProps) {
  const [name, setName] = useState('');

  return (
    <Card className="space-y-4">
      <CardHeader
        title="API keys"
        description="Send the key as Authorization: Bearer <key> to run the bot from scripts and automations. A key can do everything you can, except manage keys."
      />

      {created && (
        <div className="space-y-1 rounded-md border border-border p-3">
          <p className="text-sm font-medium">Copy your new key now, it will not be shown again.</p>
          <code className="block break-all text-xs">{created.key}</code>
        </div>
      )}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onCreate(name.trim());
          setName('');
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          placeholder="Key name, e.g. n8n automation"
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create key'}
        </Button>
      </form>

      {keys.length === 0 && <p className="text-sm text-muted-foreground">No API keys yet.</p>}
      <ul className="space-y-2">
        {keys.map((key) => (
          <li key={key.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{key.name}</p>
              <p className="text-xs text-muted-foreground">
                <code>{key.prefix}…</code> · {key.lastUsedAt ? `used ${new Date(key.lastUsedAt).toLocaleString()}` : 'never used'}
              </p>
            </div>
            <Button variant="ghost" disabled={revoking} onClick={() => onRevoke(key.id)}>
              Revoke
            </Button>
          </li>
        ))}
      </ul>

      <ErrorNote error={error} />
    </Card>
  );
}
