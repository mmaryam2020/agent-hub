import { unstable_noStore as noStore } from "next/cache";
import LibraryViewer from "./library-viewer";
import { listHtmlFiles, type HtmlLibraryItem } from "@/lib/html-library";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  noStore();
  let items: HtmlLibraryItem[] = [];
  let loadFailed = false;

  try {
    items = await listHtmlFiles();
  } catch (error) {
    loadFailed = true;
    console.error("Failed to load the HTML library", error);
  }

  if (loadFailed) {
    return (
      <main className="library-shell">
        <section className="library-header">
          <p className="eyebrow">html_viewer</p>
          <h1>Search and open uploaded pages</h1>
          <p className="library-copy">
            The viewer could not load right now. Please check the server logs for errors.
          </p>
        </section>
      </main>
    );
  }

  return <LibraryViewer items={items} isLoading={false} />;
}

