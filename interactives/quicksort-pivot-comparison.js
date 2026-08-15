import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const INPUT_VALUES = d3.range(1, 16);
const MIN_VIEWBOX_WIDTH = 520;
const SIDE_PADDING = 34;
const TOP_PADDING = 42;
const BOTTOM_PADDING = 38;
const ROW_GAP = 78;
const NODE_HORIZONTAL_GAP = 22;
const CELL_WIDTH = 28;
const CELL_HEIGHT = 30;
const CELL_GAP = 2;

const SCENARIOS = {
  balanced: {
    title: "Balanced pivot choices",
    description:
      "Quicksort on the values 1 through 15. Every recursive call chooses the median value, producing two equal partitions and a perfectly balanced four-level tree.",
    selectPivotIndex(values) {
      return Math.floor(values.length / 2);
    },
  },
  "poor-right": {
    title: "A poor pivot subtree",
    description:
      "Quicksort on the values 1 through 15. The first pivot is 8 and the left partition stays balanced. The right partition repeatedly chooses its smallest value, creating empty left partitions and a one-sided chain from 9 through 15.",
    selectPivotIndex(values) {
      return values[0] > 8 ? 0 : Math.floor(values.length / 2);
    },
  },
};

function buildPartitionTree(values, scenario, side = "root", path = "root") {
  const node = {
    values,
    side,
    path,
    pivot: null,
    children: null,
  };

  if (values.length === 0) {
    return node;
  }

  const pivotIndex = scenario.selectPivotIndex(values);
  const pivot = values[pivotIndex];
  const left = values.filter((value) => value < pivot);
  const right = values.filter((value) => value > pivot);

  node.pivot = pivot;

  if (values.length > 1) {
    node.children = [
      buildPartitionTree(left, scenario, "left", `${path}-left`),
      buildPartitionTree(right, scenario, "right", `${path}-right`),
    ];
  }

  return node;
}

function isPoorPathNode(node, scenarioId) {
  if (scenarioId !== "poor-right" || node.depth === 0) {
    return false;
  }

  const values = node.data.values;
  const inheritedValues = node.parent?.data.values ?? [];
  const firstValue = values[0] ?? inheritedValues[0];

  return firstValue > 8;
}

function getNodeWidth(node) {
  const valueCount = node.data.values.length;

  if (valueCount === 0) {
    return 34;
  }

  return valueCount * CELL_WIDTH + (valueCount - 1) * CELL_GAP;
}

function renderLinkLabels(svg, links) {
  const rootLinks = links.filter((link) => link.source.depth === 0);

  svg
    .append("g")
    .attr("class", "quicksort-pivots__link-labels")
    .selectAll("text")
    .data(rootLinks)
    .join("text")
    .attr("class", "quicksort-pivots__link-label")
    .attr("x", (link) => (link.source.x + link.target.x) / 2)
    .attr("y", (link) => (link.source.y + link.target.y) / 2 - 6)
    .text((link) =>
      link.target.data.side === "left"
        ? `≤ ${link.source.data.pivot}`
        : `> ${link.source.data.pivot}`,
    );
}

function renderArrayNode(group, node) {
  if (node.data.values.length === 0) {
    group
      .append("rect")
      .attr("class", "quicksort-pivots__empty-box")
      .attr("x", -17)
      .attr("y", -CELL_HEIGHT / 2)
      .attr("width", 34)
      .attr("height", CELL_HEIGHT)
      .attr("rx", 3);

    group
      .append("text")
      .attr("class", "quicksort-pivots__empty-label")
      .attr("y", 1)
      .text("∅");

    return;
  }

  const values = node.data.values;
  const totalWidth = values.length * CELL_WIDTH + (values.length - 1) * CELL_GAP;
  const startX = -totalWidth / 2;

  const cells = group
    .append("g")
    .attr("class", "quicksort-pivots__cells")
    .selectAll("g")
    .data(values)
    .join("g")
    .attr("class", (value) =>
      value === node.data.pivot
        ? "quicksort-pivots__cell is-pivot"
        : "quicksort-pivots__cell",
    )
    .attr(
      "transform",
      (_, index) => `translate(${startX + index * (CELL_WIDTH + CELL_GAP)},0)`,
    );

  cells
    .append("rect")
    .attr("x", 0)
    .attr("y", -CELL_HEIGHT / 2)
    .attr("width", CELL_WIDTH)
    .attr("height", CELL_HEIGHT)
    .attr("rx", 2.5);

  cells
    .append("text")
    .attr("x", CELL_WIDTH / 2)
    .attr("y", 1)
    .text((value) => value);
}

function renderScenario(figure, instanceId) {
  const scenarioId = figure.dataset.quicksortScenario;
  const scenario = SCENARIOS[scenarioId];
  const canvas = figure.querySelector('[data-role="quicksort-canvas"]');

  if (!scenario || !canvas) {
    return;
  }

  const treeData = buildPartitionTree(INPUT_VALUES, scenario);
  const root = d3.hierarchy(treeData, (node) => node.children);
  const treeHeight = root.height * ROW_GAP;
  const viewBoxHeight = TOP_PADDING + treeHeight + BOTTOM_PADDING;
  const layout = d3
    .tree()
    .nodeSize([1, ROW_GAP])
    .separation(
      (firstNode, secondNode) =>
        (getNodeWidth(firstNode) + getNodeWidth(secondNode)) / 2 +
        NODE_HORIZONTAL_GAP,
    );

  layout(root);

  let minimumX = Infinity;
  let maximumX = -Infinity;

  root.each((node) => {
    const halfWidth = getNodeWidth(node) / 2;
    minimumX = Math.min(minimumX, node.x - halfWidth);
    maximumX = Math.max(maximumX, node.x + halfWidth);
  });

  const contentWidth = maximumX - minimumX;
  const viewBoxWidth = Math.max(
    MIN_VIEWBOX_WIDTH,
    contentWidth + SIDE_PADDING * 2,
  );
  const horizontalOffset = (viewBoxWidth - contentWidth) / 2 - minimumX;

  root.each((node) => {
    node.x += horizontalOffset;
    node.y += TOP_PADDING;
  });

  const titleId = `${instanceId}-${scenarioId}-title`;
  const descriptionId = `${instanceId}-${scenarioId}-description`;
  const links = root.links();

  canvas.replaceChildren();

  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${titleId} ${descriptionId}`);

  svg.append("title").attr("id", titleId).text(scenario.title);
  svg.append("desc").attr("id", descriptionId).text(scenario.description);

  svg
    .append("g")
    .attr("class", "quicksort-pivots__links")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", (link) =>
      isPoorPathNode(link.target, scenarioId)
        ? "quicksort-pivots__link is-poor-path"
        : "quicksort-pivots__link",
    )
    .attr("d", (link) => {
      const sourceY = link.source.y + CELL_HEIGHT / 2;
      const targetY = link.target.y - CELL_HEIGHT / 2;
      const middleY = (sourceY + targetY) / 2;

      return [
        `M${link.source.x},${sourceY}`,
        `C${link.source.x},${middleY}`,
        `${link.target.x},${middleY}`,
        `${link.target.x},${targetY}`,
      ].join(" ");
    });

  renderLinkLabels(svg, links);

  const nodes = svg
    .append("g")
    .attr("class", "quicksort-pivots__nodes")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("class", (node) => {
      const classes = ["quicksort-pivots__node"];

      if (node.data.values.length === 0) {
        classes.push("is-empty");
      }

      if (isPoorPathNode(node, scenarioId)) {
        classes.push("is-poor-path");
      }

      return classes.join(" ");
    })
    .attr("transform", (node) => `translate(${node.x},${node.y})`);

  nodes.each(function drawNode(node) {
    renderArrayNode(d3.select(this), node);
  });

  figure.dataset.rendered = "true";
  figure.dataset.nodeCount = String(root.descendants().length);
}

document
  .querySelectorAll("[data-quicksort-pivot-comparison]")
  .forEach((root, index) => {
    if (root.dataset.initialized === "true") {
      return;
    }

    root.dataset.initialized = "true";
    const instanceId = `quicksort-pivots-${index + 1}`;

    root
      .querySelectorAll("[data-quicksort-scenario]")
      .forEach((figure) => renderScenario(figure, instanceId));
  });
