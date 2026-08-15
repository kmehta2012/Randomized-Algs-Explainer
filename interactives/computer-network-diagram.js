import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { KARGER_GRAPH } from "./karger-graph.js";

function initializeNetworkDiagram(root, index) {
  if (root.dataset.initialized === "true") {
    return;
  }

  root.dataset.initialized = "true";
  const canvas = root.querySelector('[data-role="network-canvas"]');

  if (!canvas) {
    return;
  }

  const instanceId = `computer-network-${index + 1}`;
  const titleId = `${instanceId}-title`;
  const descriptionId = `${instanceId}-description`;
  const vertexById = new Map(
    KARGER_GRAPH.vertices.map((vertex) => [vertex.id, vertex]),
  );

  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("viewBox", `0 0 ${KARGER_GRAPH.width} ${KARGER_GRAPH.height}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${titleId} ${descriptionId}`);

  svg
    .append("title")
    .attr("id", titleId)
    .text("A connected computer network");

  svg
    .append("desc")
    .attr("id", descriptionId)
    .text(
      "Five computers connected by eight wires. Computers 1, 2, 3, and 4 are all connected to one another, and computer 5 is connected to computers 3 and 4.",
    );

  svg
    .append("g")
    .attr("class", "computer-network__wires")
    .selectAll("line")
    .data(KARGER_GRAPH.edges)
    .join("line")
    .attr("class", "computer-network__wire")
    .attr("data-edge-id", (edge) => edge.id)
    .attr("x1", (edge) => vertexById.get(edge.from).x)
    .attr("y1", (edge) => vertexById.get(edge.from).y)
    .attr("x2", (edge) => vertexById.get(edge.to).x)
    .attr("y2", (edge) => vertexById.get(edge.to).y);

  const computers = svg
    .append("g")
    .attr("class", "computer-network__computers")
    .selectAll("g")
    .data(KARGER_GRAPH.vertices)
    .join("g")
    .attr("class", "computer-network__computer")
    .attr("data-vertex-id", (vertex) => vertex.id)
    .attr("transform", (vertex) => `translate(${vertex.x} ${vertex.y})`);

  computers
    .append("rect")
    .attr("class", "computer-network__screen")
    .attr("x", -20)
    .attr("y", -17)
    .attr("width", 40)
    .attr("height", 27)
    .attr("rx", 2);

  computers
    .append("path")
    .attr("class", "computer-network__base")
    .attr("d", "M -24 13 H 24 L 19 18 H -19 Z");

  computers
    .append("text")
    .attr("class", "computer-network__label")
    .attr("x", 0)
    .attr("y", -3)
    .text((vertex) => vertex.id);
}

document
  .querySelectorAll("[data-computer-network-diagram]")
  .forEach(initializeNetworkDiagram);
