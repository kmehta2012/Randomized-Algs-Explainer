import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import {
  KARGER_GRAPH,
  getCrossingEdges,
  getKargerCut,
} from "./karger-graph.js";

function formatVertexSet(vertexIds) {
  return `{${vertexIds.join(", ")}}`;
}

function formatEdge(edge) {
  return `${edge.from}–${edge.to}`;
}

function formatList(items) {
  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function renderKargerCut(figure, instanceId) {
  const cut = getKargerCut(figure.dataset.cutId);
  const canvas = figure.querySelector("[data-cut-canvas]");

  if (!cut || !canvas) {
    return;
  }

  const setS = new Set(cut.setS);
  const setT = KARGER_GRAPH.vertices
    .map((vertex) => vertex.id)
    .filter((vertexId) => !setS.has(vertexId));
  const crossingEdges = getCrossingEdges(cut);
  const crossingEdgeIds = new Set(crossingEdges.map((edge) => edge.id));

  if (crossingEdges.length !== cut.size) {
    throw new Error(
      `Cut ${cut.id} declares size ${cut.size}, but has ${crossingEdges.length} crossing edges.`,
    );
  }

  const titleId = `${instanceId}-cut-${cut.id.toLowerCase()}-title`;
  const descriptionId = `${instanceId}-cut-${cut.id.toLowerCase()}-description`;
  const vertexById = new Map(
    KARGER_GRAPH.vertices.map((vertex) => [vertex.id, vertex]),
  );

  canvas.replaceChildren();

  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("viewBox", `0 0 ${KARGER_GRAPH.width} ${KARGER_GRAPH.height}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${titleId} ${descriptionId}`);

  svg
    .append("title")
    .attr("id", titleId)
    .text(`Cut ${cut.id}, size ${cut.size}`);

  svg
    .append("desc")
    .attr("id", descriptionId)
    .text(
      `Cut ${cut.id} places vertices ${formatVertexSet(cut.setS)} in S and ` +
        `vertices ${formatVertexSet(setT)} in T. The crossing edges are ` +
        `${formatList(crossingEdges.map(formatEdge))}, so the cut size is ${cut.size}.`,
    );

  svg
    .append("g")
    .attr("class", "karger-cuts__edges")
    .selectAll("line")
    .data(KARGER_GRAPH.edges.filter((edge) => !crossingEdgeIds.has(edge.id)))
    .join("line")
    .attr("class", "karger-cuts__edge")
    .attr("data-edge-id", (edge) => edge.id)
    .attr("data-crosses-cut", "false")
    .attr("x1", (edge) => vertexById.get(edge.from).x)
    .attr("y1", (edge) => vertexById.get(edge.from).y)
    .attr("x2", (edge) => vertexById.get(edge.to).x)
    .attr("y2", (edge) => vertexById.get(edge.to).y);

  svg
    .append("path")
    .attr("class", "karger-cuts__boundary")
    .attr("data-cut-boundary", cut.id)
    .attr("d", cut.boundaryPath);

  svg
    .append("g")
    .attr("class", "karger-cuts__cut-edges")
    .selectAll("line")
    .data(crossingEdges)
    .join("line")
    .attr("class", "karger-cuts__edge is-cut-edge")
    .attr("data-edge-id", (edge) => edge.id)
    .attr("data-crosses-cut", "true")
    .attr("x1", (edge) => vertexById.get(edge.from).x)
    .attr("y1", (edge) => vertexById.get(edge.from).y)
    .attr("x2", (edge) => vertexById.get(edge.to).x)
    .attr("y2", (edge) => vertexById.get(edge.to).y);

  const nodeGroups = svg
    .append("g")
    .attr("class", "karger-cuts__nodes")
    .selectAll("g")
    .data(KARGER_GRAPH.vertices)
    .join("g")
    .attr("class", (vertex) =>
      setS.has(vertex.id)
        ? "karger-cuts__node-group is-set-s"
        : "karger-cuts__node-group is-set-t",
    )
    .attr("data-vertex-id", (vertex) => vertex.id)
    .attr("data-set", (vertex) => (setS.has(vertex.id) ? "S" : "T"));

  nodeGroups
    .append("circle")
    .attr("class", "karger-cuts__node")
    .attr("cx", (vertex) => vertex.x)
    .attr("cy", (vertex) => vertex.y)
    .attr("r", 15);

  nodeGroups
    .append("text")
    .attr("class", "karger-cuts__vertex-label")
    .attr("x", (vertex) => vertex.labelX)
    .attr("y", (vertex) => vertex.labelY)
    .attr("text-anchor", (vertex) => vertex.labelAnchor)
    .text((vertex) => vertex.id);

  figure.dataset.rendered = "true";
  figure.dataset.crossingEdgeCount = String(crossingEdges.length);
}

document.querySelectorAll("[data-karger-cut-examples]").forEach((root, index) => {
  if (root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";
  const instanceId = `karger-cut-examples-${index + 1}`;

  root
    .querySelectorAll("[data-cut-id]")
    .forEach((figure) => renderKargerCut(figure, instanceId));
});
