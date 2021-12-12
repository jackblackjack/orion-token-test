export interface IBinanceKLine {
  e: string;
  E: string;
  s: string;
  k: {
    T: number;
    c: number;
    [k: string]: any;
  }
}
