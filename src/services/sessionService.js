import connection from '../config/connectDB';

const normalizeIdentity = (value) => String(value || '').trim();

const isTruthyFlag = (value) => {
	const normalized = String(value ?? '').trim().toLowerCase();
	return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const isActiveUser = (user = {}) => Number(user.status) === 1 && Number(user.veri) === 1;

const isAdminUser = (user = {}) => isTruthyFlag(user.is_admin) || Number(user.level) === 1;

const isManagerUser = (user = {}) => isTruthyFlag(user.is_manager) || Number(user.level) === 2;

const getUserFromAuthToken = async (authToken, options = {}) => {
	const token = normalizeIdentity(authToken);
	if (!token) {
		return null;
	}

	const [rows] = await connection.query('SELECT * FROM users WHERE token = ? LIMIT 1', [token]);
	if (!rows.length) {
		return null;
	}

	const user = rows[0];
	if (options.requireActive && !isActiveUser(user)) {
		return null;
	}

	return user;
};

const resolveUserByIdentifier = async (identifier) => {
	const normalized = normalizeIdentity(identifier);
	if (!normalized) {
		return null;
	}

	const sharedParams = [normalized, normalized, normalized, normalized, normalized];

	try {
		const [rows] = await connection.query(
			`SELECT * FROM users
			 WHERE email = ? OR phone = ? OR code = ? OR id_user = ? OR CAST(id AS CHAR) = ?
			 LIMIT 1`,
			sharedParams
		);
		return rows[0] || null;
	} catch (error) {
		if (error?.code !== 'ER_BAD_FIELD_ERROR') {
			throw error;
		}
	}

	const [fallbackRows] = await connection.query(
		`SELECT * FROM users
		 WHERE phone = ? OR code = ? OR id_user = ? OR CAST(id AS CHAR) = ?
		 LIMIT 1`,
		[normalized, normalized, normalized, normalized]
	);
	return fallbackRows[0] || null;
};

const buildOwnershipWhereClause = (user = {}, userIdColumn = 'user_id', phoneColumn = 'phone') => {
	const numericUserId = Number(user?.id || 0);
	if (Number.isInteger(numericUserId) && numericUserId > 0) {
		return {
			clause: `${userIdColumn} = ?`,
			params: [numericUserId],
		};
	}

	const phone = normalizeIdentity(user?.phone);
	if (phone && phone !== '0') {
		return {
			clause: `${phoneColumn} = ?`,
			params: [phone],
		};
	}

	return {
		clause: '1 = 0',
		params: [],
	};
};

export {
	getUserFromAuthToken,
	resolveUserByIdentifier,
	buildOwnershipWhereClause,
	isAdminUser,
	isManagerUser,
	isActiveUser,
};

