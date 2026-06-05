import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { ChangePassword } from './modules/change-password';
import { ForgotPassword } from './modules/forgot-password';
import { Login } from './modules/login';
import { RefreshToken } from './modules/refresh-token';
import { Register } from './modules/register';
import { ResetPassword } from './modules/reset-password';
import { UpdateProfile } from './modules/update-profile';
import { VerifyOtp } from './modules/verify-otp';
import { TokenService } from './services/token.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    Login,
    Register,
    RefreshToken,
    ChangePassword,
    UpdateProfile,
    ForgotPassword,
    ResetPassword,
    VerifyOtp,
    TokenService,
  ],
})
export class AuthModule {}
