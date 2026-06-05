import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

@Injectable()
export class TokenService {
  generateAccessToken(user: any) {
    return this.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        deptId: user.departmentId ?? null,
      },
      this.requiredSecret('JWT_SECRET'),
      15 * 60,
    );
  }

  generateRefreshToken(user: any) {
    return this.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        deptId: user.departmentId ?? null,
        tokenType: 'refresh',
      },
      this.requiredSecret('JWT_REFRESH_SECRET'),
      7 * 24 * 60 * 60,
    );
  }

  verifyRefreshToken(token: string) {
    return this.verify(token, this.requiredSecret('JWT_REFRESH_SECRET'));
  }

  refreshExpiry() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private sign(payload: Record<string, unknown>, secret: string, expiresInSeconds: number) {
    const encodedHeader = this.base64UrlJson({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = this.base64UrlJson({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
    const signature = this.signSegments(encodedHeader, encodedPayload, secret);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verify(token: string, secret: string) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid token.');
    }

    if (this.signSegments(encodedHeader, encodedPayload, secret) !== signature) {
      throw new UnauthorizedException('Invalid token signature.');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

    if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token has expired.');
    }

    return payload;
  }

  private signSegments(encodedHeader: string, encodedPayload: string, secret: string) {
    return createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  }

  private base64UrlJson(value: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private requiredSecret(name: string) {
    const secret = process.env[name];

    if (!secret) {
      throw new UnauthorizedException(`${name} is not configured.`);
    }

    return secret;
  }
}
