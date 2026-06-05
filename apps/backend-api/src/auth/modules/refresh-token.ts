import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { TokenService } from "../services/token.service";

@Injectable()
export class RefreshToken {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async execute(dto: any) {
    const { refreshToken } = dto;
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    if (payload.tokenType !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const accessToken =
      this.tokenService.generateAccessToken(user);

    return {
      accessToken,
    };
  }
}
