import { buildMovieCatalog } from "../../server/catalog.ts";
import { GeneratedPage } from "./generated-page.tsx";

export const dynamic = "force-dynamic";

export default function Page() {
  return <GeneratedPage contracts={buildMovieCatalog().components} />;
}
