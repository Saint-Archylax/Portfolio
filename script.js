const menuToggle = document.querySelector(".menu-toggle");
const primaryMenu = document.querySelector("#primary-menu");
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const toast = document.querySelector(".toast");
let toastTimer;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
