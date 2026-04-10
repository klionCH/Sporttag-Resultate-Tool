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

        console.log("Incoming students:", JSON.stringify(students));
        
        await sql`
            INSERT INTO students ${sql(students, 'id', 'name', 'surname', 'age_category', 'class_group', 'date_of_birth', 'gender', 'assistant_bool', 'present_bool')}
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                surname = EXCLUDED.surname,
                age_category = EXCLUDED.age_category,
                class_group = EXCLUDED.class_group,
                date_of_birth = EXCLUDED.date_of_birth,
                gender = EXCLUDED.gender,
                assistant_bool = EXCLUDED.assistant_bool,
                present_bool = EXCLUDED.present_bool
        `;

        const newClasses = [...new Set(students.map(s => s.class_group))];
        return new Response(JSON.stringify({ success: true, newClasses }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}