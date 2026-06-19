import type { TenantDTO } from "@shared/types/index.js";

export interface ITenantRepository {
    findById(id: string): Promise<TenantDTO | null>;
    findBySlug(slug: string): Promise<TenantDTO | null>;
    // ...
}
