// src/app/api/sports/__tests__/route.test.js
import { GET } from '../route';
import { supabase } from '@/lib/supabaseClient';
import { requireAnyRole } from '@/app/lib/auth';

jest.mock('@/lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    },
}));

jest.mock('@/app/lib/auth', () => ({
    requireAnyRole: jest.fn(() => ({ id: 'user123', role: 'teacher' })),
}));

describe('GET /api/sports', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if sport code is missing', async () => {
        const req = { url: 'http://localhost/api/sports' };
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Sportcode fehlt.');
    });

    it('should return 200 and sport data if found', async () => {
        const mockData = {
            code: '100M',
            name: '100m Sprint',
        };

        supabase.from().single.mockResolvedValueOnce({ data: mockData, error: null });

        const req = { url: 'http://localhost/api/sports?sport=100M' };
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toEqual(mockData);
    });

    it('should return 500 on supabase error', async () => {
        supabase.from().single.mockResolvedValueOnce({ data: null, error: new Error('Fehler') });

        const req = { url: 'http://localhost/api/sports?sport=100M' };
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toBe('Fehler beim Laden der Sportart.');
    });
});
