import { ZodValidationPipe } from 'nestjs-zod';

import {
  BadRequestException,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SportType, TrainingZoneType } from '@openathlete/database';
import {
  CreateTrainingZoneDto,
  ReplaceTrainingZonesDto,
  UpdateTrainingZoneDto,
  createTrainingZoneDtoSchema,
  replaceTrainingZonesDtoSchema,
  updateTrainingZoneDtoSchema,
} from '@openathlete/shared';

import { JwtUser, UserTypeGuard } from 'src/modules/auth';
import { AuthUser } from 'src/modules/auth/decorators/user.decorator';

import { TrainingZoneService } from '../services/training-zone.service';

@ApiTags('Training Zone')
@Controller('training-zone')
export class TrainingZoneController {
  constructor(private readonly trainingZoneService: TrainingZoneService) {}

  @UseGuards(AuthGuard('jwt'), UserTypeGuard)
  @ApiBearerAuth()
  @Get('athlete/:athleteId')
  @ApiOperation({
    summary: 'Get all training zones for an athlete',
    description:
      'Retrieves all training zones for a specific athlete. Zones are ordered by index (ascending). Each zone includes its values (min, max, associated sports). Uses CASL authorization to verify that the user has read access to the athlete.',
  })
  @ApiParam({
    name: 'athleteId',
    type: Number,
    description: 'ID of the athlete to get training zones for',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of training zones retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trainingZoneId: { type: 'number', example: 1 },
          athleteId: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Zone 1 - Recovery' },
          description: {
            type: 'string',
            example: 'Easy recovery pace',
          },
          index: {
            type: 'number',
            description: 'Zone index for ordering (0-based)',
            example: 0,
          },
          type: {
            type: 'string',
            enum: Object.values(TrainingZoneType),
            description: 'Type of training zone',
            example: 'HEARTRATE',
          },
          color: {
            type: 'string',
            description: 'Color code for the zone (hex or CSS color)',
            example: '#00FF00',
          },
          values: {
            type: 'array',
            description: 'Zone values (min, max, sports)',
            items: {
              type: 'object',
              properties: {
                trainingZoneValueId: { type: 'number', example: 1 },
                trainingZoneId: { type: 'number', example: 1 },
                min: {
                  type: 'number',
                  description:
                    'Minimum value for the zone (unit depends on type)',
                  example: 120,
                },
                max: {
                  type: 'number',
                  description:
                    'Maximum value for the zone (unit depends on type)',
                  example: 140,
                },
                sports: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Sports this zone value applies to',
                  example: ['RUNNING', 'TRAIL_RUNNING'],
                },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have read access to this athlete',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - athlete not found',
  })
  getAllForAthlete(
    @JwtUser() user: AuthUser,
    @Param('athleteId', ParseIntPipe) athleteId: number,
  ) {
    return this.trainingZoneService.getAllForAthlete(user, athleteId);
  }

  @UseGuards(AuthGuard('jwt'), UserTypeGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create a new training zone',
    description:
      'Creates a new training zone for an athlete. The zone index is automatically set based on the number of existing zones of the same type. A zone value is automatically created with the provided min, max, and sports. Uses CASL authorization to verify that the user has update access to the athlete.',
  })
  @ApiBody({
    description: 'Training zone creation data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Zone name (minimum 1 character)',
          example: 'Zone 1 - Recovery',
          minLength: 1,
        },
        description: {
          type: 'string',
          nullable: true,
          description: 'Zone description',
          example: 'Easy recovery pace for active recovery',
        },
        type: {
          type: 'string',
          enum: Object.values(TrainingZoneType),
          description: 'Type of training zone',
          example: 'HEARTRATE',
        },
        color: {
          type: 'string',
          description: 'Color code for the zone (hex or CSS color)',
          example: '#00FF00',
        },
        values: {
          type: 'array',
          description:
            'Zone values (min, max, sports). Each value must satisfy min < max.',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              min: {
                type: 'number',
                description:
                  'Minimum value. Unit depends on type: bpm for HEARTRATE, watts for POWER, min/km for PACE',
                example: 120,
              },
              max: {
                type: 'number',
                description:
                  'Maximum value. Unit depends on type: bpm for HEARTRATE, watts for POWER, min/km for PACE',
                example: 140,
              },
              sports: {
                type: 'array',
                items: { type: 'string', enum: Object.values(SportType) },
                description: 'Sports this value applies to',
                example: ['RUNNING', 'TRAIL_RUNNING'],
                minItems: 1,
              },
            },
          },
        },
        athleteId: {
          type: 'number',
          description: 'ID of the athlete to create the zone for',
          example: 1,
        },
      },
      required: ['name', 'type', 'color', 'values', 'athleteId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Training zone created successfully',
    schema: {
      type: 'object',
      properties: {
        trainingZoneId: { type: 'number', example: 1 },
        athleteId: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Zone 1 - Recovery' },
        description: { type: 'string', example: 'Easy recovery pace' },
        index: {
          type: 'number',
          description: 'Zone index (automatically assigned)',
          example: 0,
        },
        type: {
          type: 'string',
          enum: Object.values(TrainingZoneType),
          example: 'HEARTRATE',
        },
        color: { type: 'string', example: '#00FF00' },
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              trainingZoneValueId: { type: 'number', example: 1 },
              trainingZoneId: { type: 'number', example: 1 },
              min: { type: 'number', example: 120 },
              max: { type: 'number', example: 140 },
              sports: {
                type: 'array',
                items: { type: 'string' },
                example: ['RUNNING', 'TRAIL_RUNNING'],
              },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - min >= max on a value, or the value overlaps an existing zone of the same type for a shared sport',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have update access to this athlete',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - athlete not found',
  })
  async create(
    @JwtUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTrainingZoneDtoSchema))
    dto: CreateTrainingZoneDto,
  ) {
    return this.trainingZoneService.create(user, dto);
  }

  @UseGuards(AuthGuard('jwt'), UserTypeGuard)
  @ApiBearerAuth()
  @Patch(':trainingZoneId')
  @ApiOperation({
    summary: 'Update a training zone',
    description:
      "Updates an existing training zone. Only the zone owner (athlete or their coach) can update it. The submitted values entirely replace the zone's existing values. The zone type and index cannot be changed here (index is managed by the bulk replace endpoint). Uses CASL authorization to verify that the user has update access to the athlete.",
  })
  @ApiParam({
    name: 'trainingZoneId',
    type: Number,
    description: 'ID of the training zone to update',
    example: 1,
  })
  @ApiBody({
    description: 'Training zone update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Updated zone name (minimum 1 character)',
          example: 'Zone 1 - Recovery (Updated)',
          minLength: 1,
        },
        description: {
          type: 'string',
          nullable: true,
          description: 'Updated zone description',
          example: 'Updated easy recovery pace',
        },
        color: {
          type: 'string',
          description: 'Updated color code',
          example: '#00FF00',
        },
        values: {
          type: 'array',
          description:
            'Updated zone values (min, max, sports). Replaces all existing values for this zone. Each value must satisfy min < max.',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              min: {
                type: 'number',
                description:
                  'Updated minimum value. Unit depends on type: bpm for HEARTRATE, watts for POWER, min/km for PACE',
                example: 115,
              },
              max: {
                type: 'number',
                description:
                  'Updated maximum value. Unit depends on type: bpm for HEARTRATE, watts for POWER, min/km for PACE',
                example: 135,
              },
              sports: {
                type: 'array',
                items: { type: 'string', enum: Object.values(SportType) },
                description: 'Updated array of sports',
                example: ['RUNNING'],
                minItems: 1,
              },
            },
          },
        },
      },
      required: ['name', 'color', 'values'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Training zone updated successfully',
    schema: {
      type: 'object',
      properties: {
        trainingZoneId: { type: 'number', example: 1 },
        athleteId: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Zone 1 - Recovery (Updated)' },
        description: { type: 'string', example: 'Updated easy recovery pace' },
        index: { type: 'number', example: 0 },
        type: {
          type: 'string',
          enum: Object.values(TrainingZoneType),
          example: 'HEARTRATE',
        },
        color: { type: 'string', example: '#00FF00' },
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              trainingZoneValueId: { type: 'number', example: 1 },
              trainingZoneId: { type: 'number', example: 1 },
              min: { type: 'number', example: 115 },
              max: { type: 'number', example: 135 },
              sports: {
                type: 'array',
                items: { type: 'string' },
                example: ['RUNNING'],
              },
            },
          },
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have update access to this athlete',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - min >= max on a value, or the value overlaps an existing zone of the same type for a shared sport',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - training zone or athlete not found',
  })
  async update(
    @JwtUser() user: AuthUser,
    @Param('trainingZoneId', ParseIntPipe) trainingZoneId: number,
    @Body(new ZodValidationPipe(updateTrainingZoneDtoSchema))
    dto: UpdateTrainingZoneDto,
  ) {
    return this.trainingZoneService.update(user, trainingZoneId, dto);
  }

  @UseGuards(AuthGuard('jwt'), UserTypeGuard)
  @ApiBearerAuth()
  @Delete(':trainingZoneId')
  @ApiOperation({
    summary: 'Delete a training zone',
    description:
      'Permanently deletes a training zone and all its associated values. Only the zone owner (athlete or their coach) can delete it. Uses CASL authorization to verify that the user has update access to the athlete. This operation cannot be undone.',
  })
  @ApiParam({
    name: 'trainingZoneId',
    type: Number,
    description: 'ID of the training zone to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Training zone deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have update access to this athlete',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - training zone or athlete not found',
  })
  delete(
    @JwtUser() user: AuthUser,
    @Param('trainingZoneId', ParseIntPipe) trainingZoneId: number,
  ) {
    return this.trainingZoneService.delete(user, trainingZoneId);
  }

  @UseGuards(AuthGuard('jwt'), UserTypeGuard)
  @ApiBearerAuth()
  @Put('athlete/:athleteId/type/:type')
  @ApiOperation({
    summary: 'Replace all training zones of a given type for an athlete',
    description:
      'Atomically replaces every training zone of the given type for an athlete in a single request: zones present in the payload with a trainingZoneId are updated (their values are replaced), zones without a trainingZoneId are created, and existing zones of this type absent from the payload are deleted (cascading their values). The zone index is reassigned from the order of the submitted array. The whole operation runs in a single Prisma transaction. Uses CASL authorization to verify that the user has update access to the athlete.',
  })
  @ApiParam({
    name: 'athleteId',
    type: Number,
    description: 'ID of the athlete whose zones are being replaced',
    example: 1,
  })
  @ApiParam({
    name: 'type',
    enum: Object.values(TrainingZoneType),
    description: 'Type of training zone to replace',
    example: 'HEARTRATE',
  })
  @ApiBody({
    description: 'Full list of zones for this type, in display order',
    schema: {
      type: 'object',
      properties: {
        zones: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              trainingZoneId: {
                type: 'number',
                description: 'Omit to create a new zone',
                example: 1,
              },
              name: { type: 'string', minLength: 1, example: 'Zone 1' },
              description: { type: 'string', example: 'Recovery' },
              color: { type: 'string', example: '#9CA3AF' },
              values: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    min: { type: 'number', example: 0 },
                    max: { type: 'number', example: 131 },
                    sports: {
                      type: 'array',
                      items: { type: 'string', enum: Object.values(SportType) },
                      example: ['RUNNING'],
                      minItems: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
      required: ['zones'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'The full, up-to-date list of zones for this type, ordered by index',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid zone type, min >= max on a value, two submitted zones overlap for a shared sport, or a trainingZoneId does not belong to this athlete/type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have update access to this athlete',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - athlete not found',
  })
  replaceForType(
    @JwtUser() user: AuthUser,
    @Param('athleteId', ParseIntPipe) athleteId: number,
    @Param('type') type: string,
    @Body(new ZodValidationPipe(replaceTrainingZonesDtoSchema))
    dto: ReplaceTrainingZonesDto,
  ) {
    if (!Object.values(TrainingZoneType).includes(type as TrainingZoneType)) {
      throw new BadRequestException(`Invalid training zone type: ${type}`);
    }
    return this.trainingZoneService.replaceForType(
      user,
      athleteId,
      type as TrainingZoneType,
      dto,
    );
  }
}
