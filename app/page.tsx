import { App } from "@/components/app";
import { getRepoContributors } from "@/lib/github-contributors";

export default async function Home() {
  const contributors = await getRepoContributors();

  return <App contributors={contributors} />;
}
