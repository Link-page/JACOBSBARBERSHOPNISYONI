import { useStaff } from '../auth/staff-context'
import { canSeeRoute } from '../lib/permissions'
import { routes } from '../routes'

/** Routes this staff member may open. */
export function useNavRoutes() {
  const staff = useStaff()
  return routes.filter((r) => canSeeRoute(r, staff))
}
