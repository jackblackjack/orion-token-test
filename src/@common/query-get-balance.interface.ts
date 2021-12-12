import { CurrencyType } from './currency-type.enum';

export interface IQueryGetBalance {
  addr: string;
  from?: Date | null;
  to?: Date | null;
  currency: CurrencyType[];
}
