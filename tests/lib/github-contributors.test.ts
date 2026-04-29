import {
  MAX_CONTRIBUTORS,
  normalizeGitHubContributors,
} from "@/lib/github-contributors";

describe("normalizeGitHubContributors", () => {
  it("maps valid GitHub contributors into the footer shape", () => {
    expect(
      normalizeGitHubContributors([
        {
          login: "Wilsman",
          html_url: "https://github.com/Wilsman",
          avatar_url: "https://avatars.githubusercontent.com/u/23622008?v=4",
          contributions: 443,
          type: "User",
        },
      ]),
    ).toEqual([
      {
        login: "Wilsman",
        htmlUrl: "https://github.com/Wilsman",
        avatarUrl: "https://avatars.githubusercontent.com/u/23622008?v=4",
        contributions: 443,
      },
    ]);
  });

  it("filters bots and malformed contributor entries", () => {
    expect(
      normalizeGitHubContributors([
        {
          login: "dependabot[bot]",
          html_url: "https://github.com/apps/dependabot",
          avatar_url: "https://avatars.githubusercontent.com/in/29110?v=4",
          contributions: 286,
          type: "Bot",
        },
        {
          login: "nlosc",
          html_url: "https://github.com/nlosc",
          avatar_url: "https://avatars.githubusercontent.com/u/88961522?v=4",
          contributions: 1,
          type: "User",
        },
        {
          login: "broken-user",
          avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
          contributions: 5,
          type: "User",
        },
      ]),
    ).toEqual([
      {
        login: "nlosc",
        htmlUrl: "https://github.com/nlosc",
        avatarUrl: "https://avatars.githubusercontent.com/u/88961522?v=4",
        contributions: 1,
      },
    ]);
  });

  it("caps the contributor list to the supported footer size", () => {
    const payload = Array.from(
      { length: MAX_CONTRIBUTORS + 3 },
      (_, index) => ({
        login: `user-${index}`,
        html_url: `https://github.com/user-${index}`,
        avatar_url: `https://avatars.githubusercontent.com/u/${index}?v=4`,
        contributions: index + 1,
        type: "User",
      }),
    );

    expect(normalizeGitHubContributors(payload)).toHaveLength(MAX_CONTRIBUTORS);
  });
});
