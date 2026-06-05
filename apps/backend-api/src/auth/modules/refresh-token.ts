import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";
import { TokenService } from "../services/token.service";

@Injectable()
export class RefreshToken {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async execute(dto: any) {
    const { refreshToken } = dto;

    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken,
        isValid: true,
      },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const accessToken =
      this.tokenService.generateAccessToken(session.user);

    return {
      accessToken,
    };
  }
}