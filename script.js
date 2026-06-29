const menuToggle = document.querySelector(".menu-toggle");
const primaryMenu = document.querySelector("#primary-menu");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const toast = document.querySelector(".toast");
let toastTimer;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const aetherBackgroundCanvas = document.querySelector(".aether-bg-canvas");
const typewriterText = document.querySelector(".typewriter-text");
const typewriterPhrases = [
  "Aspiring Software Developer",
  "UI/UX Enthusiast",
  "Versatile CS Student"
];

function setupAetherBackground(canvas) {
  if (!canvas || prefersReducedMotion.matches) return;

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power"
  });

  if (!gl) return;

  const vertexSource = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const fragmentSource = `#version 300 es
precision highp float;
out vec4 color;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define MN min(R.x,R.y)

float pattern(vec2 uv) {
  float d = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    uv.x += sin(T * (0.22 + i * 0.08) + uv.y * 1.45) * 0.18;
    d += 0.0068 / max(abs(uv.x), 0.026);
  }
  return d;
}

vec3 scene(vec2 uv) {
  vec3 col = vec3(0.0);
  uv = vec2(atan(uv.x, uv.y) * 0.31831, -log(max(length(uv), 0.08)) + T * 0.18);

  for (float i = 0.0; i < 3.0; i++) {
    float line = pattern(uv + i * 7.0 / MN);
    if (i < 1.0) {
      col += vec3(0.08, 0.25, 0.95) * line * 1.18;
    } else if (i < 2.0) {
      col += vec3(0.0, 0.62, 0.72) * line * 0.96;
    } else {
      col += vec3(0.55, 0.78, 1.0) * line * 0.72;
    }
  }

  return col;
}

void main() {
  vec2 uv = (FC - 0.5 * R) / MN;
  vec2 drift = uv;
  drift.y += R.x > R.y ? 0.5 : 0.5 * (R.y / R.x);

  float grid = 0.00055 / max(abs(sin(uv.x * 11.0) * cos(uv.y * 11.0)), 0.06);
  vec3 col = scene(drift) + vec3(0.04, 0.16, 0.55) * grid;
  col *= smoothstep(1.08, 0.14, length(uv));
  col = pow(col, vec3(0.9));

  color = vec4(col, 0.9);
}`;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Unable to create Aether background shader.");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Unable to compile Aether background shader.");
    }

    return shader;
  }

  let program;

  try {
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) {
      throw new Error("Unable to create Aether background shader program.");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message || "Unable to link Aether background shader.");
    }
  } catch (error) {
    console.warn("Aether background shader unavailable:", error);
    return;
  }

  const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.useProgram(program);
  const positionLocation = gl.getAttribLocation(program, "position");
  const timeLocation = gl.getUniformLocation(program, "time");
  const resolutionLocation = gl.getUniformLocation(program, "resolution");
  if (positionLocation < 0 || timeLocation === null || resolutionLocation === null) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return;
  }

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  const maxDpr = 1.5;
  let animationFrame = null;
  let isVisible = true;
  let lastFrameTime = 0;
  let resizeObserver = null;
  let visibilityObserver = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function drawFrame(now) {
    animationFrame = null;

    if (!isVisible || document.hidden) return;

    if (now - lastFrameTime >= 24) {
      lastFrameTime = now;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.uniform1f(timeLocation, now * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function stopAnimation() {
    if (!animationFrame) return;

    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function startAnimation() {
    if (animationFrame || !isVisible || document.hidden) return;

    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopAnimation();
      return;
    }

    startAnimation();
  }

  resizeCanvas();

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resizeCanvas, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0.02 }
    );
    visibilityObserver.observe(document.body);
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  startAnimation();

  window.addEventListener("pagehide", () => {
    stopAnimation();
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", resizeCanvas);
    }

    if (visibilityObserver) {
      visibilityObserver.disconnect();
    }

    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  });
}

setupAetherBackground(aetherBackgroundCanvas);

if (typewriterText) {
  if (prefersReducedMotion.matches) {
    typewriterText.textContent = typewriterPhrases[0];
  } else {
    let phraseIndex = 0;
    let characterIndex = 0;
    let isDeleting = false;

    function runTypewriter() {
      const phrase = typewriterPhrases[phraseIndex];

      if (isDeleting) {
        characterIndex -= 1;
        typewriterText.textContent = phrase.slice(0, characterIndex);

        if (characterIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % typewriterPhrases.length;
          window.setTimeout(runTypewriter, 280);
          return;
        }

        window.setTimeout(runTypewriter, 34);
        return;
      }

      characterIndex += 1;
      typewriterText.textContent = phrase.slice(0, characterIndex);

      if (characterIndex === phrase.length) {
        isDeleting = true;
        window.setTimeout(runTypewriter, 1400);
        return;
      }

      window.setTimeout(runTypewriter, 66);
    }

    typewriterText.textContent = "";
    window.setTimeout(runTypewriter, 360);
  }
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function closeMenu() {
  if (!menuToggle || !primaryMenu) return;

  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
  primaryMenu.classList.remove("open");
  document.body.classList.remove("menu-open");
}

if (menuToggle && primaryMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = primaryMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", isOpen);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

const revealItems = document.querySelectorAll(".reveal, .info-card, .skill-card, .project-card, .certificate-card");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

function updateActiveNav() {
  const currentPosition = window.scrollY + 120;
  let currentSection = sections[0];

  sections.forEach((section) => {
    if (section.offsetTop <= currentPosition) {
      currentSection = section;
    }
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${currentSection.id}`);
  });
}

window.addEventListener("scroll", updateActiveNav, { passive: true });
window.addEventListener("load", updateActiveNav);
updateActiveNav();

function setupSlideshow(slideshow) {
  const slides = Array.from(slideshow.querySelectorAll(".slide"));
  if (slides.length < 2) return;

  let index = 0;
  window.setInterval(() => {
    slides[index].classList.remove("active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("active");
  }, 3800);
}

document.querySelectorAll(".project-slideshow").forEach(setupSlideshow);

const heroPortrait = document.querySelector(".hero-portrait");

if (heroPortrait && !prefersReducedMotion.matches) {
  heroPortrait.addEventListener("pointermove", (event) => {
    const rect = heroPortrait.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    heroPortrait.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
    heroPortrait.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
  });

  heroPortrait.addEventListener("pointerleave", () => {
    heroPortrait.style.setProperty("--tilt-x", "0deg");
    heroPortrait.style.setProperty("--tilt-y", "0deg");
  });
}

const modalTriggers = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
let activeModal = null;

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  activeModal = modal;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-open");

  const closeButton = modal.querySelector("[data-close-modal]");
  if (closeButton) {
    closeButton.focus();
  }
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  activeModal = document.querySelector(".modal.active");

  if (!activeModal) {
    document.body.classList.remove("menu-open");
  }
}

function closeActiveModal() {
  closeModal(activeModal || document.querySelector(".modal.active"));
}

modalTriggers.forEach((trigger) => {
  if (!["BUTTON", "A"].includes(trigger.tagName)) {
    trigger.setAttribute("role", "button");
    trigger.tabIndex = 0;
  }

  trigger.addEventListener("click", () => {
    openModal(trigger.dataset.openModal);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal(trigger.dataset.openModal);
    }
  });
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(button.closest(".modal"));
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (lightbox?.classList.contains("active")) return;

    closeMenu();
    closeActiveModal();
  }
});

document.querySelectorAll("[data-placeholder-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openModal("hosting-expired-modal");
  });
});

const contactForm = document.querySelector("#contact-form");

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const honey = String(formData.get("_honey") || "").trim();
    const status = contactForm.querySelector(".form-status");
    const submitButton = contactForm.querySelector("button[type='submit']");

    if (honey) {
      contactForm.reset();
      return;
    }

    if (!name || !email || !message) {
      if (status) {
        status.textContent = "Please complete all fields before sending.";
        status.className = "form-status form-status-error";
      }
      return;
    }

    if (status) {
      status.textContent = "Sending your message...";
      status.className = "form-status form-status-success";
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    formData.set("_subject", `Portfolio contact from ${name}`);
    formData.set("_replyto", email);

    try {
      const response = await fetch("https://formsubmit.co/ajax/ymbolarchyl@gmail.com", {
        method: "POST",
        headers: {
          "Accept": "application/json"
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      if (status) {
        status.textContent = "Message sent successfully. Thank you!";
        status.className = "form-status form-status-success";
      }

      contactForm.reset();
    } catch (error) {
      console.error("Contact form error:", error);
      if (status) {
        status.textContent = "Message could not be sent. Please email ymbolarchyl@gmail.com directly.";
        status.className = "form-status form-status-error";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

// Lightbox functionality for gallery images
const lightbox = document.getElementById("image-lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");
let activeGalleryImages = [];
let activeGalleryIndex = 0;

if (lightbox) {
  function showLightboxImage(index) {
    if (!lightboxImage || activeGalleryImages.length === 0) return;

    activeGalleryIndex = (index + activeGalleryImages.length) % activeGalleryImages.length;
    const image = activeGalleryImages[activeGalleryIndex];
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
  }

  function moveLightbox(direction) {
    showLightboxImage(activeGalleryIndex + direction);
  }

  // Use event delegation for gallery images
  document.addEventListener("click", (event) => {
    const img = event.target.closest(".modal-gallery img");
    if (!img || !lightboxImage) return;

    activeGalleryImages = Array.from(img.closest(".modal-gallery").querySelectorAll("img"));
    activeGalleryIndex = activeGalleryImages.indexOf(img);
    showLightboxImage(activeGalleryIndex);
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
  });

  // Close lightbox
  function closeLightbox() {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".modal.active")) {
      document.body.classList.remove("menu-open");
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => moveLightbox(1));
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  // Close with ESC key
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) return;

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });
}

const modal = document.getElementById("resumeModal");
const openBtn = document.getElementById("openResume");
const closeBtn = document.getElementById("closeResume");

openBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});
