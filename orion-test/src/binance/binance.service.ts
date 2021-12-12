import { DateTime, Settings } from 'luxon';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from 'ws';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IBinanceKLine } from '../@common/binance-kline.interface';
import { CurrencyType } from '../@common/currency-type.enum';
import { IExchange } from '../@common/exchange.interface';
import {
    BINANCE_FETCH_CANDLES_INTERVAL, BINANCE_FETCH_CANDLES_LIMIT, BINANCE_FETCH_CANDLES_TIMESHIFT_MSEC, CONFIG_BINANCE_OPTIONS_SERVICE_REGISTER_AS,
    CONFIG_WS_OPTIONS_REGISTER_AS, CURRENCY_TIMESHIFT_AS_FRESH_SEC,
} from '../config/constants';
import { IBinanceOptions } from '../config/interfaces/binance-options.interface';
import { IWsOptions } from '../config/interfaces/ws-options.interface';
import { HttpClientService } from '../http-client/http-client.service';

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);

  /**
   * List of supports currencies and symbols assigned.
   *
   * @private
   * @type {{[index: string]:any}}
   * @memberOf BinanceService
   */
  private supportCurrency: { [index: string]: any } = {
    'USD': 'ORNUSDT',
    'EUR': 'EURUSDT',
  };

  /**
   * List of latest exchanges.
   *
   * @private
   * @type {Map<string, IExchange>}
   * @memberOf BinanceService
   */
  private exchanges: Map<CurrencyType, IExchange> = new Map<CurrencyType, IExchange>();

  /**
   * List of streams by symbols.
   *
   * @private
   * @type {Map<string, ReconnectingWebSocket>}
   * @memberOf BinanceService
   */
  private subscriptions: Map<string, ReconnectingWebSocket> = new Map<string, ReconnectingWebSocket>();

  constructor(
    private readonly configService: ConfigService,
    private readonly http: HttpClientService,
  ) {}

  onModuleInit(): any {
    const websocketOptions = this.configService.get<IWsOptions>(CONFIG_WS_OPTIONS_REGISTER_AS);
    const wsOptions = {
      WebSocket: WS,
      ...websocketOptions,
    };

    // Fetch options.
    const binanceOptions = this.configService.get<IBinanceOptions>(CONFIG_BINANCE_OPTIONS_SERVICE_REGISTER_AS);

    // Checking that wss base url.
    if (!binanceOptions?.wssBaseUrl) {
      throw new Error('Websocket target url has not found!');
    }

    // Init supports currencies streams via binance.
    // @see https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-streams
    for (const currency of Object.keys(this.supportCurrency)) {
      const url = `${binanceOptions?.wssBaseUrl}/${String(this.supportCurrency[currency]).toLowerCase()}@kline_1m`;
      this.logger.debug(`Create subscription for symbol "${this.supportCurrency[currency]}" via ${url}.`);
      this.subscriptions.set(currency, new ReconnectingWebSocket(url, '', wsOptions));
    }

    // Checking that http base url is exists in options.
    if (!binanceOptions?.httpBaseUrl) {
      throw new Error('Http target url has not found!');
    }

    // Set axios defaults.
    this.http.setDefaults({
      baseURL: binanceOptions?.httpBaseUrl,
      timeout: 50000,
    });

    // Register handlers for ws events.
    this.registerMessageHandlers();
  }

  onModuleDestroy(): any {
    // Close all streams.
    const subKeys = this.subscriptions.keys();
    for (const target of subKeys) {
      if (this.subscriptions.has(target)) {
        const ws = this.subscriptions.get(target);
        ws?.close();
      }
    }
  }

  /**
   *
   *
   * @private
   * @param {string} symbol
   * @param {number} startTime
   * @returns
   *
   * @memberOf BinanceService
   */
  private async getApproxCloseCost(symbol: string, startTime: number) {
    // Fetch list of candles by start time for symbol.
    const dtStart = DateTime.fromMillis(startTime - BINANCE_FETCH_CANDLES_TIMESHIFT_MSEC);
    const candles = await this.getCandles(symbol, dtStart.toSeconds());
    this.logger.debug(`Fetch list of candles of "${symbol}" by start period from ${dtStart.toISO()}: ${candles?.length ?? 0}`);

    // Seeks for relative close price of candle.
    const diff = candles.map((candle: any) => candle[6] - startTime);
    const minIndex = diff.indexOf(Math.max(...diff));
    return parseFloat(candles[minIndex][4]);
  }

  /**
   * Seeks for and returns the value of the ORN token in the target currency closest to the startTime timestamp.
   *
   * @param {string} name
   * @param {number} startTime
   * @returns
   *
   * @memberOf BinanceService
   */
  async getTokenCurrencyCost(name: string, startTime: number): Promise<number> {
    // Check that target currency has been support.
    if (!Object.keys(this.supportCurrency).includes(name)) {
      throw new Error(`Currency ${name} is not supports.`);
    }

    // Define the symbol by currency name.
    const symbol: string = this.supportCurrency[name];

    // Define the current time.
    const dtCurrent = DateTime.now();
    const dtStart = DateTime.fromMillis(startTime);

    //
    // If:
    // (1.) delay between current time and target time less than CURRENCY_TIMESHIFT_AS_FRESH_SEC.
    //
    if (dtCurrent.toSeconds() - dtStart.toSeconds() <= CURRENCY_TIMESHIFT_AS_FRESH_SEC && this.exchanges.has(name as CurrencyType)) {
      const exchangeSymData = this.exchanges.get(name as CurrencyType);
      if (exchangeSymData) {
        const { at: symAt, cost: symCost }: IExchange = exchangeSymData;
        const symDt = DateTime.fromSeconds(symAt);
        // and (2.) delay between latest save of currency cost by stream less than CURRENCY_TIMESHIFT_AS_FRESH_SEC.
        this.logger.debug(`Delay between latest save of currency (${name}) cost by stream: ${dtCurrent.toSeconds() - symDt.toSeconds()}.`);
        if (dtCurrent.toSeconds() - symDt.toSeconds() <= CURRENCY_TIMESHIFT_AS_FRESH_SEC) {
          if ('USD' === name) {
            return symCost;
          } else {
            if (this.exchanges.has(CurrencyType.EUR)) {
              const exchangeEurData = this.exchanges.get(CurrencyType.EUR);
              if (exchangeEurData) {
                const { at: eurAt, cost: eurCost }: IExchange = exchangeEurData;
                const eurDt = DateTime.fromSeconds(eurAt);
                // if target currency is not USD and xxx/USD has been exists.
                this.logger.debug(`Delay between latest save of currency (EUR/USD) cost by stream: ${dtCurrent.toSeconds() - eurDt.toSeconds()}.`);
                if (dtCurrent.toSeconds() - eurDt.toSeconds() <= CURRENCY_TIMESHIFT_AS_FRESH_SEC) {
                  return symCost * eurCost;
                }
              }
            }
          }
        }
      }
    }

    return 'USD' === name ? await this.getApproxCloseCost(symbol, dtStart.toMillis())
    : (
      await this.getApproxCloseCost(symbol, dtStart.toMillis()) *
        (await this.getApproxCloseCost(this.supportCurrency['EUR'], dtStart.toMillis()))
      );
  }

  /**
   * Make http request for fetch candles for symbol by start time with limit.
   *
   * @see https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
   * @private
   * @param {string} symbol
   * @param {number} startTime
   * @returns
   *
   * @memberOf BinanceService
   */
  private async getCandles(symbol: string, startTime: number) {
    try {
      const dtStart = DateTime.fromSeconds(startTime);
      this.logger.debug(`Fetch candles for symbol "${symbol}" from ${dtStart.toISO()} (${dtStart.toMillis()}) with limit ` + BINANCE_FETCH_CANDLES_LIMIT + ` and interval ` + BINANCE_FETCH_CANDLES_INTERVAL + `.`);
      return await this.http.makeGet<any>('/klines', {
        symbol,
        startTime: dtStart.toMillis(),
        limit: BINANCE_FETCH_CANDLES_LIMIT,
        interval: BINANCE_FETCH_CANDLES_INTERVAL
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Register handlers for stream messages of supported currencies.
   *
   * @memberOf BinanceService
   */
  registerMessageHandlers() {
    const subKeys = this.subscriptions.keys();
    for (const target of subKeys) {
      if (!this.subscriptions.has(target)) {
        this.logger.warn(`Cannot found websocket for target ${target}.`);
      }

      // Register handler for supported currencies.
      const ws = this.subscriptions.get(target);
      ws?.addEventListener('message', (event) => {
        const kline = JSON.parse(event.data) as IBinanceKLine;

        // Flip supported currencies.
        const curMap = Object.assign({}, ...Object.entries(this.supportCurrency).map(([a, b]) => ({ [b]: a })));

        if (!(kline.s in curMap)) {
          this.logger.warn(`Symbol ${kline.s} not found into supports currecnies.`);
        } else {
          // Set latest exchange.
          const symbol = curMap[kline.s];
          const cost = parseFloat(kline.k.c.toString());
          const dtStart = DateTime.fromMillis(kline.k.T);
          this.exchanges.set(symbol, { at: dtStart.toSeconds(), cost })
        }
      });
    }
  }
}
