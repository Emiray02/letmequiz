"use client";

import { useSyncExternalStore } from "react";
import {
  getActiveProfile,
  listProfiles,
  subscribeProfile,
  type Profile,
} from "@/lib/profile-store";

const EMPTY_LIST: Profile[] = [];

// Cache stable references so useSyncExternalStore doesn't trip on
// "snapshot changed" warnings between renders. We invalidate on every
// subscribe callback (i.e. when profile-store emits a change).
let cachedProfile: Profile | null = null;
let cachedList: Profile[] = EMPTY_LIST;
let cacheVersion = 0;
let lastReadVersion = -1;

function readFresh() {
  cachedProfile = getActiveProfile();
  cachedList = listProfiles();
  lastReadVersion = cacheVersion;
}

function subscribe(cb: () => void) {
  const wrapped = () => {
    cacheVersion += 1;
    cb();
  };
  return subscribeProfile(wrapped);
}

function ensureFresh() {
  if (lastReadVersion !== cacheVersion) readFresh();
}

function getProfileSnapshot(): Profile | null {
  ensureFresh();
  return cachedProfile;
}
function getProfilesSnapshot(): Profile[] {
  ensureFresh();
  return cachedList;
}
function getServerProfile(): null {
  return null;
}
function getServerList(): Profile[] {
  return EMPTY_LIST;
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getProfileSnapshot, getServerProfile);
  const profiles = useSyncExternalStore(subscribe, getProfilesSnapshot, getServerList);
  const hydrated = profiles !== EMPTY_LIST || profile !== null;
  return { profile, profiles, hydrated };
}
