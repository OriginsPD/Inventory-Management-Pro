const mockUserPreferences = new Map<string, Record<string, unknown>>();

export function getMockUserPreferences(userId: string) {
  return mockUserPreferences.get(userId) ?? {};
}

export function setMockUserPreferences(userId: string, prefs: Record<string, unknown>) {
  mockUserPreferences.set(userId, prefs);
  return prefs;
}

const mockSystemConfig = new Map<string, unknown>([
  ['link_templates', []],
]);

export function getMockSystemConfig(key: string) {
  return mockSystemConfig.get(key);
}

export function setMockSystemConfig(key: string, value: unknown) {
  mockSystemConfig.set(key, value);
  return value;
}
