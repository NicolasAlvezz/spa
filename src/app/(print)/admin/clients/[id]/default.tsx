// Required by Next.js App Router: this route group shares the /admin/clients/[id]
// URL namespace with (admin). When navigating to a path that only the (admin) group
// handles, Next.js falls back to this file instead of throwing a parallel-route error.
export default function Default() {
  return null
}
