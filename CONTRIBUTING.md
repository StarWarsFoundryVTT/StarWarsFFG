# Contributing Guidelines

- Make a single change per PR whenever possible
- Update the changelog as a part of your PR
- Link to issues in your commits, PR, and changelog entry
- Follow the general guidance provided below

**Do** follow [the seven rules of a great Git commit message][1].

**Do** follow [git best practices][2] wherever possible.

**Do** squash the commits in your PR to remove corrections
irrelevant to the code history.

**Do** feel free to pester the project maintainers about the PR if it
hasn't been responded to. Sometimes notifications can be missed.

**Don't** overuse vertical whitespace; avoid multiple sequential blank
lines.

**Don't** include more than one feature or fix in a single PR.

**Don't** include changes unrelated to the purpose of the PR. This
includes changing the project version number, adding lines to the
`.gitignore` file, or changing the indentation or formatting.

**Don't** open a new PR if changes are requested. Just push to the
same branch and the PR will be updated.

[1]: https://chris.beams.io/posts/git-commit/#seven-rules
[2]: https://deepsource.io/blog/git-best-practices/

# E2E Tests

Uses Playwright. Steps to run:
1. `npm install playwright`
2. `npx playwright test --trace on`
