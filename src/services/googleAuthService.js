import { OAuth2Client } from 'google-auth-library';

const getGoogleClient = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    return new OAuth2Client(clientId);
};

const verifyGoogleIdToken = async (idToken) => {
    if (!idToken || typeof idToken !== 'string') {
        throw new Error('Google credential is required');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const client = getGoogleClient();

    const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error('Invalid Google token payload');
    }

    return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: Boolean(payload.email_verified),
        name: payload.name || '',
        picture: payload.picture || '',
    };
};

module.exports = {
    verifyGoogleIdToken,
};
