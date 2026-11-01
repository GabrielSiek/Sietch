import styled from 'styled-components';
import { Card, Empty } from '@/components/ui';

export const Container = styled(Card)``;
export const Progress = styled.div`display: flex; align-items: center; gap: 20px;`;
export const Ring = styled.div`position: relative; width: 112px; height: 112px; flex-shrink: 0;`;
export const RingHole = styled.div`
  position: absolute; inset: 12px; border-radius: 50%; display: grid; place-items: center;
  font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
`;
export const Figures = styled.div`display: flex; flex-direction: column; gap: 4px; min-width: 0;`;
export const Amount = styled.b`font-size: 24px; letter-spacing: -0.02em;`;
export const Left = styled.b`font-size: 13px;`;
export const NoneYet = styled(Empty)`border-top: 1px solid var(--border); padding-top: 12px;`;
export const History = styled.div`display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border);`;
export const Months = styled.div`display: flex; gap: 6px;`;
export const Month = styled.div`
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
  & > span { font-size: 11px; color: var(--muted); }
`;
export const MonthBar = styled.div<{ $current: boolean }>`
  width: 100%; height: 22px; border-radius: 7px;
  ${(p) => p.$current && 'box-shadow: inset 0 0 0 2px var(--accent);'}
`;
