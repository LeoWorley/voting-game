const { closeAndEliminate } = require('../services/game.service');
const { logInfo, logWarn, logError } = require('../utils/logger');

function startSessionScheduler() {
  const enabled = process.env.ENABLE_SESSION_SCHEDULER === 'true';
  if (!enabled) {
    return () => {};
  }

  const intervalMinutes = Number(process.env.SCHEDULER_INTERVAL_MINUTES || 60);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  logInfo('SCHEDULER_STARTED', { intervalMinutes });

  const timer = setInterval(async () => {
    try {
      const result = await closeAndEliminate({
        actor: 'scheduler',
        manualTieBreakUserId: null,
        openNextSession: false,
        nextSession: null,
      });

      logInfo('SCHEDULER_SESSION_CLOSED', {
        sessionId: result.session.id,
        eliminatedUserId: result.eliminatedUser?.id || null,
      });
    } catch (error) {
      if (error?.code === 'NO_ACTIVE_SESSION') {
        return;
      }
      if (error?.code === 'TIE_BREAK_REQUIRED') {
        logWarn('SCHEDULER_TIE_BREAK_REQUIRED', { tiedUserIds: error?.details?.tiedUserIds || [] });
        return;
      }
      logError('SCHEDULER_ERROR', { code: error?.code, message: error?.message });
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

module.exports = { startSessionScheduler };
