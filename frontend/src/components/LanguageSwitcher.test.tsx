import { describe, expect, it } from 'vitest';
import { messagesByLocale } from '@/i18n/messages';

describe('i18n dictionaries', () => {
  it('exposes required keys for english and spanish', () => {
    expect(messagesByLocale.en.appName).toBe('Voting Game');
    expect(messagesByLocale.es.appName).toBe('Juego de Votación');
    expect(typeof messagesByLocale.en.voteSubmit).toBe('string');
    expect(typeof messagesByLocale.es.voteSubmit).toBe('string');
  });
});
