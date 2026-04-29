type Props = { html: string };

export function AnnouncementBody({ html }: Props) {
  return (
    <div
      className="prose prose-sm max-w-none prose-img:rounded-lg prose-img:border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
