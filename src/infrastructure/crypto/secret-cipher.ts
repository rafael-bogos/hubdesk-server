import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../main/config/env';

// Cifra os client secrets de OAuth (Google / customizado) antes de salvar no
// banco — nunca em texto puro. AES-256-GCM: IV aleatório de 12 bytes + auth
// tag de 16 bytes guardados junto com o texto cifrado (tudo em uma string
// base64 "iv.tag.ciphertext"), pra não precisar de uma coluna extra por peça.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getKey = (): Buffer => {
  const key = Buffer.from(env.settingsEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY precisa decodificar (base64) pra exatamente 32 bytes');
  }
  return key;
};

export const encryptSecret = (plain: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
};

export const decryptSecret = (encrypted: string): string => {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split('.');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Valor cifrado em formato inválido');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plain.toString('utf8');
};
