import axios from 'axios';
import { UexPrice } from '../../domain/models.js';

export class UexAPIAdapter {
  private readonly baseUrl = 'https://api.uexcorp.uk/2.0';
  private readonly axiosConfig = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 15000
  };

  /**
   * Obtiene la lista completa de naves de la UEX API
   */
  async fetchVehicles(): Promise<any[]> {
    console.log('[UexAPI] Fetching vehicles...');
    try {
      const response = await axios.get(`${this.baseUrl}/vehicles`, this.axiosConfig);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching vehicles:', err);
      return [];
    }
  }

  /**
   * Obtiene los precios de compra (in-game) para todas las naves
   */
  async fetchVehiclePurchasePrices(): Promise<any[]> {
    console.log('[UexAPI] Fetching vehicles purchase prices...');
    try {
      const response = await axios.get(`${this.baseUrl}/vehicles_purchases_prices`, this.axiosConfig);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching vehicle purchase prices:', err);
      return [];
    }
  }

  /**
   * Obtiene la lista completa de armas de la UEX API
   */
  async fetchItems(): Promise<any[]> {
    console.log('[UexAPI] Fetching items...');
    try {
      const response = await axios.get(`${this.baseUrl}/items`, this.axiosConfig);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching items:', err);
      return [];
    }
  }

  /**
   * Obtiene los precios de compra (in-game) para todos los items
   */
  async fetchItemPurchasePrices(): Promise<any[]> {
    console.log('[UexAPI] Fetching items purchase prices...');
    try {
      const response = await axios.get(`${this.baseUrl}/items_prices_all`, this.axiosConfig);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching items prices:', err);
      return [];
    }
  }

  /**
   * Obtiene los precios de todas las mercancías (commodities)
   */
  async fetchCommoditiesPrices(): Promise<any[]> {
    console.log('[UexAPI] Fetching commodities prices...');
    try {
      const response = await axios.get(`${this.baseUrl}/commodities_prices_all`);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching commodities prices:', err);
      return [];
    }
  }

  /**
   * Obtiene la lista completa de terminales y sus características
   */
  async fetchTerminals(): Promise<any[]> {
    console.log('[UexAPI] Fetching terminals...');
    try {
      const response = await axios.get(`${this.baseUrl}/terminals`);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching terminals:', err);
      return [];
    }
  }
}
