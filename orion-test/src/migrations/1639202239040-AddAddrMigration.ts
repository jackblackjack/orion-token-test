import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

export class AddAddrMigration1639202239040 implements MigrationInterface {
  private tableName = 'addr_entity';
  private tableCols = [
    {
      name: 'id',
      type: 'bigint',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment',
    },
    {
      name: 'createdAt',
      type: 'timestamp',
      default: 'now()',
    },
    {
      name: 'addr',
      type: 'varchar',
      isNullable: false,
    },
    {
      name: 'balance',
      type: 'numeric',
      precision: 24,
      scale: 18,
      isNullable: false,
    },
  ].map((i: any) => new TableColumn(i));

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: this.tableCols,
      })
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: `${this.tableName}_addr_udx`,
        columnNames: ['addr'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName, true, true, true);
  }
}
