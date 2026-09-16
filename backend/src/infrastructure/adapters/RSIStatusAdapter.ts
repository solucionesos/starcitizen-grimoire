import axios from 'axios';

export interface RSIStatus {
  page: { name: string; url: string; time_zone: string; updated_at: string };
  status: { indicator: string; description: string };
}

export interface RSIIncident {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  shortlink: string;
  incident_updates: { status: string; body: string; created_at: string; display_at: string }[];
}

export class RSIStatusAdapter {
  private readonly baseUrl = 'https://status.robertsspaceindustries.com/api/v2';

  async fetchStatus(): Promise<RSIStatus | null> {
    console.log('[RSIStatus] Fetching global status...');
    try {
      const response = await axios.get(`${this.baseUrl}/status.json`);
      return response.data;
    } catch (err) {
      console.error('[RSIStatus] Error fetching status:', err);
      return null;
    }
  }

  async fetchIncidents(): Promise<RSIIncident[]> {
    console.log('[RSIStatus] Fetching incidents...');
    try {
      const response = await axios.get(`${this.baseUrl}/incidents.json`);
      return response.data?.incidents || [];
    } catch (err) {
      console.error('[RSIStatus] Error fetching incidents:', err);
      return [];
    }
  }
}
