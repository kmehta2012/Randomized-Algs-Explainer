import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import {
  KARGER_GRAPH,
  KARGER_RUN,
  buildContractedMultigraph,
  getCrossingEdges,
  getKargerCut,
} from "./karger-graph.js";
import { renderKargerCut } from "./karger-cut-examples.js";

const GRAPH_WIDTH = 170;
const GRAPH_HEIGHT = 118;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const EXPECTED_COUNTS = Object.freeze({
  g1: Object.freeze({ nodes: 5, edges: 8 }),
  g2: Object.freeze({ nodes: 4, edges: 7 }),
  "failed-g3": Object.freeze({ nodes: 3, edges: 6 }),
  "failed-g4": Object.freeze({ nodes: 2, edges: 5 }),
  "successful-g3": Object.freeze({ nodes: 3, edges: 5 }),
  "successful-g4": Object.freeze({ nodes: 2, edges: 2 }),
});

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function formatGroups(groups) {
  return groups
    .map((group) => (group.length === 1 ? group[0] : `{${group.join(",")}}`))
    .join(", ");
}

function formatEdgeId(edgeId) {
  return edgeId.split("").join("–");
}

function nodeRadius(vertex) {
  return [9, 15, 20, 23][Math.min(vertex.members.length, 4) - 1];
}

function curveGeometry(edge, vertexById) {
  let from = vertexById.get(edge.from);
  let to = vertexById.get(edge.to);

  if (edge.from.localeCompare(edge.to) > 0) {
    [from, to] = [to, from];
  }

  if (edge.parallelCount === 1) {
    return {
      path: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      labelX: (from.x + to.x) / 2,
      labelY: (from.y + to.y) / 2 - 4,
    };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const midpointX = (from.x + to.x) / 2;
  const midpointY = (from.y + to.y) / 2;
  const centeredIndex = edge.parallelIndex - (edge.parallelCount - 1) / 2;
  const curveStep = edge.parallelCount >= 5 ? 22 : 25;
  const curveOffset = centeredIndex * curveStep;
  const controlX = midpointX - (dy / length) * curveOffset;
  const controlY = midpointY + (dx / length) * curveOffset;

  return {
    path: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`,
    labelX: 0.25 * from.x + 0.5 * controlX + 0.25 * to.x,
    labelY: 0.25 * from.y + 0.5 * controlY + 0.25 * to.y - 3,
  };
}

function makeStateDescription(state, graph, detail) {
  const edgeIds = graph.edges.map((edge) => edge.originalId).join(", ");

  return (
    `Supernodes: ${formatGroups(state.groups)}. ` +
    `Surviving original edges: ${edgeIds}. ${detail}`
  );
}

function renderGraphState(container, state, instanceId, options = {}) {
  const graph = buildContractedMultigraph(state.groups, state.layout);
  const expected = EXPECTED_COUNTS[state.id];

  if (
    !expected ||
    graph.vertices.length !== expected.nodes ||
    graph.edges.length !== expected.edges
  ) {
    throw new Error(
      `${state.id} has ${graph.vertices.length} nodes and ${graph.edges.length} edges; ` +
        `expected ${expected?.nodes} and ${expected?.edges}.`,
    );
  }

  const figure = document.createElement("figure");
  figure.className = "karger-runs__state";
  figure.dataset.stateId = state.id;
  figure.dataset.nodeCount = String(graph.vertices.length);
  figure.dataset.edgeCount = String(graph.edges.length);
  figure.dataset.edgeIds = graph.edges.map((edge) => edge.originalId).join(",");

  const caption = document.createElement("figcaption");
  caption.className = "karger-runs__state-label";
  caption.textContent = state.label;

  const canvas = document.createElement("div");
  canvas.className = "karger-runs__state-canvas";

  figure.append(caption, canvas);
  container.append(figure);

  const titleId = `${instanceId}-${state.id}-title`;
  const descriptionId = `${instanceId}-${state.id}-description`;
  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("viewBox", `0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${titleId} ${descriptionId}`);

  svg
    .append("title")
    .attr("id", titleId)
    .text(`${options.contextTitle ?? "Shared execution"}, ${state.label}`);

  svg
    .append("desc")
    .attr("id", descriptionId)
    .text(makeStateDescription(state, graph, options.description));

  const vertexById = new Map(graph.vertices.map((vertex) => [vertex.id, vertex]));
  const geometryByEdge = new Map(
    graph.edges.map((edge) => [edge.originalId, curveGeometry(edge, vertexById)]),
  );

  const edgeSelection = svg
    .append("g")
    .attr("class", "karger-runs__edges")
    .selectAll("path")
    .data(graph.edges)
    .join("path")
    .attr("class", "karger-runs__edge")
    .attr("data-edge-id", (edge) => edge.originalId)
    .attr("d", (edge) => geometryByEdge.get(edge.originalId).path);

  const cut = options.cutId ? getKargerCut(options.cutId) : null;
  const setS = cut ? new Set(cut.setS) : null;
  const nodeGroups = svg
    .append("g")
    .attr("class", "karger-runs__nodes")
    .selectAll("g")
    .data(graph.vertices)
    .join("g")
    .attr("class", (vertex) => {
      const classes = ["karger-runs__node-group"];

      if (vertex.isSupernode) {
        classes.push("is-supernode");
      }

      if (setS) {
        const belongsToS = vertex.members.every((member) => setS.has(member));
        classes.push(belongsToS ? "is-set-s" : "is-set-t");
      }

      return classes.join(" ");
    })
    .attr("data-group", (vertex) => vertex.id);

  nodeGroups
    .append("circle")
    .attr("class", "karger-runs__node")
    .attr("cx", (vertex) => vertex.x)
    .attr("cy", (vertex) => vertex.y)
    .attr("r", nodeRadius);

  nodeGroups
    .append("text")
    .attr("class", (vertex) =>
      `karger-runs__node-label member-count-${vertex.members.length}`,
    )
    .attr("x", (vertex) => vertex.x)
    .attr("y", (vertex) => vertex.y)
    .text((vertex) => vertex.label);

  const edgeLabels = options.showEdgeLabels
    ? svg
        .append("g")
        .attr("class", "karger-runs__edge-labels")
        .selectAll("text")
        .data(graph.edges)
        .join("text")
        .attr("class", "karger-runs__edge-label")
        .attr("data-edge-label", (edge) => edge.originalId)
        .attr("x", (edge) => geometryByEdge.get(edge.originalId).labelX)
        .attr("y", (edge) => geometryByEdge.get(edge.originalId).labelY)
        .text((edge) => edge.originalId)
    : d3.select(null);

  function setSelectedEdges(edgeIds) {
    const selectedIds = new Set(edgeIds);
    const selectedGroups = new Set();

    graph.edges.forEach((edge) => {
      if (selectedIds.has(edge.originalId)) {
        selectedGroups.add(edge.from);
        selectedGroups.add(edge.to);
      }
    });

    edgeSelection.classed(
      "is-selected",
      (edge) => selectedIds.has(edge.originalId),
    );
    nodeGroups.classed(
      "is-selected-endpoint",
      (vertex) => selectedGroups.has(vertex.id),
    );
    figure.dataset.selectedEdgeIds = edgeIds.join(",");
  }

  return { figure, graph, edgeLabels, setSelectedEdges };
}

function renderConnector(container, instanceId, connectorId, label) {
  container.classList.add("karger-runs__connector");
  container.dataset.connectorId = connectorId;

  const labelElement = document.createElement("span");
  labelElement.className = "karger-runs__connector-label";
  labelElement.textContent = label;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", "0 0 82 26")
    .attr("aria-hidden", "true");

  const markerId = `${instanceId}-${connectorId}-arrowhead`;
  svg
    .append("defs")
    .append("marker")
    .attr("id", markerId)
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("class", "karger-runs__arrowhead")
    .attr("d", "M 0 0 L 10 5 L 0 10 z");

  svg
    .append("path")
    .attr("class", "karger-runs__arrow-track")
    .attr("d", "M 5 13 H 75");

  const progress = svg
    .append("path")
    .attr("class", "karger-runs__arrow-progress")
    .attr("d", "M 5 13 H 75")
    .attr("marker-end", `url(#${markerId})`);

  container.prepend(labelElement);
  const length = progress.node().getTotalLength();

  function reset() {
    progress
      .interrupt()
      .attr("stroke-dasharray", `${length} ${length}`)
      .attr("stroke-dashoffset", length)
      .attr("opacity", 0);
  }

  function complete() {
    progress
      .interrupt()
      .attr("stroke-dasharray", null)
      .attr("stroke-dashoffset", 0)
      .attr("opacity", 1);
  }

  async function animate(duration) {
    progress.attr("opacity", 1);
    await progress
      .transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0)
      .end();
    progress.attr("stroke-dasharray", null);
  }

  reset();
  return { reset, complete, animate };
}

function renderReturnedCut(container, cutId, instanceId, laneTitle) {
  const cut = getKargerCut(cutId);
  const figure = document.createElement("figure");
  figure.className = "karger-cuts__figure karger-runs__returned-cut";
  figure.dataset.cutId = cutId;

  const caption = document.createElement("figcaption");
  caption.className = "karger-cuts__caption karger-runs__returned-caption";
  caption.textContent = `Cut ${cutId} in G₁ · size ${cut.size}`;

  const canvas = document.createElement("div");
  canvas.className = "karger-cuts__canvas";
  canvas.dataset.cutCanvas = "";

  figure.append(caption, canvas);
  container.append(figure);
  renderKargerCut(figure, `${instanceId}-${laneTitle.toLowerCase()}`);

  return figure;
}

function initializeComparison(root, index) {
  if (root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";
  const instanceId = `karger-run-comparison-${index + 1}`;
  const stage = root.querySelector('[data-role="run-stage"]');
  const replayButton = root.querySelector('[data-action="replay"]');
  const status = root.querySelector('[data-role="status"]');
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  stage.innerHTML = `
    <div class="karger-runs__shared" data-role="shared-run">
      <div data-state-slot="g1"></div>
      <div data-connector-slot="shared"></div>
      <div data-state-slot="g2"></div>
    </div>

    <div class="karger-runs__fork" aria-hidden="true">
      <svg viewBox="0 0 34 260" preserveAspectRatio="none">
        <path d="M 0 130 H 10 C 22 130 14 55 34 55 M 10 130 C 22 130 14 205 34 205"></path>
      </svg>
    </div>

    <div class="karger-runs__lanes">
      <section class="karger-runs__lane" aria-labelledby="${instanceId}-failed-title">
        <h3 class="karger-runs__lane-title" id="${instanceId}-failed-title">Failed execution</h3>
        <div class="karger-runs__lane-sequence">
          <div data-connector-slot="failed-entry"></div>
          <div data-state-slot="failed-g3"></div>
          <div data-connector-slot="failed-final"></div>
          <div data-state-slot="failed-g4"></div>
          <div data-connector-slot="failed-return"></div>
          <div data-cut-slot="C"></div>
        </div>
      </section>

      <section class="karger-runs__lane" aria-labelledby="${instanceId}-successful-title">
        <h3 class="karger-runs__lane-title" id="${instanceId}-successful-title">Successful execution</h3>
        <div class="karger-runs__lane-sequence">
          <div data-connector-slot="successful-entry"></div>
          <div data-state-slot="successful-g3"></div>
          <div data-connector-slot="successful-final"></div>
          <div data-state-slot="successful-g4"></div>
          <div data-connector-slot="successful-return"></div>
          <div data-cut-slot="D"></div>
        </div>
      </section>
    </div>
  `;

  const descriptions = {
    g1: "The selected contraction is original edge 13.",
    g2: "The selected contraction 13 produced this state. The next selected contractions are 35 in the failed lane and 12 in the successful lane.",
    "failed-g3": "The selected contraction 35, a min-cut edge, produced this state. The next selected contraction is 24.",
    "failed-g4": "The selected contraction 24 produced this state. Its five surviving edges return Cut C in the original graph.",
    "successful-g3": "The selected contraction 12 produced this state. The next selected contraction is 14.",
    "successful-g4": "The selected contraction 14 produced this state. Its two surviving edges return Cut D in the original graph.",
  };

  const stateHandles = new Map();
  const stateEntries = [
    [KARGER_RUN.shared[0], "Shared execution", null, false],
    [KARGER_RUN.shared[1], "Shared execution", null, false],
    [KARGER_RUN.failed.states[0], KARGER_RUN.failed.title, null, false],
    [KARGER_RUN.failed.states[1], KARGER_RUN.failed.title, "C", true],
    [KARGER_RUN.successful.states[0], KARGER_RUN.successful.title, null, false],
    [KARGER_RUN.successful.states[1], KARGER_RUN.successful.title, "D", true],
  ];

  stateEntries.forEach(([state, contextTitle, cutId, showEdgeLabels]) => {
    const slot = stage.querySelector(`[data-state-slot="${state.id}"]`);
    const handle = renderGraphState(slot, state, instanceId, {
      contextTitle,
      cutId,
      showEdgeLabels,
      description: descriptions[state.id],
    });
    stateHandles.set(state.id, handle);
  });

  const connectorDefinitions = [
    ["shared", "contract 1–3"],
    ["failed-entry", "contract 3–5 · min-cut edge"],
    ["successful-entry", "contract 1–2"],
    ["failed-final", "contract 2–4"],
    ["successful-final", "contract 1–4"],
    ["failed-return", "same cut in G₁"],
    ["successful-return", "same cut in G₁"],
  ];
  const connectors = new Map(
    connectorDefinitions.map(([connectorId, label]) => {
      const slot = stage.querySelector(
        `[data-connector-slot="${connectorId}"]`,
      );
      return [
        connectorId,
        renderConnector(slot, instanceId, connectorId, label),
      ];
    }),
  );

  const returnedCuts = new Map(
    ["C", "D"].map((cutId) => {
      const slot = stage.querySelector(`[data-cut-slot="${cutId}"]`);
      return [
        cutId,
        renderReturnedCut(
          slot,
          cutId,
          instanceId,
          cutId === "C" ? "failed" : "successful",
        ),
      ];
    }),
  );

  const failedFinalIds = stateHandles
    .get("failed-g4")
    .graph.edges.map((edge) => edge.originalId)
    .sort();
  const successfulFinalIds = stateHandles
    .get("successful-g4")
    .graph.edges.map((edge) => edge.originalId)
    .sort();
  const cutCIds = getCrossingEdges(getKargerCut("C")).map((edge) => edge.id).sort();
  const cutDIds = getCrossingEdges(getKargerCut("D")).map((edge) => edge.id).sort();

  if (
    failedFinalIds.join(",") !== cutCIds.join(",") ||
    successfulFinalIds.join(",") !== cutDIds.join(",")
  ) {
    throw new Error("The two final multigraphs do not match Cuts C and D.");
  }

  root.dataset.validation = "passed";
  const initiallyHidden = [
    stateHandles.get("g2").figure,
    stateHandles.get("failed-g3").figure,
    stateHandles.get("failed-g4").figure,
    stateHandles.get("successful-g3").figure,
    stateHandles.get("successful-g4").figure,
    returnedCuts.get("C"),
    returnedCuts.get("D"),
  ];

  let isRunning = false;
  let hasAutoplayed = false;
  let observer = null;

  function clearSelections() {
    stateHandles.forEach((handle) => handle.setSelectedEdges([]));
  }

  function resetVisuals() {
    d3.selectAll(initiallyHidden).interrupt().style("opacity", 0);
    stateHandles.get("g1").figure.style.opacity = "1";
    connectors.forEach((connector) => connector.reset());
    clearSelections();
    root.classList.remove("is-complete");
  }

  function showCompletedState() {
    d3.selectAll(initiallyHidden).interrupt().style("opacity", 1);
    connectors.forEach((connector) => connector.complete());
    clearSelections();
    root.classList.add("is-complete");
  }

  async function reveal(elements, duration = 340) {
    await d3
      .selectAll(elements)
      .transition()
      .duration(duration)
      .ease(d3.easeCubicOut)
      .style("opacity", 1)
      .end();
  }

  async function runAnimation() {
    if (isRunning) {
      return;
    }

    isRunning = true;
    replayButton.disabled = true;
    resetVisuals();

    if (reducedMotion.matches) {
      showCompletedState();
      status.textContent = "Failed execution returns Cut C of size 5; successful execution returns the minimum Cut D of size 2.";
      replayButton.disabled = false;
      isRunning = false;
      return;
    }

    try {
      status.textContent = "Contracting edge 1–3 to create G₂.";
      stateHandles.get("g1").setSelectedEdges(["13"]);
      await wait(170);
      await connectors.get("shared").animate(480);
      await reveal([stateHandles.get("g2").figure], 330);

      stateHandles.get("g1").setSelectedEdges([]);
      stateHandles.get("g2").setSelectedEdges(["35", "12"]);
      status.textContent = "Both executions continue: contract 3–5, a min-cut edge, in the failed lane and 1–2 in the successful lane.";
      await wait(180);
      await Promise.all([
        connectors.get("failed-entry").animate(570),
        connectors.get("successful-entry").animate(570),
      ]);
      await reveal(
        [
          stateHandles.get("failed-g3").figure,
          stateHandles.get("successful-g3").figure,
        ],
        330,
      );

      stateHandles.get("g2").setSelectedEdges([]);
      stateHandles.get("failed-g3").setSelectedEdges(["24"]);
      stateHandles.get("successful-g3").setSelectedEdges(["14"]);
      status.textContent = "Final contractions: edge 2–4 in the failed lane and edge 1–4 in the successful lane.";
      await wait(180);
      await Promise.all([
        connectors.get("failed-final").animate(500),
        connectors.get("successful-final").animate(500),
      ]);
      await reveal(
        [
          stateHandles.get("failed-g4").figure,
          stateHandles.get("successful-g4").figure,
        ],
        360,
      );

      stateHandles.get("failed-g3").setSelectedEdges([]);
      stateHandles.get("successful-g3").setSelectedEdges([]);
      status.textContent = "The surviving parallel edges identify the same cuts in the original graph G₁.";
      await wait(180);
      await Promise.all([
        connectors.get("failed-return").animate(480),
        connectors.get("successful-return").animate(480),
      ]);
      await reveal([returnedCuts.get("C"), returnedCuts.get("D")], 400);

      root.classList.add("is-complete");
      status.textContent = "Failed execution returns Cut C of size 5; successful execution returns the minimum Cut D of size 2.";
    } finally {
      replayButton.disabled = false;
      isRunning = false;
    }
  }

  replayButton.addEventListener("click", () => {
    hasAutoplayed = true;
    observer?.disconnect();
    void runAnimation();
  });

  resetVisuals();

  if (reducedMotion.matches) {
    hasAutoplayed = true;
    void runAnimation();
    return;
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (hasAutoplayed || !entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        hasAutoplayed = true;
        observer.disconnect();
        void runAnimation();
      },
      { threshold: 0.18 },
    );
    observer.observe(root);
  } else {
    hasAutoplayed = true;
    void runAnimation();
  }
}

document
  .querySelectorAll("[data-karger-run-comparison]")
  .forEach(initializeComparison);
