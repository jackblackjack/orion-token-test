import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import mergeConfig from 'axios/lib/core/mergeConfig';
import AxiosDefaults from 'axios/lib/defaults';
import qs from 'qs';
import { lastValueFrom } from 'rxjs';
import { map, timeout } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { HTTP_REQUEST_TIMEOUT_MSEC } from '../config/constants';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly http: HttpService,
  ) {}

  /**
   * Merge default axios options with options.
   *
   * @param {AxiosDefaults} [options={}]
   *
   * @memberOf HttpClientService
   */
  setDefaults(options: AxiosDefaults = {}) {
    this.http.axiosRef.defaults = mergeConfig(this.http.axiosRef.defaults, options);
  }

  /**
   * Compose request options and return it.
   *
   * @private
   * @param {Partial<AxiosRequestConfig>} [options]
   * @returns {AxiosRequestConfig}
   *
   * @memberOf HttpClientService
   */
  private getRequestConfig(options?: Partial<AxiosRequestConfig>): AxiosRequestConfig {
    return mergeConfig(this.http.axiosRef.defaults, options);
  }

  /**
   * Make GET request.
   *
   * @template T
   * @param {string} uri
   * @param {*} [params]
   * @returns {Promise<T>}
   *
   * @memberOf HttpClientService
   */
  async makeGet<T>(uri: string, params?: any): Promise<T> {
    try {
      // Prepare query.
      const query = qs.stringify(params ?? {});
      uri = (query ? `${uri}?${query}` : uri);

      // Add entry debug log about request.
      this.logger.debug(
        `Make GET request to "${this.http.axiosRef.defaults.baseURL?.concat(uri)}" with params ${JSON.stringify(params ?? {})}.`
      );

      // make get request.
      const apiResponse = await lastValueFrom<T>(
        this.http.get<T>(uri, this.getRequestConfig()).pipe(
          timeout(HTTP_REQUEST_TIMEOUT_MSEC),
          map((response: AxiosResponse) => response.data)
        )
      );

      /*
      const apiResponse: any = await new Promise((resolve, reject) => {
        this.http.get<T>((query ? `${uri}?${query}` : uri), this.getRequestConfig()).pipe(
          timeout(HTTP_REQUEST_TIMEOUT_MSEC),
          map((response: AxiosResponse) => response.data),
        ).subscribe({
          next: (data: AxiosResponse) => console.log(data),
          complete: () => resolve([]),
          error: (error) => reject(error)
        })
      }).catch((error) => {
        if (error instanceof TimeoutError) {
          throw new Error(`Exceed timeout!`);
        }
      });
      */

      return apiResponse;
    } catch (error) {
      if ((error as AxiosError).response) {
        // the request went through and a response was returned
        // status code in 3xx / 4xx / 5xx range
        this.logger.log(`API ${uri} error data: ${error.response.data}`);
        this.logger.log(`API ${uri} error status: ${error.response.status}`);
        this.logger.log(`API ${uri} error headers: ${error.response.headers}`);

        if (error.request) {
          // request was made but server returned no response
          this.logger.log(`API ${uri} error request: ${error.request}`);
        }
      }
      throw error;
    }
  }
}
