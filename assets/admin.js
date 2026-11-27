/* Painel de avaliações: autenticação Supabase e políticas RLS no servidor.
   Credenciais nunca são armazenadas em localStorage ou no repositório. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const config = window.PETSHOP_CONFIG || {};
  const base = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const key = String(config.supabaseAnonKey || "");
  const ready = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base) && key.length > 15;
  let accessToken = "";
  const inform = (message, error = false) => {
    $("status").textContent = message;
    $("status").dataset.error = String(error);
  };
  const request = async (path, options = {}) => {
    const headers = { apikey: key, ...options.headers };
    if (options.private !== false && accessToken) headers.Authorization = "Bearer " + accessToken;
    const response = await fetch(base + path, { ...options, headers, cache: "no-store" });
    if (!response.ok) {
      let detail = "";
      try { const error = await response.json(); detail = error.msg || error.message || error.error_description || ""; } catch (_) {}
      throw new Error(response.status === 401 ? "Sessão expirada. Entre novamente." :
        response.status === 403 ? "Acesso não autorizado. Confira as permissões." :
        "Erro " + response.status + (detail ? ": " + detail : ""));
    }
    if (response.status === 204) return null;
    const body = await response.text();
    if (!body) return null;
    try { return JSON.parse(body); } catch (_) { return body; }
  };
  function logout() {
    accessToken = "";
    $("loginPanel").hidden = false;
    $("editorPanel").hidden = true;
    $("loginForm").reset();
  }
  if (!ready) {
    inform("O painel ainda não foi ativado. Configure o Supabase conforme o README do repositório.", true);
    $("loginForm").querySelectorAll("input,button").forEach(item => item.disabled = true);
    return;
  }
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    inform("Verificando acesso…");
    try {
      const session = await request("/auth/v1/token?grant_type=password", {
        private: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value })
      });
      if (!session.access_token || !session.user?.id) throw new Error("Login inválido.");
      accessToken = session.access_token;
      const admin = await request("/rest/v1/petshop_admins?select=user_id&user_id=eq." + encodeURIComponent(session.user.id));
      if (!Array.isArray(admin) || admin.length !== 1) {
        logout();
        throw new Error("Esta conta não tem permissão de administrador.");
      }
      $("loginForm").reset();
      $("loginPanel").hidden = true;
      $("editorPanel").hidden = false;
      inform("Acesso autorizado. Você pode publicar ou remover avaliações.");
      await loadItems();
    } catch (error) {
      accessToken = "";
      inform(error.message || "Falha no login.", true);
    }
  });
  $("logout").addEventListener("click", logout);
  async function loadItems() {
    const list = await request("/rest/v1/petshop_feedback?select=id,image_path,created_at&order=created_at.desc");
    const container = $("feedbackList");
    container.replaceChildren();
    if (!list.length) {
      const p = document.createElement("p");
      p.textContent = "Nenhuma avaliação publicada.";
      container.append(p);
      return;
    }
    for (const item of list) {
      if (!/^[a-f0-9-]{36}$/i.test(item.id) || !/^feedbacks\/[a-f0-9-]{36}\.webp$/i.test(item.image_path)) continue;
      const card = document.createElement("div");
      card.className = "feedback-admin-card";
      const img = document.createElement("img");
      img.src = base + "/storage/v1/object/public/petshop-feedback/" + item.image_path;
      img.loading = "lazy";
      img.alt = "Avaliação publicada";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Remover avaliação";
      button.addEventListener("click", () => removeItem(item));
      card.append(img, button);
      container.append(card);
    }
  }
  async function removeItem(item) {
    if (!window.confirm("Remover esta avaliação publicada?")) return;
    inform("Removendo…");
    try {
      await request("/rest/v1/petshop_feedback?id=eq." + encodeURIComponent(item.id), { method: "DELETE" });
      try {
        await request("/storage/v1/object/petshop-feedback/" + item.image_path, { method: "DELETE" });
        inform("Avaliação removida.");
      } catch (_) {
        inform("A avaliação saiu do site, mas a imagem precisa ser apagada manualmente no Storage.", true);
      }
      await loadItems();
    } catch (error) { inform(error.message, true); }
  }
  function resizeToWebp(file) {
    return new Promise(async (resolve, reject) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
        reject(new Error("Use JPG, PNG ou WebP com até 8 MB."));
        return;
      }
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > 24000000) throw new Error("Imagem grande demais.");
        const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob || blob.type !== "image/webp" || blob.size > 2.5 * 1024 * 1024)
            reject(new Error("Não foi possível preparar a imagem em WebP."));
          else resolve(blob);
        }, "image/webp", 0.8);
      } catch (error) { reject(error); }
      finally { if (bitmap) bitmap.close(); }
    });
  }
  $("uploadForm").addEventListener("submit", async event => {
    event.preventDefault();
    const files = Array.from($("feedbackUpload").files);
    if (!files.length) { inform("Selecione pelo menos uma imagem.", true); return; }
    if (files.length > 5) { inform("Envie no máximo 5 imagens por vez.", true); return; }
    $("uploadButton").disabled = true;
    let uploaded = 0;
    try {
      for (const file of files) {
        inform("Preparando imagem " + (uploaded + 1) + " de " + files.length + "…");
        const blob = await resizeToWebp(file);
        const path = "feedbacks/" + crypto.randomUUID() + ".webp";
        await request("/storage/v1/object/petshop-feedback/" + path, {
          method: "POST",
          headers: { "Content-Type": "image/webp", "x-upsert": "false" },
          body: blob
        });
        try {
          await request("/rest/v1/petshop_feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ image_path: path })
          });
        } catch (error) {
          try { await request("/storage/v1/object/petshop-feedback/" + path, { method: "DELETE" }); } catch (_) {}
          throw error;
        }
        uploaded++;
      }
      $("uploadForm").reset();
      inform(uploaded + " avaliação(ões) publicada(s) para todos os visitantes.");
      await loadItems();
    } catch (error) {
      inform("Foram enviadas " + uploaded + " imagem(ns). " + (error.message || "Falha no upload."), true);
      try { await loadItems(); } catch (_) {}
    } finally { $("uploadButton").disabled = false; }
  });
})();
