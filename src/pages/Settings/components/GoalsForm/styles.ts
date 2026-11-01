import styled from 'styled-components';
import { Card } from '@/components/ui';
import { media } from '@/styles/media';

export const Container = styled(Card)``;
export const Sum = styled.span<{ $warn: boolean }>`color: var(${(p) => (p.$warn ? '--warn' : '--pos')});`;
export const AllocGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px;`;
export const ClassLabel = styled.label`display: flex; align-items: center; gap: 8px;`;
export const ClassBlock = styled.div`display: flex; flex-direction: column; gap: 10px; padding: 14px 0; border-top: 1px solid var(--border); font-size: 13px;`;
export const BlockHead = styled.div`display: flex; align-items: center; gap: 8px; font-size: 14px; & > ${Sum} { margin-left: auto; font-size: 12px; }`;
export const SegRow = styled.div<{ $split: boolean }>`
  display: grid; grid-template-columns: ${(p) => (p.$split ? '150px 110px 1fr' : '150px 1fr')}; align-items: center; gap: 10px;
  ${media.phone} { grid-template-columns: ${(p) => (p.$split ? '1fr 96px' : '1fr')}; & > :last-child { grid-column: 1 / -1; } }
`;
