const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const MATRICES = Object.freeze({
  A: Object.freeze([
    Object.freeze([1, 1]),
    Object.freeze([0, 1]),
  ]),
  B: Object.freeze([
    Object.freeze([1, 0]),
    Object.freeze([1, 1]),
  ]),
  C: Object.freeze([
    Object.freeze([1, 2]),
    Object.freeze([1, 1]),
  ]),
});

const SELECTED_VECTOR = Object.freeze([1, 1]);

const FORMULAS = Object.freeze({
  matrixA: String.raw`A=\begin{pmatrix}1&1\\0&1\end{pmatrix}`,
  matrixB: String.raw`B=\begin{pmatrix}1&0\\1&1\end{pmatrix}`,
  matrixC: String.raw`C=\begin{pmatrix}1&2\\1&1\end{pmatrix}`,
  mismatch: String.raw`AB=\begin{pmatrix}2&1\\1&1\end{pmatrix}\ne C`,
  sampleSpace: String.raw`\{0,1\}^2`,
  sample00: String.raw`\begin{pmatrix}0\\0\end{pmatrix}`,
  sample01: String.raw`\begin{pmatrix}0\\1\end{pmatrix}`,
  sample10: String.raw`\begin{pmatrix}1\\0\end{pmatrix}`,
  sample11: String.raw`\begin{pmatrix}1\\1\end{pmatrix}`,
  selected: String.raw`v^{(1)}=\begin{pmatrix}1\\1\end{pmatrix}`,
  bv: String.raw`Bv^{(1)}=\begin{pmatrix}1&0\\1&1\end{pmatrix}\begin{pmatrix}1\\1\end{pmatrix}=\begin{pmatrix}1\\2\end{pmatrix}`,
  cv: String.raw`Cv^{(1)}=\begin{pmatrix}1&2\\1&1\end{pmatrix}\begin{pmatrix}1\\1\end{pmatrix}=\begin{pmatrix}3\\2\end{pmatrix}`,
  abv: String.raw`A\bigl(Bv^{(1)}\bigr)=\begin{pmatrix}1&1\\0&1\end{pmatrix}\begin{pmatrix}1\\2\end{pmatrix}=\begin{pmatrix}3\\2\end{pmatrix}`,
  agreement: String.raw`A\bigl(Bv^{(1)}\bigr)=Cv^{(1)}`,
});

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function multiplyMatrices(left, right) {
  return left.map((row) =>
    right[0].map((_, columnIndex) =>
      row.reduce(
        (sum, value, index) => sum + value * right[index][columnIndex],
        0,
      ),
    ),
  );
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * vector[index], 0),
  );
}

function valuesMatch(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function buildMarkup(instanceId) {
  const sampleArrowId = `${instanceId}-sample-arrowhead`;
  const branchArrowId = `${instanceId}-branch-arrowhead`;
  const laneArrowId = `${instanceId}-lane-arrowhead`;
  const convergenceArrowId = `${instanceId}-convergence-arrowhead`;

  return `
    <section class="freivalds-failure__section freivalds-failure__reveal" data-reveal="inputs" aria-labelledby="${instanceId}-inputs-title">
      <p class="freivalds-failure__stage-label" id="${instanceId}-inputs-title">Input matrices</p>
      <div class="freivalds-failure__input-row">
        <div class="freivalds-failure__formula-node freivalds-failure__matrix" data-formula="matrixA"></div>
        <div class="freivalds-failure__formula-node freivalds-failure__matrix" data-formula="matrixB"></div>
        <div class="freivalds-failure__formula-node freivalds-failure__matrix" data-formula="matrixC"></div>
      </div>
    </section>

    <section class="freivalds-failure__section freivalds-failure__mismatch freivalds-failure__reveal" data-reveal="mismatch" aria-labelledby="${instanceId}-mismatch-title">
      <p class="freivalds-failure__stage-label" id="${instanceId}-mismatch-title">The claimed product is incorrect</p>
      <div class="freivalds-failure__formula-node" data-formula="mismatch"></div>
    </section>

    <section class="freivalds-failure__section freivalds-failure__sampling freivalds-failure__reveal" data-reveal="sampling" aria-labelledby="${instanceId}-sampling-title">
      <p class="freivalds-failure__stage-label" id="${instanceId}-sampling-title">
        One illustrative draw from <span data-formula="sampleSpace" data-display="inline"></span>
      </p>
      <div class="freivalds-failure__sampling-row">
        <div class="freivalds-failure__tray" data-role="sample-tray" role="list" aria-label="The four equally likely vectors in the sample space">
          <div class="freivalds-failure__sample-card" data-sample="00" role="listitem"><span data-formula="sample00" data-display="inline"></span></div>
          <div class="freivalds-failure__sample-card" data-sample="01" role="listitem"><span data-formula="sample01" data-display="inline"></span></div>
          <div class="freivalds-failure__sample-card" data-sample="10" role="listitem"><span data-formula="sample10" data-display="inline"></span></div>
          <div class="freivalds-failure__sample-card" data-sample="11" role="listitem"><span data-formula="sample11" data-display="inline"></span></div>
        </div>

        <svg class="freivalds-failure__sample-arrow freivalds-failure__arrow" viewBox="0 0 120 36" aria-hidden="true" data-arrow="sample">
          <defs>
            <marker id="${sampleArrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path class="freivalds-failure__arrowhead" d="M 0 0 L 10 5 L 0 10 z"></path>
            </marker>
          </defs>
          <path class="freivalds-failure__arrow-track" d="M 6 18 H 112"></path>
          <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 6 18 H 112" marker-end="url(#${sampleArrowId})"></path>
        </svg>

        <div class="freivalds-failure__selected freivalds-failure__reveal" data-reveal="selected">
          <span class="freivalds-failure__minor-label">Sampled vector</span>
          <div class="freivalds-failure__formula-node" data-formula="selected"></div>
        </div>
      </div>
    </section>

    <section class="freivalds-failure__section freivalds-failure__computation freivalds-failure__reveal" data-reveal="computation" aria-labelledby="${instanceId}-computation-title">
      <p class="freivalds-failure__stage-label" id="${instanceId}-computation-title">Compute both sides</p>

      <div class="freivalds-failure__source freivalds-failure__reveal" data-reveal="source">
        <span class="freivalds-failure__minor-label">The same sample enters both lanes</span>
        <div class="freivalds-failure__formula-node" data-formula="selected"></div>
      </div>

      <svg class="freivalds-failure__branch freivalds-failure__branch--desktop freivalds-failure__arrow" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" data-arrow="branch">
        <defs>
          <marker id="${branchArrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path class="freivalds-failure__arrowhead" d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
        </defs>
        <path class="freivalds-failure__arrow-track" d="M 50 1 V 9"></path>
        <path class="freivalds-failure__arrow-track" d="M 50 9 L 25 30"></path>
        <path class="freivalds-failure__arrow-track" d="M 50 9 L 75 30"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 50 1 V 9"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 50 9 L 25 30" marker-end="url(#${branchArrowId})"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 50 9 L 75 30" marker-end="url(#${branchArrowId})"></path>
      </svg>

      <svg class="freivalds-failure__branch freivalds-failure__branch--mobile freivalds-failure__arrow" viewBox="0 0 30 48" aria-hidden="true" data-arrow="branch">
        <path class="freivalds-failure__arrow-track" d="M 15 3 V 43"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 15 3 V 43" marker-end="url(#${branchArrowId})"></path>
      </svg>

      <div class="freivalds-failure__lanes">
        <div class="freivalds-failure__lane" aria-label="Compute Bv, then multiply by A">
          <p class="freivalds-failure__lane-title">Compute Bv, then A(Bv)</p>
          <div class="freivalds-failure__lane-sequence">
            <div class="freivalds-failure__formula-node freivalds-failure__reveal" data-formula="bv" data-reveal="bv"></div>
            <svg class="freivalds-failure__lane-arrow freivalds-failure__arrow" viewBox="0 0 76 28" aria-hidden="true" data-arrow="lane">
              <defs>
                <marker id="${laneArrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path class="freivalds-failure__arrowhead" d="M 0 0 L 10 5 L 0 10 z"></path>
                </marker>
              </defs>
              <path class="freivalds-failure__arrow-track" d="M 4 14 H 70"></path>
              <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 4 14 H 70" marker-end="url(#${laneArrowId})"></path>
            </svg>
            <div class="freivalds-failure__formula-node freivalds-failure__reveal" data-formula="abv" data-reveal="abv"></div>
          </div>
        </div>

        <div class="freivalds-failure__lane" aria-label="Compute Cv directly">
          <p class="freivalds-failure__lane-title">Compute Cv directly</p>
          <div class="freivalds-failure__lane-single">
            <div class="freivalds-failure__formula-node freivalds-failure__reveal" data-formula="cv" data-reveal="cv"></div>
          </div>
        </div>
      </div>

      <svg class="freivalds-failure__convergence freivalds-failure__convergence--desktop freivalds-failure__arrow" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true" data-arrow="convergence">
        <defs>
          <marker id="${convergenceArrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path class="freivalds-failure__arrowhead" d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
        </defs>
        <path class="freivalds-failure__arrow-track" d="M 25 2 L 50 28"></path>
        <path class="freivalds-failure__arrow-track" d="M 75 2 L 50 28"></path>
        <path class="freivalds-failure__arrow-track" d="M 50 28 V 34"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 25 2 L 50 28"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 75 2 L 50 28"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 50 28 V 34" marker-end="url(#${convergenceArrowId})"></path>
      </svg>

      <svg class="freivalds-failure__convergence freivalds-failure__convergence--mobile freivalds-failure__arrow" viewBox="0 0 30 48" aria-hidden="true" data-arrow="convergence">
        <path class="freivalds-failure__arrow-track" d="M 15 3 V 43"></path>
        <path class="freivalds-failure__arrow-progress" pathLength="1" d="M 15 3 V 43" marker-end="url(#${convergenceArrowId})"></path>
      </svg>

      <div class="freivalds-failure__agreement freivalds-failure__reveal" data-reveal="agreement">
        <span class="freivalds-failure__agreement-label">Misleading agreement</span>
        <div class="freivalds-failure__formula-node" data-formula="agreement"></div>
        <p>This iteration accepts even though <span class="freivalds-failure__nowrap">AB ≠ C</span>.</p>
      </div>
    </section>
  `;
}

function renderFormulas(stage) {
  if (!window.katex || typeof window.katex.render !== "function") {
    throw new Error("KaTeX is unavailable.");
  }

  const formulaElements = [...stage.querySelectorAll("[data-formula]")];

  formulaElements.forEach((element) => {
    const formula = FORMULAS[element.dataset.formula];

    if (!formula) {
      throw new Error(`Unknown formula: ${element.dataset.formula}`);
    }

    window.katex.render(formula, element, {
      displayMode: element.dataset.display !== "inline",
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: true,
    });
  });

  if (
    formulaElements.length === 0 ||
    stage.querySelectorAll(".katex-mathml").length !== formulaElements.length
  ) {
    throw new Error("KaTeX did not produce accessible MathML for every formula.");
  }
}

function validateExample(stage) {
  const product = multiplyMatrices(MATRICES.A, MATRICES.B);
  const bv = multiplyMatrixVector(MATRICES.B, SELECTED_VECTOR);
  const cv = multiplyMatrixVector(MATRICES.C, SELECTED_VECTOR);
  const abv = multiplyMatrixVector(MATRICES.A, bv);
  const sampleKeys = [...stage.querySelectorAll("[data-sample]")]
    .map((element) => element.dataset.sample)
    .sort();

  if (
    !valuesMatch(product, [
      [2, 1],
      [1, 1],
    ]) ||
    valuesMatch(product, MATRICES.C) ||
    !valuesMatch(bv, [1, 2]) ||
    !valuesMatch(cv, [3, 2]) ||
    !valuesMatch(abv, [3, 2]) ||
    !valuesMatch(abv, cv) ||
    sampleKeys.join(",") !== "00,01,10,11"
  ) {
    throw new Error("The rendered example does not match the validated computation.");
  }
}

function initializeDemo(root, index) {
  if (root.dataset.initialized === "true") {
    return;
  }

  const fallback = root.parentElement?.querySelector(
    "[data-freivalds-failure-fallback]",
  );
  const stage = root.querySelector('[data-role="stage"]');
  const replayButton = root.querySelector('[data-action="replay"]');
  const status = root.querySelector('[data-role="status"]');
  const instanceId = `freivalds-failure-${index + 1}`;

  if (!fallback || !stage || !replayButton || !status) {
    return;
  }

  try {
    stage.innerHTML = buildMarkup(instanceId);
    renderFormulas(stage);
    validateExample(stage);
  } catch (error) {
    root.dataset.initialization = "failed";
    root.hidden = true;
    fallback.hidden = false;
    return;
  }

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const sampleTray = root.querySelector('[data-role="sample-tray"]');
  const selectedCard = root.querySelector('[data-sample="11"]');
  const otherCards = [...root.querySelectorAll("[data-sample]")].filter(
    (card) => card !== selectedCard,
  );
  let observer = null;
  let hasAutoplayed = false;
  let isRunning = false;

  function revealTargets(name) {
    return [...root.querySelectorAll(`[data-reveal="${name}"]`)];
  }

  function arrowTargets(name) {
    return [...root.querySelectorAll(`[data-arrow="${name}"]`)];
  }

  function removeTravelingCards() {
    document
      .querySelectorAll(`[data-traveling-sample="${instanceId}"]`)
      .forEach((element) => element.remove());
  }

  function setSampleSelection() {
    selectedCard.classList.add("is-selected");
    otherCards.forEach((card) => card.classList.add("is-dimmed"));
  }

  function resetVisuals() {
    removeTravelingCards();
    root.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.remove("is-visible");
    });
    root.querySelectorAll("[data-arrow]").forEach((element) => {
      element.classList.remove("is-drawn");
    });
    sampleTray.classList.remove("is-shuffling");
    root.querySelectorAll("[data-sample]").forEach((card) => {
      card.classList.remove("is-selected", "is-dimmed");
    });
    root.classList.remove("is-complete");
  }

  function showCompletedState() {
    removeTravelingCards();
    root.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.add("is-visible");
    });
    root.querySelectorAll("[data-arrow]").forEach((element) => {
      element.classList.add("is-drawn");
    });
    sampleTray.classList.remove("is-shuffling");
    setSampleSelection();
    root.classList.add("is-complete");
  }

  async function reveal(name, duration = 360) {
    revealTargets(name).forEach((element) => element.classList.add("is-visible"));
    await wait(duration);
  }

  async function drawArrow(name, duration = 380) {
    arrowTargets(name).forEach((element) => element.classList.add("is-drawn"));
    await wait(duration);
  }

  async function moveSelectedCard() {
    const destination = root.querySelector('[data-reveal="selected"] .freivalds-failure__formula-node');

    if (!destination || typeof selectedCard.animate !== "function") {
      await wait(220);
      return;
    }

    const start = selectedCard.getBoundingClientRect();
    const end = destination.getBoundingClientRect();
    const travelingCard = selectedCard.cloneNode(true);
    travelingCard.classList.add("freivalds-failure__traveling-card");
    travelingCard.dataset.travelingSample = instanceId;
    travelingCard.setAttribute("aria-hidden", "true");
    travelingCard.style.left = `${start.left}px`;
    travelingCard.style.top = `${start.top}px`;
    travelingCard.style.width = `${start.width}px`;
    travelingCard.style.height = `${start.height}px`;
    document.body.append(travelingCard);

    const animation = travelingCard.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(0.94)`,
          opacity: 0.92,
        },
      ],
      { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );

    await animation.finished.catch(() => undefined);
    travelingCard.remove();
  }

  function restoreFallback() {
    root.dataset.animation = "failed";
    root.hidden = true;
    fallback.hidden = false;
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
      status.textContent = "This iteration accepts even though AB ≠ C.";
      replayButton.disabled = false;
      isRunning = false;
      return;
    }

    try {
      await nextFrame();
      await reveal("inputs", 430);

      status.textContent = "The claimed product AB is not equal to C.";
      await reveal("mismatch", 430);

      status.textContent = "For this illustrative draw, Freivalds samples from all four vectors in {0,1}².";
      await reveal("sampling", 390);
      sampleTray.classList.add("is-shuffling");
      await wait(650);
      sampleTray.classList.remove("is-shuffling");

      status.textContent = "This illustrative draw selects v⁽¹⁾ = (1,1)ᵀ.";
      setSampleSelection();
      await drawArrow("sample", 360);
      await moveSelectedCard();
      await reveal("selected", 220);

      status.textContent = "The selected vector enters both computation lanes.";
      await reveal("computation", 300);
      await reveal("source", 190);
      await drawArrow("branch", 380);

      status.textContent = "Compute Bv⁽¹⁾ and Cv⁽¹⁾.";
      await Promise.all([reveal("bv", 420), reveal("cv", 420)]);

      status.textContent = "Multiply Bv⁽¹⁾ by A.";
      await drawArrow("lane", 320);
      await reveal("abv", 420);

      status.textContent = "The two computations produce the same vector.";
      await drawArrow("convergence", 380);
      await reveal("agreement", 430);

      root.classList.add("is-complete");
      status.textContent = "This iteration accepts even though AB ≠ C.";
    } catch (error) {
      restoreFallback();
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

  root.dataset.initialized = "true";
  root.dataset.validation = "passed";
  fallback.hidden = true;
  root.hidden = false;
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

function initializeAllDemos() {
  if (!window.katex || typeof window.katex.render !== "function") {
    return;
  }

  document
    .querySelectorAll("[data-freivalds-failure-demo]")
    .forEach(initializeDemo);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAllDemos, { once: true });
}

initializeAllDemos();
window.addEventListener("load", initializeAllDemos, { once: true });
