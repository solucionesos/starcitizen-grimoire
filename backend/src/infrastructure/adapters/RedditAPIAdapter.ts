import axios from 'axios';

export interface DevPost {
  id: string;
  title: string;
  url: string;
  author: string;
  content: string;
  date: number;
}

export class RedditAPIAdapter {
  private readonly baseUrl = 'https://www.reddit.com/r/starcitizen/search.json?q=flair%3A%22Official%22+OR+flair%3A%22Dev+Response%22&sort=new&restrict_sr=on';

  async fetchDevPosts(): Promise<DevPost[]> {
    console.log('[RedditAPI] Fetching dev posts...');
    try {
      // Usar un User-Agent identificativo es buena práctica para la API de Reddit
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'StarGrimoire/1.0.0 (Node.js)'
        }
      });
      
      const posts = response.data?.data?.children || [];
      return posts.map((child: any) => {
        const p = child.data;
        return {
          id: p.id,
          title: p.title,
          url: `https://reddit.com${p.permalink}`,
          author: p.author,
          content: p.selftext || p.url, // Usa selftext si es post de texto, o el link externo si es link
          date: p.created_utc
        };
      });
    } catch (err) {
      console.error('[RedditAPI] Error fetching dev posts:', err);
      return [];
    }
  }
}
