const STORAGE_SYNC_UPDATED_AT = "academical.sync.updatedAt.v1";

export function createSyncManager({
  elements,
  defaultCalendars,
  getLocalState,
  applyRemoteState,
  applyRemoteEvents,
  renderSyncedState,
  showToast,
  normalizeCustomCalendars,
  normalizeCalendarNameOverrides,
  normalizeCalendarColorOverrides,
  normalizePaperTasks,
}) {
  const firebaseSync = createFirebaseSyncState();

  function init() {
    const config = window.ACADEMICAL_GOOGLE_CONFIG || {};

    if (!config.firebaseConfig?.apiKey || !window.firebase?.initializeApp) {
      firebaseSync.configured = false;
      updateFirebaseSyncUi("Cloud sync unavailable");
      return;
    }

    try {
      firebaseSync.app = window.firebase.apps?.length
        ? window.firebase.app()
        : window.firebase.initializeApp(config.firebaseConfig);
      firebaseSync.auth = window.firebase.auth(firebaseSync.app);
      firebaseSync.firestore = window.firebase.firestore(firebaseSync.app);
      firebaseSync.provider = new window.firebase.auth.GoogleAuthProvider();
      (config.scopes || ["profile", "email"]).forEach((scope) => firebaseSync.provider.addScope(scope));
      firebaseSync.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
      firebaseSync.configured = true;

      firebaseSync.auth.onAuthStateChanged((user) => {
        firebaseSync.user = user ? getFirebaseUserProfile(user) : null;
        if (firebaseSync.user) {
          startCloudSync().catch(handleFirebaseSyncError);
        } else {
          stopCloudListener();
          if (firebaseSync.conflictResolver) resolveSyncConflict("");
        }
        updateFirebaseSyncUi();
      });
    } catch (error) {
      firebaseSync.configured = false;
      handleFirebaseSyncError(error);
    }

    updateFirebaseSyncUi();
  }

  async function toggleAuth() {
    if (!firebaseSync.configured || !firebaseSync.auth) return;

    firebaseSync.busy = true;
    updateFirebaseSyncUi(firebaseSync.user ? "Signing out..." : "Opening Google sign-in...");

    try {
      if (firebaseSync.user) {
        await firebaseSync.auth.signOut();
        showToast("Signed out of cloud sync");
      } else {
        await firebaseSync.auth.signInWithPopup(firebaseSync.provider);
        showToast("Signed in with Firebase sync");
      }
    } catch (error) {
      handleFirebaseSyncError(error);
    } finally {
      firebaseSync.busy = false;
      updateFirebaseSyncUi();
    }
  }

  function updateFirebaseSyncUi(message = "") {
    if (!elements.syncAuthButton || !elements.syncStatus) return;

    if (!firebaseSync.configured) {
      elements.syncAuthButton.textContent = "Sync off";
      elements.syncAuthButton.disabled = true;
      elements.syncAuthButton.classList.remove("connected");
      elements.accountButton.classList.remove("connected");
      elements.accountButton.setAttribute("aria-label", "Account and sync unavailable");
      elements.syncStatus.textContent = message || "Cloud sync unavailable";
      return;
    }

    elements.syncAuthButton.disabled = firebaseSync.busy;
    elements.syncAuthButton.textContent = firebaseSync.user ? "Sign out" : "Sign in";
    elements.syncAuthButton.classList.toggle("connected", Boolean(firebaseSync.user));
    elements.accountButton.classList.toggle("connected", Boolean(firebaseSync.user));
    elements.accountButton.setAttribute(
      "aria-label",
      firebaseSync.user
        ? `Account and sync, signed in as ${firebaseSync.user.name || firebaseSync.user.email}`
        : "Account and sync, not signed in"
    );
    elements.syncStatus.textContent =
      message || (firebaseSync.user ? `Synced as ${firebaseSync.user.email || firebaseSync.user.name}` : "Local only");
  }

  function userStateDocRef() {
    if (!firebaseSync.user || !firebaseSync.firestore) throw new Error("Sign in to sync.");
    return firebaseSync.firestore.collection("users").doc(firebaseSync.user.id).collection("academical").doc("state");
  }

  function getCloudStatePayload() {
    const updatedAt = getLocalSyncUpdatedAt() || touchLocalSyncUpdatedAt();
    return { updatedAt, ...getLocalState() };
  }

  async function startCloudSync() {
    if (!firebaseSync.user) return;
    updateFirebaseSyncUi("Checking Firestore...");

    const docRef = userStateDocRef();
    const snapshot = await docRef.get();
    const remote = snapshot.exists ? snapshot.data() : null;

    if (!remote) {
      await docRef.set(getCloudStatePayload(), { merge: true });
      updateFirebaseSyncUi("Uploaded local data to Firestore");
    } else if (cloudStatesDiffer(getCloudStatePayload(), remote)) {
      const localState = getCloudStatePayload();
      if (isCloudEventSuperset(localState, remote)) {
        applyCloudEventAdditions(localState, remote);
      } else {
        const resolved = await promptForSyncConflict(remote);
        if (!resolved) return;
        const shouldContinue = await applySyncConflictChoice(resolved, remote, docRef);
        if (!shouldContinue) return;
      }
    } else if (remote.updatedAt && isRemoteNewer(remote.updatedAt, getLocalSyncUpdatedAt())) {
      setLocalSyncUpdatedAt(remote.updatedAt);
      updateFirebaseSyncUi("Already in sync");
    }

    stopCloudListener();
    firebaseSync.unsubscribe = docRef.onSnapshot(async (nextSnapshot) => {
      if (!nextSnapshot.exists || firebaseSync.applyingRemote || firebaseSync.conflictResolver) return;
      const remoteState = nextSnapshot.data();
      const localState = getCloudStatePayload();
      if (!cloudStatesDiffer(localState, remoteState)) {
        if (remoteState.updatedAt && isRemoteNewer(remoteState.updatedAt, getLocalSyncUpdatedAt())) {
          setLocalSyncUpdatedAt(remoteState.updatedAt);
        }
        return;
      }

      try {
        if (isCloudEventSuperset(localState, remoteState)) {
          applyCloudEventAdditions(localState, remoteState);
          return;
        }

        const resolved = await promptForSyncConflict(remoteState);
        if (!resolved) return;
        await applySyncConflictChoice(resolved, remoteState, docRef);
      } catch (error) {
        handleFirebaseSyncError(error);
      }
    }, handleFirebaseSyncError);
  }

  function cloudStatesDiffer(localState, remoteState) {
    return stableSerialize(getComparableCloudState(localState)) !== stableSerialize(getComparableCloudState(remoteState));
  }

  function getComparableCloudState(state = {}) {
    const normalizedCustomCalendars = normalizeCustomCalendars(state.customCalendars);
    const defaultPaperCalendarId = getDefaultPaperCalendarIdForState(state, normalizedCustomCalendars);
    return {
      events: state.events ?? null,
      paperTasks: normalizePaperTasks(state.paperTasks, defaultPaperCalendarId),
      customCalendars: normalizedCustomCalendars,
      calendarNameOverrides: normalizeCalendarNameOverrides(state.calendarNameOverrides, normalizedCustomCalendars),
      calendarColorOverrides: normalizeCalendarColorOverrides(state.calendarColorOverrides, normalizedCustomCalendars),
      calendarOrderIds: state.calendarOrderIds ?? null,
      archivedCalendarIds: state.archivedCalendarIds ?? null,
      deletedCalendarIds: state.deletedCalendarIds ?? null,
    };
  }

  function getDefaultPaperCalendarIdForState(state, customCalendarList) {
    const calendarIds = [...defaultCalendars, ...customCalendarList].map((calendar) => calendar.id);
    const validIds = new Set(calendarIds);
    const savedOrder = Array.isArray(state.calendarOrderIds) ? state.calendarOrderIds : [];
    const orderedIds = [
      ...savedOrder.filter((id) => validIds.has(id)),
      ...calendarIds.filter((id) => !savedOrder.includes(id)),
    ];
    const unavailableIds = new Set([
      ...(Array.isArray(state.archivedCalendarIds) ? state.archivedCalendarIds : []),
      ...(Array.isArray(state.deletedCalendarIds) ? state.deletedCalendarIds : []),
    ]);
    const activeIds = orderedIds.filter((id) => !unavailableIds.has(id));
    return activeIds[0] ?? "";
  }

  function isCloudEventSuperset(localState, remoteState) {
    const localComparable = getComparableCloudState(localState);
    const remoteComparable = getComparableCloudState(remoteState);
    const { events: localEvents, ...localWithoutEvents } = localComparable;
    const { events: remoteEvents, ...remoteWithoutEvents } = remoteComparable;

    if (stableSerialize(localWithoutEvents) !== stableSerialize(remoteWithoutEvents)) return false;
    if (!Array.isArray(localEvents) || !Array.isArray(remoteEvents) || remoteEvents.length <= localEvents.length) return false;

    const localById = getUniqueRecordMap(localEvents);
    const remoteById = getUniqueRecordMap(remoteEvents);
    if (!localById || !remoteById || remoteById.size <= localById.size) return false;

    return [...localById.entries()].every(
      ([id, record]) => remoteById.has(id) && stableSerialize(record) === stableSerialize(remoteById.get(id))
    );
  }

  function getUniqueRecordMap(records) {
    const recordsById = new Map();
    for (const record of records) {
      if (!record?.id) return null;
      const id = String(record.id);
      if (recordsById.has(id)) return null;
      recordsById.set(id, record);
    }
    return recordsById;
  }

  function stableSerialize(value) {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function promptForSyncConflict(remoteState) {
    if (firebaseSync.conflictResolver) return Promise.resolve(null);
    const localState = getCloudStatePayload();
    elements.syncConflictLocalCount.textContent = formatSyncItemCount(localState.events, "event");
    elements.syncConflictCloudCount.textContent = formatSyncItemCount(remoteState.events, "event");
    elements.syncConflictLocalTime.textContent = formatSyncModifiedTime(localState.updatedAt);
    elements.syncConflictCloudTime.textContent = formatSyncModifiedTime(remoteState.updatedAt);
    elements.syncConflictModal.classList.add("is-open");
    elements.syncConflictModal.setAttribute("aria-hidden", "false");
    updateFirebaseSyncUi("Sync paused: choose which data to keep");
    requestAnimationFrame(() => elements.syncConflictActions[elements.syncConflictActions.length - 1]?.focus());
    return new Promise((resolve) => {
      firebaseSync.conflictResolver = resolve;
    });
  }

  function resolveSyncConflict(action) {
    if (!firebaseSync.conflictResolver) return;
    const resolve = firebaseSync.conflictResolver;
    firebaseSync.conflictResolver = null;
    elements.syncConflictModal.classList.remove("is-open");
    elements.syncConflictModal.setAttribute("aria-hidden", "true");
    resolve(action);
  }

  async function applySyncConflictChoice(action, remoteState, docRef) {
    if (action === "download") {
      downloadSyncCopies(getCloudStatePayload(), remoteState);
      stopCloudListener();
      updateFirebaseSyncUi("Sync paused after downloading both copies");
      return false;
    }

    if (action === "cloud") {
      applyRemoteStateWithTracking(remoteState);
      renderSyncedState();
      updateFirebaseSyncUi("Using Firestore data");
      return true;
    }

    const nextState = action === "merge" ? mergeCloudStates(getCloudStatePayload(), remoteState) : getCloudStatePayload();
    applyRemoteStateWithTracking({ ...nextState, updatedAt: touchLocalSyncUpdatedAt() });
    renderSyncedState();
    await docRef.set(getCloudStatePayload(), { merge: true });
    updateFirebaseSyncUi(action === "merge" ? "Merged and synced to Firestore" : "Uploaded browser data to Firestore");
    return true;
  }

  function applyCloudEventAdditions(localState, remoteState) {
    const mergedEvents = mergeSyncRecords(localState.events, remoteState.events);
    applyRemoteEventsWithTracking(mergedEvents, remoteState.updatedAt);
    renderSyncedState();
    updateFirebaseSyncUi("Downloaded new events from Firestore");
  }

  function mergeCloudStates(localState, remoteState) {
    return {
      ...remoteState,
      ...localState,
      events: mergeSyncRecords(localState.events, remoteState.events),
      paperTasks: mergeSyncRecords(localState.paperTasks, remoteState.paperTasks),
      customCalendars: mergeSyncRecords(localState.customCalendars, remoteState.customCalendars),
      calendarNameOverrides: { ...(remoteState.calendarNameOverrides || {}), ...(localState.calendarNameOverrides || {}) },
      calendarColorOverrides: { ...(remoteState.calendarColorOverrides || {}), ...(localState.calendarColorOverrides || {}) },
      calendarOrderIds: mergeUniqueValues(localState.calendarOrderIds, remoteState.calendarOrderIds),
      visibleCalendars: { ...(remoteState.visibleCalendars || {}), ...(localState.visibleCalendars || {}) },
      archivedCalendarIds: mergeUniqueValues(localState.archivedCalendarIds, remoteState.archivedCalendarIds),
      deletedCalendarIds: mergeUniqueValues(localState.deletedCalendarIds, remoteState.deletedCalendarIds),
    };
  }

  function mergeSyncRecords(localRecords, remoteRecords) {
    const merged = Array.isArray(localRecords) ? [...localRecords] : [];
    const localIds = new Set(merged.map((record) => record?.id).filter(Boolean));
    (Array.isArray(remoteRecords) ? remoteRecords : []).forEach((record) => {
      if (!record?.id || localIds.has(record.id)) return;
      localIds.add(record.id);
      merged.push(record);
    });
    return merged;
  }

  function mergeUniqueValues(localValues, remoteValues) {
    return [...new Set([...(Array.isArray(localValues) ? localValues : []), ...(Array.isArray(remoteValues) ? remoteValues : [])])];
  }

  function formatSyncItemCount(items, label) {
    const count = Array.isArray(items) ? items.length : 0;
    return `${count} ${label}${count === 1 ? "" : "s"}`;
  }

  function formatSyncModifiedTime(updatedAt) {
    const date = new Date(updatedAt || "");
    return Number.isNaN(date.getTime()) ? "Modified time unavailable" : `Modified ${date.toLocaleString()}`;
  }

  function downloadSyncCopies(localState, remoteState) {
    const payload = { exportedAt: new Date().toISOString(), browser: localState, firestore: remoteState };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `academical-sync-conflict-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function stopCloudListener() {
    if (firebaseSync.unsubscribe) {
      firebaseSync.unsubscribe();
      firebaseSync.unsubscribe = null;
    }
  }

  function applyRemoteStateWithTracking(remoteState) {
    firebaseSync.applyingRemote = true;
    try {
      applyRemoteState(remoteState);
    } finally {
      firebaseSync.applyingRemote = false;
    }
    setLocalSyncUpdatedAt(remoteState.updatedAt || new Date().toISOString());
  }

  function applyRemoteEventsWithTracking(nextEvents, updatedAt) {
    firebaseSync.applyingRemote = true;
    try {
      applyRemoteEvents(nextEvents);
    } finally {
      firebaseSync.applyingRemote = false;
    }
    setLocalSyncUpdatedAt(updatedAt || new Date().toISOString());
  }

  function queueCloudSync() {
    if (!firebaseSync.user || !firebaseSync.firestore || firebaseSync.applyingRemote || firebaseSync.conflictResolver) return;
    clearTimeout(firebaseSync.syncTimer);
    firebaseSync.syncTimer = setTimeout(syncCloudStateNow, 600);
  }

  async function syncCloudStateNow() {
    if (!firebaseSync.user || !firebaseSync.firestore || firebaseSync.applyingRemote || firebaseSync.conflictResolver) return;
    try {
      await userStateDocRef().set(getCloudStatePayload(), { merge: true });
      updateFirebaseSyncUi("Synced to Firestore");
    } catch (error) {
      handleFirebaseSyncError(error);
    }
  }

  function handleFirebaseSyncError(error) {
    console.error(error);
    updateFirebaseSyncUi(getFirebaseErrorMessage(error));
  }

  function getFirebaseErrorMessage(error) {
    const code = String(error?.code || error?.message || "").toLowerCase();
    if (code.includes("popup-closed-by-user")) return "Sign-in popup closed";
    if (code.includes("popup-blocked")) return "Popup blocked";
    if (code.includes("unauthorized-domain")) return "Firebase unauthorized domain";
    if (code.includes("permission-denied")) return "Firestore permission denied";
    return error?.message || "Firebase sync failed";
  }

  function isRemoteNewer(remoteUpdatedAt, localUpdatedAt) {
    const remoteTime = Date.parse(remoteUpdatedAt || "");
    const localTime = Date.parse(localUpdatedAt || "");
    if (!Number.isFinite(remoteTime)) return false;
    if (!Number.isFinite(localTime)) return true;
    return remoteTime > localTime;
  }

  function touchLocalSyncUpdatedAt() {
    const updatedAt = new Date().toISOString();
    setLocalSyncUpdatedAt(updatedAt);
    return updatedAt;
  }

  function getLocalSyncUpdatedAt() {
    return localStorage.getItem(STORAGE_SYNC_UPDATED_AT) || "";
  }

  function setLocalSyncUpdatedAt(updatedAt) {
    localStorage.setItem(STORAGE_SYNC_UPDATED_AT, updatedAt);
  }

  return {
    init,
    toggleAuth,
    queueCloudSync,
    resolveConflict: resolveSyncConflict,
    touchLocalSyncUpdatedAt,
    getLocalSyncUpdatedAt,
    updateUi: updateFirebaseSyncUi,
  };
}

function createFirebaseSyncState() {
  return {
    configured: false,
    busy: false,
    user: null,
    app: null,
    auth: null,
    firestore: null,
    provider: null,
    unsubscribe: null,
    applyingRemote: false,
    syncTimer: null,
    conflictResolver: null,
  };
}

function getFirebaseUserProfile(user) {
  return {
    id: user.uid,
    email: user.email || "",
    name: user.displayName || user.email || "Google user",
    picture: user.photoURL || "",
  };
}
