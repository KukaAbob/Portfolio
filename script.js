// Focus Management System for WCAG 2.1 Compliance
class FocusManager {
  constructor() {
    this.focusableElements = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'].
    join(",");

    this.modalStack = [];
    this.lastFocusedElement = null;
    this.init();
  }

  init() {
    this.setupKeyboardNavigation();
    this.setupModalFocusManagement();
    this.handleRouteChanges();
  }

  // Get all focusable elements within a container
  getFocusableElements(container = document) {
    return Array.from(
      container.querySelectorAll(this.focusableElements)
    ).filter((el) => this.isVisible(el) && !el.hasAttribute("disabled"));
  }

  // Check if element is visible
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0);

  }

  // Setup keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      // Handle Escape key for modals
      if (e.key === "Escape") {
        this.closeTopModal();
      }

      // Handle Tab key for focus management
      if (e.key === "Tab") {
        this.handleTabNavigation(e);
      }

      // Handle Enter and Space for custom interactive elements
      if (e.key === "Enter" || e.key === " ") {
        this.handleActivation(e);
      }
    });
  }

  // Handle Tab navigation within modals
  handleTabNavigation(e) {
    const activeModal = this.getActiveModal();
    if (activeModal) {
      this.trapFocusInModal(e, activeModal);
    }
  }

  // Trap focus within modal
  trapFocusInModal(e, modal) {
    const focusableElements = this.getFocusableElements(modal);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  // Handle Enter/Space activation
  handleActivation(e) {
    const target = e.target;

    // Handle custom buttons with role="button"
    if (target.getAttribute("role") === "button" && !target.matches("button")) {
      e.preventDefault();
      target.click();
    }
  }

  // Setup modal focus management
  setupModalFocusManagement() {
    // Modal triggers
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-modal-trigger]");
      if (trigger) {
        e.preventDefault();
        const modalId = trigger.getAttribute("data-modal-trigger");
        this.openModal(modalId, trigger);
      }

      // Modal close buttons
      const closeBtn = e.target.closest(".modal-close");
      if (closeBtn) {
        e.preventDefault();
        this.closeTopModal();
      }

      // Click outside modal to close
      if (e.target.classList.contains("modal-overlay")) {
        this.closeTopModal();
      }
    });
  }

  // Open modal with focus management
  openModal(modalId, triggerElement) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Store the triggering element
    this.lastFocusedElement = triggerElement;

    // Add to modal stack
    this.modalStack.push({
      modal: modal,
      triggerElement: triggerElement
    });

    // Show modal
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    // Prevent background scrolling
    document.body.style.overflow = "hidden";

    // Focus first focusable element in modal
    setTimeout(() => {
      const focusableElements = this.getFocusableElements(modal);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 100);

    // Announce modal opening to screen readers
    this.announceToScreenReader("Modal opened");
  }

  // Close top modal
  closeTopModal() {
    if (this.modalStack.length === 0) return;

    const modalInfo = this.modalStack.pop();
    const modal = modalInfo.modal;
    const triggerElement = modalInfo.triggerElement;

    // Hide modal
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    // Restore background scrolling if no modals left
    if (this.modalStack.length === 0) {
      document.body.style.overflow = "";
    }

    // Return focus to triggering element
    if (triggerElement && this.isVisible(triggerElement)) {
      triggerElement.focus();
    }

    // Announce modal closing to screen readers
    this.announceToScreenReader("Modal closed");
  }

  // Get currently active modal
  getActiveModal() {
    return this.modalStack.length > 0 ?
    this.modalStack[this.modalStack.length - 1].modal :
    null;
  }

  // Handle route changes (for SPA)
  handleRouteChanges() {
    // Listen for hash changes (simple SPA routing)
    window.addEventListener("hashchange", () => {
      this.handleRouteChange();
    });

    // Listen for navigation clicks
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        setTimeout(() => this.handleRouteChange(), 100);
      }
    });
  }

  // Handle route change focus management
  handleRouteChange() {
    const hash = window.location.hash;
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        // Ensure target is focusable
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }

        // Focus the target section
        setTimeout(() => {
          target.focus();
          this.announceToScreenReader(
            `Navigated to ${target.textContent || target.id}`
          );
        }, 300);
      }
    }
  }

  // Announce to screen readers
  announceToScreenReader(message) {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.style.cssText = `
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        `;

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Handle dynamic content updates
  handleDynamicContentUpdate(container) {
    // Announce content update
    this.announceToScreenReader("Content updated");

    // Focus management for new content
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      // Focus first new focusable element
      focusableElements[0].focus();
    }
  }

  // Preserve focus during AJAX updates
  preserveFocusDuringUpdate(updateFunction) {
    const activeElement = document.activeElement;
    const activeElementId = activeElement.id;
    const activeElementSelector = this.getElementSelector(activeElement);

    return updateFunction().then(() => {
      // Try to restore focus
      let elementToFocus = null;

      if (activeElementId) {
        elementToFocus = document.getElementById(activeElementId);
      }

      if (!elementToFocus && activeElementSelector) {
        elementToFocus = document.querySelector(activeElementSelector);
      }

      if (elementToFocus && this.isVisible(elementToFocus)) {
        elementToFocus.focus();
      }
    });
  }

  // Get CSS selector for element
  getElementSelector(element) {
    if (!element || element === document.body) return null;

    let selector = element.tagName.toLowerCase();

    if (element.id) {
      selector += `#${element.id}`;
    }

    if (element.className) {
      selector += `.${element.className.split(" ").join(".")}`;
    }

    return selector;
  }
}

// Portfolio-specific functionality
class Portfolio {
  constructor() {
    this.focusManager = new FocusManager();
    this.init();
  }

  init() {
    this.optimizeForMobile();
    this.optimizeContentForMobile();
    this.setupThemeToggle();
    this.setupTypingAnimation();
    this.setupScrollAnimations();
    this.setupNavigation();
    this.setupCounters();
    this.setupSkillBars();
    this.setupContactForm();
    this.setupSmoothScrolling();
    this.setupProgressIndicator();
    this.setupMobilePopups();
  }

  // Typing animation for hero section
  setupTypingAnimation() {
    const typedTextElement = document.getElementById("typed-text");

    if (!typedTextElement) {
      console.warn("Typed text element not found");
      return;
    }

    const texts = [
    "Fullstack Developer",
    "Problem Solver",
    "Code Enthusiast",
    "Tech Innovator"];


    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 2000;

    function type() {
      const currentText = texts[textIndex];

      if (isDeleting) {
        typedTextElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typedTextElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
      }

      let speed = isDeleting ? deleteSpeed : typeSpeed;

      if (!isDeleting && charIndex === currentText.length) {
        speed = pauseTime;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
      }

      setTimeout(type, speed);
    }

    // Start typing animation after page load
    setTimeout(type, 1000);

    // Add scroll indicator functionality
    const scrollIndicator = document.querySelector(".scroll-indicator");
    if (scrollIndicator) {
      scrollIndicator.addEventListener("click", () => {
        const aboutSection = document.getElementById("about");
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  // Setup scroll animations
  setupScrollAnimations() {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -30px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Use requestAnimationFrame for smoother animations
          requestAnimationFrame(() => {
            setTimeout(() => {
              entry.target.classList.add("animate");

              // Trigger specific animations
              if (entry.target.classList.contains("timeline-item")) {
                this.animateTimelineItem(entry.target);
              }

              if (entry.target.classList.contains("skill-category")) {
                this.animateSkillBars(entry.target);
              }

              if (entry.target.classList.contains("project-card")) {
                this.animateProjectCard(entry.target);
              }

              if (entry.target.classList.contains("highlight-item")) {
                this.animateHighlightItem(entry.target);
              }

              if (entry.target.classList.contains("stat-item")) {
                this.animateStatItem(entry.target);
              }
            }, index * 50); // Reduced delay for smoother animation
          });
        }
      });
    }, observerOptions);

    // Observe elements
    const elementsToAnimate = document.querySelectorAll(
      ".timeline-item, .skill-category, .project-card, .contact-info, .contact-form, .highlight-item, .stat-item"
    );

    elementsToAnimate.forEach((el) => observer.observe(el));
  }

  // Animate timeline items
  animateTimelineItem(item) {
    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      item.classList.add("animate");
    });
  }

  // Animate skill bars
  animateSkillBars(category) {
    const skillBars = category.querySelectorAll(".skill-progress");
    skillBars.forEach((bar, index) => {
      setTimeout(() => {
        const width = bar.getAttribute("data-width");
        if (width) {
          bar.style.width = width;
        }
      }, index * 200);
    });
  }

  // Animate project cards
  animateProjectCard(card) {
    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      card.classList.add("animate");
    });
  }

  // Animate highlight items
  animateHighlightItem(item) {
    setTimeout(() => {
      item.style.animation = "slideInFromLeft 0.6s ease forwards";
    }, 100);
  }

  // Animate stat items
  animateStatItem(item) {
    setTimeout(() => {
      item.style.animation = "slideInFromRight 0.6s ease forwards";
    }, 100);
  }

  // Setup animated counters
  setupCounters() {
    const counters = document.querySelectorAll(".stat-number");

    if (counters.length === 0) {
      console.warn("No counters found");
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  }

  // Animate counter
  animateCounter(counter) {
    const target = parseInt(counter.getAttribute("data-target"));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += step;
      if (current < target) {
        counter.textContent = Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target;
      }
    };

    updateCounter();
  }

  // Setup skill bars animation
  setupSkillBars() {
    const skillCategories = document.querySelectorAll(".skill-category");

    if (skillCategories.length === 0) {
      console.warn("No skill categories found");
      return;
    }

    // Initialize all skill bars to 0 width
    skillCategories.forEach((category) => {
      const skillBars = category.querySelectorAll(".skill-progress");
      skillBars.forEach((bar) => {
        bar.style.width = "0%";
      });
    });

    const skillObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateSkillBars(entry.target);
            skillObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    skillCategories.forEach((category) => skillObserver.observe(category));
  }

  // Setup contact form
  setupContactForm() {
    const form = document.querySelector(".contact-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFormSubmission(form);
    });

    // Form validation
    const inputs = form.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      input.addEventListener("blur", () => this.validateField(input));
      input.addEventListener("input", () => this.clearFieldError(input));
    });
  }

  // Handle form submission
  handleFormSubmission(form) {
    const formData = new FormData(form);
    // Form data will be processed here in future implementation

    // Validate all fields
    let isValid = true;
    const inputs = form.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    if (!isValid) {
      this.focusManager.announceToScreenReader(
        "Please correct the errors in the form"
      );
      return;
    }

    // Simulate form submission
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) {
      console.warn("Submit button not found");
      return;
    }

    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = "Message Sent!";
      submitBtn.style.background = "#28a745";

      this.focusManager.announceToScreenReader("Message sent successfully");

      setTimeout(() => {
        form.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.background = "";
      }, 3000);
    }, 2000);
  }

  // Validate form field
  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = "";

    // Remove existing error
    this.clearFieldError(field);

    // Required field validation
    if (field.hasAttribute("required") && !value) {
      errorMessage = "This field is required";
      isValid = false;
    }

    // Email validation
    if (field.type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMessage = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Show error if invalid
    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  // Show field error
  showFieldError(field, message) {
    field.classList.add("error");
    field.setAttribute("aria-invalid", "true");

    const errorElement = document.createElement("div");
    errorElement.className = "field-error";
    errorElement.textContent = message;
    errorElement.setAttribute("role", "alert");

    field.parentNode.appendChild(errorElement);
  }

  // Clear field error
  clearFieldError(field) {
    field.classList.remove("error");
    field.removeAttribute("aria-invalid");

    const errorElement = field.parentNode.querySelector(".field-error");
    if (errorElement) {
      errorElement.remove();
    }
  }

  // Setup smooth scrolling with performance optimization
  setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    let isScrolling = false;

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isScrolling) return; // Prevent multiple scrolls

        const targetId = link.getAttribute("href").substring(1);
        const target = document.getElementById(targetId);

        if (target) {
          isScrolling = true;

          // Calculate target position with small offset
          const targetPosition = target.offsetTop - 20;
          
          // Use requestAnimationFrame for smoother scrolling
          const startPosition = window.pageYOffset;
          const distance = targetPosition - startPosition;
          const duration = 800;
          let start = null;

          function smoothScroll(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = Math.min(progress / duration, 1);
            
            // Easing function for smooth animation
            const easeInOutCubic = percentage < 0.5 
              ? 4 * percentage * percentage * percentage 
              : (percentage - 1) * (2 * percentage - 2) * (2 * percentage - 2) + 1;
            
            window.scrollTo(0, startPosition + distance * easeInOutCubic);
            
            if (progress < duration) {
              requestAnimationFrame(smoothScroll);
            } else {
              // Update URL hash after scroll completes
              history.replaceState(null, null, `#${targetId}`);
              isScrolling = false;
            }
          }

          requestAnimationFrame(smoothScroll);
        }
      });
    });

    // Add keyboard navigation for desktop only
    if (window.innerWidth > 768) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "PageDown") {
          e.preventDefault();
          this.navigateToNextSection();
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          this.navigateToPreviousSection();
        }
      });
    }

    // Add touch navigation for mobile
    this.setupTouchNavigation();
  }

  // Navigate to next section
  navigateToNextSection() {
    const sections = document.querySelectorAll("section[id]");
    const currentSection = this.getCurrentSection();
    const currentIndex = Array.from(sections).findIndex(
      (section) => section.id === currentSection
    );

    if (currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1];
      const targetPosition = nextSection.offsetTop;
      
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
      
      // Update progress indicator
      setTimeout(() => this.updateProgressIndicator(), 100);
    }
  }

  // Navigate to previous section
  navigateToPreviousSection() {
    const sections = document.querySelectorAll("section[id]");
    const currentSection = this.getCurrentSection();
    const currentIndex = Array.from(sections).findIndex(
      (section) => section.id === currentSection
    );

    if (currentIndex > 0) {
      const prevSection = sections[currentIndex - 1];
      const targetPosition = prevSection.offsetTop;
      
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
      
      // Update progress indicator
      setTimeout(() => this.updateProgressIndicator(), 100);
    }
  }

  // Get current section
  getCurrentSection() {
    const sections = document.querySelectorAll("section[id]");
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;

    let currentSection = "home";
    let minDistance = Infinity;

    for (let section of sections) {
      const sectionTop = section.offsetTop;
      const sectionCenter = sectionTop + section.offsetHeight / 2;
      const viewportCenter = scrollPosition + windowHeight / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        currentSection = section.id;
      }
    }

    return currentSection;
  }

  // Setup progress indicator
  setupProgressIndicator() {
    const progressDots = document.querySelectorAll(".progress-dot");

    if (progressDots.length === 0) {
      console.warn("No progress dots found");
      return;
    }

    // Add click handlers for progress dots
    progressDots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = dot.getAttribute("data-target");
        const target = document.getElementById(targetId);
        if (target) {
          // Calculate target position and scroll
          const targetPosition = target.offsetTop;
          
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth"
          });

          // Update active state immediately
          progressDots.forEach((d) => d.classList.remove("active"));
          dot.classList.add("active");

          // Update URL hash
          setTimeout(() => {
            history.replaceState(null, null, `#${targetId}`);
          }, 100);
        }
      });

      // Add keyboard support
      dot.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dot.click();
        }
      });
    });

    // Update progress indicator on scroll with throttling
    let scrollTimeout;
    window.addEventListener("scroll", () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        this.updateProgressIndicator();
      }, 50);
    });

    // Update on resize
    window.addEventListener("resize", () => {
      setTimeout(() => this.updateProgressIndicator(), 100);
    });

    // Initial update
    setTimeout(() => this.updateProgressIndicator(), 500);

    // Use Intersection Observer for better section tracking
    this.setupIntersectionObserver();
  }

  // Setup Intersection Observer for section tracking
  setupIntersectionObserver() {
    const sections = document.querySelectorAll("section[id]");

    if (sections.length === 0) {
      console.warn("No sections found for intersection observer");
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -20% 0px",
      threshold: [0.1, 0.5, 0.9]
    };

    const observer = new IntersectionObserver((entries) => {
      let mostVisibleSection = null;
      let maxRatio = 0;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisibleSection = entry.target.id;
        }
      });

      if (mostVisibleSection) {
        this.setActiveSection(mostVisibleSection);
      }
    }, observerOptions);

    sections.forEach((section) => {
      observer.observe(section);
    });
  }

  // Set active section in progress indicator
  setActiveSection(sectionId) {
    const progressDots = document.querySelectorAll(".progress-dot");

    progressDots.forEach((dot) => {
      const targetId = dot.getAttribute("data-target");
      if (targetId === sectionId) {
        dot.classList.add("active");
        dot.setAttribute("aria-current", "true");
      } else {
        dot.classList.remove("active");
        dot.removeAttribute("aria-current");
      }
    });
  }

  // Update progress indicator
  updateProgressIndicator() {
    const currentSection = this.getCurrentSection();
    const progressDots = document.querySelectorAll(".progress-dot");

    if (progressDots.length === 0) {
      return;
    }

    progressDots.forEach((dot) => {
      const targetId = dot.getAttribute("data-target");
      if (targetId === currentSection) {
        dot.classList.add("active");
        dot.setAttribute("aria-current", "true");
      } else {
        dot.classList.remove("active");
        dot.removeAttribute("aria-current");
      }
    });

    // Debug log for testing
    console.log(
      `Current section: ${currentSection}, scroll: ${window.scrollY}`
    );

    // Update URL hash if needed
    if (window.location.hash !== `#${currentSection}`) {
      history.replaceState(null, null, `#${currentSection}`);
    }
  }

  // Setup navigation
  setupNavigation() {
    // Handle hash changes
    window.addEventListener("hashchange", () => {
      this.handleHashChange();
    });

    // Handle initial hash on page load
    if (window.location.hash) {
      setTimeout(() => this.handleHashChange(), 100);
    }
  }

  // Handle hash change navigation
  handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        // Calculate target position
        const targetPosition = target.offsetTop;
        
        // Smooth scroll to target
        window.scrollTo({
          top: targetPosition,
          behavior: "smooth"
        });

        // Update progress indicator
        setTimeout(() => this.updateProgressIndicator(), 300);
      }
    }
  }

  // Setup touch navigation for mobile
  setupTouchNavigation() {


    // Simple touch navigation without automatic scrolling
    // Users can use progress dots for navigation
  } // Check if device is mobile
  isMobile() {return window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  }

  // Mobile optimization - updated for improved projects section
  setupMobilePopups() {
    if (!this.isMobile()) return;

    // Setup project popups only for very small screens (400px and below)
    if (window.innerWidth <= 400) {
      this.setupProjectPopups();
    }

    // Skills are now displayed directly on cards, no popups needed
  }

  // Setup project popups for very small screens only
  setupProjectPopups() {
    const projectCards = document.querySelectorAll(".project-card");

    projectCards.forEach((card, index) => {
      card.addEventListener("click", () => {
        this.showProjectPopup(index);
      });
    });
  }

  // Show project popup
  showProjectPopup(index) {
    const projects = [
    {
      title: "AI-Powered Web Service",
      description:
      "Developed a comprehensive web service integrating OpenAI API for intelligent content generation and analysis with real-time processing capabilities.",
      technologies: ["React", "Python", "OpenAI API", "PostgreSQL", "Docker"],
      links: {
        live: "https://ai-service-demo.com",
        github: "https://github.com/KukaAbob/ai-web-service"
      }
    },
    {
      title: "Smart Attendance System",
      description:
      "Built a comprehensive attendance management system with real-time tracking, analytics, automated reporting, and mobile integration.",
      technologies: ["C#", ".NET Core", "React", "SQL Server", "Azure"],
      links: {
        live: "https://attendance-demo.com",
        github: "https://github.com/KukaAbob/attendance-system"
      }
    },
    {
      title: "Analytics Dashboard",
      description:
      "Created a real-time analytics dashboard with interactive charts, data visualization, and business intelligence features for enterprise use.",
      technologies: ["React", "TypeScript", "Golang", "MongoDB", "Redis"],
      links: {
        live: "https://analytics-dashboard.com",
        github: "https://github.com/KukaAbob/analytics-dashboard"
      }
    },
    {
      title: "E-Commerce Platform",
      description:
      "Full-stack e-commerce solution with payment integration, inventory management, admin dashboard, and mobile-responsive design.",
      technologies: ["React", "Python", "Django", "PostgreSQL", "Stripe"],
      links: {
        live: "https://ecommerce-demo.com",
        github: "https://github.com/KukaAbob/ecommerce-platform"
      }
    }];


    const project = projects[index];
    if (!project) return;

    this.createPopup(
      "project",
      project.title,
      this.generateProjectPopupContent(project)
    );
  }

  // Generate project popup content
  generateProjectPopupContent(project) {
    return `
            <p><strong>Description:</strong> ${project.description}</p>
            <h4>Technologies Used:</h4>
            <div class="project-tech">
                ${project.technologies.map((tech) => `<span>${tech}</span>`).join("")}
            </div>
            <div class="project-links">
                <a href="${project.links.live}" target="_blank" class="project-link">
                    <i class="fas fa-external-link-alt"></i> Live Demo
                </a>
                <a href="${project.links.github}" target="_blank" class="project-link">
                    <i class="fab fa-github"></i> GitHub
                </a>
            </div>
        `;
  }

  // Create popup
  createPopup(type, title, content) {
    // Remove existing popup if any
    const existingPopup = document.querySelector(".mobile-popup");
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup container
    const popup = document.createElement("div");
    popup.className = "mobile-popup";
    popup.innerHTML = `
            <div class="mobile-popup-overlay"></div>
            <div class="mobile-popup-content">
                <div class="mobile-popup-header">
                    <h3>${title}</h3>
                    <button class="mobile-popup-close" aria-label="Close popup">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-popup-body">
                    ${content}
                </div>
            </div>
        `;

    // Add to body
    document.body.appendChild(popup);

    // Add event listeners
    const overlay = popup.querySelector(".mobile-popup-overlay");
    const closeBtn = popup.querySelector(".mobile-popup-close");

    const closePopup = () => {
      popup.classList.add("closing");
      setTimeout(() => {
        popup.remove();
      }, 300);
    };

    overlay.addEventListener("click", closePopup);
    closeBtn.addEventListener("click", closePopup);

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Show popup with animation
    setTimeout(() => {
      popup.classList.add("active");
    }, 10);
  }

  // Optimize content for mobile viewport
  optimizeContentForMobile() {
    if (this.isMobile()) {
      // Reduce content in sections that are too long
      const aboutIntro = document.querySelector(".about-intro");
      if (aboutIntro && window.innerWidth <= 480) {
        const originalText = aboutIntro.textContent;
        if (originalText.length > 200) {
          aboutIntro.textContent = originalText.substring(0, 180) + "...";
        }
      }

      // Optimize timeline items for mobile
      const timelineDescriptions = document.querySelectorAll(
        ".timeline-description p"
      );
      timelineDescriptions.forEach((desc) => {
        if (window.innerWidth <= 480) {
          const text = desc.textContent;
          if (text.length > 100) {
            desc.textContent = text.substring(0, 90) + "...";
          }
        }
      });
    }
  }

  // Optimize animations for mobile
  optimizeForMobile() {
    if (this.isMobile()) {
      // Reduce animation complexity on mobile
      document.documentElement.style.setProperty(
        "--animation-duration",
        "0.3s"
      );

      // Disable some heavy animations
      const heavyAnimations = document.querySelectorAll(
        ".floating-icon, .profile-avatar"
      );
      heavyAnimations.forEach((el) => {
        el.style.animation = "none";
      });

      // Add mobile-specific classes
      document.body.classList.add("mobile-device");

      // Optimize viewport for mobile
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        );
      }
    }
  }

  // Setup theme toggle functionality
  setupThemeToggle() {
    const themeToggle = document.querySelector(".theme-toggle");
    if (!themeToggle) return;

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Theme toggle click handler
    themeToggle.addEventListener("click", () => {
      this.toggleTheme();
    });

    // Keyboard support
    themeToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  // Toggle between light and dark themes
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Add transition class for smooth theme change
    document.body.classList.add("theme-transitioning");

    // Change theme
    document.documentElement.setAttribute("data-theme", newTheme);

    // Save to localStorage
    localStorage.setItem("theme", newTheme);

    // Remove transition class after animation
    setTimeout(() => {
      document.body.classList.remove("theme-transitioning");
    }, 300);

    // Announce theme change to screen readers
    this.focusManager.announceToScreenReader(`Switched to ${newTheme} theme`);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing Portfolio...");
  const portfolio = new Portfolio();

  // Debug: Check if progress dots exist
  const progressDots = document.querySelectorAll(".progress-dot");
  console.log(`Found ${progressDots.length} progress dots`);

  // Debug: List all sections
  const sections = document.querySelectorAll("section[id]");
  console.log(
    "Sections found:",
    Array.from(sections).map((s) => s.id)
  );
});

// Handle page visibility changes for focus management
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Page became visible, ensure proper focus management
    const activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body) {
      // Focus the main content if no element is focused
      const mainContent =
      document.getElementById("main-content") ||
      document.querySelector("main");
      if (mainContent) {
        mainContent.focus();
      }
    }
  }
});

// Error handling for focus management
window.addEventListener("error", (e) => {
  if (e.error && e.error.message) {
    console.error("Focus management error:", e.error.message);
  }
  // Fallback focus management
  if (document.activeElement === document.body) {
    const firstFocusable = document.querySelector(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }
});