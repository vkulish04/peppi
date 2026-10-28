import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { LogoIntro } from './components/LogoIntro';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogoIntro><App /></LogoIntro>
  </StrictMode>,
);
