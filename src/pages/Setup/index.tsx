// Shown until the server has working Pluggy credentials.
import { useStore } from '@/store';
import { Notice } from '@/components/ui';
import { Page } from '@/components/Page';

export function SetupPage() {
  const rejected = useStore((s) => Boolean(s.status?.configured && s.status.authError));
  return (
    <Page title="Bem-vindo ao Sietch" sub="Configuração">
      <Notice $error={rejected}>
        <h2>{rejected ? 'A Pluggy recusou as credenciais' : 'Conectar a Pluggy'}</h2>
        <p>
          {rejected
            ? <>O <b>Client ID</b> ou o <b>Client Secret</b> no arquivo <code>.env</code> não é válido, então não dá para abrir a janela de conexão. Confira se os dois são da <b>mesma aplicação</b> e se o secret não foi regenerado.</>
            : 'O servidor ainda não tem credenciais da Pluggy.'}
        </p>
        <ol>
          <li>Abra <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener">dashboard.pluggy.ai</a> → sua aplicação → copie o <b>Client ID</b> e o <b>Client Secret</b> (não a API key).</li>
          <li>Cole os dois no arquivo <code>.env</code> na pasta do projeto.</li>
          <li>Reinicie o servidor (<code>Ctrl+C</code> e depois <code>yarn start</code>) e recarregue esta página.</li>
        </ol>
      </Notice>
    </Page>
  );
}
