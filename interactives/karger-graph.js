export const KARGER_GRAPH = Object.freeze({
  width: 360,
  height: 250,
  vertices: Object.freeze([
    Object.freeze({ id: "1", x: 68, y: 58, labelX: 68, labelY: 27, labelAnchor: "middle" }),
    Object.freeze({ id: "2", x: 68, y: 192, labelX: 55, labelY: 231, labelAnchor: "middle" }),
    Object.freeze({ id: "3", x: 220, y: 58, labelX: 220, labelY: 27, labelAnchor: "middle" }),
    Object.freeze({ id: "4", x: 220, y: 192, labelX: 208, labelY: 231, labelAnchor: "middle" }),
    Object.freeze({ id: "5", x: 314, y: 125, labelX: 338, labelY: 132, labelAnchor: "start" }),
  ]),
  edges: Object.freeze([
    Object.freeze({ id: "12", from: "1", to: "2" }),
    Object.freeze({ id: "13", from: "1", to: "3" }),
    Object.freeze({ id: "14", from: "1", to: "4" }),
    Object.freeze({ id: "23", from: "2", to: "3" }),
    Object.freeze({ id: "24", from: "2", to: "4" }),
    Object.freeze({ id: "34", from: "3", to: "4" }),
    Object.freeze({ id: "35", from: "3", to: "5" }),
    Object.freeze({ id: "45", from: "4", to: "5" }),
  ]),
});

export const KARGER_CUTS = Object.freeze([
  Object.freeze({
    id: "A",
    setS: Object.freeze(["1"]),
    size: 3,
    boundaryPath: "M 12 128 C 48 118 98 108 109 82 C 120 56 127 30 148 12",
  }),
  Object.freeze({
    id: "B",
    setS: Object.freeze(["1", "2"]),
    size: 4,
    boundaryPath: "M 145 12 C 153 76 139 169 150 238",
  }),
  Object.freeze({
    id: "C",
    setS: Object.freeze(["1", "3", "5"]),
    size: 5,
    boundaryPath: "M 12 126 C 91 132 154 121 207 130 C 257 139 278 181 348 194",
  }),
  Object.freeze({
    id: "D",
    setS: Object.freeze(["5"]),
    size: 2,
    boundaryPath: "M 270 12 C 272 68 258 101 260 127 C 263 162 278 196 270 238",
  }),
]);

export function getKargerCut(cutId) {
  return KARGER_CUTS.find((cut) => cut.id === cutId);
}

export function getCrossingEdges(cut, graph = KARGER_GRAPH) {
  const setS = new Set(cut.setS);

  return graph.edges.filter(
    (edge) => setS.has(edge.from) !== setS.has(edge.to),
  );
}

function groupKey(group) {
  return [...group].sort((left, right) => left.localeCompare(right)).join(",");
}

function freezeGroups(groups) {
  return Object.freeze(
    groups.map((group) =>
      Object.freeze([...group].sort((left, right) => left.localeCompare(right))),
    ),
  );
}

function freezeLayout(layout) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(layout).map(([key, position]) => [
        key,
        Object.freeze({ ...position }),
      ]),
    ),
  );
}

function makeRunState({ id, label, groups, layout, contractionEdgeId }) {
  return Object.freeze({
    id,
    label,
    groups: freezeGroups(groups),
    layout: freezeLayout(layout),
    contractionEdgeId,
  });
}

export const KARGER_RUN = Object.freeze({
  shared: Object.freeze([
    makeRunState({
      id: "g1",
      label: "G₁",
      groups: [["1"], ["2"], ["3"], ["4"], ["5"]],
      layout: {
        "1": { x: 28, y: 28 },
        "2": { x: 28, y: 90 },
        "3": { x: 84, y: 28 },
        "4": { x: 84, y: 90 },
        "5": { x: 143, y: 59 },
      },
      contractionEdgeId: "13",
    }),
    makeRunState({
      id: "g2",
      label: "G₂",
      groups: [["1", "3"], ["2"], ["4"], ["5"]],
      layout: {
        "1,3": { x: 35, y: 27 },
        "2": { x: 35, y: 91 },
        "4": { x: 101, y: 91 },
        "5": { x: 143, y: 59 },
      },
      contractionEdgeId: "13",
    }),
  ]),
  failed: Object.freeze({
    title: "Failed execution",
    returnedCutId: "C",
    states: Object.freeze([
      makeRunState({
        id: "failed-g3",
        label: "G₃",
        groups: [["1", "3", "5"], ["2"], ["4"]],
        layout: {
          "1,3,5": { x: 84, y: 28 },
          "2": { x: 42, y: 91 },
          "4": { x: 126, y: 91 },
        },
        contractionEdgeId: "35",
      }),
      makeRunState({
        id: "failed-g4",
        label: "G₄",
        groups: [["1", "3", "5"], ["2", "4"]],
        layout: {
          "1,3,5": { x: 39, y: 59 },
          "2,4": { x: 131, y: 59 },
        },
        contractionEdgeId: "24",
      }),
    ]),
  }),
  successful: Object.freeze({
    title: "Successful execution",
    returnedCutId: "D",
    states: Object.freeze([
      makeRunState({
        id: "successful-g3",
        label: "G₃",
        groups: [["1", "2", "3"], ["4"], ["5"]],
        layout: {
          "1,2,3": { x: 38, y: 59 },
          "4": { x: 112, y: 28 },
          "5": { x: 140, y: 90 },
        },
        contractionEdgeId: "12",
      }),
      makeRunState({
        id: "successful-g4",
        label: "G₄",
        groups: [["1", "2", "3", "4"], ["5"]],
        layout: {
          "1,2,3,4": { x: 39, y: 59 },
          "5": { x: 131, y: 59 },
        },
        contractionEdgeId: "14",
      }),
    ]),
  }),
});

function normalizeGroups(groups) {
  const normalized = groups.map((group) => [...group].sort());
  const vertices = normalized.flat();
  const expectedVertices = KARGER_GRAPH.vertices.map((vertex) => vertex.id).sort();

  if (
    vertices.length !== expectedVertices.length ||
    [...vertices].sort().some((vertexId, index) => vertexId !== expectedVertices[index])
  ) {
    throw new Error("Contracted groups must partition every vertex exactly once.");
  }

  return normalized;
}

export function buildContractedMultigraph(groups, layout = {}) {
  const normalizedGroups = normalizeGroups(groups);
  const vertexToGroup = new Map();

  const vertices = normalizedGroups.map((members) => {
    const id = groupKey(members);
    const position = layout[id];

    if (!position) {
      throw new Error(`Missing deterministic layout position for group {${id}}.`);
    }

    members.forEach((vertexId) => vertexToGroup.set(vertexId, id));

    return Object.freeze({
      id,
      members: Object.freeze([...members]),
      label: members.length === 1 ? members[0] : `{${members.join(",")}}`,
      x: position.x,
      y: position.y,
      isSupernode: members.length > 1,
    });
  });

  const survivingEdges = KARGER_GRAPH.edges
    .map((edge) => ({
      id: edge.id,
      originalId: edge.id,
      from: vertexToGroup.get(edge.from),
      to: vertexToGroup.get(edge.to),
    }))
    .filter((edge) => edge.from !== edge.to);

  const parallelGroups = new Map();

  survivingEdges.forEach((edge) => {
    const key = [edge.from, edge.to].sort().join("|");
    const parallelGroup = parallelGroups.get(key) ?? [];
    parallelGroup.push(edge);
    parallelGroups.set(key, parallelGroup);
  });

  const edges = survivingEdges.map((edge) => {
    const key = [edge.from, edge.to].sort().join("|");
    const parallelGroup = parallelGroups.get(key);

    return Object.freeze({
      ...edge,
      parallelIndex: parallelGroup.indexOf(edge),
      parallelCount: parallelGroup.length,
    });
  });

  return Object.freeze({
    vertices: Object.freeze(vertices),
    edges: Object.freeze(edges),
  });
}

export function validateContractionTransition(fromState, toState, edgeId) {
  const edge = KARGER_GRAPH.edges.find((candidate) => candidate.id === edgeId);

  if (!edge) {
    throw new Error(`Unknown contraction edge ${edgeId}.`);
  }

  const fromGroups = normalizeGroups(fromState.groups);
  const fromGroup = fromGroups.find((group) => group.includes(edge.from));
  const toGroup = fromGroups.find((group) => group.includes(edge.to));

  if (fromGroup === toGroup) {
    throw new Error(`Edge ${edgeId} is already a self-loop in ${fromState.id}.`);
  }

  const mergedGroup = [...fromGroup, ...toGroup].sort();
  const expectedGroups = fromGroups
    .filter((group) => group !== fromGroup && group !== toGroup)
    .concat([mergedGroup])
    .map(groupKey)
    .sort();
  const actualGroups = normalizeGroups(toState.groups).map(groupKey).sort();

  if (
    expectedGroups.length !== actualGroups.length ||
    expectedGroups.some((key, index) => key !== actualGroups[index])
  ) {
    throw new Error(
      `Transition ${fromState.id} → ${toState.id} is not exactly contraction ${edgeId}.`,
    );
  }

  return true;
}

validateContractionTransition(KARGER_RUN.shared[0], KARGER_RUN.shared[1], "13");
validateContractionTransition(KARGER_RUN.shared[1], KARGER_RUN.failed.states[0], "35");
validateContractionTransition(KARGER_RUN.failed.states[0], KARGER_RUN.failed.states[1], "24");
validateContractionTransition(KARGER_RUN.shared[1], KARGER_RUN.successful.states[0], "12");
validateContractionTransition(KARGER_RUN.successful.states[0], KARGER_RUN.successful.states[1], "14");
