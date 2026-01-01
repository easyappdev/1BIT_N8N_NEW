const privacyMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'operator') {
        const originalJson = res.json;
        res.json = function (data) {
            if (data) {
                // Simple regex to mask prices like $100.00 or $100
                const maskPrices = (obj) => {
                    if (typeof obj === 'string') {
                        return obj.replace(/\$\d+(?:\.\d{2})?/g, '$***');
                    } else if (Array.isArray(obj)) {
                        return obj.map(maskPrices);
                    } else if (typeof obj === 'object' && obj !== null) {
                        Object.keys(obj).forEach(key => {
                            obj[key] = maskPrices(obj[key]);
                        });
                        return obj;
                    }
                    return obj;
                };
                data = maskPrices(data);
            }
            originalJson.call(this, data);
        };
    }
    next();
};

module.exports = privacyMiddleware;
