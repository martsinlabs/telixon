import { defineTelixonElements } from '@telixon/web-components';
import '@telixon/web-components/flags/flags.css';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

defineTelixonElements();

const root = document.getElementById('root');
if (root === null) throw new Error('The page lacks the root.');
hydrateRoot(root, <App />);
