import client, { routes } from '@/utils/axios';

import {
  AssignStrengthSessionDto,
  CreateStrengthCategoryDto,
  CreateStrengthProgramDto,
  CreateStrengthSessionDto,
  Event,
  StrengthCategory,
  StrengthExercise,
  StrengthProgram,
  StrengthProgramSession,
  UpdateStrengthCategoryDto,
  UpdateStrengthProgramDto,
  UpdateStrengthSessionDto,
  UpsertStrengthExerciseDto,
} from '@openathlete/shared';

export class StrengthAPI {
  // Categories
  static async getCategories(): Promise<StrengthCategory[]> {
    const res = await client.get(routes.strength.categories);
    return res.data;
  }

  static async createCategory(
    body: CreateStrengthCategoryDto,
  ): Promise<StrengthCategory> {
    const res = await client.post(routes.strength.categories, body);
    return res.data;
  }

  static async updateCategory({
    categoryId,
    body,
  }: {
    categoryId: number;
    body: UpdateStrengthCategoryDto;
  }): Promise<StrengthCategory> {
    const res = await client.patch(routes.strength.category(categoryId), body);
    return res.data;
  }

  static async deleteCategory(categoryId: number): Promise<void> {
    await client.delete(routes.strength.category(categoryId));
  }

  // Programs
  static async getPrograms(): Promise<StrengthProgram[]> {
    const res = await client.get(routes.strength.programs);
    return res.data;
  }

  static async getProgram(programId: number): Promise<StrengthProgram> {
    const res = await client.get(routes.strength.program(programId));
    return res.data;
  }

  static async createProgram(
    body: CreateStrengthProgramDto,
  ): Promise<StrengthProgram> {
    const res = await client.post(routes.strength.programs, body);
    return res.data;
  }

  static async updateProgram({
    programId,
    body,
  }: {
    programId: number;
    body: UpdateStrengthProgramDto;
  }): Promise<StrengthProgram> {
    const res = await client.patch(routes.strength.program(programId), body);
    return res.data;
  }

  static async deleteProgram(programId: number): Promise<void> {
    await client.delete(routes.strength.program(programId));
  }

  static async copyWeek({
    programId,
    weekNumber,
  }: {
    programId: number;
    weekNumber: number;
  }): Promise<StrengthProgram> {
    const res = await client.post(
      routes.strength.copyWeek(programId, weekNumber),
    );
    return res.data;
  }

  static async deleteWeek({
    programId,
    weekNumber,
  }: {
    programId: number;
    weekNumber: number;
  }): Promise<StrengthProgram> {
    const res = await client.delete(
      routes.strength.week(programId, weekNumber),
    );
    return res.data;
  }

  // Sessions
  static async createSession({
    programId,
    body,
  }: {
    programId: number;
    body: CreateStrengthSessionDto;
  }): Promise<StrengthProgramSession> {
    const res = await client.post(routes.strength.sessions(programId), body);
    return res.data;
  }

  static async updateSession({
    sessionId,
    body,
  }: {
    sessionId: number;
    body: UpdateStrengthSessionDto;
  }): Promise<StrengthProgramSession> {
    const res = await client.patch(routes.strength.session(sessionId), body);
    return res.data;
  }

  static async deleteSession(sessionId: number): Promise<void> {
    await client.delete(routes.strength.session(sessionId));
  }

  static async assignSession({
    sessionId,
    body,
  }: {
    sessionId: number;
    body: AssignStrengthSessionDto;
  }): Promise<Event> {
    const res = await client.post(
      routes.strength.assignSession(sessionId),
      body,
    );
    return res.data;
  }

  // Exercise library
  static async getExercises(): Promise<StrengthExercise[]> {
    const res = await client.get(routes.strength.exercises);
    return res.data;
  }

  static async upsertExercise(
    body: UpsertStrengthExerciseDto,
  ): Promise<StrengthExercise> {
    const res = await client.put(routes.strength.exercises, body);
    return res.data;
  }

  static async deleteExercise(exerciseId: number): Promise<void> {
    await client.delete(routes.strength.exercise(exerciseId));
  }
}
