// Explicit exports to avoid conflicts
export { NotificationEntity } from './notification.entity';

export { NotificationPreferenceResponseDto, 
    UpdateNotificationPreferenceDto,
    BulkUpdateNotificationPreferenceDto,
    UserNotificationSettingsResponseDto,
    UpdateUserNotificationSettingsDto,
    
 } from './notification-preference.entity';

export { NotificationDigestEntity ,
    CreateNotificationDigestDto ,
    UpdateNotificationDigestDto, 
    AddDigestItemsDto,
    NotificationDigestResponseDto, 
    PaginatedDigestResponseDto,
    DigestGenerationOptions,
    DigestStatisticsDto,
 } from './notification-digest.entity';

export { UserNotificationSettingsEntity } from './user-notification-settings.entity';

// Re-export DTOs with explicit names
export { MarkAsReadDto } from '../dto/mark-as-read.dto';

export { NotificationResponseDto, 
    PaginatedNotificationResponseDto,
     NotificationSummaryDto } from '../dto/notification-response.dto';