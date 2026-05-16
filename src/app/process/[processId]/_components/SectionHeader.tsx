"use client";

type SectionHeaderLevel = "section" | "subsection";

type Props = {
  title: string;
  descriptionHtml?: string;
  level?: SectionHeaderLevel;
  /** Omit top divider on the first section header in the form. */
  isFirst?: boolean;
};

const descriptionClassName =
  "text-sm leading-relaxed text-surface-500 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-0";

function HeaderDescription({ text, className }: { text: string; className: string }) {
  if (text.includes("<")) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return <p className={className}>{text}</p>;
}

export function SectionHeader({
  title,
  descriptionHtml,
  level = "section",
  isFirst = false,
}: Props) {
  const description = descriptionHtml?.trim();

  if (level === "subsection") {
    return (
      <header className="pt-2">
        <h3 className="text-base font-semibold text-surface-900">{title}</h3>
        {description ? (
          <HeaderDescription text={description} className={`mt-1.5 ${descriptionClassName}`} />
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={isFirst ? "pb-2" : "border-t border-surface-200 pt-8 pb-2"}
      role="presentation"
    >
      <h2 className="text-xl font-semibold tracking-tight text-surface-900">{title}</h2>
      {description ? (
        <HeaderDescription text={description} className={`mt-2 ${descriptionClassName}`} />
      ) : null}
    </header>
  );
}
