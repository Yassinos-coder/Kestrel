import type { TelegramStatus } from '@kestrel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';

interface TelegramCardProps {
  status: TelegramStatus;
  waiting: boolean;
  connecting: boolean;
  testing: boolean;
  testSent: boolean;
  weeklyPending: boolean;
  weeklySent: boolean;
  disconnecting: boolean;
  error: unknown;
  onConnect: () => void;
  onTest: () => void;
  onWeekly: () => void;
  onDisconnect: () => void;
}

export function TelegramCard({ status, waiting, connecting, testing, testSent, weeklyPending, weeklySent, disconnecting, error, onConnect, onTest, onWeekly, onDisconnect }: TelegramCardProps) {
  if (!status.configured) {
    return (
      <Card>
        <CardHeader title="Telegram alerts" description="The server has no Telegram bot yet." />
        <p className="text-sm text-muted-foreground">
          Create a bot with @BotFather on Telegram, then put its token in TELEGRAM_BOT_TOKEN in the server .env file and restart the server.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Telegram alerts"
        description="Get a message for every buy, sell, low balance warning and nightly review."
        action={status.linked ? <Badge tone="success">Connected</Badge> : <Badge>Not connected</Badge>}
      />

      {!status.linked && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Press the button, Telegram opens {status.botUsername ? `@${status.botUsername}` : 'your bot'}, then tap <strong>Start</strong>. That is the whole setup.
          </p>
          <Button disabled={connecting || waiting} onClick={onConnect}>
            {waiting ? 'Waiting for you to press Start…' : connecting ? 'Opening Telegram…' : 'Connect Telegram'}
          </Button>
          {waiting && <p className="text-xs text-muted-foreground">This page updates by itself as soon as the bot sees your Start.</p>}
        </div>
      )}

      {status.linked && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={testing} onClick={onTest}>
            {testing ? 'Sending…' : 'Send test message'}
          </Button>
          <Button variant="secondary" disabled={weeklyPending} onClick={onWeekly}>
            {weeklyPending ? 'Building…' : 'Preview weekly report'}
          </Button>
          <Button variant="ghost" disabled={disconnecting} onClick={onDisconnect}>
            Disconnect
          </Button>
          {(testSent || weeklySent) && <span className="text-sm text-success">Sent. Check your Telegram.</span>}
        </div>
      )}

      <ErrorNote error={error} />
    </Card>
  );
}
