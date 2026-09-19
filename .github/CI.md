# Running the integration tests in CI

`.github/workflows/integration.yml` runs the Playwright suite against a real Foundry server in a
container. Foundry is licensed software, so the job needs things that cannot live in the
repository, and those things expire. This is the maintainer's runbook for all of it.

## What the job needs

| Thing | Where it lives | Why                                                                             |
| ----- | -------------- |---------------------------------------------------------------------------------|
| `ghcr.io/starwarsfoundryvtt/foundry-ci:<version>` | GHCR, private | Foundry itself, baked into the image. Pulled with the workflow's own `GITHUB_TOKEN` |
| `FOUNDRY_LICENSE_JSON` | repository secret | `Config/license.json` from an instance where the licence agreement was accepted |
| `FOUNDRY_LICENSE_KEY` | repository secret | the licence key from that same file                                             |
| `untrusted` | repository environment | required reviewers, which is what makes a fork PR wait for approval             |

The environment holds no secrets. It exists only to gate - a job that names an environment does
not start, and so cannot read a secret, until a reviewer approves it. PRs from branches on this
repository name no environment and run immediately.

## First-time setup

 1. Build and push the image - see *Rotating the Foundry version* below.
 1. Seed the license and add the two license secrets - see *Rotating the license*.
 1. Settings → Environments → New environment → `untrusted`. Tick **Required reviewers** and
    add the maintainers who should be able to release a fork run. Nothing else.
 1. Merge the workflow to `main`. `pull_request_target` always loads the workflow from the base
    branch, so nothing runs - not even on the PR that adds it - until it is there.
 1. Actions → Integration tests → Run workflow → `main`, to prove it works without waiting for
    a pull request.

## Rotating the Foundry version

Needed when Foundry ships a version worth testing against. The image is built by hand because
building it in CI would mean CI holding credentials.

On a machine with docker:

```console
mkdir -p ~/temp/foundry-ci && cd ~/temp/foundry-ci
cp /path/to/StarWarsFFG/.github/foundry-image/Dockerfile .

# the Linux/NodeJS distribution from your foundryvtt.com profile. The name is load-bearing:
# felddy's entrypoint installs from its cache only when it finds foundryvtt-<version>.zip there.
mv ~/Downloads/FoundryVTT-Node-14.367.zip ./foundryvtt-14.367.zip

docker build --build-arg FOUNDRY_VERSION=14.367 \
  --tag ghcr.io/starwarsfoundryvtt/foundry-ci:14.367 .
docker run --rm --entrypoint ls ghcr.io/starwarsfoundryvtt/foundry-ci:14.367 -lh /container_cache
```

That last line is the check that matters: the zip should be listed at its download size. If it is
not in there, the container will go looking for an account at startup and the job will fail.

Push it with a classic PAT carrying `write:packages`, created for the occasion and revoked
afterward:

```console
docker login ghcr.io --username <your-github-username>     # paste the token at the prompt
docker push ghcr.io/starwarsfoundryvtt/foundry-ci:14.367
```

Keep the digest the push prints - the `sha256:...` on the last line. The workflow pins by digest
as well as tag, because a tag can be moved by anything holding a `write:packages` token for the
organization and this image is pulled into a job that holds the license.

First push only: the package lands private at github.com/orgs/StarWarsFoundryVTT/packages. Leave
it that way.

Then set `FOUNDRY_IMAGE` in `.github/workflows/integration.yml` to the new tag *and* digest, and
open a PR:

```yaml
FOUNDRY_IMAGE: ghcr.io/starwarsfoundryvtt/foundry-ci:14.367@sha256:<the digest from the push>
```

If you lose the digest, `docker inspect --format='{{index .RepoDigests 0}}' ghcr.io/starwarsfoundryvtt/foundry-ci:14.367`
prints it again. Leave the old tag in the registry; it is what a rollback pulls.

Nothing else needs editing. `.github/foundry-world/qa/world.json` carries a `coreVersion` and a
`systemVersion`, but the workflow stamps both when it lays the world out - the core version from
the image tag, the system version from `system.json` - so neither can drift from what is actually
running.

## Rotating the license

Needed when the license key is reissued, or when `FOUNDRY_LICENSE_JSON` stops verifying. Foundry
signs the license against the hostname it was accepted on, which is why the workflow pins
`--hostname foundry-ci` and why the file cannot simply be copied from a personal server.

Run the image locally with an empty config directory, using the same hostname CI uses:

```console
mkdir -p /tmp/foundry-seed
docker run --rm --name foundry-seed --hostname foundry-ci \
  --publish 127.0.0.1:30000:30000 \
  --volume /tmp/foundry-seed:/data/Config \
  --env FOUNDRY_LICENSE_KEY='<your key>' \
  ghcr.io/starwarsfoundryvtt/foundry-ci:13.351
```

Open <http://127.0.0.1:30000>, enter the key if asked, and accept the license agreement. Foundry
writes the accepted license to the config directory. Stop the container and check what it wrote:

```console
python3 -m json.tool /tmp/foundry-seed/license.json
```

`host` must read `foundry-ci`. If it reads a container id instead, the `--hostname` flag was
missing - start over, because that file will fail verification on every CI run.

Then, under Settings → Secrets and variables → Actions:

 - `FOUNDRY_LICENSE_JSON`: the entire contents of that file, braces and newlines included
 - `FOUNDRY_LICENSE_KEY`: the `license` value out of it

Delete `/tmp/foundry-seed` afterward. The file carries the key in plaintext.
