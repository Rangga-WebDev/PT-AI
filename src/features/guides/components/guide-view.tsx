/** @format */

import type { Guide, GuideBlock } from "@/content/guides/types";

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="reading-prose text-muted-foreground">{block.text}</p>
      );

    case "steps":
      return (
        <ol className="reading-prose flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground marker:font-mono marker:text-subtle">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="reading-prose flex flex-col gap-1.5 text-muted-foreground">
          {block.items.map((item, index) => (
            <li key={index}>— {item}</li>
          ))}
        </ul>
      );

    case "note":
      return (
        <p className="reading-prose border-l-2 border-primary/50 pl-4 text-muted-foreground">
          <span className="font-mono text-xs tracking-widest text-primary uppercase">
            Catatan
          </span>
          <br />
          {block.text}
        </p>
      );

    case "limit":
      return (
        <p className="reading-prose border-l-2 border-evidence/60 pl-4 text-muted-foreground">
          <span className="font-mono text-xs tracking-widest text-evidence uppercase">
            Belum tersedia
          </span>
          <br />
          {block.text}
        </p>
      );

    case "definitions":
      return (
        <dl className="reading-prose flex flex-col gap-2">
          {block.items.map((item) => (
            <div key={item.term} className="flex flex-col gap-0.5">
              <dt className="font-medium text-foreground">{item.term}</dt>
              <dd className="text-muted-foreground">{item.description}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

export function GuideView({ guide }: { guide: Guide }) {
  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      <nav
        aria-label="Daftar isi"
        className="flex shrink-0 flex-col gap-2 border-b border-border pb-6 lg:sticky lg:top-24 lg:w-64 lg:border-b-0 lg:pb-0"
      >
        <span className="font-mono text-xs tracking-widest text-subtle uppercase">
          Daftar isi
        </span>
        <ol className="flex flex-col gap-1 text-sm">
          {guide.sections.map((section, index) => (
            <li key={section.id} className="flex gap-2">
              <span className="font-mono text-xs text-subtle tabular-nums">
                {index + 1}.
              </span>
              <a
                href={`#${section.id}`}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-10">
        {guide.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="flex scroll-mt-24 flex-col gap-3"
          >
            <h2
              id={`${section.id}-heading`}
              className="font-heading text-h3 font-semibold text-foreground"
            >
              <span className="font-mono text-sm text-subtle tabular-nums">
                {index + 1}.{" "}
              </span>
              {section.title}
            </h2>
            {section.blocks.map((block, blockIndex) => (
              <Block key={blockIndex} block={block} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
