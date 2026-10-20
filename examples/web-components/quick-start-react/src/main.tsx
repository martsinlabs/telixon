import { defineTelixonElements } from '@telixon/web-components';
import '@telixon/web-components/flags/flags.css';
import { createRoot } from 'react-dom/client';
import { PhoneField } from './PhoneField';

defineTelixonElements();

const root = document.getElementById('root');
if (root === null) throw new Error('The page lacks the root.');
createRoot(root).render(<PhoneField />);
