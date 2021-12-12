import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddAddrHistoryMigration1639207562977 implements MigrationInterface {
  private tableName = 'addr_history_entity';
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
      name: 'addr_id',
      type: 'bigint',
      isNullable: false,
    },
    {
      name: 'block',
      type: 'bigint',
      isNullable: false,
    },
    {
      name: 'transactionAt',
      type: 'timestamp',
      isNullable: false,
    },
    {
      name: 'transaction',
      type: 'bigint',
      isNullable: false,
    },
    {
      name: 'usd',
      type: 'numeric',
      precision: 24,
      scale: 18,
      isNullable: false,
    },
    {
      name: 'eur',
      type: 'numeric',
      precision: 24,
      scale: 18,
      isNullable: false,
    },
    {
      name: 'volume',
      type: 'numeric',
      precision: 24,
      scale: 18,
      isNullable: false,
    },
  ].map((i: any) => new TableColumn(i));

  private addrFKeys = [
    {
      columnKey: 'addr_id',
      reference: {
        tableName: 'addr_entity',
        parentKey: 'id',
      },
      events: {
        delete: 'CASCADE',
        update: 'CASCADE',
      },
    }
  ];

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
        name: `${this.tableName}_history_udx`,
        columnNames: ['addr_id', 'block', 'transaction'],
        isUnique: true,
      })
    );

    for (const fk of this.addrFKeys) {
      await queryRunner.createForeignKey(
        this.tableName,
        new TableForeignKey({
          columnNames: [fk.columnKey],
          referencedTableName: fk.reference.tableName,
          referencedColumnNames: [fk.reference.parentKey],
          onDelete: fk.events.delete,
          onUpdate: fk.events.update,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(this.tableName, true, true);
  }
}
