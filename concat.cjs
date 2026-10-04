const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combined = '';
for (const file of files) {
  combined += fs.readFileSync(path.join(migrationsDir, file), 'utf8') + '\n\n';
}

combined += `
-- Finally, make Aditya an admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'aditya@gmail.com');
`;

fs.writeFileSync(path.join(__dirname, 'init_schema.sql'), combined, 'utf8');
console.log('init_schema.sql created successfully!');
