
import { Transaction, SystemSettings } from '../types';

const DATA_PREFIX = 'quirino_data_';
const SETTINGS_PREFIX = 'quirino_settings_';

// Helper to get key based on user
const getDataKey = (username: string) => `${DATA_PREFIX}${username}`;
const getSettingsKey = (username: string) => `${SETTINGS_PREFIX}${username}`;

export const loadTransactions = (username: string): Transaction[] => {
  try {
    const data = localStorage.getItem(getDataKey(username));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load transactions", e);
    return [];
  }
};

export const saveTransactions = (username: string, transactions: Transaction[]) => {
  try {
    localStorage.setItem(getDataKey(username), JSON.stringify(transactions));
  } catch (e) {
    console.error("Failed to save transactions", e);
  }
};

export const loadSettings = (username: string): SystemSettings => {
  try {
    const data = localStorage.getItem(getSettingsKey(username));
    return data ? JSON.parse(data) : { aiPersonality: '' };
  } catch (e) {
    return { aiPersonality: '' };
  }
};

export const saveSettings = (username: string, settings: SystemSettings) => {
  try {
    localStorage.setItem(getSettingsKey(username), JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};
