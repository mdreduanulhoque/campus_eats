const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

const requireCanteenAccess = (canteenIdSource = 'params') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    // Super admin has global access across all canteens
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Determine target canteen_id from params, body, or query
    let targetCanteenId;
    if (canteenIdSource === 'params') {
      targetCanteenId = req.params.canteenId || req.params.id;
    } else if (canteenIdSource === 'body') {
      targetCanteenId = req.body.canteen_id || req.body.canteenId;
    } else if (canteenIdSource === 'query') {
      targetCanteenId = req.query.canteen_id || req.query.canteenId;
    }

    if (targetCanteenId && parseInt(targetCanteenId, 10) !== req.user.canteen_id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You do not have permission to manage this canteen.'
      });
    }

    next();
  };
};

module.exports = {
  requireRoles,
  requireCanteenAccess
};
