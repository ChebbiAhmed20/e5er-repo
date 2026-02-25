const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, beginTransaction, commitTransaction, rollbackTransaction } = require('../modules/database');
const { generateUUID, generateReferralCode } = require('../utils/uuid');
const { app } = require('electron');

// Secrets should ideally be loaded from a secure store or .env
// For a desktop app, we might store these in a safe config or bake them in if it's a standalone app
// defaulting to development secrets if env not set
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_change_in_prod';

const SALT_ROUNDS = 10;

// Hash password
const hashPassword = async (password) => {
    if (!password) {
        throw new Error('Password is required for hashing');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT tokens
const generateTokens = (userId, email, role) => {
    const accessToken = jwt.sign(
        { userId, email, role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { userId, email, role },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
    return jwt.verify(token, JWT_REFRESH_SECRET);
};

// Verify access token (for IPC middleware)
const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Sign up new user
const signUp = async ({ email, password, ...metadata }) => {
    const client = await beginTransaction();

    try {
        const userId = generateUUID();
        const hashedPassword = await hashPassword(password);

        // Generate referral code
        let referralCode;
        let codeExists = true;
        while (codeExists) {
            referralCode = generateReferralCode();
            const existing = await client.query(
                'SELECT id FROM profiles WHERE referral_code = $1',
                [referralCode]
            );
            codeExists = existing.rows.length > 0;
        }

        const now = new Date().toISOString();
        // Insert into users table (created_at required for existing DBs without DEFAULT)
        await client.query(
            'INSERT INTO users (id, email, password_hash, raw_user_meta_data, created_at) VALUES ($1, $2, $3, $4, $5)',
            [userId, email, hashedPassword, JSON.stringify(metadata), now]
        );

        // Insert into profiles (created_at/updated_at required for existing DBs without DEFAULT)
        await client.query(
            `INSERT INTO profiles (
        id, email, first_name_english, last_name_english, first_name_arabic, last_name_arabic,
        sex, phone, clinic_address, clinic_address_arabic, city, referral_code, referred_by_code,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                userId,
                email,
                metadata.first_name || metadata.first_name_english || '',
                metadata.last_name || metadata.last_name_english || '',
                metadata.first_name_arabic || '',
                metadata.last_name_arabic || '',
                metadata.sex || 'male',
                metadata.phone || '',
                metadata.clinic_address || '',
                metadata.clinic_address_arabic || '',
                metadata.city || '',
                referralCode,
                metadata.referral_code || null,
                now,
                now
            ]
        );

        // Handle referral if code provided
        if (metadata.referral_code) {
            const referrer = await client.query(
                'SELECT id FROM profiles WHERE referral_code = $1',
                [metadata.referral_code]
            );

            if (referrer.rows.length > 0) {
                await client.query(
                    'INSERT INTO referrals (referrer_id, referred_id, status) VALUES ($1, $2, $3)',
                    [referrer.rows[0].id, userId, 'pending']
                );
            }
        }

        await commitTransaction(client);

        // Get role (default to dentist)
        const role = 'dentist';

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(userId, email, role);

        return {
            user: {
                id: userId,
                email,
                role,
                first_name: metadata.first_name || metadata.first_name_english,
                last_name: metadata.last_name || metadata.last_name_english
            },
            accessToken,
            refreshToken
        };
    } catch (error) {
        await rollbackTransaction(client);
        throw error;
    }
};

// Sign in user
const signIn = async ({ email, password }) => {
    const result = await query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
    );

    if (!result.rows.length) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    const user = result.rows[0];
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }

    // Get user profile
    const profileResult = await query(
        'SELECT first_name_english, last_name_english FROM profiles WHERE id = $1',
        [user.id]
    );

    const profile = profileResult.rows[0] || {};

    // Default role
    const role = 'dentist';

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, role);

    return {
        user: {
            id: user.id,
            email: user.email,
            role,
            first_name: profile.first_name_english,
            last_name: profile.last_name_english
        },
        accessToken,
        refreshToken
    };
};

// Get user profile
const getUserProfile = async (userId) => {
    const result = await query(
        `SELECT 
      id, email, first_name_english, last_name_english,
      first_name_arabic, last_name_arabic, sex, clinic_name,
      clinic_address, clinic_address_arabic, city, phone,
      trial_end_date, subscription_status, subscription_expiry_date,
      referral_code, referral_count, created_at, updated_at
    FROM profiles WHERE id = $1`,
        [userId]
    );

    return result.rows[0];
};

// Update user profile
const updateUserProfile = async (userId, updates) => {
    const allowedFields = [
        'first_name_english', 'last_name_english',
        'first_name_arabic', 'last_name_arabic',
        'sex', 'clinic_name', 'clinic_address',
        'clinic_address_arabic', 'city', 'phone',
        'subscription_status', 'subscription_expiry_date', 'trial_end_date'
    ];

    const updatesArray = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updatesArray.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    if (updatesArray.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(userId);

    await query(
        `UPDATE profiles SET ${updatesArray.join(', ')} WHERE id = $${paramIndex}`,
        values
    );

    return await getUserProfile(userId);
};

const listUsers = async (options = {}) => {
    const search = options.search ? options.search.trim() : null;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 200);

    let queryText = `
    SELECT 
      id,
      email,
      first_name_english,
      last_name_english,
      subscription_status,
      subscription_expiry_date,
      trial_end_date,
      referral_code,
      referral_count,
      created_at
    FROM profiles
  `;

    const params = [];

    if (search) {
        // SQLite LIKE
        queryText += `
      WHERE (
        email LIKE $1 OR
        first_name_english LIKE $2 OR
        last_name_english LIKE $3
      )
    `;
        const likeValue = `%${search}%`;
        params.push(likeValue, likeValue, likeValue);
    }

    params.push(limit);
    // Correctly handle dynamic parameter index for limit
    queryText += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await query(queryText, params);
    return result.rows;
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = verifyRefreshToken(refreshToken);

        const result = await query(
            'SELECT id, email FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (!result.rows.length) {
            throw new Error('Invalid token');
        }

        const user = result.rows[0];

        // Get role
        const role = 'dentist';

        const { accessToken } = generateTokens(user.id, user.email, role);

        return { accessToken };
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

// Sign in user by email without password (TRUSTED - for sync only)
const signInByEmail = async (email) => {
    const result = await query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
    );

    if (!result.rows.length) {
        throw new Error('Utilisateur non trouve');
    }

    const user = result.rows[0];
    const role = 'dentist';

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, role);

    const userProfile = await getUserProfile(user.id);

    return {
        user: userProfile,
        accessToken,
        refreshToken
    };
};

module.exports = {
    signUp,
    signIn,
    signInByEmail,
    getUserProfile,
    updateUserProfile,
    listUsers,
    refreshAccessToken,
    verifyAccessToken
};
