const { getRoomAccessByClerkId } = require('../services/room.service');

async function roomAccessGuard(req, res, next) {
  try {
    const access = await getRoomAccessByClerkId({
      clerkId: req.auth?.userId,
      roomId: req.params.roomId,
    });
    req.roomAccess = access;
    return next();
  } catch (error) {
    return res.status(error.status || 500).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Unexpected error',
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }
}

function roomHostGuard(req, res, next) {
  const role = req.roomAccess?.membership?.role;
  if (role !== 'host') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Only room hosts can perform this action',
    });
  }
  return next();
}

module.exports = {
  roomAccessGuard,
  roomHostGuard,
};
