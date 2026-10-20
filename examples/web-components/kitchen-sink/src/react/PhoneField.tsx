import type { TelixonPhoneChangeDetail, TelixonPhoneFieldElement } from '@telixon/web-components';
import type {} from '@telixon/web-components/react';
import { useEffect, useRef, useState } from 'react';

export function PhoneField() {
  const field = useRef<TelixonPhoneFieldElement>(null);
  const [value, setValue] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState('none');

  // A hydrated page gets its listeners from an effect, since React 19 adds none while it hydrates.
  useEffect(() => {
    const element = field.current;
    if (element === null) return;
    const onChange = (event: CustomEvent<TelixonPhoneChangeDetail>): void => setValue(event.detail.value);
    element.addEventListener('telixon-change', onChange);
    // A field that went live before the effect ran holds its value already.
    setValue(element.value);
    return () => element.removeEventListener('telixon-change', onChange);
  }, []);

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
        ref={field}
        name="phone"
        default-region="US"
        calling-code-in-input="false"
        auto-placeholder
        required
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
