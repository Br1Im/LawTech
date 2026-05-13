import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isAuthenticated,
  getToken,
  setToken,
  removeToken,
  isTokenValid,
} from './authUtils';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('authUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('token storage', () => {
    it('setToken writes to localStorage and getToken reads it back', () => {
      setToken('abc.def.ghi');
      expect(getToken()).toBe('abc.def.ghi');
      expect(localStorage.getItem('token')).toBe('abc.def.ghi');
    });

    it('removeToken clears the stored value', () => {
      setToken('abc.def.ghi');
      removeToken();
      expect(getToken()).toBeNull();
    });

    it('isAuthenticated returns false when no token is set', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('isAuthenticated returns true after setToken', () => {
      setToken('abc.def.ghi');
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('isTokenValid', () => {
    it('returns false when no token is stored', () => {
      expect(isTokenValid()).toBe(false);
    });

    it('returns false for a malformed token (wrong number of segments)', () => {
      setToken('not.a.real.jwt.with.extra.segments');
      expect(isTokenValid()).toBe(false);
    });

    it('returns true for a token without an exp claim', () => {
      setToken(makeJwt({ id: 1, email: 'u@test.local' }));
      expect(isTokenValid()).toBe(true);
    });

    it('returns true for a token with a future exp', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      setToken(makeJwt({ id: 1, exp: future }));
      expect(isTokenValid()).toBe(true);
    });

    it('returns false for a token that has already expired', () => {
      const past = Math.floor(Date.now() / 1000) - 60;
      setToken(makeJwt({ id: 1, exp: past }));
      expect(isTokenValid()).toBe(false);
    });
  });
});
