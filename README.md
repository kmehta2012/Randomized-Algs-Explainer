# Randomized Algorithms Explainer

This folder is the self-contained Quarto website and can be used directly as the
`randomized-algs` GitHub repository. The explainer is written in `index.qmd`,
and custom browser interactions live in `interactives/`.

## Write with a side-by-side preview

1. Open this folder in VS Code.
2. Open `index.qmd`.
3. Click **Preview** in the editor toolbar, or press `Cmd + Shift + K`.
4. Keep the Quarto Preview pane beside the source file.

VS Code is configured to save automatically and refresh the internal preview. You only need to start Preview once per editing session.

## Useful commands

From the repository folder, start the editor and live preview with:

```sh
./preview.sh
```

The script opens the project in VS Code, prints the browser URL, and continuously re-renders after file changes. It uses port `4444` by default; pass another preferred port as the first argument:

```sh
./preview.sh 5050
```

The script uses an installed `quarto` command when available. In the current
parent workspace it can also fall back to the local Quarto installation kept
outside this repository.

To run Quarto directly from the project directory when it is installed:

```sh
quarto preview
quarto render
```

Rendered website files are written to `_site/`. That generated directory is
intentionally excluded from Git; `quarto publish gh-pages` renders and publishes
the site to the `gh-pages` branch.
