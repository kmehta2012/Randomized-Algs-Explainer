import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { KARGER_GRAPH } from "./karger-graph.js";

const GRAPH_WIDTH = KARGER_GRAPH.width;
const GRAPH_HEIGHT = KARGER_GRAPH.height;
const DEFAULT_EDGE_ID = "13";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const vertices = KARGER_GRAPH.vertices;
const edges = KARGER_GRAPH.edges;

const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

function edgeName(edge) {
  return `${edge.from}–${edge.to}`;
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function makeGraphSvg(container, instanceId, kind, accessibleName) {
  container.replaceChildren();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${instanceId}-${kind}-title ${instanceId}-${kind}-desc`);

  svg
    .append("title")
    .attr("id", `${instanceId}-${kind}-title`)
    .text(accessibleName);

  const description = svg
    .append("desc")
    .attr("id", `${instanceId}-${kind}-desc`);

  return { svg, description };
}

function contractGraph(edgeId) {
  const selectedEdge = edgeById.get(edgeId);
  const contractedIds = new Set([selectedEdge.from, selectedEdge.to]);
  const orderedMembers = [...contractedIds].sort();
  const supernodeId = orderedMembers.join(",");
  const supernodeLabel = `{${orderedMembers.join(",")}}`;
  const remainingVertices = vertices
    .filter((vertex) => !contractedIds.has(vertex.id))
    .sort((left, right) => left.id.localeCompare(right.id));

  const remainingPositions = [
    { x: 252, y: 42 },
    { x: 282, y: 125 },
    { x: 252, y: 208 },
  ];

  const resultVertices = [
    {
      id: supernodeId,
      label: supernodeLabel,
      x: 82,
      y: 125,
      isSupernode: true,
    },
    ...remainingVertices.map((vertex, index) => ({
      ...vertex,
      label: vertex.id,
      ...remainingPositions[index],
      isSupernode: false,
    })),
  ];

  const remap = (vertexId) =>
    contractedIds.has(vertexId) ? supernodeId : vertexId;

  const resultEdges = edges
    .map((edge) => ({
      originalId: edge.id,
      from: remap(edge.from),
      to: remap(edge.to),
    }))
    .filter((edge) => edge.from !== edge.to);

  const groups = new Map();

  for (const edge of resultEdges) {
    const key = [edge.from, edge.to].sort().join("|");
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.forEach((edge, index) => {
      edge.parallelCount = group.length;
      edge.parallelIndex = index;
    });
  }

  return {
    selectedEdge,
    supernodeId,
    supernodeLabel,
    vertices: resultVertices,
    edges: resultEdges,
  };
}

function edgePath(edge, vertexById) {
  let from = vertexById.get(edge.from);
  let to = vertexById.get(edge.to);

  if (edge.parallelCount === 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  if (edge.from.localeCompare(edge.to) > 0) {
    [from, to] = [to, from];
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const midpointX = (from.x + to.x) / 2;
  const midpointY = (from.y + to.y) / 2;
  const centeredIndex = edge.parallelIndex - (edge.parallelCount - 1) / 2;
  const curveOffset = 38 * centeredIndex;
  const controlX = midpointX - (dy / length) * curveOffset;
  const controlY = midpointY + (dx / length) * curveOffset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function initializeDemo(demo, index) {
  if (demo.dataset.initialized === "true") {
    return;
  }

  demo.dataset.initialized = "true";

  const instanceId = `edge-contraction-${index + 1}`;
  const originalCanvas = demo.querySelector('[data-role="original-graph"]');
  const contractedCanvas = demo.querySelector('[data-role="contracted-graph"]');
  const arrowCanvas = demo.querySelector('[data-role="transition-arrow"]');
  const transitionTitle = demo.querySelector('[data-role="transition-title"]');
  const edgeSelect = demo.querySelector('[data-role="edge-select"]');
  const runButton = demo.querySelector('[data-action="run"]');
  const resetButton = demo.querySelector('[data-action="reset"]');
  const status = demo.querySelector('[data-role="status"]');
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  let selectedEdgeId = DEFAULT_EDGE_ID;
  let isRunning = false;
  let hasAutoplayed = false;

  const originalGraph = makeGraphSvg(
    originalCanvas,
    instanceId,
    "original",
    "Original Karger graph before edge contraction",
  );

  originalCanvas.dataset.nodeCount = String(vertices.length);
  originalCanvas.dataset.edgeCount = String(edges.length);

  originalGraph.description.text(
    "The five-vertex Karger graph. Vertices 1, 2, 3, and 4 form a complete graph, and vertex 5 is connected to vertices 3 and 4. Edge 1–3 is selected for contraction.",
  );

  const originalEdgeSelection = originalGraph.svg
    .append("g")
    .attr("class", "edge-contraction__edges")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("class", "edge-contraction__edge")
    .attr("x1", (edge) => vertices.find((vertex) => vertex.id === edge.from).x)
    .attr("y1", (edge) => vertices.find((vertex) => vertex.id === edge.from).y)
    .attr("x2", (edge) => vertices.find((vertex) => vertex.id === edge.to).x)
    .attr("y2", (edge) => vertices.find((vertex) => vertex.id === edge.to).y)
    .attr("data-edge-id", (edge) => edge.id);

  const originalNodeSelection = originalGraph.svg
    .append("g")
    .attr("class", "edge-contraction__nodes")
    .selectAll("circle")
    .data(vertices)
    .join("circle")
    .attr("class", "edge-contraction__node")
    .attr("cx", (vertex) => vertex.x)
    .attr("cy", (vertex) => vertex.y)
    .attr("r", 15);

  originalGraph.svg
    .append("g")
    .attr("class", "edge-contraction__labels")
    .selectAll("text")
    .data(vertices)
    .join("text")
    .attr("class", "edge-contraction__label")
    .attr("x", (vertex) => vertex.labelX)
    .attr("y", (vertex) => vertex.labelY)
    .attr("text-anchor", (vertex) => vertex.labelAnchor)
    .text((vertex) => vertex.id);

  const arrowSvg = d3
    .select(arrowCanvas)
    .append("svg")
    .attr("viewBox", "0 0 150 112")
    .attr("aria-hidden", "true");

  const markerId = `${instanceId}-arrowhead`;
  arrowSvg
    .append("defs")
    .append("marker")
    .attr("id", markerId)
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("class", "edge-contraction__arrowhead");

  arrowSvg
    .append("line")
    .attr("class", "edge-contraction__arrow-track")
    .attr("x1", 10)
    .attr("y1", 88)
    .attr("x2", 138)
    .attr("y2", 88);

  const arrowProgress = arrowSvg
    .append("line")
    .attr("class", "edge-contraction__arrow-progress")
    .attr("x1", 10)
    .attr("y1", 88)
    .attr("x2", 10)
    .attr("y2", 88)
    .attr("marker-end", `url(#${markerId})`);

  const miniatureEdge = arrowSvg
    .append("line")
    .attr("class", "edge-contraction__mini-edge")
    .attr("x1", 35)
    .attr("y1", 36)
    .attr("x2", 79)
    .attr("y2", 36);

  const miniatureNodes = arrowSvg
    .append("g")
    .selectAll("circle")
    .data([
      { key: "from", x: 35 },
      { key: "to", x: 79 },
    ])
    .join("circle")
    .attr("class", "edge-contraction__mini-node")
    .attr("cx", (node) => node.x)
    .attr("cy", 36)
    .attr("r", 13);

  const miniatureLabels = arrowSvg
    .append("g")
    .selectAll("text")
    .data([
      { key: "from", x: 35 },
      { key: "to", x: 79 },
    ])
    .join("text")
    .attr("class", "edge-contraction__mini-label")
    .attr("x", (node) => node.x)
    .attr("y", 36);

  const miniatureSupernode = arrowSvg
    .append("circle")
    .attr("class", "edge-contraction__mini-supernode")
    .attr("cx", 57)
    .attr("cy", 36)
    .attr("r", 18)
    .attr("opacity", 0);

  const miniatureSupernodeLabel = arrowSvg
    .append("text")
    .attr("class", "edge-contraction__mini-supernode-label")
    .attr("x", 57)
    .attr("y", 36)
    .attr("opacity", 0);

  function setControlsDisabled(disabled) {
    edgeSelect.disabled = disabled;
    runButton.disabled = disabled;
    resetButton.disabled = disabled;
  }

  function updateOriginalSelection() {
    const selectedEdge = edgeById.get(selectedEdgeId);
    const selectedVertices = new Set([selectedEdge.from, selectedEdge.to]);

    originalEdgeSelection.classed(
      "is-selected",
      (edge) => edge.id === selectedEdgeId,
    );
    originalNodeSelection.classed(
      "is-selected",
      (vertex) => selectedVertices.has(vertex.id),
    );
    originalGraph.description.text(
      `The five-vertex Karger graph. Edge ${edgeName(selectedEdge)} is selected for contraction.`,
    );
    transitionTitle.textContent = `Contract ${edgeName(selectedEdge)}`;
  }

  function resetArrow() {
    const selectedEdge = edgeById.get(selectedEdgeId);

    arrowSvg.selectAll("*").interrupt();
    miniatureEdge
      .attr("x1", 35)
      .attr("x2", 79)
      .attr("opacity", 1);
    miniatureNodes
      .attr("cx", (node) => node.x)
      .attr("opacity", 1);
    miniatureLabels
      .attr("x", (node) => node.x)
      .attr("opacity", 1)
      .text((node) => selectedEdge[node.key]);
    miniatureSupernode.attr("opacity", 0);
    miniatureSupernodeLabel
      .attr("opacity", 0)
      .text(`{${[selectedEdge.from, selectedEdge.to].sort().join(",")}}`);
    arrowProgress.attr("x2", 10).attr("opacity", 0);
  }

  function clearContractedGraph() {
    contractedCanvas.replaceChildren();
    contractedCanvas.classList.add("is-empty");
    delete contractedCanvas.dataset.nodeCount;
    delete contractedCanvas.dataset.edgeCount;
    delete contractedCanvas.dataset.originalEdgeIds;
  }

  function renderContractedGraph(result, initiallyHidden) {
    const contractedGraph = makeGraphSvg(
      contractedCanvas,
      instanceId,
      "contracted",
      `Graph after contracting edge ${edgeName(result.selectedEdge)}`,
    );
    const vertexById = new Map(
      result.vertices.map((vertex) => [vertex.id, vertex]),
    );
    const parallelSummary = [...new Set(
      result.edges
        .filter((edge) => edge.parallelCount > 1)
        .map((edge) => [edge.from, edge.to].sort().join("–")),
    )];

    contractedGraph.description.text(
      `${result.selectedEdge.from} and ${result.selectedEdge.to} form supernode ${result.supernodeLabel}. ` +
        `${parallelSummary.length > 0 ? "Parallel edges are retained." : "No parallel edges are created."}`,
    );

    contractedCanvas.dataset.nodeCount = String(result.vertices.length);
    contractedCanvas.dataset.edgeCount = String(result.edges.length);
    contractedCanvas.dataset.originalEdgeIds = result.edges
      .map((edge) => edge.originalId)
      .join(",");

    const edgeSelection = contractedGraph.svg
      .append("g")
      .attr("class", "edge-contraction__edges")
      .selectAll("path")
      .data(result.edges)
      .join("path")
      .attr("class", "edge-contraction__edge")
      .attr("d", (edge) => edgePath(edge, vertexById));

    const nodeGroups = contractedGraph.svg
      .append("g")
      .attr("class", "edge-contraction__nodes")
      .selectAll("g")
      .data(result.vertices)
      .join("g")
      .attr("class", (vertex) =>
        vertex.isSupernode
          ? "edge-contraction__result-node is-supernode"
          : "edge-contraction__result-node",
      );

    nodeGroups
      .append("circle")
      .attr("class", "edge-contraction__node")
      .attr("cx", (vertex) => vertex.x)
      .attr("cy", (vertex) => vertex.y)
      .attr("r", (vertex) => (vertex.isSupernode ? 28 : 15));

    nodeGroups
      .append("text")
      .attr("class", (vertex) =>
        vertex.isSupernode
          ? "edge-contraction__label edge-contraction__label--inside edge-contraction__label--supernode"
          : "edge-contraction__label edge-contraction__label--inside",
      )
      .attr("x", (vertex) => vertex.x)
      .attr("y", (vertex) => vertex.y)
      .text((vertex) => vertex.label);

    contractedCanvas.classList.remove("is-empty");

    if (initiallyHidden) {
      edgeSelection.each(function setInitialStroke() {
        const length = this.getTotalLength();
        d3.select(this)
          .attr("stroke-dasharray", `${length} ${length}`)
          .attr("stroke-dashoffset", length)
          .attr("opacity", 0);
      });
      nodeGroups.attr("opacity", 0);
    }

    return { edgeSelection, nodeGroups };
  }

  async function animateContraction(result, renderedGraph) {
    await wait(180);

    await Promise.all([
      miniatureEdge
        .transition()
        .duration(520)
        .ease(d3.easeCubicInOut)
        .attr("x1", 57)
        .attr("x2", 57)
        .attr("opacity", 0)
        .end(),
      miniatureNodes
        .transition()
        .duration(520)
        .ease(d3.easeCubicInOut)
        .attr("cx", 57)
        .attr("opacity", 0)
        .end(),
      miniatureLabels
        .transition()
        .duration(520)
        .ease(d3.easeCubicInOut)
        .attr("x", 57)
        .attr("opacity", 0)
        .end(),
    ]);

    await Promise.all([
      miniatureSupernode
        .transition()
        .duration(170)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .end(),
      miniatureSupernodeLabel
        .transition()
        .duration(170)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .end(),
    ]);

    arrowProgress.attr("opacity", 1);
    await arrowProgress
      .transition()
      .duration(350)
      .ease(d3.easeCubicInOut)
      .attr("x2", 138)
      .end();

    await Promise.all([
      renderedGraph.edgeSelection
        .transition()
        .duration(430)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .attr("opacity", 1)
        .end(),
      renderedGraph.nodeGroups
        .transition()
        .delay(110)
        .duration(320)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .end(),
    ]);

    renderedGraph.edgeSelection
      .attr("stroke-dasharray", null)
      .attr("stroke-dashoffset", null);
  }

  async function runContraction({ announce = true } = {}) {
    if (isRunning) {
      return;
    }

    isRunning = true;
    setControlsDisabled(true);
    resetArrow();
    clearContractedGraph();

    const result = contractGraph(selectedEdgeId);
    const shouldAnimate = !reducedMotion.matches;
    const renderedGraph = renderContractedGraph(result, shouldAnimate);

    if (announce) {
      status.textContent = `Contracting edge ${edgeName(result.selectedEdge)}.`;
    }

    if (shouldAnimate) {
      await animateContraction(result, renderedGraph);
    } else {
      arrowProgress.attr("x2", 138).attr("opacity", 1);
      miniatureEdge.attr("opacity", 0);
      miniatureNodes.attr("opacity", 0);
      miniatureLabels.attr("opacity", 0);
      miniatureSupernode.attr("opacity", 1);
      miniatureSupernodeLabel.attr("opacity", 1);
    }

    status.textContent = `Contracted edge ${edgeName(result.selectedEdge)}. The original graph remains on the left.`;
    setControlsDisabled(false);
    isRunning = false;
  }

  edgeSelect.addEventListener("change", () => {
    hasAutoplayed = true;
    selectedEdgeId = edgeSelect.value;
    updateOriginalSelection();
    resetArrow();
    clearContractedGraph();
    status.textContent = `Edge ${edgeName(edgeById.get(selectedEdgeId))} is selected. Choose Run contraction.`;
  });

  runButton.addEventListener("click", () => {
    hasAutoplayed = true;
    void runContraction();
  });

  resetButton.addEventListener("click", () => {
    hasAutoplayed = true;
    selectedEdgeId = DEFAULT_EDGE_ID;
    edgeSelect.value = DEFAULT_EDGE_ID;
    updateOriginalSelection();
    resetArrow();
    clearContractedGraph();
    status.textContent = "Edge 1–3 is selected.";
  });

  updateOriginalSelection();
  resetArrow();
  clearContractedGraph();

  if (reducedMotion.matches) {
    hasAutoplayed = true;
    void runContraction({ announce: false });
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || hasAutoplayed) {
          return;
        }

        hasAutoplayed = true;
        observer.disconnect();
        void runContraction({ announce: false });
      },
      { threshold: 0.35 },
    );

    observer.observe(demo);
  } else {
    hasAutoplayed = true;
    void runContraction({ announce: false });
  }
}

document
  .querySelectorAll("[data-edge-contraction-demo]")
  .forEach(initializeDemo);
