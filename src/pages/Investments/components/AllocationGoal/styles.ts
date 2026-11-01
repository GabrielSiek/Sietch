import styled from 'styled-components';
import { Card, Chip, Swatch } from '@/components/ui';

export const Container = styled(Card)`flex: 2 1 520px;`;

export const CurrentKey = styled(Swatch)`width: 18px; height: 8px; border-radius: 999px; background: var(--muted);`;
export const TargetKey = styled(Swatch)`width: 3px; height: 14px; border-radius: 2px; background: var(--text);`;

export const AllocRow = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; padding: 14px 0; border-top: 1px solid var(--border);
`;
export const Label = styled.div`
  flex: 0 0 150px; display: flex; flex-direction: column; gap: 2px;
  & > b { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Track = styled.div`flex: 1 1 200px; position: relative; height: 10px; border-radius: 999px; background: var(--surface-2);`;
export const Current = styled.div`position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px;`;
export const Target = styled.div`position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--text);`;
export const Nums = styled.span`min-width: 104px; text-align: right; font-size: 14px;`;
export const GapChip = styled(Chip)`min-width: 84px; text-align: center;`;

export const Suggest = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 18px; background: var(--accent-soft); margin-top: auto;
`;
export const SuggestTitle = styled.b`color: var(--accent);`;
export const Items = styled.div`display: flex; flex-wrap: wrap; gap: 10px;`;
export const Item = styled.div`
  flex: 1 1 240px; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 14px; background: var(--surface);
  font-size: 14px;
`;
export const ItemHead = styled.div`display: flex; align-items: center; gap: 10px; font-weight: 600;`;
export const ItemLabel = styled.span`flex: 1;`;
export const SegLine = styled.div`display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border);`;
export const SegName = styled.span`
  display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
  & > :last-child { margin-left: auto; font-weight: 500; }
`;
export const Picks = styled.div`display: flex; flex-wrap: wrap; gap: 6px;`;
export const PickChip = styled.span`
  display: inline-flex; align-items: baseline; gap: 6px; padding: 4px 10px; border-radius: 999px; background: var(--surface-2); font-size: 13px;
  & > span { font-size: 12px; }
`;
