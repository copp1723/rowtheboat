import { MigrationInterface, QueryRunner } from 'typeorm';
import { SecretVault } from '../entities/SecretVault';
import { encrypt, deriveKey } from '../utils/crypto';
import dotenv from 'dotenv';

dotenv.config();

export class CreateSecretVaultAndMigrateSecrets1699999999999 implements MigrationInterface {
  name = 'CreateSecretVaultAndMigrateSecrets1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE secret_vault (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL,
        encrypted_value TEXT NOT NULL,
        user_id VARCHAR NULL,
        team_id VARCHAR NULL,
        type VARCHAR NOT NULL,
        metadata JSONB NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for RLS
    await queryRunner.query('CREATE INDEX idx_secret_vault_user_id ON secret_vault(user_id)');
    await queryRunner.query('CREATE INDEX idx_secret_vault_team_id ON secret_vault(team_id)');

    // Migrate existing secrets
    const secretsToMigrate = [
      { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY, type: 'api_key' },
      { name: 'IMAP_CONFIG', value: process.env.IMAP_CONFIG, type: 'email' },
      { name: 'SMTP_CONFIG', value: process.env.SMTP_CONFIG, type: 'email' },
      // Add other secrets from .env as needed
    ];

    for (const secret of secretsToMigrate) {
      if (secret.value) {
        await queryRunner.manager.save(
          SecretVault.encryptAndCreate({
            name: secret.name,
            value: secret.value,
            type: secret.type
          })
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE secret_vault');
  }
}
