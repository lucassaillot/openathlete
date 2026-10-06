import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtUser } from '../auth/decorators/user.decorator';
import type { AuthUser } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/services/auth.service';
import { AdminGuard } from './admin.guard';
import { AdminService, AdminUsersSort } from './admin.service';

const USERS_SORTS: AdminUsersSort[] = [
  'createdAt',
  'lastSeenAt',
  'lastLoginAt',
];

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Global platform counters (admin only)' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Search and list users (admin only)' })
  listUsers(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('sort') sort?: string,
  ) {
    return this.adminService.listUsers({
      search,
      page,
      sort: USERS_SORTS.find((s) => s === sort),
    });
  }

  @Get('users/:userId/logins')
  @ApiOperation({ summary: "A user's latest sign-ins (admin only)" })
  listLoginEvents(@Param('userId', ParseIntPipe) userId: number) {
    return this.adminService.listLoginEvents(userId);
  }

  @Post('impersonate/:userId')
  @ApiOperation({
    summary: 'Get read-only tokens to browse the app as a user (admin only)',
  })
  impersonate(
    @JwtUser() admin: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.authService.impersonate(admin.userId, userId);
  }
}
