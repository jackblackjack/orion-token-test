import { ConnectionOptions } from 'typeorm';

// Check typeORM documentation for more information.
const config: ConnectionOptions = {
  type: 'postgres',
  host: 'postgres',
  port: 5432,
  username: 'POSTGRES_USER',
  password: 'POSTGRES_PASSWORD',
  database: 'oriontest_db',
  entities: [
    __dirname + '/@common/entities/*{.ts,.js}'
  ],

  // We are using migrations, synchronize should be set to false.
  synchronize: false,

  // Run migrations automatically,
  // you can disable this if you prefer running migrations manually.
  migrationsRun: true,
  migrationsTransactionMode: 'all',

  logging: true,
  logger: 'file',

  // Allow both start:prod and start:dev to use migrations
  // __dirname is either dist or src folder, meaning either
  // the compiled js in prod or the ts in dev.
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  cli: {
    // Location of migrations should be inside src folder
    // to be compiled into dist/ folder.
    migrationsDir: 'src/migrations',
  },
};

export = config;
