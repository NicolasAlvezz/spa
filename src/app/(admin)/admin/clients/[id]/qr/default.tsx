// Required by Next.js App Router: the /admin/clients/[id]/qr path is handled by
// the (print) group. This default prevents the parallel-route 404 when the router
// checks the (admin) group for that path.
export default function Default() {
  return null
}
