import { NextResponse } from 'next/server';
import { sql } from '@/lib/server/sql';
import { ensureDbSchema } from '@/lib/server/postgres';
import type { Project } from '@/types/schema';

export const runtime = 'nodejs';

type DbProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

function mapProject(row: DbProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function GET() {
  await ensureDbSchema();

  const { rows } = await sql<DbProjectRow>`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    ORDER BY updated_at DESC
  `;

  return NextResponse.json(rows.map(mapProject));
}

export async function POST(request: Request) {
  await ensureDbSchema();

  const body = await request.json().catch(() => null) as { name?: string; description?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  const description = body?.description?.trim() || null;

  await sql`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (${id}, ${name}, ${description}, ${now}, ${now})
  `;

  const project: Project = {
    id,
    name,
    description: description ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json(project, { status: 201 });
}
