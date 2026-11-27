/* 4 Patas — navegação, agendamento e galeria pública de avaliações. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const number = "5555999488594";
  const config = window.PETSHOP_CONFIG || {};
  const apiUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const apiKey = String(config.supabaseAnonKey || "");
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(apiUrl) && apiKey.length > 15;

  const menuButton = $("menuToggle");
  const menu = $("siteNav");
  if (menuButton && menu) {
    const closeMenu = () => {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    };
    menuButton.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", event => {
      if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  const booking = $("bookingDialog");
  const bookingForm = $("bookingForm");
  function openBooking(event) {
    if (!booking || typeof booking.showModal !== "function") return;
    if (event) event.preventDefault();
    if (!booking.open) booking.showModal();
    $("petName")?.focus();
  }
  document.querySelectorAll("[data-booking]").forEach(link => link.addEventListener("click", openBooking));
  $("wa")?.addEventListener("click", openBooking);
  $("bookingClose")?.addEventListener("click", () => booking?.close());
  bookingForm?.addEventListener("submit", event => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;
    const service = $("bookingService").value;
    const pet = $("petName").value.trim().slice(0, 60);
    const message = "Olá! Gostaria de consultar horários para " + service + "." +
      (pet ? " Meu pet se chama " + pet + "." : "") +
      " Podem me informar os valores e a disponibilidade?";
    const destination = "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
    booking.close();
    window.location.assign(destination);
  });

  const grid = $("feedbackGrid");
  const photoDialog = $("photoDialog");
  function empty(message) {
    if (!grid) return;
    const element = document.createElement("p");
    element.className = "empty-feedback";
    element.textContent = message;
    grid.replaceChildren(element);
  }
  function addImage(src, index) {
    if (!grid) return;
    const card = document.createElement("article");
    card.className = "feedback-item";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Avaliação autorizada de cliente " + (index + 1);
    img.loading = "lazy";
    img.decoding = "async";
    img.tabIndex = 0;
    const show = () => {
      if (!photoDialog || typeof photoDialog.showModal !== "function") return;
      $("largeFeedback").src = src;
      photoDialog.showModal();
    };
    img.addEventListener("click", show);
    img.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        show();
      }
    });
    card.appendChild(img);
    grid.appendChild(card);
  }
  async function loadReviews() {
    if (!grid) return;
    if (!configured) {
      // Alternativa sem banco de dados: avaliações aprovadas e versionadas no GitHub.
      try {
        const response = await fetch("assets/feedbacks.json", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Lista de avaliações indisponível");
        const data = await response.json();
        const photos = Array.isArray(data.items) ? data.items.slice(0, 30) : [];
        grid.replaceChildren();
        photos.forEach((src, index) => {
          if (typeof src !== "string") return;
          // Só arquivos de imagem no diretório de avaliações; jamais URLs externas.
          if (!/^assets\/feedbacks\/[a-z0-9][a-z0-9_-]{0,79}\.(?:webp|png|jpe?g)$/i.test(src)) return;
          addImage(src, index);
        });
        if (!grid.children.length) empty("Em breve, novos feedbacks por aqui!");
      } catch (_) {
        empty("Não foi possível carregar os feedbacks agora.");
      }
      return;
    }
    try {
      const response = await fetch(apiUrl + "/rest/v1/petshop_feedback?select=image_path,created_at&order=created_at.desc&limit=30", {
        headers: { apikey: apiKey, Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Falha ao consultar avaliações");
      const items = await response.json();
      if (!Array.isArray(items) || !items.length) {
        empty("Em breve, novos feedbacks por aqui!");
        return;
      }
      grid.replaceChildren();
      items.forEach((entry, i) => {
        const path = String(entry.image_path || "");
        if (!/^feedbacks\/[a-f0-9-]{36}\.webp$/i.test(path)) return;
        addImage(apiUrl + "/storage/v1/object/public/petshop-feedback/" + path, i);
      });
      if (!grid.children.length) empty("Em breve, novos feedbacks por aqui!");
    } catch (error) {
      empty("Não foi possível carregar os feedbacks agora.");
    }
  }
  loadReviews();
})();
