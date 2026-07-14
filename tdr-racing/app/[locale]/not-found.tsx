import Link from "next/link";

/** Locale-aware 404 — copy is bilingual since the segment may be unknown. */
export default function NotFound() {
  return (
    <div className="atmo flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="micro micro--hud mb-6">SYS · ERROR / 404 — SIGNAL LOST</p>
      <h1 className="display-1">404</h1>
      <p className="mt-6 max-w-md text-chrome">
        This address doesn&apos;t resolve — the part may have moved to the new catalogue.
        <br />
        Alamat ini tidak ditemukan — part mungkin sudah pindah ke katalog baru.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Home / Beranda
        </Link>
        <Link href="/products" className="btn btn-ghost">
          Products / Produk
        </Link>
      </div>
    </div>
  );
}
