import { defineTelixonElements } from '@telixon/web-components';
import '@telixon/web-components/flags/flags.css';
import type {} from '@telixon/web-components/vue';
import { createApp } from 'vue';
import PhoneField from './PhoneField.vue';

defineTelixonElements();

createApp(PhoneField).mount('#app');
