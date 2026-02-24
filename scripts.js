document.addEventListener("DOMContentLoaded", () => {
  // ป้องกันการเกิด Ghost Image เวลาลากรูป
  window.addEventListener("dragstart", (e) => e.preventDefault());

  const sliders = document.querySelectorAll(".horizontal-scroll");

  sliders.forEach((slider) => {
    let isDown = false;
    let startX;
    let scrollLeft;

    // --- ระบบที่ 1: หมุน Scroll Wheel แล้วเลื่อนซ้าย-ขวา ---
    slider.addEventListener("wheel", (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY * 1.5; // ปรับความเร็วตรงนี้
      }
    });

    // --- ระบบที่ 2: คลิกค้างแล้วลาก (Drag to Scroll) ---
    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      slider.classList.add("active");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
      slider.style.cursor = "grabbing";
    });

    slider.addEventListener("mouseleave", () => {
      isDown = false;
      slider.style.cursor = "default";
    });

    slider.addEventListener("mouseup", () => {
      isDown = false;
      slider.style.cursor = "default";
    });

    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; // ปรับความเร็วการลาก
      slider.scrollLeft = scrollLeft - walk;
    });
  });

  // --- ระบบที่ 3: Lightbox (กดรูปแล้วเต็มจอ) ---
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const closeBtn = document.querySelector(".close-lightbox");

  document.querySelectorAll(".photo-item img").forEach((img) => {
    img.addEventListener("click", (e) => {
      // ถ้าเป็นการลาก (ไม่ใช่แค่คลิก) จะไม่เปิด Lightbox
      // แต่ในเบื้องต้นเพื่อให้ใช้ง่าย เราจะปล่อยให้คลิกเปิดได้ปกติ
      lightbox.style.display = "flex";
      lightboxImg.src = img.src;
    });
  });

  const closeLightbox = () => {
    lightbox.style.display = "none";
  };
  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (lightbox) lightbox.addEventListener("click", closeLightbox);

  // --- ระบบที่ 4: Flip Card ---
  const card = document.querySelector(".flip-card");
  if (card) {
    card.addEventListener("click", () => card.classList.toggle("flipped"));
  }

  // --- ระบบที่ 5: Scroll Reveal (เลื่อนแล้วลอยขึ้นตลอด) ---
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        } else {
          entry.target.classList.remove("show");
        }
      });
    },
    { threshold: 0.1 },
  );

  document
    .querySelectorAll(".scroll-reveal")
    .forEach((el) => observer.observe(el));

  const photoInputs = document.querySelectorAll(".photo-input");

  // ฟังก์ชันสำหรับส่งไฟล์ไปที่ Google Apps Script
  // 1. แก้ไขฟังก์ชันส่งไฟล์ (เติมเนื้อหาและใส่ปุ่มลบ)
  async function uploadToDrive(file, scrollContainer) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const payload = {
        base64: base64,
        mimeType: file.type,
        fileName: file.name,
      };

      try {
        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbz93a-mZwHSW95Ttf3pQ4gdv8Rml67795qk8wd-PTBZvzTGGJekRy7T30rX4LGcPHcN/exec",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        const result = await response.json();

        if (result.status === "success") {
          // สร้างรูปภาพพร้อมปุ่มลบทันที (ไม่ต้องรอรีเฟรช)
          createPhotoElement(result.url, result.id, scrollContainer);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    };
  }

  // --- ส่วนที่ 2: ฟังก์ชันสร้าง HTML ของรูปภาพ (ใช้ร่วมกันทั้งตอนโหลดและตอนอัปโหลด) ---
  // แก้ไขฟังก์ชัน createPhotoElement
function createPhotoElement(url, id, container) {
    const photoItem = document.createElement("div");
    photoItem.className = "photo-item";

    // ไม่สร้าง delete button ที่นี่อีกต่อไป
    photoItem.innerHTML = `<img src="${url}" alt="Memory Photo" data-id="${id}">`;

    // ระบบ Lightbox (ปรับให้ส่ง id ไปด้วย)
    const img = photoItem.querySelector("img");
    img.addEventListener("click", () => {
        const lightbox = document.getElementById("lightbox");
        const lightboxImg = document.getElementById("lightbox-img");
        
        lightbox.style.display = "flex";
        lightboxImg.src = url;
        
        // เพิ่ม data-id เพื่อให้รู้ว่ารูปนี้คืออันไหน
        lightboxImg.dataset.id = id;

        // แสดงปุ่มลบใน lightbox (จะจัดการในขั้นตอนถัดไป)
        document.querySelector(".lightbox-delete-btn")?.remove(); // ล้างปุ่มเก่าก่อน
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "lightbox-delete-btn";
        deleteBtn.textContent = "✕ ลบ";
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm("ต้องการลบรูปนี้ใช่ไหม?")) return;

            // ลบจาก DOM ทันที
            photoItem.remove();

            // เรียก API ลบ (เหมือนเดิม)
            await fetch(
                `https://script.google.com/macros/s/AKfycbz93a-mZwHSW95Ttf3pQ4gdv8Rml67795qk8wd-PTBZvzTGGJekRy7T30rX4LGcPHcN/exec?delId=${id}`
            );

            // ปิด lightbox หลังลบ
            lightbox.style.display = "none";
        };

        lightbox.appendChild(deleteBtn);
    });

    container.prepend(photoItem);
}

  // --- ส่วนที่ 3: ดึงรูปภาพที่มีอยู่แล้วมาโชว์ตอนเปิดเว็บ ---
  async function loadExistingPhotos() {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbz93a-mZwHSW95Ttf3pQ4gdv8Rml67795qk8wd-PTBZvzTGGJekRy7T30rX4LGcPHcN/exec",
      );
      const photos = await response.json();
      const targetContainer = document.querySelector(".horizontal-scroll");
      photos.forEach((photo) =>
        createPhotoElement(photo.url, photo.id, targetContainer),
      );
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  }

  loadExistingPhotos();

  // --- ส่วนที่ 4: ตั้งค่าปุ่มบวก (Input) ---
  document.querySelectorAll(".photo-input").forEach((input) => {
    input.addEventListener("change", function (e) {
      const files = e.target.files;
      const scrollContainer =
        this.closest(".folder-body").querySelector(".horizontal-scroll");

      if (files) {
        Array.from(files).forEach((file) => {
          // เรียกฟังก์ชันอัปโหลดอย่างเดียว ไม่ต้องเขียน FileReader ตรงนี้ซ้ำแล้ว
          uploadToDrive(file, scrollContainer);
        });
      }
    });
  });

  // --- ระบบคำอวยพร (Wish Wall) พร้อมแก้ไข + ลบ + localStorage ---
  const nameInput = document.getElementById("wish-name");
  const messageInput = document.getElementById("wish-message");
  const submitBtn = document.getElementById("submit-wish");
  const wishesContainer = document.getElementById("wishes-container");

  let wishes = JSON.parse(localStorage.getItem("tub6_wishes")) || [];
  let editingId = null;

  function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 5);
  }

  function saveWishes() {
    localStorage.setItem("tub6_wishes", JSON.stringify(wishes));
  }

  function renderWishes() {
    wishesContainer.innerHTML = ""; // ล้างก่อน render ใหม่ทุกครั้ง

    wishes.forEach((wish) => {
      const card = document.createElement("div");
      card.className = "wish-card scroll-reveal";
      card.dataset.id = wish.id;

      card.innerHTML = `
      <div class="wish-actions">
        <button class="action-btn edit-btn" onclick="startEdit('${wish.id}')">แก้ไข</button>
        <button class="action-btn delete-btn" onclick="deleteWish('${wish.id}')">ลบ</button>
      </div>

      <p class="wish-message">${wish.message.replace(/\n/g, "<br>")}</p>
      <p class="wish-from">จาก ${wish.name}</p>

      <div class="wish-edit-form">
        <textarea class="wish-edit-textarea">${wish.message}</textarea>
        <div class="wish-edit-actions">
          <button class="wish-cancel-btn" onclick="cancelEdit('${wish.id}')">ยกเลิก</button>
          <button class="wish-save-btn" onclick="saveEdit('${wish.id}')">บันทึก</button>
        </div>
      </div>
    `;

      wishesContainer.prepend(card);

      // ให้ animation เล่นหลัง render
      setTimeout(() => {
        card.classList.add("show");
      }, 50);
    });
  }

  window.startEdit = function (id) {
    const card = document.querySelector(`.wish-card[data-id="${id}"]`);
    if (!card) return;

    card.classList.add("editing");
    const textarea = card.querySelector(".wish-edit-textarea");
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length); // cursor ไปท้าย
    }
  };

  window.cancelEdit = function (id) {
    const card = document.querySelector(`.wish-card[data-id="${id}"]`);
    if (card) card.classList.remove("editing");
  };

  window.saveEdit = function (id) {
    const card = document.querySelector(`.wish-card[data-id="${id}"]`);
    if (!card) return;

    const textarea = card.querySelector(".wish-edit-textarea");
    const newMessage = textarea.value.trim();

    if (!newMessage) {
      alert("ข้อความห้ามว่างนะครับ ♡");
      return;
    }

    const wishIndex = wishes.findIndex((w) => w.id === id);
    if (wishIndex !== -1) {
      wishes[wishIndex].message = newMessage;
      saveWishes();
      renderWishes();
    }
  };

  window.deleteWish = function (id) {
    if (!confirm("แน่ใจนะว่าจะลบคำอวยพรนี้?")) return;

    wishes = wishes.filter((w) => w.id !== id);
    saveWishes();
    renderWishes();
  };

  // ส่งคำอวยพรใหม่
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const msg = messageInput.value.trim();

      if (!name || !msg) {
        alert("กรุณากรอกชื่อและข้อความด้วยน้า ♡");
        return;
      }

      const newWish = {
        id: generateId(),
        name,
        message: msg,
        createdAt: Date.now(),
      };

      wishes.unshift(newWish);
      saveWishes();
      renderWishes();

      nameInput.value = "";
      messageInput.value = "";
    });

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitBtn.click();
      }
    });
  }

  // โหลดครั้งแรก + render
  renderWishes();
});
