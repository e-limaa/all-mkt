const { createClient } = require('@supabase/supabase-js');

// Substitua pelos dados do seu projeto Supabase
const SUPABASE_URL = 'https://xrnglprzyivxqtidfgrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybmdscHJ6eWl2eHF0aWRmZ3JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI4ODk2MiwiZXhwIjoyMDY1ODY0OTYyfQ.6doQE702m2SFMfzwEHPoxA2MmrHXItx_la05Pe2thdY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // já marca como confirmado
  });
  if (error) {
    console.error('Erro ao criar usuário:', error.message);
  } else {
    console.log('Usuário criado:', data.user.email);
  }
}

// Dados do usuário a ser criado
createUser('dulima20@gmail.com', 'senha123456');
