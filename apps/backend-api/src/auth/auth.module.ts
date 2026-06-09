import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { Login } from './modules/login';
import { Register } from './modules/register';
import { RefreshToken } from './modules/refresh-token';
import { ChangePassword } from './modules/change-password';
import { UpdateProfile } from './modules/update-profile';
import { ForgotPassword } from './modules/forgot-password';
import { ResetPassword } from './modules/reset-password';
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
