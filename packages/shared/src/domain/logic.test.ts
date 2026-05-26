import { describe, it, expect } from 'bun:test';
import { canLinkChild, validateLinkBatch } from './logic.js';
import { DeviceModel } from './deviceModel.js';
import { AssetType } from './enums.js';

describe('Capability Matrix Logic', () => {
  const trackerModel: DeviceModel = {
    id: 'parent-1',
    name: 'Amber Shield V4',
    brand: 'Amber Connect',
    assetType: 'TRACKER',
    allowedChildren: ['SIM', 'SD_CARD'],
    maxStock: 100
  };

  describe('canLinkChild', () => {
    it('should allow linking a SIM card to a tracker that accepts it', () => {
      expect(canLinkChild(trackerModel, 'SIM')).toBe(true);
    });

    it('should allow linking an SD card to a tracker that accepts it', () => {
      expect(canLinkChild(trackerModel, 'SD_CARD')).toBe(true);
    });

    it('should NOT allow linking a PANIC_BUTTON to a tracker that does not accept it', () => {
      expect(canLinkChild(trackerModel, 'PANIC_BUTTON')).toBe(false);
    });

    it('should return false if parentModel has no allowedChildren', () => {
      const standaloneModel: DeviceModel = { ...trackerModel, allowedChildren: [] };
      expect(canLinkChild(standaloneModel, 'SIM')).toBe(false);
    });
  });

  describe('validateLinkBatch', () => {
    it('should validate a batch of valid links', () => {
      const children: AssetType[] = ['SIM', 'SD_CARD'];
      const result = validateLinkBatch(trackerModel, children);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid links in a batch', () => {
      const children: AssetType[] = ['SIM', 'PANIC_BUTTON', 'KEYFOB'];
      const result = validateLinkBatch(trackerModel, children);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('PANIC_BUTTON');
      expect(result.errors[1]).toContain('KEYFOB');
    });
  });
});
