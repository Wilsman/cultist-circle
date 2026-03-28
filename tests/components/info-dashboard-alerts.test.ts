import { describe, expect, it } from 'vitest';

import { HOT_SACRIFICES } from '@/components/hot-sacrifices-panel';
import { NOTIFICATIONS } from '@/components/notification-panel';

describe('Info dashboard THOR PvP warning', () => {
  it('puts the THOR PvP warning above the figurine recipes notice', () => {
    const thorAlertIndex = NOTIFICATIONS.findIndex(
      (notification) => notification.id === 'thor-hot-sacrifice-pvp-warning'
    );
    const figurineAlertIndex = NOTIFICATIONS.findIndex(
      (notification) => notification.id === 'new-figurine-recipes-round'
    );

    expect(thorAlertIndex).toBe(0);
    expect(figurineAlertIndex).toBeGreaterThan(thorAlertIndex);
  });

  it('includes a high-priority updates alert for the THOR PvP change', () => {
    const thorAlert = NOTIFICATIONS[0];

    expect(thorAlert).toBeDefined();
    expect(thorAlert?.id).toBe('thor-hot-sacrifice-pvp-warning');
    expect(thorAlert?.title).toContain('THOR');
    expect(thorAlert?.priority).toBe(0);
    expect(thorAlert?.actions).toHaveLength(1);
  });

  it('renames the old cat update to the figurine recipes round notice', () => {
    const figurineAlert = NOTIFICATIONS.find(
      (notification) => notification.id === 'new-figurine-recipes-round'
    );

    expect(figurineAlert).toBeDefined();
    expect(figurineAlert?.title).toBe('New Figurine Recipes Round');
  });

  it('marks the THOR hot sacrifice as unavailable in PVP but working in PVE', () => {
    const thorCombo = HOT_SACRIFICES.find((combo) => combo.id === 'sas-thor');

    expect(thorCombo).toBeDefined();
    expect(thorCombo?.availabilityNote).toContain('PVP');
    expect(thorCombo?.availabilityNote).toContain('PVE still works');
  });
});
