import { Service, resource } from '@angular/core';
import {
  applyEach,
  disabled,
  email,
  hidden,
  maxLength,
  minLength,
  pattern,
  required,
  validate,
  validateAsync,
  type SchemaPathTree,
} from '@angular/forms/signals';

export type Country = 'GB' | 'US' | 'IE';

export interface Dependant {
  name: string;
  born: Date | null;
}

/** A membership application, in the order the screen asks for it. */
export interface Application {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  born: Date | null;
  country: Country;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  username: string;
  password: string;
  confirm: string;
  newsletter: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  sms: boolean;
  dependants: Dependant[];
  bio: string;
  terms: boolean;
}

export const emptyApplication = (): Application => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  born: null,
  country: 'GB',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postcode: '',
  username: '',
  password: '',
  confirm: '',
  newsletter: false,
  frequency: 'weekly',
  sms: false,
  dependants: [],
  bio: '',
  terms: false,
});

const POSTCODES: Record<Country, RegExp> = {
  GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  US: /^\d{5}(-\d{4})?$/,
  IE: /^[A-Z]\d{2} ?[A-Z\d]{4}$/i,
};

/** Years between a date and today. */
function ageOn(born: Date, today = new Date()): number {
  let years = today.getFullYear() - born.getFullYear();
  const birthday = new Date(today.getFullYear(), born.getMonth(), born.getDate());
  if (today < birthday) years--;
  return years;
}

/** Whether a username is free, as the server would answer: slowly, and sometimes not at all. */
@Service()
export class Usernames {
  latency = 600;
  readonly taken = new Set(['ada', 'grace', 'admin', 'root']);
  /** Requests made, which is how a test sees that typing is debounced. */
  checks = 0;

  isFree(name: string, signal?: AbortSignal): Promise<boolean> {
    this.checks++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(!this.taken.has(name.toLowerCase())), this.latency);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      });
    });
  }
}

/**
 * The rules, per field, and between fields: the postcode's shape follows the country, a state is
 * asked for only in the US, the confirmation has to match the password, text messages need a
 * phone number, and the username is checked with the server as the user types.
 */
export function applicationSchema(usernames: Usernames) {
  return (path: SchemaPathTree<Application>) => {
    required(path.firstName, { message: 'Enter your first name' });
    required(path.lastName, { message: 'Enter your last name' });
    required(path.email, { message: 'Enter your email address' });
    email(path.email, { message: 'That is not an email address' });
    pattern(path.phone, /^\+?[\d ]{7,15}$/, { message: 'Enter a phone number' });
    required(path.born, { message: 'Enter your date of birth' });
    validate(path.born, ({ value }) => {
      const born = value();
      return born && ageOn(born) < 18
        ? { kind: 'underage', message: 'You must be 18 or over' }
        : undefined;
    });

    required(path.line1, { message: 'Enter the first line of your address' });
    required(path.city, { message: 'Enter your town or city' });
    hidden(path.state, ({ valueOf }) => valueOf(path.country) !== 'US');
    required(path.state, {
      message: 'Choose a state',
      when: ({ valueOf }) => valueOf(path.country) === 'US',
    });
    required(path.postcode, { message: 'Enter your postcode' });
    validate(path.postcode, ({ value, valueOf }) => {
      const code = value().trim();
      if (!code) return undefined;
      return POSTCODES[valueOf(path.country)].test(code)
        ? undefined
        : { kind: 'postcode', message: 'That postcode is not valid for this country' };
    });

    required(path.username, { message: 'Choose a username' });
    minLength(path.username, 3, { message: 'At least 3 characters' });
    pattern(path.username, /^[a-z0-9_]*$/i, { message: 'Letters, numbers and underscores only' });
    validateAsync(path.username, {
      params: ({ value }) => value(),
      debounce: 300,
      factory: (name) =>
        resource({
          params: name,
          loader: ({ params, abortSignal }) => usernames.isFree(params, abortSignal),
        }),
      onSuccess: (free) =>
        free ? undefined : { kind: 'taken', message: 'That username is taken' },
      onError: () => ({ kind: 'unchecked', message: 'Could not check the username' }),
    });
    required(path.password, { message: 'Choose a password' });
    minLength(path.password, 8, { message: 'At least 8 characters' });
    validate(path.confirm, ({ value, valueOf }) =>
      value() === valueOf(path.password)
        ? undefined
        : { kind: 'mismatch', message: 'The passwords do not match' },
    );

    hidden(path.frequency, ({ valueOf }) => !valueOf(path.newsletter));
    disabled(path.sms, ({ valueOf }) => !valueOf(path.phone).trim());
    applyEach(path.dependants, (dependant) => {
      required(dependant.name, { message: 'Enter their name' });
      required(dependant.born, { message: 'Enter their date of birth' });
    });
    maxLength(path.bio, 280, { message: 'At most 280 characters' });
    validate(path.terms, ({ value }) =>
      value() ? undefined : { kind: 'terms', message: 'Accept the terms to continue' },
    );
  };
}
