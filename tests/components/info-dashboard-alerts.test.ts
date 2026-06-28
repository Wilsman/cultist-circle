import { describe, expect, it } from 'vitest';

import { HOT_SACRIFICES } from '@/components/hot-sacrifices-panel';
import { NOTIFICATIONS } from '@/components/notification-panel';

describe('Info dashboard alerts', () => {
  it('keeps the Tarkov.dev API issue warning in the priority updates group', () => {
    const apiAlertIndex = NOTIFICATIONS.findIndex(
      (notification) => notification.id === 'tarkov-dev-api-issues'
    );

    expect(apiAlertIndex).toBeGreaterThan(-1);
    expect(NOTIFICATIONS[apiAlertIndex]?.priority).toBe(0);
  });

  it('includes a high-priority updates alert for the Tarkov.dev API issue', () => {
    const apiAlert = NOTIFICATIONS.find(
      (notification) => notification.id === 'tarkov-dev-api-issues'
    );

    expect(apiAlert).toBeDefined();
    expect(apiAlert?.id).toBe('tarkov-dev-api-issues');
    expect(apiAlert?.title).toBe('Tarkov.dev API Issues');
    expect(apiAlert?.priority).toBe(0);
    expect(apiAlert?.actions).toBeUndefined();
  });

  it('removes the retired Ded Moroz and THOR priority notices', () => {
    const notificationIds = NOTIFICATIONS.map((notification) => notification.id);

    expect(notificationIds).not.toContain('new-figurine-recipes-round');
    expect(notificationIds).not.toContain('thor-hot-sacrifice-pvp-warning');
  });

  it('marks the THOR hot sacrifice as unavailable in PVP but working in PVE', () => {
    const thorCombo = HOT_SACRIFICES.find((combo) => combo.id === 'sas-thor');

    expect(thorCombo).toBeDefined();
    expect(thorCombo?.availabilityNote).toContain('PVP');
    expect(thorCombo?.availabilityNote).toContain('PVE still works');
  });
});
