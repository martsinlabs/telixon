<script setup lang="ts">
import type { TelixonPhoneChangeDetail } from '@telixon/web-components';
import { ref } from 'vue';

const value = ref<string | null>(null);
const submitted = ref('none');

function onChange(event: CustomEvent<TelixonPhoneChangeDetail>): void {
  value.value = event.detail.value;
}

function onSubmit(event: Event): void {
  if (event.currentTarget instanceof HTMLFormElement) {
    submitted.value = String(new FormData(event.currentTarget).get('phone'));
  }
}
</script>

<template>
  <form id="contact" @submit.prevent="onSubmit">
    <label for="phone-input">Phone</label>
    <telixon-phone-field
      name="phone"
      default-region="US"
      calling-code-in-input="false"
      auto-placeholder
      required
      @telixon-change="onChange"
    >
      <telixon-region-picker></telixon-region-picker>
      <input id="phone-input" type="tel" autocomplete="tel" />
    </telixon-phone-field>
    <button>Save</button>
    <p>
      Value: <output id="value">{{ value ?? 'null' }}</output>
    </p>
    <p>
      Submitted: <output id="submitted">{{ submitted }}</output>
    </p>
  </form>
</template>
