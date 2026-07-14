import { notFound } from "next/navigation";

/** Catch-all: anything the tree doesn't match 404s inside the locale layout. */
export default function CatchAll() {
  notFound();
}
