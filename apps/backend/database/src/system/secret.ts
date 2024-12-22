import { randomInt } from 'node:crypto';

export function generateRandomPassword(length: number) {
  // Define the characters you want to include in the password
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
  const charactersLength = characters.length;
  let password = '';

  // Generate a random password
  for (let i = 0; i < length; i++) {
    // Use crypto to generate a random index
    const randomIndex = randomInt(0, charactersLength);
    password += characters[randomIndex];
  }

  return password;
}

// Store secret here, not in system instance
let secret: string | undefined;

export function getSecret() {
  return secret!;
}

export function setSecret(input: string | undefined) {
  if (input) {
    secret = input;
  } else {
    secret = generateRandomPassword(32);
  }
  return secret;
}
