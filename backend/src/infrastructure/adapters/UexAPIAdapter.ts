import axios from 'axios';
import { UexPrice } from '../../domain/models.js';

export class UexAPIAdapter {
  private readonly baseUrl = 'https://api.uexcorp.uk/2.0';

  /**
   * Obtiene la lista completa de naves de la UEX API
   */
  async fetchVehicles(): Promise<any[]> {
    console.log('[UexAPI] Fetching vehicles...');
    try {
      const response = await axios.get(`${this.baseUrl}/vehicles`);
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
      const response = await axios.get(`${this.baseUrl}/vehicles_purchases_prices`);
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
      const response = await axios.get(`${this.baseUrl}/items`);
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
      const response = await axios.get(`${this.baseUrl}/items_prices_all`);
      return response.data?.data || [];
    } catch (err) {
      console.error('[UexAPI] Error fetching items prices:', err);
      return [];
    }
  }
}
