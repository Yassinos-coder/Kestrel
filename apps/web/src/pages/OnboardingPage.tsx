import { useMutation } from '@tanstack/react-query';
import { Brain, FlaskConical, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorNote } from '@/components/ui/ErrorNote';
import { cn } from '@/lib/cn';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const BALANCE_OPTIONS = [1, 5, 10, 25, 50];

interface OnboardingForm {
  displayName: string;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [balance, setBalance] = useState(10);
  const { register, handleSubmit, formState } = useForm<OnboardingForm>({ mode: 'onChange', defaultValues: { displayName: '' } });

  const onboard = useMutation({
    mutationFn: (values: OnboardingForm) => authService.completeOnboarding(values.displayName, balance),
    onSuccess: (user) => {
      setUser(user);
      navigate('/', { replace: true });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome to Kestrel</h1>
        <p className="mt-2 text-muted-foreground">Two quick answers and you are set. You start in paper mode with simulated money.</p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit((values) => onboard.mutate(values))} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="text-sm font-semibold">
                What should we call you?
              </label>
              <input
                id="displayName"
                autoFocus
                maxLength={40}
                className="mt-2 h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-ring"
                placeholder="Your name"
                {...register('displayName', { required: true, maxLength: 40, validate: (value) => value.trim().length > 0 })}
              />
            </div>

            <div>
              <p className="text-sm font-semibold">Paper money to start with</p>
              <p className="text-sm text-muted-foreground">Simulated SOL used to test the bot with real market data. You can go live later from the Wallet page.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BALANCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setBalance(option)}
                    className={cn('rounded-lg border px-4 py-2 text-sm font-semibold transition', balance === option ? 'border-foreground/60 bg-accent text-accent-foreground' : 'hover:bg-muted')}
                  >
                    {option} SOL
                  </button>
                ))}
              </div>
            </div>

            <ul className="space-y-3 rounded-lg bg-muted p-4 text-sm">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                Every token must pass a ten rule safety checklist before the bot may buy.
              </li>
              <li className="flex gap-3">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                The AI owns the rules. Each night it reviews its trades, keeps what worked and tightens what did not.
              </li>
              <li className="flex gap-3">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                Nothing risks real money until you switch to live mode yourself.
              </li>
            </ul>

            <ErrorNote error={onboard.error} />
            <Button type="submit" size="lg" className="w-full" disabled={onboard.isPending || !formState.isValid}>
              {onboard.isPending ? 'Setting up…' : 'Enter the dashboard'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
