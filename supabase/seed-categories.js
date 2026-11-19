const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function seedGlobalCategories() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // Allow system_type_id to be NULL so categories can be global to all systems
  await client.query('ALTER TABLE public.system_choices ALTER COLUMN system_type_id DROP NOT NULL;');

  // Clean old sample choices and set up the 3 core categories: Concerns, Revisions, Suggestions
  await client.query(`
    -- Delete old dummy choices if needed or leave them
    DELETE FROM public.system_choices WHERE label IN ('Authentication & Login', 'Dashboard & Reports', 'Payment & Billing', 'Bug / Error', 'Feature Request', 'Performance Issue', 'Test');
  `);

  const coreCategories = [
    { label: 'Concerns', value: 'concerns', category: 'General' },
    { label: 'Revisions', value: 'revisions', category: 'General' },
    { label: 'Suggestions', value: 'suggestions', category: 'General' },
  ];

  for (const cat of coreCategories) {
    const check = await client.query('SELECT id FROM public.system_choices WHERE label = $1', [cat.label]);
    if (check.rows.length === 0) {
      await client.query(
        'INSERT INTO public.system_choices (system_type_id, label, value, category, active) VALUES (NULL, $1, $2, $3, true)',
        [cat.label, cat.value, cat.category]
      );
      console.log('Created global category:', cat.label);
    }
  }

  const remaining = await client.query('SELECT id, system_type_id, label, category FROM public.system_choices');
  console.log('Active categories in DB:', remaining.rows);

  await client.end();
}

seedGlobalCategories();

