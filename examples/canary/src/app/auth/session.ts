import { Service, computed, inject, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { NativeNavigation } from '@ng-native/router';

export interface User {
  readonly email: string;
}

/**
 * Who is signed in. Signing in takes a password and then a code; the session lasts until it
 * expires or the user signs out, and either way every screen of the signed-in app goes, whatever
 * is presented over it, and the sign-in screen is all that is left.
 */
@Service()
export class Session {
  private readonly nav = inject(NativeNavigation);
  readonly user = signal<User | null>(null);
  readonly signedIn = computed(() => this.user() !== null);
  /** Where the user was going when asked to sign in. */
  returnTo = '/account';
  private pending: User | null = null;
  private attempts = 0;

  /** The password step. Three wrong ones in a row lock the form. */
  async checkPassword(email: string, password: string): Promise<'ok' | 'wrong' | 'locked'> {
    await pause(150);
    if (this.attempts >= 3) return 'locked';
    if (password !== 'correct horse') {
      this.attempts++;
      return this.attempts >= 3 ? 'locked' : 'wrong';
    }
    this.attempts = 0;
    this.pending = { email };
    return 'ok';
  }

  /** The code step, which finishes signing in and replaces sign-in with where the user was going. */
  async checkCode(code: string): Promise<boolean> {
    await pause(150);
    if (!this.pending || code !== '123456') return false;
    this.user.set(this.pending);
    this.pending = null;
    const target = this.returnTo;
    this.returnTo = '/account';
    await this.nav.reset(target);
    return true;
  }

  signOut(): Promise<boolean> {
    return this.end();
  }

  /** The server says the session is over, from wherever the user is. */
  expire(): Promise<boolean> {
    return this.end('Your session has expired. Sign in again.');
  }

  readonly notice = signal<string | null>(null);

  private end(notice: string | null = null): Promise<boolean> {
    this.user.set(null);
    this.notice.set(notice);
    return this.nav.reset('/auth/login');
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The signed-in app's screens; anyone else is sent to sign in, and back here after. */
export const signedIn: CanActivateFn = (_route, state) => {
  const session = inject(Session);
  if (session.signedIn()) return true;
  session.returnTo = state.url;
  return inject(Router).parseUrl('/auth/login');
};
