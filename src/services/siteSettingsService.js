import connection from '../config/connectDB';

const DEFAULT_APPLICATION_NAME = 'LONDON CLUB';
const CACHE_TTL_MS = 60 * 1000;

let siteSettingsCache = {
    applicationName: DEFAULT_APPLICATION_NAME,
    expiresAt: 0,
};

const normalizeApplicationName = (name) => {
    const normalized = String(name || '').trim();
    return normalized || DEFAULT_APPLICATION_NAME;
};

const loadSiteSettings = async () => {
    try {
        const [rows] = await connection.query('SELECT application_name FROM admin LIMIT 1');
        const applicationName = normalizeApplicationName(rows?.[0]?.application_name);
        return { applicationName };
    } catch (error) {
        // Backward compatibility for databases where application_name is not added yet.
        if (error?.code === 'ER_BAD_FIELD_ERROR') {
            return { applicationName: DEFAULT_APPLICATION_NAME };
        }
        throw error;
    }
};

const getSiteSettings = async (options = {}) => {
    const { forceRefresh = false } = options;
    const now = Date.now();

    if (!forceRefresh && siteSettingsCache.expiresAt > now) {
        return { applicationName: siteSettingsCache.applicationName };
    }

    const fresh = await loadSiteSettings();
    siteSettingsCache = {
        applicationName: fresh.applicationName,
        expiresAt: now + CACHE_TTL_MS,
    };

    return { applicationName: siteSettingsCache.applicationName };
};

const invalidateSiteSettingsCache = () => {
    siteSettingsCache.expiresAt = 0;
};

export {
    DEFAULT_APPLICATION_NAME,
    getSiteSettings,
    invalidateSiteSettingsCache,
};
