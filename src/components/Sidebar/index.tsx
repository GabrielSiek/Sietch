import { connectionStatus } from '@/lib/categories';
import { relativeTime } from '@/lib/format';
import type { Route } from '@/lib/hooks';
import { ICON } from '@/lib/icons';
import { useStore } from '@/store';
import { Muted, Swatch } from '@/components/ui';
import { Icon } from '@/components/Icon';
import * as Styled from './styles';

const LINKS: [Route, string, string][] = [
  ['investimentos', 'Investimentos', ICON.chart],
  ['gastos', 'Gastos', ICON.caixa],
  ['metas', 'Metas', ICON.target],
  ['contas', 'Contas conectadas', ICON.link],
  ['configuracoes', 'Configurações', ICON.sliders],
];

export function Sidebar({ route }: { route: Route }) {
  return (
    <Styled.Container>
      <Styled.Brand>
        <Styled.BrandMark><Icon d={ICON.brand} size={20} strokeWidth={2.2} /></Styled.BrandMark>
        <Styled.BrandName>Sietch</Styled.BrandName>
      </Styled.Brand>
      <Styled.Nav aria-label="Principal">
        <Styled.NavTitle>Menu</Styled.NavTitle>
        {LINKS.map(([key, label, icon]) => (
          <Styled.NavLink key={key} href={`#/${key}`} aria-current={key === route ? 'page' : undefined}>
            <Icon d={icon} size={20} />
            {label}
          </Styled.NavLink>
        ))}
      </Styled.Nav>
      <Connections />
    </Styled.Container>
  );
}

function Connections() {
  const conns = useStore((s) => s.portfolio?.connections);
  if (!conns?.length) return null;
  const latest = conns.map((c) => c.lastUpdatedAt).filter((d): d is string => Boolean(d)).sort().at(-1);
  return (
    <Styled.ConnBox>
      <Styled.ConnHead><b>Conexões Pluggy</b><Muted>{latest ? relativeTime(latest) : ''}</Muted></Styled.ConnHead>
      {conns.map((c) => {
        const [tone, label] = connectionStatus(c);
        return (
          <Styled.ConnRow key={c.id} href="#/contas">
            <Swatch as="span" $kind="round" $color={`--${tone}`} />
            <Styled.ConnName>{c.connector}</Styled.ConnName>
            <Styled.ConnStatus $tone={tone}>{label}</Styled.ConnStatus>
          </Styled.ConnRow>
        );
      })}
    </Styled.ConnBox>
  );
}
