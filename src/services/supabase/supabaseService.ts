import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Thin abstraction that centralizes Supabase error handling and log context.
 * Helps keep repository/service implementations focused on query intent.
 */
export class SupabaseService {
  constructor(
    protected readonly client: SupabaseClient<Database> = supabase,
  ) {}

  protected async getList<T>(
    request: Promise<PostgrestResponse<T>>,
    context: string,
  ): Promise<T[]> {
    const { data, error } = await request;
    if (error) {
      console.error(`[Supabase] ${context} failed`, error);
      throw error;
    }
    return data ?? [];
  }

  protected async getSingle<T>(
    request: Promise<PostgrestSingleResponse<T>>,
    context: string,
  ): Promise<T> {
    const { data, error } = await request;
    if (error) {
      console.error(`[Supabase] ${context} failed`, error);
      throw error;
    }

    if (!data) {
      throw new Error(`No data returned for ${context}`);
    }

    return data;
  }

  protected async getPaginated<T>(
    request: Promise<PostgrestResponse<T>>,
    context: string,
  ): Promise<{ data: T[]; count: number | null }> {
    const { data, error, count } = await request;
    if (error) {
      console.error(`[Supabase] ${context} failed`, error);
      throw error;
    }

    return {
      data: data ?? [],
      count: count ?? null,
    };
  }

  protected async exec(
    request: Promise<{ error: PostgrestError | null }>,
    context: string,
  ): Promise<void> {
    const { error } = await request;
    if (error) {
      console.error(`[Supabase] ${context} failed`, error);
      throw error;
    }
  }
}
