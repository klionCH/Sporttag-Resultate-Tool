export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    try {
        const students = await req.json();

        if (!Array.isArray(students)) {
            return new Response(JSON.stringify({ error: "Ungültiges Format: students muss ein Array sein." }), { status: 400 });
        }

        const sanitized = students.map(s => ({
            name: s.name ?? null,
            surname: s.surname ?? null,
            age_category: s.age_category ?? null,
            class_group: s.class_group ?? null,
            date_of_birth: s.date_of_birth ?? null,
            gender: s.gender ?? null,
            assistant_bool: s.assistant_bool ?? false,
            present_bool: s.present_bool ?? true,
        }));

        await sql`
            INSERT INTO students ${sql(sanitized, 'name', 'surname', 'age_category', 'class_group', 'date_of_birth', 'gender', 'assistant_bool', 'present_bool')}
        `;

        const newClasses = [...new Set(students.map(s => s.class_group))];
        return new Response(JSON.stringify({ success: true, newClasses }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}