import axios from 'axios';
import { db } from './db.js';
import { zohoConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';

const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.com';
const ZOHO_API_DOMAIN = 'https://www.zohoapis.com';

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

export class ZohoAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || '';
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
    this.redirectUri = process.env.ZOHO_REDIRECT_URI || `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/zoho/callback`;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'ZohoProjects.projects.ALL,ZohoSprints.sprints.ALL',
      redirect_uri: this.redirectUri,
      access_type: 'offline',
      state,
    });

    return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<ZohoTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      });

      const response = await axios.post(
        `${ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<ZohoTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      const response = await axios.post(
        `${ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error refreshing access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const connection = await db
        .select()
        .from(zohoConnections)
        .where(eq(zohoConnections.userId, userId))
        .limit(1);

      if (connection.length === 0) {
        return null;
      }

      const conn = connection[0];
      const now = new Date();
      const expiresAt = new Date(conn.expiresAt);

      if (expiresAt > now) {
        return conn.accessToken;
      }

      const tokenResponse = await this.refreshAccessToken(conn.refreshToken);
      
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenResponse.expires_in);

      await db
        .update(zohoConnections)
        .set({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || conn.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(zohoConnections.userId, userId));

      return tokenResponse.access_token;
    } catch (error: any) {
      console.error('Error getting valid access token:', error.message);
      return null;
    }
  }

  async saveConnection(
    userId: string,
    tokenResponse: ZohoTokenResponse,
    orgId?: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    const existing = await db
      .select()
      .from(zohoConnections)
      .where(eq(zohoConnections.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(zohoConnections)
        .set({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt,
          zohoOrgId: orgId || existing[0].zohoOrgId,
          updatedAt: new Date(),
        })
        .where(eq(zohoConnections.userId, userId));
    } else {
      await db.insert(zohoConnections).values({
        userId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        scope: 'ZohoProjects.projects.ALL,ZohoSprints.sprints.ALL',
        zohoOrgId: orgId,
      });
    }
  }

  async deleteConnection(userId: string): Promise<void> {
    await db
      .delete(zohoConnections)
      .where(eq(zohoConnections.userId, userId));
  }

  async hasValidConnection(userId: string): Promise<boolean> {
    const token = await this.getValidAccessToken(userId);
    return token !== null;
  }
}

export const zohoAuthService = new ZohoAuthService();
