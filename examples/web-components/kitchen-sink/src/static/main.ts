import { defineTelixonElements } from '@telixon/web-components';
import '@telixon/web-components/flags/flags.css';

defineTelixonElements();

const form = document.querySelector<HTMLFormElement>('#contact');
const field = document.querySelector('telixon-phone-field');
const value = document.querySelector<HTMLOutputElement>('#value');
const submitted = document.querySelector<HTMLOutputElement>('#submitted');
if (form === null || field === null || value === null || submitted === null)
  throw new Error('The page lacks the form or its outputs.');

field.addEventListener('telixon-change', (event) => {
  value.value = String(event.detail.value);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitted.value = String(new FormData(form).get('phone'));
});
