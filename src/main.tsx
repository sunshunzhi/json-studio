import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Workspace } from './workspace/Workspace';
import './styles/base.css';
import './styles/workspace.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Workspace />
  </StrictMode>,
);
