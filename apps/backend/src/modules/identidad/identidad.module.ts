import { Global, Module } from '@nestjs/common';
import { DB } from '../../common/db.module.js';
import { SupabaseTokenVerifier, UserDirectory } from '../../common/supabase-auth.js';
import { config } from '../../config.js';
import type { Db } from '../../db/client.js';

/**
 * Sign-in itself (phone OTP, email, Google) happens in Supabase Auth. This module only
 * checks the tokens Supabase issues and maps each user to our roles.
 */
@Global()
@Module({
  providers: [
    {
      provide: SupabaseTokenVerifier,
      useFactory: () => new SupabaseTokenVerifier({ supabaseUrl: config().SUPABASE_URL, jwtSecret: config().SUPABASE_JWT_SECRET }),
    },
    { provide: UserDirectory, useFactory: (db: Db) => new UserDirectory(db), inject: [DB] },
  ],
  exports: [SupabaseTokenVerifier, UserDirectory],
})
export class IdentidadModule {}
