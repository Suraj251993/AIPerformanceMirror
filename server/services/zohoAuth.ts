import axios from 'axios';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { zohoConnections, users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

interface ZohoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  api_domain: string;
  scope?: string;
}

interface ZohoIDToken {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  exp: number;
}

export class ZohoAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private dataCenter: string;

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || '';
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
    this.redirectUri = process.env.ZOHO_REDIRECT_URI || '';
    this.dataCenter = process.env.ZOHO_DATA_CENTER || 'com';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('⚠️ Zoho OAuth credentials not configured. SSO will not work.');
    }
  }

  getAccountsUrl(): string {
    const dcMap: Record<string, string> = {
      'com': 'accounts.zoho.com',
      'eu': 'accounts.zoho.eu',
      'in': 'accounts.zoho.in',
      'au': 'accounts.zoho.com.au',
      'cn': 'accounts.zoho.com.cn',
    };
    return `https://${dcMap[this.dataCenter] || dcMap['com']}`;
  }

  getApiDomain(): string {
    const dcMap: Record<string, string> = {
      'com': 'people.zoho.com',
      'eu': 'people.zoho.eu',
      'in': 'people.zoho.in',
      'au': 'people.zoho.com.au',
      'cn': 'people.zoho.com.cn',
    };
    return `https://${dcMap[this.dataCenter] || dcMap['com']}`;
  }

  getAuthorizationUrl(state: string): string {
    const scopes = [
      'openid',
      'profile',
      'email',
      'ZohoPeople.forms.READ',
      'ZohoPeople.attendance.READ',
    ].join(',');

    const params = new URLSearchParams({
      scope: scopes,
      client_id: this.clientId,
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: this.redirectUri,
      prompt: 'consent',
      state: state,
    });

    return `${this.getAccountsUrl()}/oauth/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<ZohoTokenResponse> {
    try {
      const response = await axios.post(
        `${this.getAccountsUrl()}/oauth/v2/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.response?.data?.error || error.message}`);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<ZohoTokenResponse> {
    try {
      const response = await axios.post(
        `${this.getAccountsUrl()}/oauth/v2/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Error refreshing access token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh access token: ${error.response?.data?.error || error.message}`);
    }
  }

  decodeIDToken(idToken: string): ZohoIDToken {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
      }

      const payload = parts[1];
      let paddedPayload = payload;
      while (paddedPayload.length % 4 !== 0) {
        paddedPayload += '=';
      }

      const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error: any) {
      console.error('❌ Error decoding ID token:', error.message);
      throw new Error(`Failed to decode ID token: ${error.message}`);
    }
  }

  async storeTokens(userId: string, tokens: ZohoTokenResponse, scope: string): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    try {
      const existingConnection = await db.query.zohoConnections.findFirst({
        where: eq(zohoConnections.userId, userId),
      });

      if (existingConnection) {
        await db.update(zohoConnections)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existingConnection.refreshToken,
            expiresAt,
            tokenType: tokens.token_type,
            apiDomain: tokens.api_domain || this.getApiDomain(),
            zohoDataCenter: this.dataCenter,
            scope,
            updatedAt: new Date(),
          })
          .where(eq(zohoConnections.id, existingConnection.id));
      } else {
        await db.insert(zohoConnections).values({
          userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          tokenType: tokens.token_type,
          apiDomain: tokens.api_domain || this.getApiDomain(),
          zohoDataCenter: this.dataCenter,
          scope,
        });
      }

      console.log(`✅ Tokens stored for user ${userId}`);
    } catch (error: any) {
      console.error('❌ Error storing tokens:', error.message);
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  async getValidAccessToken(userId: string): Promise<string> {
    try {
      const connection = await db.query.zohoConnections.findFirst({
        where: eq(zohoConnections.userId, userId),
      });

      if (!connection) {
        throw new Error('No Zoho connection found for user');
      }

      const now = new Date();
      const expiresAt = new Date(connection.expiresAt);

      if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
        return connection.accessToken;
      }

      console.log(`🔄 Token expired for user ${userId}, refreshing...`);
      const tokens = await this.refreshAccessToken(connection.refreshToken);
      
      await this.storeTokens(userId, tokens, connection.scope);

      return tokens.access_token;
    } catch (error: any) {
      console.error('❌ Error getting valid access token:', error.message);
      throw new Error(`Failed to get valid access token: ${error.message}`);
    }
  }

  async revokeTokens(userId: string): Promise<void> {
    try {
      await db.delete(zohoConnections)
        .where(eq(zohoConnections.userId, userId));
      
      console.log(`✅ Tokens revoked for user ${userId}`);
    } catch (error: any) {
      console.error('❌ Error revoking tokens:', error.message);
      throw new Error(`Failed to revoke tokens: ${error.message}`);
    }
  }
}

export const zohoAuth = new ZohoAuthService();
