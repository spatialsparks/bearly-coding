# Storage format v1

> **Delete this file if {{PROJECT_NAME}} persists nothing and exchanges no files.** Otherwise it
> is the contract for everything the project stores or reads back: any change needs a version
> bump, a migration note and an ADR (directive 27). A change here is a contract change, so its
> story is **Solo** and runs in a wave of its own (directive 29).

## Collections, tables or files

_[What is stored where — one block, the whole shape at a glance.]_

```
_[collection or table]/{id}   _[one line: what it holds]_
```

### _[collection or table]_

| Field | Type | Notes |
| --- | --- | --- |
| _[field]_ | _[type]_ | _[invariant, unit, who writes it]_ |

_[The decisions a reader would otherwise have to reverse-engineer: timestamps as numbers or
server values, ids generated where, what a missing field means. Each one names its ADR.]_

## Text formats

_[If the project stores text with structure — markdown conventions, a CSV dialect, a config
syntax — its canonical form: line endings, trailing newline, ordering, what is preserved
verbatim.]_

The canonical form is proved by golden corpora in `_[path to fixtures]_`: every file
round-trips byte for byte. The formatter ignores that directory; reformatting a fixture would
rewrite the very thing under test.

## Export and import

_[If users can get their data out: the layout, and that import reads the same shape back.]_

## Versions

| Version | Date | Change | Migration | ADR |
| --- | --- | --- | --- | --- |
| v1 | {{YYYY-MM-DD}} | first version | — | — |
