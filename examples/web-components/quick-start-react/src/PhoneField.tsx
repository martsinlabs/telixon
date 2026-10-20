import type {} from '@telixon/web-components/react';
import { useState } from 'react';

export function PhoneField() {
  const [value, setValue] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState('none');

  return (
    <form
      id="contact"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(String(new FormData(event.currentTarget).get('phone')));
      }}
    >
      <label htmlFor="phone-input">Phone</label>
      <telixon-phone-field
        name="phone"
        default-region="US"
        calling-code-in-input="false"
        auto-placeholder
        required
        ontelixon-change={(event) => setValue(event.detail.value)}
      >
        <telixon-region-picker />
        <input id="phone-input" type="tel" autoComplete="tel" />
      </telixon-phone-field>
      <button>Save</button>
      <p>
        Value: <output id="value">{value ?? 'null'}</output>
      </p>
      <p>
        Submitted: <output id="submitted">{submitted}</output>
      </p>
    </form>
  );
}
