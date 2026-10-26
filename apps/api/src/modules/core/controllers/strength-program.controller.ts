import { ZodValidationPipe } from 'nestjs-zod';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AssignStrengthSessionDto,
  CreateStrengthCategoryDto,
  CreateStrengthProgramDto,
  CreateStrengthSessionDto,
  UpdateStrengthCategoryDto,
  UpdateStrengthProgramDto,
  UpdateStrengthSessionDto,
  UpsertStrengthExerciseDto,
  assignStrengthSessionSchema,
  createStrengthCategorySchema,
  createStrengthProgramSchema,
  createStrengthSessionSchema,
  updateStrengthCategorySchema,
  updateStrengthProgramSchema,
  updateStrengthSessionSchema,
  upsertStrengthExerciseSchema,
} from '@openathlete/shared';

import { JwtUser, UserTypeGuard } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';

import { StrengthProgramService } from '../services/strength-program.service';

@ApiTags('Strength')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), UserTypeGuard)
@Controller('strength')
export class StrengthProgramController {
  constructor(private readonly strengthService: StrengthProgramService) {}

  // Categories ---------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: "List the user's strength categories" })
  getCategories(@JwtUser() user: AuthUser) {
    return this.strengthService.getCategories(user);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a strength category' })
  createCategory(
    @JwtUser() user: AuthUser,
    @Body(new ZodValidationPipe(createStrengthCategorySchema))
    body: CreateStrengthCategoryDto,
  ) {
    return this.strengthService.createCategory(user, body);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: 'Update a strength category' })
  updateCategory(
    @JwtUser() user: AuthUser,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body(new ZodValidationPipe(updateStrengthCategorySchema))
    body: UpdateStrengthCategoryDto,
  ) {
    return this.strengthService.updateCategory(user, categoryId, body);
  }

  @Delete('categories/:categoryId')
  @ApiOperation({
    summary: 'Delete a strength category (its programs are kept)',
  })
  deleteCategory(
    @JwtUser() user: AuthUser,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.strengthService.deleteCategory(user, categoryId);
  }

  // Programs -----------------------------------------------------------------

  @Get('programs')
  @ApiOperation({ summary: "List the user's strength programs" })
  getPrograms(@JwtUser() user: AuthUser) {
    return this.strengthService.getPrograms(user);
  }

  @Get('programs/:programId')
  @ApiOperation({ summary: 'Get a strength program with its sessions' })
  getProgram(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
  ) {
    return this.strengthService.getProgram(user, programId);
  }

  @Post('programs')
  @ApiOperation({ summary: 'Create a strength program' })
  createProgram(
    @JwtUser() user: AuthUser,
    @Body(new ZodValidationPipe(createStrengthProgramSchema))
    body: CreateStrengthProgramDto,
  ) {
    return this.strengthService.createProgram(user, body);
  }

  @Patch('programs/:programId')
  @ApiOperation({ summary: 'Update a strength program' })
  updateProgram(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
    @Body(new ZodValidationPipe(updateStrengthProgramSchema))
    body: UpdateStrengthProgramDto,
  ) {
    return this.strengthService.updateProgram(user, programId, body);
  }

  @Delete('programs/:programId')
  @ApiOperation({ summary: 'Delete a strength program' })
  deleteProgram(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
  ) {
    return this.strengthService.deleteProgram(user, programId);
  }

  @Post('programs/:programId/weeks/:weekNumber/copy')
  @ApiOperation({ summary: 'Append a copy of a week at the end' })
  copyWeek(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
  ) {
    return this.strengthService.copyWeek(user, programId, weekNumber);
  }

  @Delete('programs/:programId/weeks/:weekNumber')
  @ApiOperation({ summary: 'Delete a week (following weeks shift up)' })
  deleteWeek(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
  ) {
    return this.strengthService.deleteWeek(user, programId, weekNumber);
  }

  // Sessions -----------------------------------------------------------------

  @Post('programs/:programId/sessions')
  @ApiOperation({ summary: 'Add a session to a week of a program' })
  createSession(
    @JwtUser() user: AuthUser,
    @Param('programId', ParseIntPipe) programId: number,
    @Body(new ZodValidationPipe(createStrengthSessionSchema))
    body: CreateStrengthSessionDto,
  ) {
    return this.strengthService.createSession(user, programId, body);
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({ summary: 'Update a program session' })
  updateSession(
    @JwtUser() user: AuthUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe(updateStrengthSessionSchema))
    body: UpdateStrengthSessionDto,
  ) {
    return this.strengthService.updateSession(user, sessionId, body);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a program session' })
  deleteSession(
    @JwtUser() user: AuthUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.strengthService.deleteSession(user, sessionId);
  }

  @Post('sessions/:sessionId/assign')
  @ApiOperation({
    summary: "Place a copy of the session in an athlete's calendar",
  })
  assignSession(
    @JwtUser() user: AuthUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ZodValidationPipe(assignStrengthSessionSchema))
    body: AssignStrengthSessionDto,
  ) {
    return this.strengthService.assignSession(user, sessionId, body);
  }

  // Exercise library ---------------------------------------------------------

  @Get('exercises')
  @ApiOperation({ summary: "List the user's exercise library" })
  getExercises(@JwtUser() user: AuthUser) {
    return this.strengthService.getExercises(user);
  }

  @Put('exercises')
  @ApiOperation({ summary: 'Create or update an exercise (by name)' })
  upsertExercise(
    @JwtUser() user: AuthUser,
    @Body(new ZodValidationPipe(upsertStrengthExerciseSchema))
    body: UpsertStrengthExerciseDto,
  ) {
    return this.strengthService.upsertExercise(user, body);
  }

  @Delete('exercises/:exerciseId')
  @ApiOperation({ summary: 'Delete an exercise from the library' })
  deleteExercise(
    @JwtUser() user: AuthUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.strengthService.deleteExercise(user, exerciseId);
  }
}
