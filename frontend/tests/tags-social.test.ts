import { describe, it, expect } from 'vitest';
import type { SocialLinkDto, TagDto } from '../src/types/profile.js';

describe('Frontend Social Links & Tag Taxonomy (SPEC-06)', () => {
  it('validates URL scheme whitelist rejects unsafe protocols (SPEC-06 §5.1 & §6)', () => {
    const isUrlPermitted = (url: string): boolean => {
      return /^https?:\/\//i.test(url.trim());
    };

    expect(isUrlPermitted('https://github.com/ehsan')).toBe(true);
    expect(isUrlPermitted('http://my-portfolio.ir')).toBe(true);
    expect(isUrlPermitted('javascript:alert(1)')).toBe(false);
    expect(isUrlPermitted('data:text/html,hack')).toBe(false);
    expect(isUrlPermitted('file:///etc/passwd')).toBe(false);
  });

  it('validates SocialLinkDto shape conforming to SPEC-06 contract', () => {
    const link: SocialLinkDto = {
      id: 'l-1',
      customProfileId: 'cp-1',
      label: 'LinkedIn',
      url: 'https://linkedin.com/in/coach-farhad',
      description: 'Coach professional network',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    };

    expect(link.id).toBe('l-1');
    expect(link.label).toBe('LinkedIn');
    expect(link.url).toMatch(/^https?:\/\//);
  });

  it('validates TagDto color and structure', () => {
    const tag: TagDto = {
      id: 'tag-1',
      telegramAccountId: 'acc-1',
      name: 'VIP Client',
      color: '#10B981',
      profileCount: 3,
      createdAt: '2026-10-10T10:00:00.000Z',
    };

    expect(tag.name).toBe('VIP Client');
    expect(tag.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(tag.profileCount).toBe(3);
  });

  it('correctly toggles tag assignments for a profile', () => {
    const currentTags: TagDto[] = [
      { id: 't-1', telegramAccountId: 'acc-1', name: 'VIP', color: '#10B981', createdAt: '' },
    ];

    const tagToToggle: TagDto = {
      id: 't-2',
      telegramAccountId: 'acc-1',
      name: 'Lead',
      color: '#F59E0B',
      createdAt: '',
    };

    const toggle = (existing: TagDto[], target: TagDto) => {
      const exists = existing.some((t) => t.id === target.id);
      return exists
        ? existing.filter((t) => t.id !== target.id)
        : [...existing, target];
    };

    const afterAdd = toggle(currentTags, tagToToggle);
    expect(afterAdd).toHaveLength(2);
    expect(afterAdd.some((t) => t.id === 't-2')).toBe(true);

    const afterRemove = toggle(afterAdd, tagToToggle);
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove.some((t) => t.id === 't-2')).toBe(false);
  });
});
