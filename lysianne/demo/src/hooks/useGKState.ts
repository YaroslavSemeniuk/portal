import { useSyncExternalStore } from 'react';
import { getState, subscribeStore } from '../lib/store';
import type { GKState } from '../lib/types';

export function useGKState(): GKState {
  return useSyncExternalStore(subscribeStore, getState, getState);
}
