// src/app/api/sports/all/__tests__/route.test.js
import { GET } from '../route';
import { supabase } from '@/lib/supabaseClient';
import { requireAnyRole } from '@/app/lib/auth';

jest.mock('@/lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            order: jest.fn(),
        })),
    },
}));

jest.mock('@/app/lib/auth', () => ({
    requireAnyRole: jest.fn(() => ({ id: 'user123', role: 'teacher' })),
}));

describe('GET /api/sports/all', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 and all sports', async () => {
        const mockData = [
            { id: 1, code: '100M', name: '100m Sprint', svg_url: '/svg/100m.svg' },
            { id: 2, code: 'LJ', name: 'Weitsprung', svg_url: '/svg/lj.svg' },
        ];

        supabase.from().order.mockResolvedValueOnce({ data: mockData, error: null });

        const req = { url: 'http://localhost/api/sports/all' };
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data).toEqual(mockData);
    });

    it('should return 500 on supabase error', async () => {
        const error = new Error('Fehler');
        supabase.from().order.mockResolvedValueOnce({ data: null, error });

        const req = { url: 'http://localhost/api/sports/all' };
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toBe(error.message);
    });
});
