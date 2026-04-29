import Link from "next/link";
import { Card } from "@/components/ui/card";
import { extractPreview } from "@/lib/announcements";

type Item = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  authorEmail: string | null;
};

type Props = {
  announcement: Item;
  linkBase: "/announcements" | "/public/announcements";
  previewChars?: number;
};

export function AnnouncementCard({ announcement, linkBase, previewChars = 150 }: Props) {
  const preview = extractPreview(announcement.body, previewChars);
  return (
    <Card className="p-5 space-y-2 hover:border-primary transition-colors">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-base leading-snug">{announcement.title}</h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(announcement.createdAt).toLocaleDateString()}
        </span>
      </div>
      {preview && <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">{announcement.authorEmail ?? "Unknown"}</span>
        <Link href={`${linkBase}/${announcement.id}`} className="text-sm text-primary hover:underline">
          Read more →
        </Link>
      </div>
    </Card>
  );
}
