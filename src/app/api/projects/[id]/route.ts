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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDbSchema();
  const { id } = await context.params;

  const { rows } = await sql<DbProjectRow>`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(mapProject(rows[0]));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDbSchema();
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { name?: string; description?: string | null } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const current = await sql<DbProjectRow>`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE id = ${id}
    LIMIT 1
  `;

  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const existing = current.rows[0];
  const now = Date.now();
  const nextName = body.name?.trim() || existing.name;
  const nextDescription = body.description === undefined
    ? existing.description
    : (body.description?.trim() || null);

  await sql`
    UPDATE projects
    SET name = ${nextName}, description = ${nextDescription}, updated_at = ${now}
    WHERE id = ${id}
  `;

  return NextResponse.json({
    id,
    name: nextName,
    description: nextDescription ?? undefined,
    createdAt: Number(existing.created_at),
    updatedAt: now,
  } satisfies Project);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDbSchema();
  const { id } = await context.params;

  const result = await sql`DELETE FROM projects WHERE id = ${id}`;

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
