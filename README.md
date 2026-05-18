# sf-dependency-resolver

An SF CLI plugin that resolves all dependencies of a Salesforce component and produces a scoped, deployable package for scratch org development.

Given one or more seed components (Apex classes, triggers), the tool recursively resolves everything they depend on — fields, objects, validation rules, record types — and outputs a clean `package.xml` and transformed source directory ready to push to a scratch org.

---

## Install

```bash
sf plugins install https://github.com/your-org/sf-dependency-resolver
```

Requires SF CLI and an authenticated org (`sf org login web --alias myDevSandbox`).

---

## Quick Start

**1. Scaffold a config for your feature**
```bash
sf dependency init \
  --output ./scratch-manifests/my-feature \
  --seed MyApexClass,MyApexTrigger
```

**2. Edit the generated `resolver.json`**

Set your org alias, review resolution policies, and adjust seeds as needed.

**3. Resolve**
```bash
sf dependency resolve --config ./scratch-manifests/my-feature/resolver.json
```

**4. Push to scratch org**
```bash
sf project deploy start \
  --manifest ./scratch-manifests/my-feature/package.xml \
  --target-org myScratchOrg
```

---

## Commands

### `sf dependency resolve`

Resolves all dependencies and produces the output package.

| Flag | Short | Description | Default |
|---|---|---|---|
| `--config` | `-c` | Path to resolver.json | `./resolver.json` |
| `--seed` | `-s` | Override seeds (comma-separated) | — |
| `--org` | `-o` | Override org alias | — |
| `--output-dir` | | Override output directory | — |
| `--max-depth` | | Override max recursion depth | — |
| `--dry-run` | | Resolve only — skip retrieval and transformation | `false` |
| `--no-tooling-api` | | Disable Tooling API — local source only | `false` |

### `sf dependency init`

Scaffolds a new `resolver.json` for a feature.

| Flag | Short | Description |
|---|---|---|
| `--output` | `-o` | Directory to create resolver.json in |
| `--seed` | `-s` | Comma-separated seed component names |

---

## Output

Every resolution run produces the following in your configured `outputDir`:

| File | Description |
|---|---|
| `package.xml` | Final deployment manifest |
| `force-app/` | Transformed source in SFDX format |
| `dependency-graph.json` | Full graph for visualization and auditing |
| `transformation-log.json` | Every metadata mutation made during transform — review before deploying |
| `package-prerequisites.json` | Managed packages that must be installed in the scratch org first |
| `resolver-config-snapshot.json` | Exact config used for this run — commit for reproducibility |

---

## Configuration Reference

```json
{
  "seeds": ["MyApexClass", "MyApexTrigger"],
  "org": "myDevSandbox",
  "useLocalSource": true,
  "localSourceDir": "./force-app/main/default",
  "maxDepth": 10,
  "outputDir": "./scratch-manifests/my-feature",
  "fieldPolicy": "referenced-only",
  "policies": {
    "ApexClass": "include",
    "ApexTrigger": "include",
    "CustomObject": "include",
    "CustomField": "include",
    "RecordType": "stub",
    "ValidationRule": "include",
    "FlexiPage": "exclude",
    "ActionOverride": "exclude",
    "Layout": "exclude",
    "CompactLayout": "exclude",
    "ListView": "stub",
    "Flow": "exclude",
    "CustomTab": "exclude"
  }
}
```

### Policy Values

| Value | Behavior |
|---|---|
| `include` | Fully resolve, retrieve, and deploy |
| `stub` | Deploy a minimum viable version (no deep dependencies pulled) |
| `exclude` | Strip all references to this component from parent metadata |

### `fieldPolicy`

| Value | Behavior |
|---|---|
| `referenced-only` | Only deploy fields explicitly referenced in Apex code or SOQL |
| `all` | Deploy all fields on any object in the manifest |

---

## Multiple Features Per Repo

Each feature gets its own config file committed to the feature branch:

```
scratch-manifests/
  loan-application/
    resolver.json
    package.xml          ← generated
    dependency-graph.json ← generated
    ...
  communication-center/
    resolver.json
    ...
```

---

## Known Limitations

- **Dynamic references** (`Type.forName()`, string-built SOQL) are not detected. Add missing components manually to `seeds`.
- **Flows** default to `exclude`. Set `"Flow": "include"` in policies and add the flow to seeds if needed.
- **Managed package components** are surfaced as prerequisites in `package-prerequisites.json` but are never retrieved or modified.
- **Tooling API budget**: warn at 500 queries, confirm prompt at 1000, hard abort at 2000. Enable `useLocalSource: true` (default) to minimize API usage.
- Scratch org will behave differently than production where metadata has been stubbed or excluded. Review `transformation-log.json` before testing.

---

## Development

```bash
git clone https://github.com/your-org/sf-dependency-resolver
cd sf-dependency-resolver
npm install
npm run build
sf plugins link
```

### Project Structure

```
src/
  commands/
    dependency/
      resolve.ts       # sf dependency resolve
      init.ts          # sf dependency init
  lib/
    resolver/          # Phase 1 — dependency graph resolution
    transformer/       # Phase 3 — metadata XML transformation
    writer/            # Phase 4 — output file generation
    auth/              # SF CLI auth piggyback
    configLoader.ts    # Config file loading and validation
  types/               # Shared TypeScript interfaces
  index.ts             # Public library API
```

---

## Distribution

### Phase 1 (Current) — GitHub Private Repo

```bash
sf plugins install https://github.com/your-org/sf-dependency-resolver
sf plugins update   # to update
```

### Phase 2 — GitHub Packages (Private npm Registry)

```bash
npm config set @your-org:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_PAT
sf plugins install @your-org/sf-dependency-resolver
```