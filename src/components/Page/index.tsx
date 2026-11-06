// Every page: title, its own actions, theme and sync buttons, the error banner, then the content.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ICON } from '@/lib/icons';
import { showError, toast, toggleTheme, useStore, waitForSync } from '@/store';
import { Button, Notice } from '@/components/ui';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

interface PageProps {
  title: string;
  sub: ReactNode;
  /** Page-specific controls next to the theme and sync buttons. */
  actions?: ReactNode;
  children: ReactNode;
}

export function Page({ title, sub, actions, children }: PageProps) {
  useEffect(() => { document.title = `${title} · Sietch`; }, [title]);
  return (
    <Styled.Container>
      <Styled.Head>
        <Styled.Titles>
          <Styled.Sub>{sub}</Styled.Sub>
          <Styled.Title>{title}</Styled.Title>
        </Styled.Titles>
        <Styled.Actions>
          {actions && <Styled.Actions>{actions}</Styled.Actions>}
          <ThemeButton />
          <SyncButton />
        </Styled.Actions>
      </Styled.Head>
      <ErrorNotice />
      <Styled.View>{children}</Styled.View>
    </Styled.Container>
  );
}

function ThemeButton() {
  const dark = useStore((s) => s.dark);
  return (
    <Button $icon onClick={toggleTheme} aria-label="Alternar tema claro ou escuro">
      <Icon d={dark ? ICON.sun : ICON.moon} />
    </Button>
  );
}

function SyncButton() {
  const configured = useStore((s) => Boolean(s.status?.configured));
  const portfolio = useStore((s) => s.portfolio);
  const [busy, setBusy] = useState(false);
  if (!configured || !portfolio?.connections.length) return null;

  const sync = async () => {
    setBusy(true);
    try {
      await api.post('/sync');
      toast('Sincronização solicitada à Pluggy…');
      await waitForSync(portfolio.connections.map((c) => c.id));
    } catch (err) {
      showError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button $variant="primary" $spinning={busy} disabled={busy} onClick={sync}>
      <Icon d={ICON.sync} />
      Sincronizar
    </Button>
  );
}

function ErrorNotice() {
  const error = useStore((s) => s.error);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (error) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);
  return <Notice ref={ref} $error role="alert" hidden={!error}>{error}</Notice>;
}
