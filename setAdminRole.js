const { createClient } = require("@supabase/supabase-js");

// Substitua pela sua Service Role Key do Supabase
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybmdscHJ6eWl2eHF0aWRmZ3JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI4ODk2MiwiZXhwIjoyMDY1ODY0OTYyfQ.6doQE702m2SFMfzwEHPoxA2MmrHXItx_la05Pe2thdY";
const SUPABASE_URL = "https://xrnglprzyivxqtidfgrc.supabase.co";
const USER_ID = "73fada16-8e45-45fd-a2c3-03ecb724392b"; // UID do usuário admin

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setAdminRole() {
  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    user_metadata: { role: "admin" },
  });
  if (error) {
    console.error("Erro ao atualizar usuário:", error);
  } else {
    console.log("Usuário atualizado com sucesso:", data);
  }
}

setAdminRole();

// Rode com: node setAdminRole.js
