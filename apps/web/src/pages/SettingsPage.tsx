import { TelegramCard } from '@/components/settings/TelegramCard';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { useTelegram } from '@/hooks/useTelegram';

export function SettingsPage() {
  const { status, connect, sendTest, sendWeekly, disconnect, waiting } = useTelegram();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">How the desk reaches you.</p>
      </div>

      {status.isPending && <p className="text-muted-foreground">Loading…</p>}
      {status.error && <ErrorNote error={status.error} />}
      {status.data && (
        <TelegramCard
          status={status.data}
          waiting={waiting}
          connecting={connect.isPending}
          testing={sendTest.isPending}
          testSent={sendTest.isSuccess}
          weeklyPending={sendWeekly.isPending}
          weeklySent={sendWeekly.isSuccess}
          disconnecting={disconnect.isPending}
          error={connect.error ?? sendTest.error ?? sendWeekly.error ?? disconnect.error}
          onConnect={() => connect.mutate()}
          onTest={() => sendTest.mutate()}
          onWeekly={() => sendWeekly.mutate()}
          onDisconnect={() => disconnect.mutate()}
        />
      )}
    </div>
  );
}
