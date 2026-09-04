import crypto from 'node:crypto';
import { prisma } from './client';
import { BcryptPasswordHasher } from '../../auth/bcrypt-password-hasher';

function generateStrongPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

// Trata string vazia (ex: variável definida mas não preenchida no compose) como "não definida".
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : undefined;
}

async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (existingAdmin) {
    console.log(`[seed] Já existe um ADMIN (${existingAdmin.email}) — nada a fazer.`);
    return;
  }

  const name = readEnv('SEED_ADMIN_NAME') ?? 'Admin';
  const email = readEnv('SEED_ADMIN_EMAIL') ?? 'admin@hubdesk.local';
  const envPassword = readEnv('SEED_ADMIN_PASSWORD');
  const generatedPassword = envPassword ? null : generateStrongPassword();
  const password = envPassword ?? generatedPassword!;

  const passwordHasher = new BcryptPasswordHasher();
  const passwordHash = await passwordHasher.hash(password);

  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN', active: true },
  });

  console.log('[seed] Usuário ADMIN criado:');
  console.log(`  email: ${admin.email}`);
  if (generatedPassword) {
    console.log(`  senha (gerada automaticamente, anote agora — não será mostrada de novo): ${generatedPassword}`);
    console.log('  Defina SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD no .env para escolher suas próprias credenciais na próxima vez.');
  } else {
    console.log('  senha: a definida em SEED_ADMIN_PASSWORD');
  }
}

main()
  .catch((error) => {
    console.error('[seed] Falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
