import styled from 'styled-components';
import { media } from '@/styles/media';

export const Container = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px;
  ${media.phone} { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
`;
export const Card = styled.button`
  background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: var(--shadow); min-width: 0; text-align: left; font: inherit; color: inherit; cursor: pointer;
  &:hover { border-color: var(--muted); }
  &[aria-pressed="true"] { outline: 2px solid var(--accent); outline-offset: -1px; }
  ${media.phone} { padding: 14px; }
`;
export const Top = styled.div`display: flex; align-items: center; gap: 10px;`;
export const Names = styled.div`
  display: flex; flex-direction: column; min-width: 0;
  & > b, & > small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  & > b { font-size: 15px; font-weight: 600; }
  & > small { font-size: 12px; color: var(--muted); }
`;
export const Body = styled.div`display: flex; flex-direction: column; gap: 8px;`;
export const Value = styled.span`
  font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
  ${media.phone} { font-size: 18px; }
`;
export const Meta = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: var(--muted);`;
export const SparkEmpty = styled.div`height: 44px; display: flex; align-items: flex-end; font-size: 12px; color: var(--muted);`;
