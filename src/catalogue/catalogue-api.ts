import type { Catalogue } from './types'

/** Reads the public catalogue (readable without signing in). Gallery: active photos only. */
export interface CatalogueApi {
  load(): Promise<Catalogue>
}
