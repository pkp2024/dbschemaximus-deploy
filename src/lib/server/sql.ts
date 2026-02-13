type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

type VercelSql = <T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<QueryResult<T>>;

type PgPool = {
  query: <T>(text: string, params: unknown[]) => Promise<QueryResult<T>>;
};

function toParameterizedQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = '';

  for (let i = 0; i < values.length; i += 1) {
    text += strings[i];
    text += `$${i + 1}`;
  }

  text += strings[strings.length - 1];

  return { text, params: values };
}

function shouldUseLocalPgClient(): boolean {
  return Boolean(process.env.DATABASE_URL) && !process.env.VERCEL;
}

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be configured');
  }

  return connectionString;
}

function getPgPool(): PgPool {
  const globalState = globalThis as typeof globalThis & {
    __drawsqlPgPool?: PgPool;
  };

  if (globalState.__drawsqlPgPool) {
    return globalState.__drawsqlPgPool;
  }

  let Pool: new (options: { connectionString: string; ssl?: { rejectUnauthorized: boolean } }) => PgPool;

  try {
    const requireFn = eval('require') as (id: string) => unknown;
    const pgModule = requireFn('pg') as { Pool: typeof Pool };
    Pool = pgModule.Pool;
  } catch {
    throw new Error('Local Postgres mode requires "pg". Run: npm install pg');
  }

  const connectionString = getConnectionString();
  const sslRequired = connectionString.includes('sslmode=require');

  globalState.__drawsqlPgPool = new Pool({
    connectionString,
    ...(sslRequired ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  return globalState.__drawsqlPgPool;
}

let vercelSql: VercelSql | null = null;

async function getVercelSql(): Promise<VercelSql> {
  if (vercelSql) {
    return vercelSql;
  }

  const vercelModule = await import('@vercel/postgres');
  vercelSql = vercelModule.sql as VercelSql;
  return vercelSql;
}

export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult<T>> {
  if (shouldUseLocalPgClient()) {
    const pool = getPgPool();
    const { text, params } = toParameterizedQuery(strings, values);
    return pool.query<T>(text, params);
  }

  const taggedSql = await getVercelSql();
  return taggedSql<T>(strings, ...values);
}
