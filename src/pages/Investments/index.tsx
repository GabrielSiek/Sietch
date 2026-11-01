// Investimentos view: growth, distribution, class cards, goals, income, highlights, holdings.
import { useEffect, useMemo } from 'react';
import type { CategoryKey } from '@shared/types';
import { ASSET_CLASSES } from '@/lib/categories';
import { useSessionState } from '@/lib/hooks';
import { useStore } from '@/store';
import { Notice, Row } from '@/components/ui';
import { Page } from '@/components/Page';
import { SearchField } from '@/components/SearchField';
import { derive, type ClassFilter } from './derive';
import { Hero } from './components/Hero';
import { Distribution } from './components/Distribution';
import { ClassCards } from './components/ClassCards';
import { Goals } from './components/Goals';
import { Income } from './components/Income';
import { Movers } from './components/Movers';
import { Holdings } from './components/Holdings';

export function InvestmentsPage({ focusGoals }: { focusGoals: boolean }) {
  const p = useStore((s) => s.portfolio);
  const settings = useStore((s) => s.settings);
  const [search, setSearch] = useSessionState('inv.search', '');
  const [filter, setFilter] = useSessionState<ClassFilter>('inv.filter', 'ALL');
  const d = useMemo(() => (p ? derive(p) : null), [p]);
  const ready = Boolean(p?.connections.length);

  useEffect(() => {
    if (focusGoals && ready) document.getElementById('metas')?.scrollIntoView({ block: 'start' });
  }, [focusGoals, ready]);

  if (!p || !d) return null;
  const updated = new Date(p.generatedAt);
  const sub = `Atualizado hoje às ${updated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  if (!ready) {
    return (
      <Page title="Investimentos" sub={sub}>
        <Notice>
          <h2>Nenhuma conta conectada</h2>
          <p>Conecte um banco ou corretora em <a href="#/contas">Contas conectadas</a>. Para testar, use o <b>Pluggy Bank</b> com <code>user-ok</code> / <code>password-ok</code>.</p>
        </Notice>
      </Page>
    );
  }

  const present = ASSET_CLASSES.filter((k) => d.classes[k].count > 0);
  // A filter for a class you no longer hold shows everything.
  const active: ClassFilter = filter !== 'ALL' && !present.includes(filter) ? 'ALL' : filter;
  // Picking a class narrows the overview (patrimônio and distribuição) and the holdings table to it.
  const toggleClass = (k: CategoryKey) => {
    setFilter(active === k ? 'ALL' : k);
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <Page
      title="Investimentos"
      sub={sub}
      actions={<SearchField label="Buscar ativo" placeholder="Buscar ativo" value={search} onChange={setSearch} />}
    >
      <Row id="overview"><Hero p={p} d={d} filter={active} /><Distribution d={d} filter={active} onClear={() => setFilter('ALL')} /></Row>
      <ClassCards p={p} d={d} filter={active} onToggle={toggleClass} targets={settings.goals.allocation ?? {}} />
      <Goals p={p} d={d} goals={settings.goals} />
      <Row><Income p={p} /><Movers d={d} /></Row>
      <Holdings d={d} filter={active} onFilter={setFilter} search={search} present={present} />
    </Page>
  );
}
