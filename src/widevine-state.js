function widevineUpdateIsDue(state, intervalDays, now = Date.now()) {
  const lastUpdate = Date.parse(state.lastSuccessfulUpdate || "");
  if (!Number.isFinite(lastUpdate)) return true;

  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  return now - lastUpdate >= intervalMs;
}

function widevineWasPrepared(state) {
  return Boolean(
    state.componentVersion && Number.isFinite(Date.parse(state.lastSuccessfulUpdate || ""))
  );
}

function recordWidevineSuccess(state, version, options = {}) {
  const { now = new Date(), restartRequired = false } = options;
  const nextState = {
    ...state,
    consent: true,
    componentVersion: version || state.componentVersion || null,
    lastSuccessfulUpdate: now.toISOString()
  };

  delete nextState.lastFailureAt;
  if (restartRequired) {
    nextState.restartRequired = true;
  } else {
    delete nextState.restartRequired;
  }

  return nextState;
}

function recordWidevineFailure(state, options = {}) {
  const { now = new Date(), repairDue = false } = options;
  const nextState = {
    ...state,
    lastFailureAt: now.toISOString()
  };

  if (repairDue) delete nextState.lastSuccessfulUpdate;
  return nextState;
}

module.exports = {
  recordWidevineFailure,
  recordWidevineSuccess,
  widevineUpdateIsDue,
  widevineWasPrepared
};
