import { POST } from '../route';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

jest.mock('../../../lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    },
}));

const { supabase } = require('../../../lib/supabaseClient');

describe('Login Route', () => {
    const mockUser = {
        id: 'user123',
        username: 'testuser',
        password: bcrypt.hashSync('testpass', 10),
        role: 'admin',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'testsecret';
        process.env.NODE_ENV = 'test';
    });

    it('should return 400 if username or password is missing', async () => {
        const req = {
            json: async () => ({ username: '' }), 
        };

        const res = await POST(req);

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('Benutzername und Passwort erforderlich');
    });
});
