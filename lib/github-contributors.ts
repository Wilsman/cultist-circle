export interface GitHubContributor {
  login: string;
  htmlUrl: string;
  avatarUrl: string;
  contributions: number;
}

interface GitHubContributorApiResponse {
  login?: string;
  html_url?: string;
  avatar_url?: string;
  contributions?: number;
  type?: string;
}

export const DEFAULT_CONTRIBUTORS_REPO = "Wilsman/cultist-circle";
export const MAX_CONTRIBUTORS = 12;

const ADDITIONAL_CONTRIBUTORS: GitHubContributor[] = [
  {
    login: "Oxylad",
    htmlUrl: "https://github.com/Oxylad",
    avatarUrl: "https://avatars.githubusercontent.com/u/76744208?v=4",
    contributions: 7,
  },
];

function includeAdditionalContributors(
  contributors: GitHubContributor[],
): GitHubContributor[] {
  const merged = [...contributors];

  for (const contributor of ADDITIONAL_CONTRIBUTORS) {
    const existingIndex = merged.findIndex(
      (existing) => existing.login.toLowerCase() === contributor.login.toLowerCase(),
    );
    if (existingIndex >= 0) continue;

    if (merged.length >= MAX_CONTRIBUTORS) merged.pop();
    merged.push(contributor);
  }

  return merged;
}

export function normalizeGitHubContributors(
  payload: GitHubContributorApiResponse[],
): GitHubContributor[] {
  return payload
    .filter(
      (contributor) =>
        contributor.type !== "Bot" &&
        typeof contributor.login === "string" &&
        contributor.login.length > 0 &&
        typeof contributor.html_url === "string" &&
        contributor.html_url.length > 0 &&
        typeof contributor.avatar_url === "string" &&
        contributor.avatar_url.length > 0 &&
        typeof contributor.contributions === "number",
    )
    .slice(0, MAX_CONTRIBUTORS)
    .map((contributor) => ({
      login: contributor.login!,
      htmlUrl: contributor.html_url!,
      avatarUrl: contributor.avatar_url!,
      contributions: contributor.contributions!,
    }));
}

export async function getRepoContributors(
  repo = DEFAULT_CONTRIBUTORS_REPO,
): Promise<GitHubContributor[]> {
  const additionalOnly = () => includeAdditionalContributors([]);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contributors?per_page=${MAX_CONTRIBUTORS}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: {
          revalidate: 60 * 60 * 12,
        },
      },
    );

    if (!response.ok) {
      return additionalOnly();
    }

    const payload = (await response.json()) as GitHubContributorApiResponse[];

    if (!Array.isArray(payload)) {
      return additionalOnly();
    }

    return includeAdditionalContributors(normalizeGitHubContributors(payload));
  } catch {
    return additionalOnly();
  }
}
