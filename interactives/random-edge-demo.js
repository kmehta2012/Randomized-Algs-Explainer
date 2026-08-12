const SVG_NS = "http://www.w3.org/2000/svg";

const vertices = [
  { id: "A", x: 130, y: 95 },
  { id: "B", x: 510, y: 95 },
  { id: "C", x: 510, y: 275 },
  { id: "D", x: 130, y: 275 },
];

const edges = [
  { id: "AB", from: "A", to: "B" },
  { id: "BC", from: "B", to: "C" },
  { id: "CD", from: "C", to: "D" },
  { id: "DA", from: "D", to: "A" },
  { id: "AC", from: "A", to: "C" },
];

const vertexById = new Map(vertices.map((vertex) => [vertex.id, vertex]));

function makeSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }

  return element;
}

function drawGraph(container) {
  const svg = makeSvgElement("svg", {
    viewBox: "0 0 640 370",
    role: "img",
    "aria-label": "Four vertices joined by five edges",
  });

  for (const edge of edges) {
    const from = vertexById.get(edge.from);
    const to = vertexById.get(edge.to);
    const line = makeSvgElement("line", {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: "edge-demo__edge",
      "data-edge-id": edge.id,
    });
    svg.append(line);
  }

  for (const vertex of vertices) {
    const circle = makeSvgElement("circle", {
      cx: vertex.x,
      cy: vertex.y,
      r: 30,
      class: "edge-demo__node",
    });
    const label = makeSvgElement("text", {
      x: vertex.x,
      y: vertex.y + 1,
      class: "edge-demo__label",
    });
    label.textContent = vertex.id;
    svg.append(circle, label);
  }

  container.replaceChildren(svg);
  return svg;
}

function initializeDemo(demo) {
  const canvas = demo.querySelector(".edge-demo__canvas");
  const status = demo.querySelector(".edge-demo__status");
  const chooseButton = demo.querySelector('[data-action="choose"]');
  const resetButton = demo.querySelector('[data-action="reset"]');
  const svg = drawGraph(canvas);

  function reset() {
    svg.querySelectorAll(".is-selected").forEach((edge) => {
      edge.classList.remove("is-selected");
    });
    status.textContent = "No edge selected yet.";
  }

  chooseButton.addEventListener("click", () => {
    reset();
    const selected = edges[Math.floor(Math.random() * edges.length)];
    svg
      .querySelector(`[data-edge-id="${selected.id}"]`)
      .classList.add("is-selected");
    status.textContent = `Selected edge ${selected.id}.`;
  });

  resetButton.addEventListener("click", reset);
}

document.querySelectorAll("[data-random-edge-demo]").forEach(initializeDemo);
