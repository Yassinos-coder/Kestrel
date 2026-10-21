import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { telegramService } from '@/services/telegramService';

const LINK_POLL_MS = 3_000;
const WAIT_LIMIT_MS = 5 * 60 * 1000;

export function useTelegram() {
  const queryClient = useQueryClient();
  const [waitingSince, setWaitingSince] = useState<number | null>(null);

  const status = useQuery({
    queryKey: ['telegram'],
    queryFn: () => telegramService.status(),
    refetchInterval: waitingSince ? LINK_POLL_MS : false,
  });

  useEffect(() => {
    if (!waitingSince) return;
    if (status.data?.linked || Date.now() - waitingSince > WAIT_LIMIT_MS) setWaitingSince(null);
  }, [status.data, waitingSince]);

  const connect = useMutation({
    mutationFn: () => telegramService.createLink(),
    onSuccess: (result) => {
      if (result.linkUrl) window.open(result.linkUrl, '_blank', 'noopener');
      setWaitingSince(Date.now());
    },
  });

  const sendTest = useMutation({ mutationFn: () => telegramService.sendTest() });

  const disconnect = useMutation({
    mutationFn: () => telegramService.disconnect(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram'] }),
  });

  return { status, connect, sendTest, disconnect, waiting: waitingSince !== null };
}
