import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNews, getNewsPost } from "@/lib/content";
import { getDictionary, isLocale, localeHref, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";

export function generateStaticParams() {
  return getNews().map((n) => ({ slug: n.slug }));
}

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const post = getNewsPost(slug);
  if (!post) return {};
  return pageMetadata(
    locale,
    `/news/${slug}`,
    locale === "id" ? post.titleId : post.title,
    locale === "id" ? post.excerptId : post.excerpt,
  );
}

export default async function NewsPostPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const post = getNewsPost(slug);
  if (!post) notFound();

  const body = locale === "id" ? post.bodyId : post.body;

  return (
    <article className="atmo pt-36">
      <header className="container-narrow pb-10">
        <nav className="micro mb-8">
          <Link href={localeHref(locale, "/news")} className="hover:text-white">
            ← {dict.nav.news}
          </Link>
        </nav>
        <p className="micro micro--hud" data-reveal="">
          {post.tag} · <span className="readout">{post.date}</span>
        </p>
        <SplitHeadline
          text={locale === "id" ? post.titleId : post.title}
          as="h1"
          className="display-2 mt-5"
          immediate
          delay={0.1}
        />
      </header>
      <div className="container-narrow pb-28">
        {body.map((p, i) => (
          <Reveal key={i} delay={i * 0.04}>
            <p className="mb-6 leading-relaxed text-chrome">{p}</p>
          </Reveal>
        ))}
        <Reveal>
          <Link href={localeHref(locale, "/fit")} className="btn btn-primary mt-4">
            {dict.hero.ctaFit}
          </Link>
        </Reveal>
      </div>
    </article>
  );
}
