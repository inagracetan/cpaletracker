import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineService } from '../src/services/offline/offlineService';

describe('OfflineService', () => {
  beforeEach(() => {
    // Service is static; getStatus should remain safe in Node/test environments
  });

  it('reports a coherent offline status object without browser APIs crashing', () => {
    const status = OfflineService.getStatus();
    expect(status).toHaveProperty('isOnline');
    expect(status).toHaveProperty('hasServiceWorker');
    expect(status).toHaveProperty('offlineReady');
    expect(status).toHaveProperty('canInstall');
    expect(typeof status.isOnline).toBe('boolean');
    expect(typeof status.offlineReady).toBe('boolean');
  });

  it('provides install instructions for major platforms', () => {
    const tips = OfflineService.getInstallInstructions();
    expect(tips.windows.length).toBeGreaterThan(20);
    expect(tips.macos.length).toBeGreaterThan(20);
    expect(tips.android.length).toBeGreaterThan(20);
    expect(tips.ios).toMatch(/Safari/i);
  });

  it('does not falsely claim automatic cross-device sync in the offline notice', () => {
    const notice = OfflineService.getOfflineNotice();
    expect(notice.toLowerCase()).toMatch(/this device|this browser/);
    expect(notice.toLowerCase()).not.toMatch(/automatically appear on other devices/);
  });

  it('returns unavailable when install prompt was never captured', async () => {
    const result = await OfflineService.promptInstall();
    expect(result).toBe('unavailable');
  });
});
