import styled, { css } from 'styled-components';
import { Bar, Cell, CellMain, Names, TRow } from '@/components/ui';

/** Column layout shared by the head, body and foot of the holdings table. */
export const assetsGrid = css`
  grid-template-columns: minmax(210px, 2.2fr) 140px minmax(72px, .6fr) repeat(3, minmax(96px, 1fr)) minmax(116px, 1fr) minmax(128px, 1fr) 112px;
  min-width: 1080px;
`;

export const Container = styled(TRow)<{ $group: boolean; $child: boolean }>`
  ${assetsGrid}
  ${(p) => p.$group && css`cursor: pointer;`}
  ${(p) => p.$child && css`
    padding-top: 8px; padding-bottom: 8px;
    ${CellMain} { padding-left: 34px; }
    ${Names} > b { font-weight: 500; }
  `}
`;

export const Expander = styled.button`
  display: grid; place-items: center; width: 24px; height: 24px; margin: 0 -6px 0 -4px; padding: 0; border: 0; border-radius: 8px;
  background: none; color: var(--muted); cursor: pointer; flex-shrink: 0;
  &:hover { background: var(--surface-2); color: var(--text); }
  svg { transition: transform .15s; }
  &[aria-expanded="true"] svg { transform: rotate(90deg); }
`;

/** Class picker that looks like a chip: a colored dot on the left, a caret on the right (both background images). */
export const ClassSelect = styled.select`
  appearance: none; -webkit-appearance: none; border: 1px solid transparent; cursor: pointer; max-width: 100%;
  font-size: 12px; font-weight: 600; background: var(--surface-2); color: var(--text); padding: 4px 24px 4px 22px; border-radius: 999px;
  background-repeat: no-repeat, no-repeat; background-position: 9px center, right 8px center; background-size: 8px 8px, 10px;
  &:hover, &:focus { border-color: var(--border); outline: none; }
  option { background: var(--surface); color: var(--text); }
`;

/** Class picker over the segment picker. */
export const ClassCell = styled.div.attrs({ role: 'cell' })`display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0;`;
export const SegmentSelect = styled(ClassSelect)`
  font-weight: 500; color: var(--muted); background-color: transparent; padding-top: 2px; padding-bottom: 2px;
`;

export const MutedCell = styled(Cell)`color: var(--muted);`;
export const BalanceCell = styled(Cell)`font-weight: 600;`;
export const ResultCell = styled.div.attrs({ role: 'cell' })`display: flex; flex-direction: column; align-items: flex-end; gap: 3px;`;
export const WeightCell = styled.div.attrs({ role: 'cell' })`
  display: flex; align-items: center; gap: 8px;
  ${Bar} { flex: 1; }
  & > span { font-size: 12px; font-weight: 600; width: 42px; text-align: right; }
`;
