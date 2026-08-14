(function () {
  "use strict";

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const definitions = new Map();
  let popover;
  let activeTrigger = null;
  let pinned = false;
  let closeTimer = null;
  let triggerHovered = false;
  let popoverHovered = false;

  function decodeTex(encoded) {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function trustedAnnotationData(context) {
    if (context.command !== "\\htmlData" || context.attributes == null) {
      return false;
    }

    const keys = Object.keys(context.attributes);
    const id = context.attributes["data-annotation"];
    return keys.length === 1 && keys[0] === "data-annotation" && slugPattern.test(id) && definitions.has(id);
  }

  function renderAnnotatedMath() {
    document.querySelectorAll(".explain-math[data-explain-tex]").forEach((element) => {
      const tex = decodeTex(element.dataset.explainTex);
      window.katex.render(tex, element, {
        displayMode: element.classList.contains("display"),
        throwOnError: true,
        strict: "ignore",
        trust: trustedAnnotationData,
      });
    });
  }

  function visibleTriggers() {
    return document.querySelectorAll(
      ".explain[data-annotation], .explain-math .katex-html [data-annotation]"
    );
  }

  function clearCloseTimer() {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function closePopover(options = {}) {
    clearCloseTimer();
    if (activeTrigger !== null) {
      activeTrigger.setAttribute("aria-expanded", "false");
      activeTrigger.removeAttribute("aria-describedby");
    }
    if (popover !== undefined) {
      popover.hidden = true;
      popover.replaceChildren();
      delete popover.dataset.placement;
    }
    const formerTrigger = activeTrigger;
    activeTrigger = null;
    pinned = false;
    triggerHovered = false;
    popoverHovered = false;
    if (options.restoreFocus && formerTrigger !== null) {
      formerTrigger.focus({preventScroll: true});
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer = window.setTimeout(() => {
      if (!pinned && !triggerHovered && !popoverHovered && document.activeElement !== activeTrigger) {
        closePopover();
      }
    }, 140);
  }

  function overlaps(first, second) {
    return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
  }

  function tocObstacle() {
    const candidates = Array.from(document.querySelectorAll(
      "#quarto-margin-sidebar, .quarto-margin-sidebar, .margin-sidebar"
    ));
    let obstacle = null;
    let largestArea = 0;

    candidates.forEach((toc) => {
      const style = window.getComputedStyle(toc);
      const rect = toc.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (style.display !== "none" && style.visibility !== "hidden" && area > largestArea) {
        largestArea = area;
        obstacle = rect;
      }
    });

    return obstacle;
  }

  function placePopover() {
    if (activeTrigger === null || popover.hidden) {
      return;
    }

    const viewportPadding = 16;
    const gap = 14;
    const triggerRect = activeTrigger.getBoundingClientRect();
    const obstacle = tocObstacle();
    popover.classList.add("is-positioning");
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const viewportRight = window.innerWidth - viewportPadding;
    const viewportBottom = window.innerHeight - viewportPadding;
    const rightBoundary = obstacle !== null && obstacle.left > triggerRect.right
      ? Math.min(viewportRight, obstacle.left - gap)
      : viewportRight;

    const centeredTop = Math.min(
      Math.max(viewportPadding, triggerRect.top + triggerRect.height / 2 - height / 2),
      Math.max(viewportPadding, viewportBottom - height)
    );
    const candidates = [
      {placement: "right", left: triggerRect.right + gap, top: centeredTop},
      {placement: "left", left: triggerRect.left - gap - width, top: centeredTop},
    ];

    let choice = candidates.find((candidate) => {
      const rect = {
        left: candidate.left,
        right: candidate.left + width,
        top: candidate.top,
        bottom: candidate.top + height,
      };
      const insideViewport = rect.left >= viewportPadding && rect.right <= viewportRight
        && rect.top >= viewportPadding && rect.bottom <= viewportBottom;
      const respectsRightBoundary = candidate.placement !== "right" || rect.right <= rightBoundary;
      return insideViewport && respectsRightBoundary && (obstacle === null || !overlaps(rect, obstacle));
    });

    if (choice === undefined) {
      const safeRight = obstacle !== null && obstacle.left > viewportPadding
        ? Math.min(viewportRight, obstacle.left - gap)
        : viewportRight;
      const maxLeft = Math.max(viewportPadding, safeRight - width);
      const belowTop = triggerRect.bottom + gap;
      const aboveTop = triggerRect.top - gap - height;
      const fitsBelow = belowTop + height <= viewportBottom;
      choice = {
        placement: fitsBelow ? "below" : "above",
        left: Math.min(Math.max(viewportPadding, triggerRect.left), maxLeft),
        top: fitsBelow ? belowTop : Math.max(viewportPadding, aboveTop),
      };
    }

    popover.style.left = `${Math.round(choice.left)}px`;
    popover.style.top = `${Math.round(choice.top)}px`;
    popover.dataset.placement = choice.placement;
    popover.classList.remove("is-positioning");
  }

  function showPopover(trigger, shouldPin = false) {
    clearCloseTimer();
    const id = trigger.dataset.annotation;
    const definition = definitions.get(id);
    if (definition === undefined) {
      return;
    }

    if (activeTrigger !== null && activeTrigger !== trigger) {
      activeTrigger.setAttribute("aria-expanded", "false");
      activeTrigger.removeAttribute("aria-describedby");
    }

    activeTrigger = trigger;
    pinned = shouldPin;
    popover.replaceChildren(...Array.from(definition.children).map((child) => child.cloneNode(true)));
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", popover.id);
    placePopover();
  }

  function togglePinned(trigger) {
    if (activeTrigger === trigger && pinned) {
      closePopover({restoreFocus: true});
      return;
    }
    showPopover(trigger, true);
  }

  function initializeTrigger(trigger) {
    const definition = definitions.get(trigger.dataset.annotation);
    const title = definition?.querySelector(".annotation-definition__title")?.textContent.trim();
    trigger.classList.add("annotation-trigger");
    trigger.setAttribute("tabindex", "0");
    trigger.setAttribute("role", "button");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", `${title || trigger.textContent.trim()}: show explanation`);

    trigger.addEventListener("mouseenter", () => {
      triggerHovered = true;
      if (!pinned || activeTrigger === trigger) {
        showPopover(trigger, pinned && activeTrigger === trigger);
      }
    });
    trigger.addEventListener("mouseleave", () => {
      triggerHovered = false;
      scheduleClose();
    });
    trigger.addEventListener("focus", () => showPopover(trigger, pinned && activeTrigger === trigger));
    trigger.addEventListener("blur", scheduleClose);
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePinned(trigger);
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        togglePinned(trigger);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePopover({restoreFocus: true});
      }
    });
  }

  function initialize() {
    document.querySelectorAll("[data-annotation-definition]").forEach((definition) => {
      definitions.set(definition.dataset.annotationDefinition, definition);
    });

    renderAnnotatedMath();

    popover = document.createElement("aside");
    popover.id = "annotation-popover";
    popover.className = "annotation-popover";
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    document.body.appendChild(popover);

    visibleTriggers().forEach(initializeTrigger);

    popover.addEventListener("mouseenter", () => {
      popoverHovered = true;
      clearCloseTimer();
    });
    popover.addEventListener("mouseleave", () => {
      popoverHovered = false;
      scheduleClose();
    });
    document.addEventListener("click", (event) => {
      if (activeTrigger !== null && !activeTrigger.contains(event.target) && !popover.contains(event.target)) {
        closePopover();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeTrigger !== null) {
        event.preventDefault();
        closePopover({restoreFocus: true});
      }
    });
    window.addEventListener("resize", placePopover);
    window.addEventListener("scroll", placePopover, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
