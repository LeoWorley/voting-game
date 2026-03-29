const { closeExpiredSessions } = require('../services/room-game.service');
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
      const outcomes = await closeExpiredSessions();
      outcomes.forEach((outcome) => {
        if (outcome.error?.code === 'TIE_BREAK_REQUIRED') {
          logWarn('SCHEDULER_TIE_BREAK_REQUIRED', {
            roomId: outcome.roomId,
            tiedUserIds: outcome.error?.details?.tiedUserIds || [],
          });
          return;
        }

        if (outcome.error?.code === 'NO_ACTIVE_SESSION') {
          return;
        }

        if (outcome.error) {
          logError('SCHEDULER_ERROR', {
            roomId: outcome.roomId,
            code: outcome.error?.code,
            message: outcome.error?.message,
          });
          return;
        }

        logInfo('SCHEDULER_SESSION_CLOSED', {
          roomId: outcome.roomId,
          sessionId: outcome.result.session.id,
          eliminatedUserId: outcome.result.eliminatedUser?.id || null,
        });
      });
    } catch (error) {
      logError('SCHEDULER_ERROR', { code: error?.code, message: error?.message });
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

module.exports = { startSessionScheduler };
